import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sites, pageviews, dailyStats } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { generateToken, sha256, getClientIP, dailyUserHash } from "@/lib/security";
import { isBot, detectBrowser, detectDevice, detectOS, containsMaliciousPattern } from "@/lib/bot-detection";
import { rateLimit, securityHeaders } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const schema = z.object({
  site_id: z.string().min(3).max(100),
  pathname: z.string().min(1).max(2048),
  referrer: z.string().max(2048).optional().default(""),
  screen_size: z.string().max(32).optional(),
  session_id: z.string().max(100).optional(),
  event_name: z.string().regex(/^[a-zA-Z0-9_.:-]+$/).max(64).optional().default("pageview"),
  event_data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  utm_source: z.string().max(255).optional(),
  utm_medium: z.string().max(255).optional(),
  utm_campaign: z.string().max(255).optional(),
  country: z.string().max(3).optional(),
});

const PIXEL = new Uint8Array([
  71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0,
  255, 255, 255, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0,
  1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59,
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

async function getDailySalt(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  // Deterministic per-day salt derived from a server secret
  const secret = process.env.JWT_SECRET || "prism-daily-salt-fallback";
  return sha256(`${secret}|${today}`).slice(0, 32);
}

export async function POST(req: NextRequest) {
  const headers = { ...CORS_HEADERS, ...securityHeaders() };

  const ip = getClientIP(req.headers);
  const rl = await rateLimit(`track:${sha256(ip)}`, 300, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers });
  }

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400, headers }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload" }, { status: 400, headers });

  const { site_id: siteCode, pathname, referrer, session_id, event_name, event_data } = parsed.data;

  if (containsMaliciousPattern(pathname) || (referrer && containsMaliciousPattern(referrer))) {
    return NextResponse.json({ status: "ignored" }, { headers });
  }

  // Resolve site by trackingCode OR id (both accepted for flexibility)
  const [site] = await db.select().from(sites).where(
    parsed.data.site_id.startsWith("pa_") ? eq(sites.trackingCode, siteCode) : eq(sites.id, siteCode)
  ).limit(1);
  if (!site) return NextResponse.json({ error: "invalid_site" }, { status: 404, headers });

  const userAgent = req.headers.get("user-agent") || "";
  if (isBot(userAgent)) return NextResponse.json({ status: "bot_ignored" }, { headers });

  const dailySalt = await getDailySalt();
  const userHash = await dailyUserHash(ip, userAgent, dailySalt);

  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const dayStart = Date.parse(`${today}T00:00:00.000Z`);

  const seen = await db.select({ id: pageviews.id }).from(pageviews).where(and(
    eq(pageviews.siteId, site.id),
    eq(pageviews.userHash, userHash),
    gte(pageviews.occurredAt, dayStart),
  )).limit(1);
  const isNewVisitor = seen.length === 0;

  const country = parsed.data.country || req.headers.get("cf-ipcountry") || null;

  await db.insert(pageviews).values({
    id: generateToken(16),
    siteId: site.id,
    occurredAt: now,
    pathname,
    referrer: referrer || null,
    userHash,
    country,
    deviceType: detectDevice(userAgent),
    browser: detectBrowser(userAgent),
    os: detectOS(userAgent),
    sessionId: session_id || req.headers.get("x-session-id") || generateToken(12),
    eventName: event_name,
    eventData: event_data ? JSON.stringify(event_data).slice(0, 4096) : null,
    utmSource: parsed.data.utm_source || null,
    utmMedium: parsed.data.utm_medium || null,
    utmCampaign: parsed.data.utm_campaign || null,
    rawIp: site.ipPrivacyMode === "store_raw" ? ip : null,
  });

  if (event_name === "pageview") {
    await db.execute(sql`
      INSERT INTO daily_stats (site_id, date, views, unique_visitors)
      VALUES (${site.id}, ${today}, 1, ${isNewVisitor ? 1 : 0})
      ON CONFLICT (site_id, date) DO UPDATE SET
        views = daily_stats.views + 1,
        unique_visitors = daily_stats.unique_visitors + ${isNewVisitor ? 1 : 0}
    `);
  }

  // Return 1x1 transparent GIF pixel for `<img>` tracking fallback
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      ...headers,
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    },
  });
}

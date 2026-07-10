import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../env";
import { database, getSiteByCode, insertPageview, sites } from "../db/queries";
import { detectBrowser, detectDevice, detectOS, anonymizeUser, isBot } from "../utils/anonymize";
import { d1RateLimit, sha256 } from "../utils/security";
import { eq } from "drizzle-orm";

const payloadSchema = z.object({
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
});

const pixel = Uint8Array.from([
  71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0,
  255, 255, 255, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0,
  1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59,
]);

const track = new Hono<AppEnv>();

track.post("/track", async (c) => {
  const parsed = payloadSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid analytics payload" }, 400);

  const { site_id: siteCode, pathname, referrer, session_id: sessionId, event_name: eventName, event_data: eventData } = parsed.data;
  const site = await getSiteByCode(c.env.DB, siteCode) ?? (await database(c.env.DB).select().from(sites).where(eq(sites.id, siteCode)).limit(1))[0];
  if (!site) return c.json({ error: "Invalid site_id" }, 404);

  const userAgent = c.req.header("User-Agent") || null;
  if (isBot(userAgent)) return c.json({ status: "ignored" }, 200);

  const ip = c.req.header("CF-Connecting-IP") || "unknown";
  const limiter = await d1RateLimit(c.env.DB, `track:${await sha256(ip)}`, 300, 60_000);
  if (!limiter.allowed) return c.json({ error: "rate_limited" }, 429);

  const timestamp = Date.now();
  const userHash = await anonymizeUser(ip, userAgent, c.env);
  const today = new Date(timestamp).toISOString().slice(0, 10);
  const dayStart = Date.parse(`${today}T00:00:00.000Z`);
  const seenToday = await c.env.DB.prepare(
    "SELECT 1 FROM pageviews WHERE site_id = ? AND user_hash = ? AND timestamp >= ? LIMIT 1",
  ).bind(site.id, userHash, dayStart).first();

  await insertPageview(c.env.DB, {
    id: crypto.randomUUID(),
    siteId: site.id,
    timestamp,
    pathname,
    referrer: referrer || null,
    userHash,
    country: c.req.header("CF-IPCountry") || null,
    deviceType: detectDevice(userAgent),
    browser: detectBrowser(userAgent),
    os: detectOS(userAgent),
    sessionId: sessionId || c.req.header("X-Session-Id") || crypto.randomUUID(),
    eventName,
    eventData: eventData ? JSON.stringify(eventData).slice(0, 4096) : null,
    utmSource: parsed.data.utm_source || null,
    utmMedium: parsed.data.utm_medium || null,
    utmCampaign: parsed.data.utm_campaign || null,
    rawIp: site.ipPrivacyMode === "store_raw" ? ip : null,
  });

  if (eventName === "pageview") {
    await c.env.DB.prepare(`
      INSERT INTO daily_stats (site_id, date, views, unique_visitors)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(site_id, date) DO UPDATE SET
        views = views + 1,
        unique_visitors = unique_visitors + excluded.unique_visitors
    `).bind(site.id, today, seenToday ? 0 : 1).run();
  }

  return new Response(pixel, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

export default track;

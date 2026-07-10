import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sites, pageviews } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireAuth, auditEvent, securityHeaders } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = requireAuth(async (req: NextRequest, user) => {
  const headers = securityHeaders();
  const url = new URL(req.url);
  const siteId = url.searchParams.get("siteId");
  const format = url.searchParams.get("format") === "csv" ? "csv" : "json";
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400, headers });

  const [site] = await db.select().from(sites).where(and(eq(sites.id, siteId), eq(sites.userId, user.id))).limit(1);
  if (!site) return NextResponse.json({ error: "Access denied" }, { status: 403, headers });

  const rows = await db.select({
    occurredAt: pageviews.occurredAt,
    pathname: pageviews.pathname,
    referrer: pageviews.referrer,
    country: pageviews.country,
    deviceType: pageviews.deviceType,
    browser: pageviews.browser,
    os: pageviews.os,
    eventName: pageviews.eventName,
    utmSource: pageviews.utmSource,
    utmMedium: pageviews.utmMedium,
    utmCampaign: pageviews.utmCampaign,
  }).from(pageviews).where(eq(pageviews.siteId, siteId)).orderBy(desc(pageviews.occurredAt)).limit(50000);

  await auditEvent(user.id, "analytics_export", req, { siteId, format, rowCount: rows.length });

  const safeSlug = site.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();

  if (format === "json") {
    return NextResponse.json(
      { site: site.name, exportedAt: new Date().toISOString(), rows },
      { headers: { ...headers, "Content-Disposition": `attachment; filename="${safeSlug}-analytics.json"` } }
    );
  }

  const headerRow = ["timestamp", "pathname", "referrer", "country", "device", "browser", "os", "event", "utm_source", "utm_medium", "utm_campaign"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headerRow.join(","),
    ...rows.map((r) => [
      new Date(r.occurredAt).toISOString(), r.pathname, r.referrer, r.country,
      r.deviceType, r.browser, r.os, r.eventName, r.utmSource, r.utmMedium, r.utmCampaign
    ].map(esc).join(","))
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeSlug}-analytics.csv"`,
    },
  });
});

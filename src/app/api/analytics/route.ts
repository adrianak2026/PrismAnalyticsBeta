import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sites, pageviews } from "@/db/schema";
import { and, count, countDistinct, desc, eq, gte, sql } from "drizzle-orm";
import { requireAuth, securityHeaders } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseDays(value: string | null): number {
  const n = Number(value || 30);
  return [1, 7, 30, 90].includes(n) ? n : 30;
}

export const GET = requireAuth(async (req: NextRequest, user) => {
  const headers = securityHeaders();
  const url = new URL(req.url);
  const siteId = url.searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400, headers });

  const [site] = await db.select().from(sites).where(and(eq(sites.id, siteId), eq(sites.userId, user.id))).limit(1);
  if (!site) return NextResponse.json({ error: "Access denied" }, { status: 403, headers });

  const days = parseDays(url.searchParams.get("days"));
  const from = Date.now() - days * 86_400_000;
  const filter = and(eq(pageviews.siteId, siteId), gte(pageviews.occurredAt, from), eq(pageviews.eventName, "pageview"));
  const liveFrom = Date.now() - 5 * 60 * 1000;

  const [totals, live, pages, refs, countryRows, deviceRows, browserRows, osRows, timelineRows, sessionRows, hourlyRows, recentLogs] = await Promise.all([
    db.select({ views: count(), unique: countDistinct(pageviews.userHash) }).from(pageviews).where(filter),
    db.select({ value: countDistinct(pageviews.userHash) }).from(pageviews).where(and(eq(pageviews.siteId, siteId), gte(pageviews.occurredAt, liveFrom))),
    db.select({ pathname: pageviews.pathname, views: count() }).from(pageviews).where(filter).groupBy(pageviews.pathname).orderBy(desc(count())).limit(10),
    db.select({ referrer: pageviews.referrer, views: count() }).from(pageviews).where(filter).groupBy(pageviews.referrer).orderBy(desc(count())).limit(10),
    db.select({ label: pageviews.country, views: count() }).from(pageviews).where(filter).groupBy(pageviews.country).orderBy(desc(count())).limit(20),
    db.select({ label: pageviews.deviceType, views: count() }).from(pageviews).where(filter).groupBy(pageviews.deviceType).orderBy(desc(count())).limit(5),
    db.select({ label: pageviews.browser, views: count() }).from(pageviews).where(filter).groupBy(pageviews.browser).orderBy(desc(count())).limit(6),
    db.select({ label: pageviews.os, views: count() }).from(pageviews).where(filter).groupBy(pageviews.os).orderBy(desc(count())).limit(6),
    db.execute(sql`
      SELECT to_char(to_timestamp(occurred_at / 1000) AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
             COUNT(*)::int AS views,
             COUNT(DISTINCT user_hash)::int AS unique
      FROM pageviews
      WHERE site_id = ${siteId} AND occurred_at >= ${from} AND event_name = 'pageview'
      GROUP BY 1 ORDER BY 1
    `),
    db.select({ sessionId: pageviews.sessionId, views: count() }).from(pageviews).where(filter).groupBy(pageviews.sessionId),
    db.execute(sql`
      SELECT to_char(to_timestamp(occurred_at / 1000) AT TIME ZONE 'UTC', 'HH24') AS hour,
             COUNT(*)::int AS views
      FROM pageviews
      WHERE site_id = ${siteId} AND occurred_at >= ${Date.now() - 86_400_000}
      GROUP BY 1 ORDER BY 1
    `),
    db.select({
      id: pageviews.id,
      occurredAt: pageviews.occurredAt,
      pathname: pageviews.pathname,
      referrer: pageviews.referrer,
      userHash: pageviews.userHash,
      rawIp: pageviews.rawIp,
      country: pageviews.country,
      deviceType: pageviews.deviceType,
      browser: pageviews.browser,
      os: pageviews.os,
      eventName: pageviews.eventName,
    }).from(pageviews).where(eq(pageviews.siteId, siteId)).orderBy(desc(pageviews.occurredAt)).limit(50),
  ]);

  const totalViews = totals[0]?.views ?? 0;
  const uniqueVisitors = totals[0]?.unique ?? 0;
  const bounceSessions = sessionRows.filter((r) => r.views === 1).length;
  const bounceRate = sessionRows.length ? Math.round((bounceSessions / sessionRows.length) * 1000) / 10 : 0;

  const pct = (v: number) => totalViews ? Math.round((v / totalViews) * 100) : 0;

  const timelineMap = new Map<string, { views: number; unique: number }>();
  for (const row of timelineRows.rows as Array<{ date: string; views: number; unique: number }>) {
    timelineMap.set(row.date, { views: row.views, unique: row.unique });
  }
  const timeline = Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (days - i - 1));
    const date = d.toISOString().slice(0, 10);
    const row = timelineMap.get(date);
    return { date, views: row?.views ?? 0, unique: row?.unique ?? 0 };
  });

  const hourlyMap = new Map<string, number>();
  let maxHourlyViews = 0;
  for (const row of hourlyRows.rows as Array<{ hour: string; views: number }>) {
    hourlyMap.set(row.hour, row.views);
    if (row.views > maxHourlyViews) maxHourlyViews = row.views;
  }
  const hourlyTraffic = Array.from({ length: 24 }, (_, i) => {
    const h = i.toString().padStart(2, "0");
    const views = hourlyMap.get(h) ?? 0;
    return { hour: `${h}:00`, views, percentage: maxHourlyViews ? Math.round((views / maxHourlyViews) * 100) : 0 };
  });

  return NextResponse.json({
    totalViews,
    uniqueVisitors,
    liveVisitors: live[0]?.value ?? 0,
    bounceRate,
    avgSessionDuration: "—",
    viewsChange: 0,
    visitorsChange: 0,
    timeline,
    topPages: pages.map((r) => ({ pathname: r.pathname, views: r.views, percentage: pct(r.views) })),
    referrers: refs.map((r) => ({ referrer: r.referrer, views: r.views, percentage: pct(r.views) })),
    countries: countryRows.map((r) => ({ label: r.label || "Unknown", views: r.views, percentage: pct(r.views) })),
    devices: deviceRows.map((r) => ({ label: r.label || "Unknown", views: r.views, percentage: pct(r.views) })),
    browsers: browserRows.map((r) => ({ label: r.label || "Unknown", views: r.views, percentage: pct(r.views) })),
    os: osRows.map((r) => ({ label: r.label || "Unknown", views: r.views, percentage: pct(r.views) })),
    hourlyTraffic,
    recentLogs,
    period: days,
  }, { headers });
});

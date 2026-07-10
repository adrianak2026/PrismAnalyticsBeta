import { and, count, countDistinct, desc, eq, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import { pageviews, sites, users, type PageviewInsert } from "./schema";

export function database(binding: D1Database) {
  return drizzle(binding);
}

export async function getSiteByCode(binding: D1Database, code: string) {
  const rows = await database(binding).select().from(sites).where(eq(sites.trackingCode, code)).limit(1);
  return rows[0] ?? null;
}

export async function getOwnedSite(binding: D1Database, siteId: string, userId: string) {
  const rows = await database(binding).select().from(sites).where(and(eq(sites.id, siteId), eq(sites.userId, userId))).limit(1);
  return rows[0] ?? null;
}

export async function insertPageview(binding: D1Database, input: PageviewInsert) {
  await database(binding).insert(pageviews).values(input);
}

export async function analyticsSummary(binding: D1Database, siteId: string, from: number, days: number) {
  const db = database(binding);
  const filter = and(eq(pageviews.siteId, siteId), gte(pageviews.timestamp, from), eq(pageviews.eventName, "pageview"));
  const liveFrom = Date.now() - 5 * 60 * 1000;

  const [totals, live, pages, refs, countryRows, deviceRows, browserRows, osRows, timelineRows, sessionRows, hourlyRows, recentLogs] = await Promise.all([
    db.select({ views: count(), unique: countDistinct(pageviews.userHash) }).from(pageviews).where(filter),
    db.select({ value: countDistinct(pageviews.userHash) }).from(pageviews).where(and(eq(pageviews.siteId, siteId), gte(pageviews.timestamp, liveFrom))),
    db.select({ pathname: pageviews.pathname, views: count() }).from(pageviews).where(filter).groupBy(pageviews.pathname).orderBy(desc(count())).limit(10),
    db.select({ referrer: pageviews.referrer, views: count() }).from(pageviews).where(filter).groupBy(pageviews.referrer).orderBy(desc(count())).limit(10),
    db.select({ label: pageviews.country, views: count() }).from(pageviews).where(filter).groupBy(pageviews.country).orderBy(desc(count())).limit(20),
    db.select({ label: pageviews.deviceType, views: count() }).from(pageviews).where(filter).groupBy(pageviews.deviceType).orderBy(desc(count())).limit(5),
    db.select({ label: pageviews.browser, views: count() }).from(pageviews).where(filter).groupBy(pageviews.browser).orderBy(desc(count())).limit(6),
    db.select({ label: pageviews.os, views: count() }).from(pageviews).where(filter).groupBy(pageviews.os).orderBy(desc(count())).limit(6),
    db.select({ date: sql<string>`date(${pageviews.timestamp} / 1000, 'unixepoch')`, views: count(), unique: countDistinct(pageviews.userHash) }).from(pageviews).where(filter).groupBy(sql`date(${pageviews.timestamp} / 1000, 'unixepoch')`).orderBy(sql`date(${pageviews.timestamp} / 1000, 'unixepoch')`),
    db.select({ sessionId: pageviews.sessionId, views: count() }).from(pageviews).where(filter).groupBy(pageviews.sessionId),
    db.select({ hour: sql<string>`strftime('%H', ${pageviews.timestamp} / 1000, 'unixepoch')`, views: count() })
      .from(pageviews)
      .where(and(eq(pageviews.siteId, siteId), gte(pageviews.timestamp, Date.now() - 86_400_000)))
      .groupBy(sql`strftime('%H', ${pageviews.timestamp} / 1000, 'unixepoch')`),
    db.select({
      id: pageviews.id,
      occurredAt: pageviews.timestamp,
      pathname: pageviews.pathname,
      referrer: pageviews.referrer,
      userHash: pageviews.userHash,
      rawIp: pageviews.rawIp,
      country: pageviews.country,
      deviceType: pageviews.deviceType,
      browser: pageviews.browser,
      os: pageviews.os,
      eventName: pageviews.eventName,
    }).from(pageviews).where(eq(pageviews.siteId, siteId)).orderBy(desc(pageviews.timestamp)).limit(50),
  ]);

  const totalViews = totals[0]?.views ?? 0;
  const uniqueVisitors = totals[0]?.unique ?? 0;
  const bounceSessions = sessionRows.filter((row) => row.views === 1).length;
  const percentage = (views: number) => totalViews ? Math.round((views / totalViews) * 100) : 0;
  const timelineMap = new Map(timelineRows.map((row) => [row.date, row]));
  const timeline = Array.from({ length: days }, (_, index) => {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() - (days - index - 1));
    const date = day.toISOString().slice(0, 10);
    const row = timelineMap.get(date);
    return { date, views: row?.views ?? 0, unique: row?.unique ?? 0 };
  });

  const hourlyMap = new Map<string, number>();
  let maxHourlyViews = 0;
  for (const row of hourlyRows as Array<{ hour: string; views: number }>) {
    hourlyMap.set(row.hour || "00", row.views);
    if (row.views > maxHourlyViews) maxHourlyViews = row.views;
  }
  const hourlyTraffic = Array.from({ length: 24 }, (_, i) => {
    const h = i.toString().padStart(2, "0");
    const views = hourlyMap.get(h) ?? 0;
    return { hour: h + ":00", views, percentage: maxHourlyViews ? Math.round((views / maxHourlyViews) * 100) : 0 };
  });

  return {
    totalViews,
    uniqueVisitors,
    liveVisitors: live[0]?.value ?? 0,
    bounceRate: sessionRows.length ? Math.round((bounceSessions / sessionRows.length) * 1000) / 10 : 0,
    avgSessionDuration: "—",
    viewsChange: 0,
    visitorsChange: 0,
    timeline,
    topPages: pages.map((row) => ({ ...row, percentage: percentage(row.views) })),
    referrers: refs.map((row) => ({ ...row, percentage: percentage(row.views) })),
    countries: countryRows.map((row) => ({ label: row.label || "Unknown", views: row.views, percentage: percentage(row.views) })),
    devices: deviceRows.map((row) => ({ label: row.label || "Unknown", views: row.views, percentage: percentage(row.views) })),
    browsers: browserRows.map((row) => ({ label: row.label || "Unknown", views: row.views, percentage: percentage(row.views) })),
    os: osRows.map((row) => ({ label: row.label || "Unknown", views: row.views, percentage: percentage(row.views) })),
    hourlyTraffic,
    recentLogs,
    period: days,
  };
}

export { sites, users, pageviews };

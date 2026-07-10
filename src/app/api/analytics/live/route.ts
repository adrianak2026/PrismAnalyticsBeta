import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sites, pageviews } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { requireAuth, securityHeaders } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = requireAuth(async (req: NextRequest, user) => {
  const headers = securityHeaders();
  const url = new URL(req.url);
  const siteId = url.searchParams.get("siteId");
  if (!siteId) return NextResponse.json({ error: "siteId required" }, { status: 400, headers });

  const [site] = await db.select({ id: sites.id }).from(sites).where(and(eq(sites.id, siteId), eq(sites.userId, user.id))).limit(1);
  if (!site) return NextResponse.json({ error: "Access denied" }, { status: 403, headers });

  const from = Date.now() - 5 * 60 * 1000;
  const result = await db.execute(sql`
    SELECT COUNT(DISTINCT user_hash)::int AS visitors,
           COUNT(*)::int AS views
    FROM pageviews WHERE site_id = ${siteId} AND occurred_at >= ${from}
  `);
  const row = result.rows[0] as { visitors: number; views: number } | undefined;

  const activePages = await db.select({ pathname: pageviews.pathname, count: sql<number>`COUNT(DISTINCT user_hash)::int` })
    .from(pageviews)
    .where(and(eq(pageviews.siteId, siteId), gte(pageviews.occurredAt, from)))
    .groupBy(pageviews.pathname)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(5);

  return NextResponse.json({
    liveVisitors: row?.visitors ?? 0,
    liveViews: row?.views ?? 0,
    windowMinutes: 5,
    activePages,
    timestamp: Date.now(),
  }, { headers });
});

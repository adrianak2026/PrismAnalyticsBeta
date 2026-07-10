import { Hono } from "hono";
import type { AppEnv } from "../env";
import { analyticsSummary, getOwnedSite } from "../db/queries";
import { requireAuth } from "../utils/auth";

const analytics = new Hono<AppEnv>();
analytics.use("/analytics/*", requireAuth);
analytics.use("/analytics", requireAuth);

function parseDays(value?: string) {
  const days = Number(value || 30);
  return [7, 30, 90].includes(days) ? days : 30;
}

analytics.get("/analytics", async (c) => {
  const siteId = c.req.query("siteId");
  if (!siteId) return c.json({ error: "siteId required" }, 400);
  const site = await getOwnedSite(c.env.DB, siteId, c.get("user").id);
  if (!site) return c.json({ error: "Access denied" }, 403);
  const days = parseDays(c.req.query("days"));
  return c.json(await analyticsSummary(c.env.DB, siteId, Date.now() - days * 86_400_000, days));
});

analytics.get("/analytics/live", async (c) => {
  const siteId = c.req.query("siteId");
  if (!siteId) return c.json({ error: "siteId required" }, 400);
  const site = await getOwnedSite(c.env.DB, siteId, c.get("user").id);
  if (!site) return c.json({ error: "Access denied" }, 403);
  const from = Date.now() - 5 * 60 * 1000;
  const result = await c.env.DB.prepare(`
    SELECT COUNT(DISTINCT user_hash) AS visitors, COUNT(*) AS views
    FROM pageviews WHERE site_id = ? AND timestamp >= ?
  `).bind(siteId, from).first<{ visitors: number; views: number }>();
  const active = await c.env.DB.prepare(`
    SELECT pathname, COUNT(DISTINCT user_hash) AS count
    FROM pageviews WHERE site_id = ? AND timestamp >= ?
    GROUP BY pathname ORDER BY count DESC LIMIT 5
  `).bind(siteId, from).all<{ pathname: string; count: number }>();
  return c.json({
    liveVisitors: result?.visitors ?? 0,
    liveViews: result?.views ?? 0,
    activePages: active.results,
    windowMinutes: 5,
    timestamp: Date.now(),
  });
});

analytics.get("/analytics/export", async (c) => {
  const siteId = c.req.query("siteId");
  const format = c.req.query("format") === "csv" ? "csv" : "json";
  if (!siteId) return c.json({ error: "siteId required" }, 400);
  const user = c.get("user");
  const site = await getOwnedSite(c.env.DB, siteId, user.id);
  if (!site) return c.json({ error: "Access denied" }, 403);
  const results = await c.env.DB.prepare(`
    SELECT timestamp, pathname, referrer, country, device_type, browser, os, event_name,
           utm_source, utm_medium, utm_campaign
    FROM pageviews WHERE site_id = ? ORDER BY timestamp DESC LIMIT 50000
  `).bind(siteId).all();
  const rows = results.results;

  if (format === "json") {
    return new Response(JSON.stringify({ site: site.name, exportedAt: new Date().toISOString(), rows }, null, 2), {
      headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${site.name}-analytics.json"` },
    });
  }
  const headers = ["timestamp", "pathname", "referrer", "country", "device_type", "browser", "os", "event_name", "utm_source", "utm_medium", "utm_campaign"];
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${site.name}-analytics.csv"` } });
});

export default analytics;

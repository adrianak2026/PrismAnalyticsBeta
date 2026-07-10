import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  createdAt: integer("created_at").notNull(),
});

export const sites = sqliteTable("sites", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  domain: text("domain"),
  trackingCode: text("tracking_code").notNull().unique(),
  ipPrivacyMode: text("ip_privacy_mode").notNull().default("strict_hash"),
  createdAt: integer("created_at").notNull(),
}, (table) => [index("idx_sites_user").on(table.userId)]);

export const pageviews = sqliteTable("pageviews", {
  id: text("id").primaryKey(),
  siteId: text("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  timestamp: integer("timestamp").notNull(),
  pathname: text("pathname").notNull(),
  referrer: text("referrer"),
  userHash: text("user_hash").notNull(),
  country: text("country"),
  deviceType: text("device_type"),
  browser: text("browser"),
  os: text("os"),
  sessionId: text("session_id"),
  eventName: text("event_name").notNull().default("pageview"),
  eventData: text("event_data"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  rawIp: text("raw_ip"),
}, (table) => [
  index("idx_pageviews_site_timestamp").on(table.siteId, table.timestamp),
  index("idx_pageviews_user_hash").on(table.userHash),
  index("idx_pageviews_session").on(table.sessionId),
  index("idx_pageviews_event").on(table.siteId, table.eventName, table.timestamp),
]);

export const dailyStats = sqliteTable("daily_stats", {
  siteId: text("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  views: integer("views").notNull().default(0),
  uniqueVisitors: integer("unique_visitors").notNull().default(0),
}, (table) => [primaryKey({ columns: [table.siteId, table.date] })]);

export type UserRow = typeof users.$inferSelect;
export type SiteRow = typeof sites.$inferSelect;
export type PageviewInsert = typeof pageviews.$inferInsert;

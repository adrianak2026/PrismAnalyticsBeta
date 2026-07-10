import { bigint, boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  emailVerified: boolean("email_verified").notNull().default(false),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: bigint("locked_until", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
}, (table) => [uniqueIndex("users_email_unique").on(table.email)]);

export const sites = pgTable("sites", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  domain: text("domain"),
  trackingCode: text("tracking_code").notNull(),
  ipPrivacyMode: text("ip_privacy_mode").notNull().default("strict_hash"), // strict_hash | store_raw
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("sites_tracking_code_unique").on(table.trackingCode),
  index("sites_user_idx").on(table.userId),
]);

export const pageviews = pgTable("pageviews", {
  id: text("id").primaryKey(),
  siteId: text("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  occurredAt: bigint("occurred_at", { mode: "number" }).notNull(),
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
  index("pageviews_site_time_idx").on(table.siteId, table.occurredAt),
  index("pageviews_user_hash_idx").on(table.userHash),
  index("pageviews_session_idx").on(table.sessionId),
  index("pageviews_country_idx").on(table.siteId, table.country),
]);

export const dailyStats = pgTable("daily_stats", {
  siteId: text("site_id").notNull().references(() => sites.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  views: integer("views").notNull().default(0),
  uniqueVisitors: integer("unique_visitors").notNull().default(0),
}, (table) => [primaryKey({ columns: [table.siteId, table.date] })]);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: bigint("window_start", { mode: "number" }).notNull(),
});

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  action: text("action").notNull(),
  metadata: jsonb("metadata"),
  ipHash: text("ip_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("audit_user_idx").on(table.userId, table.createdAt),
]);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  userAgentHash: text("user_agent_hash"),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => [
  index("sessions_user_idx").on(table.userId),
  index("sessions_token_idx").on(table.tokenHash),
]);

export type User = typeof users.$inferSelect;
export type Site = typeof sites.$inferSelect;
export type Pageview = typeof pageviews.$inferSelect;

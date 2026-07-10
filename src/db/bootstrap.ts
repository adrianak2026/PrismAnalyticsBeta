import { pool } from "./index";

let schemaPromise: Promise<void> | undefined;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  tracking_code TEXT NOT NULL UNIQUE,
  ip_privacy_mode TEXT NOT NULL DEFAULT 'strict_hash',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS pageviews (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  occurred_at BIGINT NOT NULL,
  pathname TEXT NOT NULL,
  referrer TEXT,
  user_hash TEXT NOT NULL,
  country TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  session_id TEXT,
  event_name TEXT NOT NULL DEFAULT 'pageview',
  event_data TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  raw_ip TEXT
);
CREATE TABLE IF NOT EXISTS daily_stats (
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (site_id, date)
);
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  metadata JSONB,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  user_agent_hash TEXT,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS sites_tracking_code_unique ON sites(tracking_code);
CREATE INDEX IF NOT EXISTS sites_user_idx ON sites(user_id);
CREATE INDEX IF NOT EXISTS pageviews_site_time_idx ON pageviews(site_id, occurred_at);
CREATE INDEX IF NOT EXISTS pageviews_user_hash_idx ON pageviews(user_hash);
CREATE INDEX IF NOT EXISTS pageviews_session_idx ON pageviews(session_id);
CREATE INDEX IF NOT EXISTS pageviews_country_idx ON pageviews(site_id, country);
CREATE INDEX IF NOT EXISTS audit_user_idx ON audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token_hash);
`;

export async function ensureDatabaseSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = pool.query(SCHEMA_SQL).then(() => undefined).catch((error) => {
      schemaPromise = undefined;
      throw error;
    });
  }
  await schemaPromise;
}

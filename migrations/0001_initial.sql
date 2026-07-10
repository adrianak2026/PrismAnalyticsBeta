-- PrismAnalytics v1.0.0 — D1 SQLite Schema
-- Production-ready, privacy-first, free-tier friendly

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    email_verified INTEGER NOT NULL DEFAULT 0,
    two_factor_enabled INTEGER NOT NULL DEFAULT 0,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    last_login_at INTEGER
);

-- Sites table (one user → many sites)
CREATE TABLE IF NOT EXISTS sites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    domain TEXT,
    tracking_code TEXT UNIQUE NOT NULL,
    ip_privacy_mode TEXT NOT NULL DEFAULT 'strict_hash',
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Pageviews — core analytics, NO raw IP, NO raw UA
CREATE TABLE IF NOT EXISTS pageviews (
    id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    pathname TEXT NOT NULL,
    referrer TEXT,
    user_hash TEXT NOT NULL,              -- SHA256(IP|UA|daily_salt) only
    country TEXT,                         -- CF-IPCountry (optional)
    device_type TEXT,                     -- Mobile / Tablet / Desktop
    browser TEXT,
    os TEXT,
    session_id TEXT,                      -- random UUID, sessionStorage, not cookie
    event_name TEXT NOT NULL DEFAULT 'pageview',
    event_data TEXT,                      -- JSON sliced 4096
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    raw_ip TEXT,
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Daily aggregation (performance)
CREATE TABLE IF NOT EXISTS daily_stats (
    site_id TEXT NOT NULL,
    date TEXT NOT NULL,                   -- YYYY-MM-DD
    views INTEGER NOT NULL DEFAULT 0,
    unique_visitors INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (site_id, date),
    FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
);

-- Rate limits — DB-backed to survive serverless scaling
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    window_start INTEGER NOT NULL
);

-- Audit log — ip_hash is salted hash, not raw IP
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    metadata TEXT,                        -- JSON
    ip_hash TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Sessions — token_hash, ua_hash, revoked_at for JWT revocation
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    user_agent_hash TEXT,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    revoked_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Private application secrets for zero-config one-click deployments.
-- A Cloudflare encrypted JWT_SECRET overrides this when configured.
CREATE TABLE IF NOT EXISTS app_secrets (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Indexes — free tier perf
CREATE INDEX IF NOT EXISTS idx_pageviews_site_timestamp ON pageviews(site_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_pageviews_user_hash ON pageviews(user_hash);
CREATE INDEX IF NOT EXISTS idx_pageviews_session ON pageviews(session_id);
CREATE INDEX IF NOT EXISTS idx_pageviews_event ON pageviews(site_id, event_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_pageviews_country ON pageviews(site_id, country);
CREATE INDEX IF NOT EXISTS idx_sites_user ON sites(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);

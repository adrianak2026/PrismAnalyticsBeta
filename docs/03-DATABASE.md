# 03 — Database — Tables, Indexes, Privacy Model

## PostgreSQL (Next Preview) + D1 (Cloudflare) — Same Model, Different Dialect

Source of truth for Next preview: `src/db/schema.ts` (PostgreSQL).  
Source for Worker: `migrations/0001_initial.sql` (D1 SQLite) + `src/worker/db/schema.ts` (Drizzle SQLite).

### Visual Schema

```
users ──────────────────────────────────────────────┐
  id TEXT PK                                        │
  email TEXT UNIQUE                                 │
  password_hash TEXT                                │
  name TEXT                                         │
  email_verified BOOLEAN default false              │
  two_factor_enabled BOOLEAN default false          │
  failed_login_attempts INT default 0              │
  locked_until BIGINT (timestamp)                  │
  created_at TIMESTAMPTZ                           │
  last_login_at TIMESTAMPTZ                        │
                                                    │
  └─▶ sites ──────────────────────────────────────┐ │
        id TEXT PK                                │ │
        user_id TEXT FK → users.id CASCADE        │ │
        name TEXT                                 │ │
        domain TEXT (normalized)                  │ │
        tracking_code TEXT UNIQUE (pa_xxx)        │ │
        created_at TIMESTAMPTZ                    │ │
                                                  │ │
        ├─▶ pageviews ─────────────────────────┐  │ │
        │     id TEXT PK                       │  │ │
        │     site_id TEXT FK → sites CASCADE  │  │ │
        │     occurred_at BIGINT (ms)          │  │ │
        │     pathname TEXT (max 2048)         │  │ │
        │     referrer TEXT (max 2048)         │  │ │
        │     user_hash TEXT (daily salted)    │  │ │
        │     country TEXT (2-3 chars)         │  │ │
        │     device_type TEXT (Mobile etc)    │  │ │
        │     browser TEXT (Chrome etc)        │  │ │
        │     os TEXT (macOS etc)              │  │ │
        │     session_id TEXT (random UUID)    │  │ │
        │     event_name TEXT default pageview │  │ │
        │     event_data TEXT (JSON sliced 4k) │  │ │
        │     utm_source/medium/campaign       │  │ │
        │     [NO ip, NO raw UA]               │  │ │
        │                                      │  │ │
        │   Indexes:                           │  │ │
        │   • (site_id, occurred_at)           │  │ │
        │   • user_hash                        │  │ │
        │   • session_id                       │  │ │
        │   • (site_id, country) for map       │  │ │
        │                                      │  │ │
        └─▶ daily_stats ────────────────────┐  │  │ │
              site_id TEXT FK CASCADE       │  │  │ │
              date TEXT (YYYY-MM-DD)        │  │  │ │
              views INT                     │  │  │ │
              unique_visitors INT           │  │  │ │
              PK (site_id, date)            │  │  │ │
                                            │  │  │ │
rate_limits ────────────────────────────────┘  │  │ │
  key TEXT PK (e.g. login:sha256(ip))          │  │ │
  count INT                                    │  │ │
  window_start BIGINT                          │  │ │

audit_log                                      │  │ │
  id TEXT PK                                   │  │ │
  user_id TEXT                                 │  │ │
  action TEXT (signup, login_failed etc)       │  │ │
  metadata JSONB                               │  │ │
  ip_hash TEXT (salted IP, not raw)            │  │ │
  created_at TIMESTAMPTZ                       │  │ │
  Index (user_id, created_at)                  │  │ │

sessions                                       │  │ │
  id TEXT PK                                   │  │ │
  user_id TEXT FK CASCADE                      │  │ │
  token_hash TEXT (sha256 JWT)                 │  │ │
  user_agent_hash TEXT (sha256 UA)             │  │ │
  expires_at BIGINT                            │  │ │
  created_at, revoked_at                       │  │ │
  Indexes: user_id, token_hash                 │  │ │
```

### Privacy Model per Table

| Table | PII? | How Protected |
|-------|------|---------------|
| users | Email + name | Email stored, password is PBKDF2 210k hash, not plain |
| sites | Domain may be semi-PII but owned by user | Tenant isolation: `WHERE user_id = auth` everywhere |
| pageviews | **No IP, no UA** | `user_hash = SHA256(IP|UA|dailySalt)`, salt = `sha256(JWT_SECRET+date)`, rotates daily → cannot correlate across days |
| daily_stats | Aggregated counts only | No PII |
| rate_limits | key = `sha256(ip)` | IP hashed, not raw |
| audit_log | `ip_hash` not raw IP | Salted daily |
| sessions | `token_hash`, `ua_hash` | No raw token, no raw UA |

### Query Examples

```sql
-- Live visitors last 5 min
SELECT COUNT(DISTINCT user_hash) FROM pageviews
WHERE site_id='xxx' AND occurred_at >= now-5m;

-- Top pages last 30 days
SELECT pathname, COUNT(*) FROM pageviews
WHERE site_id='xxx' AND occurred_at >= now-30d AND event_name='pageview'
GROUP BY pathname ORDER BY COUNT(*) DESC LIMIT 10;

-- Countries for map
SELECT country, COUNT(*) FROM pageviews
WHERE site_id='xxx' GROUP BY country;
```

### How to Add a Column

1. Edit `src/db/schema.ts`
2. Run `npx drizzle-kit push --config drizzle.config.json` for local PG
3. Create new migration file `migrations/0002_add_xxx.sql` for D1:
   ```sql
   ALTER TABLE pageviews ADD COLUMN new_field TEXT;
   ```
4. `npx wrangler d1 migrations apply prism-analytics-db --remote`

---

**Next:** [04-AUTH-SECURITY.md](./04-AUTH-SECURITY.md)

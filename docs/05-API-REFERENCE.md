# 05 — API Reference — All 13 Endpoints

Base URL: `https://your-worker.workers.dev` (or `http://localhost:3000` local)

Auth: `Authorization: Bearer <token>` except `/api/track`, `/api/health`, `/api/version`, `/api/auth/*`

Security headers on every response: `X-Content-Type-Options`, `HSTS`, `X-Frame-Options`, CSP (HTML), etc.

---

## Auth

### POST /api/auth/signup

Rate limit: 5/hour per IP.

```json
{
  "name": "Jordan Lee",
  "email": "jordan@example.com",
  "password": "S3cur3P@ss!"
}
```

Checks:
- Email format RFC, length ≤254
- Disposable domains (24+ blocked)
- Password strength score ≥3 (length, upper, lower, number, symbol, not common)
- MX records via Cloudflare DoH (except trusted providers: gmail.com, outlook.com, etc.)

Responses:
- 201 → `{user:{id,email,name}, token}`
- 400 → invalid email, weak password, no MX
- 409 → email exists
- 429 → rate limited

### POST /api/auth/login

Rate limit: 10/15min per IP. Locks after 5 fails → 15 min 423.

```json
{ "email":"...","password":"..." }
```

Response 200 `{user, token}` | 401 bad creds | 423 locked | 429 rate limit

### POST /api/auth/logout

Auth required. Revokes `sessions.token_hash`, sets `revoked_at`.

### POST /api/auth/check-email

Public, 30/min per IP. Used by frontend for live MX badge.

Request: `{email}` → Response: `{valid:boolean, message, disposable?, records?}`

### GET /api/auth/me

Returns `{user:{id,email,name}}`

---

## Sites (tenant-scoped)

### GET /api/sites

Auth required. Returns `{sites: [{id,name,domain,trackingCode,createdAt}]}` where `user_id = auth`.

### POST /api/sites

Auth required.

```json
{ "name":"My Portfolio", "domain":"example.com" }
```

- `name` 2-80 chars, checked for XSS/SQLi patterns
- `domain` optional, normalized (strip https://, trailing slash, lowercased)
- Generates `tracking_code: pa_<random>`

### DELETE /api/sites/[id]

Auth + ownership check. CASCADE deletes pageviews, daily_stats.

---

## Tracking (public)

### POST /api/track

Public, CORS *, rate limited 300/min per IP. Bot-filtered, malicious pattern blocked.

```json
{
  "site_id": "pa_xxx OR site UUID",
  "pathname": "/work",
  "referrer": "https://google.com",
  "session_id": "optional UUID",
  "event_name": "pageview OR custom like purchase_completed",
  "event_data": { "value": 99 },
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "launch"
}
```

- `site_id` required, min 3, max 100 — resolves by `tracking_code` OR `id`
- `pathname` required, max 2048, blocked if contains SQLi/XSS patterns
- `event_name` regex `^[a-zA-Z0-9_.:-]+$` max 64, default pageview
- Server adds: `country` from `CF-IPCountry` header or body override, `device`, `browser`, `os` from UA parsing (UA not stored)

Returns: 1×1 GIF `image/gif` or JSON `{status:"ignored"}` for bots. 404 if `invalid_site`, 429 if rate limited.

---

## Analytics (tenant-scoped)

### GET /api/analytics?siteId=xxx&days=7|30|90

Auth required + ownership verified.

Response:

```json
{
  "totalViews": 24892,
  "uniqueVisitors": 18429,
  "liveVisitors": 12,
  "bounceRate": 42.3,
  "avgSessionDuration": "—",
  "timeline": [{"date":"2026-07-01","views":100,"unique":80}],
  "topPages": [{"pathname":"/","views":8432,"percentage":34}],
  "referrers": [{"referrer":"google.com","views":100,"percentage":10}],
  "countries": [{"label":"United States","views":100,"percentage":50}],
  "devices": [{"label":"Desktop","views":100,"percentage":60}],
  "browsers": [{"label":"Chrome","views":100,"percentage":70}],
  "os": [{"label":"macOS","views":100,"percentage":40}],
  "period": 30
}
```

### GET /api/analytics/live?siteId=xxx

Returns `{liveVisitors, liveViews, windowMinutes:5, activePages:[{pathname,count}], timestamp}`

Poll this every 10s for real-time badge.

### GET /api/analytics/export?siteId=xxx&format=csv|json

Downloads file: `content-disposition: attachment`. Audited. Up to 50k rows.

---

## Account

### DELETE /api/account

Auth required. CASCADE deletes `sites`, `pageviews`, `sessions`, `audit_log`. Backblaze B2 archive deletion is best-effort (requires Worker env with B2 credentials configured).

---

## Meta

### GET /api/health

Public. `{ok:true}`

### GET /api/version

Public. `{version, name, buildDate, channel, apiVersion, changelog:[...], uptime, env}`

---

## Data Tables — Where Data Comes From

| UI Section | SQL Source | Notes |
|------------|-----------|-------|
| Total pageviews | `COUNT(pageviews)` filtered by site_id + days + event=pageview | Live timeline |
| Unique visitors | `COUNT DISTINCT user_hash` | Daily salted hash, not IP |
| Live now | `COUNT DISTINCT user_hash WHERE occurred_at >= now-5m` | 10s polling |
| Timeline chart | `to_char(to_timestamp(...)) GROUP BY date` | Missing dates filled 0 |
| Top pages | `GROUP BY pathname ORDER BY COUNT DESC LIMIT 10` | |
| Referrers | `GROUP BY referrer` | Null = Direct |
| Countries | `GROUP BY country` | From CF header |
| Devices | `GROUP BY device_type` | Parsed from UA server-side |
| Browsers | `GROUP BY browser` | Parsed |
| OS | `GROUP BY os` | Parsed |
| World map | Same as countries, mapped ISO → SVG path | 60+ countries |
| Export CSV/JSON | `SELECT occurred_at, pathname, referrer, country, device, browser, os, event_name, UTMs FROM pageviews WHERE site_id LIMIT 50000 ORDER BY occurred_at DESC` | No PII columns |
| Sites list | `SELECT id, name, domain, tracking_code FROM sites WHERE user_id` | Tenant isolation |

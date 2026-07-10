# 12 — Troubleshooting — Common Errors & Fixes

## Build Errors

### `npm run build` fails with type errors

```bash
npm exec tsc -- --noEmit
# Fix reported file, usually in src/
```

Common: `src/worker/` types conflict with Next — `tsconfig.json` excludes `src/worker`.

### `middleware` deprecated warning

We renamed to `proxy.ts` and export `export function proxy`. Ensure file name is `src/proxy.ts` not `middleware.ts`.

### Recharts hydration warning

Non-critical: `The width(-1) and height(-1) of chart should be greater than 0`. We set `minWidth={0}` on ResponsiveContainer. Ignore if build still succeeds.

---

## API Errors

### 401 Unauthorized on /api/sites

- Token expired? Login again.
- Check `localStorage.getItem('prism_token')` exists.
- Server checks `sessions` table for revocation — if you called logout, token invalid.

### 429 Rate Limited

- Signup 5/hour per IP, login 10/15min, track 300/min.
- Wait `retryIn` ms shown in message, or clear `rate_limits` table:
  ```sql
  DELETE FROM rate_limits;
  ```

### 423 Account Locked

- 5 failed logins → 15 min lock. Wait or:
  ```sql
  UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE email='...';
  ```

### POST /api/track 404 invalid_site

- `site_id` must be `tracking_code` like `pa_xxx` OR UUID of site.id. Copy exact code from Dashboard → Sites.

### POST /api/track returns {status:"bot_ignored"}

- Your User-Agent matched bot patterns. Test with real browser, not curl (curl is blocked on non-track endpoints but track allows? Actually track blocks bots too — use browser).

### Export downloads empty CSV

- No pageviews yet. Install tracking snippet and visit your site, wait 10s live poll.

---

## Tracking Snippet Issues

### Network shows no /api/track request

- Check snippet pasted in `<head>` before `</head>`.
- Check `url` is correct Worker URL (not localhost in prod).
- Check ad-blocker — may block `analytics` or `track` path. Rename path if needed (edit `src/app/api/track/route.ts` to `/api/pixel`? But then update snippet).
- Check CSP: `connect-src` must allow Worker URL.

### Snippet copied but TS/JS errors in console

- Framework snippet may need adaption. See `docs/07-INTEGRATIONS/<framework>.md` for exact code.
- Ensure `crypto.randomUUID()` supported (modern browsers yes, old no → fallback `Math.random()`).

---

## Cloudflare Deploy Errors

### `database_id missing` in wrangler.toml

Run `npx wrangler d1 create prism-analytics-db` → copy `database_id` → paste.

### `KV id missing`

Run `npx wrangler kv namespace create "KV"` → copy id.

### `JWT_SECRET not set`

Run `npx wrangler secret put JWT_SECRET` and paste 32+ random chars.

### `dist/ not found` during `wrangler deploy`

Run `npx vite build` first — `wrangler.toml` assets directory is `./dist`.

### D1 migration fails `--remote`

Ensure `migrations/0001_initial.sql` is valid SQLite. Run locally first: `npx wrangler d1 migrations apply prism-analytics-db --local`.

### Worker returns 500

Check `npx wrangler tail` logs. Common: missing env var, D1 binding.

---

## Database

### `DATABASE_URL` connection refused locally

Ensure PostgreSQL running:

```bash
ps aux | grep postgres
# If not:
sudo service postgresql start
# Or use docker:
docker run --name prism-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=app_db -p 5432:5432 -d postgres:15
```

### Schema drift between PG and D1

Keep `src/db/schema.ts` (PG) and `migrations/0001_initial.sql` (D1 SQLite) in sync manually. They use different dialects (PG vs SQLite).

---

## Frontend

### Dark theme not showing

We force `class="dark"` on `<html>` in layout.tsx. If you added light mode toggle, check localStorage.

### Toasts not showing

Wrap app in `<ToastProvider>` — Dashboard.tsx already does. If you added new page, wrap it.

### World map not interactive

SVG paths are simplified. If country not clickable, it may not be in `COUNTRIES` object. Add it to `WorldMap.tsx`.

### Mobile menu stuck open

Click overlay button (semi-transparent backdrop) to close. If not working, check `mobileOpen` state.

---

## Debug Commands

```bash
# Health
curl -i http://localhost:3000/api/health

# Version
curl http://localhost:3000/api/version | jq

# Email check
curl -X POST http://localhost:3000/api/auth/check-email -H "Content-Type: application/json" -d '{"email":"test@gmail.com"}' | jq

# Track test (browser UA to avoid bot filter)
curl -X POST http://localhost:3000/api/track -H "Content-Type: application/json" -H "User-Agent: Mozilla/5.0" -d '{"site_id":"pa_test","pathname":"/test"}' -i

# List tables
psql $DATABASE_URL -c "\dt"
psql $DATABASE_URL -c "SELECT * FROM users LIMIT 5;"
```

---

**Need more?** Open issue with logs: `npm run build`, `curl -i /api/health`, browser console.

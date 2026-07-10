# 10 — Environment Variables — Complete Reference

All credentials are read from `.env` (local) or via Wrangler secrets (Cloudflare production). **Never commit real secrets.**

## Quick Setup

```bash
cp .env.example .env
# Edit .env, then:
npx wrangler secret put JWT_SECRET   # for Cloudflare Workers production
```

---

## Table

| Variable | Required | Default | Where Used | Description | How to Generate |
|----------|----------|---------|------------|-------------|-----------------|
| `DATABASE_URL` | Yes (Next preview) | — | `src/db/index.ts` | PostgreSQL connection for local dev. Worker uses D1 binding instead. | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Yes | — | `src/lib/auth-helpers.ts`, `src/worker/utils/auth.ts` | HS256 signing key, min 32 chars. Used for JWT + daily salt derivation. In prod set via `wrangler secret put`. | `openssl rand -base64 48` |
| `APP_URL` | No | `https://prism-analytics.example.workers.dev` | `wrangler.toml`, `proxy.ts` | Production origin for CORS allow-list & OG tags. | Your custom domain or `*.workers.dev` |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Frontend (client) | Used to build tracking snippet URL in copy-paste box. | Same as `APP_URL` or localhost |
| `CLOUDFLARE_API_TOKEN` | Yes (deploy) | — | GitHub Actions, Wrangler CLI | API token with Workers, D1, KV, R2 permissions. Set as GitHub Secret. | Cloudflare dashboard → My Profile → API Tokens → Create Custom |
| `CLOUDFLARE_ACCOUNT_ID` | Yes (deploy) | — | GitHub Actions, Wrangler CLI | Account ID. Set as GitHub Secret. | Dashboard → Right sidebar |
| `R2_BUCKET_NAME` | No | `prism-analytics-storage` | `wrangler.toml` | R2 bucket for anonymized exports (optional archiving). | `npx wrangler r2 bucket create ...` |
| `RESEND_API_KEY` | No | — | Future email alerts (not in v1.0.0) | If you add traffic spike emails. | resend.com |
| `RATE_LIMIT_*` | No | See code | `src/lib/auth-helpers.ts` | Tune rate limits. Defaults: track 300/min, auth 10/15min, signup 5/h. | Env or code edit |

---

## How Each Credential Is Used (Visual)

```
Browser ──► /api/auth/signup ──► checks .env?
                                 ├─► JWT_SECRET for signing token
                                 └─► DATABASE_URL for pg client
                                          │
                                          ▼
                                   D1 (Worker binding, no env)
                                   KV (salt, no env)
                                   R2 (bucket, binding)

Worker Deploy:
  Option A (Automated via `npm run setup` / `node setup.js`):
    ├─► Automatically runs `wrangler d1 create` and injects `database_id` into wrangler.toml
    ├─► Automatically runs `wrangler kv namespace create` and injects `id` into wrangler.toml
    ├─► Automatically runs `wrangler r2 bucket create`
    ├─► Automatically generates a 48-byte `JWT_SECRET` & pipes to `wrangler secret put JWT_SECRET`
    └─► Automatically sets `vars.APP_URL` after deployment!

  Option B (Manual copy-paste into `wrangler.toml`):
    ├─► database_id  (from `wrangler d1 create`)
    ├─► KV id        (from `kv namespace create`)
    ├─► R2 bucket    (name)
    └─► `wrangler secret put JWT_SECRET`  → encrypted inside Cloudflare
```

---

## Security Checklist for Env

- [ ] `JWT_SECRET` is ≥32 chars, random, not reused (generate fresh per env)
- [ ] `.env` added to `.gitignore` (already)
- [ ] `DATABASE_URL` uses strong password, not default `postgres:postgres` in prod
- [ ] No `JWT_SECRET` committed in `wrangler.toml` (should only be via `wrangler secret put`)
- [ ] GitHub Secrets `CLOUDFLARE_API_TOKEN` scoped least-privilege (Workers Edit, D1 Edit, KV Edit, R2 Edit)
- [ ] `APP_URL` is HTTPS in prod
- [ ] Rotate `JWT_SECRET` yearly → existing sessions invalidated (intentional)

---

## How to Edit What via Env

| Want to change | Edit |
|----------------|------|
| DB connection | `DATABASE_URL` in `.env` |
| JWT expiry | `src/lib/security.ts` → `setExpirationTime("7d")` |
| PBKDF2 iterations | `src/lib/security.ts` → `ITERATIONS = 210_000` |
| Rate limit thresholds | `src/lib/auth-helpers.ts` → `rateLimit(key, max, window)` calls in each route |
| CORS allowed origins | `src/proxy.ts` + `wrangler.toml` `vars.APP_URL` |
| Blocked disposable domains | `src/lib/security.ts` → `DISPOSABLE_DOMAINS` Set |
| Bot patterns | `src/lib/bot-detection.ts` → `BOT_PATTERNS` |

---

**Next:** [09-DEPLOYMENT.md](./09-DEPLOYMENT.md) — how to deploy with these vars.

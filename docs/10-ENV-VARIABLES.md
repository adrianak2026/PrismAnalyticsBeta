# 10 — Environment Variables and Cloudflare Bindings

PrismAnalytics v1.0.0 uses **D1 SQLite and Backblaze B2** in Cloudflare production. Cloudflare R2 is not used, so deployment does not request a paid Cloudflare storage subscription or credit card. B2 credentials can be configured as environment variables.

## Fastest setup

```bash
npm install
npm run setup
```

Wrangler 4 automatically provisions the D1 database because `wrangler.toml` contains a `DB` binding without an account-specific ID.

## Environment variables

| Variable | Required | Scope | Purpose |
|---|---:|---|---|
| `DATABASE_URL` | Local Next preview only | Server | PostgreSQL URL used by the platform preview. Cloudflare production uses D1, not this variable. |
| `JWT_SECRET` | Optional | Server/Worker | Recommended encrypted override for JWT signing. Set with `wrangler secret put JWT_SECRET`. If absent in Cloudflare, a random key is generated and persisted in private D1 `app_secrets`. |
| `APP_URL` | Optional | Worker | Exact production origin for dashboard API CORS. Empty means reflect the requesting dashboard origin; `/api/track` remains public wildcard. |
| `B2_ENDPOINT` | Optional | Worker | S3 Endpoint for Backblaze B2 (e.g. `https://s3.us-east-005.backblazeb2.com`). |
| `B2_BUCKET_NAME` | Optional | Worker | Bucket Name for Backblaze B2 (e.g. `prism-data-bucket`). |
| `B2_REGION` | Optional | Worker | Region for Backblaze B2 (e.g. `us-east-005`). |
| `B2_APPLICATION_KEY_ID` | Optional | Worker | Application Key ID for Backblaze B2. |
| `B2_APPLICATION_KEY` | Optional | Worker | Application Key for Backblaze B2. |
| `CLOUDFLARE_API_TOKEN` | CI only | GitHub secret | Least-privilege Workers Edit + D1 Edit token. |
| `CLOUDFLARE_ACCOUNT_ID` | CI only | GitHub secret | Cloudflare account identifier. |

## Cloudflare bindings

```toml
[[d1_databases]]
binding = "DB"
database_name = "prism-analytics-db"
migrations_dir = "migrations"
```

No `database_id` is committed. Wrangler provisions it automatically on deploy. No Cloudflare R2 bucket or KV namespace bindings are used.

## Secret behavior

```text
Preferred:
  JWT_SECRET in Cloudflare encrypted secret store
      └─ npx wrangler secret put JWT_SECRET

Zero-config fallback:
  first API request
      └─ crypto.randomUUID() + crypto.randomUUID()
          └─ INSERT OR IGNORE app_secrets(jwt_signing_key_v1)
              └─ private D1 binding, stable across Worker isolates
```

The fallback is not committed to Git, returned by APIs, or exposed to the browser.

## Local files

- `.env` and `.env.local` are ignored by Git.
- `.env.example` contains placeholders only.
- `.dev.vars`, `.jwt-secret-backup.txt`, `.wrangler/`, `.next/`, `dist/`, and `node_modules/` are ignored.

## Generate a strong external secret

```bash
openssl rand -base64 48
npx wrangler secret put JWT_SECRET
```

## Security checklist

- [ ] Never place `JWT_SECRET` under `[vars]` in `wrangler.toml`.
- [ ] Never commit `.env` or `.env.local`.
- [ ] Restrict GitHub API token to Workers + D1.
- [ ] Use HTTPS custom domain in production.
- [ ] Keep strict hash mode enabled for every site.
- [ ] Raw-IP mode is opt-in and may require consent/legal review.

## What to edit

| Goal | File |
|---|---|
| Change Worker name | `wrangler.toml` or answer `npm run setup` prompt |
| Change D1 database name | `wrangler.toml` |
| Change JWT duration | `src/lib/security.ts` and `src/worker/utils/auth.ts` |
| Change rate limits | Next API routes and `src/worker/utils/security.ts` |
| Change CORS | `src/proxy.ts` and `src/worker/index.ts` |
| Change schema | `src/db/schema.ts`, `src/worker/db/schema.ts`, `migrations/` |

No paid storage service is required.

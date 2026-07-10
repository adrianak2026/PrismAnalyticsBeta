# 09 — Deployment — Cloudflare One-Click + Manual

## One-Click Deploy to Cloudflare Button

Add to README:

```md
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yourusername/prism-analytics)
```

Requirements:
- Repo must have `wrangler.toml` with `name`, `main`, `compatibility_date`
- GitHub Secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set
- Workflow `.github/workflows/deploy.yml` exists (we provide)

---

## Manual Deploy (9 Steps)

### 1. Prerequisites

- Cloudflare account (free tier OK)
- Node.js 18+
- Git

### 2. Clone & Install

```bash
git clone https://github.com/SudhirDevOps1/PrismAnalytics.git
cd PrismAnalytics
npm install
```

---

### Option A: One-Click Automated Setup CLI (`npm run setup` — Easiest & Fastest!)

We built an interactive, FormForge-inspired setup tool (`setup.js`) that automates every single creation and configuration step:

```bash
npm run setup
```

**That single command handles:**
- Pre-checking Cloudflare login (`npx wrangler login`).
- Auto-creating your D1 Database (`prism-analytics-db`) and writing `database_id` cleanly into `wrangler.toml`.
- Auto-creating your KV Namespace (`KV`) and writing `id` cleanly into `wrangler.toml`.
- Auto-creating your R2 Storage Bucket (`prism-analytics-storage`).
- Auto-generating a ultra-secure 48-byte `JWT_SECRET` and storing it encrypted inside Cloudflare via `wrangler secret put JWT_SECRET`.
- Applying D1 database schema migrations (`migrations/0001_initial.sql`).
- Building optimized frontend assets (`vite build`) and deploying your Worker globally (`wrangler deploy`).
- Printing your live `https://prism-analytics.<your-subdomain>.workers.dev` URL!

---

### Option B: Step-by-Step Manual Provisioning

If you need fine-grained manual control over each Cloudflare command:

#### 1. Login to Cloudflare
```bash
npx wrangler login
```

#### 2. Build and deploy with automatic D1 provisioning
```bash
npx vite build
npx wrangler deploy
```

#### 3. Apply migrations (optional safety step)
```bash
npx wrangler d1 migrations apply DB --remote
```
The Worker also runs an idempotent D1 schema bootstrap before APIs, so first signup cannot fail on an empty database.

#### 4. Optional external secret override
```bash
npx wrangler secret put JWT_SECRET
# Generate with: openssl rand -base64 48
```
Without this override, the Worker creates a random signing key in its private D1 `app_secrets` table.

Done! Visit `https://prism-analytics.YOUR_SUBDOMAIN.workers.dev`

---

## Custom Domain

Cloudflare Dashboard → Workers & Pages → Your Worker → Settings → Domains & Routes → Add Custom Domain → e.g. `analytics.yourdomain.com` → Update `APP_URL` in `wrangler.toml` + redeploy.

## Environment Variables per Environment

| Env | How |
|-----|-----|
| Local dev (Next) | `.env` → `DATABASE_URL`, `JWT_SECRET` |
| Local Worker (`wrangler dev`) | `.dev.vars` or `wrangler.toml` `[vars]` + local D1 |
| Production Worker | `wrangler secret put JWT_SECRET` + `wrangler.toml` vars |

See [10-ENV-VARIABLES.md](./10-ENV-VARIABLES.md)

## GitHub Actions CI/CD

`.github/workflows/deploy.yml`:

- On push to `main`: runs `npm ci`, `tsc --noEmit`, `vite build`, `wrangler d1 migrations apply --remote`, `wrangler deploy`
- Needs least-privilege `CLOUDFLARE_API_TOKEN` (Workers Edit + D1 Edit only) and `CLOUDFLARE_ACCOUNT_ID` as GitHub secrets.
- Protect `main` branch, require PR review.

## Troubleshooting Deploy

| Error | Fix |
|-------|-----|
| `database_id missing` | Paste real ID from `d1 create` |
| `KV id missing` | Paste real ID from `kv namespace create` |
| `JWT_SECRET not set` | `wrangler secret put JWT_SECRET` |
| `/api/track 404` | Check `wrangler.toml` `main` points to `src/worker/index.ts`, and assets dir exists |
| `dist/ not found` | Run `npx vite build` first |
| CORS blocked on track | Ensure Worker returns `Access-Control-Allow-Origin: *` for `/api/track` (it does) |

---

**Visual Deployment Pipeline:**

```
push main → GitHub Actions
   ├── npm ci
   ├── typecheck
   ├── vite build → dist/
   ├── d1 migrations apply --remote
   └── wrangler deploy → Cloudflare global edge
           │
           └─► https://prism-analytics.xxx.workers.dev
                 ├─► serves Dashboard (Next)
                 └─► /api/* handled by Hono Worker
```

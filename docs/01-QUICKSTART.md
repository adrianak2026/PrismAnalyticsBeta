# 01 — Quickstart (5 min)

## Local (Next.js preview — no Cloudflare account needed)

```bash
git clone https://github.com/yourusername/prism-analytics.git
cd prism-analytics
cp .env.example .env
# Edit .env: DATABASE_URL + JWT_SECRET (min 32 chars)
npm install
npx drizzle-kit push --config drizzle.config.json
npm run dev
# Open http://localhost:3000
# Signup → Add site → Copy tracking code → Use in your test page
```

Test tracking locally:

```bash
curl -X POST http://localhost:3000/api/track \
  -H "Content-Type: application/json" \
  -d '{"site_id":"pa_test","pathname":"/","referrer":""}'
# → GIF or {status:"ignored"} for bot UA
```

## Cloudflare Worker (Automated One-Click Edge Setup)

Instead of manually running multiple creation commands and copying IDs, use our **FormForge-inspired automated setup**:

```bash
npm install
npm run setup
```

**That's it.** `setup.js` deploys with Wrangler automatic D1 SQLite provisioning, applies/self-bootstraps the schema, optionally stores `JWT_SECRET` in Cloudflare encrypted secrets, builds the Vite dashboard, and deploys. No Cloudflare R2, KV, resource-ID copy/paste, paid subscription, or credit card is required (Backblaze B2 can be configured for exports).

If you wish to test locally with Cloudflare Workers after setup:

```bash
npx wrangler dev
# Test at http://localhost:8787
```

## Signup Flow Visual

```
[Login page]
  Email input → debounced 600ms → POST /api/auth/check-email → shows ✅ MX valid or ❌ disposable
  Password input → live 5-bar strength
  Submit → POST /api/auth/signup → 201 + JWT → stored in localStorage → redirect Dashboard
```

## Add First Site

1. Dashboard → Sites → Add a site → Name + Domain
2. Tracking tab shows 12 framework snippets → pick yours → Copy
3. Paste into your site `<head>`
4. Visit your site → back to Dashboard → Overview → should see pageview after 10s live poll + timeline tomorrow

---

**Next:** [02-ARCHITECTURE.md](./02-ARCHITECTURE.md)

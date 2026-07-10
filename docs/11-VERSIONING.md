# 11 — Versioning & Changelog

## Versioning Scheme

Semantic Versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking API, DB schema breaking, privacy model change
- **MINOR**: New features, new endpoints, non-breaking
- **PATCH**: Bug fixes, security patches

Version source of truth: `src/lib/version.ts` + `package.json` must match.

## Current Version — v1.0.0 First Light (2026-07-10)

### Added

- Privacy-first tracking: no cookies, no IP storage, daily salted SHA-256 hashing
- Multi-tenant auth: JWT + session revocation + PBKDF2 210k + audit log
- Email validation: MX via Cloudflare DoH, disposable block, strength meter
- 12 framework snippets: HTML, React, Next.js, Vue, Nuxt, Angular, Svelte, GTM, WordPress, Shopify, Webflow, Wix (+ Bootstrap)
- World map: 60+ countries SVG with hover tooltip
- Live visitors: 10s polling, active pages
- Timeline charts: 7/30/90 days, pageviews + unique
- Ranked tables: pages, referrers, countries, devices, browsers, OS
- Export: CSV/JSON with safe slug, audited
- Security: rate limiting DB-backed, account lockout 5→15m, bot detection 30+ patterns, malicious pattern detection, CSP+HSTS+etc
- UI: Dark theme default, responsive 320-2560, toast, modals, PWA manifest, favicons
- API: 13 endpoints documented
- Docs: 20+ MD files, visual guides, architecture diagrams, privacy policies (4), DPA, GDPR checklist, audit report
- Infra: Wrangler + auto-provisioned D1 SQLite, GitHub Actions CI/CD, one-click deploy button; no Cloudflare R2 subscription (supports Backblaze B2)

### Security

- Fixed 6 critical: package.json misnamed, JWT fallback weak, no session revocation, in-memory rate limit, no lockout, missing security headers
- Fixed 8 high: disposable emails, MX, password strength, audit log, bot detection, honeypot, favicon/PWA, XSS in referrer

### Known Limitations

- No email alerts yet (Resend integration planned v1.1)
- No team access (shared sites) — planned v1.2
- Timeline avgSessionDuration placeholder —
- Recharts hydration warning non-blocking (minWidth fix applied)
- World map SVG simplified polygons (not geojson) — ~95% traffic coverage, good enough for free tier

---

## Upgrade Guide

### v0.x → v1.0.0

Breaking:

- `middleware.ts` → `proxy.ts` (Next 16): rename file, export `proxy` instead of `middleware`
- `package.json` name changed from `nextjs-postgresql-template` → `prism-analytics`
- New required tables: `rate_limits`, `audit_log`, `sessions` — run `npx drizzle-kit push --config drizzle.config.json` (local) + `wrangler d1 migrations apply --remote` (prod)
- `JWT_SECRET` must be ≥32 chars in production or boot throws
- New env: none required, but add `APP_URL` in `wrangler.toml`

Steps:

1. Backup D1: `npx wrangler d1 export prism-analytics-db --remote --output backup.sql`
2. Pull latest main
3. `npm install`
4. `npx drizzle-kit push --config drizzle.config.json`
5. `npx wrangler d1 migrations apply --remote`
6. `npx vite build && npx wrangler deploy`

### Future Roadmap

- v1.1: Email alerts (traffic spike), Resend integration
- v1.2: Team invites, shared sites
- v1.3: Funnel builder, retention
- v2.0: Self-hosted Plausible import, multi-region D1

---

## How to Bump Version

1. Edit `src/lib/version.ts` — `VERSION`, `VERSION_NAME`, add entry to `CHANGELOG`
2. Edit `package.json` — same version
3. Run `npm run build` — ensure passes
4. Commit: `chore: bump vX.Y.Z`
5. Tag: `git tag vX.Y.Z && git push --tags`
6. GitHub Actions will deploy if on main.

Version endpoint `/api/version` will return new version automatically.

---

**API Versioning:** `/api/` currently v1 implicit. Future breaking API changes will use `/api/v2/` prefix.

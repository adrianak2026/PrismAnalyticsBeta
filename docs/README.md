# 📚 PrismAnalytics Documentation Hub

> **Version:** 1.0.0 — *First Light*
> **Last Updated:** 2026-07-10

Welcome to the complete PrismAnalytics docs. This hub links to every guide, policy, and integration.

```
docs/
├── 00-OVERVIEW.md              ← Start here: what is Prism?
├── 01-QUICKSTART.md            ← 5-min local setup
├── 02-ARCHITECTURE.md          ← Diagrams + data flow
├── 03-DATABASE.md              ← Tables, indexes, privacy model
├── 04-AUTH-SECURITY.md         ← JWT, rate limits, MX checks
├── 05-API-REFERENCE.md         ← All 13 endpoints
├── 06-TRACKING-SCRIPT.md       ← Core script explained
├── 07-INTEGRATIONS/            ← Framework guides (12)
│   ├── html.md
│   ├── react.md
│   ├── nextjs.md
│   ├── vue.md
│   ├── nuxt.md
│   ├── angular.md
│   ├── svelte.md
│   ├── gtm.md
│   ├── wordpress.md
│   ├── shopify.md
│   ├── webflow.md
│   └── wix.md
├── 08-PRIVACY/
│   ├── PRIVACY-POLICY.md       ← User-facing policy
│   ├── COOKIE-POLICY.md        ← No cookies!
│   ├── DPA.md                  ← Data Processing Agreement
│   ├── GDPR-COMPLIANCE.md      ← GDPR checklist
│   └── DATA-DELETION.md        ← How to delete
├── 09-DEPLOYMENT.md            ← Cloudflare one-click + manual
├── 10-ENV-VARIABLES.md         ← Every env var explained
├── 11-VERSIONING.md            ← Changelog + upgrade guide
├── 12-TROUBLESHOOTING.md       ← Common errors
├── AUDIT-REPORT.md             ← Professional security audit
└── VISUAL-GUIDE.md             ← Screenshots / edit flow
```

## Quick Links

| Goal | Doc |
|------|-----|
| **Install snippet on my site** | [Tracking Script](./06-TRACKING-SCRIPT.md) + [Integrations](./07-INTEGRATIONS/) |
| **Self-host on Cloudflare** | [Deployment](./09-DEPLOYMENT.md) |
| **Understand privacy** | [Privacy Policy](./08-PRIVACY/PRIVACY-POLICY.md) |
| **Integrate via API** | [API Reference](./05-API-REFERENCE.md) |
| **Check env vars** | [ENV Variables](./10-ENV-VARIABLES.md) |
| **See what's fixed** | [Audit Report](./AUDIT-REPORT.md) |

## Visual Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Your Website (any framework)                               │
│  + 1 script: window.prism()                                 │
│              │                                              │
│              │  navigator.sendBeacon                        │
│              ▼                                              │
│  ┌──────────────────┐      ┌─────────┐      ┌──────┐       │
│  │ Cloudflare Worker│─────▶│  D1 DB  │      │  B2  │       │
│  │  /api/track      │      │ (pageviews)   │  CSV  │       │
│  │  /api/analytics  │◀─────│ daily_stats │  │ JSON │       │
│  │  /api/sites      │      │ sites/users │  │      │       │
│  └──────────────────┘      └─────────┘      └──────┘       │
│         │                      │                            │
│         │  Rate Limit          │  Hashed IP                 │
│         ▼                      ▼                            │
│     [KV daily salt]      [No raw IP ever]                   │
│                                                             │
│  ┌──────────────────┐                                       │
│  │  Next.js Dashboard│ ← You                              │
│  │  Dark mode, Maps  │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
```

## How to Edit Anything

All user-editable code lives in `src/`:

| Edit What | File |
|-----------|------|
| Colors / theme | `src/app/globals.css` |
| Logo / icon | `public/icon.png` + `public/icons/` |
| Pricing / copy | `src/app/components/Dashboard.tsx` |
| Auth logic | `src/lib/security.ts` + `src/lib/auth-helpers.ts` |
| Rate limits | `src/lib/auth-helpers.ts` → `rateLimit()` |
| Tracking payload | `src/app/api/track/route.ts` + `src/app/components/TrackingScript.tsx` |
| DB schema | `src/db/schema.ts` + `migrations/0001_initial.sql` |
| MX/domains blocklist | `src/lib/security.ts` → `DISPOSABLE_DOMAINS` |
| CSP / security headers | `src/proxy.ts` |
| Version | `src/lib/version.ts` + `package.json` |

See [VISUAL-GUIDE.md](./VISUAL-GUIDE.md) for annotated screenshots.

## Production Checklist

- [ ] `.env` has strong `JWT_SECRET` (32+ chars)
- [ ] `wrangler.toml` has real D1 ID, KV ID
- [ ] `APP_URL` points to your domain
- [ ] D1 migrations applied `--remote`
- [ ] `npm run build` passes
- [ ] `/api/health` returns 200
- [ ] Tracking snippet tested on a real page
- [ ] Export (CSV/JSON) downloads
- [ ] Delete site cascade works
- [ ] Rate limit triggers after 10 logins / 15 min

---

**Next:** Read [00-OVERVIEW.md](./00-OVERVIEW.md)

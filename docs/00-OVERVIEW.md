# 00 — Overview: What is PrismAnalytics?

## The Problem

> 92% of analytics tools plant cookies, fingerprint your visitors, sell data, and slow pages by 200-500ms.

Google Analytics alone adds ~110 kB, requires cookie banners (GDPR), and sends data to third parties.

## The Solution: PrismAnalytics v1.0.0

A **privacy-first, cookie-free, self-hosted** platform that lives 100% in your Cloudflare account.

```
Your visitors → Your Worker → Your D1 → Your R2 → Your Dashboard
                                 (no third party ever sees data)
```

### Core Principles

| Principle | How |
|-----------|-----|
| **No cookies** | Session ID lives in `sessionStorage`, random UUID, not persistent |
| **No IP stored** | IP + UA + daily rotating salt → SHA-256 → only hash stored |
| **No fingerprint** | No canvas, WebGL, fonts enumeration |
| **No third party** | No Google, no Facebook, no external CDN for analytics |
| **Your infra** | D1 (SQLite on edge), KV (salt), R2 (exports) — all yours |
| **Open & auditable** | MIT, ~4k LOC, read it in 30 min |

### What You Track

- **Pageviews** — pathname, referrer, country (from CF), device/browser/OS (from UA parsing, not stored)
- **Custom events** — `window.prism('purchase', {value: 99})`
- **UTM** — `utm_source`, `utm_medium`, `utm_campaign` auto-captured
- **Live** — visitors active in last 5 minutes

### What You Do NOT Track

- ❌ IP addresses (only daily salted hash)
- ❌ User-Agent strings (only parsed → device label)
- ❌ Emails, names, personal data in pageviews
- ❌ Cross-site tracking
- ❌ Cookies / localStorage persistence (except session tab)

### Stack

| Component | Tech | Why |
|-----------|------|-----|
| Frontend | Next.js 16 (preview) + Tailwind CSS v4 + shadcn/ui + Lucide + Recharts | Modern, dark-first, responsive |
| Backend Worker | Hono.js on Cloudflare Workers | <50 ms cold start |
| DB | D1 (SQLite) + PostgreSQL for Next preview | Free tier friendly |
| Storage | R2 | Cheap archive |
| Salt | KV | 48h TTL per day |
| Auth | JWT (jose) + PBKDF2 210k + session table | No external auth provider |
| ORM | Drizzle | Type-safe |
| Deploy | Wrangler + GitHub Actions | One-click deploy button |

### Data Model Visual

```
users (id, email UNIQUE, password_hash, failed_logins, locked_until)
  │
  └─▶ sites (id, user_id FK CASCADE, name, domain, tracking_code UNIQUE)
         │
         ├── pageviews (id, site_id FK CASCADE, occurred_at, pathname, referrer,
         │              user_hash (daily salted), country, device, browser, os,
         │              session_id, event_name, event_data JSON, UTMs)
         │
         └── daily_stats (site_id + date PK, views, unique_visitors)

rate_limits (key PK, count, window_start) — per-IP per-endpoint
audit_log (id, user_id, action, metadata JSON, ip_hash)
sessions (id, user_id FK CASCADE, token_hash, ua_hash, expires_at, revoked_at)
```

### Feature Matrix

| Feature | v1.0.0 |
|---------|--------|
| Track pageviews | ✅ |
| Custom events | ✅ |
| UTM | ✅ |
| Live visitors (5 min) | ✅ polling 10s |
| Top pages / referrers | ✅ |
| Countries / Devices / Browsers / OS | ✅ |
| World map | ✅ 60+ countries SVG |
| Timeline chart (7/30/90 days) | ✅ |
| CSV / JSON export | ✅ |
| Multi-tenant isolation | ✅ strict |
| Email MX verification | ✅ Cloudflare DoH |
| Disposable email block | ✅ 24+ domains |
| Rate limiting | ✅ DB-backed |
| Account lockout | ✅ 5 fails → 15 min |
| Password strength meter | ✅ |
| Audit logging | ✅ |
| CSP + HSTS + X-Frame | ✅ |
| Dark theme default | ✅ |
| Responsive (320px → 4k) | ✅ |
| 12 framework snippets | ✅ |
| PWA + icons | ✅ |
| Version API | ✅ |
| Data deletion cascade | ✅ |
| No cookies | ✅ |

### Limits (Free Tier Cloudflare)

- D1: 5M rows read/day, 100k writes/day — enough for ~10k pageviews/day
- KV: 100k reads/day — salts are tiny
- R2: 10 GB storage free — exports only
- Workers: 100k requests/day — track + dashboard

For >100k pageviews/day, enable D1 autoscaling or archive old rows to R2 via cron.

### Non-Goals

- Not a marketing automation tool (no email blasts)
- Not a session replay (no DOM recording)
- Not a funnel builder (yet — roadmap)
- Not a competitor to Mixpanel/Amplitude for product analytics — focused on **simple web analytics**

---

**Next:** [01-QUICKSTART.md](./01-QUICKSTART.md) — get it running in 5 min.

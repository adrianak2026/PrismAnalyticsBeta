# 02 — Architecture — Diagrams & Data Flow

## High-Level

```
                    ┌─────────────────────┐
                    │  User's Website     │
                    │  Any framework      │
                    │  + prism tracking   │
                    └─────────┬───────────┘
                              │ sendBeacon POST /api/track
                              ▼
                    ┌─────────────────────┐
                    │ Cloudflare Worker   │
                    │  Hono.js            │
                    │  ──────────────     │
                    │  • Rate limit 300/m │
                    │  • Bot filter       │
                    │  • MX & malware chk │
                    │  • SHA256(IP|UA|salt)│
                    └────┬──────┬────┬────┘
                         │      │    │
              ┌──────────┘      │    └──────────┐
              ▼                 ▼               ▼
         ┌─────────┐       ┌────────┐      ┌──────┐
         │   D1    │       │   KV   │      │  R2  │
         │ SQLite  │       │ salt/48h│      │ CSV  │
         │ Edge    │       └────────┘      │ JSON │
         └────┬────┘                       └──────┘
              │ ▲
              │ │ analytics query
              ▼ │
        ┌──────────────┐
        │  Next.js UI  │
        │  Dashboard   │
        │  Dark theme  │
        │  Maps, Charts│
        └──────────────┘
              │
              ▼
           [You]
```

## Request Lifecycle — Track

```
1. Browser executes tracking snippet
2. POST /api/track {site_id, pathname, referrer, session_id, event, UTM}
   Headers: CF-Connecting-IP, User-Agent, CF-IPCountry
3. Server:
   a. Validate Zod schema (max lengths, regex for event_name)
   b. containsMaliciousPattern(pathname, referrer) → if true, ignore (200)
   c. Resolve site by tracking_code OR id
   d. isBot(ua) → if bot, return 200 not inserted
   e. rateLimit(ipHash) → 300/min, 429 if exceeded
   f. dailyUserHash(ip, ua, dailySalt) where salt = sha256(JWT_SECRET + date).slice(0,32)
   g. Check seen today? (pageviews where user_hash + site_id + occurred_at >= dayStart)
   h. Insert pageview: all fields but NO raw IP, NO raw UA — only hash + parsed device/browser/os + country
   i. Upsert daily_stats: views++, unique++ if new visitor today
4. Return 1x1 GIF (or JSON {status}) with CORS *
```

## Request Lifecycle — Auth

```
Signup:
  POST /api/auth/signup {name, email, password}
  → rateLimit(ip) 5/h
  → isValidEmailFormat, isDisposableEmail
  → passwordStrength score ≥3
  → checkMXRecords(email) via Cloudflare DoH (1.1.1.1)
  → hashPassword PBKDF2 210k iter + random 16-byte salt + timingSafeEqual verify
  → insert users
  → createJWT (sub=email, issuer=prism-analytics, 7d expiry)
  → insert sessions (token_hash = sha256(token))
  → audit_log signup

Login:
  POST /api/auth/login {email, password}
  → rateLimit(ip) 10/15m
  → if user locked_until > now → 423
  → verifyPassword (timingSafeEqual)
  → on fail: increment failed_login_attempts, lock after 5 → 15min, audit login_failed
  → on success: reset failed, create JWT + session, audit login_success
```

## Request Lifecycle — Analytics Query

```
GET /api/analytics?siteId=xxx&days=30
  Bearer token → verifyJWT → check sessions.token_hash not revoked + not expired
  → verify site belongs to user (sites.user_id = auth.id)
  → Parallel queries:
      count(*), countDistinct(user_hash) for total & unique
      countDistinct where occurred_at >= now-5m for live
      group by pathname, referrer, country, device, browser, os
      timeline: to_char(to_timestamp(occurred_at/1000) AT TIME ZONE 'UTC', 'YYYY-MM-DD')
  → compute bounceRate = single-page sessions / all sessions
  → build timeline map for missing dates (fill 0)
```

## Privacy Layer Visual

```
Real IP: 203.0.113.45
UA: Mozilla/5.0...

         ┌──────────────────────┐
         │ dailySalt = sha256(JWT_SECRET + "2026-07-10").slice(0,32) │
         │ stored in KV? No — derived deterministically, rotated by date │
         └──────────┬───────────┘
                    │
                    ▼
         SHA256(IP | UA | salt) → a3f9... (64 hex chars)
                    │
                    ▼
         Stored as pageviews.user_hash
         Raw IP & UA never touch DB, logs, or R2.
```

## Deployment Architecture

```
GitHub push main
   │
   ├─► GitHub Actions (.github/workflows/deploy.yml)
   │     ├─► npm ci
   │     ├─► tsc --noEmit
   │     ├─► vite build → dist/
   │     ├─► wrangler d1 migrations apply --remote
   │     └─► wrangler deploy → uploads Worker + assets + bindings
   │
   └─► Cloudflare
         ├─► Worker prism-analytics (Hono, handles /api/* + serves dist/)
         ├─► D1 prism-analytics-db (migrations/0001_initial.sql)
         ├─► KV namespace (salt cache, 48h TTL)
         └─► R2 bucket (exports, optional archiving)
```

---

**Next:** [03-DATABASE.md](./03-DATABASE.md)

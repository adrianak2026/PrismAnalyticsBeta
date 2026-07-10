# 04 — Auth & Security — Deep Dive

## Auth Flow Visual

```
[Signup API] POST /api/auth/signup {name,email,password}
  │
  ├─► rateLimit(signup:sha256(ip)) 5/hour
  ├─► isValidEmailFormat (RFC + length)
  ├─► isDisposableEmail (24 domains + pattern)
  ├─► passwordStrength score ≥3 (6-point)
  ├─► checkMXRecords via Cloudflare DoH
  │     ├─ trusted providers (gmail, outlook...) → bypass, allow
  │     └─ other domains → fetch https://cloudflare-dns.com/dns-query?name=domain&type=MX
  │                          → if no MX → 400 "No MX records"
  ├─► hashPassword: PBKDF2 210k + 16-byte random salt + base64
  ├─► insert users
  ├─► createJWT: HS256, sub=user.id, email, name, issuer=prism-analytics, 7d
  ├─► insert sessions: token_hash=sha256(jwt), ua_hash=sha256(ua), expires 7d
  └─► audit_log signup + ip_hash (salted)
  → 201 {user, token}

[Login]
  POST /api/auth/login {email,password}
  ├─► rateLimit(login:sha256(ip)) 10/15m
  ├─► find user by email
  ├─► if locked_until > now → 423 + audit login_blocked_locked
  ├─► verifyPassword: PBKDF2 + timingSafeEqual (constant-time)
  │     ├─ fail → increment failed_login_attempts, lock after 5 → 15min, audit login_failed
  │     └─ success → reset fails, create JWT + session, audit login_success
  └─► 200 {user, token}

[Authenticated request]
  Header: Authorization: Bearer <jwt>
  ├─► verifyJWT: algorithms HS256, issuer check
  ├─► sessions table: find by token_hash, expires_at > now, revoked_at IS NULL
  │     ├─ not found / revoked → 401
  │     └─ found → return user
  └─► proceed, check tenant ownership (sites.user_id = user.id)

[Logout]
  POST /api/auth/logout
  ├─► revokeToken: update sessions set revoked_at = NOW where token_hash
  └─► clear localStorage client side
```

## Password Hashing

```ts
// src/lib/security.ts
ITERATIONS = 210_000
KEY_LEN = 32
salt = randomBytes(16)
derived = pbkdf2Sync(password, salt, ITERATIONS, KEY_LEN, "sha256")
stored = `${ITERATIONS}.${salt.base64}.${derived.base64}`

verify:
  actual = pbkdf2Sync(input, storedSalt, storedIter, len)
  timingSafeEqual(actual, expected) // prevents timing attack
```

Why PBKDF2 and not bcrypt? PBKDF2 available in Node crypto without native deps, works in Cloudflare Workers (WebCrypto). 210k iterations ≈ ~300ms on modern CPU — slow enough.

## Rate Limiting

```ts
// DB-backed to survive serverless scaling
rate_limits table:
  key = "login:sha256(ip)" | "signup:sha256(ip)" | "track:sha256(ip)" | "emailcheck:sha256(ip)"
  count, window_start

Logic:
  if !existing or now - window_start > windowMs → reset count=1, window_start=now → allow
  if count >= max → deny, retryIn = windowMs - (now - window_start)
  else increment → allow
```

Thresholds:

| Endpoint | Max | Window |
|----------|-----|--------|
| signup | 5 | 1h |
| login | 10 | 15m |
| track | 300 | 1m |
| email check | 30 | 1m |

Frontend also shows friendly message: "Try again in X minutes".

## MX / Disposable Check (Gmail protection)

```ts
// Trusted providers bypass DNS to save latency
COMMON_PROVIDERS = gmail.com, yahoo.com, outlook.com, etc. → always valid

// Other domains:
fetch https://cloudflare-dns.com/dns-query?name=domain&type=MX
  Accept: application/dns-json
  → Answer filtered type=15 (MX)
  → no records → invalid

// Disposable:
DISPOSABLE_DOMAINS = tempmail.com, 10minutemail.com, guerrillamail.com, etc. (24)
// Pattern: ^(temp|throw|trash|junk|fake|spam|burner|10min|guerrilla)
```

Live frontend check: debounced 600ms POST /api/auth/check-email shows ✅ or ❌.

## Security Headers (proxy.ts + securityHeaders())

Every response gets:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-DNS-Prefetch-Control: off
X-Permitted-Cross-Domain-Policies: none
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; ...; object-src 'none'; upgrade-insecure-requests; frame-ancestors 'none'
```

API `/api/track` is CORS `*` intentionally (public tracking endpoint). Others use `APP_URL` allow-list.

## Bot Detection

```ts
BOT_PATTERNS = 30+ regex: bot, crawl, spider, headless, puppeteer, selenium, python-requests, curl, wget, lighthouse, etc.
+ length check 5-1000
```

If bot → return 200 {status:"ignored"} but do NOT insert into DB.

## Malicious Pattern Detection

```ts
containsMaliciousPattern(input):
  /UNION.*SELECT|SELECT.*FROM.*WHERE/i  (SQLi)
  /DROP TABLE|EXEC\(/i
  /<script|javascript:|on\\w+=["']/i     (XSS)
  /\.\.\/|%2e%2e/i                        (path traversal)
  /OR 1=1|AND 1=1/i                       (boolean injection)
```

Checked on site name, domain, pathname, referrer.

## Audit Log

Every sensitive action logs `ip_hash = sha256(ip|dailySalt)` — not raw IP.

Actions: signup, login_success, login_failed, login_blocked_locked, logout, site_created, site_deleted, analytics_export, account_deleted.

Query: `SELECT * FROM audit_log WHERE user_id = 'xxx' ORDER BY created_at DESC`

---

**Next:** [05-API-REFERENCE.md](./05-API-REFERENCE.md)

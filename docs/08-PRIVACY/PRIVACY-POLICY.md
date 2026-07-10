# Privacy Policy — PrismAnalytics

**Effective:** July 10, 2026
**Version:** 1.0.0

> PrismAnalytics is designed to be privacy-first. This document explains what we collect, what we don't, and your rights.

---

## Summary (TL;DR)

| We Collect | We Do NOT Collect |
|------------|-------------------|
| Page path (e.g. `/pricing`) | IP addresses (only daily salted hash) |
| Referrer (e.g. `google.com`) | Full User-Agent strings |
| Country (from Cloudflare) | Cookies or fingerprint |
| Device type, browser name, OS name (parsed, not raw UA) | Emails, names, personal data |
| UTM params | Cross-site behavior |
| Custom events YOU define (no PII) | Anything outside your site |

---

## 1. Data Controller

Since PrismAnalytics is **self-hosted** on your Cloudflare account, **you** are the data controller. We (PrismAnalytics open-source project) do not host or see your analytics data. If you use our hosted demo, data stays in demo D1 and is deleted weekly.

## 2. What Data Is Collected From Visitors?

When a visitor loads a page with our snippet:

- **pathname**: `location.pathname` (e.g. `/blog/my-post`)
- **referrer**: `document.referrer` (e.g. `https://google.com`) or empty for direct
- **session_id**: random UUID stored in `sessionStorage` (tab-scoped, not persistent)
- **screen_size**: `screen.width x height` (optional, not stored in v1.0.0 DB but sent)
- **utm_source/medium/campaign**: from URL query params
- **country**: from Cloudflare header `CF-IPCountry` (e.g. `US`)
- **device/browser/OS**: parsed from User-Agent server-side (e.g. `Mobile`, `Chrome`, `iOS`) — raw UA never stored
- **event_name + event_data**: custom events you trigger via `window.prism()`

### What is NOT collected?

- No cookies (`document.cookie` never touched)
- No `localStorage` persistence except tab session ID
- No IP stored: IP + UA + `sha256(JWT_SECRET + YYYY-MM-DD)` → SHA256 daily hash. Raw IP discarded after request.
- No fingerprinting: no canvas, WebGL, audio, fonts enumeration
- No email, name, address unless you put PII into custom event_data (please don't — against policy)

## 3. Legal Basis (GDPR)

- **Legitimate interest** (Article 6(1)(f) GDPR) for simple, anonymized analytics necessary to operate website, balanced with privacy by not storing personal data.
- No consent banner required in most interpretations because no cookies, no personal data. **But check your local counsel.**

## 4. Data Retention

- Raw pageviews: kept 90 days by default (configurable to 30 days, 1 year, forever)
- Aggregated daily_stats: kept forever (no PII)
- After retention: rows deleted (and archived to R2 if you enable archiving, anonymized only)

## 5. Data Deletion

- Site deletion: `DELETE /api/sites/[id]` → CASCADE deletes all pageviews for that site
- Account deletion: `DELETE /api/account` → deletes user, sites, pageviews, sessions, audit logs
- Visitor request: Since we don't store IP or link hash across days (salt rotates daily), we cannot identify a visitor beyond 24h — effectively auto-deleted by design.

## 6. Subprocessors

None. Data stays in your Cloudflare account (D1, KV, R2). No Google, no Facebook, no third-party analytics.

## 7. International Transfers

Data stays in Cloudflare region you choose. Cloudflare D1 is global but you can set jurisdiction. No transfer to us.

## 8. Visitor Rights

Visitors can:
- Enable Do Not Track (DNT) in browser → respectful mode (if you enable DNT toggle) skips tracking
- Use ad-blocker — snippet respects it (will be blocked)
- Contact you to delete — but daily salt rotation makes re-identification impossible after 24h.

## 9. Cookie Policy

**We use zero cookies.** See [COOKIE-POLICY.md](./COOKIE-POLICY.md)

## 10. Changes

We will version this policy. v1.0.0 dated 2026-07-10. Breaking changes bump major.

## 11. Contact

For privacy questions about self-hosted instance: contact the site owner where you saw analytics.
For project: open issue at https://github.com/yourusername/prism-analytics/issues

---

**Visual: Data Flow with Privacy**

```
Visitor Browser
  pathname, referrer, UTM, sessionStorage UUID
         │
         ▼
Worker (memory only)
  IP 203.0.113.45 + UA Chrome/125 + dailySalt ab12... → SHA256 → a3f9c1...
  Raw IP & UA discarded here, never logged
         │
         ▼
D1 stores: {path: /pricing, referrer: google.com, user_hash: a3f9..., country: US, device: Desktop}
           ^ no IP, no UA
```

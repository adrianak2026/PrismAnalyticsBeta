# GDPR Compliance Checklist — PrismAnalytics

## Art. 5 Principles

| Principle | How Prism Meets |
|-----------|-----------------|
| Lawfulness, fairness, transparency | Privacy policy discloses what is collected (path, referrer, country, device label, UTM). No hidden data. |
| Purpose limitation | Only for simple web analytics to improve site. Not for profiling or ads. |
| Data minimisation | No IP, no UA, no email, no fingerprint. Only essential anonymized fields. |
| Accuracy | Device/browser parsed but not guaranteed accurate — best-effort from UA. |
| Storage limitation | Raw pageviews 90 days default, configurable. daily_stats aggregated forever (no PII). |
| Integrity & confidentiality | PBKDF2 210k, JWT HS256, rate limits, audit logs, CSP, HSTS. |
| Accountability | Open-source, audit log, self-hostable, DPA available. |

## Art. 6 Lawful Basis

- **Legitimate interest** (6(1)(f)) — analytics necessary for site operation, balanced by minimisation (no PII). Document your Legitimate Interest Assessment (LIA).
- Alternative: Consent if you prefer — snippet can be gated behind consent.

## Art. 13 / 14 Information

Include in your site privacy policy:

> *We use PrismAnalytics, a self-hosted, cookie-free analytics tool. It collects anonymized page path, referrer, country, device type, browser, OS, and UTM parameters. No IP addresses or User-Agent strings are stored — only a daily rotating salted hash. No cookies. Data stays in our Cloudflare account. Retention 90 days.*

## Art. 17 Right to Erasure

- Self-host: Visitor cannot be identified after 24h due to daily salt rotation → effectively auto-erased.
- If visitor contacts you within 24h and provides `session_id` (from their browser sessionStorage), you could manually delete their rows (but rarely needed).
- Account deletion: `DELETE /api/account` cascade.

## Art. 25 Data Protection by Design

- PBKDF2 210k, timing-safe compare
- JWT + session revocation
- Rate limiting DB-backed
- No raw IP storage
- Minimal data model
- CSP + security headers

## Art. 28 DPA

If you host for clients, you are processor, client is controller. Use [DPA.md](./DPA.md) template.

## Art. 30 Records

Self-hosted — you keep ROPA. No processor ROPA needed if no subprocessors (there are none).

## Art. 35 DPIA

Needed if large-scale systematic monitoring. Prism is low-risk because no PII, no profiling. Document small DPIA referencing this checklist.

## ePrivacy & Cookie Banner

No cookies → no banner needed per most guidance. If your regulator requires notice for `sessionStorage`, add simple notice.

## Checklist for Site Owner (You)

- [ ] Add Prism description to your site privacy policy (copy from above)
- [ ] Set retention to 30 or 90 days (not forever) if you want stricter
- [ ] Enable DNT toggle if you want respect Do Not Track
- [ ] If you collect custom events, ensure no PII in event_data
- [ ] Keep audit logs (default on)
- [ ] If you have EU visitors, document LIA

---

**Disclaimer:** Not legal advice. Consult counsel for your jurisdiction.

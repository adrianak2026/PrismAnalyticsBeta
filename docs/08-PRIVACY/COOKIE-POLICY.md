# Cookie Policy — PrismAnalytics v1.0.0

**We use zero cookies.**

## Verification

Search entire codebase:

```bash
grep -R "document.cookie" src/ public/
# → No results
grep -R "set-cookie" src/
# → No results (only sessionStorage for tab session)
```

## What We Use Instead of Cookies

| Instead of | We use | Persistence |
|------------|--------|-------------|
| `_ga` cookie | `sessionStorage.setItem('pa_sid', crypto.randomUUID())` | Tab only — cleared when tab closes |
| Fingerprinting cookie | Daily salted SHA256 hash of IP+UA | Rotates every UTC day, stored as hash, not PII |
| Third-party cookie | Nothing | — |

## Why No Banner Needed?

Under ePrivacy Directive, consent banner is required for storing/accessing info on terminal equipment that is not strictly necessary. Since we store nothing persistent across sessions (sessionStorage is not considered persistent cookie in most guidance) and no personal data, most legal opinions say **no banner needed**.

**But** — some regulators treat `sessionStorage` as requiring notice if not strictly necessary. If unsure, add a simple notice:

> *"We use privacy-friendly analytics with no cookies."*

## Browser Storage Used

```js
sessionStorage.getItem('pa_sid') // random UUID per tab
```

- Not sent to server via Cookie header
- Not shared cross-tab
- Cleared when tab/window closed
- No expiry beyond session

---

**Conclusion:** Zero cookies, zero tracking beyond anonymized pageviews. ✅

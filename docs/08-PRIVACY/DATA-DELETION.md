# Data Deletion — How to Delete Everything

## Visual Deletion Flow

```
User → Dashboard
  ├─► Sites → Delete (button) → Modal confirm → DELETE /api/sites/[id]
  │         → DB: DELETE FROM sites WHERE id + CASCADE pageviews, daily_stats
  │
  └─► Settings → Delete account → Modal → DELETE /api/account
            → DB: DELETE FROM users WHERE id + CASCADE sites, pageviews, sessions, audit_log
            → R2: (in Cloudflare Worker deploy) list & delete exports/user_id/*
```

## How to Delete as Site Owner

### Via UI (recommended)

1. Go to **Sites** → find site → Delete button → confirm modal.
2. All pageviews for that site gone immediately.

### Via API

```bash
curl -X DELETE https://your-worker.workers.dev/api/sites/SITE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

```bash
curl -X DELETE https://your-worker.workers.dev/api/account \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Direct SQL (emergency)

```sql
-- Delete single site
DELETE FROM sites WHERE id = 'site_xxx';

-- Delete user and all his data (cascade)
DELETE FROM users WHERE email = 'user@example.com';

-- Delete old pageviews beyond retention
DELETE FROM pageviews WHERE occurred_at < unixepoch() - 90*86400*1000;
```

## Visitor Deletion Request

Since IPs are not stored, only daily salted hash, and salt rotates every 24h:

- **Within 24h:** If visitor provides their `session_id` (from `sessionStorage.getItem('pa_sid')`), you can `DELETE FROM pageviews WHERE session_id = '...'`
- **After 24h:** Hash salt rotated → visitors not identifiable → effectively auto-deleted.

Document this in your privacy policy to show compliance.

## R2 Archive Deletion

If you enabled R2 archiving (exports), they are anonymized JSON/CSV (no PII). Delete via:

```bash
npx wrangler r2 object delete prism-analytics-storage --key exports/USER_ID/...
```

Or via dashboard Cloudflare → R2 → bucket → delete.

---

**GDPR Art 17:** You can now demonstrate erasure capability.

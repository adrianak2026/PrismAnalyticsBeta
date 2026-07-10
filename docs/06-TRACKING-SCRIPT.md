# 06 — Tracking Script Deep Dive

> The tracking script is **<1 kB gzipped**, no dependencies, no cookies, no fingerprinting.

## How It Works (Visual)

```
[Page Load]
   │
   ├─► sessionStorage.getItem('pa_sid') || crypto.randomUUID()
   │   └─► tab-scoped, not persistent
   │
   ├─► function track(event='pageview', data)
   │     ├─► new URLSearchParams(location.search) → UTM
   │     ├─► { site_id, pathname, referrer, screen_size,
   │     │     session_id, event_name, event_data, UTMs }
   │     └─► navigator.sendBeacon(url, JSON.stringify(body))
   │         └─► survives tab close, no CORS preflight if simple
   │
   ├─► window.prism = track  (exposed for custom events)
   │
   └─► SPA support: setInterval 500ms checks pathname change
```

## Minimal HTML Version

```html
<!-- Add once in <head> -->
<script>
(function(){
  var id='pa_xxx', url='https://your-worker.workers.dev/api/track';
  var sid=sessionStorage.getItem('pa_sid')||crypto.randomUUID();
  sessionStorage.setItem('pa_sid',sid);
  function t(e,d){
    var q=new URLSearchParams(location.search);
    navigator.sendBeacon(url,JSON.stringify({
      site_id:id,pathname:location.pathname,referrer:document.referrer,
      screen_size:screen.width+'x'+screen.height,session_id:sid,
      event_name:e||'pageview',event_data:d,
      utm_source:q.get('utm_source'),utm_medium:q.get('utm_medium'),utm_campaign:q.get('utm_campaign')
    }));
  }
  window.prism=t; t();
  var p=location.pathname;
  setInterval(function(){if(p!=location.pathname){p=location.pathname;t();}},500);
})();
</script>
```

## Custom Events

After the snippet loads, anywhere:

```js
// Button click
document.getElementById('cta').addEventListener('click', () => {
  window.prism('cta_clicked', { id: 'hero' });
});

// Purchase
window.prism('purchase_completed', { value: 99, currency: 'USD', product: 'Pro' });

// Signup
window.prism('signup_completed', { plan: 'starter' });
```

**Rules for custom data:**
- Keys: `a-zA-Z0-9_.-`, max 64 chars for event name
- Values: `string | number | boolean` only
- No PII (no emails, names) — enforced by docs + review
- JSON stringified, sliced to 4096 chars server-side

## Privacy Guarantees in Script

| Collected | How | Stored? |
|-----------|-----|---------|
| pathname | `location.pathname` | Yes |
| referrer | `document.referrer` | Yes |
| screen_size | `screen.width x height` | No (currently sent but not stored — future device stats) |
| session_id | `crypto.randomUUID()` in sessionStorage | Yes (random, not cookie) |
| UTM params | `URLSearchParams` | Yes |
| IP | `CF-Connecting-IP` header server-side | No — only SHA256(IP|UA|daily_salt) |
| User-Agent | header server-side | No — only parsed to device/browser/OS labels |

## Beacon vs Fetch

- `navigator.sendBeacon` is used first (non-blocking, survives unload)
- Fallback: `fetch(..., {keepalive: true})` — not in minimal snippet but easy to add
- For `<img>` fallback, `/api/track` also returns 1×1 GIF pixel

## Verification

Open DevTools → Network → filter `track` → should see POST 200 with GIF or JSON `{status: "ignored"}` for bots.

If 404 `invalid_site`, check `tracking_code` matches `sites.tracking_code` in DB.

---

**Next:** See [07-INTEGRATIONS/](./07-INTEGRATIONS/) for 12 framework-specific guides.

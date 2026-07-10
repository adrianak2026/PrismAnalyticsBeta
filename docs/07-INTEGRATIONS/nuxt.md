# Nuxt 3 — Integration

`plugins/prism.client.ts` (client only):
```ts
export default defineNuxtPlugin(() => {
  const sid = sessionStorage.getItem('pa_sid') ?? crypto.randomUUID();
  sessionStorage.setItem('pa_sid', sid);
  function track(event = 'pageview', data?: Record<string, unknown>) {
    const q = new URLSearchParams(window.location.search);
    navigator.sendBeacon('https://YOUR_WORKER.workers.dev/api/track', JSON.stringify({
      site_id: 'pa_YOUR_ID', pathname: location.pathname,
      referrer: document.referrer, screen_size: `${screen.width}x${screen.height}`,
      session_id: sid, event_name: event, event_data: data,
      utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'), utm_campaign: q.get('utm_campaign'),
    }));
  }
  (window as any).prism = track;
  track();
  let prev = location.pathname;
  setInterval(() => { if (location.pathname !== prev) { prev = location.pathname; track(); } }, 500);
});
```

Nuxt auto-loads `.client.ts` only in browser. Custom: `window.prism('purchase')`

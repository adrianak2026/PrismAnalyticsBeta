# Vue 3 — Integration

`src/plugins/prism.ts`:
```ts
export default {
  install(app: any) {
    const sid = sessionStorage.getItem('pa_sid') ?? crypto.randomUUID();
    sessionStorage.setItem('pa_sid', sid);
    function track(event = 'pageview', data?: Record<string, unknown>) {
      const q = new URLSearchParams(window.location.search);
      navigator.sendBeacon('https://YOUR_WORKER.workers.dev/api/track', JSON.stringify({
        site_id: 'pa_YOUR_ID', pathname: window.location.pathname,
        referrer: document.referrer, screen_size: `${screen.width}x${screen.height}`,
        session_id: sid, event_name: event, event_data: data,
        utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'), utm_campaign: q.get('utm_campaign'),
      }));
    }
    (window as any).prism = track;
    track();
    let prev = location.pathname;
    setInterval(() => { if (location.pathname !== prev) { prev = location.pathname; track(); } }, 500);
  }
}
```
`main.ts`: `import prism from './plugins/prism'; app.use(prism);`

Custom: `(window as any).prism('cta_clicked')`

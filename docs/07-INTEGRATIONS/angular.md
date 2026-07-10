# Angular 14+ — Integration

`src/app/prism.service.ts`:
```ts
import { Injectable, NgZone } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class PrismService {
  private sid = sessionStorage.getItem('pa_sid') ?? crypto.randomUUID();
  private url = 'https://YOUR_WORKER.workers.dev/api/track';
  private siteId = 'pa_YOUR_ID';
  constructor(private ngZone: NgZone) {
    sessionStorage.setItem('pa_sid', this.sid);
    this.track();
    this.ngZone.runOutsideAngular(() => {
      let prev = location.pathname;
      setInterval(() => { if (location.pathname !== prev) { prev = location.pathname; this.track(); } }, 500);
    });
  }
  track(event = 'pageview', data?: Record<string, unknown>) {
    const q = new URLSearchParams(location.search);
    navigator.sendBeacon(this.url, JSON.stringify({
      site_id: this.siteId, pathname: location.pathname,
      referrer: document.referrer, screen_size: `${screen.width}x${screen.height}`,
      session_id: this.sid, event_name: event, event_data: data,
      utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'), utm_campaign: q.get('utm_campaign'),
    }));
  }
}
```

In `app.component.ts`: `constructor(private prism: PrismService) {}` and custom: `this.prism.track('signup', {plan: 'pro'})`

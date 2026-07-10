# React (Vite / CRA) — Integration

## Step 1: Create helper

`src/lib/prism.ts`:

```ts
export function initPrism(siteId: string, apiUrl: string) {
  const sid = sessionStorage.getItem('pa_sid') ?? crypto.randomUUID();
  sessionStorage.setItem('pa_sid', sid);

  function track(event = 'pageview', data?: Record<string, unknown>) {
    const q = new URLSearchParams(window.location.search);
    navigator.sendBeacon(apiUrl, JSON.stringify({
      site_id: siteId, pathname: window.location.pathname,
      referrer: document.referrer, screen_size: `${screen.width}x${screen.height}`,
      session_id: sid, event_name: event, event_data: data,
      utm_source: q.get('utm_source') ?? undefined,
      utm_medium: q.get('utm_medium') ?? undefined,
      utm_campaign: q.get('utm_campaign') ?? undefined,
    }));
  }
  (window as any).prism = track;
  return track;
}
```

## Step 2: Init in App

`src/App.tsx`:

```tsx
import { useEffect } from 'react';
import { initPrism } from './lib/prism';

export default function App() {
  useEffect(() => {
    const track = initPrism('pa_YOUR_ID', 'https://YOUR_WORKER.workers.dev/api/track');
    let prev = location.pathname;
    const id = setInterval(() => {
      if (location.pathname !== prev) { prev = location.pathname; track(); }
    }, 500);
    return () => clearInterval(id);
  }, []);
  return <div>Your app</div>;
}
```

## Step 3: Custom events

```tsx
<button onClick={() => (window as any).prism?.('signup_clicked', { plan: 'pro' })}>
  Sign up
</button>
```

## React Router support

If using React Router, track on route change:

```tsx
import { useLocation } from 'react-router-dom';
const location = useLocation();
useEffect(() => { (window as any).prism?.(); }, [location]);
```

---

**Visual:**

```
src/
  lib/prism.ts  ← helper
  App.tsx       ← initPrism on mount
```

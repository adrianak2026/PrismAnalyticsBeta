# Svelte / SvelteKit — Integration

`src/lib/prism.ts`:
```ts
export function initPrism(siteId: string, apiUrl: string) {
  if (typeof window === 'undefined') return () => {};
  const sid = sessionStorage.getItem('pa_sid') ?? crypto.randomUUID();
  sessionStorage.setItem('pa_sid', sid);
  function track(event = 'pageview', data?: Record<string, unknown>) {
    const q = new URLSearchParams(window.location.search);
    navigator.sendBeacon(apiUrl, JSON.stringify({
      site_id: siteId, pathname: window.location.pathname,
      referrer: document.referrer, screen_size: `${screen.width}x${screen.height}`,
      session_id: sid, event_name: event, event_data: data,
      utm_source: q.get('utm_source'), utm_medium: q.get('utm_medium'), utm_campaign: q.get('utm_campaign'),
    }));
  }
  (window as any).prism = track;
  track();
  let prev = location.pathname;
  setInterval(() => { if (location.pathname !== prev) { prev = location.pathname; track(); } }, 500);
  return track;
}
```

`+layout.svelte`:
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { initPrism } from '$lib/prism';
  onMount(() => initPrism('pa_YOUR_ID', 'https://YOUR_WORKER.workers.dev/api/track'));
</script>
<slot />
```

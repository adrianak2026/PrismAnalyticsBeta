# 07 — Integrations — 12 Frameworks

Each guide shows **where to paste** the tracking snippet and **how to fire custom events**.

> Tracking ID: copy from Dashboard → Sites → your site → `pa_xxx`

```
┌──────────┬──────────────────────────────┬──────────────────────────┐
│ Framework│ Where to add                 │ Custom event example     │
├──────────┼──────────────────────────────┼──────────────────────────┤
│ HTML     │ <head>                       │ window.prism('purchase') │
│ React    │ PrismInit component mount   │ window.prism('click')    │
│ Next.js  │ app/layout.tsx Script        │ window.prism('view')     │
│ Vue 3    │ main.ts plugin              │ window.prism('signup')   │
│ Nuxt 3   │ plugins/prism.client.ts     │ window.prism('cart')     │
│ Angular  │ PrismService inject         │ prism.track('event')     │
│ Svelte   │ $lib/prism.ts onMount       │ window.prism('action')   │
│ GTM      │ Custom HTML tag All Pages   │ window.prism('purchase') │
│ WordPress│ functions.php wp_head       │ window.prism('form')     │
│ Shopify  │ theme.liquid <head>         │ window.prism('product')  │
│ Webflow  │ Site Settings Custom Code   │ window.prism('cta')      │
│ Wix      │ Tracking Tools Custom       │ window.prism('submit')   │
└──────────┴──────────────────────────────┴──────────────────────────┘
```

## Choose your stack:

- [html.md](./html.md) — Plain HTML / Static site / Jekyll / Hugo
- [react.md](./react.md) — React (Vite, CRA, etc.)
- [nextjs.md](./nextjs.md) — Next.js App & Pages Router
- [vue.md](./vue.md) — Vue 3 Composition API
- [nuxt.md](./nuxt.md) — Nuxt 3 SSR
- [angular.md](./angular.md) — Angular 14+
- [svelte.md](./svelte.md) — Svelte / SvelteKit
- [gtm.md](./gtm.md) — Google Tag Manager
- [wordpress.md](./wordpress.md) — WordPress PHP
- [shopify.md](./shopify.md) — Shopify Liquid
- [webflow.md](./webflow.md) — Webflow
- [wix.md](./wix.md) — Wix

## Universal Custom Events (works everywhere)

```js
// After snippet loads:
window.prism('event_name', { key: 'value' });

// Allowed: string | number | boolean values, max 4096 chars JSON
// Blocked: emails, personal data (by policy — please respect)
```

Examples:

```js
window.prism('newsletter_signup', { source: 'footer' });
window.prism('purchase_completed', { value: 99, currency: 'USD' });
window.prism('video_played', { video: 'intro', duration: 120 });
window.prism('file_downloaded', { file: 'whitepaper.pdf' });
```

---

**Need help?** Open an issue with your framework + error.

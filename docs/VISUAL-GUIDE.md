# Visual Guide — How to Edit Anything

> Every customization point with screenshots description + file path.

---

## 1. Change Colors / Theme

**File:** `src/app/globals.css`

```css
@theme {
  --color-bg: #0a0a0f;          /* page bg */
  --color-brand: #8b6cf5;       /* violet accent */
  --color-accent: #ec7d75;      /* coral */
  --color-success: #4ade80;
}
:root { color-scheme: dark; }
```

Preview: Change `--color-brand` to `#00d1ff` → all buttons, charts, map active colors change instantly (HMR).

```
[globals.css]
  --color-brand ──────────► buttons, map active-3, chart lines, highlights
  --color-bg ─────────────► entire page background
  --color-bg-card ────────► card backgrounds
  --color-border ─────────► card borders, dividers
```

---

## 2. Change Logo / Icon

**Files:**
- `public/icon.png` — source (1024x1024)
- `public/icons/icon-*.png` — multi-size (16 to 512)
- `public/favicon.ico`, `apple-touch-icon.png`, `og-image.png`

Replace `public/icon.png` with your 1024×1024 PNG (transparent bg, centered emblem). Then:

```bash
node -e "
const fs=require('fs');
[16,32,48,72,96,128,144,152,180,192,256,384,512].forEach(s=>{
  fs.copyFileSync('public/icon.png', 'public/icons/icon-'+s+'x'+s+'.png');
});
"
```

Also edit `public/manifest.json` name/short_name if you rename app.

---

## 3. Change App Name

| Place | File |
|-------|------|
| Tab title | `src/app/layout.tsx` → `metadata.title` |
| Sidebar | `src/app/components/Dashboard.tsx` → PrismAnalytics text |
| PWA install name | `public/manifest.json` → name, short_name |
| OG image | Replace `public/og-image.png` |
| Package | `package.json` → name, description |
| Version lib | `src/lib/version.ts` |

Search: `grep -R "PrismAnalytics" src/ public/`

---

## 4. Edit Rate Limits

**File:** `src/lib/auth-helpers.ts` + each route.

```ts
// In src/app/api/auth/login/route.ts
const rl = await rateLimit(`login:${sha256(ip)}`, 10, 15 * 60 * 1000);
//                                                 ^  ^ 15 min window
//                                                 max 10 attempts
```

To disable for local dev:

```ts
if (process.env.NODE_ENV !== 'production') return { allowed: true, retryIn: 0 };
```

---

## 5. Edit Blocked Email Domains

**File:** `src/lib/security.ts`

```ts
const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com", ...
  // Add your own:
  "yourdomain-tempmail.com",
]);
```

Regex block:

```ts
if (/^(temp|throw|trash)/.test(domain)) return true;
```

Common providers bypass MX check (to save DoH calls) — edit `COMMON_PROVIDERS`.

---

## 6. Edit Security Headers / CSP

**File:** `src/proxy.ts`

```ts
res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
res.headers.set("Content-Security-Policy", [
  "default-src 'self'",
  // Add your CDN:
  "img-src 'self' data: https://your-cdn.com",
].join("; "));
```

Test: `curl -i http://localhost:3000/ | grep -i content-secur`

---

## 7. Edit DB Schema

**Files:** `src/db/schema.ts` (Postgres for Next preview) and `migrations/0001_initial.sql` (D1)

Add column:

```ts
// src/db/schema.ts pageviews table
myNewField: text("my_new_field"),
```

Then:

```bash
npx drizzle-kit push --config drizzle.config.json  # local PG
npx wrangler d1 migrations apply prism-analytics-db --remote  # prod D1 (create migration file first)
```

---

## 8. Edit Tracking Script Logic

**Files:**
- Frontend generator: `src/app/components/TrackingScript.tsx` → `snippetFor()` function
- Backend ingest: `src/app/api/track/route.ts`

Add new field to payload:

1. In `snippetFor()` → add to JSON: `new_field: 'value'`
2. In `src/app/api/track/route.ts` Zod schema → add `new_field: z.string().optional()`
3. In `pageviews` table → add column
4. In analytics query → include in SELECT

---

## 9. Edit Docs

All docs are Markdown in `docs/`. To add new integration:

1. Create `docs/07-INTEGRATIONS/myframework.md`
2. Add entry to `docs/07-INTEGRATIONS/README.md` table
3. Add entry to `TrackingScript.tsx` `FRAMEWORKS` array

Docs auto-serve? Not yet — but you can add `src/app/docs/page.tsx` that reads MD.

---

## 10. Edit Version / Changelog

**Files:** `src/lib/version.ts` + `package.json`

```ts
export const VERSION = "1.1.0";
export const VERSION_NAME = "Second Light";
export const CHANGELOG = [
  { version: "1.1.0", date: "2026-08-01", highlights: ["..."] },
  ...old
];
```

`/api/version` will auto-return new version.

---

## 11. Edit Map Colors

**File:** `src/app/globals.css`

```css
.country-region.active-3 { fill: rgba(139,108,245,0.95); } /* high traffic */
.country-region.active-0 { fill: rgba(139,108,245,0.28); } /* low */
```

Change `139,108,245` RGB to your brand.

---

## 12. Edit Export Filename & Limit

**File:** `src/app/api/analytics/export/route.ts`

```ts
.limit(50000) // change row limit
const safeSlug = site.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
```

---

## Quick Visual Edit Flow

```
Want to change X? → Find file in table below → Edit → npm run dev → See live → npm run build → deploy

X                              File
────────────────────────────── ─────────────────────────────────────────
Colors                         src/app/globals.css @theme
Logo                           public/icon.png + public/icons/*
App name                       layout.tsx, manifest.json, version.ts, package.json
Auth / password rules          src/lib/security.ts
Rate limits                    src/lib/auth-helpers.ts + each route file
Tracking payload               src/app/api/track/route.ts + TrackingScript.tsx
DB columns                     src/db/schema.ts + migrations/*.sql
CSP headers                    src/proxy.ts
Docs                           docs/*.md
Version                        src/lib/version.ts + package.json
Map colors                     globals.css .country-region
```

---

**Tip:** Use `grep -R "TODO\|FIXME" src/` to find extension points.

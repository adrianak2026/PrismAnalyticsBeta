"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check, Clipboard, Code2, Eye, FileCode2, Globe, Monitor,
  Palette, Server, ShoppingBag, Terminal, Type, Webhook,
} from "lucide-react";
import { Button } from "./ui/button";

const FRAMEWORKS = [
  {
    id: "html",
    label: "Plain HTML / JS",
    icon: Type,
    desc: "Add to any website's <head>",
    install: "Copy and paste the script into your HTML <head> section before the closing </head> tag.",
  },
  {
    id: "react",
    label: "React",
    icon: FileCode2,
    desc: "React single-page app",
    install: "Create a component and call prism() on mount. Works with Vite, Create React App, and Next.js client components.",
  },
  {
    id: "nextjs",
    label: "Next.js",
    icon: Server,
    desc: "Next.js pages/app router",
    install: "Use next/script with afterInteractive strategy in your _app.tsx or layout.tsx.",
  },
  {
    id: "vue",
    label: "Vue 3",
    icon: Eye,
    desc: "Vue 3 Composition API",
    install: "Add as a plugin in main.ts or use inside onMounted lifecycle hook.",
  },
  {
    id: "nuxt",
    label: "Nuxt 3",
    icon: Globe,
    desc: "Nuxt 3 SSR framework",
    install: "Add as a Nuxt plugin in plugins/prism.client.ts for client-side only tracking.",
  },
  {
    id: "angular",
    label: "Angular",
    icon: Monitor,
    desc: "Angular 14+ app",
    install: "Add to angular.json scripts array or use in app.component.ts ngOnInit.",
  },
  {
    id: "svelte",
    label: "Svelte / SvelteKit",
    icon: Terminal,
    desc: "Svelte component",
    install: "Add in onMount in +page.svelte or create a $lib/prism.ts helper.",
  },
  {
    id: "gtm",
    label: "Google Tag Manager",
    icon: Webhook,
    desc: "GTM custom HTML tag",
    install: "Create a Custom HTML tag in GTM, paste the tracking call, trigger on All Pages.",
  },
  {
    id: "wordpress",
    label: "WordPress",
    icon: Palette,
    desc: "WordPress theme / plugin",
    install: "Add to your theme's functions.php via wp_enqueue_script or a custom plugin.",
  },
  {
    id: "shopify",
    label: "Shopify",
    icon: ShoppingBag,
    desc: "Shopify store",
    install: "Add as a custom Liquid snippet or via Shopify's Custom Settings > Checkout.",
  },
  {
    id: "webflow",
    label: "Webflow",
    icon: Globe,
    desc: "Webflow site",
    install: "Add in Site Settings > Custom Code > Head Code for global tracking.",
  },
  {
    id: "bootstrap",
    label: "Bootstrap 5",
    icon: Palette,
    desc: "Bootstrap template",
    install: "Paste in your main index.html or header.php before </head>. Works with StartBootstrap, BootstrapMade, etc.",
  },
  {
    id: "wix",
    label: "Wix",
    icon: Globe,
    desc: "Wix website",
    install: "Add via Wix > Settings > Tracking Tools > New Tool > Custom > paste in site <head>.",
  },
] as const;

type FrameworkId = (typeof FRAMEWORKS)[number]["id"];

const JS_CORE = (code: string, url: string) =>
  `var id='${code}', url='${url}/api/track';` +
  `var sid=sessionStorage.getItem('pa_sid')||crypto.randomUUID();` +
  `sessionStorage.setItem('pa_sid',sid);` +
  `function t(e,d){var q=new URLSearchParams(location.search);` +
  `navigator.sendBeacon(url,JSON.stringify({site_id:id,pathname:location.pathname,` +
  `referrer:document.referrer,screen_size:screen.width+'x'+screen.height,session_id:sid,` +
  `event_name:e||'pageview',event_data:d,utm_source:q.get('utm_source'),` +
  `utm_medium:q.get('utm_medium'),utm_campaign:q.get('utm_campaign')}));}` +
  `window.prism=t;` +
  `t();` +
  `var p=location.pathname;` +
  `setInterval(function(){if(p!=location.pathname){p=location.pathname;t();}},500);`;

function snippetFor(id: FrameworkId, code: string, url: string): string {
  if (id === "html") return `<!-- PrismAnalytics Tracking Script -->\n<script>\n(function(){\n${JS_CORE(code, url)}\n})();\n</script>`;

  if (id === "react") return [
    `// src/lib/prism.ts`,
    `export function initPrism(siteId: string, apiUrl: string) {`,
    `  const sid = sessionStorage.getItem('pa_sid') ?? crypto.randomUUID();`,
    `  sessionStorage.setItem('pa_sid', sid);`,
    ``,
    `  function track(event = 'pageview', data?: Record<string, unknown>) {`,
    `    const q = new URLSearchParams(window.location.search);`,
    `    navigator.sendBeacon(apiUrl, JSON.stringify({`,
    `      site_id: siteId, pathname: window.location.pathname,`,
    `      referrer: document.referrer,`,
    `      screen_size: screen.width + 'x' + screen.height,`,
    `      session_id: sid, event_name: event, event_data: data,`,
    `      utm_source: q.get('utm_source') ?? undefined,`,
    `      utm_medium: q.get('utm_medium') ?? undefined,`,
    `      utm_campaign: q.get('utm_campaign') ?? undefined,`,
    `    }));`,
    `  }`,
    `  window.prism = track;`,
    `  return track;`,
    `}`,
    ``,
    `// src/components/PrismInit.tsx`,
    `import { useEffect } from 'react';`,
    `import { initPrism } from '@/lib/prism';`,
    ``,
    `export default function PrismInit() {`,
    `  useEffect(() => {`,
    `    const track = initPrism('${code}', '${url}/api/track');`,
    `    let prev = location.pathname;`,
    `    const interval = setInterval(() => {`,
    `      if (location.pathname !== prev) { prev = location.pathname; track(); }`,
    `    }, 500);`,
    `    return () => clearInterval(interval);`,
    `  }, []);`,
    `  return null;`,
    `}`,
  ].join("\n");

  if (id === "nextjs") return [
    `// app/layout.tsx (App Router)`,
    `import Script from 'next/script';`,
    ``,
    `export default function RootLayout({ children }: { children: React.ReactNode }) {`,
    `  return (`,
    `    <html lang="en">`,
    `      <body>`,
    `        {children}`,
    `        <Script id="prism-analytics" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: \``,
    JS_CORE(code, url),
    `          ` + '` }} />',
    `      </body>`,
    `    </html>`,
    `  );`,
    `}`,
  ].join("\n");

  if (id === "vue") return [
    `// src/plugins/prism.ts`,
    `export default {`,
    `  install(app) {`,
    `    const sid = sessionStorage.getItem('pa_sid') ?? crypto.randomUUID();`,
    `    sessionStorage.setItem('pa_sid', sid);`,
    ``,
    `    function track(event = 'pageview', data?: Record<string, unknown>) {`,
    `      const q = new URLSearchParams(window.location.search);`,
    `      navigator.sendBeacon('${url}/api/track', JSON.stringify({`,
    `        site_id: '${code}', pathname: window.location.pathname,`,
    `        referrer: document.referrer,`,
    `        screen_size: screen.width + 'x' + screen.height,`,
    `        session_id: sid, event_name: event, event_data: data,`,
    `        utm_source: q.get('utm_source'),`,
    `        utm_medium: q.get('utm_medium'),`,
    `        utm_campaign: q.get('utm_campaign'),`,
    `      }));`,
    `    }`,
    `    window.prism = track;`,
    `    track();`,
    `    let prev = location.pathname;`,
    `    setInterval(() => { if (location.pathname !== prev) { prev = location.pathname; track(); } }, 500);`,
    `  }`,
    `}`,
    ``,
    `// main.ts`,
    `// app.use(prismPlugin)`,
  ].join("\n");

  if (id === "nuxt") return [
    `// plugins/prism.client.ts`,
    `export default defineNuxtPlugin(() => {`,
    `  const sid = sessionStorage.getItem('pa_sid') ?? crypto.randomUUID();`,
    `  sessionStorage.setItem('pa_sid', sid);`,
    ``,
    `  function track(event = 'pageview', data?: Record<string, unknown>) {`,
    `    const q = new URLSearchParams(window.location.search);`,
    `    navigator.sendBeacon('${url}/api/track', JSON.stringify({`,
    `      site_id: '${code}', pathname: window.location.pathname,`,
    `      referrer: document.referrer,`,
    `      screen_size: screen.width + 'x' + screen.height,`,
    `      session_id: sid, event_name: event, event_data: data,`,
    `      utm_source: q.get('utm_source'),`,
    `      utm_medium: q.get('utm_medium'),`,
    `      utm_campaign: q.get('utm_campaign'),`,
    `    }));`,
    `  }`,
    `  window.prism = track;`,
    `  track();`,
    `  let prev = location.pathname;`,
    `  setInterval(() => { if (location.pathname !== prev) { prev = location.pathname; track(); } }, 500);`,
    `});`,
  ].join("\n");

  if (id === "angular") return [
    `// src/app/prism.service.ts`,
    `import { Injectable, NgZone } from '@angular/core';`,
    ``,
    `@Injectable({ providedIn: 'root' })`,
    `export class PrismService {`,
    `  private sid: string;`,
    `  private url = '${url}/api/track';`,
    `  private siteId = '${code}';`,
    ``,
    `  constructor(private ngZone: NgZone) {`,
    `    this.sid = sessionStorage.getItem('pa_sid') ?? crypto.randomUUID();`,
    `    sessionStorage.setItem('pa_sid', this.sid);`,
    `    this.track();`,
    `    this.ngZone.runOutsideAngular(() => {`,
    `      let prev = location.pathname;`,
    `      setInterval(() => {`,
    `        if (location.pathname !== prev) { prev = location.pathname; this.track(); }`,
    `      }, 500);`,
    `    });`,
    `  }`,
    ``,
    `  track(event = 'pageview', data?: Record<string, unknown>) {`,
    `    const q = new URLSearchParams(location.search);`,
    `    navigator.sendBeacon(this.url, JSON.stringify({`,
    `      site_id: this.siteId, pathname: location.pathname,`,
    `      referrer: document.referrer,`,
    `      screen_size: screen.width + 'x' + screen.height,`,
    `      session_id: this.sid, event_name: event, event_data: data,`,
    `      utm_source: q.get('utm_source'),`,
    `      utm_medium: q.get('utm_medium'),`,
    `      utm_campaign: q.get('utm_campaign'),`,
    `    }));`,
    `  }`,
    `}`,
    ``,
    `// Usage in component:`,
    `// constructor(private prism: PrismService) {}`,
    `// prism.track('signup_completed', { plan: 'pro' });`,
  ].join("\n");

  if (id === "svelte") return [
    `// src/lib/prism.ts`,
    `export function initPrism(siteId: string, apiUrl: string) {`,
    `  if (typeof window === 'undefined') return () => {};`,
    `  const sid = sessionStorage.getItem('pa_sid') ?? crypto.randomUUID();`,
    `  sessionStorage.setItem('pa_sid', sid);`,
    ``,
    `  function track(event = 'pageview', data?: Record<string, unknown>) {`,
    `    const q = new URLSearchParams(window.location.search);`,
    `    navigator.sendBeacon(apiUrl, JSON.stringify({`,
    `      site_id: siteId, pathname: window.location.pathname,`,
    `      referrer: document.referrer,`,
    `      screen_size: screen.width + 'x' + screen.height,`,
    `      session_id: sid, event_name: event, event_data: data,`,
    `      utm_source: q.get('utm_source'),`,
    `      utm_medium: q.get('utm_medium'),`,
    `      utm_campaign: q.get('utm_campaign'),`,
    `    }));`,
    `  }`,
    `  (window as any).prism = track;`,
    `  track();`,
    `  let prev = location.pathname;`,
    `  setInterval(() => { if (location.pathname !== prev) { prev = location.pathname; track(); } }, 500);`,
    `  return track;`,
    `}`,
    ``,
    `// +page.svelte`,
    `// <script lang="ts">`,
    `//   import { onMount } from 'svelte';`,
    `//   import { initPrism } from '$lib/prism';`,
    `//   onMount(() => initPrism('${code}', '${url}/api/track'));`,
    `// </script>`,
  ].join("\n");

  if (id === "gtm") return [
    `<!-- Google Tag Manager — Custom HTML Tag -->`,
    `<!-- Trigger: All Pages -->`,
    `<script>`,
    `(function(){`,
    JS_CORE(code, url),
    `})();`,
    `</script>`,
    ``,
    `<!-- Call custom events from GTM:`,
    `//   window.prism('purchase_completed', { value: 99 });`,
    `-->`,
  ].join("\n");

  if (id === "wordpress") return [
    `// functions.php — add to your WordPress theme`,
    `function prism_analytics_init() {`,
    `  $url = '${url}/api/track';`,
    `  $id  = '${code}';`,
    `  echo "<script>"`,
    `    . "(function(){"`,
    `    . "var sid=sessionStorage.getItem('pa_sid')||crypto.randomUUID();"`,
    `    . "sessionStorage.setItem('pa_sid',sid);"`,
    `    . "function t(e,d){"`,
    `    . "var q=new URLSearchParams(window.location.search);"`,
    `    . "navigator.sendBeacon('$url',JSON.stringify({"`,
    `    . "site_id:'$id',pathname:location.pathname,referrer:document.referrer,"`,
    `    . "screen_size:screen.width+'x'+screen.height,session_id:sid,"`,
    `    . "event_name:e||'pageview',event_data:d,"`,
    `    . "utm_source:q.get('utm_source'),utm_medium:q.get('utm_medium'),utm_campaign:q.get('utm_campaign')}));"}`,
    `    . "}"`,
    `    . "window.prism=t;t();"`,
    `    . "var p=location.pathname;"`,
    `    . "setInterval(function(){if(p!=location.pathname){p=location.pathname;t();}},500);"`,
    `    . "})();"`,
    `    . "</script>";`,
    `}`,
    `add_action('wp_head', 'prism_analytics_init', 99);`,
  ].join("\n");

  if (id === "shopify") return [
    `<!-- Shopify — Online Store > Themes > Edit code > theme.liquid in <head> -->`,
    `<!-- Or: Settings > Checkout > Order status page > Add custom JavaScript -->`,
    `<script>`,
    `(function(){`,
    JS_CORE(code, url),
    `})();`,
    `</script>`,
    ``,
    `<!-- Track Shopify events:`,
    `//   window.prism('product_viewed', { sku: '{{ product.sku }}' });`,
    `//   window.prism('add_to_cart', { product: '{{ product.title }}' });`,
    `-->`,
  ].join("\n");

  if (id === "webflow") return [
    `<!-- Webflow — Site Settings > Custom Code > Head Code -->`,
    `<script>`,
    `(function(){`,
    JS_CORE(code, url),
    `})();`,
    `</script>`,
    ``,
    `<!-- In Webflow Designer, add to element onload:`,
    `//   window.prism && window.prism('button_clicked', { id: 'hero-cta' })`,
    `-->`,
  ].join("\n");

  if (id === "bootstrap") return [
    `<!-- Bootstrap 5 template — paste before </head> -->`,
    `<script>`,
    `(function(){`,
    JS_CORE(code, url),
    `})();`,
    `</script>`,
    ``,
    `<!-- Bootstrap custom events:`,
    `// <button class="btn btn-primary" onclick="window.prism('cta_click', {section:'hero'})">`,
    `// document.getElementById('myModal').addEventListener('shown.bs.modal', () => window.prism('modal_open', {id:'pricing'}));`,
    `-->`,
  ].join("\n");

  // wix fallback
  return [
    `<!-- Wix — Settings > Tracking Tools > + New Tool > Custom > Paste into Head -->`,
    `<script>`,
    `(function(){`,
    JS_CORE(code, url),
    `})();`,
    `</script>`,
    ``,
    `<!-- Track Wix events:`,
    `//   window.prism && window.prism('form_submitted', { formId: 'contact-form' });`,
    `-->`,
  ].join("\n");
}

const snippetMap: Record<FrameworkId, (code: string, url: string) => string> = {
  html: snippetFor, react: snippetFor, nextjs: snippetFor, vue: snippetFor,
  nuxt: snippetFor, angular: snippetFor, svelte: snippetFor, gtm: snippetFor,
  wordpress: snippetFor, shopify: snippetFor, webflow: snippetFor, bootstrap: snippetFor, wix: snippetFor,
} as Record<FrameworkId, (code: string, url: string) => string>;

const LANGUAGES: Record<FrameworkId, string> = {
  html: "html", react: "tsx", nextjs: "tsx", vue: "typescript",
  nuxt: "typescript", angular: "typescript", svelte: "typescript",
  gtm: "html", wordpress: "php", shopify: "html", webflow: "html", bootstrap: "html", wix: "html",
};

function SyntaxLine({ line, num }: { line: string; num: number }) {
  const isComment = line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*") || line.trim().startsWith("<!--");
  const isKeyword = /^(const|let|var|function|return|import|export|default|if|else|for|setInterval|new)/.test(line.trim());
  const isString = /['"`].*['"`]/.test(line) && !line.trim().startsWith("//");
  return (
    <div className="group relative flex hover:bg-[#ffffff08]">
      <span className="w-10 shrink-0 select-none pr-3 text-right text-[#4e4858] opacity-40 group-hover:opacity-70">{num}</span>
      <span className={`flex-1 whitespace-pre-wrap break-words ${isComment ? "text-[#6a6577] italic" : isKeyword ? "text-[#c792ea]" : isString ? "text-[#c3e88d]" : "text-[#9592a3]"}`}>{line}</span>
    </div>
  );
}

function SyntaxHighlight({ code }: { code: string }) {
  const lines = code.split("\n");
  return (
    <div className="font-mono text-[12.5px] leading-[1.7] whitespace-pre-wrap break-words">
      {lines.map((line, i) => <SyntaxLine key={i} line={line} num={i + 1} />)}
    </div>
  );
}

function LivePreview({ domain }: { domain?: string | null }) {
  const [active, setActive] = useState(false);
  const [views, setViews] = useState(0);
  const [events, setEvents] = useState<Array<{ page: string; referrer: string; time: string }>>([]);
  const [sessionId] = useState(() => Math.random().toString(36).slice(2, 8));

  const simulate = useCallback(() => {
    const pages = ["/", "/work", "/about", "/contact", "/blog/design-systems", "/pricing", "/blog/react-tips"];
    const referrers = ["google.com", "dribbble.com", "twitter.com", "github.com", ""];
    const refs = referrers[Math.floor(Math.random() * referrers.length)];
    const page = pages[Math.floor(Math.random() * pages.length)];
    setViews((v) => v + 1);
    setEvents((prev) => [
      { page, referrer: refs || "Direct", time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 9)
    ]);
  }, []);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      if (Math.random() > 0.3) simulate();
    }, 2000);
    return () => clearInterval(interval);
  }, [active, simulate]);

  return (
    <div className="rounded-2xl border border-[#e4e1dc] bg-white">
      <div className="flex items-center justify-between border-b border-[#ece9e4] px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#ff7b72]" /><i className="h-2.5 w-2.5 rounded-full bg-[#e9b949]" /><i className="h-2.5 w-2.5 rounded-full bg-[#68c67c]" /></div>
          <span className="ml-2 text-xs font-medium text-[#6e6a74]">Live Preview — {domain || "your-site.com"}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs">
            <i className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#43a46d] animate-pulse" : "bg-[#d5d1cc]"}`} />
            <span className="text-[#4a4650]">{active ? `${views} hits tracked` : "Tracking paused"}</span>
          </span>
          <button onClick={() => { setActive((a) => !a); if (!active) simulate(); }} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${active ? "bg-[#fff1ef] text-[#c84444]" : "bg-[#eae3ff] text-[#7356df]"}`}>
            {active ? "⏸ Pause" : "▶ Start"}
          </button>
        </div>
      </div>

      <div className="relative bg-[#f7f5f1] p-5 font-sans">
        {/* Simulated browser chrome */}
        <div className="mb-4 overflow-hidden rounded-xl border border-[#e0dcd5] bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#f0ede8] px-4 py-2.5">
            <div className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#ffb3b0]" /><i className="h-2.5 w-2.5 rounded-full bg-[#ffe38a]" /><i className="h-2.5 w-2.5 rounded-full bg-[#a5e381]" /></div>
            <div className="ml-3 flex-1 rounded-lg bg-[#f4f2ee] px-3 py-1 text-center text-[10px] text-[#8a8693]">https://{domain || "your-site.com"}{events[0]?.page || "/"}</div>
          </div>
          <div className="flex p-4">
            <div className="flex-1 space-y-3">
              <div className="h-4 w-3/4 rounded bg-[#f0ede8]" />
              <div className="h-3 w-full rounded bg-[#f4f2ee]" />
              <div className="h-3 w-5/6 rounded bg-[#f4f2ee]" />
              <div className="mt-4 h-10 w-32 rounded-xl bg-[#7b5df5]" />
            </div>
            <div className="ml-6 w-36 space-y-2">
              <div className="rounded-lg bg-[#f4f2ee] p-2">
                <div className="text-[9px] text-[#aaa5ad]">Session</div>
                <div className="text-[10px] font-semibold text-[#504c54]">prism_{sessionId}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tracked events feed */}
        {active && <div className="mt-3 space-y-1.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#aaa5ad]">Tracked events</p>
          <div className="max-h-32 overflow-auto space-y-1">
            {events.map((event, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-[#f0ecff] px-3 py-1.5 text-[10px]">
                <span className="rounded bg-[#7b5df5] px-1.5 py-0.5 font-mono text-white">pageview</span>
                <span className="text-[#4a4650]">{event.page}</span>
                <span className="ml-auto text-[#aaa5ad]">{event.time}</span>
              </div>
            ))}
          </div>
        </div>}
      </div>

      <div className="border-t border-[#ece9e4] px-5 py-3">
        <p className="text-[10px] text-[#8a8693]">⚡ Events fire via <code className="rounded bg-[#f0ede8] px-1 font-mono">navigator.sendBeacon</code> — no page reload needed, survives tab close.</p>
      </div>
    </div>
  );
}

export function TrackingScript({ trackingCode, domain }: { trackingCode: string; domain?: string | null }) {
  const [activeFramework, setActiveFramework] = useState<FrameworkId>("html");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const workerUrl = typeof window === "undefined" ? "https://your-worker.workers.dev" : window.location.origin;

  const snippet = useMemo(() => snippetMap[activeFramework](trackingCode, workerUrl), [activeFramework, trackingCode, workerUrl]);
  const fw = FRAMEWORKS.find((f) => f.id === activeFramework)!;

  async function copy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const customEventExample = `// Track any custom event after the snippet loads:\nwindow.prism('purchase_completed', {\n  product: 'Pro Plan',\n  value: 99,\n  currency: 'USD'\n});`;

  return (
    <div className="space-y-4">
      {/* Framework tabs */}
      <div className="overflow-hidden rounded-2xl border border-[#e4e1dc] bg-white">
        <div className="relative">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#d5d1cc] scrollbar-track-transparent">
            <div className="flex gap-1 border-b border-[#ece9e4] bg-[#faf9f6] px-3 pt-3 pb-0 min-w-max">
              {FRAMEWORKS.map((f) => {
                const Icon = f.icon;
                return (
                  <button 
                    key={f.id} 
                    onClick={() => setActiveFramework(f.id as FrameworkId)} 
                    className={`flex shrink-0 items-center gap-1.5 rounded-t-xl px-3 py-2.5 text-xs font-medium transition whitespace-nowrap ${activeFramework === f.id ? "bg-white border border-[#e4e1dc] border-b-white -mb-px text-[#7356df]" : "text-[#8a8693] hover:text-[#5a5660] hover:bg-white/50"}`}
                  >
                    <Icon size={13} />
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Scroll indicators */}
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#faf9f6] to-transparent" />
        </div>

        {/* Install instructions */}
        <div className="border-b border-[#ece9e4] bg-[#fbfaf8] px-4 py-3">
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex items-center gap-2">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#eae3ff] text-[#7558dd]"><Code2 size={14} /></div>
              <div><strong className="text-sm text-[#343138]">{fw.label}</strong><p className="text-[11px] text-[#8a8693]">{fw.desc}</p></div>
            </div>
            <div className="flex-1 min-w-0 rounded-xl bg-[#f0ecff] px-3 py-2 text-[11px] leading-5 text-[#5a4e7a]">{fw.install}</div>
          </div>
        </div>

        {/* Code block */}
        <div className="relative bg-[#1e1c24]">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
            <span className="rounded border border-[#38343f] bg-[#2d2a38] px-2 py-0.5 font-mono text-[10px] text-[#8a84a3]">{LANGUAGES[activeFramework]}</span>
            <button onClick={() => copy(snippet, "main")} className="flex items-center gap-1.5 rounded-lg bg-[#2d2a38] px-3 py-1.5 text-[11px] font-medium text-[#c9c3e0] hover:bg-[#38343f] transition">
              {copiedId === "main" ? <><Check size={12} className="text-[#68c67c]" />Copied!</> : <><Clipboard size={12} />Copy code</>}
            </button>
          </div>
          <div className="max-h-80 overflow-auto p-4">
            <SyntaxHighlight code={snippet} />
          </div>
        </div>
      </div>

      {/* Custom events */}
      <div className="overflow-hidden rounded-2xl border border-[#e4e1dc] bg-white">
        <div className="flex items-center gap-3 border-b border-[#ece9e4] bg-[#fbfaf8] px-4 py-3">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#fff0ed] text-[#d86d62]"><Webhook size={14} /></div>
          <div><h3 className="text-sm font-semibold text-[#343138]">Custom events</h3><p className="text-[11px] text-[#8a8693]">Track button clicks, form submissions, purchases, and more</p></div>
        </div>
        <div className="relative bg-[#1e1c24]">
          <div className="flex items-center justify-end border-b border-white/5 px-4 py-2.5">
            <button onClick={() => copy(customEventExample, "custom")} className="flex items-center gap-1.5 rounded-lg bg-[#2d2a38] px-3 py-1.5 text-[11px] font-medium text-[#c9c3e0] hover:bg-[#38343f] transition">
              {copiedId === "custom" ? <><Check size={12} className="text-[#68c67c]" />Copied!</> : <><Clipboard size={12} />Copy example</>}
            </button>
          </div>
          <div className="max-h-48 overflow-auto p-4"><SyntaxHighlight code={customEventExample} /></div>
        </div>
      </div>

      {/* Live preview */}
      <LivePreview domain={domain} />
    </div>
  );
}

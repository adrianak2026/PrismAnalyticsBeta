# Next.js (App Router & Pages Router) — Integration

## App Router (`app/layout.tsx`)

```tsx
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script
          id="prism-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var id='pa_YOUR_ID', url='https://YOUR_WORKER.workers.dev/api/track';
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
            `,
          }}
        />
      </body>
    </html>
  );
}
```

## Pages Router (`pages/_app.tsx`)

```tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Script from 'next/script';

export default function App({ Component, pageProps }) {
  const router = useRouter();
  useEffect(() => {
    const handle = () => (window as any).prism?.();
    router.events.on('routeChangeComplete', handle);
    return () => router.events.off('routeChangeComplete', handle);
  }, [router.events]);

  return (
    <>
      <Component {...pageProps} />
      <Script id="prism" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `YOUR_SNIPPET` }} />
    </>
  );
}
```

## Custom events in Next.js (client component)

```tsx
'use client';
export function BuyButton() {
  return <button onClick={() => (window as any).prism?.('purchase', { value: 99 })}>Buy</button>;
}
```

---

**Visual:**

```
app/
  layout.tsx  ← Script afterInteractive
  page.tsx
```

SSR safe: snippet checks `typeof window` implicitly via Script strategy.

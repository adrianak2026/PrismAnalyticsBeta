# HTML / Static Site — Integration

> Works with Jekyll, Hugo, 11ty, plain `.html`, Bootstrap templates, etc.

## Step 1: Copy your tracking code

Dashboard → Sites → select site → copy `Tracking ID` like `pa_abc123def456`.

## Step 2: Paste in `<head>`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>My Site</title>

  <!-- PrismAnalytics — add before </head> -->
  <script>
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
  </script>
</head>
<body>...</body>
</html>
```

## Step 3: Verify

Open DevTools → Network → filter `/api/track` → you should see POST 200.

## Custom events

```html
<button onclick="window.prism && window.prism('cta_clicked', {id: 'hero'})">Get Started</button>
```

## Bootstrap note

If using Bootstrap 5 template, just paste in your main `index.html` `<head>`. No jQuery needed.

---

**Visual:**

```
[Your HTML file]
   <head>
     ... meta ...
     <script>/* Prism snippet */</script>  ← HERE
   </head>
   <body>
     ... content ...
   </body>
```

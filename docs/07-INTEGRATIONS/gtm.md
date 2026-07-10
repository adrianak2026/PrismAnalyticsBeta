# Google Tag Manager — Integration

1. GTM → Tags → New → Custom HTML
2. Paste:

```html
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
```

3. Trigger: All Pages
4. Publish
5. Custom events in GTM: create another Custom HTML tag with `window.prism('purchase', {value: 99})` triggered on your dataLayer event.

# WordPress — Integration

## Option A — functions.php (recommended)

Add to your theme's `functions.php`:

```php
function prism_analytics_init() {
  $url = 'https://YOUR_WORKER.workers.dev/api/track';
  $id  = 'pa_YOUR_ID';
  echo "<script>
(function(){
  var sid=sessionStorage.getItem('pa_sid')||crypto.randomUUID();
  sessionStorage.setItem('pa_sid',sid);
  function t(e,d){
    var q=new URLSearchParams(window.location.search);
    navigator.sendBeacon('$url',JSON.stringify({
      site_id:'$id',pathname:location.pathname,referrer:document.referrer,
      screen_size:screen.width+'x'+screen.height,session_id:sid,
      event_name:e||'pageview',event_data:d,
      utm_source:q.get('utm_source'),utm_medium:q.get('utm_medium'),utm_campaign:q.get('utm_campaign')
    }));
  }
  window.prism=t; t();
  var p=location.pathname;
  setInterval(function(){if(p!=location.pathname){p=location.pathname;t();}},500);
})();
</script>";
}
add_action('wp_head', 'prism_analytics_init', 99);
```

## Option B — Plugin

Use "Insert Headers and Footers" plugin → paste HTML snippet from Dashboard → Sites.

Custom events in WordPress:

```php
<button onclick="window.prism && window.prism('form_submitted', {formId: 'contact'})">Submit</button>
```

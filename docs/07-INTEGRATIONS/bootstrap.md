# Bootstrap 5 / HTML Template — Integration

Bootstrap templates (StartBootstrap, BootstrapMade, ThemeWagon, etc.) work same as HTML.

## Paste in your main template file

If you have `index.html`, `header.php`, or `layout.ejs`:

```html
<!-- In <head> before </head> -->
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

## Bootstrap 5 components + custom events

```html
<!-- Button click -->
<button class="btn btn-primary" onclick="window.prism && window.prism('bootstrap_cta_click', {section: 'hero'})">
  Get Started
</button>

<!-- Modal open -->
<div class="modal" id="myModal">
  ...
</div>
<script>
  document.getElementById('myModal').addEventListener('shown.bs.modal', () => {
    window.prism && window.prism('bootstrap_modal_opened', {modal: 'pricing'});
  });
</script>

<!-- Form submit -->
<form onsubmit="window.prism && window.prism('bootstrap_form_submit', {form: 'contact'});">
  ...
</form>
```

Works with jQuery still:

```js
$('#myButton').on('click', () => {
  window.prism && window.prism('jquery_button_click');
});
```

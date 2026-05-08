// SM Miras Calculator — Service Worker v11
// ⚠️ اس فائل کو index.html کے ساتھ ایک ہی folder میں رکھیں

const CACHE = 'sm-miras-v11';

// ── Install: سب کچھ cache کریں ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(async cache => {
      const urls = ['./', './index.html', './sw.js'];
      for (const url of urls) {
        try {
          const res = await fetch(url, { cache: 'reload' });
          if (res.ok) await cache.put(url, res);
        } catch(e) {
          // offline during install — skip
        }
      }
      await self.skipWaiting();
    })
  );
});

// ── Activate: پرانے cache ہٹائیں ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Message: app سے update trigger ──
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Fetch: Cache-First (100% آف لائن) ──
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
  // Cross-origin skip
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      // 1. Try cache first
      const cached = await caches.match(event.request)
                  || await caches.match('./')
                  || await caches.match('./index.html');

      if (cached) {
        // Update cache silently in background if online
        event.waitUntil(
          fetch(event.request, { cache: 'no-cache' })
            .then(async res => {
              if (res && res.status === 200 && res.type !== 'opaque') {
                const c = await caches.open(CACHE);
                await c.put(event.request, res);
              }
            }).catch(() => {})
        );
        return cached; // Serve from cache immediately ✅
      }

      // 2. Not in cache — try network
      try {
        const res = await fetch(event.request, { cache: 'no-cache' });
        if (res && res.status === 200 && res.type !== 'opaque') {
          const c = await caches.open(CACHE);
          await c.put(event.request, res.clone());
        }
        return res;
      } catch (e) {
        // 3. Completely offline — show fallback page
        return new Response(`<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SM Miras — Offline</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0F3D25;color:#C9A84C;font-family:system-ui,sans-serif;
  min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.box{text-align:center;max-width:300px}
.ico{font-size:3.5rem;margin-bottom:16px}
h1{font-size:1.2rem;letter-spacing:3px;margin-bottom:10px}
p{font-size:0.82rem;opacity:0.75;line-height:1.7;margin-bottom:6px}
button{margin-top:20px;padding:11px 26px;background:#C9A84C;color:#0F3D25;
  border:none;border-radius:10px;font-weight:700;font-size:0.9rem;cursor:pointer;
  letter-spacing:1px}
</style></head>
<body><div class="box">
<div class="ico">⚖️</div>
<h1>SM MIRAS</h1>
<p>آپ ابھی آف لائن ہیں</p>
<p>You are offline. Connect to internet once to fully load the app.</p>
<button onclick="location.reload()">🔄 Try Again</button>
</div></body></html>`,
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })()
  );
});

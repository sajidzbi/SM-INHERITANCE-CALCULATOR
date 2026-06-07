// SM Miras Calculator — Service Worker v9
// Self-hosted fonts cached for full offline use

const CACHE = 'sm-miras-v9';

const CACHE_URLS = [
  './',
  './index.html',
  './sw.js',
  './JameelNooriNastaleeq.ttf',
  './UthmanTahaNaskh.ttf',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(
        CACHE_URLS.map(url =>
          cache.add(new Request(url, { cache: 'reload' })).catch(()=>{})
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.protocol === 'chrome-extension:') return;

  // Font files: cache-first (rarely change)
  if(url.pathname.endsWith('.ttf')||url.pathname.endsWith('.woff2')){
    event.respondWith(
      caches.match(event.request).then(cached => {
        if(cached) return cached;
        return fetch(event.request).then(res => {
          if(res && res.status===200){
            const clone=res.clone();
            caches.open(CACHE).then(c=>c.put(event.request,clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // HTML & assets: network-first with cache fallback
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request, { cache: 'no-cache' }).then(res => {
      if(res && res.status===200 && res.type!=='opaque'){
        const clone=res.clone();
        caches.open(CACHE).then(c=>c.put(event.request,clone));
      }
      return res;
    }).catch(() =>
      caches.match(event.request).then(cached =>
        cached ||
        caches.match('./') ||
        new Response(
          `<!DOCTYPE html><html>
<head><meta charset="UTF-8"><title>SM Miras — Offline</title>
<style>body{background:#0F3D25;color:#C9A84C;font-family:sans-serif;
display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}
.box{text-align:center;padding:30px;}h1{font-size:1.5rem;}p{opacity:.8;}</style>
</head><body><div class="box">
<h1>⚖️ SM Miras Calculator</h1>
<p>آف لائن موڈ — Offline Mode</p>
<p>Please reconnect to the internet to reload.</p>
</div></body></html>`,
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      )
    )
  );
});

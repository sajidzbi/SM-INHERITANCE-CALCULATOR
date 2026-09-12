// SM Miras Calculator — Service Worker v26
// Self-hosted fonts + PDF libraries cached for full offline use
// v26: Added Maliki and Hanbali as full madhhab options (previously only
// Hanafi/Shafi'i), researched and verified against multiple cross-school
// comparison sources. Three genuine, distinguishing differences
// implemented: (1) Paternal grandmother blocked by father — true for
// Hanafi/Shafi'i/Maliki, but NOT Hanbali (she inherits 1/6 alongside him) —
// this also corrected a pre-existing gap where Shafi'i wasn't blocking her
// either; (2) Radd includes the spouse — uniquely true for Maliki only, all
// other madhhabs here exclude the spouse from Radd while other heirs
// survive; (3) Grandfather+siblings Muqasama and Al-Akdariyyah — confirmed
// to apply identically across all four madhhabs (already madhhab-agnostic
// since v24's Sirajiyyah-verified fix). Dhaw al-Arham is computed for
// Maliki too as a practical modern fallback, clearly flagged in the
// Fiqh-School info box as a departure from Maliki's classical
// escheat-to-Bayt-al-Mal default. 64-case regression suite re-verified
// passing; all four madhhabs spot-tested against each distinguishing rule.

const CACHE = 'sm-miras-v26';

const CACHE_URLS = [
  './',
  './index.html',
  './sw.js',
  './JameelNooriNastaleeq.ttf',
  './UthmanTahaNaskh.ttf',
  './jspdf.umd.min.js',
  './html2canvas.min.js',
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

  // Font files & bundled PDF libraries: cache-first (rarely change, large)
  if(url.pathname.endsWith('.ttf')||url.pathname.endsWith('.woff2')||
     url.pathname.endsWith('jspdf.umd.min.js')||url.pathname.endsWith('html2canvas.min.js')){
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

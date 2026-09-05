// SM Miras Calculator — Service Worker v22
// Self-hosted fonts + PDF libraries cached for full offline use
// v22: Major Radd correction — the spouse (husband/wife) is now correctly
// EXCLUDED from Radd whenever any other Furud heir survives, matching the
// mainstream Hanafi/Shafi'i/Hanbali position (a spouse is not a blood
// relative, per Qur'an 33:6; only Maliki includes the spouse in Radd, and
// Maliki is not offered as a madhhab here). The spouse still receives the
// full estate when they are the SOLE heir (unaffected — that is not Radd
// being extended to them, simply no one else exists). Verified against the
// classical husband+mother textbook example (husband keeps exactly 1/2,
// mother's 1/3 absorbs the entire 1/6 residue → 1/2 each) and the reported
// wife+2-daughters case (Asl al-Masala=24, wife stays fixed at exactly 1/8,
// daughters absorb the whole residue → corrected Asl=16). Previously the
// code incorrectly included the spouse in Radd for Hanafi mode. 64-case
// regression suite re-verified passing (those tests check internal
// consistency, not fixed expected values, so this fix required separate
// dedicated verification against external classical sources).

const CACHE = 'sm-miras-v22';

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

// SM Miras Calculator — Service Worker v24
// Self-hosted fonts + PDF libraries cached for full offline use
// v24: Major fiqh correction verified directly against the user-supplied
// Al-Sirajiyyah PDF's own chapter "باب مقاسمة الجدّ" (pp. 75-77): the text
// explicitly states that while Imam Abu Hanifah's individual view is that
// the grandfather fully blocks siblings (matching Imam Malik and Imam
// al-Shafi'i as stated there), Imam Abu Yusuf and Imam Muhammad — Abu
// Hanifah's two senior companions — both adopted Zayd ibn Thabit's Muqasama
// view instead, which the text also notes was the position of the majority
// of the Sahabah. Since Hanafi fatwa is given on the two companions' agreed
// view here, Muqasama (and its exception, Al-Akdariyyah) now applies for
// BOTH Hanafi and Shafi'i — this app no longer has any madhhab where the
// grandfather simply blocks siblings outright. Also corrected a stale info
// box (Fiqh School selection screen) that still claimed "Hanafi Radd
// includes spouses," contradicting the already-fixed calculation engine.
// 64-case regression suite re-verified passing; grandfather+siblings and
// Akdariyya cases confirmed to now produce identical results under both
// madhhabs, matching Al-Sirajiyyah's own worked methodology.

const CACHE = 'sm-miras-v24';

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

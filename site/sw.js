/* Series of Tubes — offline shell.
   The whole game is one HTML file plus a handful of images, so a cache-first strategy on the
   app shell is enough to make it playable with no network at all. Bump SHELL when the game
   changes so returning players pick up the new build instead of a stale one. */
const SHELL = 'sot-shell-v1.10.1';
const ASSETS = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/favicon.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL)
      /* addAll rejects the whole batch if one file 404s, so each asset is added on its own. */
      .then(c => Promise.all(ASSETS.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  if (url.origin !== self.location.origin) return;

  /* Navigations: serve the cached shell immediately, then refresh it in the background so a
     new build lands on the next launch. A game that opens in two seconds beats one that is
     always current but never opens offline. */
  if (r.mode === 'navigate') {
    e.respondWith(
      caches.match('/index.html').then(hit => {
        const net = fetch(r).then(res => {
          if (res && res.ok) caches.open(SHELL).then(c => c.put('/index.html', res.clone()));
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  e.respondWith(
    caches.match(r).then(hit => hit || fetch(r).then(res => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(SHELL).then(c => c.put(r, copy));
      }
      return res;
    }).catch(() => hit))
  );
});

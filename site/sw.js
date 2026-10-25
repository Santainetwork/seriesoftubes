/* Series of Tubes — offline shell.
   The page always comes from the network when there is one, so a new release shows up on the
   next visit; everything else is served from the cache and refreshed in the background. A
   cache-first shell would keep players on a stale build forever, which is exactly what happened
   when the Indonesia map shipped: the game kept loading the old one. */
const SHELL = 'sot-shell-v2';
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

  /* Navigations: network first, cached shell as the offline fallback. */
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(SHELL).then(c => c.put('/index.html', copy));
        }
        return res;
      }).catch(() => caches.match('/index.html').then(hit => hit || caches.match('/')))
    );
    return;
  }

  /* Everything else: cache first, refreshed in the background. */
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

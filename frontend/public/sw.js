// VidyutFlow service worker: cache the app shell & static assets so the Field Engineer PWA opens offline.
// API writes are NEVER cached here — offline field entries live in the persistent UUID sync queue
// (IndexedDB + localStorage) and replay to POST /api/requests/field-sync with server-side UUID de-duplication.
const CACHE = 'vidyutflow-v3';
const SHELL_URLS = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL_URLS).catch(() => c.addAll(['/'])))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.delete('vidyutos-v1'),
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      ),
    ])
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || e.request.url.includes('/api/')) return;
  const reqUrl = new URL(e.request.url);
  if (reqUrl.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r && r.ok) {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return r;
      })
      .catch(async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        if (e.request.mode === 'navigate') {
          return (await caches.match('/index.html')) || caches.match('/');
        }
        return Response.error();
      })
  );
});

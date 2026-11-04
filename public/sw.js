/* eslint-disable no-restricted-globals */
/**
 * VidyutFlow 2.0 — Application Shell Service Worker
 *
 * Scope & Safety Guarantees:
 * 1. Versioned application-shell cache ('vidyutflow-app-shell-v2.2.0') for static HTML, JS, CSS, font, and logo assets.
 * 2. First-time offline access requires prior successful online loading and caching of the application shell.
 * 3. NEVER caches or intercepts POST / PUT / PATCH / DELETE requests.
 * 4. NEVER caches authentication responses (/api/auth/*), API responses (/api/*), AI responses (/api/ai-chat),
 *    sensitive personal data, live ERP records, or responses with Cache-Control: no-store / private / Set-Cookie.
 * 5. Does NOT implement a conflicting background sync queue. The Field Engineer offline queue in localStorage
 *    ('vidyutflow_field_offline_queue') remains the single canonical DEMO offline action queue.
 * 6. Safe update lifecycle: cleans up outdated 'vidyutflow-app-shell-*' caches on activation and never forces
 *    an automatic page reload while an engineer is entering inspection data.
 */

const CACHE_VERSION = 'v2.2.0';
const CACHE_PREFIX = 'vidyutflow-app-shell-';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

const CORE_PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/assets/ugvcl-logo.png',
  '/assets/ugvcl-logo.svg',
];

const EXCLUDED_PATH_PREFIXES = [
  '/api/',
  '/api/auth',
  '/api/ai-chat',
  '/api/health',
  '/auth/',
  '/oauth/',
];

const ALLOWED_EXTERNAL_FONT_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];

function isExcludedPath(pathname) {
  if (
    pathname === '/sw.js' ||
    pathname.startsWith('/@vite') ||
    pathname.startsWith('/@fs') ||
    pathname.startsWith('/@id') ||
    pathname.startsWith('/__vite')
  ) {
    return true;
  }
  for (let i = 0; i < EXCLUDED_PATH_PREFIXES.length; i++) {
    const prefix = EXCLUDED_PATH_PREFIXES[i];
    if (pathname === prefix || pathname.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

function shouldHandleFetch(request) {
  if (!request || request.method !== 'GET') {
    return false;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(request.url);
  } catch {
    return false;
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return false;
  }

  const authHeader = request.headers && request.headers.get('authorization');
  if (authHeader) {
    return false;
  }

  const reqCacheControl = (request.headers && request.headers.get('cache-control')) || '';
  if (reqCacheControl.toLowerCase().includes('no-store')) {
    return false;
  }

  if (isExcludedPath(parsedUrl.pathname)) {
    return false;
  }

  if (parsedUrl.origin !== self.location.origin) {
    return ALLOWED_EXTERNAL_FONT_ORIGINS.includes(parsedUrl.origin);
  }

  if (request.mode === 'navigate' || request.destination === 'document') {
    return true;
  }

  const pathname = parsedUrl.pathname || '/';
  return (
    pathname === '/' ||
    pathname === '/index.html' ||
    pathname === '/manifest.webmanifest' ||
    pathname.startsWith('/assets/') ||
    /\.(?:js|mjs|css|html|webmanifest|json|png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf|otf)$/i.test(
      pathname
    )
  );
}

function isCacheableResponse(response, requestUrl) {
  if (!response || response.status !== 200) {
    return false;
  }

  if (response.type !== 'basic' && response.type !== 'cors' && response.type !== 'default') {
    return false;
  }

  const cacheControl = ((response.headers && response.headers.get('cache-control')) || '').toLowerCase();
  if (cacheControl.includes('no-store') || cacheControl.includes('private')) {
    return false;
  }

  const setCookie = response.headers && response.headers.get('set-cookie');
  if (setCookie) {
    return false;
  }

  const contentType = ((response.headers && response.headers.get('content-type')) || '').toLowerCase();
  if (contentType.includes('application/json') && !String(requestUrl).endsWith('/manifest.webmanifest')) {
    return false;
  }

  return true;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await Promise.allSettled(
          CORE_PRECACHE_URLS.map(async (url) => {
            const response = await fetch(new Request(url, { cache: 'reload' }));
            if (isCacheableResponse(response, url)) {
              await cache.put(url, response.clone());
            }
          })
        );
      } catch {
        // Non-fatal pre-cache failure: runtime caching will still populate shell assets on fetch
      }
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        await caches.delete('vidyutos-v1');
        const existingNames = await caches.keys();
        const deletions = existingNames
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((outdatedName) => caches.delete(outdatedName));
        await Promise.all(deletions);
        if (self.clients && typeof self.clients.claim === 'function') {
          await self.clients.claim();
        }
      } catch {
        // Ignore activation cleanup error
      }
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event && event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function readValidCachedResponse(cache, matchKey) {
  try {
    const cached = await cache.match(matchKey);
    if (!cached) return null;
    const urlStr = typeof matchKey === 'string' ? matchKey : matchKey.url;
    if (!isCacheableResponse(cached, urlStr)) {
      await cache.delete(matchKey);
      return null;
    }
    return cached;
  } catch {
    try {
      await cache.delete(matchKey);
    } catch {
      // Ignore cache delete failure
    }
    return null;
  }
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || e.request.url.includes('/api/')) return;
  const event = e;
  const { request } = event;
  if (!shouldHandleFetch(request)) {
    return;
  }

  const isNavigation = e.request.mode === 'navigate' || request.destination === 'document';

  if (isNavigation) {
    // Network-First for SPA navigation requests, falling back to cached app shell (/index.html or /)
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const networkResponse = await fetch(request);
          if (isCacheableResponse(networkResponse, request.url)) {
            await cache.put('/index.html', networkResponse.clone());
          }
          return networkResponse;
        } catch {
          const cachedIndex =
            (await readValidCachedResponse(cache, request)) ||
            (await readValidCachedResponse(cache, '/index.html')) ||
            (await readValidCachedResponse(cache, '/'));

          if (cachedIndex) {
            return cachedIndex;
          }

          return new Response(
            '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VidyutFlow — Offline</title></head><body style="font-family:sans-serif;padding:2rem;background:#F5F7FB;color:#0F172A"><h1>VidyutFlow Application Shell Unavailable Offline</h1><p>First-time offline access requires loading VidyutFlow online at least once so the application shell can be cached.</p></body></html>',
            {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            }
          );
        }
      })()
    );
    return;
  }

  // Static application-shell assets: Cache-First with background refresh and corrupted-cache eviction
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await readValidCachedResponse(cache, request);

      const networkFetchPromise = fetch(request)
        .then(async (networkResponse) => {
          if (isCacheableResponse(networkResponse, request.url)) {
            await cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => null);

      if (cachedResponse) {
        event.waitUntil(networkFetchPromise);
        return cachedResponse;
      }

      const freshResponse = await networkFetchPromise;
      if (freshResponse) {
        return freshResponse;
      }

      return new Response('Offline static resource unavailable', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    })()
  );
});

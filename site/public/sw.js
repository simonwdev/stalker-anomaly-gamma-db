// Service Worker — image cache for item icons and other static images.
// Cache name — bump the version string to force a cache refresh on deploy.
const ICON_CACHE = 'gamma-icons-v1';
const IMG_CACHE  = 'gamma-img-v1';

// Only cache GET requests for image paths we own.
function isIconRequest(url) {
  return url.pathname.startsWith('/img/icons/') && url.pathname.endsWith('.png');
}
function isImageRequest(url) {
  return url.pathname.startsWith('/img/');
}

self.addEventListener('install', () => {
  self.skipWaiting(); // activate immediately
});

self.addEventListener('activate', (event) => {
  // Delete caches from old SW versions
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== ICON_CACHE && k !== IMG_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  let url;
  try { url = new URL(event.request.url); } catch { return; }

  // Only intercept same-origin /img/ requests
  if (url.origin !== self.location.origin) return;
  if (!isImageRequest(url)) return;

  const cacheName = isIconRequest(url) ? ICON_CACHE : IMG_CACHE;

  // Cache-first strategy: serve from cache immediately; fetch + cache on miss.
  event.respondWith(
    caches.open(cacheName).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        // Only cache successful opaque/OK responses
        if (response && (response.status === 200 || response.type === 'opaque')) {
          cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        // If offline and not cached, surface a network error so the <img @error>
        // fallback fires the same way it would for any other failed image fetch.
        return Response.error();
      }
    })
  );
});


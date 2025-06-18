const CACHE_NAME = 'notemap-cache-v1';
const CDN_ASSETS = [
  'https://unpkg.com/leaflet/dist/leaflet.js',
  'https://unpkg.com/leaflet/dist/leaflet.css'
];

const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  ...CDN_ASSETS,
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(URLS_TO_CACHE);
    } catch (err) {
      console.warn('Cache addAll failed:', err);
      // Fallback: try to cache core assets only
      await cache.addAll(URLS_TO_CACHE.filter(u => !u.startsWith('https://')));
    }

    // Cache CDN files only if fetch succeeds
    await Promise.all(CDN_ASSETS.map(async url => {
      try {
        const resp = await fetch(url);
        if (resp.ok) await cache.put(url, resp);
      } catch (e) {
        console.warn('Skipping CDN asset', url, e);
      }
    }));
  })());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(resp => resp || fetch(event.request))
  );
});

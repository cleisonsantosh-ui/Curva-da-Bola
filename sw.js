const CACHE_NAME = 'curva-da-bola-v1';
const ASSETS = [
  './',
  './index.html',
  './css/tokens.css',
  './css/layout.css',
  './css/components.css',
  './css/animations.css',
  './css/reset.css',
  './js/utils.js',
  './js/config.js',
  './js/supabase.js',
  './js/api.js',
  './js/cards.js',
  './js/realtime.js',
  './js/app.js',
  './assets/logo.png'
];

// Install: Cache critical assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching assets');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Stale-while-revalidate strategy
self.addEventListener('fetch', event => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchedResponse = fetch(event.request).then(networkResponse => {
        // Upgrade cache if not an external/API call (to avoid CORS/size issues)
        if (event.request.url.includes(location.origin)) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchedResponse;
    })
  );
});

const CACHE_NAME = 'family-finance-2026-09-16-download-motion-v16';
const CORE_ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './css/motion-v15.css?v=15',
  './css/download-motion-v16.css?v=16',
  './manifest.json',
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/config.js',
  './js/supabase.js',
  './js/auth.js',
  './js/database.js',
  './js/finance.js',
  './js/cards.js',
  './js/goals.js',
  './js/budget.js',
  './js/family.js',
  './js/notifications.js',
  './js/migration.js',
  './js/settings.js',
  './js/pwa.js',
  './js/ui.js?v=motion-v15',
  './js/download-motion-v16.js?v=16',
  './js/motion-v15.js?v=15',
  './js/pdf.js',
  './js/reports.js',
  './js/analytics.js',
  './js/app.js?v=download-motion-v16'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('family-finance-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(async () => (await caches.match('./index.html')) || (await caches.match('./')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

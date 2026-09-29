const CACHE_NAME = 'family-finance-planejamento-checklist';
const CORE_ASSETS = [
  './',
  './index.html',
  './css/app.css?v=tema-claro-contraste',
  './css/motion-v15.css?v=15',
  './css/download-motion-v16.css?v=16',
  './css/family-monitor-v17.css?v=17',
  './css/planning-v18.css?rev=planejamento-checklist',
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
  './js/planning-v18.js?rev=planejamento-checklist',
  './js/family.js?v=family-monitor-v17',
  './js/family-monitor-v17.js?v=17',
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
  './js/app.js?rev=planejamento-checklist'
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
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then(clients => Promise.all(clients.map(client => {
        if (!client.url || !client.url.startsWith(self.registration.scope)) return null;
        return client.navigate(client.url).catch(() => null);
      })))
  );
});

function networkFirst(request) {
  return fetch(request, { cache: 'no-store' })
    .then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    })
    .catch(async () => (await caches.match(request)) || Response.error());
}

function cacheFirst(request) {
  return caches.match(request).then(cached => {
    if (cached) return cached;
    return fetch(request).then(response => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    });
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(async () => (await caches.match('./index.html')) || (await caches.match('./')))
    );
    return;
  }

  const destination = request.destination;
  const pathname = url.pathname;
  const isCodeOrStyle = destination === 'script' || destination === 'style' || pathname.endsWith('.js') || pathname.endsWith('.css') || pathname.endsWith('.json');

  event.respondWith(isCodeOrStyle ? networkFirst(request) : cacheFirst(request));
});

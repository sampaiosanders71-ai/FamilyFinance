const CACHE_PREFIX = 'family-finance-';
const CACHE_NAME = 'family-finance-cache-2026-09-10-idempotencia-seguranca-final';
const CORE_ASSETS = [
  './', './index.html', './manifest.json',
  './icons/icon-152.png', './icons/icon-167.png', './icons/icon-180.png',
  './icons/icon-192.png', './icons/icon-512.png'
];
const NETWORK_TIMEOUT_MS = 8000;

async function fetchWithTimeout(request, options = {}, timeoutMs = NETWORK_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(request, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(CORE_ASSETS.map(async asset => {
      try {
        const response = await fetchWithTimeout(asset, { cache: 'reload' });
        if (response && response.ok) await cache.put(asset, response.clone());
      } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach(client => client.postMessage({ type: 'SW_UPDATED', cache: CACHE_NAME }));
  })());
});

async function networkFirst(request, fallbackKey) {
  try {
    const response = await fetchWithTimeout(request, { cache: 'no-store' });
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(fallbackKey || request, response.clone());
      return response;
    }
    const cached = await caches.match(fallbackKey || request);
    return cached || response || Response.error();
  } catch (_) {
    return (await caches.match(fallbackKey || request)) || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // HTML sempre tenta a rede primeiro. Assim uma publicação nova não fica presa no cache antigo.
  if (request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.respondWith(networkFirst(request, './index.html'));
    return;
  }

  // Arquivos estáticos: responde rápido do cache e atualiza em segundo plano.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const refresh = fetchWithTimeout(request, { cache: 'no-cache' }).then(async response => {
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    }).catch(() => null);
    if (cached) {
      event.waitUntil(refresh);
      return cached;
    }
    return (await refresh) || Response.error();
  })());
});

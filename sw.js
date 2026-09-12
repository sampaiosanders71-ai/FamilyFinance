const CACHE_PREFIX = 'family-finance-';
const CACHE_NAME = 'family-finance-cache-2026-09-11-balance-adjustment';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-152.png',
  './icons/icon-167.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
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

async function cacheResponse(key, response) {
  if (!response || !response.ok) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(key, response.clone());
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(CORE_ASSETS.map(async asset => {
      const response = await fetchWithTimeout(asset, { cache: 'reload' });
      if (response && response.ok) await cache.put(asset, response.clone());
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

async function networkFirst(request, fallbackKey = request) {
  try {
    const response = await fetchWithTimeout(request, { cache: 'no-store' });
    if (response && response.ok) {
      await cacheResponse(fallbackKey, response);
      return response;
    }
    const cached = await caches.match(fallbackKey);
    return cached || response || Response.error();
  } catch (_) {
    return (await caches.match(fallbackKey)) || Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegação sempre tenta a rede primeiro para não prender uma publicação nova no cache.
  if (request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.respondWith(networkFirst(request, './index.html'));
    return;
  }

  // O manifesto precisa ficar atual para o navegador reconhecer a instalação do PWA.
  if (url.pathname.endsWith('/manifest.json')) {
    event.respondWith(networkFirst(request, request));
    return;
  }

  // Cache-first para ícones/estáticos, com atualização em segundo plano.
  // IMPORTANTE: waitUntil é chamado de forma síncrona durante o evento fetch.
  const refreshPromise = fetchWithTimeout(request, { cache: 'no-cache' })
    .then(async response => {
      if (response && response.ok) await cacheResponse(request, response);
      return response;
    })
    .catch(() => null);

  event.waitUntil(refreshPromise.then(() => undefined));
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    return (await refreshPromise) || Response.error();
  })());
});

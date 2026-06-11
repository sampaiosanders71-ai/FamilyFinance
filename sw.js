// Service Worker do Family Finance
// Versão do cache — troque este número quando atualizar o app pra forçar renovação
const CACHE_NAME = 'family-finance-v1';

// Arquivos essenciais pra abrir o app (offline shell)
const ESSENTIAL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Instalação: guarda os arquivos essenciais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ESSENTIAL))
  );
  self.skipWaiting();
});

// Ativação: limpa caches antigos de versões anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// Busca: estratégia "network-first" pro HTML (sempre tenta versão nova online),
// "cache-first" pros ícones (não mudam, carregam rápido)
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Só lida com GET (não interfere em chamadas de API POST etc — importante pro futuro Supabase)
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Ignora requisições pra outros domínios (fontes, CDNs, futuramente Supabase)
  if (url.origin !== self.location.origin) return;

  // HTML / navegação: tenta rede primeiro, cai pro cache se offline
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Demais arquivos do próprio site (ícones): cache primeiro, rede como reforço
  event.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
      );
    })
  );
});

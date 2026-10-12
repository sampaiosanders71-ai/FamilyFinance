const CACHE_NAME='family-finance-2.9.20';
const CORE_ASSETS=[
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/report-letterhead.jpg",
  "./css/app.css?v=2.9.20",
  "./css/cards-workspace.css?v=2.9.20",
  "./css/categories-budget.css?v=2.9.20",
  "./css/context-help.css?v=2.9.20",
  "./css/dashboard-v29.css?v=2.9.20",
  "./css/download-motion-v16.css?v=2.9.20",
  "./css/family-monitor-v17.css?v=2.9.20",
  "./css/financial-view-293.css?v=2.9.20",
  "./css/motion-v15.css?v=2.9.20",
  "./css/nature.css?v=2.9.20",
  "./css/planning-v18.css?v=2.9.20",
  "./css/report-export.css?v=2.9.20",
  "./css/reserve-299.css?v=2.9.20",
  "./css/ui-295.css?v=2.9.20",
  "./js/analytics.js?v=2.9.20",
  "./js/app.js?v=2.9.20",
  "./js/auth.js?v=2.9.20",
  "./js/budget-suggestion.js?v=2.9.20",
  "./js/budget.js?v=2.9.20",
  "./js/card-domain.js?v=2.9.20",
  "./js/card-adjustments-workspace.js?v=2.9.20",
  "./js/cards-workspace.js?v=2.9.20",
  "./js/cards.js?v=2.9.20",
  "./js/categories.js?v=2.9.20",
  "./js/category-alias.js?v=2.9.20",
  "./js/category-extra-icons.js?v=2.9.20",
  "./js/config.js?v=2.9.20",
  "./js/context-help.js?v=2.9.20",
  "./js/dashboard-cash.js?v=2.9.20",
  "./js/dashboard-overview.js?v=2.9.20",
  "./js/database.js?v=2.9.20",
  "./js/download-motion-v16.js?v=2.9.20",
  "./js/family-monitor-v17.js?v=2.9.20",
  "./js/family.js?v=2.9.20",
  "./js/finance.js?v=2.9.20",
  "./js/financial-integrity.js?v=2.9.20",
  "./js/financial-ledger.js?v=2.9.20",
  "./js/goal-integration.js?v=2.9.20",
  "./js/goals.js?v=2.9.20",
  "./js/migration.js?v=2.9.20",
  "./js/motion-v15.js?v=2.9.20",
  "./js/notifications.js?v=2.9.20",
  "./js/pagination.js?v=2.9.20",
  "./js/pdf.js?v=2.9.20",
  "./js/planning-v18.js?v=2.9.20",
  "./js/pwa.js?v=2.9.20",
  "./js/report-export.js?v=2.9.20",
  "./js/reports.js?v=2.9.20",
  "./js/request-operation.js?v=2.9.20",
  "./js/reserve-position.js?v=2.9.20",
  "./js/reserve-reconciliation.js?v=2.9.20",
  "./js/settings.js?v=2.9.20",
  "./js/supabase.js?v=2.9.20",
  "./js/transaction-nature.js?v=2.9.20",
  "./js/ui.js?v=2.9.20",
  "./js/update-center.js?v=2.9.20",
  "./js/version.js?v=2.9.20",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Cliente Supabase carregado de CDN: cópia opcional para reaberturas após uso online.
// Não significa autenticação ou sincronização offline; rede continua obrigatória.
const OPTIONAL_VENDOR=['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.0/+esm'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(async cache=>{
    await cache.addAll(CORE_ASSETS);
    await Promise.allSettled(OPTIONAL_VENDOR.map(async url=>{
      const r=await fetch(url,{mode:'cors'});
      if(r.ok)await cache.put(url,r);
    }));
  }));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('family-finance-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

async function networkOnly(request){return fetch(request,{cache:'no-store'})}
async function cacheFirst(request){
  const cache=await caches.open(CACHE_NAME);const cached=await cache.match(request);if(cached)return cached;
  const response=await fetch(request);if(response?.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}return response;
}
async function navigationFromInstalledShell(request){
  const cache=await caches.open(CACHE_NAME);
  // The installed shell and its versioned modules must belong to one release.
  const shell=await cache.match('./index.html');
  return shell || fetch(request,{cache:'no-store'});
}

self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);
  // Recursos ESM do cliente de autenticação podem ter dependências transitivas.
  if(url.origin!==self.location.origin){
    if(url.hostname==='cdn.jsdelivr.net' && url.pathname.startsWith('/npm/@supabase/'))event.respondWith(cacheFirst(request).catch(()=>Response.error()));
    return;
  }
  if(url.pathname.endsWith('/updates.json')||url.pathname.endsWith('updates.json')){event.respondWith(networkOnly(request));return}
  if(request.mode==='navigate'){event.respondWith(navigationFromInstalledShell(request));return}
  event.respondWith(cacheFirst(request));
});

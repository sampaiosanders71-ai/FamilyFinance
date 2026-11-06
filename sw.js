// Cache Storage is shared by origin; isolate production and test by SW scope.
const CACHE_PREFIX='family-finance:'+new URL(self.registration.scope).pathname+':';
const CACHE_NAME=CACHE_PREFIX+'2.9.35';
const CORE_ASSETS=[
  "./js/goal-appearance.js?v=2.9.35",
  "./js/goal-icons.js?v=2.9.35",
  "./css/interfaces-2931.css?v=2.9.35",
  "./js/invoice-workspace-model.js?v=2.9.35",
  "./css/invoice-workspace.css?v=2.9.35",
  "./css/cards-refresh.css?v=2.9.35",
  "./js/list-pagination.js?v=2.9.35",
  "./css/family-pagination.css?v=2.9.35",
  "./css/analytics-redesign.css?v=2.9.35",
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/report-letterhead.jpg",
  "./css/app.css?v=2.9.35",
  "./css/cards-workspace.css?v=2.9.35",
  "./css/categories-budget.css?v=2.9.35",
  "./css/context-help.css?v=2.9.35",
  "./css/dashboard-v29.css?v=2.9.35",
  "./css/download-motion-v16.css?v=2.9.35",
  "./css/family-monitor-v17.css?v=2.9.35",
  "./css/financial-view-293.css?v=2.9.35",
  "./css/motion-v15.css?v=2.9.35",
  "./css/nature.css?v=2.9.35",
  "./css/planning-v18.css?v=2.9.35",
  "./css/report-export.css?v=2.9.35",
  "./css/reserve-299.css?v=2.9.35",
  "./css/ui-295.css?v=2.9.35",
  "./js/analytics.js?v=2.9.35",
  "./js/app.js?v=2.9.35",
  "./js/auth.js?v=2.9.35",
  "./js/budget-suggestion.js?v=2.9.35",
  "./js/budget.js?v=2.9.35",
  "./js/card-domain.js?v=2.9.35",
  "./js/card-adjustments-workspace.js?v=2.9.35",
  "./js/cards-workspace.js?v=2.9.35",
  "./js/cards.js?v=2.9.35",
  "./js/categories.js?v=2.9.35",
  "./js/category-alias.js?v=2.9.35",
  "./js/category-extra-icons.js?v=2.9.35",
  "./js/config.js?v=2.9.35",
  "./js/context-help.js?v=2.9.35",
  "./js/dashboard-cash.js?v=2.9.35",
  "./js/dashboard-overview.js?v=2.9.35",
  "./js/database.js?v=2.9.35",
  "./js/download-motion-v16.js?v=2.9.35",
  "./js/family-monitor-v17.js?v=2.9.35",
  "./js/family.js?v=2.9.35",
  "./js/finance.js?v=2.9.35",
  "./js/financial-integrity.js?v=2.9.35",
  "./js/financial-ledger.js?v=2.9.35",
  "./js/goal-integration.js?v=2.9.35",
  "./js/goals.js?v=2.9.35",
  "./js/migration.js?v=2.9.35",
  "./js/motion-v15.js?v=2.9.35",
  "./js/notifications.js?v=2.9.35",
  "./js/pagination.js?v=2.9.35",
  "./js/pdf.js?v=2.9.35",
  "./js/planning-v18.js?v=2.9.35",
  "./js/pwa.js?v=2.9.35",
  "./js/report-export.js?v=2.9.35",
  "./js/reports.js?v=2.9.35",
  "./js/request-operation.js?v=2.9.35",
  "./js/reserve-position.js?v=2.9.35",
  "./js/reserve-reconciliation.js?v=2.9.35",
  "./js/settings.js?v=2.9.35",
  "./js/supabase.js?v=2.9.35",
  "./js/transaction-nature.js?v=2.9.35",
  "./js/ui.js?v=2.9.35",
  "./js/update-center.js?v=2.9.35",
  "./js/version.js?v=2.9.35",
  "./css/brand.css?v=2.9.35",
  "./assets/brand-wallet.png",
  "./icons/favicon-32-ff.png",
  "./icons/apple-touch-icon-ff.png",
  "./icons/icon-192-ff.png",
  "./icons/icon-512-ff.png",
  "./icons/icon-maskable-512-ff.png",
  "./js/total-composition.js?v=2.9.35",
  "./js/total-details.js?v=2.9.35",
  "./js/total-workspace.js?v=2.9.35",
  "./css/total-details.css?v=2.9.35"
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
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
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

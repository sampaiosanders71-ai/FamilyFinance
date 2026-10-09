const CACHE_NAME='family-finance-2.9.4';
const CORE_ASSETS=[
  './','./index.html','./manifest.json',
  './css/dashboard-v29.css?v=2.9.4','./css/app.css?v=2.9.4','./css/motion-v15.css?v=15','./css/download-motion-v16.css?v=16','./css/family-monitor-v17.css?v=17','./css/planning-v18.css?rev=mobile-overview-rebuild','./css/categories-budget.css?rev=mobile-overview-rebuild','./css/context-help.css?rev=global-help',
  './icons/favicon-32.png','./icons/apple-touch-icon.png','./icons/icon-192.png','./icons/icon-512.png','./assets/report-letterhead.jpg',
  './js/version.js','./js/config.js','./js/supabase.js','./js/auth.js','./js/database.js','./js/financial-ledger.js','./js/financial-integrity.js','./js/report-export.js','./js/finance.js','./js/transaction-nature.js','./css/nature.css?v=2.9.4','./css/financial-view-293.css?v=2.9.4','./js/cards.js','./js/goals.js','./js/goal-integration.js','./js/budget.js','./js/categories.js','./js/planning-v18.js?rev=planejamento-checklist','./js/family.js?v=family-monitor-v17','./js/family-monitor-v17.js?v=17','./js/notifications.js','./js/migration.js','./js/settings.js','./js/pwa.js','./js/ui.js?v=motion-v15','./js/download-motion-v16.js?v=16','./js/motion-v15.js?v=15','./js/pdf.js','./js/reports.js','./js/analytics.js','./js/context-help.js','./js/dashboard-overview.js?v=2.9.4','./js/dashboard-cash.js?v=2.9.4','./js/update-center.js?v=2.9.4','./js/app.js?rev=2.9.4'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('family-finance-')&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

async function networkOnly(request){return fetch(request,{cache:'no-store'})}
async function cacheFirst(request){
  const cached=await caches.match(request);if(cached)return cached;
  const response=await fetch(request);if(response?.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy))}return response;
}
async function navigationFromInstalledShell(request){
  const cached=await caches.match('./index.html');if(cached)return cached;
  try{const response=await fetch(request,{cache:'no-store'});if(response?.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',copy))}return response}catch{return(await caches.match('./'))||Response.error()}
}

self.addEventListener('fetch',event=>{
  const request=event.request;if(request.method!=='GET')return;
  const url=new URL(request.url);if(url.origin!==self.location.origin)return;
  if(url.pathname.endsWith('/updates.json')||url.pathname.endsWith('updates.json')){event.respondWith(networkOnly(request).catch(async()=>await caches.match(request)||new Response('{"version":"0.0.0"}',{headers:{'Content-Type':'application/json'}})));return}
  if(request.mode==='navigate'){event.respondWith(navigationFromInstalledShell(request));return}
  event.respondWith(cacheFirst(request));
});

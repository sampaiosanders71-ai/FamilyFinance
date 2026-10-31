// Presentation only: callers retain complete authorized datasets for financial calculations.
const states=new Map(),configs=new Map();
const media=window.matchMedia('(max-width: 760px)');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function recentRecords(rows,dateKey='occurred_on'){
 return [...rows].sort((a,b)=>String(b[dateKey]||'').localeCompare(String(a[dateKey]||''))||String(b.created_at||'').localeCompare(String(a.created_at||''))||String(b.id||'').localeCompare(String(a.id||'')));
}
export function clearListPages(prefix=''){
 for(const map of [states,configs])for(const key of map.keys())if(!prefix||key.startsWith(prefix))map.delete(key);
}
function view(config,state){
 const total=config.rows.length;
 state.page=Math.max(1,Math.min(state.page,Math.max(1,Math.ceil(total/state.size))));
 state.visible=Math.max(10,Math.min(state.visible,Math.max(10,total)));
 const start=media.matches?0:(state.page-1)*state.size,end=Math.min(total,media.matches?state.visible:start+state.size);
 return {start,end,total};
}
function markup(key){
 const config=configs.get(key),state=states.get(key);if(!config||!state)return '';
 const {start,end,total}=view(config,state);
 const rows=total?config.rows.slice(start,end).map((row,i)=>config.row(row,start+i,i)).join(''):config.empty;
 if(total<=10)return rows;
 const pages=Math.ceil(total/state.size),numbers=[...new Set([1,...Array.from({length:5},(_,i)=>state.page+i-2).filter(n=>n>1&&n<pages),pages])].sort((a,b)=>a-b);
 const buttons=numbers.map((n,i)=>`${i&&n-numbers[i-1]>1?'<span class="list-page-gap" aria-hidden="true">…</span>':''}<button type="button" data-list-page="${n}" ${n===state.page?'aria-current="page"':''} aria-label="Página ${n}">${n}</button>`).join('');
 const nav=`<nav class="list-pagination" aria-label="Paginação de ${esc(config.label)}"><div class="list-pagination-desktop"><span class="list-page-count" role="status" aria-live="polite">${start+1}–${end} de ${total} registros</span><label>Por página <select data-list-size aria-label="Itens por página de ${esc(config.label)}"><option value="10" ${state.size===10?'selected':''}>10</option><option value="20" ${state.size===20?'selected':''}>20</option></select></label><div class="list-page-buttons"><button type="button" data-list-page="${state.page-1}" ${state.page===1?'disabled':''} aria-label="Página anterior">‹</button>${buttons}<button type="button" data-list-page="${state.page+1}" ${state.page===pages?'disabled':''} aria-label="Próxima página">›</button></div></div><div class="list-pagination-mobile">${end<total?'<button type="button" class="secondary-btn" data-list-more>Carregar mais</button>':''}<span role="status" aria-live="polite">${end} de ${total} exibidos</span></div></nav>`;
 return `<div class="paged-list" data-paged-list="${esc(key)}" aria-busy="false"><div class="paged-rows">${rows}</div>${nav}</div>`;
}
export function pagedList(key,rows,row,{context='',label='registros',empty='',beforeChange=null}={}){
 key=String(key);const signature=String(context);let state=states.get(key);
 if(!state||state.context!==signature){state={context:signature,page:1,size:state?.size||10,visible:10};states.set(key,state);}
 configs.set(key,{rows:[...rows],row,label,empty,beforeChange});return markup(key);
}
async function change(root,action,value){
 const key=root?.dataset.pagedList,config=configs.get(key),state=states.get(key);if(!config||!state||root.getAttribute('aria-busy')==='true')return;
 root.setAttribute('aria-busy','true');
 try{
  if(config.beforeChange&&await config.beforeChange()===false)return;
  // A permission refresh may have disposed this list while the guard was pending.
  if(configs.get(key)!==config||states.get(key)!==state||!root.isConnected)return;
  if(action==='more')state.visible+=10;
  if(action==='page')state.page=Math.max(1,Number(value)||1);
  if(action==='size'){state.size=Number(value)===20?20:10;state.page=1;state.visible=10;}
  if(action==='media'&&media.matches)state.visible=Math.max(state.visible,state.page*state.size);
  const scroll=window.scrollY;root.outerHTML=markup(key);
  const next=[...document.querySelectorAll('[data-paged-list]')].find(e=>e.dataset.pagedList===key);
  if(!next)return;
  const focus=action==='size'?next.querySelector('[data-list-size]'):action==='more'?next.querySelector('[data-list-more]'):next.querySelector('[aria-current="page"]');
  if(focus)focus.focus({preventScroll:true});else{const nav=next.querySelector('nav');if(nav){nav.tabIndex=-1;nav.focus({preventScroll:true});}}
  if(action==='more'||action==='media')window.scrollTo({top:scroll,behavior:'auto'});
  else if(action==='page')next.scrollIntoView({block:'start',behavior:'auto'});
 }catch(error){console.error('Paginação:',error);}
 finally{if(root.isConnected)root.setAttribute('aria-busy','false');}
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-list-page],[data-list-more]');if(!button||button.disabled)return;event.preventDefault();void change(button.closest('[data-paged-list]'),button.hasAttribute('data-list-more')?'more':'page',button.dataset.listPage)});
document.addEventListener('change',event=>{if(event.target.matches('[data-list-size]'))void change(event.target.closest('[data-paged-list]'),'size',event.target.value)});
media.addEventListener('change',()=>{document.querySelectorAll('[data-paged-list]').forEach(root=>void change(root,'media'));});

// Locate a financial source without losing records hidden by the presentation page.
export async function revealListRecord(key,predicate){
 const config=configs.get(key),state=states.get(key);if(!config||!state)return false;
 if(config.beforeChange&&await config.beforeChange()===false)return false;
 if(configs.get(key)!==config||states.get(key)!==state)return false;
 const index=config.rows.findIndex(predicate);if(index<0)return false;
 state.page=Math.floor(index/state.size)+1;state.visible=Math.max(state.visible,Math.ceil((index+1)/10)*10);
 const root=[...document.querySelectorAll('[data-paged-list]')].find(el=>el.dataset.pagedList===key);
 if(root)root.outerHTML=markup(key);return true;
}

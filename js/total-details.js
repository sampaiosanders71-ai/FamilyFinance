import { formatBRL,escapeHTML,toast } from './ui.js?v=2.9.42';
import { composition } from './total-composition.js?v=2.9.42';

export function initTotalDetails({onNavigate=()=>{},onDenied=()=>{},getAppearance=()=>({})}={}){
 const providers=new Map(),dialog=document.getElementById('total-detail-dialog');
 let active=null,spec=null,revision=0,busy=false,suspended=[];
 const el=id=>document.getElementById('total-detail-'+id);
 function register(key,provider){providers.set(String(key),provider);return key}
 function attach(target,key,provider,label=''){
  if(!target)return;if(provider)register(key,provider);
  target.dataset.totalDetail=key;target.classList.add('total-detail-trigger');target.setAttribute('role','button');target.tabIndex=0;
  target.setAttribute('aria-haspopup','dialog');target.setAttribute('aria-controls',dialog.id);
  const amount=target.matches('strong,dd,b')?target.textContent.trim():target.querySelector('strong')?.textContent.trim();
  const name=label||target.textContent.trim();
  target.setAttribute('aria-label','Conferir composição: '+name+(amount&&!name.includes(amount)?' · '+amount:''));
  if(!target.title)target.title='Conferir composição do total';
 }
 function clear(prefix=''){
  for(const key of providers.keys())if(!prefix||key.startsWith(prefix))providers.delete(key);
  if(active&&(!prefix||active.key.startsWith(prefix)))close({restore:false});
 }
 function close({restore=true}={}){
  const old=active,previous=suspended;revision++;active=null;spec=null;suspended=[];busy=false;
  if(dialog.open)dialog.close();dialog.removeAttribute('aria-busy');
  el('title').textContent='';el('rows').replaceChildren();el('note').textContent='';el('note').hidden=true;el('icon').replaceChildren();delete dialog.dataset.tone;el('value').textContent='';el('subtitle').textContent='';el('sum').textContent='';
  for(const item of previous||[]){if(restore&&item.dialog.isConnected){item.dialog.showModal();item.dialog.querySelector('.modal-card')?.scrollTo(0,item.scroll)}delete item.dialog.dataset.totalDetailSuspended;}
  if(restore&&old?.opener?.isConnected)old.opener.focus({preventScroll:true});
 }
 function render(){
  if(!active||!spec)return;
  active.page=Math.max(1,Math.min(active.page,Math.max(1,Math.ceil(spec.rows.length/4))));
  const start=(active.page-1)*4,visible=spec.rows.slice(start,start+4),pages=Math.max(1,Math.ceil(spec.rows.length/4));
  const visual=getAppearance(spec,active.key);dialog.dataset.tone=visual.tone||'neutral';el('icon').innerHTML=visual.icon||'';
  el('title').textContent=spec.title;el('subtitle').textContent=[spec.subtitle,`${spec.rows.length} ${spec.rows.length===1?'item':'itens'} na composição`].filter(Boolean).join(' · ');
  el('value').textContent=spec.unit==='count'?String(spec.total):formatBRL(spec.total);
  el('note').textContent=spec.warning||'';el('note').hidden=!spec.warning;
  el('rows').innerHTML=visible.length?visible.map((row,i)=>{
   const tag=row.action?'button':'div',signed=spec.signed||row.amount<0,amount=spec.unit==='count'?String(row.amount):`${signed?(row.amount<0?'− ':'+ '):''}${formatBRL(Math.abs(row.amount))}`;
   const visual=getAppearance(spec,active.key,row),color=visual.colorKind&&visual.colorKey;
   const attributes=visual.colorKind==='category'&&color?`class="total-detail-row-icon category-color-${escapeHTML(color)}" data-category-color`:visual.colorKind==='goal'&&color?`class="total-detail-row-icon" data-goal-color style="--goal-color:var(--goal-${escapeHTML(color)})"`:'class="total-detail-row-icon"';
   return `<${tag} ${row.action?'type="button"':''} class="total-detail-row" data-total-row="${start+i}" ${row.action?'aria-label="'+escapeHTML('Localizar '+row.label)+'"':''}><span ${attributes} aria-hidden="true">${visual.icon||''}</span><span class="total-detail-row-copy"><strong title="${escapeHTML(row.label)}">${escapeHTML(row.label)}</strong><small title="${escapeHTML(row.meta)}">${escapeHTML(row.meta)}</small></span><strong class="total-detail-row-value ${row.amount<0?'negative':''}">${escapeHTML(amount)}</strong>${row.action?'<span class="total-detail-arrow" aria-hidden="true">›</span>':''}</${tag}>`;
  }).join(''):'<p class="total-detail-empty">Nenhum registro compõe este total.</p>';
  el('nav').hidden=spec.rows.length<=4;el('previous').disabled=active.page===1;el('next').disabled=active.page===pages;
  el('page').textContent=`Página ${active.page} de ${pages}`;
  el('page').setAttribute('aria-label',`Página ${active.page} de ${pages}, itens ${visible.length?start+1:0} a ${start+visible.length} de ${spec.rows.length}`);
  el('sum').textContent=spec.unit==='count'?String(spec.total):formatBRL(spec.total);
 }
 async function resolve(){
  const current=active,token=++revision;if(!current)return false;
  const provider=providers.get(current.key);if(!provider){close();return false}
  busy=true;dialog.setAttribute('aria-busy','true');
  try{
   const next=await provider();if(active!==current||token!==revision)return false;
   if(!next||next.guard&&await next.guard()===false){if(active===current)close({restore:false});return false}
   if(active!==current||token!==revision)return false;
   spec=composition(next.title,next.total,next.rows,next);render();return true;
  }catch(error){
   if(active===current&&token===revision){const key=current.key;close({restore:false});toast(error?.message||'Não foi possível conferir este total.','error');onDenied(key,error)}
   return false;
  }finally{if(active===current&&token===revision){busy=false;dialog.removeAttribute('aria-busy')}}
 }
 async function open(key,opener){
  if(active)close({restore:false});
  suspended=[...document.querySelectorAll('dialog[open]')].filter(parent=>parent!==dialog).map(parent=>({dialog:parent,scroll:parent.querySelector('.modal-card')?.scrollTop||0}));
  for(const {dialog:parent}of [...suspended].reverse()){parent.dataset.totalDetailSuspended='true';parent.close()}
  active={key:String(key),opener:opener||document.activeElement,page:1};spec=null;
  if(await resolve()){dialog.showModal();el('title').focus({preventScroll:true})}
 }
 el('close').addEventListener('click',()=>close());
 dialog.addEventListener('cancel',event=>{event.preventDefault();close()});
 dialog.addEventListener('keydown',event=>{
  if(event.key!=='Tab')return;
  const controls=[...dialog.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')].filter(node=>node.getClientRects().length);
  if(!controls.length){event.preventDefault();el('title').focus();return;}
  const index=controls.indexOf(document.activeElement);
  if(index<0||event.shiftKey&&index===0||!event.shiftKey&&index===controls.length-1){
   event.preventDefault();controls[event.shiftKey?controls.length-1:0].focus();
  }
 });
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close()});
 for(const [id,delta]of [['previous',-1],['next',1]])el(id).addEventListener('click',async()=>{if(!active||busy)return;active.page+=delta;if(await resolve())el('page').focus({preventScroll:true})});
 el('rows').addEventListener('click',async event=>{
  const button=event.target.closest('button[data-total-row]');if(!button||busy||!active)return;
  const current=active,expected=spec?.rows[Number(button.dataset.totalRow)];
  if(!expected?.action||!await resolve()||active!==current)return;
  const row=spec.rows.find(r=>r.id===expected.id);if(!row?.action)return;
  close({restore:false});await onNavigate(row.action);
 });
 document.addEventListener('click',event=>{const target=event.target.closest('[data-total-detail]');if(!target||target.closest('[aria-busy="true"]')||target.matches(':disabled'))return;event.preventDefault();event.stopPropagation();void open(target.dataset.totalDetail,target)});
 document.addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key))return;const target=event.target.closest('[data-total-detail]');if(!target||event.target!==target||target.tagName==='BUTTON')return;event.preventDefault();void open(target.dataset.totalDetail,target)});
 document.addEventListener('visibilitychange',()=>{if(active&&document.visibilityState==='visible')void resolve()});
 document.addEventListener('ff:module-change',()=>{if(active)close({restore:false})});
 return {register,attach,open,close,clear,refresh:()=>active?resolve():Promise.resolve(false),isOpen:prefix=>!!active&&(!prefix||active.key.startsWith(prefix))};
}

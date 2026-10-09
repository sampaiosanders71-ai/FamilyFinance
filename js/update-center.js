import { APP_VERSION } from './version.js';

const DISMISS_PREFIX='ff:update-dismissed:';
let latestRelease=null;
let updateNowHandler=null;
let bound=false;

function $(id){return document.getElementById(id)}
function compareVersions(a,b){
  const aa=String(a||'0').split('.').map(Number),bb=String(b||'0').split('.').map(Number),len=Math.max(aa.length,bb.length);
  for(let i=0;i<len;i++){const x=aa[i]||0,y=bb[i]||0;if(x>y)return 1;if(x<y)return -1}return 0;
}
function hasUpdate(){return !!latestRelease&&compareVersions(latestRelease.version,APP_VERSION)>0}
async function fetchLatestRelease(){
  const response=await fetch(`./updates.json?ts=${Date.now()}`,{cache:'no-store'});
  if(!response.ok)throw new Error('UPDATE_MANIFEST_UNAVAILABLE');
  const data=await response.json();
  if(!data?.version)throw new Error('UPDATE_MANIFEST_INVALID');
  latestRelease=data;return data;
}
function renderSettingsStatus(){
  const current=$('install-current-version'),available=$('install-available-version'),status=$('install-update-status'),updateBtn=$('install-update-now');
  if(current)current.textContent=APP_VERSION;
  if(available)available.textContent=latestRelease?.version||APP_VERSION;
  const availableUpdate=hasUpdate();
  if(status){status.textContent=availableUpdate?'Atualização disponível':'Você está na versão mais recente';status.classList.toggle('ok',!availableUpdate)}
  if(updateBtn){updateBtn.classList.toggle('hidden',!availableUpdate);updateBtn.disabled=!availableUpdate}
}
function renderDialog({forceReleaseNotes=false}={}){
  const release=latestRelease||{version:APP_VERSION,publishedAt:'',improvementCount:0,title:'Family Finance',summary:'',highlights:[],details:[]};
  const availableUpdate=hasUpdate();
  $('app-update-badge-version')?.replaceChildren(document.createTextNode(release.version));
  if($('app-update-title'))$('app-update-title').textContent=availableUpdate?'Nova atualização disponível':'Você está na versão mais recente';
  if($('app-update-subtitle'))$('app-update-subtitle').textContent=availableUpdate?(release.summary||'Veja o que mudou antes de atualizar.'):'Confira as novidades da versão instalada no seu dispositivo.';
  if($('app-update-published'))$('app-update-published').textContent=release.publishedAt||'—';
  if($('app-update-count'))$('app-update-count').textContent=`${Number(release.improvementCount||release.highlights?.length||0)} melhorias principais`;
  const list=$('app-update-highlights');
  if(list)list.innerHTML=(release.highlights||[]).map((item,index)=>`<article class="app-update-item"><span class="app-update-item-number">${String(index+1).padStart(2,'0')}</span><div><strong>${item.title}</strong><small>${item.text}</small></div></article>`).join('');
  const details=$('app-update-details');
  if(details)details.innerHTML=`<div class="app-update-detail-block"><strong>Detalhes da versão</strong><ul>${(release.details||[]).map(item=>`<li>${item}</li>`).join('')}</ul></div><div class="app-update-detail-block"><strong>Versões</strong><p>Instalada: <b>${APP_VERSION}</b>${availableUpdate?` · Disponível: <b>${release.version}</b>`:''}</p></div>`;
  if($('app-update-status-title'))$('app-update-status-title').textContent=availableUpdate?'A atualização está pronta para ser instalada quando você quiser.':'Nenhuma atualização pendente.';
  if($('app-update-status-text'))$('app-update-status-text').textContent=availableUpdate?'Mais tarde mantém a versão atual durante esta sessão.':'Você já está usando a versão mais recente publicada.';
  const now=$('app-update-now'),later=$('app-update-later');
  if(now)now.classList.toggle('hidden',!availableUpdate);
  if(later)later.textContent=availableUpdate?'Mais tarde':'Fechar';
  if(forceReleaseNotes&&details)details.classList.remove('hidden');
}
function closeDialog({dismiss=false}={}){
  if(dismiss&&latestRelease?.version)try{sessionStorage.setItem(DISMISS_PREFIX+latestRelease.version,'1')}catch{}
  const dialog=$('app-update-dialog');if(dialog?.open)dialog.close();
}
export async function refreshUpdateState(){
  try{await fetchLatestRelease()}catch(error){console.warn('Atualizações:',error);latestRelease={version:APP_VERSION,publishedAt:'',improvementCount:0,highlights:[],details:[]}}
  renderSettingsStatus();return{installedVersion:APP_VERSION,availableVersion:latestRelease.version,hasUpdate:hasUpdate(),release:latestRelease};
}
export async function promptAppUpdateIfNeeded(){
  const state=await refreshUpdateState();if(!state.hasUpdate)return state;
  try{if(sessionStorage.getItem(DISMISS_PREFIX+state.availableVersion)==='1')return state}catch{}
  renderDialog();const dialog=$('app-update-dialog');if(dialog&&!dialog.open)dialog.showModal();return state;
}
export async function openUpdateDialog({showDetails=false}={}){
  await refreshUpdateState();renderDialog({forceReleaseNotes:showDetails});const dialog=$('app-update-dialog');if(dialog&&!dialog.open)dialog.showModal();
}
export function initUpdateCenter({onUpdateNow}={}){
  updateNowHandler=typeof onUpdateNow==='function'?onUpdateNow:null;
  if(bound)return;bound=true;
  $('open-update-dialog-btn')?.addEventListener('click',()=>void openUpdateDialog({showDetails:true}));
  $('install-update-now')?.addEventListener('click',()=>void openUpdateDialog());
  $('app-update-close')?.addEventListener('click',()=>closeDialog({dismiss:hasUpdate()}));
  $('app-update-later')?.addEventListener('click',()=>closeDialog({dismiss:hasUpdate()}));
  $('app-update-details-btn')?.addEventListener('click',()=>{const el=$('app-update-details');if(!el)return;const hidden=el.classList.toggle('hidden');$('app-update-details-btn').textContent=hidden?'Ver detalhes':'Ocultar detalhes'});
  $('app-update-now')?.addEventListener('click',async()=>{
    const btn=$('app-update-now');if(!btn||!hasUpdate()||!updateNowHandler)return;
    const old=btn.textContent;btn.disabled=true;btn.textContent='Preparando atualização…';
    try{await updateNowHandler(latestRelease)}catch(error){console.error(error);btn.disabled=false;btn.textContent=old;return}
  });
  $('app-update-dialog')?.addEventListener('cancel',event=>{event.preventDefault();closeDialog({dismiss:hasUpdate()})});
  void refreshUpdateState();
}
export {APP_VERSION};

import { APP_VERSION } from './version.js';

let deferredInstallPrompt=null;
let registrationRef=null;
let controllerReloadArmed=false;

function isStandalone(){return window.matchMedia?.('(display-mode: standalone)').matches===true||window.navigator.standalone===true}
function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent||'')}
function updateInstallUI(message=''){
  const button=document.getElementById('install-app-btn'),status=document.getElementById('pwa-install-status'),network=document.getElementById('pwa-network-status');
  if(network){network.textContent=navigator.onLine?'Online':'Offline';network.classList.toggle('ok',navigator.onLine)}
  if(!button||!status)return;
  if(isStandalone()){button.disabled=true;button.textContent='Aplicativo instalado';status.textContent=message||'Esta instalação já está executando como aplicativo.';return}
  if(deferredInstallPrompt){button.disabled=false;button.textContent='Instalar aplicativo';status.textContent=message||'Instalação disponível neste dispositivo.';return}
  button.disabled=true;button.textContent='Instalar aplicativo';status.textContent=message||(isIOS()?'No iPhone/iPad: Safari → Compartilhar → Adicionar à Tela de Início.':'Quando o navegador liberar a instalação, o botão ficará disponível.')
}
function waitForState(worker,state,timeout=12000){
  if(!worker)return Promise.resolve(false);if(worker.state===state)return Promise.resolve(true);
  return new Promise(resolve=>{let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);worker.removeEventListener('statechange',onState);resolve(value)};const onState=()=>{if(worker.state===state)finish(true);else if(worker.state==='redundant')finish(false)};const timer=setTimeout(()=>finish(false),timeout);worker.addEventListener('statechange',onState)})
}
function armReloadOnce(){
  if(controllerReloadArmed||!('serviceWorker'in navigator))return;controllerReloadArmed=true;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(sessionStorage.getItem(`ff:update-reload:${APP_VERSION}`)==='1')return;sessionStorage.setItem(`ff:update-reload:${APP_VERSION}`,'1');window.location.reload()},{once:true});
}
export async function initPWA(){
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;updateInstallUI()});
  window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;updateInstallUI('Instalação concluída.')});
  window.addEventListener('online',()=>updateInstallUI());window.addEventListener('offline',()=>updateInstallUI('Sem conexão. A interface pode abrir do cache; sincronizações exigem internet.'));
  document.getElementById('install-app-btn')?.addEventListener('click',async()=>{if(!deferredInstallPrompt)return updateInstallUI();const prompt=deferredInstallPrompt;deferredInstallPrompt=null;await prompt.prompt();const choice=await prompt.userChoice.catch(()=>null);updateInstallUI(choice?.outcome==='accepted'?'Instalação iniciada.':'Instalação não concluída.')});
  if('serviceWorker'in navigator){
    try{
      registrationRef=await navigator.serviceWorker.getRegistration('./');
      if(!registrationRef)registrationRef=await navigator.serviceWorker.register(`./sw.js?rev=${APP_VERSION}`,{scope:'./',updateViaCache:'none'});
    }catch(error){console.error('Falha ao registrar Service Worker:',error);updateInstallUI('O navegador não conseguiu ativar o modo aplicativo. Atualize a página e tente novamente.');return}
  }
  updateInstallUI();
}
export async function checkForAppUpdate(){
  if(!('serviceWorker'in navigator))return{available:false,waiting:null};
  registrationRef=registrationRef||await navigator.serviceWorker.getRegistration('./');
  if(!registrationRef)return{available:false,waiting:null};
  if(registrationRef.waiting)return{available:true,waiting:registrationRef.waiting};
  let installing=null;
  const found=new Promise(resolve=>{const handler=()=>{installing=registrationRef.installing;registrationRef.removeEventListener('updatefound',handler);resolve(installing)};registrationRef.addEventListener('updatefound',handler);setTimeout(()=>{registrationRef.removeEventListener('updatefound',handler);resolve(null)},7000)});
  await registrationRef.update();
  installing=registrationRef.installing||await found;
  if(installing)await waitForState(installing,'installed');
  return{available:!!registrationRef.waiting,waiting:registrationRef.waiting||null};
}
export async function activateAppUpdate(){
  const result=await checkForAppUpdate();const waiting=result.waiting||registrationRef?.waiting;if(!waiting)throw new Error('A nova versão ainda não ficou pronta para ativação.');
  armReloadOnce();waiting.postMessage({type:'SKIP_WAITING'});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Tempo excedido ao ativar a atualização.')),12000);navigator.serviceWorker.addEventListener('controllerchange',()=>{clearTimeout(timer);resolve()},{once:true})});
  return true;
}

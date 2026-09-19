import { playAuthIntro, restartAuthIntro, setLoginButtonMotion, revealDashboard, snapshotDashboardMoney, captureDashboardMoneyState as captureDashboardMoneyStateMotion, prepareDashboardMoneyChange as prepareDashboardMoneyChangeMotion, playDashboardMoneyChange as playDashboardMoneyChangeMotion, settleDashboardMoneyChange as settleDashboardMoneyChangeMotion } from './motion-v15.js?v=15';

const MODULE_TITLES={home:'Início',transactions:'Lançamentos',cards:'Cartões',goals:'Metas',budget:'Orçamento',analytics:'Análises',family:'Família',settings:'Configurações'};

export function formatBRL(value){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value)||0)}
export function formatDate(value){if(!value)return '—';const [y,m,d]=String(value).split('-');return `${d}/${m}/${y}`}
export function monthLabel(date){return new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(date).replace(/^./,c=>c.toUpperCase())}
export function escapeHTML(value=''){return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]))}
export function toast(message,type=''){const el=document.getElementById('toast');el.textContent=message;el.className=`toast ${type}`.trim();clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.add('hidden'),4200)}
export function setLoading(active){document.getElementById('global-loading')?.classList.toggle('hidden',!active)}
export function setAuthMode(mode){const register=mode==='register';document.getElementById('auth-title').textContent=register?'Criar conta':'Entrar';document.getElementById('auth-subtitle').textContent=register?'Escolha seu usuário e sua senha.':'Entre com seu usuário e senha.';document.getElementById('auth-submit').textContent=register?'Criar conta':'Entrar';document.getElementById('auth-toggle').textContent=register?'Já tenho uma conta':'Criar uma conta nova';document.getElementById('password').autocomplete=register?'new-password':'current-password'}
export function showAuth(){
  const auth=document.getElementById('auth-view');
  auth.classList.remove('hidden');
  document.getElementById('app-view').classList.add('hidden');
  document.getElementById('mobile-nav')?.classList.add('hidden');
  setLoginButtonMotion(false,'login');
  void restartAuthIntro();
}
export function showApp(user,profile){
  const auth=document.getElementById('auth-view');
  const app=document.getElementById('app-view');
  const mobile=document.getElementById('mobile-nav');
  const enteringFromAuth=!auth.classList.contains('hidden')&&app.classList.contains('hidden');
  const moneyTargets=enteringFromAuth?snapshotDashboardMoney():[];
  const username=profile?.username||user.user_metadata?.username||'usuario';
  const name=profile?.display_name||username;
  document.getElementById('user-name').textContent=name;
  document.getElementById('user-username').textContent=`@${username}`;
  document.getElementById('user-avatar').textContent=name.trim().charAt(0).toUpperCase()||'U';
  document.getElementById('home-greeting').textContent=`Olá, ${name}.`;
  applyTheme(profile?.theme||'system');
  if(!enteringFromAuth){auth.classList.add('hidden');app.classList.remove('hidden');mobile?.classList.remove('hidden');return}
  app.classList.remove('hidden');
  mobile?.classList.add('hidden');
  revealDashboard({
    moneyTargets,
    onCovered:()=>auth.classList.add('hidden'),
    onComplete:()=>{auth.classList.add('hidden');mobile?.classList.remove('hidden');setLoginButtonMotion(false,'login')}
  });
}
export function showModule(moduleName){settleDashboardMoneyChangeMotion();document.querySelectorAll('.module-view').forEach(el=>el.classList.add('hidden'));document.getElementById(`module-${moduleName}`)?.classList.remove('hidden');document.querySelectorAll('.nav-item[data-module]').forEach(el=>el.classList.toggle('active',el.dataset.module===moduleName));document.querySelectorAll('.mobile-nav-item[data-module]').forEach(el=>el.classList.toggle('active',el.dataset.module===moduleName));const more=document.getElementById('mobile-more-btn');if(more)more.classList.toggle('active',['budget','analytics','family','settings'].includes(moduleName));document.getElementById('page-title').textContent=MODULE_TITLES[moduleName]||'Family Finance';window.scrollTo({top:0,behavior:'auto'})}
export function setAuthError(message=''){const el=document.getElementById('auth-error');el.textContent=message;el.classList.toggle('hidden',!message)}
export function setAuthBusy(busy,mode,phase='auth'){
  const register=mode==='register';
  const btn=document.getElementById('auth-submit');
  const form=document.getElementById('auth-form');
  const username=document.getElementById('username');
  const password=document.getElementById('password');
  const toggle=document.getElementById('auth-toggle');
  [username,password,toggle].forEach(el=>{if(el)el.disabled=busy});
  if(btn)btn.disabled=busy;
  if(form){form.setAttribute('aria-busy',busy?'true':'false');form.classList.toggle('is-busy',busy)}
  document.getElementById('auth-loading-overlay')?.classList.add('hidden');
  setLoginButtonMotion(busy,register?'register':'login',phase);
}

export function setAppBusy(busy,title='Processando…',message='Aguarde enquanto concluímos esta ação.') {
  const dialog=document.getElementById('app-loading-dialog');
  const titleEl=document.getElementById('app-loading-title');
  const messageEl=document.getElementById('app-loading-message');
  if(titleEl)titleEl.textContent=title;
  if(messageEl)messageEl.textContent=message;
  if(!dialog)return;
  if(busy){
    document.documentElement.classList.add('app-busy');
    if(!dialog.open){
      try{dialog.showModal()}catch{dialog.setAttribute('open','')}
    }
  }else{
    document.documentElement.classList.remove('app-busy');
    if(dialog.open){try{dialog.close()}catch{dialog.removeAttribute('open')}}
    else dialog.removeAttribute('open');
  }
}
export function openDialog(id){const dialog=document.getElementById(id);if(dialog&&!dialog.open)dialog.showModal()}
export function closeDialog(id){const dialog=document.getElementById(id);if(dialog?.open)dialog.close()}
export function setFormError(id,message=''){const el=document.getElementById(id);if(!el)return;el.textContent=message;el.classList.toggle('hidden',!message)}
export function emptyState(message){return `<div class="empty-state">${escapeHTML(message)}</div>`}

export function resolvedTheme(theme='system'){
  if(theme==='system')return window.matchMedia?.('(prefers-color-scheme: light)').matches?'light':'dark';
  return theme==='light'?'light':'dark';
}
export function applyTheme(theme='system'){
  const value=['dark','light','system'].includes(theme)?theme:'system';
  document.documentElement.dataset.theme=resolvedTheme(value);
  document.documentElement.dataset.themePreference=value;
  document.querySelectorAll('[data-theme-choice]').forEach(btn=>btn.classList.toggle('active',btn.dataset.themeChoice===value));
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=resolvedTheme(value)==='light'?'#f4f1ec':'#0b0c0d';
}

void playAuthIntro();

export function captureDashboardMoneyState(){return captureDashboardMoneyStateMotion()}
export function prepareDashboardMoneyChange(previousState){return prepareDashboardMoneyChangeMotion(previousState)}
export function playDashboardMoneyChange(prepared){return playDashboardMoneyChangeMotion(prepared)}

export function settleDashboardMoneyChange(){return settleDashboardMoneyChangeMotion()}

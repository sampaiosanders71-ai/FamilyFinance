const MODULE_TITLES={home:'Início',transactions:'Lançamentos',cards:'Cartões',goals:'Metas',budget:'Orçamento',family:'Família',settings:'Configurações'};

export function formatBRL(value){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value)||0)}
export function formatDate(value){if(!value)return '—';const [y,m,d]=String(value).split('-');return `${d}/${m}/${y}`}
export function monthLabel(date){return new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(date).replace(/^./,c=>c.toUpperCase())}
export function escapeHTML(value=''){return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]))}
export function toast(message,type=''){const el=document.getElementById('toast');el.textContent=message;el.className=`toast ${type}`.trim();clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.add('hidden'),4200)}
export function setLoading(active){document.getElementById('global-loading')?.classList.toggle('hidden',!active)}
export function setAuthMode(mode){const register=mode==='register';document.getElementById('auth-title').textContent=register?'Criar conta':'Entrar';document.getElementById('auth-subtitle').textContent=register?'Escolha seu usuário e sua senha.':'Entre com seu usuário e senha.';document.getElementById('auth-submit').textContent=register?'Criar conta':'Entrar';document.getElementById('auth-toggle').textContent=register?'Já tenho uma conta':'Criar uma conta nova';document.getElementById('password').autocomplete=register?'new-password':'current-password'}
export function showAuth(){document.getElementById('auth-view').classList.remove('hidden');document.getElementById('app-view').classList.add('hidden');document.getElementById('mobile-nav')?.classList.add('hidden')}
export function showApp(user,profile){document.getElementById('auth-view').classList.add('hidden');document.getElementById('app-view').classList.remove('hidden');document.getElementById('mobile-nav')?.classList.remove('hidden');const username=profile?.username||user.user_metadata?.username||'usuario';const name=profile?.display_name||username;document.getElementById('user-name').textContent=name;document.getElementById('user-username').textContent=`@${username}`;document.getElementById('user-avatar').textContent=name.trim().charAt(0).toUpperCase()||'U';document.getElementById('home-greeting').textContent=`Olá, ${name}.`;applyTheme(profile?.theme||'system')}
export function showModule(moduleName){document.querySelectorAll('.module-view').forEach(el=>el.classList.add('hidden'));document.getElementById(`module-${moduleName}`)?.classList.remove('hidden');document.querySelectorAll('.nav-item[data-module]').forEach(el=>el.classList.toggle('active',el.dataset.module===moduleName));document.querySelectorAll('.mobile-nav-item[data-module]').forEach(el=>el.classList.toggle('active',el.dataset.module===moduleName));const more=document.getElementById('mobile-more-btn');if(more)more.classList.toggle('active',['budget','family','settings'].includes(moduleName));document.getElementById('page-title').textContent=MODULE_TITLES[moduleName]||'Family Finance';window.scrollTo({top:0,behavior:'auto'})}
export function setAuthError(message=''){const el=document.getElementById('auth-error');el.textContent=message;el.classList.toggle('hidden',!message)}
export function setAuthBusy(busy,mode){const btn=document.getElementById('auth-submit');btn.disabled=busy;btn.textContent=busy?'Aguarde…':(mode==='register'?'Criar conta':'Entrar')}
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

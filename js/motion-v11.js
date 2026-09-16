const MONEY_IDS = [
  'stat-balance',
  'stat-month-result',
  'stat-projected',
  'stat-income',
  'stat-expense',
  'stat-card-expense'
];

const moneyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Dashboard: reconstrução completa da timeline.
// Tempo total: 1.650 ms do início do wipe ao valor final dos números.
const DASHBOARD_TOTAL_MS = 1650;
const DASHBOARD_REVEAL_MS = 450;
const DASHBOARD_COUNT_MS = DASHBOARD_TOTAL_MS - DASHBOARD_REVEAL_MS; // 1.200 ms
const DASHBOARD_COVER_MS = 250;
const DASHBOARD_WIPE_END_MS = 650;

let introGeneration = 0;

function byId(id) {
  return document.getElementById(id);
}

function sleep(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function parseBRL(text = '') {
  const normalized = String(text)
    .replace(/\s/g, '')
    .replace(/R\$/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

function visibleDesktopBrandRect() {
  const target = document.querySelector('#auth-view .auth-brand .brand-lockup');
  if (!target) return null;
  const style = getComputedStyle(target);
  const rect = target.getBoundingClientRect();
  return style.display !== 'none' && rect.width > 4 && rect.height > 4 ? rect : null;
}

function createSplash() {
  byId('ff-v11-splash')?.remove();
  const splash = document.createElement('div');
  splash.id = 'ff-v11-splash';
  splash.className = 'ff-v11-splash';
  splash.setAttribute('aria-hidden', 'true');

  const brand = document.createElement('div');
  brand.className = 'ff-v11-splash-brand';
  brand.innerHTML = '<span class="brand-mark">◉</span><span>family <strong>finance</strong></span>';

  splash.appendChild(brand);
  document.body.appendChild(splash);
  return { splash, brand };
}

async function animateBrand(brand) {
  brand.classList.add('is-in');
  await sleep(760);
  await sleep(280);

  const target = visibleDesktopBrandRect();
  const currentWidth = Math.max(1, brand.getBoundingClientRect().width);

  if (target) {
    const scale = Math.max(0.66, Math.min(1, target.width / currentWidth));
    brand.animate([
      { left: '50%', top: '46%', transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
      { left: `${Math.max(16, target.left)}px`, top: `${Math.max(14, target.top)}px`, transform: `translate(0,0) scale(${scale})`, opacity: 1 }
    ], { duration: 800, easing: 'cubic-bezier(.22,.80,.24,1)', fill: 'forwards' });
    await sleep(800);
    return;
  }

  brand.animate([
    { left: '50%', top: '46%', transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
    { left: '22px', top: '24px', transform: 'translate(0,0) scale(.78)', opacity: 1 }
  ], { duration: 760, easing: 'cubic-bezier(.22,.80,.24,1)', fill: 'forwards' });
  await sleep(760);
}

export async function playAuthIntro({ force = false } = {}) {
  const generation = ++introGeneration;
  const auth = byId('auth-view');
  if (!auth || auth.classList.contains('hidden')) return;
  if (!force && auth.dataset.ffMotionV11 === 'done') return;

  auth.dataset.ffMotionV11 = 'done';
  auth.classList.add('ff-v11-intro');
  auth.classList.remove('ff-v11-panel-in', 'ff-v11-fields-in');

  const { splash, brand } = createSplash();
  await animateBrand(brand);
  if (generation !== introGeneration) return;

  auth.classList.add('ff-v11-panel-in');
  await sleep(520);
  auth.classList.add('ff-v11-fields-in');
  await sleep(780);

  splash.classList.add('is-out');
  await sleep(420);
  splash.remove();
}

export function restartAuthIntro() {
  const auth = byId('auth-view');
  if (auth) auth.dataset.ffMotionV11 = '';
  return playAuthIntro({ force: true });
}

export function setLoginButtonMotion(busy, mode = 'login', phase = 'auth') {
  const btn = byId('auth-submit');
  if (!btn) return;

  document.documentElement.classList.toggle('ff-v11-login-busy', Boolean(busy));
  btn.classList.toggle('ff-v11-login-capsule', Boolean(busy));

  if (busy) {
    btn.innerHTML = '<span class="ff-v11-login-spinner" aria-hidden="true"></span>';
    btn.setAttribute('aria-label', phase === 'data' ? 'Carregando seus dados' : (mode === 'register' ? 'Criando conta' : 'Entrando'));
    return;
  }

  btn.textContent = mode === 'register' ? 'Criar conta' : 'Entrar';
  btn.setAttribute('aria-label', mode === 'register' ? 'Criar conta' : 'Entrar');
}

function ensureDashboardWipe() {
  let wipe = byId('ff-v11-dashboard-wipe');
  if (!wipe) {
    wipe = document.createElement('div');
    wipe.id = 'ff-v11-dashboard-wipe';
    wipe.className = 'ff-v11-dashboard-wipe';
    wipe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(wipe);
  }
  return wipe;
}

export function snapshotDashboardMoney() {
  return MONEY_IDS.map(id => {
    const el = byId(id);
    return el ? { el, value: parseBRL(el.textContent) } : null;
  }).filter(Boolean);
}

function resetDashboardMoney(targets) {
  for (const { el } of targets) {
    el.classList.add('ff-v11-counting');
    el.textContent = moneyFormatter.format(0);
  }
}

function animateDashboardMoney(targets, duration = DASHBOARD_COUNT_MS) {
  if (!targets?.length) return;
  const start = performance.now();

  const frame = now => {
    const progress = Math.min(1, (now - start) / duration);
    // Linear de propósito: o tempo percebido acompanha o tempo real.
    for (const { el, value } of targets) {
      el.textContent = moneyFormatter.format(value * progress);
    }

    if (progress < 1) {
      requestAnimationFrame(frame);
      return;
    }

    for (const { el, value } of targets) {
      el.textContent = moneyFormatter.format(value);
      el.classList.remove('ff-v11-counting');
    }
  };

  requestAnimationFrame(frame);
}

export function revealDashboard({ moneyTargets = [], onCovered, onComplete } = {}) {
  const app = byId('app-view');
  const wipe = ensureDashboardWipe();

  // A animação antiga não é reaproveitada: cada execução começa de estado limpo.
  wipe.classList.remove('is-running');
  app?.classList.remove('ff-v11-dashboard-in');
  document.documentElement.classList.remove('ff-v11-dashboard-transition');
  resetDashboardMoney(moneyTargets);

  // t = 0 ms
  document.documentElement.classList.add('ff-v11-dashboard-transition');
  void wipe.offsetWidth;
  wipe.classList.add('is-running');

  // t = 250 ms: a camada já cobre o login.
  window.setTimeout(() => onCovered?.(), DASHBOARD_COVER_MS);

  // t = 450 ms: Dashboard aparece e o count-up começa.
  // 450 + 1.200 = 1.650 ms totais.
  window.setTimeout(() => {
    app?.classList.add('ff-v11-dashboard-in');
    animateDashboardMoney(moneyTargets, DASHBOARD_COUNT_MS);
  }, DASHBOARD_REVEAL_MS);

  // t = 650 ms: wipe já saiu; nenhuma camada permanece sobre o Dashboard.
  window.setTimeout(() => {
    wipe.classList.remove('is-running');
    document.documentElement.classList.remove('ff-v11-dashboard-transition');
  }, DASHBOARD_WIPE_END_MS);

  window.setTimeout(() => app?.classList.remove('ff-v11-dashboard-in'), 900);

  // t = 1.650 ms: fim formal da animação do Dashboard.
  window.setTimeout(() => onComplete?.(), DASHBOARD_TOTAL_MS);
}

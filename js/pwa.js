let deferredInstallPrompt = null;
let registrationRef = null;

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches === true || window.navigator.standalone === true;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
}

function updateInstallUI(message = '') {
  const button = document.getElementById('install-app-btn');
  const status = document.getElementById('pwa-install-status');
  const network = document.getElementById('pwa-network-status');
  if (network) {
    network.textContent = navigator.onLine ? 'Online' : 'Offline';
    network.classList.toggle('ok', navigator.onLine);
  }
  if (!button || !status) return;
  if (isStandalone()) {
    button.disabled = true;
    button.textContent = 'Aplicativo instalado';
    status.textContent = message || 'Esta instalação já está executando como aplicativo.';
    return;
  }
  if (deferredInstallPrompt) {
    button.disabled = false;
    button.textContent = 'Instalar aplicativo';
    status.textContent = message || 'Instalação disponível neste dispositivo.';
    return;
  }
  button.disabled = true;
  button.textContent = 'Instalar aplicativo';
  status.textContent = message || (isIOS()
    ? 'No iPhone/iPad: Safari → Compartilhar → Adicionar à Tela de Início.'
    : 'Quando o navegador liberar a instalação, o botão ficará disponível.');
}

export async function initPWA() {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallUI();
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    updateInstallUI('Instalação concluída.');
  });
  window.addEventListener('online', () => updateInstallUI());
  window.addEventListener('offline', () => updateInstallUI('Sem conexão. A interface pode abrir do cache; sincronizações exigem internet.'));

  const button = document.getElementById('install-app-btn');
  button?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return updateInstallUI();
    const prompt = deferredInstallPrompt;
    deferredInstallPrompt = null;
    await prompt.prompt();
    const choice = await prompt.userChoice.catch(() => null);
    updateInstallUI(choice?.outcome === 'accepted' ? 'Instalação iniciada.' : 'Instalação não concluída.');
  });

  if ('serviceWorker' in navigator) {
    try {
      registrationRef = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
      registrationRef.update().catch(() => {});
    } catch (error) {
      console.error('Falha ao registrar Service Worker:', error);
      updateInstallUI('O navegador não conseguiu ativar o modo aplicativo. Atualize a página e tente novamente.');
      return;
    }
  }
  updateInstallUI();
}

export async function checkForAppUpdate() {
  if (!registrationRef) return false;
  try {
    await registrationRef.update();
    return true;
  } catch (_) {
    return false;
  }
}

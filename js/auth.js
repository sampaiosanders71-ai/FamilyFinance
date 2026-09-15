import { supabase } from './supabase.js';
import { setCurrentUserCache, clearCurrentUserCache } from './database.js';

const DIRECT_LOGIN_PREFIX = 'ff-direct-login:';

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function validateUsername(username) {
  return /^[a-z0-9._-]{3,24}$/.test(username);
}

function usernameError(code) {
  const map = {
    INVALID_USERNAME: 'Use de 3 a 24 caracteres: letras minúsculas, números, ponto, hífen ou underline.',
    USERNAME_TAKEN: 'Esse usuário já está em uso.',
    INVALID_CREDENTIALS: 'Usuário ou senha inválidos.',
    WEAK_PASSWORD: 'A senha precisa ter pelo menos 6 caracteres.',
    RATE_LIMIT: 'Muitas tentativas de cadastro. Tente novamente mais tarde.',
    SIGNUP_FAILED: 'Não foi possível criar a conta agora.',
    SERVER_ERROR: 'O serviço de autenticação está indisponível no momento.'
  };
  return new Error(map[code] || 'Não foi possível autenticar.');
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function deterministicIdentifier(username) {
  const hash = await sha256(`family-finance:${username}`);
  return `ff-${hash.slice(0, 40)}@example.invalid`;
}

function directKey(username) {
  return `${DIRECT_LOGIN_PREFIX}${username}`;
}

function markDirectLogin(username, enabled) {
  try {
    if (enabled) localStorage.setItem(directKey(username), '1');
    else localStorage.removeItem(directKey(username));
  } catch {}
}

function hasDirectLogin(username) {
  try {
    return localStorage.getItem(directKey(username)) === '1';
  } catch {
    return false;
  }
}

async function signInWithIdentifier(identifier, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: identifier,
    password
  });
  if (error || !data?.session) return null;
  setCurrentUserCache(data.session.user || null);
  return { data, error: null };
}

async function resolveIdentifier(username) {
  const { data, error } = await supabase.rpc('ff2_resolve_login_identifier', {
    p_username: username
  });
  if (error || !data) throw usernameError('INVALID_CREDENTIALS');
  return String(data);
}

function finalizeIdentifierInBackground(username) {
  window.setTimeout(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ff-username-finalize', { body: {} });
      if (!error && data?.ok && data?.direct) markDirectLogin(username, true);
    } catch {
      // Não bloqueia o acesso. Na próxima tentativa o resolvedor rápido continua funcionando.
    }
  }, 0);
}

export async function signIn(usernameInput, passwordInput) {
  const username = normalizeUsername(usernameInput);
  const password = String(passwordInput || '');
  if (!validateUsername(username) || !password) throw usernameError('INVALID_CREDENTIALS');

  // Contas já padronizadas neste dispositivo entram em uma única chamada ao Auth.
  if (hasDirectLogin(username)) {
    const identifier = await deterministicIdentifier(username);
    const direct = await signInWithIdentifier(identifier, password);
    if (direct) return direct;
    markDirectLogin(username, false);
  }

  // Para contas antigas, resolve o identificador técnico no Postgres (sem Edge Function)
  // e autentica diretamente no Supabase Auth.
  const identifier = await resolveIdentifier(username);
  const signed = await signInWithIdentifier(identifier, password);
  if (!signed) throw usernameError('INVALID_CREDENTIALS');

  finalizeIdentifierInBackground(username);
  return signed;
}

export async function signUp(usernameInput, passwordInput) {
  const username = normalizeUsername(usernameInput);
  const password = String(passwordInput || '');
  if (!validateUsername(username)) throw usernameError('INVALID_USERNAME');
  if (password.length < 6 || password.length > 128) throw usernameError('WEAK_PASSWORD');

  // Cadastro precisa de privilégios administrativos para criar o usuário confirmado.
  // A função é dedicada somente a essa operação e já devolve a sessão quando possível.
  const { data, error } = await supabase.functions.invoke('ff-username-auth', {
    body: { username, password }
  });

  if (error && !data) throw usernameError('SERVER_ERROR');
  if (!data?.ok) throw usernameError(data?.code);

  if (data?.access_token && data?.refresh_token) {
    const sessionResult = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token
    });
    if (sessionResult.error || !sessionResult.data?.session) throw usernameError('SIGNUP_FAILED');
    setCurrentUserCache(sessionResult.data.session.user || null);
    markDirectLogin(username, true);
    return { data: sessionResult.data, error: null };
  }

  if (data?.requires_login) {
    const identifier = await deterministicIdentifier(username);
    const signed = await signInWithIdentifier(identifier, password);
    if (!signed) throw usernameError('SIGNUP_FAILED');
    markDirectLogin(username, true);
    return signed;
  }

  throw usernameError('SIGNUP_FAILED');
}

export async function signOut() {
  const result = await supabase.auth.signOut();
  if (!result.error) clearCurrentUserCache();
  return result;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  setCurrentUserCache(data.session?.user || null);
  return data.session;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    setCurrentUserCache(session?.user || null);
    callback(session);
  });
}

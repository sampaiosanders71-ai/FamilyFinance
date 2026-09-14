import { supabase } from './supabase.js';

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function usernameError(code) {
  const map = {
    INVALID_USERNAME: 'Use de 3 a 24 caracteres: letras minúsculas, números, ponto, hífen ou underline.',
    USERNAME_TAKEN: 'Esse usuário já está em uso.',
    INVALID_CREDENTIALS: 'Usuário ou senha inválidos.',
    WEAK_PASSWORD: 'A senha precisa ter pelo menos 6 caracteres.',
    RATE_LIMIT: 'Muitas tentativas de cadastro. Tente novamente mais tarde.',
    SIGNUP_FAILED: 'Não foi possível criar a conta agora.'
  };
  return new Error(map[code] || 'Não foi possível autenticar.');
}

async function invokeAuthFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error && !data) throw new Error('Não foi possível acessar o serviço de autenticação.');
  if (!data?.ok) throw usernameError(data?.code);
  return data;
}

async function finalizeUsernameIdentity(userId) {
  if (!userId) return;
  const key = `ff_username_identity_finalized_${userId}`;
  if (localStorage.getItem(key) === '1') return;
  try {
    const { data, error } = await supabase.functions.invoke('ff-username-finalize');
    if (!error && data?.ok) localStorage.setItem(key, '1');
  } catch (_) {
    // A sessão continua válida mesmo que esta limpeza técnica seja adiada.
  }
}

async function establishUsernameSession(username, password) {
  const data = await invokeAuthFunction('ff-username-login', {
    username: normalizeUsername(username),
    password: String(password || '')
  });
  if (!data?.access_token || !data?.refresh_token) throw new Error('Sessão de autenticação inválida.');

  const sessionResult = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token
  });
  if (sessionResult.error) throw sessionResult.error;
  await finalizeUsernameIdentity(sessionResult.data?.session?.user?.id);
  return { data: sessionResult.data, error: null };
}

export async function signIn(username, password) {
  return establishUsernameSession(username, password);
}

export async function signUp(username, password) {
  const normalized = normalizeUsername(username);
  await invokeAuthFunction('ff-username-signup', {
    username: normalized,
    password: String(password || '')
  });
  return establishUsernameSession(normalized, password);
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session?.user?.id) await finalizeUsernameIdentity(data.session.user.id);
  return data.session;
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => callback(session));
}

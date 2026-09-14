import { supabase } from './supabase.js';

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('AUTH_REQUIRED');
  return data.user;
}

export async function ensureProfile(user) {
  if (!user) throw new Error('Usuário ausente.');
  const fields = 'user_id,username,display_name,theme,currency,onboarding_completed';
  const existing = await supabase.from('ff2_profiles').select(fields).eq('user_id', user.id).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const username = String(user.user_metadata?.username || `user-${String(user.id).slice(0, 8)}`).toLowerCase();
  const displayName = user.user_metadata?.display_name || username;
  const created = await supabase.from('ff2_profiles')
    .insert({ user_id: user.id, username, display_name: displayName })
    .select(fields)
    .single();
  if (created.error) throw created.error;
  return created.data;
}

export async function foundationHealthCheck(userId) {
  const checks = await Promise.all([
    supabase.from('ff2_profiles').select('user_id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('ff2_transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('ff2_cards').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  ]);
  const error = checks.find(item => item.error)?.error;
  if (error) throw error;
  return true;
}

export function newRequestId() {
  return crypto.randomUUID();
}

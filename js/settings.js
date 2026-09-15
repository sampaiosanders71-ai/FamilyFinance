import { supabase } from './supabase.js';
import { getCurrentUser } from './database.js';

export async function updateProfileSettings({ displayName, theme }) {
  const user = await getCurrentUser();
  const payload = { updated_at: new Date().toISOString() };
  if (displayName !== undefined) payload.display_name = String(displayName || '').trim().slice(0, 120);
  if (theme !== undefined) payload.theme = ['dark','light','system'].includes(theme) ? theme : 'system';
  const { data, error } = await supabase.from('ff2_profiles').update(payload).eq('user_id', user.id).select('*').single();
  if (error) throw error;
  return data;
}

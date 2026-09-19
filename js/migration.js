import { supabase } from './supabase.js';

export async function getLegacyMigrationStatus() {
  const { data, error } = await supabase.rpc('ff2_legacy_migration_status');
  if (error) throw error;
  return data || { claimed: false };
}

export async function claimLegacyAccount(username, password) {
  const { data, error } = await supabase.rpc('ff2_claim_legacy_account', {
    p_username: String(username || '').trim(),
    p_password: String(password || '')
  });
  if (error) {
    const raw = `${error.message || ''} ${error.details || ''}`;
    if (raw.includes('INVALID_LEGACY_CREDENTIALS')) throw new Error('Usuário ou senha do Family Finance antigo não conferem.');
    if (raw.includes('LEGACY_ALREADY_CLAIMED')) throw new Error('Essa conta antiga já foi vinculada a outra conta nova.');
    if (raw.includes('AUTH_ALREADY_LINKED')) throw new Error('Esta conta nova já recebeu uma migração anterior.');
    throw error;
  }
  return data;
}

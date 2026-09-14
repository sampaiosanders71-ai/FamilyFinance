import { supabase } from './supabase.js';
import { getCurrentUser } from './database.js';
import { monthISO } from './finance.js';

export async function listFamilyData() {
  const user = await getCurrentUser();
  const [{ data: invites, error: inviteError }, { data: links, error: linkError }] = await Promise.all([
    supabase.from('ff2_family_invites').select('*').order('created_at', { ascending: false }),
    supabase.from('ff2_family_links').select('*').order('created_at', { ascending: false })
  ]);
  if (inviteError) throw inviteError;
  if (linkError) throw linkError;

  const ids = new Set([user.id]);
  (links || []).forEach(link => { ids.add(link.owner_user_id); ids.add(link.viewer_user_id); });
  (invites || []).forEach(inv => { ids.add(inv.inviter_user_id); ids.add(inv.invitee_user_id); });

  const { data: profiles, error: profileError } = await supabase
    .from('ff2_profiles')
    .select('user_id,username,display_name')
    .in('user_id', [...ids]);
  if (profileError) throw profileError;
  return { user, invites: invites || [], links: links || [], profiles: profiles || [] };
}

export async function sendFamilyInvite(username) {
  const normalized = String(username || '').trim().toLowerCase();
  const { data, error } = await supabase.rpc('ff2_send_family_invite', { p_username: normalized });
  if (error) {
    const raw = `${error.message || ''} ${error.details || ''}`;
    if (raw.includes('INVALID_USERNAME')) throw new Error('Informe um nome de usuário válido.');
    if (raw.includes('USERNAME_NOT_FOUND')) throw new Error('Usuário não encontrado.');
    if (raw.includes('CANNOT_INVITE_SELF')) throw new Error('Escolha outro usuário.');
    if (raw.includes('ALREADY_LINKED')) throw new Error('Esse usuário já acompanha seus dados.');
    if (raw.includes('INVITE_ALREADY_PENDING')) throw new Error('Já existe um convite pendente para esse usuário.');
    throw error;
  }
  return data;
}

export async function respondFamilyInvite(inviteId, accept) {
  const { data, error } = await supabase.rpc('ff2_respond_family_invite', { p_invite_id: inviteId, p_accept: !!accept });
  if (error) throw error;
  return data;
}

export async function cancelFamilyInvite(inviteId) {
  const user = await getCurrentUser();
  const { error } = await supabase.from('ff2_family_invites').delete().eq('id', inviteId).eq('inviter_user_id', user.id).eq('status', 'pending');
  if (error) throw error;
}

export async function updateFamilyPermissions(linkId, permissions) {
  const user = await getCurrentUser();
  const { data, error } = await supabase.from('ff2_family_links').update({
    can_view_transactions: !!permissions.transactions,
    can_view_cards: !!permissions.cards,
    can_view_goals: !!permissions.goals,
    can_view_budget: !!permissions.budget,
    updated_at: new Date().toISOString()
  }).eq('id', linkId).eq('owner_user_id', user.id).select('*').single();
  if (error) throw error;
  return data;
}

export async function removeFamilyLink(linkId) {
  const { error } = await supabase.from('ff2_family_links').delete().eq('id', linkId);
  if (error) throw error;
}

export async function loadFamilyOverview(ownerId, refDate = new Date()) {
  const month = monthISO(refDate);
  const [txRes, cardRes, installmentRes, goalRes, planRes] = await Promise.all([
    supabase.from('ff2_transactions').select('*').eq('user_id', ownerId).order('occurred_on', { ascending: false }).limit(250),
    supabase.from('ff2_cards').select('*').eq('user_id', ownerId).eq('active', true),
    supabase.from('ff2_card_installments').select('*, ff2_card_purchases(description,category)').eq('user_id', ownerId).eq('invoice_month', month),
    supabase.from('ff2_goals').select('*').eq('user_id', ownerId).order('created_at'),
    supabase.from('ff2_budget_plans').select('*').eq('user_id', ownerId).eq('month', month).maybeSingle()
  ]);
  const firstError = [txRes, cardRes, installmentRes, goalRes, planRes].find(r => r.error)?.error;
  if (firstError) throw firstError;
  let budgetItems = [];
  if (planRes.data) {
    const itemRes = await supabase.from('ff2_budget_items').select('*').eq('user_id', ownerId).eq('plan_id', planRes.data.id).order('category');
    if (itemRes.error) throw itemRes.error;
    budgetItems = itemRes.data || [];
  }
  return {
    transactions: txRes.data || [],
    cards: cardRes.data || [],
    installments: installmentRes.data || [],
    goals: goalRes.data || [],
    budget: { plan: planRes.data || null, items: budgetItems }
  };
}

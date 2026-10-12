import {adjustmentsAsInstallments} from './card-domain.js?v=2.9.20';
import { listAllRows } from './pagination.js?v=2.9.20';
import { supabase } from './supabase.js?v=2.9.20';
import { getCurrentUser } from './database.js?v=2.9.20';
import { monthISO } from './finance.js?v=2.9.20';

export async function listFamilyData() {
  const user = await getCurrentUser();
  const [invites,links] = await Promise.all([
    listAllRows(options=>supabase.from('ff2_family_invites').select('*',options).order('created_at',{ascending:false}).order('id'),'Convites'),
    listAllRows(options=>supabase.from('ff2_family_links').select('*',options).order('created_at',{ascending:false}).order('id'),'Vínculos')
  ]);

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

function nextMonthISO(refDate) {
  return monthISO(new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1, 12));
}

export async function loadFamilyOverview(ownerId, refDate = new Date()) {
  const month = monthISO(refDate);
  const nextMonth = nextMonthISO(refDate);
  const [transactions,cards,installments,goals,planRes,cardAdjustments] = await Promise.all([
    listAllRows(options=>supabase.from('ff2_transactions').select('*',options).eq('user_id',ownerId).gte('occurred_on',month).lt('occurred_on',nextMonth).order('created_at',{ascending:false}).order('id',{ascending:false}),'Lançamentos familiares'),
    listAllRows(options=>supabase.from('ff2_cards').select('*',options).eq('user_id',ownerId).eq('active',true).order('id'),'Cartões familiares'),
    listAllRows(options=>supabase.from('ff2_card_installments').select('*, ff2_card_purchases(description,category,installment_count,purchase_date,record_kind,cancelled_at)',options).eq('user_id',ownerId).eq('invoice_month',month).order('id'),'Parcelas familiares'),
    listAllRows(options=>supabase.from('ff2_goals').select('*',options).eq('user_id',ownerId).order('created_at').order('id'),'Metas familiares'),
    supabase.from('ff2_budget_plans').select('*').eq('user_id',ownerId).eq('month',month).maybeSingle(),
    listAllRows(options=>supabase.from('ff2_card_adjustments').select('*, ff2_cards(name)',options).eq('user_id',ownerId).eq('invoice_month',month).order('id'),'Ajustes familiares')
  ]);
  if(planRes.error)throw planRes.error;
  let budgetItems=[];
  if(planRes.data)budgetItems=await listAllRows(options=>supabase.from('ff2_budget_items').select('*',options).eq('user_id',ownerId).eq('plan_id',planRes.data.id).order('category').order('id'),'Limites familiares');
  // O progresso das metas é calculado no servidor, respeitando a permissão específica
  // de Metas, mesmo quando o titular não compartilha seu histórico de lançamentos.
  let goalStatus = [];
  if (goals.length) {
    const { data: statusData, error: statusError } = await supabase.rpc('ff2_family_goal_progress_297', {p_owner_id:ownerId});
    if (statusError) throw statusError;
    goalStatus = statusData || [];
  }
  return {
    month,
    goalStatus,
    transactions,
    cards,
    installments:[...installments,...adjustmentsAsInstallments(cardAdjustments,cards)],
    goals,
    budget: { plan: planRes.data || null, items: budgetItems }
  };
}

export async function subscribeFamilyOverview(ownerId, onChange) {
  const viewer = await getCurrentUser();
  const safeOwner = String(ownerId || '').trim();
  if (!safeOwner) throw new Error('Titular inválido para monitoramento familiar.');
  return supabase.channel(`ff2-family-monitor-${viewer.id}-${safeOwner}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'ff2_transactions',
      filter: `user_id=eq.${safeOwner}`
    }, payload => {
      try { onChange?.({ source: 'transactions', payload }); }
      catch (error) { console.warn('Atualização familiar em tempo real:', error); }
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'ff2_card_installments',
      filter: `user_id=eq.${safeOwner}`
    }, payload => {
      try { onChange?.({ source: 'cards', payload }); }
      catch (error) { console.warn('Atualização familiar em tempo real:', error); }
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'ff2_card_purchases',
      filter: `user_id=eq.${safeOwner}`
    }, payload => {
      try { onChange?.({ source: 'card_purchases', payload }); }
      catch (error) { console.warn('Atualização familiar em tempo real:', error); }
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'ff2_family_links',
      filter: `viewer_user_id=eq.${viewer.id}`
    }, payload => {
      try { onChange?.({ source: 'family_links', payload }); }
      catch (error) { console.warn('Atualização de permissão familiar:', error); }
    })
    .subscribe();
}

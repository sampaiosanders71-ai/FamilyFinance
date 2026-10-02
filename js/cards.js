import { supabase } from './supabase.js';
import { getCurrentUser, newRequestId } from './database.js';
import { monthISO } from './finance.js';

export async function listCards() {
  const user = await getCurrentUser();
  const { data, error } = await supabase.from('ff2_cards').select('*').eq('user_id', user.id).eq('active', true).order('created_at');
  if (error) throw error;
  return data || [];
}

export async function createCard(input) {
  const user = await getCurrentUser();
  const { data, error } = await supabase.from('ff2_cards').insert({
    user_id: user.id, name: input.name.trim(), credit_limit: Number(input.limit), closing_day: Number(input.closingDay),
    due_day: Number(input.dueDay), revolving_interest: Number(input.interest || 0), active: true
  }).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateCard(id, input) {
  const user = await getCurrentUser();
  const { data, error } = await supabase.from('ff2_cards').update({
    name: input.name.trim(), credit_limit: Number(input.limit), closing_day: Number(input.closingDay),
    due_day: Number(input.dueDay), revolving_interest: Number(input.interest || 0), updated_at: new Date().toISOString()
  }).eq('id', id).eq('user_id', user.id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteCard(id) {
  const user = await getCurrentUser();
  const { error } = await supabase.from('ff2_cards').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

export async function createPurchase(input) {
  const { data, error } = await supabase.rpc('ff2_create_card_purchase', {
    p_card_id: input.cardId,
    p_description: input.description,
    p_total_amount: Number(input.total),
    p_purchase_date: input.date,
    p_category: input.category || 'Outros',
    p_installment_count: Number(input.installments),
    p_client_request_id: newRequestId()
  });
  if (error) throw error;
  return data;
}

export async function updatePurchase(id, input) {
  const { data, error } = await supabase.rpc('ff2_update_card_purchase', {
    p_purchase_id: id,
    p_description: input.description,
    p_total_amount: Number(input.total),
    p_purchase_date: input.date,
    p_category: input.category || 'Outros',
    p_installment_count: Number(input.installments)
  });
  if (error) throw error;
  return data;
}

export async function deletePurchase(id) {
  const user = await getCurrentUser();
  const { error } = await supabase.from('ff2_card_purchases').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

export async function listPurchases() {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('ff2_card_purchases')
    .select('*, ff2_cards(name)')
    .eq('user_id', user.id)
    .order('purchase_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listInstallments() {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('ff2_card_installments')
    .select('*, ff2_card_purchases(description,category,total_amount,installment_count,purchase_date), ff2_cards(name,due_day,closing_day)')
    .eq('user_id', user.id)
    .order('invoice_month')
    .order('installment_no');
  if (error) throw error;
  return data || [];
}

export async function listInvoiceStatuses() {
  const user = await getCurrentUser();
  const { data, error } = await supabase.from('ff2_card_invoices').select('*').eq('user_id', user.id);
  if (error) throw error;
  return data || [];
}

export async function setInvoicePaid(cardId, invoiceMonth, paid) {
  const { data, error } = await supabase.rpc('ff2_set_invoice_paid', {
    p_card_id: cardId,
    p_invoice_month: invoiceMonth,
    p_paid: !!paid
  });
  if (error) throw error;
  return data;
}

export function sumCardExpensesForMonth(installments, refDate) {
  const key = monthISO(refDate);
  return installments.filter(i => i.invoice_month === key).reduce((sum, i) => sum + Number(i.amount || 0), 0);
}

export function cardInvoiceSummaries(cards, installments, statuses, refDate = new Date()) {
  const key = monthISO(refDate);
  return cards.map(card => {
    const rows = installments.filter(i => i.card_id === card.id && i.invoice_month === key);
    const total = rows.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const status = statuses.find(s => s.card_id === card.id && s.invoice_month === key)?.status || 'open';
    const month = new Date(refDate.getFullYear(), refDate.getMonth(), 1, 12);
    let dueMonth = new Date(month.getFullYear(), month.getMonth(), 1, 12);
    if (Number(card.due_day) <= Number(card.closing_day)) dueMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1, 12);
    const dueDay = Math.min(Number(card.due_day), new Date(dueMonth.getFullYear(), dueMonth.getMonth() + 1, 0).getDate());
    const dueDate = new Date(dueMonth.getFullYear(), dueMonth.getMonth(), dueDay, 12);
    return { card, rows, total, status, invoiceMonth:key, dueDate };
  });
}

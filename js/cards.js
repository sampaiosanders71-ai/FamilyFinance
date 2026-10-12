import { buildCardInvoices, cardMonth,cardCalendarDates,cardDate } from './card-domain.js?v=2.9.20';
import { operationIds, insertOnce } from './request-operation.js?v=2.9.20';
import { listAllRows } from './pagination.js?v=2.9.20';
import { supabase } from './supabase.js?v=2.9.20';
import { getCurrentUser } from './database.js?v=2.9.20';
import { monthISO } from './finance.js?v=2.9.20';

export async function listCards() {
  const user = await getCurrentUser();
  const rows = await listAllRows(options => supabase.from('ff2_cards').select('*',options).eq('user_id',user.id).eq('active',true).order('created_at').order('id'), 'listCards');
  return rows;
}

export async function createCard(input) {
  const user = await getCurrentUser();
  const row = {
    id: operationIds(input)[0],
    user_id: user.id, name: input.name.trim(), credit_limit: Number(input.limit), closing_day: Number(input.closingDay),
    due_day: Number(input.dueDay), revolving_interest: Number(input.interest || 0), active: true
  };
  return (await insertOnce(supabase, 'ff2_cards', row, user.id, 'id'))[0];
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
  const {data,error}=await supabase.rpc('ff2_archive_card_2914',{p_card_id:id});
  if(error)throw error;return data;
}

export async function createPurchase(input) {
  const { data, error } = await supabase.rpc('ff2_create_card_purchase', {
    p_card_id: input.cardId,
    p_description: input.description,
    p_total_amount: Number(input.total),
    p_purchase_date: input.date,
    p_category: input.category || 'Outros',
    p_installment_count: Number(input.installments),
    p_client_request_id: operationIds(input)[0]
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
  const {data,error}=await supabase.rpc('ff2_cancel_card_purchase_2914',{p_purchase_id:id,p_reason:'Compra excluída pelo usuário'});
  if(error)throw error;return data;
}

export async function listPurchases() {
  const user = await getCurrentUser();
  const rows = await listAllRows(options => supabase.from('ff2_card_purchases').select('*, ff2_cards(name)',options).eq('user_id',user.id).is('cancelled_at',null).order('created_at',{ascending:false}).order('id',{ascending:false}), 'listPurchases');
  return rows.sort((a,b)=>String(b.purchase_date||'').localeCompare(String(a.purchase_date||''))||String(b.created_at||'').localeCompare(String(a.created_at||''))); 
}

export async function listInstallments() {
  const user = await getCurrentUser();
  const rows = await listAllRows(options => supabase.from('ff2_card_installments').select('*, ff2_card_purchases(description,category,total_amount,installment_count,purchase_date,record_kind,cancelled_at), ff2_cards(name,due_day,closing_day)',options).eq('user_id',user.id).order('invoice_month').order('installment_no').order('id'), 'listInstallments');
  return rows;
}

export async function listInvoiceStatuses() {
  await syncCardInvoices();
  const user = await getCurrentUser();
  const rows = await listAllRows(options => supabase.from('ff2_card_invoices').select('*',options).eq('user_id',user.id).order('id'), 'listInvoiceStatuses');
  return rows;
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

export function cardInvoiceSummaries(cards,installments,statuses,refDate=new Date()) {
  const key=cardMonth(`${refDate.getFullYear()}-${String(refDate.getMonth()+1).padStart(2,'0')}-01`);
  return cards.map(card=>buildCardInvoices(card,installments,statuses).find(invoice=>invoice.invoiceMonth===key)||{
    card,rows:[],total:0,status:'open',invoiceMonth:key,balanceDue:0,paidAmount:0,
    dueDate:cardDate(cardCalendarDates(card,key).dueOn)
  });
}
export async function syncCardInvoices(){
  const {data,error}=await supabase.rpc('ff2_sync_card_invoices_2914');if(error)throw error;return data;
}
export async function listCardPayments(){
  const user=await getCurrentUser();
  return listAllRows(options=>supabase.from('ff2_card_payments').select('*',options).eq('user_id',user.id).order('paid_on',{ascending:false}).order('id'),'Pagamentos de cartão');
}
export async function payCardInvoice(input){
 const {data,error}=await supabase.rpc('ff2_pay_card_invoice_2914',{
  p_card_id:input.cardId,p_invoice_month:input.month,p_paid_on:input.date,
  p_amount:input.amount,p_client_request_id:operationIds(input)[0],p_allow_negative:!!input.allowNegative
 });if(error)throw error;return data;
}
export async function reverseCardPayment(id,reason){
 const {data,error}=await supabase.rpc('ff2_reverse_card_payment_2914',{p_payment_id:id,p_reason:reason});if(error)throw error;return data;
}

export async function listCardAdjustments(){const user=await getCurrentUser();return listAllRows(options=>supabase.from('ff2_card_adjustments').select('*, ff2_cards(name)',options).eq('user_id',user.id).order('created_at').order('id'),'Ajustes de cartão');}
export async function listCardReconciliations(){const user=await getCurrentUser();return listAllRows(options=>supabase.from('ff2_card_legacy_reconciliations').select('*',options).eq('user_id',user.id).order('created_at').order('id'),'Conciliações de cartão');}
export async function recordCardAdjustment(input){const {data,error}=await supabase.rpc('ff2_record_card_adjustment_2916',{p_card_id:input.cardId,p_month:input.month,p_kind:input.kind,p_amount:Number(input.amount),p_date:input.date,p_reason:input.reason,p_purchase_id:input.purchaseId||null,p_destination:input.destination||'invoice',p_limit_released:Number(input.limitReleased)||0,p_category:input.category||'Outros',p_client_request_id:operationIds(input)[0],p_confirmed:!!input.confirmed,p_reversal_of:input.reversalOf||null,p_allow_negative:!!input.allowNegative});if(error)throw error;return data;}
export async function reconcileCardLegacy(input){const {data,error}=await supabase.rpc('ff2_reconcile_card_legacy_2916',{p_invoice_id:input.invoiceId,p_installment_id:input.installmentId,p_covered_amount:Number(input.amount),p_reason:input.reason,p_client_request_id:operationIds(input)[0],p_confirmed:!!input.confirmed});if(error)throw error;return data;}

export async function editCardInvoice(input){
 const {data,error}=await supabase.rpc('ff2_edit_card_invoice_2919',{
  p_invoice_id:input.invoiceId,p_purchase_id:input.purchaseId,p_expected_total:input.expectedTotal,
  p_expected_date:input.expectedDate,p_expected_month:input.expectedMonth,p_total:input.total,
  p_date:input.date,p_month:input.month,p_reason:input.reason,p_client_request_id:operationIds(input)[0],
  p_confirmed:!!input.confirmed,p_limit_released:input.limitReleased||0
 });if(error)throw error;return data;
}

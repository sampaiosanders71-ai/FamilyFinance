import { supabase } from './supabase.js';
import { getCurrentUser } from './database.js';
import { monthISO } from './finance.js';

export const BUDGET_CATEGORIES = ['Alimentação','Transporte','Moradia','Saúde','Lazer','Educação','Assinaturas','Dívidas','Investimento','Outros'];

export async function getBudget(refDate) {
  const user = await getCurrentUser();
  const month = monthISO(refDate);
  const { data: plan, error: planError } = await supabase.from('ff2_budget_plans').select('*').eq('user_id', user.id).eq('month', month).maybeSingle();
  if (planError) throw planError;
  if (!plan) return { plan:null, items:[] };
  const { data: items, error } = await supabase.from('ff2_budget_items').select('*').eq('user_id', user.id).eq('plan_id', plan.id).order('category');
  if (error) throw error;
  return { plan, items:items || [] };
}

export async function saveBudget(refDate, plannedIncome, limits) {
  const user = await getCurrentUser();
  const month = monthISO(refDate);
  const { data: plan, error: planError } = await supabase.from('ff2_budget_plans').upsert({
    user_id:user.id, month, planned_income:Number(plannedIncome || 0), updated_at:new Date().toISOString()
  }, { onConflict:'user_id,month' }).select('*').single();
  if (planError) throw planError;
  const rows = Object.entries(limits).map(([category, value]) => ({ user_id:user.id, plan_id:plan.id, category, limit_amount:Number(value || 0), updated_at:new Date().toISOString() }));
  const { error: itemError } = await supabase.from('ff2_budget_items').upsert(rows, { onConflict:'plan_id,category' });
  if (itemError) throw itemError;
  return getBudget(refDate);
}

export function budgetSummary(budget, transactions, installments, refDate) {
  const monthPrefix = monthISO(refDate).slice(0,7);
  const itemMap = Object.fromEntries((budget.items || []).map(i => [i.category, Number(i.limit_amount || 0)]));
  const spentMap = {};
  transactions.filter(t => t.affects_month_result && Number(t.direction) < 0 && String(t.occurred_on).startsWith(monthPrefix)).forEach(t => {
    const cat = t.category || 'Outros'; spentMap[cat] = (spentMap[cat] || 0) + Number(t.amount || 0);
  });
  installments.filter(i => String(i.invoice_month).startsWith(monthPrefix)).forEach(i => {
    const cat = i.ff2_card_purchases?.category || 'Outros'; spentMap[cat] = (spentMap[cat] || 0) + Number(i.amount || 0);
  });
  const totalLimit = Object.values(itemMap).reduce((a,b)=>a+b,0);
  const totalSpent = Object.values(spentMap).reduce((a,b)=>a+b,0);
  return { itemMap, spentMap, totalLimit, totalSpent, available: totalLimit - totalSpent, plannedIncome:Number(budget.plan?.planned_income || 0) };
}

import { supabase } from './supabase.js';
import { getCurrentUser } from './database.js';
import { monthISO } from './finance.js';

export const BUDGET_CATEGORIES = ['Alimentação','Transporte','Moradia','Saúde','Lazer','Educação','Assinaturas','Dívidas','Investimento','Outros'];

function cleanCategoryName(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

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


export async function listBudgetsByMonths(monthKeys = []) {
  const user = await getCurrentUser();
  const months = [...new Set((monthKeys || []).map(value => String(value || '').slice(0,10)).filter(value => /^\d{4}-\d{2}-01$/.test(value)))];
  if (!months.length) return {};
  const { data: plans, error: planError } = await supabase.from('ff2_budget_plans').select('*').eq('user_id', user.id).in('month', months);
  if (planError) throw planError;
  const rows = plans || [];
  if (!rows.length) return Object.fromEntries(months.map(month => [month, { plan:null, items:[] }]));
  const ids = rows.map(plan => plan.id);
  const { data: items, error: itemError } = await supabase.from('ff2_budget_items').select('*').eq('user_id', user.id).in('plan_id', ids).order('category');
  if (itemError) throw itemError;
  const grouped = {};
  for (const plan of rows) grouped[plan.month] = { plan, items:[] };
  for (const item of items || []) {
    const target = Object.values(grouped).find(entry => entry.plan?.id === item.plan_id);
    if (target) target.items.push(item);
  }
  for (const month of months) if (!grouped[month]) grouped[month] = { plan:null, items:[] };
  return grouped;
}

export async function saveBudget(refDate, plannedIncome, limits) {
  const user = await getCurrentUser();
  const month = monthISO(refDate);
  const normalized = {};
  for (const [rawCategory, rawValue] of Object.entries(limits || {})) {
    const category = cleanCategoryName(rawCategory);
    const value = Number(rawValue || 0);
    if (!category || category.length > 60) throw new Error('Revise o nome das categorias do orçamento.');
    if (!Number.isFinite(value) || value < 0) throw new Error(`O limite de ${category} é inválido.`);
    const duplicate = Object.keys(normalized).find(name => name.toLocaleLowerCase('pt-BR') === category.toLocaleLowerCase('pt-BR'));
    if (duplicate && duplicate !== category) throw new Error(`A categoria “${category}” já existe.`);
    normalized[category] = value;
  }

  const { data: plan, error: planError } = await supabase.from('ff2_budget_plans').upsert({
    user_id:user.id, month, planned_income:Number(plannedIncome || 0), updated_at:new Date().toISOString()
  }, { onConflict:'user_id,month' }).select('*').single();
  if (planError) throw planError;

  const { data: existing, error: existingError } = await supabase.from('ff2_budget_items').select('id,category').eq('user_id', user.id).eq('plan_id', plan.id);
  if (existingError) throw existingError;

  const rows = Object.entries(normalized).map(([category, value]) => ({
    user_id:user.id,
    plan_id:plan.id,
    category,
    limit_amount:Number(value || 0),
    updated_at:new Date().toISOString()
  }));
  if (rows.length) {
    const { error: itemError } = await supabase.from('ff2_budget_items').upsert(rows, { onConflict:'plan_id,category' });
    if (itemError) throw itemError;
  }

  const keep = new Set(Object.keys(normalized));
  const obsoleteIds = (existing || []).filter(item => !keep.has(item.category)).map(item => item.id);
  if (obsoleteIds.length) {
    const { error: deleteError } = await supabase.from('ff2_budget_items').delete().eq('user_id', user.id).eq('plan_id', plan.id).in('id', obsoleteIds);
    if (deleteError) throw deleteError;
  }

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

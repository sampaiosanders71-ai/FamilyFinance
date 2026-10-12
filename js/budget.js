import { listAllRows } from './pagination.js?v=2.9.20';
import { canonicalCategoryAmounts, canonicalCategoryLimits } from './category-alias.js?v=2.9.20';
import { supabase } from './supabase.js?v=2.9.20';
import { getCurrentUser } from './database.js?v=2.9.20';
import { monthISO } from './finance.js?v=2.9.20';
import { buildFinancialMonthLedger } from './financial-ledger.js?v=2.9.20';

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
  const items = await listAllRows(options=>supabase.from('ff2_budget_items').select('*',options).eq('user_id',user.id).eq('plan_id',plan.id).order('category').order('id'),'Limites');
  return { plan, items };
}


export async function listBudgetsByMonths(monthKeys = []) {
  const user = await getCurrentUser();
  const months = [...new Set((monthKeys || []).map(value => String(value || '').slice(0,10)).filter(value => /^\d{4}-\d{2}-01$/.test(value)))];
  if (!months.length) return {};
  const plans = await listAllRows(options=>supabase.from('ff2_budget_plans').select('*',options).eq('user_id',user.id).in('month',months).order('id'),'Orçamentos');
  const rows = plans || [];
  if (!rows.length) return Object.fromEntries(months.map(month => [month, { plan:null, items:[] }]));
  const ids = rows.map(plan => plan.id);
  const items = await listAllRows(options=>supabase.from('ff2_budget_items').select('*',options).eq('user_id',user.id).in('plan_id',ids).order('category').order('id'),'Limites');
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

  const income=Number(plannedIncome || 0);
  if(!Number.isFinite(income)||income<0)throw new Error('A receita prevista é inválida.');
  const {data,error}=await supabase.rpc('ff2_save_budget_2912',{
    p_month:month, p_planned_income:income,
    p_items:Object.entries(normalized).map(([category,limit_amount])=>({category,limit_amount}))
  });
  if(error)throw error;
  return data;
}

export function budgetSummary(budget, transactions, installments, refDate, today = new Date(), categories = []) {
  const ledger = buildFinancialMonthLedger({
    transactions: transactions || [],
    installments: installments || [],
    monthKey: monthISO(refDate),
    today
  });
  const itemMap = canonicalCategoryLimits(budget.items||[],categories);
  const spentMap = canonicalCategoryAmounts(ledger.budgetUsageMap,categories);
  const totalLimit = Object.values(itemMap).reduce((sum, value) => sum + Number(value || 0), 0);
  const totalSpent = Object.values(spentMap).reduce((sum, value) => sum + Number(value || 0), 0);
  return {
    itemMap,
    spentMap,
    totalLimit,
    totalSpent,
    available: totalLimit - totalSpent,
    plannedIncome: Number(budget.plan?.planned_income || 0),
    realizedThrough: ledger.cutoff,
    futureExpense: ledger.futureExpense,
    futureAllocation: ledger.futureAllocation
  };
}

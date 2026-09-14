import { supabase } from './supabase.js';
import { getCurrentUser, newRequestId } from './database.js';

export const DEFAULT_CATEGORIES = [
  'Salário','Alimentação','Transporte','Moradia','Saúde','Lazer','Educação','Assinaturas','Dívidas','Investimento','Outros'
];

export function localISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function monthISO(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}-01`;
}

export function monthInputValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,'0')}`;
}

export function parseDateISO(value) {
  const [y,m,d] = String(value).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addMonthsClamped(value, offset) {
  const date = parseDateISO(value);
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + offset, 1, 12, 0, 0, 0);
  const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0, 12).getDate();
  target.setDate(Math.min(day, maxDay));
  return localISO(target);
}

const TRANSACTION_PAGE_SIZE = 500;
const TRANSACTION_SYNC_ATTEMPTS = 2;

function sortTransactionsNewestFirst(rows) {
  return [...rows].sort((a, b) => {
    const byDate = String(b.occurred_on || '').localeCompare(String(a.occurred_on || ''));
    if (byDate) return byDate;
    const byCreated = String(b.created_at || '').localeCompare(String(a.created_at || ''));
    if (byCreated) return byCreated;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });
}

async function countTransactions(userId) {
  const { count, error } = await supabase
    .from('ff2_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw error;
  return Number(count || 0);
}

async function fetchAllTransactionPages(userId) {
  const rows = [];
  for (let from = 0; ; from += TRANSACTION_PAGE_SIZE) {
    const to = from + TRANSACTION_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('ff2_transactions')
      .select('*')
      .eq('user_id', userId)
      // Paginar por campos que não mudam quando o lançamento é editado.
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < TRANSACTION_PAGE_SIZE) break;
  }
  return rows;
}

export async function listTransactions() {
  const user = await getCurrentUser();
  let lastExpected = 0;
  let lastLoaded = 0;

  for (let attempt = 1; attempt <= TRANSACTION_SYNC_ATTEMPTS; attempt += 1) {
    const countBefore = await countTransactions(user.id);
    const rows = await fetchAllTransactionPages(user.id);
    const countAfter = await countTransactions(user.id);
    const uniqueRows = [...new Map(rows.map(row => [row.id, row])).values()];

    lastExpected = countAfter;
    lastLoaded = uniqueRows.length;

    // Só aceitamos o histórico quando o banco ficou estável durante a leitura
    // e 100% dos IDs foram carregados. Caso contrário, a leitura inteira é refeita.
    if (countBefore === countAfter && uniqueRows.length === countAfter && rows.length === uniqueRows.length) {
      return sortTransactionsNewestFirst(uniqueRows);
    }

    if (attempt < TRANSACTION_SYNC_ATTEMPTS) {
      await new Promise(resolve => setTimeout(resolve, 180));
    }
  }

  throw new Error(`Histórico incompleto: o banco possui ${lastExpected} lançamento(s), mas ${lastLoaded} foram carregados. A lista não foi substituída para evitar ocultar registros. Tente sincronizar novamente.`);
}

export async function createTransaction(input) {
  const user = await getCurrentUser();
  const count = input.recurring ? Math.max(2, Math.min(60, Number(input.recurringCount) || 12)) : 1;
  const groupId = count > 1 ? crypto.randomUUID() : null;
  const rows = Array.from({ length: count }, (_, index) => ({
    user_id: user.id,
    type: input.direction > 0 ? 'income' : 'expense',
    direction: input.direction > 0 ? 1 : -1,
    description: String(input.description || '').trim(),
    amount: Number(input.amount),
    occurred_on: addMonthsClamped(input.date, index),
    category: input.category || 'Outros',
    affects_month_result: true,
    source: count > 1 ? 'recurring' : 'manual',
    recurring_group_id: groupId,
    client_request_id: newRequestId(),
    notes: input.notes?.trim() || null
  }));
  const { data, error } = await supabase.from('ff2_transactions').insert(rows).select('*');
  if (error) throw error;
  return data || [];
}

export async function updateTransaction(id, input) {
  const user = await getCurrentUser();
  const { data, error } = await supabase
    .from('ff2_transactions')
    .update({
      type: input.direction > 0 ? 'income' : 'expense',
      direction: input.direction > 0 ? 1 : -1,
      description: String(input.description || '').trim(),
      amount: Number(input.amount),
      occurred_on: input.date,
      category: input.category || 'Outros',
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', id).eq('user_id', user.id)
    .select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id, deleteSeries = false) {
  const user = await getCurrentUser();
  if (deleteSeries) {
    const { data: row, error: readError } = await supabase.from('ff2_transactions').select('recurring_group_id').eq('id', id).eq('user_id', user.id).single();
    if (readError) throw readError;
    if (row?.recurring_group_id) {
      const { error } = await supabase.from('ff2_transactions').delete().eq('user_id', user.id).eq('recurring_group_id', row.recurring_group_id);
      if (error) throw error;
      return;
    }
  }
  const { error } = await supabase.from('ff2_transactions').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

export async function applyBalanceAdjustment(input) {
  const { data, error } = await supabase.rpc('ff2_apply_balance_adjustment', {
    p_mode: input.mode,
    p_amount: Number(input.amount),
    p_reason: input.reason,
    p_occurred_on: input.date,
    p_client_request_id: newRequestId()
  });
  if (error) throw error;
  return data;
}

export function calculateCashStats(transactions, refDate = new Date()) {
  const today = localISO(new Date());
  const month = refDate.getMonth();
  const year = refDate.getFullYear();
  let balance = 0, income = 0, expense = 0, future = 0;
  for (const t of transactions) {
    const signed = Number(t.direction) * Number(t.amount || 0);
    if (t.occurred_on <= today) balance += signed;
    const d = parseDateISO(t.occurred_on);
    if (d.getMonth() === month && d.getFullYear() === year) {
      if (t.affects_month_result) {
        if (signed >= 0) income += signed; else expense += Math.abs(signed);
      }
      if (t.occurred_on > today) future += signed;
    }
  }
  return { balance, income, expense, cashResult: income - expense, future, projectedCashBalance: balance + future };
}

export function filterTransactions(transactions, { search = '', type = 'all', month = '' } = {}) {
  const q = search.trim().toLowerCase();
  return transactions.filter(t => {
    if (type === 'income' && Number(t.direction) !== 1) return false;
    if (type === 'expense' && Number(t.direction) !== -1) return false;
    if (type === 'adjustment' && t.type !== 'balance_adjustment') return false;
    if (type !== 'adjustment' && type !== 'all' && t.type === 'balance_adjustment') return false;
    if (month && !String(t.occurred_on).startsWith(month)) return false;
    if (q && !`${t.description || ''} ${t.category || ''} ${t.notes || ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

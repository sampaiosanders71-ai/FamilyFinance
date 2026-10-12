import { buildFinancialMonthLedger, classifyTransaction, ledgerMonthKey } from './financial-ledger.js?v=2.9.20';
import { goalProgress } from './goal-integration.js?v=2.9.20';
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function familyMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function familyDateFromMonth(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || month < 1 || month > 12) return null;
  return new Date(year, month - 1, 1, 12);
}

export function shiftFamilyMonth(date, offset) {
  return new Date(date.getFullYear(), date.getMonth() + Number(offset || 0), 1, 12);
}

function addCategory(map, name, amount) {
  const key = String(name || 'Outros').trim() || 'Outros';
  map.set(key, (map.get(key) || 0) + Math.max(0, Number(amount || 0)));
}

export function buildFamilyMonitorModel(data,link,today=new Date()) {
  const allowedTransactions=link?.can_view_transactions ? (data?.transactions||[]) : [];
  const allowedInstallments=link?.can_view_cards ? (data?.installments||[]) : [];
  const transactions=[...allowedTransactions].sort((a,b)=>String(b.occurred_on||'').localeCompare(String(a.occurred_on||''))||String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const monthKey=ledgerMonthKey(data?.month||today);
  const ledger=buildFinancialMonthLedger({transactions:allowedTransactions,installments:allowedInstallments,invoiceStatuses:data?.invoiceStatuses||[],monthKey,today});
  const income=link?.can_view_transactions?ledger.income:0;
  const cashExpense=link?.can_view_transactions?ledger.cashExpense:0;
  const cardExpense=link?.can_view_cards?ledger.cardExpense:0;
  const totalExpense=cashExpense+cardExpense;
  const result=income-totalExpense;
  const budgetLimit=link?.can_view_budget?(data?.budget?.items||[]).reduce((sum,item)=>sum+Math.max(0,Number(item.limit_amount||0)),0):0;
  // Apenas o titular ou permissões válidas fornecem transações vinculadas suficientes.
  // O status armazenado é sincronizado por triggers no banco para outros espectadores.
  const activeGoals=link?.can_view_goals?(data?.goals||[]).filter(g=>{if(g.status==='archived')return false;const server=(data?.goalStatus||[]).find(row=>row.goal_id===g.id);return server?!server.completed:(Array.isArray(data?.goalTransactions)?!goalProgress(g,data.goalTransactions,today).completed:g.status!=='completed');}).length:0;
  const categoryRows=ledger.categories.map(row=>({name:row.category,value:row.total,percent:totalExpense>0?row.total/totalExpense*100:0}));
  return {transactions,income,cashExpense,cardExpense,totalExpense,result,transactionCount:transactions.length,budgetLimit,activeGoals,categoryRows,categoryTotal:totalExpense,
    realizedThrough:ledger.cutoff,futureExpense:ledger.futureExpense};
}

export function filterFamilyTransactions(rows, filter = 'all') {
  if (filter === 'income') return (rows || []).filter(row => classifyTransaction(row)==='income');
  if (filter === 'expense') return (rows || []).filter(row => classifyTransaction(row)==='consumption');
  return rows || [];
}

function parseMoney(text = '') {
  const normalized = String(text)
    .replace(/\s/g, '')
    .replace(/R\$/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

export function captureFamilyMetricState(root = document) {
  const map = new Map();
  root.querySelectorAll('[data-family-money-key]').forEach(el => {
    map.set(el.dataset.familyMoneyKey, parseMoney(el.textContent));
  });
  return map;
}

export function animateFamilyMetricChange(before, root = document, duration = 620) {
  if (!before?.size) return;
  const targets = [];
  root.querySelectorAll('[data-family-money-key][data-family-money-value]').forEach(el => {
    const key = el.dataset.familyMoneyKey;
    if (!before.has(key)) return;
    const from = Number(before.get(key));
    const to = Number(el.dataset.familyMoneyValue);
    if (!Number.isFinite(from) || !Number.isFinite(to) || Math.abs(from - to) < 0.005) return;
    targets.push({ el, from, to });
    el.textContent = BRL.format(from);
  });
  if (!targets.length) return;
  const started = performance.now();
  const frame = now => {
    const t = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    targets.forEach(({ el, from, to }) => {
      el.textContent = BRL.format(from + (to - from) * eased);
    });
    if (t < 1) requestAnimationFrame(frame);
    else targets.forEach(({ el, to }) => { el.textContent = BRL.format(to); });
  };
  requestAnimationFrame(frame);
}

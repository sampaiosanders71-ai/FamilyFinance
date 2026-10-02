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

export function buildFamilyMonitorModel(data, link) {
  const transactions = [...(data?.transactions || [])].sort((a, b) => {
    const date = String(b.occurred_on || '').localeCompare(String(a.occurred_on || ''));
    if (date) return date;
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });

  let income = 0;
  let cashExpense = 0;
  let transactionCount = 0;
  const categories = new Map();

  if (link?.can_view_transactions) {
    for (const row of transactions) {
      transactionCount += 1;
      if (!row.affects_month_result) continue;
      const signed = Number(row.direction || 0) * Number(row.amount || 0);
      if (signed >= 0) income += signed;
      else {
        const value = Math.abs(signed);
        cashExpense += value;
        addCategory(categories, row.category, value);
      }
    }
  }

  let cardExpense = 0;
  if (link?.can_view_cards) {
    for (const row of data?.installments || []) {
      const value = Math.max(0, Number(row.amount || 0));
      cardExpense += value;
      addCategory(categories, row.ff2_card_purchases?.category || 'Cartão', value);
    }
  }

  const totalExpense = cashExpense + cardExpense;
  const result = income - totalExpense;
  const budgetLimit = link?.can_view_budget
    ? (data?.budget?.items || []).reduce((sum, item) => sum + Math.max(0, Number(item.limit_amount || 0)), 0)
    : 0;
  const activeGoals = link?.can_view_goals
    ? (data?.goals || []).filter(goal => !['completed', 'archived'].includes(String(goal.status || ''))).length
    : 0;
  const categoryTotal = [...categories.values()].reduce((sum, value) => sum + value, 0);
  const categoryRows = [...categories.entries()]
    .map(([name, value]) => ({ name, value, percent: categoryTotal > 0 ? (value / categoryTotal) * 100 : 0 }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'pt-BR'));

  return {
    transactions,
    income,
    cashExpense,
    cardExpense,
    totalExpense,
    result,
    transactionCount,
    budgetLimit,
    activeGoals,
    categoryRows,
    categoryTotal
  };
}

export function filterFamilyTransactions(rows, filter = 'all') {
  if (filter === 'income') return (rows || []).filter(row => Number(row.direction) > 0);
  if (filter === 'expense') return (rows || []).filter(row => Number(row.direction) < 0);
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

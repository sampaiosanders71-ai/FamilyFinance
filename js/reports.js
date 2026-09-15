import { calculateCashStats } from './finance.js';
import { sumCardExpensesForMonth } from './cards.js';
import { buildSimplePdf } from './pdf.js';

function requireDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new TypeError('REPORT_DATE_REQUIRED');
  return new Date(value.getFullYear(), value.getMonth(), 1, 12, 0, 0, 0);
}

function monthPrefix(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthKey(date) {
  return `${monthPrefix(date)}-01`;
}

function dateFromMonthKey(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})(?:-01)?$/);
  if (!match) throw new TypeError('INVALID_REPORT_MONTH');
  return new Date(Number(match[1]), Number(match[2]) - 1, 1, 12, 0, 0, 0);
}

function normalizeMonthKey(value) {
  return monthKey(value instanceof Date ? requireDate(value) : dateFromMonthKey(value));
}

function reportMoney(formatBRL, value) {
  return String(formatBRL(Number(value) || 0)).replace(/\u00a0/g, ' ');
}

function compactText(value, max = 72) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 3))}...`;
}

function sortedMonthKeys(keys) {
  return [...new Set(keys.map(normalizeMonthKey))].sort();
}

function actualCashRows(transactions, key, todayISO, direction) {
  const prefix = key.slice(0, 7);
  return (transactions || []).filter(row =>
    row?.affects_month_result === true &&
    Number(row.direction) === direction &&
    String(row.occurred_on || '').startsWith(prefix) &&
    String(row.occurred_on || '') <= todayISO
  );
}

function scheduledCashRows(transactions, key, todayISO) {
  const prefix = key.slice(0, 7);
  return (transactions || []).filter(row =>
    row?.affects_month_result === true &&
    Number(row.direction) < 0 &&
    String(row.occurred_on || '').startsWith(prefix) &&
    String(row.occurred_on || '') > todayISO
  );
}

function actualCardRows(installments, key, todayISO) {
  return (installments || []).filter(row => {
    if (String(row.invoice_month || '') !== key) return false;
    const purchaseDate = row.ff2_card_purchases?.purchase_date;
    return !purchaseDate || String(purchaseDate) <= todayISO;
  });
}

function scheduledCardRows(installments, key, todayISO) {
  return (installments || []).filter(row => {
    if (String(row.invoice_month || '') !== key) return false;
    const purchaseDate = row.ff2_card_purchases?.purchase_date;
    return purchaseDate && String(purchaseDate) > todayISO;
  });
}

function sumRows(rows, field = 'amount') {
  return (rows || []).reduce((sum, row) => sum + Number(row?.[field] || 0), 0);
}

function addCategory(target, category, cash = 0, card = 0) {
  const name = String(category || 'Outros').trim() || 'Outros';
  if (!target[name]) target[name] = { category: name, cash: 0, card: 0, total: 0 };
  target[name].cash += Number(cash || 0);
  target[name].card += Number(card || 0);
  target[name].total = target[name].cash + target[name].card;
}

function addCard(target, cardName, amount, status = 'open') {
  const name = String(cardName || 'Cartão').trim() || 'Cartão';
  if (!target[name]) target[name] = { name, total: 0, status };
  target[name].total += Number(amount || 0);
  if (status === 'paid') target[name].status = 'paid';
}

function invoiceStatusFor(invoiceStatuses, cardId, key) {
  return (invoiceStatuses || []).find(row => row.card_id === cardId && row.invoice_month === key)?.status || 'open';
}

function buildMonthModel({ transactions, installments, invoiceStatuses, budget, key, todayISO, monthLabel }) {
  const date = dateFromMonthKey(key);
  const incomeRows = actualCashRows(transactions, key, todayISO, 1);
  const expenseRows = actualCashRows(transactions, key, todayISO, -1);
  const cardRows = actualCardRows(installments, key, todayISO);
  const futureCashRows = scheduledCashRows(transactions, key, todayISO);
  const futureCardRows = scheduledCardRows(installments, key, todayISO);

  const income = sumRows(incomeRows);
  const cashExpense = sumRows(expenseRows);
  const cardExpense = sumRows(cardRows);
  const totalExpense = cashExpense + cardExpense;

  const categoryMap = {};
  for (const row of expenseRows) addCategory(categoryMap, row.category, row.amount, 0);
  for (const row of cardRows) addCategory(categoryMap, row.ff2_card_purchases?.category, 0, row.amount);
  const categories = Object.values(categoryMap).sort((a, b) => b.total - a.total || a.category.localeCompare(b.category, 'pt-BR'));

  const cardMap = {};
  for (const row of cardRows) {
    const cardName = row.ff2_cards?.name || 'Cartão';
    addCard(cardMap, cardName, row.amount, invoiceStatusFor(invoiceStatuses, row.card_id, key));
  }
  const cards = Object.values(cardMap).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'pt-BR'));

  const limits = Object.fromEntries((budget?.items || []).map(item => [item.category, Number(item.limit_amount || 0)]));
  const budgetCategories = [...new Set([...Object.keys(limits), ...categories.map(item => item.category)])]
    .map(category => {
      const spent = categoryMap[category]?.total || 0;
      const limit = limits[category] || 0;
      return { category, limit, spent, available: limit - spent };
    })
    .filter(item => item.limit > 0 || item.spent > 0)
    .sort((a, b) => b.spent - a.spent || a.category.localeCompare(b.category, 'pt-BR'));

  const details = [
    ...expenseRows.map(row => ({
      date: row.occurred_on,
      description: row.description || 'Despesa',
      category: row.category || 'Outros',
      source: 'À vista / conta',
      amount: Number(row.amount || 0)
    })),
    ...cardRows.map(row => ({
      date: row.ff2_card_purchases?.purchase_date || key,
      description: row.ff2_card_purchases?.description || 'Compra no cartão',
      category: row.ff2_card_purchases?.category || 'Outros',
      source: `${row.ff2_cards?.name || 'Cartão'} · parcela ${row.installment_no}/${row.ff2_card_purchases?.installment_count || '?'}`,
      amount: Number(row.amount || 0)
    }))
  ].sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.description.localeCompare(b.description, 'pt-BR'));

  return {
    key,
    date,
    label: monthLabel(date),
    income,
    cashExpense,
    cardExpense,
    totalExpense,
    result: income - totalExpense,
    scheduledExpense: sumRows(futureCashRows) + sumRows(futureCardRows),
    categories,
    cards,
    details,
    budget: {
      plannedIncome: Number(budget?.plan?.planned_income || 0),
      totalLimit: Object.values(limits).reduce((sum, value) => sum + Number(value || 0), 0),
      categories: budgetCategories,
      exists: !!budget?.plan
    }
  };
}

function aggregateCategories(months) {
  const map = {};
  for (const month of months) {
    for (const item of month.categories) addCategory(map, item.category, item.cash, item.card);
  }
  return Object.values(map).sort((a, b) => b.total - a.total || a.category.localeCompare(b.category, 'pt-BR'));
}

export function getMonthlyDRE(transactions, installments, refDate) {
  const date = requireDate(refDate);
  const cash = calculateCashStats(transactions || [], date);
  const cardExpense = sumCardExpensesForMonth(installments || [], date);
  const totalExpense = cash.expense + cardExpense;
  return { income: cash.income, cashExpense: cash.expense, cardExpense, totalExpense, result: cash.income - totalExpense };
}

export function getReportMonthOptions(transactions, installments, referenceDate = new Date()) {
  const reference = requireDate(referenceDate);
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const keys = new Set([monthKey(reference)]);
  for (let offset = 0; offset < 12; offset += 1) {
    keys.add(monthKey(new Date(reference.getFullYear(), reference.getMonth() - offset, 1, 12)));
  }
  for (const row of transactions || []) {
    const raw = String(row.occurred_on || '');
    if (row?.affects_month_result === true && raw <= todayISO && /^\d{4}-\d{2}/.test(raw)) keys.add(`${raw.slice(0, 7)}-01`);
  }
  for (const row of installments || []) {
    const raw = String(row.invoice_month || '');
    const purchaseDate = String(row.ff2_card_purchases?.purchase_date || '');
    if (/^\d{4}-\d{2}-01$/.test(raw) && (!purchaseDate || purchaseDate <= todayISO)) keys.add(raw);
  }
  return [...keys]
    .map(key => ({ key, date: dateFromMonthKey(key) }))
    .sort((a, b) => b.key.localeCompare(a.key));
}

export function buildFinancialReportModel({ transactions, installments, invoiceStatuses, budgetsByMonth = {}, monthKeys, monthLabel, today = new Date() }) {
  const keys = sortedMonthKeys(monthKeys || []);
  if (!keys.length) throw new Error('Selecione pelo menos um mês para o relatório.');
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const months = keys.map(key => buildMonthModel({
    transactions,
    installments,
    invoiceStatuses,
    budget: budgetsByMonth[key] || { plan: null, items: [] },
    key,
    todayISO,
    monthLabel
  }));
  const totals = months.reduce((acc, month) => {
    acc.income += month.income;
    acc.cashExpense += month.cashExpense;
    acc.cardExpense += month.cardExpense;
    acc.totalExpense += month.totalExpense;
    acc.result += month.result;
    acc.scheduledExpense += month.scheduledExpense;
    return acc;
  }, { income: 0, cashExpense: 0, cardExpense: 0, totalExpense: 0, result: 0, scheduledExpense: 0 });
  return { keys, months, totals, categories: aggregateCategories(months) };
}

export function buildFinancialReportLines({ transactions, installments, invoiceStatuses, budgetsByMonth, monthKeys, formatDate, formatBRL, monthLabel, today = new Date() }) {
  const model = buildFinancialReportModel({ transactions, installments, invoiceStatuses, budgetsByMonth, monthKeys, monthLabel, today });
  const money = value => reportMoney(formatBRL, value);
  const selectedLabels = model.months.map(month => month.label).join(', ');
  const lines = [
    { text: 'Family Finance', size: 20, leading: 28 },
    { text: 'Relatório financeiro de gastos reais', size: 13, leading: 20 },
    { text: `Meses selecionados: ${compactText(selectedLabels, 88)}`, size: 9, leading: 18 },
    { text: `Gerado em: ${today.toLocaleDateString('pt-BR')}`, size: 9, leading: 22 },
    { text: 'RESUMO DO PERÍODO', size: 14, leading: 21 },
    { text: `Receitas realizadas: ${money(model.totals.income)}`, size: 10 },
    { text: `Despesas à vista realizadas: ${money(model.totals.cashExpense)}`, size: 10 },
    { text: `Gastos no cartão: ${money(model.totals.cardExpense)}`, size: 10 },
    { text: `Total de gastos realizados: ${money(model.totals.totalExpense)}`, size: 11 },
    { text: `Resultado do período: ${money(model.totals.result)}`, size: 11, leading: 22 },
    { text: 'GASTOS POR CATEGORIA — PERÍODO', size: 13, leading: 20 }
  ];

  if (!model.categories.length) {
    lines.push({ text: 'Nenhum gasto realizado nos meses selecionados.', size: 9 });
  } else {
    for (const item of model.categories) {
      const pct = model.totals.totalExpense > 0 ? (item.total / model.totals.totalExpense) * 100 : 0;
      lines.push({ text: `${compactText(item.category, 24)} | à vista ${money(item.cash)} | cartão ${money(item.card)} | total ${money(item.total)} | ${pct.toFixed(1)}%`, size: 9, leading: 13 });
    }
  }

  for (const month of model.months) {
    lines.push({ text: `— ${month.label.toUpperCase()} —`, size: 14, leading: 24 });
    lines.push({ text: `Receitas realizadas: ${money(month.income)} | Gastos reais: ${money(month.totalExpense)} | Resultado: ${money(month.result)}`, size: 10, leading: 16 });
    lines.push({ text: `À vista: ${money(month.cashExpense)} | Cartão: ${money(month.cardExpense)}`, size: 9, leading: 16 });
    if (month.scheduledExpense > 0) {
      lines.push({ text: `Compromissos futuros não incluídos no realizado: ${money(month.scheduledExpense)}`, size: 8, leading: 16 });
    }

    lines.push({ text: 'Gastos por categoria', size: 11, leading: 17 });
    if (!month.categories.length) lines.push({ text: 'Sem gastos realizados neste mês.', size: 9 });
    for (const item of month.categories) {
      lines.push({ text: `${compactText(item.category, 30)} | ${money(item.total)} (à vista ${money(item.cash)} + cartão ${money(item.card)})`, size: 9, leading: 13 });
    }

    lines.push({ text: 'Orçamento x realizado', size: 11, leading: 17 });
    if (!month.budget.exists) {
      lines.push({ text: 'Nenhum orçamento salvo para este mês.', size: 9 });
    } else {
      lines.push({ text: `Renda planejada: ${money(month.budget.plannedIncome)} | Limites distribuídos: ${money(month.budget.totalLimit)}`, size: 9, leading: 14 });
      for (const item of month.budget.categories) {
        const status = item.limit > 0 ? `${Math.round((item.spent / item.limit) * 100)}% usado` : 'sem limite';
        lines.push({ text: `${compactText(item.category, 26)} | limite ${money(item.limit)} | gasto ${money(item.spent)} | saldo ${money(item.available)} | ${status}`, size: 8, leading: 12 });
      }
    }

    lines.push({ text: 'Cartões', size: 11, leading: 17 });
    if (!month.cards.length) lines.push({ text: 'Nenhuma parcela de cartão nesta competência.', size: 9 });
    for (const card of month.cards) {
      lines.push({ text: `${compactText(card.name, 32)} | ${money(card.total)} | fatura ${card.status === 'paid' ? 'paga' : 'aberta'}`, size: 9, leading: 13 });
    }

    lines.push({ text: 'Detalhamento dos gastos realizados', size: 11, leading: 17 });
    if (!month.details.length) {
      lines.push({ text: 'Nenhum gasto realizado para detalhar.', size: 9 });
    } else {
      for (const row of month.details) {
        lines.push({
          text: `${formatDate(row.date)} | ${compactText(row.description, 28)} | ${compactText(row.category, 18)} | ${compactText(row.source, 26)} | ${money(row.amount)}`,
          size: 8,
          leading: 12
        });
      }
    }
  }

  lines.push({ text: 'Critério: somente lançamentos efetivados até a data de geração entram como gastos/receitas realizados. Ajustes de saldo e pagamentos de fatura não entram novamente no resultado.', size: 8, leading: 12 });
  return { lines, model };
}

export function downloadFinancialReportPDF(options) {
  const { lines, model } = buildFinancialReportLines(options);
  const bytes = buildSimplePdf(lines);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const first = model.keys[0].slice(0, 7);
  const last = model.keys[model.keys.length - 1].slice(0, 7);
  anchor.download = first === last ? `family-finance-relatorio-${first}.pdf` : `family-finance-relatorio-${first}-a-${last}.pdf`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return model;
}

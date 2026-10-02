import { buildFinancialReportModel } from './reports.js';

export function analysisMonthKey(value) {
  const date = value instanceof Date ? value : new Date(`${String(value).slice(0,7)}-01T12:00:00`);
  if (Number.isNaN(date.getTime())) throw new TypeError('INVALID_ANALYSIS_MONTH');
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-01`;
}

export function analysisMonthDate(value) {
  const key = analysisMonthKey(value);
  return new Date(Number(key.slice(0,4)), Number(key.slice(5,7))-1, 1, 12);
}

export function shiftAnalysisMonth(value, offset) {
  const date = analysisMonthDate(value);
  return new Date(date.getFullYear(), date.getMonth()+Number(offset||0), 1, 12);
}

export function yearMonthKeys(year, today = new Date()) {
  const y = Number(year);
  const last = y === today.getFullYear() ? today.getMonth() : 11;
  return Array.from({length:last+1}, (_,i)=>`${y}-${String(i+1).padStart(2,'0')}-01`);
}

export function availableAnalysisYears(transactions = [], installments = [], today = new Date()) {
  const todayISO = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const years = new Set([today.getFullYear(), today.getFullYear()-1]);
  transactions.forEach(row=>{
    const raw=String(row?.occurred_on||'');
    if(row?.affects_month_result===true && raw<=todayISO && /^\d{4}-\d{2}-\d{2}$/.test(raw)) years.add(Number(raw.slice(0,4)));
  });
  installments.forEach(row=>{
    const raw=String(row?.invoice_month||'');
    const purchase=String(row?.ff2_card_purchases?.purchase_date||'');
    if(/^\d{4}-\d{2}-01$/.test(raw) && (!purchase||purchase<=todayISO)) years.add(Number(raw.slice(0,4)));
  });
  return [...years].filter(Number.isFinite).sort((a,b)=>b-a);
}

export function buildAnalysisPeriod({ transactions = [], installments = [], invoiceStatuses = [], budgetsByMonth = {}, monthKeys = [], monthLabel, today = new Date() }) {
  return buildFinancialReportModel({ transactions, installments, invoiceStatuses, budgetsByMonth, monthKeys, monthLabel, today });
}

function pctChange(current, previous) {
  const a=Number(current||0), b=Number(previous||0);
  if(Math.abs(b)<0.005) return Math.abs(a)<0.005 ? 0 : null;
  return ((a-b)/Math.abs(b))*100;
}

export function comparePeriodTotals(a, b) {
  const current=a?.totals||a||{};
  const previous=b?.totals||b||{};
  const fields=['income','cashExpense','cardExpense','totalExpense','result'];
  return Object.fromEntries(fields.map(field=>[field,{
    current:Number(current[field]||0),
    previous:Number(previous[field]||0),
    delta:Number(current[field]||0)-Number(previous[field]||0),
    percent:pctChange(current[field],previous[field])
  }]));
}

export function compareCategories(periodA, periodB, limit = 10) {
  const a=Object.fromEntries((periodA?.categories||[]).map(item=>[item.category,Number(item.total||0)]));
  const b=Object.fromEntries((periodB?.categories||[]).map(item=>[item.category,Number(item.total||0)]));
  return [...new Set([...Object.keys(a),...Object.keys(b)])]
    .map(category=>({category,a:a[category]||0,b:b[category]||0,delta:(a[category]||0)-(b[category]||0)}))
    .sort((x,y)=>Math.max(y.a,y.b)-Math.max(x.a,x.b)||Math.abs(y.delta)-Math.abs(x.delta)||x.category.localeCompare(y.category,'pt-BR'))
    .slice(0,limit);
}

export function compareCards(periodA, periodB, limit = 8) {
  const aggregate=period=>{
    const map={};
    (period?.months||[]).forEach(month=>(month.cards||[]).forEach(card=>{map[card.name]=(map[card.name]||0)+Number(card.total||0)}));
    return map;
  };
  const a=aggregate(periodA), b=aggregate(periodB);
  return [...new Set([...Object.keys(a),...Object.keys(b)])]
    .map(name=>({name,a:a[name]||0,b:b[name]||0,delta:(a[name]||0)-(b[name]||0)}))
    .sort((x,y)=>Math.max(y.a,y.b)-Math.max(x.a,x.b)||x.name.localeCompare(y.name,'pt-BR'))
    .slice(0,limit);
}

export function aggregateBudgetComparison(period) {
  const map={};
  let plannedIncome=0,totalLimit=0,totalSpent=0;
  (period?.months||[]).forEach(month=>{
    plannedIncome+=Number(month.budget?.plannedIncome||0);
    totalLimit+=Number(month.budget?.totalLimit||0);
    (month.budget?.categories||[]).forEach(item=>{
      const key=item.category||'Outros';
      if(!map[key])map[key]={category:key,limit:0,spent:0};
      map[key].limit+=Number(item.limit||0);
      map[key].spent+=Number(item.spent||0);
    });
  });
  const categories=Object.values(map).map(item=>({...item,available:item.limit-item.spent})).sort((a,b)=>Math.max(b.limit,b.spent)-Math.max(a.limit,a.spent));
  totalSpent=categories.reduce((sum,item)=>sum+item.spent,0);
  return {plannedIncome,totalLimit,totalSpent,categories};
}

export function strongestCategoryChanges(periodA, periodB) {
  const rows=compareCategories(periodA,periodB,100);
  const increase=[...rows].sort((a,b)=>b.delta-a.delta).find(item=>item.delta>0.005)||null;
  const decrease=[...rows].sort((a,b)=>a.delta-b.delta).find(item=>item.delta<-0.005)||null;
  return {increase,decrease};
}

export function buildMonthlyInsights(periodA, periodB, labelA, labelB, formatMoney = value => String(value)) {
  const a=periodA?.totals||{}, b=periodB?.totals||{};
  const comparison=comparePeriodTotals(periodA,periodB);
  const changes=strongestCategoryChanges(periodA,periodB);
  const items=[];
  const expense=comparison.totalExpense;
  if(expense.percent===null) {
    if(expense.current>0&&expense.previous===0)items.push(`Os gastos passaram de zero em ${labelB} para um período com despesas em ${labelA}.`);
  } else if(Math.abs(expense.percent)>=0.1) {
    items.push(`Os gastos ${expense.delta>0?'aumentaram':'diminuíram'} ${Math.abs(expense.percent).toFixed(1)}% em ${labelA} em relação a ${labelB}.`);
  } else items.push(`Os gastos ficaram praticamente estáveis entre ${labelB} e ${labelA}.`);
  if(changes.increase)items.push(`${changes.increase.category} foi o maior aumento de gasto, com diferença de ${formatMoney(Math.abs(changes.increase.delta))}.`);
  if(changes.decrease)items.push(`${changes.decrease.category} foi a maior redução, com queda de ${formatMoney(Math.abs(changes.decrease.delta))}.`);
  const result=Number(a.result||0);
  items.push(result>=0?`O resultado de ${labelA} ficou positivo.`:`O resultado de ${labelA} ficou negativo; as despesas superaram as receitas.`);
  return items.slice(0,4);
}

export function buildYearInsights(period, year, formatMoney = value => String(value)) {
  const months=period?.months||[];
  if(!months.length)return ['Ainda não há meses suficientes para uma análise anual.'];
  const expenseMonths=months.filter(month=>month.totalExpense>0);
  const highest=expenseMonths.length?[...expenseMonths].sort((a,b)=>b.totalExpense-a.totalExpense)[0]:null;
  const best=[...months].sort((a,b)=>b.result-a.result)[0];
  const active=months.filter(month=>month.income>0||month.totalExpense>0);
  const avg=active.length?active.reduce((sum,m)=>sum+m.totalExpense,0)/active.length:0;
  const items=[];
  if(highest)items.push(`${highest.label} foi o mês com maior gasto em ${year}.`);
  if(best)items.push(`${best.label} teve o melhor resultado financeiro do período analisado.`);
  items.push(`A média mensal de gastos nos meses com movimentação foi de ${formatMoney(avg)}.`);
  if(Number(period.totals?.result||0)>=0)items.push(`O acumulado de ${year} permanece positivo.`);else items.push(`O acumulado de ${year} está negativo.`);
  return items;
}

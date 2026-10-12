const ISO_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_KEY_RE = /^\d{4}-\d{2}-01$/;

function number(value){ const n=Number(value||0); return Number.isFinite(n)?n:0; }
function normalizeText(value){ return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim(); }
export function localISODate(date=new Date()){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function ledgerMonthKey(value=new Date()){
  if(typeof value==='string' && MONTH_KEY_RE.test(value)) return value;
  const date=value instanceof Date?value:new Date(`${String(value).slice(0,7)}-01T12:00:00`);
  if(Number.isNaN(date.getTime())) throw new TypeError('INVALID_LEDGER_MONTH');
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-01`;
}
function monthParts(key){ const normalized=ledgerMonthKey(key); return {year:Number(normalized.slice(0,4)),month:Number(normalized.slice(5,7))}; }
function lastDay(year,month){ return new Date(year,month,0,12).getDate(); }
export function monthCutoffISO(key,{today=new Date(),throughDay=null}={}){
  const {year,month}=monthParts(key);
  const currentYear=today.getFullYear(), currentMonth=today.getMonth()+1;
  // Nem uma data de corte solicitada manualmente transforma mês futuro em realizado.
  if(year>currentYear || (year===currentYear && month>currentMonth)) return `${year}-${String(month).padStart(2,'0')}-00`;
  if(Number.isInteger(Number(throughDay)) && Number(throughDay)>0){
    const day=Math.min(Number(throughDay),lastDay(year,month));
    return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }
  if(year===currentYear && month===currentMonth) return localISODate(today);
  return `${year}-${String(month).padStart(2,'0')}-${String(lastDay(year,month)).padStart(2,'0')}`;
}

export function isCardInvoicePayment(row){
  return Number(row?.direction)<0 && String(row?.source||'')==='card' && String(row?.reference_key||'').startsWith('invoice:');
}
export function isCardInvoiceReversal(row){return Number(row?.direction)>0&&String(row?.source||'')==='card'&&String(row?.reference_key||'').startsWith('invoice-reversal:')}
export function isCardPurchaseRefund(row){return String(row?.source||'')==='card'&&String(row?.reference_key||'').startsWith('card-refund:')}
export function isBalanceAdjustment(row){ return String(row?.type||'')==='balance_adjustment'; }

const ALLOCATION_CATEGORY_RE=/(^|\b)(investimento|investimentos|autoinvestimento|reserva financeira|reserva de emergencia|poupanca|aplicacao)(\b|$)/i;
const ALLOCATION_DESCRIPTION_RE=/(reserva de emergencia|reserva financeira|guardar para|deposito.*poupanca|poupanca|autoinvestimento|aplicacao financeira|investimento)/i;

export function isAllocationTransaction(row){
  if(row?.financial_nature)return row.financial_nature==='allocation';
  const category=normalizeText(row?.category);
  const description=normalizeText(row?.description);
  return ALLOCATION_CATEGORY_RE.test(category) || ALLOCATION_DESCRIPTION_RE.test(description);
}

export function classifyTransaction(row){
  const direction=Number(row?.direction||0);
  if(isBalanceAdjustment(row)) return 'adjustment';
  // A quitação da fatura não é nova despesa: as compras já foram reconhecidas nas parcelas.
  if(isCardInvoicePayment(row)) return 'card_payment';
  if(isCardInvoiceReversal(row)) return 'card_payment_reversal';
  if(isCardPurchaseRefund(row))return 'card_refund_cash';
  if(row?.financial_nature==='resgate')return direction>0?'transfer_in':'invalid';
  if(row?.financial_nature==='transfer')return direction>0?'transfer_in':'transfer_out';
  if(row?.financial_nature==='allocation')return direction<0?'allocation':'invalid';
  if(row?.financial_nature==='consumption')return direction<0?'consumption':'invalid';
  if(row?.financial_nature==='income') return direction>0?'income':'invalid';
  if(direction>0) return row?.affects_month_result===false?'transfer_in':'income';
  if(direction<0){
    if(isAllocationTransaction(row)) return 'allocation';
    if(row?.affects_month_result===false) return 'transfer_out';
    return 'consumption';
  }
  return 'neutral';
}

function addAmount(map,key,amount){ const name=String(key||'Outros').trim()||'Outros'; map[name]=(map[name]||0)+number(amount); }
function addCategory(target,category,cash=0,card=0){
  const name=String(category||'Outros').trim()||'Outros';
  if(!target[name]) target[name]={category:name,cash:0,card:0,total:0};
  target[name].cash+=number(cash); target[name].card+=number(card); target[name].total=target[name].cash+target[name].card;
}
function addCard(target,cardId,name,amount,status='open'){
  // The ID, not the editable label, defines an invoice. Empty IDs remain legacy fallbacks.
  const cardName=String(name||'Cartão').trim()||'Cartão';
  const id=String(cardId||'');
  const identity=id?`id:${id}`:`legacy:${cardName}`;
  if(!target[identity]) target[identity]={cardId:id||null,name:cardName,total:0,status};
  target[identity].total+=number(amount);
  // An unpaid invoice must never be marked paid by another row.
  if(status!=='paid')target[identity].status='open';
}
function invoiceStatus(statuses,cardId,key){ return (statuses||[]).find(row=>row?.card_id===cardId&&String(row?.invoice_month||'')===key)?.status||'open'; }
function validDate(value){ return ISO_DAY_RE.test(String(value||'')); }

export function buildFinancialMonthLedger({transactions=[],installments=[],invoiceStatuses=[],monthKey,today=new Date(),throughDay=null}={}){
  const key=ledgerMonthKey(monthKey||today);
  const prefix=key.slice(0,7);
  const cutoff=monthCutoffISO(key,{today,throughDay});
  const categoryMap={},cardMap={},budgetUsageMap={},allocationMap={};
  const details=[];
  let income=0,cashExpense=0,cardExpense=0,allocation=0,transferOut=0,transferIn=0,cardPayments=0,cardRefundCash=0,adjustments=0;
  let futureIncome=0,futureCashExpense=0,futureCardExpense=0,futureAllocation=0;

  for(const row of transactions||[]){
    const occurred=String(row?.occurred_on||'');
    if(!occurred.startsWith(prefix) || !validDate(occurred)) continue;
    const amount=Math.abs(number(row?.amount));
    const direction=Number(row?.direction||0);
    const kind=classifyTransaction(row);
    if(kind==='invalid')throw new Error('LANÇAMENTO_COM_NATUREZA_INCOMPATÍVEL');
    const realized=occurred<=cutoff;
    if(!realized){
      if(kind==='income') futureIncome+=amount;
      else if(direction<0){
        if(kind==='allocation') futureAllocation+=amount;
        else if(kind==='consumption') futureCashExpense+=amount;
      }
      continue;
    }
    if(kind==='income'){ income+=amount; }
    else if(kind==='consumption'){
      cashExpense+=amount;
      addCategory(categoryMap,row?.category,amount,0);
      addAmount(budgetUsageMap,row?.category,amount);
      details.push({date:occurred,description:row?.description||'Despesa',category:row?.category||'Outros',source:'À vista / conta',amount,kind:'consumption'});
    }else if(kind==='allocation'){
      allocation+=amount;
      addAmount(allocationMap,row?.category,amount);
      // Aportes não consomem orçamento de despesas; aparecem em allocationMap.
      details.push({date:occurred,description:row?.description||'Destinação financeira',category:row?.category||'Outros',source:'Reserva / investimento',amount,kind:'allocation'});
    }else if(kind==='card_payment') cardPayments+=amount;
    else if(kind==='card_payment_reversal') cardPayments-=amount;
    else if(kind==='card_refund_cash')cardRefundCash+=direction*amount;
    else if(kind==='transfer_out') transferOut+=amount;
    else if(kind==='transfer_in') transferIn+=amount;
    else if(kind==='adjustment') adjustments+=direction*amount;
  }

  for(const row of installments||[]){
    if(String(row?.invoice_month||'')!==key || row?.ff2_card_purchases?.cancelled_at || row?.ff2_card_purchases?.record_kind==='invoice_opening') continue;
    const purchaseDate=String(row?.ff2_card_purchases?.purchase_date||'');
    const amount=number(row?.amount);
    if(cutoff.endsWith('-00') || (purchaseDate && validDate(purchaseDate) && purchaseDate>cutoff)){ futureCardExpense+=amount; continue; }
    cardExpense+=amount;
    const category=row?.ff2_card_purchases?.category||'Outros';
    addCategory(categoryMap,category,0,amount);
    addAmount(budgetUsageMap,category,amount);
    const status=invoiceStatus(invoiceStatuses,row?.card_id,key);
    addCard(cardMap,row?.card_id,row?.ff2_cards?.name||'Cartão',amount,status);
    details.push({date:purchaseDate||key,description:row?.ff2_card_purchases?.description||'Compra no cartão',category,source:`${row?.ff2_cards?.name||'Cartão'} · parcela ${row?.installment_no||'?'} / ${row?.ff2_card_purchases?.installment_count||'?'}`,amount,kind:row.card_adjustment?'card_adjustment':'card_consumption',status});
  }

  const totalExpense=cashExpense+cardExpense;
  const cashOutflow=cashExpense+allocation+transferOut+cardPayments;
  const pendingStatuses=(invoiceStatuses||[]).filter(row=>row.invoice_month===key&&row.balance_due!=null);
  const knownCards=new Set(pendingStatuses.map(row=>row.card_id));
  const committedCard=pendingStatuses.reduce((sum,row)=>sum+number(row.balance_due),0)+Object.values(cardMap).filter(card=>!knownCards.has(card.cardId)&&card.status!=='paid').reduce((sum,card)=>sum+card.total,0);
  return {
    key,cutoff,partial:cutoff<`${prefix}-${String(lastDay(Number(prefix.slice(0,4)),Number(prefix.slice(5,7)))).padStart(2,'0')}`,
    income,cashExpense,cardExpense,totalExpense,result:income-totalExpense,
    allocation,transferOut,transferIn,cardPayments,cardRefundCash,adjustments,cashOutflow,cashResult:income+transferIn+cardRefundCash-cashOutflow,
    futureIncome,futureCashExpense,futureCardExpense,futureExpense:futureCashExpense+futureCardExpense,futureAllocation,
    committedCard,
    categories:Object.values(categoryMap).sort((a,b)=>b.total-a.total||a.category.localeCompare(b.category,'pt-BR')),
    cards:Object.values(cardMap).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'pt-BR')),
    budgetUsageMap,allocationMap,
    details:details.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.description).localeCompare(String(b.description),'pt-BR'))
  };
}

export function buildFinancialPeriodLedger({transactions=[],installments=[],invoiceStatuses=[],monthKeys=[],today=new Date(),cutoffDaysByMonth={}}={}){
  const keys=[...new Set((monthKeys||[]).map(ledgerMonthKey))].sort();
  const months=keys.map(key=>buildFinancialMonthLedger({transactions,installments,invoiceStatuses,monthKey:key,today,throughDay:cutoffDaysByMonth?.[key]??null}));
  const totals=months.reduce((a,m)=>{
    for(const field of ['income','cashExpense','cardExpense','totalExpense','result','allocation','transferOut','transferIn','cardPayments','cardRefundCash','cashOutflow','cashResult','futureIncome','futureCashExpense','futureCardExpense','futureExpense','futureAllocation','committedCard']) a[field]+=number(m[field]);
    return a;
  },{income:0,cashExpense:0,cardExpense:0,totalExpense:0,result:0,allocation:0,transferOut:0,transferIn:0,cardPayments:0,cardRefundCash:0,cashOutflow:0,cashResult:0,futureIncome:0,futureCashExpense:0,futureCardExpense:0,futureExpense:0,futureAllocation:0,committedCard:0});
  return {keys,months,totals};
}

export function calculateCashLedgerStats(transactions=[],refDate=new Date(),today=new Date()){
  const todayISO=localISODate(today);
  let balance=0;
  for(const row of transactions||[]){
    const occurred=String(row?.occurred_on||'');
    if(validDate(occurred) && occurred<=todayISO) balance+=Number(row?.direction||0)*number(row?.amount);
  }
  const month=buildFinancialMonthLedger({transactions,monthKey:ledgerMonthKey(refDate),today});
  const prefix=ledgerMonthKey(refDate).slice(0,7);
  let future=0;
  for(const row of transactions||[]){
    const occurred=String(row?.occurred_on||'');
    if(validDate(occurred)&&occurred.startsWith(prefix)&&occurred>todayISO) future+=Number(row?.direction||0)*number(row?.amount);
  }
  return {
    balance,
    income:month.income,
    expense:month.cashExpense,
    allocation:month.allocation,
    transferOut:month.transferOut,
    transferIn:month.transferIn,
    cardPayments:month.cardPayments,cardRefundCash:month.cardRefundCash,
    cashResult:month.income+month.transferIn+month.cardRefundCash-month.cashExpense-month.allocation-month.transferOut-month.cardPayments,
    consumptionResult:month.income-month.cashExpense,
    future,
    projectedCashBalance:balance+future
  };
}

import { classifyTransaction,localISODate,ledgerMonthKey,monthCutoffISO } from './financial-ledger.js?v=2.9.42';
import { goalProgress } from './goal-integration.js?v=2.9.42';
import { canonicalCategoryName } from './category-alias.js?v=2.9.42';

export const compositionRow=(id,label,amount,meta='',action=null)=>({id:String(id),label:String(label||'Registro'),amount:Number(amount||0),meta:String(meta||''),action});
export function composition(title,total,rows,options={}){
 const value=Number(total),list=rows||[],sum=list.reduce((s,r)=>s+Number(r.amount),0);
 if(!Number.isFinite(value)||list.some(r=>!Number.isFinite(r.amount))||Math.abs(sum-value)>.009)throw new Error('A composição mudou. Atualize os dados e tente novamente.');
 return {...options,title,total:value,rows:list};
}
const dateText=s=>String(s||'').split('-').reverse().join('/');
export function transactionEntry(t,amount=Number(t.direction)*Number(t.amount)){
 return compositionRow('transaction:'+t.id,t.description||'Lançamento',amount,[dateText(t.occurred_on),t.category,t.type==='balance_adjustment'?'Ajuste de saldo':''].filter(Boolean).join(' · '),{kind:'transaction',id:t.id});
}
export function installmentEntry(r,amount=Number(r.amount)){
 const p=r.ff2_card_purchases||{};
 return compositionRow('installment:'+r.id,p.description||'Compra no cartão',amount,[r.ff2_cards?.name||'Cartão',dateText(r.invoice_month),'Parcela '+(r.installment_no||1)+' de '+(p.installment_count||1)].join(' · '),{kind:'invoice',cardId:r.card_id,month:r.invoice_month,installmentId:r.id,purchaseId:r.purchase_id});
}
// Uses the same classifications, dates and exclusions as the existing financial ledger.
export function periodEntries({transactions=[],installments=[],model,field='totalExpense',categories=[],category=null,cardId=null}){
 const months=new Map((model?.months||[]).map(m=>[m.key,m]));
 const result=[];
 for(const t of transactions){
  const date=String(t.occurred_on||''),m=months.get(date.slice(0,7)+'-01');
  if(!m||!/^\d{4}-\d{2}-\d{2}$/.test(date)||cardId)continue;
  if(category&&canonicalCategoryName(t.category||'Outros',categories)!==category)continue;
  const kind=classifyTransaction(t),amount=Math.abs(Number(t.amount)||0),realized=date<=m.cutoff;
  let coefficient=0;
  if(!realized){if(field==='futureAllocation'&&kind==='allocation')coefficient=1;}
  else if(field==='income'&&kind==='income')coefficient=1;
  else if(['cashExpense','totalExpense'].includes(field)&&kind==='consumption')coefficient=1;
  else if(field==='allocation'&&kind==='allocation')coefficient=1;
  else if(field==='result')coefficient=kind==='income'?1:kind==='consumption'?-1:0;
  else if(field==='cashResult'){
   coefficient=['income','transfer_in','card_payment_reversal'].includes(kind)?1:['consumption','allocation','transfer_out','card_payment'].includes(kind)?-1:kind==='card_refund_cash'?Number(t.direction):0;
  }
  if(coefficient)result.push(transactionEntry(t,amount*coefficient));
 }
 if(['cardExpense','totalExpense','result'].includes(field))for(const r of installments){
  const m=months.get(r.invoice_month),p=r.ff2_card_purchases||{};
  if(!m||p.cancelled_at||p.record_kind==='invoice_opening'||m.cutoff.endsWith('-00'))continue;
  if(cardId&&r.card_id!==cardId)continue;
  if(category&&canonicalCategoryName(p.category||'Outros',categories)!==category)continue;
  if(/^\d{4}-\d{2}-\d{2}$/.test(String(p.purchase_date||''))&&p.purchase_date>m.cutoff)continue;
  result.push(installmentEntry(r,Number(r.amount)*(field==='result'?-1:1)));
 }
 return result.sort((a,b)=>a.id.localeCompare(b.id));
}
export function monthModel(date,today=new Date()){
 const key=ledgerMonthKey(date);return {months:[{key,cutoff:monthCutoffISO(key,{today})}]};
}
export function cashBalanceComposition(transactions,total,today=localISODate()){
 return composition('Saldo atual',total,transactions.filter(t=>/^\d{4}-\d{2}-\d{2}$/.test(String(t.occurred_on||''))&&t.occurred_on<=today).map(t=>transactionEntry(t)),{subtitle:'Todos os períodos · até '+dateText(today),signed:true,note:'Inclui entradas, saídas, pagamentos de fatura e ajustes de saldo efetivados. Compras no cartão não são debitadas novamente.'});
}
export function planningEntries(items,field){
 const nature=t=>Number(t.direction)>0?'income':['allocation','transfer'].includes(t.financial_nature)?t.financial_nature:'consumption';
 return (items||[]).flatMap(t=>{
  const n=nature(t),active=!['deferred','cancelled'].includes(t.status),pending=t.status==='pending';let coefficient=0;
  if(field==='pendingIncome'&&pending&&n==='income'||field==='pendingExpense'&&pending&&n==='consumption'||field==='pendingAllocation'&&pending&&n==='allocation'||field==='pendingTransfer'&&pending&&n==='transfer')coefficient=1;
  else if(field==='pending'&&pending&&['income','consumption'].includes(n))coefficient=1;
  else if(field==='plannedIncome'&&active&&n==='income'||field==='plannedExpense'&&active&&n==='consumption'||field==='plannedAllocation'&&active&&n==='allocation'||field==='deferred'&&t.status==='deferred')coefficient=1;
  else if(field==='plannedResult'&&active)coefficient=n==='income'?1:n==='consumption'?-1:0;
  if(!coefficient)return [];
  return [compositionRow('plan:'+t.id,t.description,Math.max(0,Number(t.amount)||0)*coefficient,[dateText(t.planned_on),t.category,({pending:'Pendente',paid:'Pago',received:'Recebido',deferred:'Adiado'})[t.status]||t.status].filter(Boolean).join(' · '),{kind:'plan',id:t.id,date:t.planned_on})];
 });
}
export function goalComposition(goal,transactions,today=localISODate()){
 const p=goalProgress(goal,transactions,today),rows=[compositionRow('goal-base:'+goal.id,'Saldo inicial da meta',p.base,'Base manual cadastrada')];
 for(const t of transactions)if(t.goal_id===goal.id&&String(t.occurred_on||'')<=today){
  if(t.financial_nature==='allocation'&&Number(t.direction)===-1)rows.push(transactionEntry(t,Math.max(0,Number(t.amount)||0)));
  else if(t.financial_nature==='resgate'&&Number(t.direction)===1)rows.push(transactionEntry(t,-Math.max(0,Number(t.amount)||0)));
 }
 if(p.rawSaved<0)rows.push(compositionRow('goal-floor','Limite mínimo do saldo exibido',-p.rawSaved,'O cálculo da meta limita o saldo exibido a zero. Revise os resgates.'));
 return composition(goal.name,p.saved,rows,{subtitle:'Composição do saldo da meta · até '+dateText(today),signed:true,note:'Saldo inicial + aportes efetivados − resgates efetivados. Movimentos futuros ficam fora deste saldo.'});
}
export function invoiceEntry(inv,amount=inv.total,label=inv.card.name){
 return compositionRow('invoice:'+inv.card.id+':'+inv.invoiceMonth,label,amount,dateText(inv.invoiceMonth)+' · '+(inv.status==='paid'?'Quitada':'Fatura registrada'),{kind:'invoice',cardId:inv.card.id,month:inv.invoiceMonth});
}
export function limitComposition(card,invoices,limit,field='available'){
 const rows=field==='available'?[compositionRow('limit','Limite total contratado',limit.total,'Limite cadastrado do cartão')]:[];
 const raw=invoices.reduce((s,i)=>s+i.balanceDue-i.creditBalance+i.limitHold,0);
 for(const inv of invoices){
  const amount=inv.balanceDue-inv.creditBalance+inv.limitHold;
  if(amount)rows.push(invoiceEntry(inv,amount*(field==='available'?-1:1),'Compromisso · '+dateText(inv.invoiceMonth)));
 }
 if(raw<0)rows.push(compositionRow('limit-floor','Limite mínimo do comprometimento',-raw*(field==='available'?-1:1),'O comprometimento exibido não fica abaixo de zero.'));
 return composition(field==='available'?'Limite disponível':'Limite comprometido',limit[field],rows,{subtitle:card.name,signed:true,note:'Comprometimento por fatura = saldo devido − créditos + retenções de limite. Inclui faturas futuras.'});
}
export function invoiceComposition(inv,adjustments=[],payments=[],field='total'){
 const rows=[];
 if(field==='paid'){
  const found=payments.filter(p=>p.invoice_id===inv.id&&!p.reversed_at);
  for(const p of found)rows.push(compositionRow('payment:'+p.id,'Pagamento registrado',Number(p.amount),dateText(p.paid_on),p.transaction_id?{kind:'transaction',id:p.transaction_id}:null));
  const previous=inv.paidAmount-found.reduce((s,p)=>s+Number(p.amount),0);
  if(Math.abs(previous)>.005)rows.unshift(compositionRow('paid-base','Pagamentos anteriores preservados',previous,'Base de pagamentos da fatura registrada no histórico.'));
  return composition('Pago na fatura',inv.paidAmount,rows,{subtitle:inv.card.name+' · '+dateText(inv.invoiceMonth),note:'Pagamentos revertidos ficam fora deste total.'});
 }
 for(const r of inv.rows){
  if(r.ff2_card_purchases?.record_kind==='invoice_opening')rows.push(compositionRow('opening:'+r.id,'Saldo anterior registrado',Number(r.amount),'Base inicial da fatura'));
  else rows.push(installmentEntry(r,Number(r.amount)-Number(r.legacy_covered_amount||0)));
 }
 const base=rows.reduce((s,r)=>s+r.amount,0),baseDifference=inv.baseAmount-base;
 if(Math.abs(baseDifference)>.005)rows.push(compositionRow('persisted-base','Conciliação da base registrada',baseDifference,'Diferença entre as parcelas detalhadas e a base preservada no histórico da fatura.'));
 const own=adjustments.filter(a=>a.card_id===inv.card.id&&a.invoice_month===inv.invoiceMonth);
 for(const a of own)if(Number(a.invoice_effect))rows.push(compositionRow('adjustment:'+a.id,a.reason||'Ajuste da fatura',Number(a.invoice_effect),dateText(a.occurred_on)));
 const net=own.reduce((s,a)=>s+Number(a.invoice_effect||0),0);
 if(Math.abs(inv.netAdjustments-net)>.005)rows.push(compositionRow('persisted-adjustments','Ajustes anteriores registrados',inv.netAdjustments-net,'Composição histórica preservada na fatura.'));
 const totalDifference=inv.total-inv.baseAmount-inv.netAdjustments;
 if(Math.abs(totalDifference)>.005)rows.push(compositionRow('persisted-total','Conciliação do total registrado',totalDifference,'Total confirmado pelo histórico da fatura.'));
 if(field==='due'){
  rows.push(compositionRow('paid','Pagamentos considerados',-inv.paidAmount,'Valor pago acumulado nesta fatura.'));
  if(inv.total-inv.paidAmount<0)rows.push(compositionRow('credit','Crédito excedente',inv.paidAmount-inv.total,'Crédito não vira saldo devido negativo.'));
 }
 return composition(field==='due'?'Saldo devido':'Valor da fatura',field==='due'?inv.balanceDue:inv.total,rows,{subtitle:inv.card.name+' · '+dateText(inv.invoiceMonth),signed:true,note:'A base, os ajustes e a conciliação seguem o valor registrado da fatura.'});
}

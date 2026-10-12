const MONTH_RE=/^\d{4}-\d{2}-01$/;
const cents=value=>Math.round((Number(value)||0)*100);
export function cardToday(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const get=type=>parts.find(p=>p.type===type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function cardMonth(value=cardToday()){return String(value).slice(0,7)+'-01'}
export function cardDate(value){return new Date(String(value).slice(0,10)+'T12:00:00')}
export function cardCalendarDates(card,key){
 const [year,month]=key.slice(0,7).split('-').map(Number);
 const day=(offset,value)=>{const d=new Date(year,month-1+offset,1,12);d.setDate(Math.min(Number(value),new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
 return {closingOn:day(0,card.closing_day),dueOn:day(Number(card.due_day)<=Number(card.closing_day)?1:0,card.due_day)};
}
export function invoiceStatusLabel(status){return ({open:'Aberta',closed:'Fechada · a pagar',partial:'Parcialmente paga',paid:'Paga',overdue:'Atrasada'})[status]||'Aberta'}
export function installmentInvoiceAmounts(rows=[]){
 const opening=rows.filter(r=>r.ff2_card_purchases?.record_kind==='invoice_opening').reduce((sum,r)=>sum+cents(r.amount),0);
 const purchases=rows.filter(r=>r.ff2_card_purchases?.record_kind!=='invoice_opening').reduce((sum,r)=>sum+cents(r.amount),0);
 const coverage=rows.reduce((sum,r)=>sum+cents(r.legacy_covered_amount),0);
 return {total:(opening+purchases-coverage)/100,reconciledAmount:Math.max(0,opening-coverage)/100};
}
export function buildCardInvoices(card,installments=[],statuses=[],today=cardToday()){
 const groups=new Map();
 for(const row of installments){if(row.card_adjustment||row.card_id!==card.id||row.ff2_card_purchases?.cancelled_at||!MONTH_RE.test(row.invoice_month))continue;if(!groups.has(row.invoice_month))groups.set(row.invoice_month,[]);groups.get(row.invoice_month).push(row)}
 const persisted=statuses.filter(row=>row.card_id===card.id&&MONTH_RE.test(row.invoice_month));
 for(const row of persisted)if(!groups.has(row.invoice_month))groups.set(row.invoice_month,[]);
 if(!groups.has(cardMonth(today)))groups.set(cardMonth(today),[]);
 return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([key,rows])=>{
  const saved=persisted.find(row=>row.invoice_month===key);const dates=cardCalendarDates(card,key),amounts=installmentInvoiceAmounts(rows);
  const total=saved?.total_amount!=null?Number(saved.total_amount):amounts.total;
  const paidAmount=saved?.paid_amount!=null?Number(saved.paid_amount):saved?.status==='paid'?total:0;
  const balanceDue=Math.max(0,(cents(total)-cents(paidAmount))/100),creditBalance=Number(saved?.credit_balance)||Math.max(0,(cents(paidAmount)-cents(total))/100),limitHold=Number(saved?.limit_hold)||0;
  const closingOn=saved?.closing_on||dates.closingOn,dueOn=saved?.due_on||dates.dueOn;
  const status=(total>0||Number(saved?.net_adjustments||0)!==0)&&balanceDue===0&&(paidAmount>0||today>=closingOn)?'paid':balanceDue>0&&today>dueOn?'overdue':paidAmount>0?'partial':today>=closingOn?'closed':'open';
  return {id:saved?.id||null,card,invoiceMonth:key,rows,total,paidAmount,balanceDue,creditBalance,limitHold,settledAt:saved?.settled_at||null,baseAmount:Number(saved?.base_amount??total),netAdjustments:Number(saved?.net_adjustments)||0,closingOn,dueOn,dueDate:cardDate(dueOn),status,reconciledAmount:saved?.reconciled_amount!=null?Number(saved.reconciled_amount):amounts.reconciledAmount};
 });
}
export function cardLimitSummary(card,invoices=[]){
 const committed=Math.max(0,invoices.reduce((sum,invoice)=>sum+cents(invoice.balanceDue)-cents(invoice.creditBalance)+cents(invoice.limitHold),0))/100;
 const total=Number(card.credit_limit)||0;return {total,committed,available:(cents(total)-cents(committed))/100,utilization:total>0?Math.min(100,Math.max(0,committed/total*100)):0};
}

export const cardAdjustmentLabel=kind=>({interest:'Juros',fine:'Multa',fee:'Encargo',debit_adjustment:'Ajuste de débito',credit_adjustment:'Crédito confirmado',purchase_refund:'Estorno de compra',reversal:'Correção de ajuste',limit_release:'Liberação de limite'})[kind]||'Ajuste';
export function adjustmentsAsInstallments(adjustments=[],cards=[]){return adjustments.map(a=>({id:'adjustment:'+a.id,card_id:a.card_id,purchase_id:a.purchase_id,invoice_month:a.invoice_month,amount:Number(a.analytics_effect),installment_no:1,card_adjustment:a,
 ff2_cards:{name:cards.find(c=>c.id===a.card_id)?.name||a.ff2_cards?.name||'Cartão'},ff2_card_purchases:{record_kind:'adjustment',description:cardAdjustmentLabel(a.kind)+' · '+a.reason,category:a.category||'Outros',purchase_date:a.occurred_on,total_amount:a.amount,installment_count:1}}));}

// Accept Brazilian amounts and plain decimal values without silently rounding invalid inputs.
export function parseCardInvoiceAmount(value){
 let text=String(value??'').trim().replace(/^R\$\s*/i,'').replace(/\s/g,'');
 if(text.includes(',')){if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(text))return null;text=text.replace(/\./g,'').replace(',','.');}
 else if(/^\d{1,3}(?:\.\d{3})+$/.test(text))text=text.replace(/\./g,'');
 else if(!/^\d+(?:\.\d{1,2})?$/.test(text))return null;
 const amount=Number(text);return Number.isFinite(amount)&&amount>=0&&amount<=999999999999.99?amount:null;
}

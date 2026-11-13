import {buildCardInvoices,cardToday} from './card-domain.js?v=2.9.42';
import { isCardInvoicePayment,isCardInvoiceReversal } from './financial-ledger.js?v=2.9.42';
function monthPrefix(refDate){
  return `${refDate.getFullYear()}-${String(refDate.getMonth()+1).padStart(2,'0')}`;
}


export function sumPaidCardPaymentsForMonth(transactions=[],refDate=new Date(),today=new Date()){
  const prefix=monthPrefix(refDate);
  const todayISO=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  return (transactions||[])
    .filter(row=>isCardInvoicePayment(row)||isCardInvoiceReversal(row))
    .filter(row=>String(row.occurred_on||'').startsWith(prefix))
    .filter(row=>String(row.occurred_on||'')<=todayISO)
    .reduce((sum,row)=>sum+(isCardInvoiceReversal(row)?-1:1)*Number(row.amount||0),0);
}

// The payment queue is current and independent of the dashboard's selected month.
// Keep one oldest unpaid invoice per card; partial payments never advance the queue.
export function buildDashboardCardView({cards=[],installments=[],invoiceStatuses=[],today=new Date()}={}){
  const invoices=cards.flatMap(card=>buildCardInvoices(card,installments,invoiceStatuses,cardToday(today)));
  const pending=invoices.filter(invoice=>Number(invoice.balanceDue)>0);
  const priorityInvoices=cards.map(card=>pending.filter(invoice=>invoice.card.id===card.id)
    .sort((a,b)=>a.invoiceMonth.localeCompare(b.invoiceMonth)||a.dueOn.localeCompare(b.dueOn))[0]).filter(Boolean)
    .sort((a,b)=>a.dueOn.localeCompare(b.dueOn)||a.invoiceMonth.localeCompare(b.invoiceMonth)||String(a.card.id).localeCompare(String(b.card.id)));
  const payableTotal=priorityInvoices.reduce((sum,invoice)=>sum+Math.round(invoice.balanceDue*100),0)/100;
  return {invoices,priorityInvoices,payableTotal};
}

export function buildDashboardCashView({cash,transactions=[],invoiceSummaries=[],refDate=new Date(),today=new Date()}){
  const paidCardPayments=sumPaidCardPaymentsForMonth(transactions,refDate,today);
  const end=new Date(refDate.getFullYear(),refDate.getMonth()+1,0,12);
  const forecastThrough=`${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
  // Include every outstanding invoice due through the selected month, including overdue
  // invoices. Use the remaining balance only: payments already posted are in cash.balance.
  const forecastInvoices=invoiceSummaries.filter(invoice=>Number(invoice.balanceDue)>0&&/^\d{4}-\d{2}-\d{2}$/.test(invoice.dueOn)&&invoice.dueOn<=forecastThrough);
  const openCardTotal=forecastInvoices.reduce((sum,invoice)=>sum+Math.round(invoice.balanceDue*100),0)/100;
  const expensePaid=Number(cash?.expense||0)+paidCardPayments;
  const result=Number(cash?.income||0)+Number(cash?.transferIn||0)+Number(cash?.cardRefundCash||0)-expensePaid-Number(cash?.allocation||0)-Number(cash?.transferOut||0);
  const projected=Math.round((Number(cash?.projectedCashBalance||0)-openCardTotal)*100)/100;
  return {paidCardPayments,openCardTotal,expensePaid,result,projected,forecastInvoices,forecastThrough};
}

export function paidInvoiceMonthsForPurchase(installments=[],invoiceStatuses=[],purchaseId=''){
  const paid=new Set((invoiceStatuses||[]).filter(row=>(row?.status==='paid'||row?.settled_at||Number(row?.paid_amount)>0)).map(row=>`${row.card_id}|${row.invoice_month}`));
  return [...new Set((installments||[])
    .filter(row=>row?.purchase_id===purchaseId&&paid.has(`${row.card_id}|${row.invoice_month}`))
    .map(row=>row.invoice_month))];
}

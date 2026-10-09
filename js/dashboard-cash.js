import { isCardInvoicePayment } from './financial-ledger.js';
function monthPrefix(refDate){
  return `${refDate.getFullYear()}-${String(refDate.getMonth()+1).padStart(2,'0')}`;
}


export function sumPaidCardPaymentsForMonth(transactions=[],refDate=new Date(),today=new Date()){
  const prefix=monthPrefix(refDate);
  const todayISO=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  return (transactions||[])
    .filter(isCardInvoicePayment)
    .filter(row=>String(row.occurred_on||'').startsWith(prefix))
    .filter(row=>String(row.occurred_on||'')<=todayISO)
    .reduce((sum,row)=>sum+Number(row.amount||0),0);
}

export function buildDashboardCashView({cash,transactions=[],invoiceSummaries=[],refDate=new Date(),today=new Date()}){
  const paidCardPayments=sumPaidCardPaymentsForMonth(transactions,refDate,today);
  const openCardTotal=(invoiceSummaries||[])
    .filter(summary=>summary?.status!=='paid')
    .reduce((sum,summary)=>sum+Number(summary?.total||0),0);
  const expensePaid=Number(cash?.expense||0)+paidCardPayments;
  const result=Number(cash?.income||0)+Number(cash?.transferIn||0)-expensePaid-Number(cash?.allocation||0)-Number(cash?.transferOut||0);
  const projected=Number(cash?.projectedCashBalance||0)-openCardTotal;
  return {paidCardPayments,openCardTotal,expensePaid,result,projected};
}

export function paidInvoiceMonthsForPurchase(installments=[],invoiceStatuses=[],purchaseId=''){
  const paid=new Set((invoiceStatuses||[]).filter(row=>row?.status==='paid').map(row=>`${row.card_id}|${row.invoice_month}`));
  return [...new Set((installments||[])
    .filter(row=>row?.purchase_id===purchaseId&&paid.has(`${row.card_id}|${row.invoice_month}`))
    .map(row=>row.invoice_month))];
}

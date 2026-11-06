import { invoiceComposition } from './total-composition.js?v=2.9.35';
import { cardAdjustmentLabel } from './card-domain.js?v=2.9.35';

// Presentation of the existing ledger; the persisted invoice remains authoritative.
export function invoiceWorkspaceModel(invoice, adjustments=[], payments=[]) {
 const total=invoiceComposition(invoice,adjustments,payments);
 const paid=invoiceComposition(invoice,adjustments,payments,'paid');
 const ownAdjustments=adjustments.filter(row=>row.card_id===invoice.card.id&&row.invoice_month===invoice.invoiceMonth);
 const adjustmentIds=new Set(ownAdjustments.map(row=>'adjustment:'+row.id));
 const isAdjustment=row=>adjustmentIds.has(row.id)||['persisted-adjustments','persisted-total'].includes(row.id);
 const purchases=total.rows.filter(row=>!isAdjustment(row)).map(row=>{
  const source=invoice.rows.find(item=>'installment:'+item.id===row.id||'opening:'+item.id===row.id);
  return {...row,kind:source?.ff2_card_purchases?.record_kind==='invoice_opening'?'opening':source?'purchase':'history',source};
 });
 const adjustmentRows=total.rows.filter(isAdjustment).map(row=>({...row,kind:'adjustment',source:ownAdjustments.find(item=>'adjustment:'+item.id===row.id)}));
 // Cash refunds and limit releases are historical events even when invoice_effect is zero.
 for(const source of ownAdjustments)if(!adjustmentRows.some(row=>row.id==='adjustment:'+source.id))adjustmentRows.push({id:'adjustment:'+source.id,label:source.reason||cardAdjustmentLabel(source.kind),amount:0,meta:'Sem efeito no total desta fatura',kind:'adjustment',source});
 const paymentRows=paid.rows.map(row=>({...row,kind:'payment',source:payments.find(item=>'payment:'+item.id===row.id)}));
 for(const source of payments.filter(row=>row.invoice_id===invoice.id&&row.reversed_at))paymentRows.push({id:'payment:'+source.id,label:'Pagamento revertido',amount:0,meta:source.reversal_reason||'Excluído do total pago',kind:'payment',source});
 const sum=rows=>Math.round(rows.reduce((value,row)=>value+row.amount,0)*100)/100;
 return {purchases,payments:paymentRows,adjustments:adjustmentRows,base:sum(purchases),adjustmentsTotal:sum(adjustmentRows),paidTotal:sum(paymentRows),total:total.total,hasOpening:purchases.some(row=>row.kind==='opening')};
}

export function invoiceWorkspacePage(rows=[], page=0) {
 const pages=Math.max(1,Math.ceil(rows.length/4));
 const index=Math.max(0,Math.min(Number.isFinite(page)?Math.trunc(page):0,pages-1));
 return {rows:rows.slice(index*4,index*4+4),page:index,pages,total:rows.length};
}

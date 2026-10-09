// Revisão assistida: nenhuma destas funções altera dados ou cria transferências.
import { classifyTransaction, isBalanceAdjustment, isCardInvoicePayment } from './financial-ledger.js';
import { suggestNature } from './transaction-nature.js';
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value||''));
const cash = row => Math.round(Math.abs(Number(row?.amount)||0)*100);
const utcDay = value => Date.parse(String(value)+'T12:00:00Z')/86400000;
export function needsLegacyReview(row){
  return !!row && !row.financial_nature && !isBalanceAdjustment(row) && !isCardInvoicePayment(row) && Number(row.direction)!==0;
}
export function legacyReview(rows=[]){
  return (rows||[]).filter(needsLegacyReview).map(row=>({
    id:row.id, date:row.occurred_on,description:row.description,amount:Number(row.amount||0),
    current:classifyTransaction(row),suggestion:suggestNature(row.description,row.category),
    // Sugestão é informativa: usar o botão Editar para confirmar.
    needsConfirmation:true
  }));
}
export function ownTransferReview(rows=[],{daysApart=1}={}){
  const movements=(rows||[]).filter(row=>row.financial_nature==='transfer' && !isBalanceAdjustment(row) && validDate(row.occurred_on) && Number(row.amount)>0 && [1,-1].includes(Number(row.direction)));
  const outs=movements.filter(row=>Number(row.direction)===-1).sort((a,b)=>String(a.occurred_on).localeCompare(String(b.occurred_on))||String(a.id).localeCompare(String(b.id)));
  const ins=movements.filter(row=>Number(row.direction)===1);
  const used=new Set(),pairs=[],unmatched=[],ambiguous=[];
  for(const out of outs){
    const candidates=ins.filter(row=>!used.has(row.id) && cash(row)===cash(out) && Math.abs(utcDay(row.occurred_on)-utcDay(out.occurred_on))<=daysApart && (!row.user_id||!out.user_id||row.user_id===out.user_id));
    const rival=candidates.filter(row=>outs.some(other=>other.id!==out.id&&cash(other)===cash(out)&&Math.abs(utcDay(row.occurred_on)-utcDay(other.occurred_on))<=daysApart));
    if(candidates.length===1 && rival.length===0){used.add(candidates[0].id);pairs.push({outId:out.id,inId:candidates[0].id,amount:Number(out.amount),date:out.occurred_on});}
    else if(candidates.length>0)ambiguous.push({id:out.id,amount:Number(out.amount),candidateIds:candidates.map(row=>row.id)});
    else unmatched.push(out);
  }
  unmatched.push(...ins.filter(row=>!used.has(row.id) && !ambiguous.some(item=>item.candidateIds.includes(row.id))));
  return {pairs,unmatched,ambiguous,matchedAmount:pairs.reduce((sum,p)=>sum+p.amount,0),
    note:'Conferência por valor e proximidade de datas; sem identificação de contas, pares são candidatos, não confirmação bancária.'};
}
export function reviewedPeriodRows(rows=[],monthKeys=[],today=new Date()){
  const keys=new Set(monthKeys.map(v=>String(v).slice(0,7)));
  const cutoff=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  return (rows||[]).filter(r=>validDate(r.occurred_on)&&keys.has(String(r.occurred_on).slice(0,7))&&r.occurred_on<=cutoff);
}

// Presentation model only; amounts and classifications come from the shared ledger.
export function buildDashboardOverview({transactions=[],ledger={},budget={},refDate=new Date(),today=new Date()}={}){
  const prefix=`${refDate.getFullYear()}-${String(refDate.getMonth()+1).padStart(2,'0')}`;
  const todayISO=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const recent=transactions.filter(t=>String(t.occurred_on||'').startsWith(prefix)&&String(t.occurred_on)<=todayISO)
    .slice().sort((a,b)=>String(b.occurred_on).localeCompare(String(a.occurred_on))||String(b.created_at||'').localeCompare(String(a.created_at||''))||String(b.id||'').localeCompare(String(a.id||''))).slice(0,5);
  let limitedSpent=0,unlimitedSpent=0;
  for(const [category,amount] of Object.entries(budget.spentMap||{})){
    if(Number(budget.itemMap?.[category]||0)>0)limitedSpent+=Number(amount||0);
    else unlimitedSpent+=Number(amount||0);
  }
  const limit=Number(budget.totalLimit||0);
  return {recent,allocationCount:(ledger.details||[]).filter(row=>row.kind==='allocation').length,
    limitedSpent,unlimitedSpent,percent:limit>0?Math.max(0,limitedSpent/limit*100):0};
}

import { buildFinancialMonthLedger } from './financial-ledger.js?v=2.9.20';
import { canonicalCategoryAmounts } from './category-alias.js?v=2.9.20';
export function spendingInPastMonths({transactions=[],installments=[],categories=[],months=[],today=new Date()}={}) {
 const out={};const monthly={};const monthlyCategoryTotals={};
 for(const month of [...new Set(months)]) {
  const ledger=buildFinancialMonthLedger({transactions,installments,monthKey:month,today});
  const map=canonicalCategoryAmounts(ledger.budgetUsageMap,categories);
  monthlyCategoryTotals[String(month).slice(0,7)]=map;
  monthly[String(month).slice(0,7)]=Object.values(map).reduce((a,b)=>a+b,0);
  for(const [cat,val] of Object.entries(map))out[cat]=(out[cat]||0)+val;
 }
 return {categoryTotals:out,monthTotals:monthly,monthlyCategoryTotals};
}

import { goalProgress } from './goal-integration.js?v=2.9.20';

// Saldo patrimonial confirmado, nunca o fluxo de aportes de um mês.
// Movimentos avulsos não confirmados ficam fora do valor para não duplicar a base manual das metas.
const cents = value => Math.round(Number(value || 0) * 100);
const money = value => Math.round(value) / 100;
const dayISO = value => typeof value === 'string' ? value : `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
export const RESERVE_TREATMENTS = Object.freeze(['separate','included']);

export function buildReservePosition({goals=[],transactions=[],today=new Date()}={}) {
  const asOf=dayISO(today);
  let goalCents=0,independentCents=0;
  const accountedGoals=[],archivedWithFunds=[],pending=[],independent=[],included=[];
  const seen = new Set();
  for(const goal of goals||[]) {
    const progress=goalProgress(goal,transactions,asOf);
    const row={goal,progress};
    if(goal.status==='archived') {
      if(cents(progress.saved)>0)archivedWithFunds.push(row);
      continue;
    }
    accountedGoals.push(row);
    goalCents+=cents(progress.saved);
  }
  for(const row of transactions||[]) {
    if(row.id != null) {if(seen.has(row.id))continue;seen.add(row.id);}
    if(row.goal_id || String(row.occurred_on||'')>asOf)continue;
    const isDeposit=row.financial_nature==='allocation'&&Number(row.direction)===-1;
    const isRescue=row.financial_nature==='resgate'&&Number(row.direction)===1;
    if(!isDeposit&&!isRescue)continue;
    const signed=isDeposit?cents(row.amount):-cents(row.amount);
    if(row.reserve_reconciliation==='separate') {
      independentCents+=signed;
      independent.push(row);
    } else if(row.reserve_reconciliation==='included'&&isDeposit) {
      included.push(row);
    } else {
      pending.push(row);
    }
  }
  pending.sort((a,b)=>String(b.occurred_on||'').localeCompare(String(a.occurred_on||'')) || String(b.created_at||'').localeCompare(String(a.created_at||'')));
  independent.sort((a,b)=>String(b.occurred_on||'').localeCompare(String(a.occurred_on||'')));
  const independentBalance=money(independentCents);
  return {
    asOf,
    goalBalance:money(goalCents),
    independentBalance,
    confirmedBalance:money(goalCents+independentCents),
    accountedGoals,archivedWithFunds,pending,independent,included,
    incomplete:pending.length>0||archivedWithFunds.length>0||independentCents<0,
    hasNegativeSeparateBalance:independentCents<0,
    pendingNet:money(pending.reduce((sum,row)=>sum+(row.financial_nature==='allocation'?cents(row.amount):-cents(row.amount)),0)),
  };
}

import {goalAppearance} from './goal-appearance.js?v=2.9.34';
import {goalIconSVG} from './goal-icons.js?v=2.9.34';
import {categoryIconSVG,CATEGORY_COLOR_OPTIONS} from './categories.js?v=2.9.34';
import {canonicalCategoryName} from './category-alias.js?v=2.9.34';
import { initTotalDetails } from './total-details.js?v=2.9.34';
import { composition,compositionRow,periodEntries,monthModel,transactionEntry,planningEntries,goalComposition,invoiceEntry } from './total-composition.js?v=2.9.34';
import { calculateCashStats,localISO,monthISO } from './finance.js?v=2.9.34';
import { cardInvoiceSummaries } from './cards.js?v=2.9.34';
import { buildDashboardCashView } from './dashboard-cash.js?v=2.9.34';
import { buildReservePosition } from './reserve-position.js?v=2.9.34';
import { buildFinancialMonthLedger,classifyTransaction } from './financial-ledger.js?v=2.9.34';
import { summarizePlanning } from './planning-v18.js?v=2.9.34';
import { monthLabel } from './ui.js?v=2.9.34';

export function initTotalWorkspace({getContext,onNavigate,verifyFamily}){
 const details=initTotalDetails({onNavigate,getAppearance:visualAppearance});
 const attach=(target,key,provider,label)=>details.attach(typeof target==='string'?document.querySelector(target):target,key,provider,label);
 const period=(state,date)=>({transactions:state.transactions,installments:state.installments,categories:state.categories,model:monthModel(date)});
 const plan=(items,field,title,date)=>{const summary=summarizePlanning(items);return composition(title,field==='pending'?summary.pendingIncome+summary.pendingExpense:summary[field],planningEntries(items,field),{subtitle:monthLabel(date),signed:['plannedResult'].includes(field),note:field==='pendingExpense'?'Somente despesas de consumo pendentes. Reservas, transferências, cancelados e adiados ficam fora.':field==='pendingIncome'?'Recebimentos pendentes do mês. Recebidos, cancelados e adiados ficam fora.':field==='deferred'?'Itens adiados no período selecionado.':field==='plannedResult'?'Receitas planejadas − despesas de consumo planejadas. Exclui cancelados e adiados.':field==='pending'?'Recebimentos e despesas de consumo pendentes. Reservas e transferências ficam fora deste valor.':'Somente planos ativos do período selecionado; cancelados e adiados ficam fora.'})};
 function visualAppearance(spec,key,row=null){
  const context=getContext(),shared=key.startsWith('family:'),data=shared?context.family?.data:null;
  const goals=shared?(data?.link?.can_view_goals?data.goals||[]:[]):context.state.goals;
  const transactions=shared?(data?.link?.can_view_transactions?data.transactions||[]:[]):context.state.transactions;
  const installments=shared?(data?.link?.can_view_cards?data.installments||[]:[]):context.state.installments;
  const categories=shared?data?.categories||[]:context.state.categories;
  const svg=name=>`<svg class="ui-icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  const title=spec.title.toLocaleLowerCase('pt-BR');
  let tone='neutral',icon=svg('wallet');
  if(/receita|receber|recebida/.test(title)){tone='income';icon=svg('trending-up');}
  else if(/despesa|pagar|gasto|consumo/.test(title)){tone='expense';icon=svg('receipt');}
  else if(/fatura|cartão|cartões|limite disponível|limite comprometido/.test(title)){tone='invoice';icon=svg('card');}
  else if(/reserv|invest|aporte/.test(title)){tone='reserve';icon=svg('piggy');}
  const selectedGoal=key.startsWith('goal:')?goals.find(goal=>goal.id===key.slice(5)):shared&&key.includes(':goal:')?goals.find(goal=>goal.id===key.split(':').at(-1)):null;
  if(selectedGoal){const appearance=goalAppearance(selectedGoal);tone=appearance.colorKey;icon=goalIconSVG(appearance.iconKey);}
  if(!row)return {tone,icon};
  const goalId=row.action?.kind==='goal'?row.action.id:row.id.startsWith('goal:')?row.id.slice(5):row.id.startsWith('shared-goal:')?row.id.slice(12):null;
  const goal=goals.find(goal=>goal.id===goalId);
  if(goal){const appearance=goalAppearance(goal);return {icon:goalIconSVG(appearance.iconKey),colorKind:tone==='reserve'?null:'goal',colorKey:appearance.colorKey};}
  if(row.action?.kind==='invoice'&&!row.action.purchaseId||row.id.startsWith('invoice:'))return {icon:svg('card')};
  const transactionId=row.action?.kind==='transaction'?row.action.id:row.id.startsWith('transaction:')?row.id.slice(12):null;
  const transaction=transactions.find(item=>item.id===transactionId);
  const part=installments.find(item=>row.id==='installment:'+item.id||row.action?.installmentId===item.id);
  const planId=row.action?.kind==='plan'?row.action.id:null;
  const plan=planId?[...(context.planningItems||[]),...(context.state.planning||[])].find(item=>item.id===planId):null;
  const record=transaction||plan||part?.ff2_card_purchases;
  if(record){
   const name=canonicalCategoryName(record.category||'Outros',categories),kind=Number(record.direction)>0?'income':'expense';
   const category=categories.find(item=>!item.is_deleted&&item.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR')&&(item.kind===kind||item.kind==='both'));
   if(category)return {icon:categoryIconSVG(category.icon_key||'tag'),colorKind:'category',colorKey:CATEGORY_COLOR_OPTIONS.some(([key])=>key===category.color_key)?category.color_key:'slate'};
  }
  return {icon:selectedGoal?goalIconSVG(goalAppearance(selectedGoal).iconKey):icon};
 }
 function home(field){
  const {state:s,dashboardDate:d}=getContext(),cash=calculateCashStats(s.transactions,d),inv=cardInvoiceSummaries(s.cards,s.installments,s.invoiceStatuses,d),view=buildDashboardCashView({cash,transactions:s.transactions,invoiceSummaries:inv,refDate:d}),base=period(s,d),month=monthISO(d),today=localISO();
  if(field==='income')return composition('Receitas realizadas',cash.income,periodEntries({...base,field:'income'}),{subtitle:monthLabel(d)});
  if(field==='expense'){
   const rows=periodEntries({...base,field:'cashExpense'});
   for(const t of s.transactions)if(String(t.occurred_on).startsWith(month.slice(0,7))&&t.occurred_on<=today){const kind=classifyTransaction(t);if(['card_payment','card_payment_reversal'].includes(kind))rows.push(transactionEntry(t,Number(t.amount)*(kind==='card_payment_reversal'?-1:1)))}
   return composition('Despesas pagas',view.expensePaid,rows,{subtitle:monthLabel(d),note:'Despesas à vista + pagamentos efetivos de fatura − pagamentos revertidos. As compras no cartão não são somadas novamente aqui.'});
  }
  if(field==='result')return composition('Resultado de caixa',view.result,periodEntries({...base,field:'cashResult'}),{subtitle:monthLabel(d),signed:true,note:'Receitas + transferências recebidas + devoluções em conta − despesas pagas − reservas − transferências enviadas. Ajustes de saldo ficam fora do resultado.'});
  if(field==='cards')return composition('Faturas do mês',inv.reduce((a,i)=>a+i.total,0),inv.map(i=>invoiceEntry(i)),{subtitle:monthLabel(d),note:'Totais das faturas registradas no mês, incluindo bases e ajustes confirmados.'});
  if(field==='projected'){
   const future=s.transactions.filter(t=>String(t.occurred_on).startsWith(month.slice(0,7))&&t.occurred_on>today&&/^\d{4}-\d{2}-\d{2}$/.test(t.occurred_on));
   return composition('Saldo previsto',view.projected,[compositionRow('balance','Saldo disponível hoje',cash.balance,'Todos os períodos até hoje'),...future.map(t=>transactionEntry(t)),...inv.filter(i=>i.status!=='paid').map(i=>invoiceEntry(i,-i.balanceDue,'Fatura aberta · '+i.card.name))],{subtitle:monthLabel(d),signed:true,note:'Saldo atual + lançamentos futuros registrados no mês − saldos de faturas abertas do mês. Os planos pendentes não são somados.'});
  }
  if(field==='reserve'){
   const position=buildReservePosition({goals:s.goals,transactions:s.transactions,today});
   const rows=position.accountedGoals.map(({goal,progress})=>compositionRow('goal:'+goal.id,goal.name,progress.saved,'Saldo atual da meta',{kind:'goal',id:goal.id}));
   rows.push(...position.independent.map(t=>transactionEntry(t,t.financial_nature==='allocation'?Number(t.amount):-Number(t.amount))));
   return composition('Saldo reservado confirmado',position.confirmedBalance,rows,{subtitle:'Até '+today.split('-').reverse().join('/'),signed:true,warning:[position.pending.length?`${position.pending.length} movimentos pendentes fora do total`:null,position.archivedWithFunds.length?`${position.archivedWithFunds.length} metas arquivadas com saldo fora do total`:null].filter(Boolean).join(' · '),note:'Metas não arquivadas + reservas independentes confirmadas − resgates independentes. '+position.pending.length+' movimentos não conciliados e '+position.archivedWithFunds.length+' metas arquivadas com saldo ficam fora deste total.'});
  }
 }
 function wireHome(){
  for(const [id,field]of [['stat-income','income'],['stat-expense','expense'],['stat-month-result','result'],['stat-projected','projected'],['stat-card-expense','cards']])attach('#'+id,'home:'+field,()=>home(field),({income:'Receitas realizadas',expense:'Despesas pagas',result:'Resultado de caixa',projected:'Saldo previsto',cards:'Faturas do mês'})[field]);
  attach('#stat-allocation','home:reserve',()=>home('reserve'),'Investido / reservado');
  attach('#home-planning-pending','home:plans',()=>{const {state:s,dashboardDate:d}=getContext();return plan(s.planning,'pendingExpense','A pagar',d)});
 }
 function wirePlanning(){
  for(const [id,field,title]of [['planning-pending-income','pendingIncome','A receber'],['planning-pending-expense','pendingExpense','A pagar'],['planning-income','plannedIncome','Receitas planejadas'],['planning-expense','plannedExpense','Despesas planejadas'],['planning-result','plannedResult','Saldo planejado']]){
   const el=document.getElementById(id),target=id.includes('pending-')?el?.closest('.planning-metric'):el;
   attach(target,'planning:'+field,()=>{const c=getContext();return plan(c.planningItems,field,title,c.planningDate)},title);
  }
  for(const [id,field,title]of [['planning-allocation-realized','allocation','Reservado neste mês'],['planning-allocation-future','futureAllocation','Reservas futuras registradas']])attach('#'+id,'planning:'+field,()=>{const {state:s,planningDate:d}=getContext(),ledger=buildFinancialMonthLedger({transactions:s.transactions,monthKey:d});return composition(title,ledger[field],periodEntries({...period(s,d),field}),{subtitle:monthLabel(d),note:'Somente aportes registrados em lançamentos. Previsões pendentes do Planejamento ficam fora deste total.'})});
  const el=document.getElementById('planning-cash-projected'),d=getContext().planningDate;
  if(monthISO(d)===monthISO(new Date()))attach(el,'planning:cash',()=>{const {state:s,planningDate:d}=getContext(),cash=calculateCashStats(s.transactions,d);return composition('Projeção do saldo livre',cash.projectedCashBalance,[compositionRow('balance','Saldo atual',cash.balance,'Até hoje'),...s.transactions.filter(t=>String(t.occurred_on).startsWith(monthISO(d).slice(0,7))&&t.occurred_on>localISO()&&/^\d{4}-\d{2}-\d{2}$/.test(t.occurred_on)).map(t=>transactionEntry(t))],{subtitle:monthLabel(d),signed:true,note:'Saldo atual + lançamentos futuros deste mês. Inclui reservas futuras registradas; não soma planos pendentes nem desconta novamente faturas.'})});
  else if(el){delete el.dataset.totalDetail;el.classList.remove('total-detail-trigger');el.removeAttribute('role');el.removeAttribute('tabindex');el.removeAttribute('aria-haspopup');el.removeAttribute('aria-controls');el.removeAttribute('aria-label');}
 }
 function wireGoals(){
  for(const target of document.querySelectorAll('[data-total-goal]')){const id=target.dataset.totalGoal;attach(target,'goal:'+id,()=>{const s=getContext().state,g=s.goals.find(g=>g.id===id);return g?goalComposition(g,s.transactions):null})}
 }
 function wireAnalytics(a,b,labels,planningByMonth,keys){
  details.clear('analysis:');const s=getContext().state;
  const bindings={Receitas:'income',Despesas:'totalExpense',Resultado:'result',Cartão:'cardExpense','Gasto no cartão':'cardExpense','Gasto total':'totalExpense','Gasto realizado':'totalExpense','Despesas de consumo':'totalExpense','Reservas e investimentos':'allocation','Receitas reconhecidas':'income','Resultado antes dos aportes':'result','Resultado de consumo':'result','Aportes futuros registrados':'futureAllocation'};
  for(const target of document.querySelectorAll('#analytics-content [data-analysis-metric]')){
   const label=target.dataset.analysisMetric,field=bindings[label];
   if(field)attach(target,'analysis:'+label,()=>composition(label,a.totals[field],periodEntries({transactions:s.transactions,installments:s.installments,categories:s.categories,model:a,field}),{subtitle:labels.a,signed:field==='result',note:'Somente os registros do período e corte de data selecionados. Pagamento de fatura não é somado como nova despesa de consumo.'}),label);
   else if(['Receitas planejadas','Despesas planejadas','Saldo planejado','Pendentes','Entradas planejadas','Valor adiado'].includes(label)){
    const field=({'Receitas planejadas':'plannedIncome','Entradas planejadas':'plannedIncome','Despesas planejadas':'plannedExpense','Saldo planejado':'plannedResult','Pendentes':'pending','Valor adiado':'deferred'})[label],items=keys.flatMap(key=>planningByMonth[key]||[]);
    attach(target,'analysis:'+label,()=>({...plan(items,field,label,new Date(keys[0]+'T12:00:00')),subtitle:labels.a}),label);
   }else if(['Limites planejados','Saldo dos limites'].includes(label)){
    const rows=a.months.flatMap(m=>(m.budget?.categories||[]).filter(c=>c.limitDefined||c.limit>0).map(c=>compositionRow('limit:'+m.key+':'+c.category,c.category,c.limit,m.label)));
    if(label==='Saldo dos limites')rows.push(...periodEntries({transactions:s.transactions,installments:s.installments,categories:s.categories,model:a,field:'totalExpense'}).map(r=>({...r,amount:-r.amount})));
    const value=a.months.reduce((sum,m)=>sum+Number(m.budget?.totalLimit||0),0)-(label==='Saldo dos limites'?a.totals.totalExpense:0);
    attach(target,'analysis:'+label,()=>composition(label,value,rows,{subtitle:labels.a,signed:label==='Saldo dos limites',note:'Limites definidos no período'+(label==='Saldo dos limites'?' − despesas realizadas no mesmo período.':'.')}),label);
   }
  }
 }
 function wireFamily(){
  details.clear('family:');const {family:f}=getContext();if(!f?.data?.link)return;
  const owner=f.owner,signature=f.signature,link=f.data.link;
  const guard=async()=>{const c=getContext().family;return c?.owner===owner&&c.signature===signature&&await verifyFamily()&&getContext().family?.owner===owner&&getContext().family?.signature===signature};
  const source=()=>{const c=getContext().family;if(c?.owner!==owner||c.signature!==signature)return null;return c};
  function familySpec(field,title,cardId=null){
   const c=source();if(!c)return null;
   const data=c.data,tx=link.can_view_transactions?data.transactions||[]:[],parts=link.can_view_cards?data.installments||[]:[];
   if(field==='income'&&!link.can_view_transactions||field==='cardExpense'&&!link.can_view_cards||field==='totalExpense'&&!link.can_view_transactions&&!link.can_view_cards)return null;
   const ledger=buildFinancialMonthLedger({transactions:tx,installments:parts,invoiceStatuses:data.invoiceStatuses||[],monthKey:data.month});
   const model={months:[ledger]},rows=periodEntries({transactions:tx,installments:parts,model,field,cardId});
   // Family rows remain read-only; they never navigate into the viewer's editing flows.
   for(const row of rows)row.action=null;
   const total=cardId?rows.reduce((sum,r)=>sum+r.amount,0):ledger[field];
   return composition(title,total,rows,{subtitle:monthLabel(c.date)+' · compartilhado',signed:field==='result',guard,note:'Somente grupos autorizados pelo titular. Esta consulta não permite editar os dados compartilhados.'});
  }
  const fields={income:['income','Receitas'],expense:['totalExpense','Despesas'],result:['result','Resultado'],card:['cardExpense','Cartão no mês']};
  for(const target of document.querySelectorAll('[data-family-money-key]')){const item=fields[target.dataset.familyMoneyKey];if(item)attach(target,'family:'+owner+':'+item[0],()=>familySpec(...item),item[1])}
  for(const [i,target]of [...document.querySelectorAll('#family-profile-cards .family-read-card>strong')].entries()){const card=f.data.cards?.[i];if(card)attach(target,'family:'+owner+':card:'+card.id,()=>familySpec('cardExpense',card.name,card.id),card.name)}
  const limits=()=>{const c=source();if(!c||!link.can_view_budget)return null;return composition('Limites compartilhados',c.model.budgetLimit,(c.data.budget?.items||[]).map(i=>compositionRow('limit:'+i.id,i.category,Math.max(0,Number(i.limit_amount)||0),'Limite mensal compartilhado')),{subtitle:monthLabel(c.date),guard,note:'O titular compartilhou os limites. Isso não concede acesso a lançamentos ou despesas de outros grupos.'})};
  attach('#family-profile-budget .family-read-total>strong','family:'+owner+':limits',limits);
  for(const target of document.querySelectorAll('#family-monitor-extras .family-monitor-extra')){const label=target.querySelector('span')?.textContent;if(label==='Cartão no mês')attach(target.querySelector('strong'),'family:'+owner+':card-extra',()=>familySpec('cardExpense','Cartão no mês'));if(label==='Limites do mês')attach(target.querySelector('strong'),'family:'+owner+':limits-extra',limits)}
  for(const g of f.data.goals||[]){
   const key='family:'+owner+':goal:'+g.id;
   const provider=()=>{const c=source();if(!c||!link.can_view_goals)return null;const status=(c.data.goalStatus||[]).find(r=>r.goal_id===g.id),saved=Number(status?.saved??g.saved_amount??0);return composition(g.name,saved,[compositionRow('shared-goal:'+g.id,'Saldo compartilhado da meta',saved,'Valor atual autorizado pelo titular')],{subtitle:'Meta compartilhada',guard,note:'Este acesso informa o saldo da meta. O histórico completo dos aportes não foi carregado; não é possível deduzi-lo a partir dos lançamentos de um único mês.'})};
   details.register(key,provider);
   const target=[...document.querySelectorAll('[data-total-family-goal]')].find(el=>el.dataset.totalFamilyGoal===g.id);if(target)attach(target,key,null,g.name);
  }

 }
 return {...details,wireHome,wirePlanning,wireGoals,wireAnalytics,wireFamily};
}

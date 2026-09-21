import { signIn,signUp,signOut,getSession,onAuthChange } from './auth.js';
import { ensureProfile,foundationHealthCheck } from './database.js';
import { listFamilyData,sendFamilyInvite,respondFamilyInvite,cancelFamilyInvite,updateFamilyPermissions,removeFamilyLink,loadFamilyOverview,subscribeFamilyOverview } from './family.js?v=family-monitor-v17';
import { getLegacyMigrationStatus,claimLegacyAccount } from './migration.js';
import { updateProfileSettings } from './settings.js';
import { initPWA } from './pwa.js';
import { DEFAULT_CATEGORIES,localISO,listTransactions,createTransaction,updateTransaction,deleteTransaction,applyBalanceAdjustment,calculateCashStats,filterTransactions } from './finance.js';
import { listCards,createCard,updateCard,deleteCard,createPurchase,updatePurchase,deletePurchase,listPurchases,listInstallments,listInvoiceStatuses,setInvoicePaid,sumCardExpensesForMonth,cardInvoiceSummaries } from './cards.js';
import { listGoals,createGoal,updateGoal,deleteGoal } from './goals.js';
import { BUDGET_CATEGORIES,getBudget,listBudgetsByMonths,saveBudget,budgetSummary } from './budget.js';
import { planningMonthKey,planningMonthDate,shiftPlanningMonth,planningMonthInput,planningLocalISO,listPlanningMonth,listPlanningByMonths,createPlanningItem,updatePlanningItem,cancelPlanningItem,completePlanningItem,movePlanningItem,movePendingPlanningMonth,planningNextMonthDate,planningStatusLabel,summarizePlanning,summarizePlanningPeriod } from './planning-v18.js?v=18';
import { listNotifications,markNotificationRead,markAllNotificationsRead,markNotificationsForTarget,syncFinancialNotifications,subscribeNotifications } from './notifications.js';
import { setAuthMode,showAuth,showApp,showModule,setAuthError,setAuthBusy,setAppBusy,toast,setLoading,formatBRL,formatDate,monthLabel,escapeHTML,openDialog,closeDialog,setFormError,emptyState,applyTheme,captureDashboardMoneyState,prepareDashboardMoneyChange,playDashboardMoneyChange,settleDashboardMoneyChange } from './ui.js?v=motion-v15';
import { getMonthlyDRE,getReportMonthOptions,downloadFinancialReportPDF } from './reports.js';
import { beginDownloadMotion } from './download-motion-v16.js?v=16';
import { familyMonthKey,familyDateFromMonth,shiftFamilyMonth,buildFamilyMonitorModel,filterFamilyTransactions,captureFamilyMetricState,animateFamilyMetricChange } from './family-monitor-v17.js?v=17';
import { analysisMonthKey,analysisMonthDate,shiftAnalysisMonth,yearMonthKeys,availableAnalysisYears,buildAnalysisPeriod,comparePeriodTotals,compareCategories,compareCards,aggregateBudgetComparison,strongestCategoryChanges,buildMonthlyInsights,buildYearInsights } from './analytics.js';

let authMode='login', authBusy=false, appActionBusy=false, reportDownloadBusy=false, enterAppPromise=null, refreshBusy=false, bootstrapGeneration=0, notificationChannel=null, familyMonitorChannel=null;
let currentUser=null, currentProfile=null;
let dashboardDate=new Date(new Date().getFullYear(),new Date().getMonth(),1,12);
let budgetDate=new Date(new Date().getFullYear(),new Date().getMonth(),1,12);
let familyMonitorOwnerId=null,familyMonitorDate=new Date(new Date().getFullYear(),new Date().getMonth(),1,12),familyMonitorFilter='all',familyMonitorData=null,familyMonitorModel=null,familyMonitorRequest=0,familyMonitorRefreshTimer=null;
let planningDate=new Date(new Date().getFullYear(),new Date().getMonth(),1,12),planningItems=[],planningTypeFilter='all',planningStatusFilter='all';
const familyMonitorMonths=new Map();
let reportReferenceDate=new Date(new Date().getFullYear(),new Date().getMonth(),1,12);
let state={transactions:[],cards:[],purchases:[],installments:[],invoiceStatuses:[],goals:[],budget:{plan:null,items:[]},planning:[],family:null,migration:{claimed:false},notifications:[]};

function categoryOptions(extra=''){
  const values=new Set(DEFAULT_CATEGORIES);
  (state.budget?.items||[]).forEach(item=>item?.category&&values.add(String(item.category).trim()));
  Object.keys(budgetDraft?.limits||{}).forEach(name=>name&&values.add(String(name).trim()));
  state.transactions.forEach(row=>row?.category&&values.add(String(row.category).trim()));
  state.purchases.forEach(row=>row?.category&&values.add(String(row.category).trim()));
  state.installments.forEach(row=>row?.ff2_card_purchases?.category&&values.add(String(row.ff2_card_purchases.category).trim()));
  planningItems.forEach(row=>row?.category&&values.add(String(row.category).trim()));
  (state.planning||[]).forEach(row=>row?.category&&values.add(String(row.category).trim()));
  if(extra)values.add(String(extra).trim());
  return [...values].filter(Boolean).sort((a,b)=>{
    const ai=DEFAULT_CATEGORIES.indexOf(a),bi=DEFAULT_CATEGORIES.indexOf(b);
    if(ai>=0||bi>=0){if(ai<0)return 1;if(bi<0)return -1;return ai-bi}
    return a.localeCompare(b,'pt-BR',{sensitivity:'base'});
  });
}
function fillCategorySelect(id,selected=''){const el=document.getElementById(id);if(!el)return;const value=selected||el.value||'';el.innerHTML=categoryOptions(value).map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');if(value)el.value=value}
function monthPrefix(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`}
function addMonth(date,offset){return new Date(date.getFullYear(),date.getMonth()+offset,1,12)}
function setButtonBusy(btn,busy,text='Salvando…'){if(!btn)return;if(busy){btn.dataset.oldText=btn.textContent;btn.textContent=text;btn.disabled=true}else{btn.textContent=btn.dataset.oldText||btn.textContent;btn.disabled=false}}
async function runAppOperation(title,message,task,{animateDashboard=false}={}){
  if(appActionBusy)return undefined;
  // Nenhuma operação começa em cima de um valor intermediário da animação anterior.
  settleDashboardMoneyChange();
  appActionBusy=true;
  const dashboardBefore=animateDashboard?captureDashboardMoneyState():null;
  let completed=false;
  let result;
  let preparedDashboardChange=null;
  setAppBusy(true,title,message);
  try{
    result=await task();
    completed=true;
    return result;
  }finally{
    // O refresh da operação já colocou os valores novos no DOM, porém ainda atrás do loading.
    // Reconstruímos o estado visual ANTES de fechar o loading e só então iniciamos a transição.
    if(completed&&dashboardBefore)preparedDashboardChange=prepareDashboardMoneyChange(dashboardBefore);
    setAppBusy(false);
    appActionBusy=false;
    if(preparedDashboardChange)requestAnimationFrame(()=>playDashboardMoneyChange(preparedDashboardChange));
  }
}
function syncOperationMessage(message='Conferindo e atualizando as informações exibidas.'){setAppBusy(true,'Sincronizando seus dados…',message)}

function renderBootstrapCore(){renderHome();renderTransactionPeriodOptions();renderTransactions();renderCards();renderGoals();renderBudget();renderPlanningHome()}

async function loadDeferredStartupData(generation){
  try{
    const [purchases,family,migration]=await Promise.all([listPurchases(),listFamilyData(),getLegacyMigrationStatus()]);
    if(generation!==bootstrapGeneration||!currentUser)return;
    state.purchases=purchases;state.family=family;state.migration=migration;
    renderCards();renderFamily();renderSettings();
  }catch(error){
    if(generation===bootstrapGeneration){console.warn('Dados secundários não carregados no primeiro momento:',error);toast('Algumas informações secundárias ainda não foram sincronizadas.','error')}
  }
}

async function loadNotificationStartupData(generation){
  try{
    await syncFinancialNotifications({budget:state.budget,transactions:state.transactions,installments:state.installments,cards:state.cards,invoiceStatuses:state.invoiceStatuses,goals:state.goals});
    const notifications=await listNotifications();
    if(generation!==bootstrapGeneration||!currentUser)return;
    state.notifications=notifications;
    renderNotifications();
    if(notificationChannel){try{await notificationChannel.unsubscribe()}catch{}notificationChannel=null}
    notificationChannel=await subscribeNotifications(async()=>{
      if(generation!==bootstrapGeneration||!currentUser)return;
      try{state.notifications=await listNotifications();renderNotifications()}catch(error){console.warn('Atualização de notificações:',error)}
    });
  }catch(error){
    if(generation===bootstrapGeneration)console.warn('Notificações não carregadas no primeiro momento:',error);
  }
}

async function enterApp(session){
  if(!session?.user)return;
  if(enterAppPromise)return enterAppPromise;
  const generation=++bootstrapGeneration;
  enterAppPromise=(async()=>{
    try{
      currentUser=session.user;
      await stopFamilyMonitorRealtime();familyMonitorOwnerId=null;familyMonitorData=null;familyMonitorModel=null;
      state={transactions:[],cards:[],purchases:[],installments:[],invoiceStatuses:[],goals:[],budget:{plan:null,items:[]},planning:[],family:null,migration:{claimed:false},notifications:[]};
      planningDate=new Date(dashboardDate);planningItems=[];
      const [profile,transactions,cards,installments,invoiceStatuses,goals,budget,planning]=await Promise.all([
        ensureProfile(session.user),listTransactions(),listCards(),listInstallments(),listInvoiceStatuses(),listGoals(),getBudget(budgetDate),listPlanningMonth(dashboardDate)
      ]);
      if(generation!==bootstrapGeneration)return;
      currentProfile=profile;
      state.transactions=transactions;state.cards=cards;state.installments=installments;state.invoiceStatuses=invoiceStatuses;state.goals=goals;state.budget=budget;state.planning=planning;planningItems=planning;
      showModule('home');renderBootstrapCore();renderSettings();showApp(session.user,currentProfile);
      void loadDeferredStartupData(generation);
      void loadNotificationStartupData(generation);
      void foundationHealthCheck(session.user.id).catch(error=>console.warn('Health check em segundo plano:',error));
    }catch(error){
      console.error(error);
      if(generation===bootstrapGeneration){showAuth();toast('Não foi possível carregar seus dados.','error')}
    }finally{
      enterAppPromise=null;
    }
  })();
  return enterAppPromise;
}

async function refreshAll(){if(refreshBusy)return;refreshBusy=true;setLoading(true);try{const [transactions,cards,purchases,installments,invoiceStatuses,goals,budget,planning,family,migration]=await Promise.all([listTransactions(),listCards(),listPurchases(),listInstallments(),listInvoiceStatuses(),listGoals(),getBudget(budgetDate),listPlanningMonth(dashboardDate),listFamilyData(),getLegacyMigrationStatus()]);state={transactions,cards,purchases,installments,invoiceStatuses,goals,budget,planning,family,migration,notifications:state.notifications||[]};if(planningMonthKey(planningDate)===planningMonthKey(dashboardDate))planningItems=planning;await syncFinancialNotifications({budget:state.budget,transactions:state.transactions,installments:state.installments,cards:state.cards,invoiceStatuses:state.invoiceStatuses,goals:state.goals});state.notifications=await listNotifications();renderAll()}catch(error){console.error(error);toast(error?.message||'Falha ao sincronizar dados.','error')}finally{setLoading(false);refreshBusy=false}}

function renderAll(){renderHome();renderTransactionPeriodOptions();renderTransactions();renderCards();renderGoals();renderBudget();renderPlanningHome();renderPlanning();renderFamily();renderSettings();renderNotifications();if(!document.getElementById('module-analytics')?.classList.contains('hidden'))void renderAnalytics()}

function renderHome(){
  document.getElementById('home-month-label').textContent=monthLabel(dashboardDate);document.getElementById('home-period').textContent=`Referência: ${monthLabel(dashboardDate)}`;
  const cash=calculateCashStats(state.transactions,dashboardDate);const cardExpense=sumCardExpensesForMonth(state.installments,dashboardDate);const result=cash.cashResult-cardExpense;const invoiceSummaries=cardInvoiceSummaries(state.cards,state.installments,state.invoiceStatuses,dashboardDate);const openCardTotal=invoiceSummaries.filter(s=>s.status!=='paid').reduce((sum,s)=>sum+s.total,0);const projected=cash.projectedCashBalance-openCardTotal;
  document.getElementById('stat-balance').textContent=formatBRL(cash.balance);document.getElementById('stat-income').textContent=formatBRL(cash.income);document.getElementById('stat-expense').textContent=formatBRL(cash.expense+cardExpense);document.getElementById('stat-card-expense').textContent=formatBRL(cardExpense);document.getElementById('stat-month-result').textContent=formatBRL(result);document.getElementById('stat-projected').textContent=formatBRL(projected);
  const recent=state.transactions.slice(0,5);document.getElementById('home-transactions').innerHTML=recent.length?recent.map(transactionRowHTML).join(''):emptyState('Nenhum lançamento nesta conta de testes.');
  const summaries=invoiceSummaries.filter(s=>s.total>0).sort((a,b)=>a.dueDate-b.dueDate).slice(0,4);document.getElementById('home-invoices').innerHTML=summaries.length?summaries.map(s=>`<div class="list-row"><div class="list-row-main"><div class="list-row-title">${escapeHTML(s.card.name)}</div><div class="list-row-meta"><span>Vence ${s.dueDate.toLocaleDateString('pt-BR')}</span><span>${s.status==='paid'?'Paga':'Aberta'}</span></div></div><div class="list-row-amount">${formatBRL(s.total)}</div></div>`).join(''):emptyState('Nenhuma fatura com valor neste mês.');
  const goals=state.goals.filter(g=>g.status!=='archived').slice(0,4);document.getElementById('home-goals').innerHTML=goals.length?goals.map(goalMiniHTML).join(''):emptyState('Nenhuma meta cadastrada.');
  const bs=budgetSummary(state.budget,state.transactions,state.installments,budgetDate);document.getElementById('home-budget-spent').textContent=formatBRL(bs.totalSpent);document.getElementById('home-budget-limit').textContent=`de ${formatBRL(bs.totalLimit)}`;document.getElementById('home-budget-caption').textContent=bs.totalLimit?`${Math.max(0,Math.min(100,(bs.totalSpent/bs.totalLimit)*100)).toFixed(0)}% utilizado`:'Nenhum orçamento definido.';document.getElementById('home-budget-progress').style.width=bs.totalLimit?`${Math.max(0,Math.min(100,(bs.totalSpent/bs.totalLimit)*100))}%`:'0%';
  renderPlanningHome();
}

function transactionRowHTML(t){const signed=Number(t.direction)*Number(t.amount||0);const isAdj=t.type==='balance_adjustment';return `<div class="list-row"><div class="list-row-main"><div class="list-row-title">${escapeHTML(t.description)}</div><div class="list-row-meta"><span>${escapeHTML(t.category||'Outros')}</span><span>${formatDate(t.occurred_on)}</span>${t.recurring_group_id?'<span>Recorrente</span>':''}${isAdj?'<span>Ajuste</span>':''}</div></div><div><div class="list-row-amount ${signed>=0?'positive':'negative'}">${signed>=0?'+':'-'} ${formatBRL(Math.abs(signed))}</div><div class="row-actions">${isAdj?'':`<button class="mini-btn" data-edit-transaction="${t.id}">Editar</button>`}<button class="mini-btn danger" data-delete-transaction="${t.id}">Excluir</button></div></div></div>`}
function renderTransactionPeriodOptions(){const select=document.getElementById('transaction-filter-month');if(!select)return;const current=select.value||'';const months=[...new Set(state.transactions.map(t=>String(t.occurred_on||'').slice(0,7)).filter(v=>/^\d{4}-\d{2}$/.test(v)))].sort().reverse();select.innerHTML='<option value="">Todos os períodos</option>'+months.map(value=>{const [y,m]=value.split('-').map(Number);return `<option value="${value}">${escapeHTML(monthLabel(new Date(y,m-1,1,12)))}</option>`}).join('');select.value=current&&months.includes(current)?current:'';}
function renderTransactions(){const search=document.getElementById('transaction-search').value||'';const type=document.getElementById('transaction-filter-type').value||'all';const month=document.getElementById('transaction-filter-month').value||'';const rows=filterTransactions(state.transactions,{search,type,month});const status=document.getElementById('transaction-sync-status');if(status){const filtered=search.trim()||type!=='all'||month;status.textContent=filtered?`Histórico sincronizado · ${state.transactions.length} no banco · ${rows.length} exibido(s)`:`Histórico sincronizado · ${state.transactions.length} lançamento(s) · Todos os períodos`;}document.getElementById('transactions-list').innerHTML=rows.length?rows.map(transactionRowHTML).join(''):emptyState('Nenhum lançamento encontrado.')}

function renderCards(){
  document.getElementById('cards-list').innerHTML=state.cards.length?state.cards.map(card=>{const all=state.installments.filter(i=>i.card_id===card.id);const paidMonths=new Set(state.invoiceStatuses.filter(x=>x.card_id===card.id&&x.status==='paid').map(x=>x.invoice_month));const outstanding=all.filter(i=>!paidMonths.has(i.invoice_month)).reduce((a,b)=>a+Number(b.amount||0),0);const available=Number(card.credit_limit)-outstanding;return `<article class="credit-card"><div class="credit-card-head"><div><span class="eyebrow">CARTÃO</span><h3>${escapeHTML(card.name)}</h3></div><span>${card.closing_day}/${card.due_day}</span></div><div class="credit-limit">${formatBRL(card.credit_limit)}</div><div class="credit-meta"><span>Comprometido ${formatBRL(outstanding)}</span><span>Disponível ${formatBRL(available)}</span><span>Juros ${Number(card.revolving_interest||0).toFixed(2)}%</span></div><div class="card-actions"><button class="mini-btn" data-new-purchase="${card.id}">＋ Compra</button><button class="mini-btn" data-open-invoice="${card.id}">Fatura</button><button class="mini-btn" data-edit-card="${card.id}">Editar</button><button class="mini-btn danger" data-delete-card="${card.id}">Excluir</button></div></article>`}).join(''):emptyState('Nenhum cartão cadastrado.');
  document.getElementById('card-purchases-list').innerHTML=state.purchases.length?state.purchases.map(p=>`<div class="list-row"><div class="list-row-main"><div class="list-row-title">${escapeHTML(p.description)}</div><div class="list-row-meta"><span>${escapeHTML(p.ff2_cards?.name||'Cartão')}</span><span>${formatDate(p.purchase_date)}</span><span>${p.installment_count}x</span><span>${escapeHTML(p.category||'Outros')}</span></div></div><div><div class="list-row-amount">${formatBRL(p.total_amount)}</div><div class="row-actions"><button class="mini-btn" data-edit-purchase="${p.id}">Editar</button><button class="mini-btn danger" data-delete-purchase="${p.id}">Excluir</button></div></div></div>`).join(''):emptyState('Nenhuma compra cadastrada.');
}

function goalMiniHTML(g){const pct=Math.max(0,Math.min(100,(Number(g.saved_amount)/Number(g.target_amount||1))*100));return `<div class="list-row"><div class="list-row-main"><div class="list-row-title">${escapeHTML(g.name)}</div><div class="progress"><span style="width:${pct}%"></span></div><div class="list-row-meta"><span>${pct.toFixed(0)}%</span><span>${formatBRL(g.saved_amount)} de ${formatBRL(g.target_amount)}</span></div></div></div>`}
function renderGoals(){document.getElementById('goals-list').innerHTML=state.goals.length?state.goals.map(g=>{const pct=Math.max(0,Math.min(100,(Number(g.saved_amount)/Number(g.target_amount||1))*100));return `<article class="goal-card"><div class="goal-card-head"><div><span class="eyebrow">${g.status==='completed'?'CONCLUÍDA':'META'}</span><h3>${escapeHTML(g.name)}</h3></div>${g.due_date?`<span>${formatDate(g.due_date)}</span>`:''}</div><div class="goal-amounts"><strong>${formatBRL(g.saved_amount)}</strong><span>de ${formatBRL(g.target_amount)}</span></div><div class="progress"><span style="width:${pct}%"></span></div><div class="progress-meta"><span>${pct.toFixed(0)}%</span><span>Faltam ${formatBRL(Math.max(0,Number(g.target_amount)-Number(g.saved_amount)))}</span></div><div class="card-actions"><button class="mini-btn" data-edit-goal="${g.id}">Editar</button><button class="mini-btn danger" data-delete-goal="${g.id}">Excluir</button></div></article>`}).join(''):emptyState('Nenhuma meta cadastrada.')}

let budgetDraft={income:0,limits:{}};
let budgetDraftDirty=false;
function cleanBudgetCategoryName(value){return String(value??'').replace(/\s+/g,' ').trim()}
function currentBudgetSummary(){return budgetSummary(state.budget,state.transactions,state.installments,budgetDate)}
function resetBudgetDraftFromState(){
  const limits={};
  (state.budget.items||[]).forEach(item=>{const name=cleanBudgetCategoryName(item.category);if(name)limits[name]=Math.max(0,Number(item.limit_amount||0))});
  budgetDraft={income:Math.max(0,Number(state.budget.plan?.planned_income||0)),limits};
  budgetDraftDirty=false;
}
function budgetDraftTotals(){
  const totalLimit=Object.values(budgetDraft.limits||{}).reduce((sum,value)=>sum+Math.max(0,Number(value||0)),0);
  const unassigned=Number(budgetDraft.income||0)-totalLimit;
  return{totalLimit,unassigned,distribution:budgetDraft.income>0?(totalLimit/budgetDraft.income)*100:0};
}
function budgetDisplayCategories(bs){
  const names=new Set([...Object.keys(budgetDraft.limits||{}),...Object.keys(bs.spentMap||{})]);
  return [...names].filter(cat=>Number(budgetDraft.limits?.[cat]||0)>0||Number(bs.spentMap?.[cat]||0)>0).sort((a,b)=>a.localeCompare(b,'pt-BR',{sensitivity:'base'}));
}
function budgetCategoryRow(cat,bs){
  const limit=Math.max(0,Number(budgetDraft.limits[cat]||0));
  const spent=Math.max(0,Number(bs.spentMap[cat]||0));
  const remaining=limit-spent;
  const percent=limit>0?(spent/limit)*100:(spent>0?100:0);
  const status=limit>0?(remaining>=0?`${formatBRL(remaining)} restante`:`${formatBRL(Math.abs(remaining))} acima`):'Sem limite';
  return `<article class="budget-simple-row ${limit>0&&spent>limit?'over':''}"><div class="budget-simple-row-main"><strong>${escapeHTML(cat)}</strong><small>${limit>0?`${formatBRL(spent)} de ${formatBRL(limit)} usados`:`${formatBRL(spent)} gastos · sem limite definido`}</small><div class="budget-simple-row-track"><span style="width:${Math.max(0,Math.min(100,percent))}%"></span></div></div><span class="budget-simple-row-status">${escapeHTML(status)}</span><button type="button" class="mini-btn" data-budget-edit="${escapeHTML(cat)}">Editar</button></article>`;
}
function renderBudgetDraft(){
  const bs=currentBudgetSummary();
  const {totalLimit,unassigned,distribution}=budgetDraftTotals();
  const active=budgetDisplayCategories(bs);
  document.getElementById('budget-planned-income').textContent=formatBRL(budgetDraft.income);
  document.getElementById('budget-total-limit').textContent=formatBRL(totalLimit);
  document.getElementById('budget-unassigned').textContent=formatBRL(Math.abs(unassigned));
  document.getElementById('budget-total-spent').textContent=formatBRL(bs.totalSpent);
  document.getElementById('budget-total-available').textContent=formatBRL(totalLimit-bs.totalSpent);
  const freeCard=document.getElementById('budget-free-card');
  freeCard?.classList.toggle('negative',unassigned<0);
  freeCard?.classList.toggle('positive',budgetDraft.income>0&&unassigned>=0);
  const freeLabel=document.getElementById('budget-free-label');
  if(freeLabel)freeLabel.textContent=unassigned<0?'Acima da renda':'Livre';
  const bar=document.getElementById('budget-income-progress');
  if(bar)bar.style.width=`${Math.max(0,Math.min(100,distribution))}%`;
  bar?.parentElement?.classList.toggle('over',distribution>100);
  document.getElementById('budget-distribution-percent').textContent=budgetDraft.income>0?`${Math.round(distribution)}%`:'0%';
  document.getElementById('budget-distribution-text').textContent=budgetDraft.income>0?`${formatBRL(totalLimit)} planejados de ${formatBRL(budgetDraft.income)}`:'Defina sua renda para começar.';
  const status=document.getElementById('budget-status-message');
  if(status){
    if(budgetDraft.income<=0)status.textContent='Defina sua renda mensal e depois escolha os limites das categorias.';
    else if(unassigned<0)status.textContent=`Os limites estão ${formatBRL(Math.abs(unassigned))} acima da sua renda.`;
    else if(Math.abs(unassigned)<0.005)status.textContent='Toda a renda foi planejada.';
    else status.textContent=`Você ainda tem ${formatBRL(unassigned)} livre para distribuir ou guardar.`;
  }
  document.getElementById('budget-items').innerHTML=active.length?active.map(cat=>budgetCategoryRow(cat,bs)).join(''):`<div class="empty-state budget-simple-empty"><strong>Nenhuma categoria planejada</strong><span>Adicione uma categoria com nome e limite ou use a calibração automática.</span></div>`;
  const hint=document.getElementById('budget-save-hint');
  if(hint)hint.textContent=budgetDraftDirty?'Há alterações que ainda não foram salvas.':'Tudo salvo.';
  document.querySelector('.budget-simple-save')?.classList.toggle('dirty',budgetDraftDirty);
}
function renderBudget(){
  document.getElementById('budget-month-label').textContent=monthLabel(budgetDate);
  resetBudgetDraftFromState();
  renderBudgetDraft();
}
function openBudgetCalibration(){
  document.getElementById('budget-calibration-income').value=budgetDraft.income||'';
  setFormError('budget-calibration-error','');
  openDialog('budget-calibration-dialog');
}
function applyManualBudgetCalibration(){
  const income=Math.max(0,Number(document.getElementById('budget-calibration-income').value||0));
  budgetDraft.income=income;
  budgetDraftDirty=true;
  closeDialog('budget-calibration-dialog');
  renderBudgetDraft();
  toast('Renda atualizada na tela. Agora ajuste as categorias e salve.','success');
}
function historicalBudgetSuggestion(){
  const income=Math.max(0,Number(document.getElementById('budget-calibration-income').value||0));
  if(income<=0){setFormError('budget-calibration-error','Informe sua renda antes de pedir uma sugestão.');return}
  const prefixes=[1,2,3].map(back=>monthPrefix(addMonth(budgetDate,-back)));
  const monthTotals=Object.fromEntries(prefixes.map(prefix=>[prefix,0]));
  const categoryTotals={};
  state.transactions.filter(t=>t.affects_month_result&&Number(t.direction)<0).forEach(t=>{const prefix=String(t.occurred_on||'').slice(0,7);if(!prefixes.includes(prefix))return;const cat=cleanBudgetCategoryName(t.category)||'Outros';categoryTotals[cat]=(categoryTotals[cat]||0)+Number(t.amount||0);monthTotals[prefix]+=Number(t.amount||0)});
  state.installments.forEach(i=>{const prefix=String(i.invoice_month||'').slice(0,7);if(!prefixes.includes(prefix))return;const cat=cleanBudgetCategoryName(i.ff2_card_purchases?.category)||'Outros';categoryTotals[cat]=(categoryTotals[cat]||0)+Number(i.amount||0);monthTotals[prefix]+=Number(i.amount||0)});
  const activeMonths=Object.values(monthTotals).filter(value=>value>0).length;
  if(!activeMonths){setFormError('budget-calibration-error','Ainda não há gastos suficientes nos 3 meses anteriores para montar uma sugestão.');return}
  const suggestionNames=new Set([...BUDGET_CATEGORIES,...Object.keys(budgetDraft.limits||{}),...Object.keys(categoryTotals)]);
  const suggestions={};
  suggestionNames.forEach(cat=>suggestions[cat]=Math.round((((categoryTotals[cat]||0)/activeMonths)*1.10)*100)/100);
  let total=Object.values(suggestions).reduce((a,b)=>a+b,0);
  if(total>income&&total>0){const factor=income/total;Object.keys(suggestions).forEach(cat=>suggestions[cat]=Math.round(suggestions[cat]*factor*100)/100)}
  budgetDraft.income=income;
  budgetDraft.limits={...budgetDraft.limits,...suggestions};
  budgetDraftDirty=true;
  closeDialog('budget-calibration-dialog');
  renderBudgetDraft();
  toast(`Sugestão baseada em ${activeMonths} ${activeMonths===1?'mês anterior':'meses anteriores'}. Revise e salve se fizer sentido.`,'success');
}
function restoreSavedBudgetDraft(){renderBudget();toast('Alterações descartadas.','success')}
function budgetCategoryDuplicate(name,original=''){
  const wanted=name.toLocaleLowerCase('pt-BR');
  return Object.keys(budgetDraft.limits||{}).some(cat=>cat!==original&&cat.toLocaleLowerCase('pt-BR')===wanted);
}
function updateBudgetCategoryDialog(){
  const original=document.getElementById('budget-category-original').value;
  const name=cleanBudgetCategoryName(document.getElementById('budget-category-name').value);
  const bs=currentBudgetSummary();
  const spentCategory=original||name;
  const spent=Math.max(0,Number(bs.spentMap[spentCategory]||0));
  document.getElementById('budget-category-spent').textContent=formatBRL(spent);
  const note=document.getElementById('budget-category-rename-note');
  const renamed=!!original&&!!name&&name.toLocaleLowerCase('pt-BR')!==original.toLocaleLowerCase('pt-BR');
  if(note){
    note.classList.toggle('hidden',!renamed);
    if(renamed)note.innerHTML=spent>0?`Já existem <strong>${escapeHTML(formatBRL(spent))}</strong> registrados em <strong>${escapeHTML(original)}</strong>. Alterar o nome aqui <strong>não modifica esses lançamentos</strong>; eles continuam na categoria antiga para preservar seu histórico.`:`O nome será alterado somente neste orçamento. Nenhum lançamento existente será modificado.`;
  }
}
function openBudgetCategoryEditor(category=''){
  const original=document.getElementById('budget-category-original');
  const name=document.getElementById('budget-category-name');
  const remove=document.getElementById('budget-category-remove');
  const title=document.getElementById('budget-category-dialog-title');
  const limit=document.getElementById('budget-category-limit');
  setFormError('budget-category-error','');
  original.value=category||'';
  name.value=category||'';
  if(category){
    const hasPlannedCategory=Object.prototype.hasOwnProperty.call(budgetDraft.limits,category);
    const spent=Math.max(0,Number(currentBudgetSummary().spentMap?.[category]||0));
    title.textContent=hasPlannedCategory?'Editar categoria':'Definir limite';
    limit.value=Number(budgetDraft.limits[category]||0)||'';
    remove.classList.toggle('hidden',!hasPlannedCategory);
    remove.textContent=spent>0?'Remover limite':'Remover do orçamento';
  }else{
    title.textContent='Nova categoria';
    limit.value='';
    remove.classList.add('hidden');
  }
  updateBudgetCategoryDialog();
  openDialog('budget-category-dialog');
  setTimeout(()=>name.focus(),40);
}
function applyBudgetCategoryDraft(){
  const original=document.getElementById('budget-category-original').value;
  const name=cleanBudgetCategoryName(document.getElementById('budget-category-name').value);
  const limit=Number(document.getElementById('budget-category-limit').value||0);
  setFormError('budget-category-error','');
  if(name.length<2||name.length>60){setFormError('budget-category-error','Digite um nome de categoria entre 2 e 60 caracteres.');return}
  if(/[<>]/.test(name)){setFormError('budget-category-error','O nome da categoria contém caracteres não permitidos.');return}
  if(budgetCategoryDuplicate(name,original)){setFormError('budget-category-error',`A categoria “${name}” já está no orçamento.`);return}
  if(!Number.isFinite(limit)||limit<=0){setFormError('budget-category-error','Informe um limite mensal maior que zero.');return}
  if(original&&original!==name)delete budgetDraft.limits[original];
  budgetDraft.limits[name]=Math.round(limit*100)/100;
  budgetDraftDirty=true;
  closeDialog('budget-category-dialog');
  renderBudgetDraft();
  fillCategorySelect('transaction-category');
  fillCategorySelect('purchase-category');
  toast(original?(original===name?'Categoria atualizada.':'Categoria renomeada no orçamento. O histórico foi preservado.'):'Categoria adicionada ao orçamento.','success');
}
function removeBudgetCategoryLimit(){
  const original=document.getElementById('budget-category-original').value;
  if(!original||!Object.prototype.hasOwnProperty.call(budgetDraft.limits,original))return;
  delete budgetDraft.limits[original];
  budgetDraftDirty=true;
  closeDialog('budget-category-dialog');
  renderBudgetDraft();
  toast('Categoria removida do planejamento. Seus lançamentos permanecem intactos.','success');
}
function toggleBudgetAnalysis(){
  const panel=document.getElementById('budget-analysis-panel');
  const button=document.getElementById('budget-analysis-toggle');
  const hidden=panel.classList.toggle('hidden');
  button.textContent=hidden?'Ver análise do orçamento':'Ocultar análise do orçamento';
}



function renderPlanningHome(){
  const summary=summarizePlanning(state.planning||[]);const pendingTotal=summary.pendingExpense;
  const caption=document.getElementById('home-planning-caption'),amount=document.getElementById('home-planning-pending'),count=document.getElementById('home-planning-count');
  if(!caption||!amount||!count)return;
  amount.textContent=formatBRL(pendingTotal);
  count.textContent=`${summary.pendingCount} ${summary.pendingCount===1?'pendente':'pendentes'}`;
  caption.textContent=summary.pendingCount?`${formatBRL(summary.pendingIncome)} a receber · ${formatBRL(summary.pendingExpense)} a pagar`:'Nenhum compromisso pendente.';
}
function planningCurrentMonth(){const n=new Date();return new Date(n.getFullYear(),n.getMonth(),1,12)}
function planningSameMonth(a,b){return planningMonthKey(a)===planningMonthKey(b)}
function planningDefaultDate(){if(planningSameMonth(planningDate,planningCurrentMonth()))return planningLocalISO(new Date());return planningMonthKey(planningDate)}
function planningFilteredItems(){return planningItems.filter(item=>{if(planningTypeFilter==='income'&&Number(item.direction)!==1)return false;if(planningTypeFilter==='expense'&&Number(item.direction)!==-1)return false;if(planningStatusFilter==='pending'&&item.status!=='pending')return false;if(planningStatusFilter==='done'&&!['paid','received'].includes(item.status))return false;if(planningStatusFilter==='deferred'&&item.status!=='deferred')return false;if(planningStatusFilter==='cancelled'&&item.status!=='cancelled')return false;return true})}
function planningRowHTML(item){
  const dir=Number(item.direction)>0?'income':'expense',type=dir==='income'?'A receber':'A pagar',status=planningStatusLabel(item);let statusClass='';if(['paid','received'].includes(item.status))statusClass='done';else if(item.status==='deferred')statusClass='deferred';else if(item.status==='cancelled')statusClass='cancelled';
  const realized=item.realized_on?`<span>Realizado em ${formatDate(item.realized_on)}</span>`:'';
  let actions='';if(item.status==='pending'){const doneLabel=dir==='income'?'Recebido':'Pago';actions=`<button class="mini-btn" data-complete-planning="${item.id}">${doneLabel}</button><button class="mini-btn" data-edit-planning="${item.id}">Editar</button><button class="mini-btn" data-move-planning="${item.id}">Próximo mês</button><button class="mini-btn danger" data-cancel-planning="${item.id}">Cancelar</button>`}
  return `<article class="planning-row"><div class="planning-row-main"><div class="planning-row-title"><span class="planning-type ${dir}">${type}</span><strong>${escapeHTML(item.description)}</strong></div><div class="planning-row-meta"><span>${escapeHTML(item.category||'Outros')}</span><span>Previsto ${formatDate(item.planned_on)}</span>${realized}${item.notes?`<span>${escapeHTML(item.notes)}</span>`:''}</div></div><div class="planning-row-side"><strong class="${dir==='income'?'positive':'negative'}">${dir==='income'?'+':'-'} ${formatBRL(item.amount)}</strong><span class="planning-status ${statusClass}">${status}</span>${actions?`<div class="planning-actions">${actions}</div>`:''}</div></article>`;
}
function renderPlanning(){
  const label=document.getElementById('planning-month-label');if(!label)return;const summary=summarizePlanning(planningItems);
  label.textContent=monthLabel(planningDate);document.getElementById('planning-current')?.classList.toggle('hidden',planningSameMonth(planningDate,planningCurrentMonth()));
  document.getElementById('planning-income').textContent=formatBRL(summary.plannedIncome);document.getElementById('planning-expense').textContent=formatBRL(summary.plannedExpense);document.getElementById('planning-result').textContent=formatBRL(summary.plannedResult);document.getElementById('planning-result').className=summary.plannedResult>=0?'positive':'negative';
  document.getElementById('planning-income-detail').textContent=`${formatBRL(summary.pendingIncome)} ainda a receber`;document.getElementById('planning-expense-detail').textContent=`${formatBRL(summary.pendingExpense)} ainda a pagar`;document.getElementById('planning-completion').textContent=`${Math.round(summary.completionRate)}%`;document.getElementById('planning-completion-detail').textContent=`${summary.completedCount} de ${summary.completedCount+summary.pendingCount+summary.deferredCount} itens concluídos`;
  document.querySelectorAll('[data-planning-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.planningFilter===planningTypeFilter));const status=document.getElementById('planning-status-filter');if(status)status.value=planningStatusFilter;
  const rows=planningFilteredItems();document.getElementById('planning-list').innerHTML=rows.length?rows.map(planningRowHTML).join(''):emptyState('Nenhum item encontrado neste mês.');
  const footer=document.getElementById('planning-footer');footer?.classList.toggle('hidden',summary.pendingCount===0);if(summary.pendingCount){document.getElementById('planning-footer-text').textContent=`${summary.pendingCount} ${summary.pendingCount===1?'item ainda está':'itens ainda estão'} pendente${summary.pendingCount===1?'':'s'} em ${monthLabel(planningDate)}.`;document.getElementById('planning-move-all').textContent=`Mover pendentes para ${monthLabel(shiftPlanningMonth(planningDate,1))}`}
}
async function loadPlanningMonth(date=planningDate,{quiet=false}={}){
  planningDate=planningMonthDate(date);if(!quiet)setLoading(true);try{planningItems=await listPlanningMonth(planningDate);if(planningSameMonth(planningDate,dashboardDate)){state.planning=planningItems;renderPlanningHome()}renderPlanning()}finally{if(!quiet)setLoading(false)}
}
function openNewPlanning(){const form=document.getElementById('planning-form');form.reset();document.getElementById('planning-id').value='';document.getElementById('planning-dialog-title').textContent='Novo item';document.getElementById('planning-date').value=planningDefaultDate();fillCategorySelect('planning-category','Outros');setFormError('planning-form-error','');openDialog('planning-dialog')}
function openEditPlanning(id){const item=planningItems.find(row=>row.id===id);if(!item||item.status!=='pending')return;document.getElementById('planning-id').value=item.id;document.getElementById('planning-dialog-title').textContent='Editar item';document.getElementById('planning-direction').value=String(item.direction);document.getElementById('planning-description').value=item.description||'';document.getElementById('planning-amount').value=item.amount||'';document.getElementById('planning-date').value=item.planned_on;fillCategorySelect('planning-category',item.category||'Outros');document.getElementById('planning-notes').value=item.notes||'';setFormError('planning-form-error','');openDialog('planning-dialog')}
async function onPlanningSubmit(event){event.preventDefault();const btn=document.getElementById('planning-save-btn');setButtonBusy(btn,true);setFormError('planning-form-error','');try{const id=document.getElementById('planning-id').value;const input={direction:Number(document.getElementById('planning-direction').value),description:document.getElementById('planning-description').value,amount:Number(document.getElementById('planning-amount').value),date:document.getElementById('planning-date').value,category:document.getElementById('planning-category').value,notes:document.getElementById('planning-notes').value};if(!input.description.trim()||!input.date||input.amount<=0)throw new Error('Preencha descrição, data prevista e um valor maior que zero.');await runAppOperation(id?'Atualizando planejamento…':'Salvando planejamento…','Guardando esta previsão sem alterar seus lançamentos reais.',async()=>{if(id)await updatePlanningItem(id,input);else await createPlanningItem(input);closeDialog('planning-dialog');await loadPlanningMonth(planningDate,{quiet:true});toast(id?'Item atualizado.':'Item adicionado ao planejamento.','success')})}catch(error){console.error(error);setFormError('planning-form-error',error?.message||'Não foi possível salvar este item.')}finally{setButtonBusy(btn,false)}}
async function setPlanningMonth(date){if(appActionBusy)return;await runAppOperation('Carregando planejamento…',`Buscando as previsões de ${monthLabel(date)}.`,async()=>{await loadPlanningMonth(date,{quiet:true})})}
async function completePlanningAction(id){const item=planningItems.find(row=>row.id===id);if(!item||item.status!=='pending')return;const isIncome=Number(item.direction)>0,verb=isIncome?'recebido':'pago';if(!confirm(`Marcar ${item.description} como ${verb} hoje e registrar ${isIncome?'uma receita':'uma despesa'} de ${formatBRL(item.amount)}?`))return;await runAppOperation(isIncome?'Registrando recebimento…':'Registrando pagamento…',`Criando o lançamento real com a data de hoje e concluindo o item do planejamento.`,async()=>{await completePlanningItem(id,planningLocalISO(new Date()));await refreshAll();await loadPlanningMonth(planningDate,{quiet:true});toast(isIncome?'Recebimento registrado.':'Pagamento registrado.','success')},{animateDashboard:true})}
async function movePlanningAction(id){const item=planningItems.find(row=>row.id===id);if(!item||item.status!=='pending')return;const target=planningNextMonthDate(item.planned_on);if(!confirm(`Mover este item para ${monthLabel(planningMonthDate(target))}? O mês atual ficará registrado como adiado.`))return;await runAppOperation('Movendo planejamento…','Mantendo o histórico do mês original e criando o item pendente no mês seguinte.',async()=>{await movePlanningItem(id,target);await loadPlanningMonth(planningDate,{quiet:true});toast('Item movido para o próximo mês.','success')})}
async function cancelPlanningAction(id){const item=planningItems.find(row=>row.id===id);if(!item||item.status!=='pending')return;if(!confirm('Cancelar este item do planejamento?'))return;await runAppOperation('Cancelando item…','Mantendo o registro no histórico como cancelado.',async()=>{await cancelPlanningItem(id);await loadPlanningMonth(planningDate,{quiet:true});toast('Item cancelado.','success')})}
async function moveAllPlanningPending(){const summary=summarizePlanning(planningItems);if(!summary.pendingCount)return;const next=shiftPlanningMonth(planningDate,1);if(!confirm(`Mover ${summary.pendingCount} ${summary.pendingCount===1?'item pendente':'itens pendentes'} para ${monthLabel(next)}?`))return;await runAppOperation('Movendo pendências…','Transferindo os itens pendentes e preservando o histórico deste mês.',async()=>{const count=await movePendingPlanningMonth(planningDate,next);await loadPlanningMonth(planningDate,{quiet:true});toast(`${count} ${count===1?'item movido':'itens movidos'} para ${monthLabel(next)}.`,'success')})}
function planningAnalysisPanel(summary,label,actual){const statusTotal=summary.completedCount+summary.pendingCount+summary.deferredCount;return `<article class="panel-card analytics-chart-card"><div class="section-title"><div><h3>${escapeHTML(label)}</h3><p>Planejado x realizado no período.</p></div></div>${analysisComparisonBars([{label:'Receitas',a:summary.plannedIncome,b:actual.income},{label:'Despesas',a:summary.plannedExpense,b:actual.totalExpense},{label:'Resultado',a:summary.plannedResult,b:actual.result}],'Planejado','Real')}<div class="planning-analysis-status"><article><span>Concluídos</span><strong>${summary.completedCount}</strong></article><article><span>Pendentes</span><strong>${summary.pendingCount}</strong></article><article><span>Adiados</span><strong>${summary.deferredCount}</strong></article><article><span>Execução</span><strong>${statusTotal?Math.round(summary.completionRate):0}%</strong></article></div></article>`}


let analysisMode='months';
let analysisTab='overview';
let analysisRenderSeq=0;

function analysisInputMonth(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`}
function analysisInputDate(value){const [year,month]=String(value||'').split('-').map(Number);return new Date(year||new Date().getFullYear(),(month||1)-1,1,12)}
function analysisKeyFromInput(value){return `${String(value||'').slice(0,7)}-01`}
function analysisShortMoney(value){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',notation:'compact',maximumFractionDigits:1}).format(Number(value)||0)}
function analysisPercent(change){if(change?.percent===null)return 'novo';const value=Number(change?.percent||0);return `${value>0?'+':''}${value.toFixed(1)}%`}
function analysisMetric(label,change,{goodUp=true}={}){
  const delta=Number(change?.delta||0),percent=change?.percent;
  const neutral=Math.abs(delta)<0.005;
  const good=neutral?null:(goodUp?delta>0:delta<0);
  const cls=neutral?'neutral':(good?'positive':'negative');
  const caption=percent===null?(Number(change?.previous||0)===0&&Number(change?.current||0)>0?'Sem base anterior':'Sem variação'):`${analysisPercent(change)} vs comparação`;
  return `<article class="analytics-metric"><span>${escapeHTML(label)}</span><strong>${formatBRL(change?.current||0)}</strong><small class="${cls}">${escapeHTML(caption)}</small></article>`;
}
function analysisEmpty(title='Sem dados suficientes',text='Registre movimentações em mais períodos para visualizar esta comparação.'){
  return `<div class="analytics-empty"><svg class="ui-icon" aria-hidden="true"><use href="#i-analytics"></use></svg><strong>${escapeHTML(title)}</strong><span>${escapeHTML(text)}</span></div>`;
}
function analysisLegend(labelA,labelB){return `<div class="analytics-legend"><span><i class="analytics-key key-a"></i>${escapeHTML(labelA)}</span><span><i class="analytics-key key-b"></i>${escapeHTML(labelB)}</span></div>`}
function analysisComparisonBars(rows,labelA,labelB,labelKey='label'){
  if(!rows.length)return analysisEmpty('Nada para comparar','Não há valores nos períodos selecionados.');
  const max=Math.max(1,...rows.flatMap(row=>[Math.abs(Number(row.a||0)),Math.abs(Number(row.b||0))]));
  return `${analysisLegend(labelA,labelB)}<div class="analytics-hbars">${rows.map(row=>{
    const wa=Math.max(0,Math.min(100,Math.abs(Number(row.a||0))/max*100));
    const wb=Math.max(0,Math.min(100,Math.abs(Number(row.b||0))/max*100));
    return `<div class="analytics-hbar-row"><div class="analytics-hbar-label"><strong>${escapeHTML(row[labelKey]||'')}</strong><span>${formatBRL(row.a||0)} · ${formatBRL(row.b||0)}</span></div><div class="analytics-hbar-pair"><div><span class="bar-a" style="width:${wa}%"></span></div><div><span class="bar-b" style="width:${wb}%"></span></div></div></div>`;
  }).join('')}</div>`;
}
function analysisLineChart(months,series){
  if(!months?.length||!series?.length)return analysisEmpty();
  const width=900,height=300,left=54,right=18,top=18,bottom=50,plotW=width-left-right,plotH=height-top-bottom;
  const values=series.flatMap(item=>months.map(month=>Math.max(0,Number(item.value(month)||0))));
  const max=Math.max(1,...values);
  const x=index=>months.length===1?left+plotW/2:left+(index/(months.length-1))*plotW;
  const y=value=>top+plotH-(Math.max(0,Number(value||0))/max)*plotH;
  const grid=Array.from({length:5},(_,i)=>{const gy=top+(plotH/4)*i;const val=max*(1-i/4);return `<line x1="${left}" y1="${gy}" x2="${width-right}" y2="${gy}" class="chart-grid"/><text x="${left-8}" y="${gy+4}" text-anchor="end" class="chart-axis">${escapeHTML(analysisShortMoney(val))}</text>`}).join('');
  const labels=months.map((month,i)=>`<text x="${x(i)}" y="${height-18}" text-anchor="middle" class="chart-axis chart-month">${escapeHTML(month.date.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''))}</text>`).join('');
  const paths=series.map((item,sidx)=>{
    const points=months.map((month,i)=>`${x(i)},${y(item.value(month))}`);
    const circles=months.map((month,i)=>`<circle cx="${x(i)}" cy="${y(item.value(month))}" r="4" class="chart-point series-${sidx}"/>`).join('');
    return `<polyline points="${points.join(' ')}" class="chart-line series-${sidx}"/>${circles}`;
  }).join('');
  const legend=`<div class="analytics-chart-legend">${series.map((item,i)=>`<span><i class="series-dot series-${i}"></i>${escapeHTML(item.label)}</span>`).join('')}</div>`;
  return `${legend}<div class="analytics-svg-wrap"><svg class="analytics-line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolução financeira">${grid}${paths}${labels}</svg></div>`;
}
function analysisDonut(items,title='Distribuição'){
  const rows=(items||[]).filter(item=>Number(item.total||0)>0).slice(0,8);
  const total=rows.reduce((sum,item)=>sum+Number(item.total||0),0);
  if(total<=0)return analysisEmpty('Sem distribuição','Não há gastos para montar este gráfico.');
  const colors=['#ff7a00','#38c878','#4c9dff','#a779ff','#ff5d6c','#f2b84b','#43c6c8','#8e98a4'];
  const r=70,circ=2*Math.PI*r;let offset=0;
  const circles=rows.map((item,i)=>{const frac=Number(item.total||0)/total;const dash=frac*circ;const el=`<circle cx="100" cy="100" r="${r}" fill="none" stroke="${colors[i%colors.length]}" stroke-width="24" stroke-dasharray="${dash} ${circ-dash}" stroke-dashoffset="-${offset}"/>`;offset+=dash;return el}).join('');
  const legend=rows.map((item,i)=>`<div class="analytics-donut-item"><i style="background:${colors[i%colors.length]}"></i><span>${escapeHTML(item.category||item.name||'Outros')}</span><strong>${formatBRL(item.total||0)}</strong></div>`).join('');
  return `<div class="analytics-donut-layout"><div class="analytics-donut"><svg viewBox="0 0 200 200" role="img" aria-label="${escapeHTML(title)}"><g transform="rotate(-90 100 100)">${circles}</g><text x="100" y="95" text-anchor="middle" class="donut-caption">Total</text><text x="100" y="116" text-anchor="middle" class="donut-value">${escapeHTML(analysisShortMoney(total))}</text></svg></div><div class="analytics-donut-legend">${legend}</div></div>`;
}
function analysisInsightsHTML(items){return `<div class="analytics-insights">${(items||[]).map(text=>`<article><span class="analytics-insight-icon"><svg class="ui-icon" aria-hidden="true"><use href="#i-analytics"></use></svg></span><p>${escapeHTML(text)}</p></article>`).join('')}</div>`}
function analysisBudgetBars(summary,label){
  const rows=(summary?.categories||[]).filter(item=>item.limit>0||item.spent>0).slice(0,10);
  if(!rows.length)return analysisEmpty(`Sem orçamento em ${label}`,'Não há limites salvos nem gastos para comparar neste período.');
  const max=Math.max(1,...rows.flatMap(item=>[item.limit,item.spent]));
  return `<div class="analytics-budget-chart"><div class="analytics-chart-subtitle"><strong>${escapeHTML(label)}</strong><span>Limite x gasto real</span></div>${rows.map(item=>`<div class="analytics-budget-row"><div><strong>${escapeHTML(item.category)}</strong><span>${formatBRL(item.spent)} de ${formatBRL(item.limit)}</span></div><div class="analytics-budget-track"><span class="budget-limit" style="width:${Math.min(100,item.limit/max*100)}%"></span><span class="budget-spent ${item.spent>item.limit&&item.limit>0?'over':''}" style="width:${Math.min(100,item.spent/max*100)}%"></span></div></div>`).join('')}</div>`;
}
function analysisMonthKeysAround(endDate,count=6){return Array.from({length:count},(_,index)=>analysisMonthKey(shiftAnalysisMonth(endDate,index-count+1)))}
function analysisLabelForPeriod(mode,a,b){if(mode==='years')return {a:String(a),b:String(b)};return {a:monthLabel(analysisMonthDate(a)),b:monthLabel(analysisMonthDate(b))}}

function setupAnalyticsFilters(){
  const monthA=document.getElementById('analytics-month-a'),monthB=document.getElementById('analytics-month-b');
  const maxMonth=analysisInputMonth(new Date());
  if(monthA){monthA.max=maxMonth;if(!monthA.value)monthA.value=analysisInputMonth(dashboardDate)}
  if(monthB){monthB.max=maxMonth;if(!monthB.value)monthB.value=analysisInputMonth(addMonth(dashboardDate,-1))}
  const years=availableAnalysisYears(state.transactions,state.installments);
  const ya=document.getElementById('analytics-year-a'),yb=document.getElementById('analytics-year-b');
  const previousA=Number(ya?.value||new Date().getFullYear()),previousB=Number(yb?.value||new Date().getFullYear()-1);
  const options=years.map(year=>`<option value="${year}">${year}</option>`).join('');
  if(ya){ya.innerHTML=options;ya.value=years.includes(previousA)?String(previousA):String(years[0])}
  if(yb){yb.innerHTML=options;const fallback=years.find(year=>year!==Number(ya?.value))??years[0];yb.value=years.includes(previousB)?String(previousB):String(fallback)}
}

async function renderAnalytics(){
  const host=document.getElementById('analytics-content');if(!host)return;
  const seq=++analysisRenderSeq;
  setupAnalyticsFilters();
  const monthA=document.getElementById('analytics-month-a')?.value||analysisInputMonth(dashboardDate);
  const monthB=document.getElementById('analytics-month-b')?.value||analysisInputMonth(addMonth(dashboardDate,-1));
  const yearA=Number(document.getElementById('analytics-year-a')?.value||new Date().getFullYear());
  const yearB=Number(document.getElementById('analytics-year-b')?.value||yearA-1);
  const keysA=analysisMode==='years'?yearMonthKeys(yearA):[analysisKeyFromInput(monthA)];
  const keysB=analysisMode==='years'?yearMonthKeys(yearB):[analysisKeyFromInput(monthB)];
  const labels=analysisLabelForPeriod(analysisMode,analysisMode==='years'?yearA:keysA[0],analysisMode==='years'?yearB:keysB[0]);
  host.innerHTML='<div class="analytics-loading"><span class="auth-spinner" aria-hidden="true"></span><span>Montando a análise…</span></div>';
  try{
    let budgets={},planningByMonth={};
    if(analysisTab==='budget')budgets=await listBudgetsByMonths([...keysA,...keysB]);
    if(analysisTab==='planning')planningByMonth=await listPlanningByMonths([...keysA,...keysB]);
    if(seq!==analysisRenderSeq)return;
    const periodA=buildAnalysisPeriod({transactions:state.transactions,installments:state.installments,invoiceStatuses:state.invoiceStatuses,budgetsByMonth:budgets,monthKeys:keysA,monthLabel});
    const periodB=buildAnalysisPeriod({transactions:state.transactions,installments:state.installments,invoiceStatuses:state.invoiceStatuses,budgetsByMonth:budgets,monthKeys:keysB,monthLabel});
    const comparison=comparePeriodTotals(periodA,periodB);
    if(analysisTab==='overview'){
      const contextKeys=analysisMode==='years'?keysA:analysisMonthKeysAround(analysisInputDate(monthA),6);
      const context=buildAnalysisPeriod({transactions:state.transactions,installments:state.installments,invoiceStatuses:state.invoiceStatuses,monthKeys:contextKeys,monthLabel});
      const direct=[{label:'Receitas',a:periodA.totals.income,b:periodB.totals.income},{label:'Despesas',a:periodA.totals.totalExpense,b:periodB.totals.totalExpense},{label:'Cartões',a:periodA.totals.cardExpense,b:periodB.totals.cardExpense}];
      let insights;
      if(analysisMode==='years'){
        insights=buildYearInsights(periodA,yearA,formatBRL);
        const change=comparison.totalExpense;
        if(change.percent!==null)insights.unshift(`Os gastos de ${yearA} estão ${Math.abs(change.percent).toFixed(1)}% ${change.delta>=0?'acima':'abaixo'} de ${yearB}.`);
      }else insights=buildMonthlyInsights(periodA,periodB,labels.a,labels.b,formatBRL);
      host.innerHTML=`<div class="analytics-metrics">${analysisMetric('Receitas',comparison.income,{goodUp:true})}${analysisMetric('Despesas',comparison.totalExpense,{goodUp:false})}${analysisMetric('Resultado',comparison.result,{goodUp:true})}${analysisMetric('Cartão',comparison.cardExpense,{goodUp:false})}</div><div class="analytics-grid two"><article class="panel-card analytics-chart-card"><div class="section-title"><div><h3>Evolução</h3><p>${analysisMode==='years'?`Movimentação mensal de ${yearA}.`:'Últimos 6 meses até o período atual.'}</p></div></div>${analysisLineChart(context.months,[{label:'Receitas',value:m=>m.income},{label:'Despesas',value:m=>m.totalExpense}])}</article><article class="panel-card analytics-chart-card"><div class="section-title"><div><h3>Comparação direta</h3><p>${escapeHTML(labels.a)} × ${escapeHTML(labels.b)}</p></div></div>${analysisComparisonBars(direct,labels.a,labels.b)}</article></div><article class="panel-card analytics-insights-card"><div class="section-title"><div><h3>O que mudou</h3><p>Leitura automática baseada somente nos dados registrados.</p></div></div>${analysisInsightsHTML(insights)}</article>`;
    }else if(analysisTab==='categories'){
      const rows=compareCategories(periodA,periodB,10).map(item=>({...item,label:item.category}));
      const changes=strongestCategoryChanges(periodA,periodB);
      const topA=(periodA.categories||[])[0];
      host.innerHTML=`<div class="analytics-highlight-grid"><article class="analytics-highlight"><span>Maior gasto em ${escapeHTML(labels.a)}</span><strong>${escapeHTML(topA?.category||'Sem dados')}</strong><small>${topA?formatBRL(topA.total):'—'}</small></article><article class="analytics-highlight"><span>Maior aumento</span><strong>${escapeHTML(changes.increase?.category||'Sem aumento')}</strong><small>${changes.increase?`+${formatBRL(changes.increase.delta)}`:'—'}</small></article><article class="analytics-highlight"><span>Maior redução</span><strong>${escapeHTML(changes.decrease?.category||'Sem redução')}</strong><small>${changes.decrease?formatBRL(changes.decrease.delta):'—'}</small></article></div><div class="analytics-grid two"><article class="panel-card analytics-chart-card"><div class="section-title"><div><h3>Categorias comparadas</h3><p>As categorias com maior peso nos dois períodos.</p></div></div>${analysisComparisonBars(rows,labels.a,labels.b)}</article><article class="panel-card analytics-chart-card"><div class="section-title"><div><h3>Distribuição em ${escapeHTML(labels.a)}</h3><p>Quanto cada categoria representa do gasto.</p></div></div>${analysisDonut(periodA.categories,'Distribuição por categoria')}</article></div>`;
    }else if(analysisTab==='budget'){
      const budgetA=aggregateBudgetComparison(periodA),budgetB=aggregateBudgetComparison(periodB);
      const limitChange={current:budgetA.totalLimit,previous:budgetB.totalLimit,delta:budgetA.totalLimit-budgetB.totalLimit,percent:budgetB.totalLimit?((budgetA.totalLimit-budgetB.totalLimit)/Math.abs(budgetB.totalLimit))*100:(budgetA.totalLimit?null:0)};
      const spentChange={current:budgetA.totalSpent,previous:budgetB.totalSpent,delta:budgetA.totalSpent-budgetB.totalSpent,percent:budgetB.totalSpent?((budgetA.totalSpent-budgetB.totalSpent)/Math.abs(budgetB.totalSpent))*100:(budgetA.totalSpent?null:0)};
      host.innerHTML=`<div class="analytics-metrics budget-analytics-metrics">${analysisMetric('Limites planejados',limitChange,{goodUp:false})}${analysisMetric('Gasto realizado',spentChange,{goodUp:false})}<article class="analytics-metric"><span>Saldo dos limites · ${escapeHTML(labels.a)}</span><strong class="${budgetA.totalLimit-budgetA.totalSpent>=0?'positive':'negative'}">${formatBRL(budgetA.totalLimit-budgetA.totalSpent)}</strong><small>${budgetA.totalLimit?`${Math.round(budgetA.totalSpent/budgetA.totalLimit*100)}% utilizado`:'Sem orçamento salvo'}</small></article></div><div class="analytics-grid two"><article class="panel-card analytics-chart-card">${analysisBudgetBars(budgetA,labels.a)}</article><article class="panel-card analytics-chart-card">${analysisBudgetBars(budgetB,labels.b)}</article></div>`;
    }else if(analysisTab==='planning'){
      const planA=summarizePlanningPeriod(planningByMonth,keysA),planB=summarizePlanningPeriod(planningByMonth,keysB);
      const resultChange={current:planA.plannedResult,previous:planB.plannedResult,delta:planA.plannedResult-planB.plannedResult,percent:Math.abs(planB.plannedResult)>0.005?((planA.plannedResult-planB.plannedResult)/Math.abs(planB.plannedResult))*100:(Math.abs(planA.plannedResult)>0.005?null:0)};
      const pendingTotal=planA.pendingIncome+planA.pendingExpense;
      host.innerHTML=`<div class="analytics-metrics"><article class="analytics-metric"><span>Receitas planejadas</span><strong>${formatBRL(planA.plannedIncome)}</strong><small>${formatBRL(planA.pendingIncome)} ainda a receber</small></article><article class="analytics-metric"><span>Despesas planejadas</span><strong>${formatBRL(planA.plannedExpense)}</strong><small>${formatBRL(planA.pendingExpense)} ainda a pagar</small></article>${analysisMetric('Saldo planejado',resultChange,{goodUp:true})}<article class="analytics-metric"><span>Pendente</span><strong>${formatBRL(pendingTotal)}</strong><small>${planA.pendingCount} ${planA.pendingCount===1?'item':'itens'}</small></article></div><div class="analytics-grid two">${planningAnalysisPanel(planA,labels.a,periodA.totals)}${planningAnalysisPanel(planB,labels.b,periodB.totals)}</div><article class="panel-card analytics-insights-card"><div class="section-title"><div><h3>Leitura do planejamento</h3><p>Previsões não são contabilizadas como movimentação até serem concluídas.</p></div></div>${analysisInsightsHTML([`Em ${labels.a}, foram planejados ${formatBRL(planA.plannedIncome)} em entradas e ${formatBRL(planA.plannedExpense)} em saídas.`,`${planA.completedCount} ${planA.completedCount===1?'item foi concluído':'itens foram concluídos'}, ${planA.pendingCount} permanecem pendentes e ${planA.deferredCount} foram adiados.`,planA.deferred?`${formatBRL(planA.deferred)} foi transferido para outro mês.`:'Nenhum valor foi adiado neste período.'])}</article>`;
    }else if(analysisTab==='cards'){
      const rows=compareCards(periodA,periodB,8).map(item=>({...item,label:item.name}));
      const contextKeys=analysisMode==='years'?keysA:analysisMonthKeysAround(analysisInputDate(monthA),6);
      const context=buildAnalysisPeriod({transactions:state.transactions,installments:state.installments,invoiceStatuses:state.invoiceStatuses,monthKeys:contextKeys,monthLabel});
      host.innerHTML=`<div class="analytics-metrics cards-analytics-metrics">${analysisMetric('Gasto no cartão',comparison.cardExpense,{goodUp:false})}<article class="analytics-metric"><span>Participação no gasto · ${escapeHTML(labels.a)}</span><strong>${periodA.totals.totalExpense?`${(periodA.totals.cardExpense/periodA.totals.totalExpense*100).toFixed(1)}%`:'0%'}</strong><small>Do total de despesas</small></article></div><div class="analytics-grid two"><article class="panel-card analytics-chart-card"><div class="section-title"><div><h3>Por cartão</h3><p>${escapeHTML(labels.a)} × ${escapeHTML(labels.b)}</p></div></div>${analysisComparisonBars(rows,labels.a,labels.b)}</article><article class="panel-card analytics-chart-card"><div class="section-title"><div><h3>Evolução no crédito</h3><p>${analysisMode==='years'?`Compras no cartão em ${yearA}.`:'Últimos 6 meses.'}</p></div></div>${analysisLineChart(context.months,[{label:'Cartão',value:m=>m.cardExpense}])}</article></div>`;
    }
  }catch(error){console.error('Análises:',error);host.innerHTML=analysisEmpty('Não foi possível montar a análise',error?.message||'Tente novamente em alguns instantes.')}
}
function openAnalytics(){showModule('analytics');void renderAnalytics()}
function setAnalysisMode(mode){analysisMode=mode==='years'?'years':'months';document.querySelectorAll('[data-analysis-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.analysisMode===analysisMode));document.getElementById('analytics-month-filters')?.classList.toggle('hidden',analysisMode!=='months');document.getElementById('analytics-year-filters')?.classList.toggle('hidden',analysisMode!=='years');void renderAnalytics()}
function setAnalysisTab(tab){analysisTab=['overview','categories','budget','planning','cards'].includes(tab)?tab:'overview';document.querySelectorAll('[data-analysis-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.analysisTab===analysisTab));void renderAnalytics()}


function notificationIcon(type){if(String(type||'').startsWith('family_'))return 'i-users';if(type==='budget_near'||type==='budget_over')return 'i-wallet';if(type==='goal_reached')return 'i-target';if(type==='invoice_due')return 'i-card';return 'i-bell'}
function notificationActionLabel(n){if(n.type==='family_invite')return 'Ver convite';if(n.target==='family')return 'Ver Família';if(n.target==='budget')return 'Ver orçamento';if(n.target==='goals')return 'Ver meta';if(n.target==='cards')return 'Ver fatura';return 'Abrir'}
function notificationTime(value){const date=new Date(value);if(Number.isNaN(date.getTime()))return '';const diff=Math.max(0,Date.now()-date.getTime());const minutes=Math.floor(diff/60000);if(minutes<1)return 'Agora';if(minutes<60)return `Há ${minutes} min`;const hours=Math.floor(minutes/60);if(hours<24)return `Há ${hours} h`;const days=Math.floor(hours/24);if(days<7)return `Há ${days} dia${days===1?'':'s'}`;return date.toLocaleDateString('pt-BR')}
function notificationItemHTML(n){const unread=!n.read_at;return `<article class="notification-item ${unread?'unread':''}"><span class="notification-item-icon"><svg class="ui-icon" aria-hidden="true"><use href="#${notificationIcon(n.type)}"></use></svg></span><div class="notification-item-main"><div class="notification-item-title">${unread?'<span class="notification-dot" aria-hidden="true"></span>':''}<span>${escapeHTML(n.title||'Notificação')}</span></div>${n.body?`<div class="notification-item-body">${escapeHTML(n.body)}</div>`:''}<div class="notification-item-meta">${escapeHTML(notificationTime(n.created_at))}</div></div><button class="notification-item-action" type="button" data-notification-open="${n.id}">${escapeHTML(notificationActionLabel(n))}</button></article>`}
function renderNotifications(){const rows=state.notifications||[];const unread=rows.filter(n=>!n.read_at).length;const badge=document.getElementById('notification-badge');if(badge){badge.textContent=unread>99?'99+':String(unread);badge.classList.toggle('hidden',unread===0)}const caption=document.getElementById('notification-popover-caption');if(caption)caption.textContent=unread?`${unread} não lida${unread===1?'':'s'}`:'Nenhuma não lida';const preview=document.getElementById('notification-preview-list');if(preview)preview.innerHTML=rows.length?rows.slice(0,6).map(notificationItemHTML).join(''):'<div class="notification-empty">Nenhuma notificação por enquanto.</div>';const history=document.getElementById('notification-history-list');if(history)history.innerHTML=rows.length?rows.map(notificationItemHTML).join(''):'<div class="notification-empty">Seu histórico de notificações está vazio.</div>';const center=document.getElementById('notification-center-caption');if(center)center.textContent=`${rows.length} notificação${rows.length===1?'':'ões'} · ${unread} não lida${unread===1?'':'s'}`;document.getElementById('notification-mark-all')?.toggleAttribute('disabled',unread===0);document.getElementById('notification-center-mark-all')?.toggleAttribute('disabled',unread===0)}
function setNotificationPopover(open){const pop=document.getElementById('notification-popover'),bell=document.getElementById('notification-bell');if(!pop||!bell)return;pop.classList.toggle('hidden',!open);bell.setAttribute('aria-expanded',open?'true':'false')}
async function openNotification(id){const item=(state.notifications||[]).find(n=>n.id===id);if(!item)return;if(!item.read_at){await markNotificationRead(item.id);item.read_at=new Date().toISOString();renderNotifications()}setNotificationPopover(false);closeDialog('notification-center-dialog');if(item.target==='family'){showModule('family');setTimeout(()=>document.getElementById('family-incoming')?.scrollIntoView({behavior:'smooth',block:'center'}),60);return}if(item.target==='budget'){showModule('budget');return}if(item.target==='goals'){showModule('goals');return}if(item.target==='cards'){showModule('cards');if(item.type==='invoice_due'&&item.target_id)setTimeout(()=>openInvoice(item.target_id),60);return}}
async function markAllNotifications(){if(!(state.notifications||[]).some(n=>!n.read_at))return;await markAllNotificationsRead();const now=new Date().toISOString();state.notifications.forEach(n=>{if(!n.read_at)n.read_at=now});renderNotifications()}

function familyProfile(id){return state.family?.profiles?.find(x=>x.user_id===id)||null}
function familyProfileName(id){const p=familyProfile(id);return p?.display_name||p?.username||'Membro da família'}
function familyProfileUsername(id){return familyProfile(id)?.username||''}
function permissionTags(link){const items=[['transactions','Lançamentos',link.can_view_transactions],['cards','Cartões',link.can_view_cards],['goals','Metas',link.can_view_goals],['budget','Orçamento',link.can_view_budget]];return `<div class="permission-tags">${items.map(([,label,on])=>`<span class="permission-tag ${on?'on':''}">${label}</span>`).join('')}</div>`}
function familyPersonHTML({name,subtitle='',actions='',tags=''}){const initial=escapeHTML(String(name||'F').trim().charAt(0).toUpperCase()||'F');return `<div class="family-person"><div class="family-avatar">${initial}</div><div class="family-person-main"><strong>${escapeHTML(name||'Família')}</strong><small>${escapeHTML(subtitle)}</small>${tags}</div><div class="family-actions">${actions}</div></div>`}
function renderFamily(){const data=state.family;if(!data)return;const me=data.user.id;const incoming=data.invites.filter(i=>i.status==='pending'&&i.inviter_user_id!==me);const outgoing=data.invites.filter(i=>i.status==='pending'&&i.inviter_user_id===me);const viewing=data.links.filter(l=>l.active&&l.viewer_user_id===me);const viewers=data.links.filter(l=>l.active&&l.owner_user_id===me);
  document.getElementById('family-incoming').innerHTML=incoming.length?incoming.map(i=>familyPersonHTML({name:familyProfileName(i.inviter_user_id),subtitle:`@${familyProfileUsername(i.inviter_user_id)} quer compartilhar o financeiro com você`,actions:`<button class="mini-btn" data-family-respond="${i.id}" data-accept="1">Aceitar</button><button class="mini-btn danger" data-family-respond="${i.id}" data-accept="0">Recusar</button>`})).join(''):emptyState('Nenhum convite pendente.');
  document.getElementById('family-viewing').innerHTML=viewing.length?viewing.map(l=>familyPersonHTML({name:familyProfileName(l.owner_user_id),subtitle:`@${familyProfileUsername(l.owner_user_id)} · acesso autorizado`,tags:permissionTags(l),actions:`<button class="mini-btn" data-family-monitor="${l.owner_user_id}">Visualizar</button><button class="mini-btn danger" data-family-remove="${l.id}">Sair</button>`})).join(''):emptyState('Você ainda não acompanha ninguém.');
  document.getElementById('family-viewers').innerHTML=viewers.length?viewers.map(l=>familyPersonHTML({name:familyProfileName(l.viewer_user_id),subtitle:`@${familyProfileUsername(l.viewer_user_id)} · pode acompanhar os grupos autorizados`,tags:permissionTags(l),actions:`<button class="mini-btn" data-family-permissions="${l.id}">Permissões</button><button class="mini-btn danger" data-family-remove="${l.id}">Remover</button>`})).join(''):emptyState('Ninguém acompanha seus dados atualmente.');
  document.getElementById('family-outgoing').innerHTML=outgoing.length?outgoing.map(i=>familyPersonHTML({name:familyProfileName(i.invitee_user_id),subtitle:`@${familyProfileUsername(i.invitee_user_id)} · convite enviado`,actions:`<button class="mini-btn danger" data-family-cancel-invite="${i.id}">Cancelar</button>`})).join(''):emptyState('Nenhum convite enviado aguardando resposta.');
}
function renderSettings(){if(!currentProfile)return;const usernameInput=document.getElementById('settings-username');if(usernameInput)usernameInput.value=currentProfile.username||'';const nameInput=document.getElementById('settings-display-name');if(nameInput&&document.activeElement!==nameInput)nameInput.value=currentProfile.display_name||'';applyTheme(currentProfile.theme||'system');const status=state.migration||{claimed:false};const pill=document.getElementById('migration-status-pill'),form=document.getElementById('legacy-migration-form'),done=document.getElementById('migration-complete');if(status.claimed){pill.textContent='Migrado';pill.classList.add('ok');form.classList.add('hidden');done.classList.remove('hidden');done.textContent=`Dados antigos vinculados ao usuário “${status.legacy_username}”. O backup legado permanece preservado.`}else{pill.textContent='Não migrado';pill.classList.remove('ok');form.classList.remove('hidden');done.classList.add('hidden')}}

function familyMonitorLink(ownerId=familyMonitorOwnerId){return state.family?.links?.find(l=>l.owner_user_id===ownerId&&l.viewer_user_id===currentUser?.id&&l.active)||null}
function familyMonitorCurrentMonth(){const now=new Date();return new Date(now.getFullYear(),now.getMonth(),1,12)}
function familyMonitorCanAdvance(){return familyMonthKey(familyMonitorDate)<familyMonthKey(familyMonitorCurrentMonth())}
function familyMonitorSetBusy(busy,text=''){const panel=document.getElementById('family-monitor-panel');if(panel)panel.setAttribute('aria-busy',busy?'true':'false');const sync=document.getElementById('family-monitor-sync');if(sync&&text)sync.textContent=text}
function familyMoneyCard(key,label,value,{tone='',note=''}={}){return `<article class="family-monitor-summary-card ${tone}"><span>${escapeHTML(label)}</span><strong data-family-money-key="${escapeHTML(key)}" data-family-money-value="${Number(value)||0}">${formatBRL(value)}</strong>${note?`<small>${escapeHTML(note)}</small>`:''}</article>`}
function familyCountCard(label,value,note=''){return `<article class="family-monitor-summary-card"><span>${escapeHTML(label)}</span><strong>${escapeHTML(String(value))}</strong>${note?`<small>${escapeHTML(note)}</small>`:''}</article>`}
function familyMonitorRenderTransactions(){const host=document.getElementById('family-monitor-transactions');const caption=document.getElementById('family-monitor-transaction-caption');const link=familyMonitorLink();if(!host||!link)return;document.querySelectorAll('[data-family-monitor-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.familyMonitorFilter===familyMonitorFilter));if(!link.can_view_transactions){host.innerHTML=emptyState('Lançamentos não foram compartilhados pelo titular.');if(caption)caption.textContent='O titular não liberou o histórico de lançamentos.';return}const rows=filterFamilyTransactions(familyMonitorModel?.transactions||[],familyMonitorFilter);if(caption)caption.textContent=`${rows.length} de ${familyMonitorModel?.transactionCount||0} lançamento(s) em ${monthLabel(familyMonitorDate)}.`;host.innerHTML=rows.length?rows.map(t=>{const signed=Number(t.direction||0)*Number(t.amount||0);return `<div class="family-monitor-transaction"><div class="family-monitor-transaction-main"><div class="family-monitor-transaction-title">${escapeHTML(t.description||'Lançamento')}</div><div class="family-monitor-transaction-meta"><span>${formatDate(t.occurred_on)}</span><span>${escapeHTML(t.category||'Outros')}</span>${t.recurring_group_id?'<span>Recorrente</span>':''}${t.type==='balance_adjustment'?'<span>Ajuste</span>':''}</div></div><div class="family-monitor-transaction-value ${signed>=0?'positive':'negative'}">${signed>=0?'+':'-'} ${formatBRL(Math.abs(signed))}</div></div>`}).join(''):emptyState('Nenhum lançamento encontrado neste filtro.');}
function familyMonitorRenderCategories(){const host=document.getElementById('family-monitor-categories');const caption=document.getElementById('family-monitor-category-caption');const link=familyMonitorLink();if(!host||!link)return;if(!link.can_view_transactions&&!link.can_view_cards){host.innerHTML=emptyState('Despesas não compartilhadas.');if(caption)caption.textContent='Nenhum grupo de despesas foi autorizado.';return}const rows=familyMonitorModel?.categoryRows||[];if(caption)caption.textContent=`Distribuição de ${formatBRL(familyMonitorModel?.categoryTotal||0)} em ${monthLabel(familyMonitorDate)}.`;host.innerHTML=rows.length?rows.map(row=>`<div class="family-category-row"><div class="family-category-row-top"><span>${escapeHTML(row.name)}</span><strong>${formatBRL(row.value)}</strong></div><div class="family-category-track"><span style="width:${Math.max(0,Math.min(100,row.percent)).toFixed(2)}%"></span></div></div>`).join(''):emptyState('Nenhuma despesa registrada neste mês.');}
function familyMonitorRenderExtras(){const host=document.getElementById('family-monitor-extras');const note=document.getElementById('family-monitor-permission-note');const link=familyMonitorLink();if(!host||!link)return;const extras=[];if(link.can_view_cards)extras.push(`<article class="family-monitor-extra"><span>Cartão no mês</span><strong>${formatBRL(familyMonitorModel?.cardExpense||0)}</strong></article>`);if(link.can_view_goals)extras.push(`<article class="family-monitor-extra"><span>Metas ativas</span><strong>${familyMonitorModel?.activeGoals||0}</strong></article>`);if(link.can_view_budget)extras.push(`<article class="family-monitor-extra"><span>Orçamento do mês</span><strong>${formatBRL(familyMonitorModel?.budgetLimit||0)}</strong></article>`);host.innerHTML=extras.join('');const partial=!(link.can_view_transactions&&link.can_view_cards&&link.can_view_goals&&link.can_view_budget);if(note){note.classList.toggle('hidden',!partial);note.textContent=partial?'Este painel considera somente os grupos financeiros que o titular autorizou compartilhar com você.':''}}
function renderFamilyMonitorView({animate=false,before=null}={}){const link=familyMonitorLink();const panel=document.getElementById('family-monitor-panel');if(!link||!panel||!familyMonitorData)return;const name=familyProfileName(familyMonitorOwnerId);const username=familyProfileUsername(familyMonitorOwnerId);document.getElementById('family-monitor-name').textContent=name;document.getElementById('family-monitor-caption').textContent=`@${username} · acompanhamento autorizado`;document.getElementById('family-monitor-month-label').textContent=monthLabel(familyMonitorDate);const input=document.getElementById('family-monitor-month-input');if(input){input.value=familyMonthKey(familyMonitorDate);input.max=familyMonthKey(familyMonitorCurrentMonth())}document.getElementById('family-monitor-next').disabled=!familyMonitorCanAdvance();document.getElementById('family-monitor-current').classList.toggle('hidden',familyMonthKey(familyMonitorDate)===familyMonthKey(familyMonitorCurrentMonth()));familyMonitorModel=buildFamilyMonitorModel(familyMonitorData,link);const metrics=[];if(link.can_view_transactions){metrics.push(familyMoneyCard('income','Receitas',familyMonitorModel.income,{tone:'income'}));metrics.push(familyMoneyCard('expense','Despesas',familyMonitorModel.totalExpense,{tone:'expense',note:link.can_view_cards?'Inclui cartão compartilhado':'Somente lançamentos compartilhados'}));metrics.push(familyMoneyCard('result','Resultado',familyMonitorModel.result,{note:link.can_view_cards?'Receitas − despesas totais':'Resultado dos grupos compartilhados'}));metrics.push(familyCountCard('Lançamentos',familyMonitorModel.transactionCount,'Registros no mês'));}else if(link.can_view_cards){metrics.push(familyMoneyCard('card','Cartão no mês',familyMonitorModel.cardExpense,{tone:'expense'}));metrics.push(familyCountCard('Parcelas',(familyMonitorData.installments||[]).length,'Itens compartilhados no período'));}document.getElementById('family-monitor-metrics').innerHTML=metrics.length?metrics.join(''):emptyState('Nenhum dado mensal foi compartilhado.');familyMonitorRenderCategories();familyMonitorRenderTransactions();familyMonitorRenderExtras();panel.classList.remove('hidden');if(animate&&before)requestAnimationFrame(()=>animateFamilyMetricChange(before,panel,620));}
async function loadFamilyMonitor({animate=false,scroll=false,reason='Carregando dados do mês…'}={}){const ownerId=familyMonitorOwnerId;const link=familyMonitorLink(ownerId);if(!ownerId||!link)return;const request=++familyMonitorRequest;const panel=document.getElementById('family-monitor-panel');const before=animate&&panel&&!panel.classList.contains('hidden')?captureFamilyMetricState(panel):null;familyMonitorSetBusy(true,reason);try{const data=await loadFamilyOverview(ownerId,familyMonitorDate);if(request!==familyMonitorRequest||ownerId!==familyMonitorOwnerId)return;familyMonitorData=data;renderFamilyMonitorView({animate,before});familyMonitorSetBusy(false,`Atualizado agora · ${monthLabel(familyMonitorDate)}`);if(scroll)panel?.scrollIntoView({behavior:'smooth',block:'start'});}catch(error){if(request!==familyMonitorRequest)return;console.error('Monitoramento familiar:',error);familyMonitorSetBusy(false,'Não foi possível atualizar este mês.');toast('Não foi possível carregar os dados familiares.','error')}}
async function stopFamilyMonitorRealtime(){if(familyMonitorRefreshTimer){clearTimeout(familyMonitorRefreshTimer);familyMonitorRefreshTimer=null}if(familyMonitorChannel){try{await familyMonitorChannel.unsubscribe()}catch{}familyMonitorChannel=null}}
function scheduleFamilyMonitorRefresh(){if(!familyMonitorOwnerId||document.getElementById('family-monitor-panel')?.classList.contains('hidden'))return;if(familyMonitorRefreshTimer)clearTimeout(familyMonitorRefreshTimer);familyMonitorRefreshTimer=setTimeout(()=>{familyMonitorRefreshTimer=null;void loadFamilyMonitor({animate:true,reason:'Novo movimento detectado. Atualizando…'})},260)}
async function startFamilyMonitorRealtime(ownerId){await stopFamilyMonitorRealtime();if(!ownerId)return;try{familyMonitorChannel=await subscribeFamilyOverview(ownerId,async event=>{if(ownerId!==familyMonitorOwnerId)return;if(event?.source==='family_links'){try{state.family=await listFamilyData();renderFamily();if(!familyMonitorLink(ownerId)){toast('O acesso a este acompanhamento foi alterado pelo titular.','error');await closeFamilyMonitor();return}}catch(error){console.warn('Permissões familiares:',error)}}scheduleFamilyMonitorRefresh()})}catch(error){console.warn('Realtime familiar indisponível:',error)}}
async function closeFamilyMonitor(){familyMonitorRequest++;familyMonitorOwnerId=null;familyMonitorData=null;familyMonitorModel=null;document.getElementById('family-monitor-panel')?.classList.add('hidden');await stopFamilyMonitorRealtime()}
async function setFamilyMonitorMonth(nextDate){if(!familyMonitorOwnerId||!nextDate)return;const current=familyMonitorCurrentMonth();const safe=familyMonthKey(nextDate)>familyMonthKey(current)?current:new Date(nextDate.getFullYear(),nextDate.getMonth(),1,12);if(familyMonthKey(safe)===familyMonthKey(familyMonitorDate))return;familyMonitorDate=safe;familyMonitorMonths.set(familyMonitorOwnerId,new Date(safe));familyMonitorFilter='all';await loadFamilyMonitor({animate:true,reason:`Carregando ${monthLabel(safe)}…`})}
async function openFamilyMonitor(ownerId){const link=familyMonitorLink(ownerId);if(!link)return;familyMonitorOwnerId=ownerId;familyMonitorDate=familyMonitorMonths.get(ownerId)||familyMonitorCurrentMonth();familyMonitorFilter='all';familyMonitorData=null;familyMonitorModel=null;const panel=document.getElementById('family-monitor-panel');panel?.classList.remove('hidden');familyMonitorSetBusy(true,'Carregando acompanhamento…');await startFamilyMonitorRealtime(ownerId);await loadFamilyMonitor({animate:false,scroll:true,reason:'Carregando acompanhamento…'});}

function openFamilyPermissions(linkId){const link=state.family?.links?.find(l=>l.id===linkId&&l.owner_user_id===currentUser?.id);if(!link)return;document.getElementById('family-link-id').value=link.id;document.getElementById('family-permissions-title').textContent=familyProfileName(link.viewer_user_id);document.getElementById('perm-transactions').checked=!!link.can_view_transactions;document.getElementById('perm-cards').checked=!!link.can_view_cards;document.getElementById('perm-goals').checked=!!link.can_view_goals;document.getElementById('perm-budget').checked=!!link.can_view_budget;setFormError('family-permissions-error','');openDialog('family-permissions-dialog')}


function openNewTransaction(){document.getElementById('transaction-form').reset();fillCategorySelect('transaction-category');document.getElementById('transaction-id').value='';document.getElementById('transaction-dialog-title').textContent='Novo lançamento';document.getElementById('transaction-date').value=localISO();document.getElementById('transaction-recurring-count').value='12';document.getElementById('recurring-fields').classList.remove('hidden');document.getElementById('recurring-count-wrap').classList.add('hidden');setFormError('transaction-form-error','');openDialog('transaction-dialog')}
function openEditTransaction(id){const t=state.transactions.find(x=>x.id===id);if(!t||t.type==='balance_adjustment')return;document.getElementById('transaction-form').reset();fillCategorySelect('transaction-category',t.category||'Outros');document.getElementById('transaction-id').value=t.id;document.getElementById('transaction-dialog-title').textContent='Editar lançamento';document.getElementById('transaction-direction').value=String(t.direction);document.getElementById('transaction-description').value=t.description||'';document.getElementById('transaction-amount').value=Number(t.amount);document.getElementById('transaction-date').value=t.occurred_on;document.getElementById('transaction-category').value=t.category||'Outros';document.getElementById('transaction-notes').value=t.notes||'';document.getElementById('recurring-fields').classList.add('hidden');setFormError('transaction-form-error','');openDialog('transaction-dialog')}
function openBalance(){const cash=calculateCashStats(state.transactions,dashboardDate);document.getElementById('balance-form').reset();document.getElementById('balance-dialog-current').textContent=formatBRL(cash.balance);document.getElementById('balance-date').value=localISO();setFormError('balance-form-error','');openDialog('balance-dialog')}
function openNewCard(){document.getElementById('card-form').reset();document.getElementById('card-id').value='';document.getElementById('card-interest').value='0';document.getElementById('card-dialog-title').textContent='Novo cartão';setFormError('card-form-error','');openDialog('card-dialog')}
function openEditCard(id){const c=state.cards.find(x=>x.id===id);if(!c)return;document.getElementById('card-id').value=c.id;document.getElementById('card-name').value=c.name;document.getElementById('card-limit').value=Number(c.credit_limit);document.getElementById('card-closing').value=c.closing_day;document.getElementById('card-due').value=c.due_day;document.getElementById('card-interest').value=Number(c.revolving_interest||0);document.getElementById('card-dialog-title').textContent='Editar cartão';setFormError('card-form-error','');openDialog('card-dialog')}
function openNewPurchase(cardId){document.getElementById('purchase-form').reset();fillCategorySelect('purchase-category');document.getElementById('purchase-id').value='';document.getElementById('purchase-card-id').value=cardId;document.getElementById('purchase-installments').value='1';document.getElementById('purchase-date').value=localISO();document.getElementById('purchase-dialog-title').textContent=`Nova compra — ${state.cards.find(c=>c.id===cardId)?.name||'Cartão'}`;setFormError('purchase-form-error','');openDialog('purchase-dialog')}
function openEditPurchase(id){const p=state.purchases.find(x=>x.id===id);if(!p)return;fillCategorySelect('purchase-category',p.category||'Outros');document.getElementById('purchase-id').value=p.id;document.getElementById('purchase-card-id').value=p.card_id;document.getElementById('purchase-description').value=p.description;document.getElementById('purchase-total').value=Number(p.total_amount);document.getElementById('purchase-installments').value=p.installment_count;document.getElementById('purchase-date').value=p.purchase_date;document.getElementById('purchase-category').value=p.category||'Outros';document.getElementById('purchase-dialog-title').textContent='Editar compra';setFormError('purchase-form-error','');openDialog('purchase-dialog')}
function openNewGoal(){document.getElementById('goal-form').reset();document.getElementById('goal-id').value='';document.getElementById('goal-saved').value='0';document.getElementById('goal-dialog-title').textContent='Nova meta';setFormError('goal-form-error','');openDialog('goal-dialog')}
function openEditGoal(id){const g=state.goals.find(x=>x.id===id);if(!g)return;document.getElementById('goal-id').value=g.id;document.getElementById('goal-name').value=g.name;document.getElementById('goal-target').value=Number(g.target_amount);document.getElementById('goal-saved').value=Number(g.saved_amount);document.getElementById('goal-due').value=g.due_date||'';document.getElementById('goal-dialog-title').textContent='Editar meta';setFormError('goal-form-error','');openDialog('goal-dialog')}

function openInvoice(cardId){const card=state.cards.find(c=>c.id===cardId);if(!card)return;const summaries=cardInvoiceSummaries(state.cards,state.installments,state.invoiceStatuses,dashboardDate);const summary=summaries.find(s=>s.card.id===cardId);document.getElementById('invoice-title').textContent=`${card.name} — ${monthLabel(dashboardDate)}`;document.getElementById('invoice-content').innerHTML=`<div class="invoice-headline"><div><span class="muted">Fatura</span><strong>${formatBRL(summary.total)}</strong><small>Vencimento ${summary.dueDate.toLocaleDateString('pt-BR')}</small></div><button class="${summary.status==='paid'?'secondary-btn':'primary-compact'}" data-toggle-invoice="${cardId}" data-invoice-paid="${summary.status==='paid'?'1':'0'}">${summary.status==='paid'?'Reabrir fatura':'Marcar como paga'}</button></div><div class="invoice-installments">${summary.rows.length?summary.rows.map(r=>`<div class="invoice-row"><div><strong>${escapeHTML(r.ff2_card_purchases?.description||'Compra')}</strong><div class="muted">Parcela ${r.installment_no}/${r.ff2_card_purchases?.installment_count||'?'}</div></div><strong>${formatBRL(r.amount)}</strong></div>`).join(''):emptyState('Nenhuma parcela nesta fatura.')}</div>`;openDialog('invoice-dialog')}

function reportDateOrFallback(refDate, fallbackDate) {
  if (refDate instanceof Date && !Number.isNaN(refDate.getTime())) return new Date(refDate.getFullYear(), refDate.getMonth(), 1, 12);
  return new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), 1, 12);
}
function openDRE(refDate) {
  const date = reportDateOrFallback(refDate, dashboardDate);
  const d = getMonthlyDRE(state.transactions, state.installments, date);
  document.getElementById('dre-title').textContent = `DRE — ${monthLabel(date)}`;
  document.getElementById('dre-content').innerHTML = `<div class="dre-grid"><div class="dre-line"><span>Receitas</span><strong class="positive">${formatBRL(d.income)}</strong></div><div class="dre-line"><span>Despesas à vista</span><strong class="negative">${formatBRL(d.cashExpense)}</strong></div><div class="dre-line"><span>Compras no cartão</span><strong class="negative">${formatBRL(d.cardExpense)}</strong></div><div class="dre-line"><span>Despesas totais</span><strong>${formatBRL(d.totalExpense)}</strong></div><div class="dre-line total"><span>Resultado</span><strong class="${d.result >= 0 ? 'positive' : 'negative'}">${formatBRL(d.result)}</strong></div><p class="muted" style="margin:8px 12px 0">Ajustes de saldo e pagamentos de fatura não entram novamente no resultado mensal.</p></div>`;
  openDialog('dre-dialog');
}
function reportMonthKey(date) {
  const ref=reportDateOrFallback(date,dashboardDate);
  return `${ref.getFullYear()}-${String(ref.getMonth()+1).padStart(2,'0')}-01`;
}
function reportDateFromKey(key) {
  const [year,month]=String(key||'').slice(0,7).split('-').map(Number);
  return new Date(year,(month||1)-1,1,12);
}
function reportDataMonthKeys() {
  const keys=new Set();
  const today=localISO();
  state.transactions.forEach(row=>{const raw=String(row.occurred_on||'');if(row?.affects_month_result===true&&raw<=today&&/^\d{4}-\d{2}/.test(raw))keys.add(`${raw.slice(0,7)}-01`)});
  state.installments.forEach(row=>{const raw=String(row.invoice_month||'');const purchaseDate=String(row.ff2_card_purchases?.purchase_date||'');if(/^\d{4}-\d{2}-01$/.test(raw)&&(!purchaseDate||purchaseDate<=today))keys.add(raw)});
  return keys;
}
function selectedReportMonthKeys() {
  return [...document.querySelectorAll('#report-month-list input[data-report-month]:checked')].map(input=>input.dataset.reportMonth).sort();
}
function updateReportSelectionSummary() {
  const keys=selectedReportMonthKeys();
  const summary=document.getElementById('report-selection-summary');
  const detail=document.getElementById('report-selection-detail');
  if(!keys.length){summary.textContent='Nenhum mês selecionado';detail.textContent='Marque pelo menos um mês para gerar o relatório.';return}
  summary.textContent=`${keys.length} ${keys.length===1?'mês selecionado':'meses selecionados'}`;
  const labels=keys.map(key=>monthLabel(reportDateFromKey(key)));
  detail.textContent=labels.length<=4?labels.join(' • '):`${labels.slice(0,3).join(' • ')} • +${labels.length-3}`;
}
function renderReportMonthSelector(defaultDate=dashboardDate) {
  reportReferenceDate=reportDateOrFallback(defaultDate,dashboardDate);
  const options=getReportMonthOptions(state.transactions,state.installments,reportReferenceDate);
  const selectedKey=reportMonthKey(reportReferenceDate);
  document.getElementById('report-month-list').innerHTML=options.map(option=>`<label class="report-month-option"><input type="checkbox" data-report-month="${option.key}" ${option.key===selectedKey?'checked':''}><span>${escapeHTML(monthLabel(option.date))}</span></label>`).join('');
  setFormError('report-form-error','');
  updateReportSelectionSummary();
}
function applyReportPreset(preset) {
  const inputs=[...document.querySelectorAll('#report-month-list input[data-report-month]')];
  const wanted=new Set();
  if(preset==='current') wanted.add(reportMonthKey(reportReferenceDate));
  else if(preset==='3'||preset==='6'){
    const count=Number(preset);for(let i=0;i<count;i+=1)wanted.add(reportMonthKey(addMonth(reportReferenceDate,-i)));
  } else if(preset==='all') {
    const dataKeys=reportDataMonthKeys();dataKeys.forEach(key=>wanted.add(key));if(!wanted.size)wanted.add(reportMonthKey(reportReferenceDate));
  }
  inputs.forEach(input=>{input.checked=preset==='none'?false:wanted.has(input.dataset.reportMonth)});
  setFormError('report-form-error','');
  updateReportSelectionSummary();
}
function openReportBuilder(refDate) {
  renderReportMonthSelector(reportDateOrFallback(refDate,dashboardDate));
  openDialog('report-dialog');
}
async function generateSelectedReport() {
  const monthKeys=selectedReportMonthKeys();
  if(!monthKeys.length){setFormError('report-form-error','Selecione pelo menos um mês.');return}
  if(reportDownloadBusy)return;
  const button=document.getElementById('report-generate-btn');
  const motion=beginDownloadMotion(button,{initialLabel:'Preparando…'});
  reportDownloadBusy=true;
  setFormError('report-form-error','');
  try{
    const latestKey=monthKeys[monthKeys.length-1];
    const latestDate=reportDateFromKey(latestKey);
    const comparisonKey=reportMonthKey(addMonth(latestDate,-1));
    const contextMonthKeys=Array.from({length:6},(_,i)=>reportMonthKey(addMonth(latestDate,i-5)));
    const budgetKeys=[...new Set([...monthKeys,comparisonKey,...contextMonthKeys])];
    motion?.setProgress(18,'Preparando dados…');
    const budgetsByMonth=await listBudgetsByMonths(budgetKeys);
    motion?.setProgress(72,'Montando PDF…');
    // Um frame deixa a etapa visual aparecer antes da geração síncrona do PDF.
    await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
    const model=downloadFinancialReportPDF({
      transactions:state.transactions,
      installments:state.installments,
      invoiceStatuses:state.invoiceStatuses,
      budgetsByMonth,
      monthKeys,
      comparisonMonthKey:comparisonKey,
      contextMonthKeys,
      formatDate,
      formatBRL,
      monthLabel
    });
    motion?.setProgress(96,'Finalizando…');
    await motion?.complete({hold:820});
    closeDialog('report-dialog');
    toast(`Relatório financeiro gerado com ${model.months.length} ${model.months.length===1?'mês':'meses'}.`,'success');
  }catch(error){
    console.error('Falha ao gerar relatório financeiro:',error);
    setFormError('report-form-error',error?.message||'Não foi possível gerar o relatório.');
    toast('Não foi possível gerar o relatório PDF.','error');
    await motion?.fail('Erro — tente novamente',{hold:1100});
  }finally{reportDownloadBusy=false}
}

async function onTransactionSubmit(event){event.preventDefault();const btn=document.getElementById('transaction-save-btn');setButtonBusy(btn,true);setFormError('transaction-form-error','');try{const id=document.getElementById('transaction-id').value;const input={direction:Number(document.getElementById('transaction-direction').value),description:document.getElementById('transaction-description').value,amount:Number(document.getElementById('transaction-amount').value),date:document.getElementById('transaction-date').value,category:document.getElementById('transaction-category').value,notes:document.getElementById('transaction-notes').value,recurring:document.getElementById('transaction-recurring').checked,recurringCount:Number(document.getElementById('transaction-recurring-count').value)};if(!input.description.trim()||!input.date||input.amount<=0)throw new Error('Preencha descrição, data e um valor maior que zero.');await runAppOperation(id?'Atualizando lançamento…':'Salvando lançamento…',input.recurring&&!id?'Criando a série recorrente e protegendo contra envios repetidos.':'Registrando a alteração no seu histórico financeiro.',async()=>{if(id)await updateTransaction(id,input);else await createTransaction(input);closeDialog('transaction-dialog');toast(id?'Lançamento atualizado.':'Lançamento salvo.','success');syncOperationMessage('Conferindo o histórico completo após a alteração.');await refreshAll()},{animateDashboard:true})}catch(e){console.error(e);setFormError('transaction-form-error',e.message||'Não foi possível salvar.')}finally{setButtonBusy(btn,false)}}
async function onBalanceSubmit(event){event.preventDefault();const btn=document.getElementById('balance-save-btn');setButtonBusy(btn,true);setFormError('balance-form-error','');try{const input={mode:document.getElementById('balance-mode').value,amount:Number(document.getElementById('balance-amount').value),reason:document.getElementById('balance-reason').value,date:document.getElementById('balance-date').value};if(input.amount<0||!input.reason.trim()||!input.date)throw new Error('Informe valor, motivo e data.');await runAppOperation('Ajustando saldo…','Registrando o ajuste sem duplicar o resultado mensal.',async()=>{await applyBalanceAdjustment(input);closeDialog('balance-dialog');toast('Saldo ajustado.','success');syncOperationMessage();await refreshAll()},{animateDashboard:true})}catch(e){console.error(e);setFormError('balance-form-error',e.message||'Não foi possível ajustar o saldo.')}finally{setButtonBusy(btn,false)}}
async function onCardSubmit(event){event.preventDefault();const btn=document.getElementById('card-save-btn');setButtonBusy(btn,true);setFormError('card-form-error','');try{const id=document.getElementById('card-id').value;const input={name:document.getElementById('card-name').value,limit:Number(document.getElementById('card-limit').value),closingDay:Number(document.getElementById('card-closing').value),dueDay:Number(document.getElementById('card-due').value),interest:Number(document.getElementById('card-interest').value||0)};if(!input.name.trim()||input.limit<0||input.closingDay<1||input.closingDay>31||input.dueDay<1||input.dueDay>31)throw new Error('Revise nome, limite, fechamento e vencimento.');await runAppOperation(id?'Atualizando cartão…':'Criando cartão…','Salvando limite, fechamento e vencimento.',async()=>{if(id)await updateCard(id,input);else await createCard(input);closeDialog('card-dialog');toast(id?'Cartão atualizado.':'Cartão criado.','success');syncOperationMessage();await refreshAll()})}catch(e){console.error(e);setFormError('card-form-error',e.message||'Não foi possível salvar o cartão.')}finally{setButtonBusy(btn,false)}}
async function onPurchaseSubmit(event){event.preventDefault();const btn=document.getElementById('purchase-save-btn');setButtonBusy(btn,true);setFormError('purchase-form-error','');try{const id=document.getElementById('purchase-id').value;const input={cardId:document.getElementById('purchase-card-id').value,description:document.getElementById('purchase-description').value,total:Number(document.getElementById('purchase-total').value),installments:Number(document.getElementById('purchase-installments').value),date:document.getElementById('purchase-date').value,category:document.getElementById('purchase-category').value};if(!input.description.trim()||input.total<=0||!input.date||input.installments<1||input.installments>60)throw new Error('Revise descrição, valor, data e parcelas.');await runAppOperation(id?'Atualizando compra…':'Salvando compra…',input.installments>1?'Gerando as parcelas e vinculando-as às faturas corretas.':'Registrando a compra no cartão.',async()=>{if(id)await updatePurchase(id,input);else await createPurchase(input);closeDialog('purchase-dialog');toast(id?'Compra atualizada.':'Compra salva e parcelas geradas.','success');syncOperationMessage();await refreshAll()},{animateDashboard:true})}catch(e){console.error(e);setFormError('purchase-form-error',e.message||'Não foi possível salvar a compra.')}finally{setButtonBusy(btn,false)}}
async function onGoalSubmit(event){event.preventDefault();const btn=document.getElementById('goal-save-btn');setButtonBusy(btn,true);setFormError('goal-form-error','');try{const id=document.getElementById('goal-id').value;const input={name:document.getElementById('goal-name').value,target:Number(document.getElementById('goal-target').value),saved:Number(document.getElementById('goal-saved').value||0),dueDate:document.getElementById('goal-due').value};if(!input.name.trim()||input.target<=0||input.saved<0)throw new Error('Revise nome e valores da meta.');await runAppOperation(id?'Atualizando meta…':'Criando meta…','Salvando valores e progresso da meta.',async()=>{if(id)await updateGoal(id,input);else await createGoal(input);closeDialog('goal-dialog');toast(id?'Meta atualizada.':'Meta criada.','success');syncOperationMessage();await refreshAll()})}catch(e){console.error(e);setFormError('goal-form-error',e.message||'Não foi possível salvar a meta.')}finally{setButtonBusy(btn,false)}}
async function onBudgetSave(){
  const btn=document.getElementById('save-budget-btn');setButtonBusy(btn,true);
  try{
    const limits=Object.fromEntries(Object.entries(budgetDraft.limits||{}).map(([cat,value])=>[cleanBudgetCategoryName(cat),Math.max(0,Number(value||0))]).filter(([cat])=>cat));
    await runAppOperation('Salvando orçamento…','Atualizando a renda planejada e os limites do mês.',async()=>{
      state.budget=await saveBudget(budgetDate,Math.max(0,Number(budgetDraft.income||0)),limits);
      toast('Orçamento salvo.','success');renderBudget();renderHome();
    });
  }catch(e){console.error(e);toast(e.message||'Não foi possível salvar o orçamento.','error')}finally{setButtonBusy(btn,false)}
}
async function onFamilyInviteSubmit(event){event.preventDefault();const btn=document.getElementById('family-invite-save');setButtonBusy(btn,true,'Enviando…');setFormError('family-invite-error','');try{await runAppOperation('Enviando convite…','Localizando o usuário e registrando o convite familiar.',async()=>{await sendFamilyInvite(document.getElementById('family-invite-username').value);closeDialog('family-invite-dialog');toast('Convite enviado.','success');syncOperationMessage('Atualizando os vínculos e convites familiares.');await refreshAll()})}catch(e){console.error(e);setFormError('family-invite-error',e.message||'Não foi possível enviar o convite.')}finally{setButtonBusy(btn,false)}}
async function onFamilyPermissionsSubmit(event){event.preventDefault();const btn=document.getElementById('family-permissions-save');setButtonBusy(btn,true);setFormError('family-permissions-error','');try{await runAppOperation('Salvando permissões…','Atualizando exatamente quais grupos financeiros podem ser visualizados.',async()=>{await updateFamilyPermissions(document.getElementById('family-link-id').value,{transactions:document.getElementById('perm-transactions').checked,cards:document.getElementById('perm-cards').checked,goals:document.getElementById('perm-goals').checked,budget:document.getElementById('perm-budget').checked});closeDialog('family-permissions-dialog');toast('Permissões atualizadas.','success');syncOperationMessage('Atualizando os vínculos familiares.');await refreshAll()})}catch(e){console.error(e);setFormError('family-permissions-error',e.message||'Não foi possível salvar as permissões.')}finally{setButtonBusy(btn,false)}}
async function onProfileSettingsSubmit(event){event.preventDefault();const btn=document.getElementById('save-profile-settings-btn');setButtonBusy(btn,true);try{await runAppOperation('Salvando perfil…','Atualizando suas informações de exibição.',async()=>{currentProfile=await updateProfileSettings({displayName:document.getElementById('settings-display-name').value});showApp(currentUser,currentProfile);toast('Nome atualizado.','success');renderSettings()})}catch(e){console.error(e);toast('Não foi possível atualizar o perfil.','error')}finally{setButtonBusy(btn,false)}}
async function onLegacyMigrationSubmit(event){event.preventDefault();const btn=document.getElementById('legacy-migration-btn');setButtonBusy(btn,true,'Migrando…');setFormError('migration-error','');try{await runAppOperation('Migrando dados antigos…','Validando sua conta antiga e copiando os dados com segurança. Esta etapa pode levar alguns segundos.',async()=>{const result=await claimLegacyAccount(document.getElementById('legacy-username').value,document.getElementById('legacy-password').value);document.getElementById('legacy-password').value='';currentProfile=await ensureProfile(currentUser);showApp(currentUser,currentProfile);toast(`Migração concluída: ${result.transactions||0} lançamentos e ${result.goals||0} metas importados.`,'success');syncOperationMessage('Conferindo os dados migrados e reconstruindo a visão financeira.');await refreshAll()})}catch(e){console.error(e);setFormError('migration-error',e.message||'Não foi possível migrar os dados.')}finally{setButtonBusy(btn,false)}}
async function handleDynamicClick(event){const target=event.target.closest('button');if(!target||appActionBusy)return;try{
  if(target.dataset.notificationOpen)return await openNotification(target.dataset.notificationOpen);
  if(target.dataset.familyRespond)return await runAppOperation(target.dataset.accept==='1'?'Aceitando convite…':'Recusando convite…','Atualizando o vínculo familiar.',async()=>{const inviteId=target.dataset.familyRespond;await respondFamilyInvite(inviteId,target.dataset.accept==='1');await markNotificationsForTarget('family',inviteId).catch(()=>{});toast(target.dataset.accept==='1'?'Convite aceito.':'Convite recusado.','success');syncOperationMessage('Atualizando a área Família.');await refreshAll()});
  if(target.dataset.familyCancelInvite)return await runAppOperation('Cancelando convite…','Removendo o convite pendente.',async()=>{await cancelFamilyInvite(target.dataset.familyCancelInvite);toast('Convite cancelado.','success');syncOperationMessage('Atualizando a área Família.');await refreshAll()});
  if(target.dataset.familyPermissions)return openFamilyPermissions(target.dataset.familyPermissions);
  if(target.dataset.familyMonitor)return openFamilyMonitor(target.dataset.familyMonitor);
  if(target.dataset.familyMonitorFilter){familyMonitorFilter=['all','income','expense'].includes(target.dataset.familyMonitorFilter)?target.dataset.familyMonitorFilter:'all';familyMonitorRenderTransactions();return}
  if(target.dataset.familyRemove){if(!confirm('Remover este vínculo familiar?'))return;return await runAppOperation('Removendo vínculo…','Atualizando o acesso familiar com segurança.',async()=>{await removeFamilyLink(target.dataset.familyRemove);toast('Vínculo removido.','success');await closeFamilyMonitor();syncOperationMessage('Atualizando a área Família.');await refreshAll()})}

  if(target.dataset.planningFilter){planningTypeFilter=['all','income','expense'].includes(target.dataset.planningFilter)?target.dataset.planningFilter:'all';renderPlanning();return}
  if(target.dataset.editPlanning)return openEditPlanning(target.dataset.editPlanning);
  if(target.dataset.completePlanning)return await completePlanningAction(target.dataset.completePlanning);
  if(target.dataset.movePlanning)return await movePlanningAction(target.dataset.movePlanning);
  if(target.dataset.cancelPlanning)return await cancelPlanningAction(target.dataset.cancelPlanning);

  if(target.dataset.editTransaction)return openEditTransaction(target.dataset.editTransaction);
  if(target.dataset.deleteTransaction){const id=target.dataset.deleteTransaction;const t=state.transactions.find(x=>x.id===id);const series=!!t?.recurring_group_id;let removeSeries=false;if(series){removeSeries=confirm('Este lançamento é recorrente. OK = excluir toda a série. Cancelar = escolher apenas esta ocorrência.');if(!removeSeries&&!confirm('Excluir somente esta ocorrência?'))return;}else if(!confirm('Excluir este lançamento?'))return;return await runAppOperation(removeSeries?'Excluindo série…':'Excluindo lançamento…',removeSeries?'Removendo todas as ocorrências desta série recorrente.':'Removendo o lançamento selecionado.',async()=>{await deleteTransaction(id,removeSeries);toast('Lançamento excluído.','success');syncOperationMessage('Conferindo o histórico completo após a exclusão.');await refreshAll()},{animateDashboard:true})}
  if(target.dataset.editCard)return openEditCard(target.dataset.editCard);
  if(target.dataset.deleteCard){if(!confirm('Excluir o cartão e todas as compras/parcelas vinculadas?'))return;return await runAppOperation('Excluindo cartão…','Removendo o cartão e os registros vinculados.',async()=>{await deleteCard(target.dataset.deleteCard);toast('Cartão excluído.','success');syncOperationMessage();await refreshAll()},{animateDashboard:true})}
  if(target.dataset.newPurchase)return openNewPurchase(target.dataset.newPurchase);
  if(target.dataset.editPurchase)return openEditPurchase(target.dataset.editPurchase);
  if(target.dataset.deletePurchase){if(!confirm('Excluir esta compra e suas parcelas?'))return;return await runAppOperation('Excluindo compra…','Removendo a compra e as parcelas vinculadas.',async()=>{await deletePurchase(target.dataset.deletePurchase);toast('Compra excluída.','success');syncOperationMessage();await refreshAll()},{animateDashboard:true})}
  if(target.dataset.openInvoice)return openInvoice(target.dataset.openInvoice);
  if(target.dataset.toggleInvoice){const cardId=target.dataset.toggleInvoice;const paid=target.dataset.invoicePaid==='1';await runAppOperation(!paid?'Confirmando pagamento…':'Reabrindo fatura…',!paid?'Registrando o pagamento da fatura sem duplicar despesas.':'Revertendo o status de pagamento da fatura.',async()=>{await setInvoicePaid(cardId,`${dashboardDate.getFullYear()}-${String(dashboardDate.getMonth()+1).padStart(2,'0')}-01`,!paid);toast(!paid?'Fatura marcada como paga.':'Fatura reaberta.','success');closeDialog('invoice-dialog');syncOperationMessage();await refreshAll()},{animateDashboard:true});return openInvoice(cardId)}
  if(target.dataset.budgetEdit)return openBudgetCategoryEditor(target.dataset.budgetEdit);
  if(target.dataset.editGoal)return openEditGoal(target.dataset.editGoal);
  if(target.dataset.deleteGoal){if(!confirm('Excluir esta meta?'))return;return await runAppOperation('Excluindo meta…','Removendo a meta selecionada.',async()=>{await deleteGoal(target.dataset.deleteGoal);toast('Meta excluída.','success');syncOperationMessage();await refreshAll()})}
  if(target.dataset.goModule)return showModule(target.dataset.goModule);
}catch(e){console.error(e);toast(e.message||'Não foi possível concluir a ação.','error')}}
function bindUI(){setAuthMode(authMode);fillCategorySelect('transaction-category');fillCategorySelect('purchase-category');fillCategorySelect('planning-category','Outros');document.getElementById('transaction-filter-month').value='';document.getElementById('app-loading-dialog')?.addEventListener('cancel',event=>event.preventDefault());
  document.getElementById('auth-toggle').addEventListener('click',()=>{if(authBusy)return;authMode=authMode==='login'?'register':'login';setAuthError('');setAuthMode(authMode)});
  document.getElementById('auth-form').addEventListener('submit',async event=>{event.preventDefault();if(authBusy)return;setAuthError('');const username=document.getElementById('username').value.trim().toLowerCase(),password=document.getElementById('password').value;if(!username||!password)return setAuthError('Informe usuário e senha.');if(!/^[a-z0-9._-]{3,24}$/.test(username))return setAuthError('O usuário deve ter de 3 a 24 caracteres: letras minúsculas, números, ponto, hífen ou underline.');if(password.length<6)return setAuthError('A senha precisa ter pelo menos 6 caracteres.');authBusy=true;setAuthBusy(true,authMode,'auth');try{const submittedMode=authMode;const {data,error}=submittedMode==='register'?await signUp(username,password):await signIn(username,password);if(error)throw error;setAuthBusy(true,submittedMode,'data');await enterApp(data.session);if(submittedMode==='register')toast('Conta criada com sucesso.','success')}catch(error){console.error(error);setAuthError(error?.message||'Não foi possível autenticar.')}finally{authBusy=false;setAuthBusy(false,authMode)}});
  document.querySelectorAll('.nav-item[data-module]').forEach(b=>b.addEventListener('click',()=>showModule(b.dataset.module)));document.querySelectorAll('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>closeDialog(b.dataset.closeDialog)));document.querySelectorAll('[data-go-module]').forEach(b=>b.addEventListener('click',()=>showModule(b.dataset.goModule)));document.querySelectorAll('.mobile-nav-item[data-module]').forEach(b=>b.addEventListener('click',()=>showModule(b.dataset.module)));document.getElementById('mobile-more-btn').addEventListener('click',()=>openDialog('mobile-more-dialog'));document.querySelectorAll('[data-mobile-go]').forEach(b=>b.addEventListener('click',()=>{closeDialog('mobile-more-dialog');showModule(b.dataset.mobileGo)}));
  document.getElementById('notification-bell').addEventListener('click',event=>{event.stopPropagation();const pop=document.getElementById('notification-popover');setNotificationPopover(pop?.classList.contains('hidden'))});document.getElementById('notification-mark-all').addEventListener('click',()=>markAllNotifications().catch(e=>{console.error(e);toast('Não foi possível atualizar as notificações.','error')}));document.getElementById('notification-center-mark-all').addEventListener('click',()=>markAllNotifications().catch(e=>{console.error(e);toast('Não foi possível atualizar as notificações.','error')}));document.getElementById('notification-view-all').addEventListener('click',()=>{setNotificationPopover(false);renderNotifications();openDialog('notification-center-dialog')});document.addEventListener('click',event=>{if(!event.target.closest('.notification-anchor'))setNotificationPopover(false)});
  document.getElementById('logout-btn').addEventListener('click',async()=>{try{await runAppOperation('Saindo…','Encerrando sua sessão com segurança.',async()=>{const {error}=await signOut();if(error)throw error;showAuth()})}catch(e){console.error(e);toast('Não foi possível encerrar a sessão.','error')}});document.getElementById('mobile-logout-btn').addEventListener('click',async()=>{closeDialog('mobile-more-dialog');try{await runAppOperation('Saindo…','Encerrando sua sessão com segurança.',async()=>{const {error}=await signOut();if(error)throw error;showAuth()})}catch(e){console.error(e);toast('Não foi possível encerrar a sessão.','error')}});
  document.getElementById('new-transaction-btn').addEventListener('click',openNewTransaction);document.getElementById('quick-transaction').addEventListener('click',openNewTransaction);document.getElementById('open-balance-adjust').addEventListener('click',openBalance);document.getElementById('new-card-btn').addEventListener('click',openNewCard);document.getElementById('new-goal-btn').addEventListener('click',openNewGoal);document.getElementById('quick-dre').addEventListener('click',()=>openDRE(dashboardDate));document.getElementById('budget-dre-btn').addEventListener('click',()=>openDRE(budgetDate));document.getElementById('quick-pdf').addEventListener('click',()=>openReportBuilder(dashboardDate));document.getElementById('budget-pdf-btn').addEventListener('click',()=>openReportBuilder(budgetDate));document.getElementById('quick-analytics').addEventListener('click',openAnalytics);document.querySelectorAll('[data-module="planning"],[data-go-module="planning"],[data-mobile-go="planning"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(()=>void loadPlanningMonth(planningDate,{quiet:true}),0)));document.querySelectorAll('[data-module="analytics"],[data-go-module="analytics"],[data-mobile-go="analytics"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(()=>void renderAnalytics(),0)));document.querySelectorAll('[data-analysis-mode]').forEach(btn=>btn.addEventListener('click',()=>setAnalysisMode(btn.dataset.analysisMode)));document.querySelectorAll('[data-analysis-tab]').forEach(btn=>btn.addEventListener('click',()=>setAnalysisTab(btn.dataset.analysisTab)));['analytics-month-a','analytics-month-b','analytics-year-a','analytics-year-b'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>void renderAnalytics()));document.getElementById('report-generate-btn').addEventListener('click',generateSelectedReport);document.getElementById('report-month-list').addEventListener('change',event=>{if(event.target.matches('[data-report-month]')){setFormError('report-form-error','');updateReportSelectionSummary()}});document.querySelectorAll('[data-report-preset]').forEach(btn=>btn.addEventListener('click',()=>applyReportPreset(btn.dataset.reportPreset)));document.getElementById('save-budget-btn').addEventListener('click',onBudgetSave);document.getElementById('budget-calibrate-btn').addEventListener('click',openBudgetCalibration);document.getElementById('budget-add-category-btn').addEventListener('click',()=>openBudgetCategoryEditor());document.getElementById('budget-analysis-toggle').addEventListener('click',toggleBudgetAnalysis);document.getElementById('budget-auto-btn').addEventListener('click',historicalBudgetSuggestion);document.getElementById('budget-manual-btn').addEventListener('click',applyManualBudgetCalibration);document.getElementById('budget-restore-btn').addEventListener('click',restoreSavedBudgetDraft);document.getElementById('budget-category-name').addEventListener('input',updateBudgetCategoryDialog);document.getElementById('budget-category-apply').addEventListener('click',applyBudgetCategoryDraft);document.getElementById('budget-category-remove').addEventListener('click',removeBudgetCategoryLimit);
  document.getElementById('transaction-form').addEventListener('submit',onTransactionSubmit);document.getElementById('planning-form').addEventListener('submit',onPlanningSubmit);document.getElementById('balance-form').addEventListener('submit',onBalanceSubmit);document.getElementById('card-form').addEventListener('submit',onCardSubmit);document.getElementById('purchase-form').addEventListener('submit',onPurchaseSubmit);document.getElementById('goal-form').addEventListener('submit',onGoalSubmit);document.getElementById('family-invite-form').addEventListener('submit',onFamilyInviteSubmit);document.getElementById('family-permissions-form').addEventListener('submit',onFamilyPermissionsSubmit);document.getElementById('profile-settings-form').addEventListener('submit',onProfileSettingsSubmit);document.getElementById('legacy-migration-form').addEventListener('submit',onLegacyMigrationSubmit);document.getElementById('new-planning-btn').addEventListener('click',openNewPlanning);document.getElementById('planning-prev').addEventListener('click',()=>void setPlanningMonth(shiftPlanningMonth(planningDate,-1)));document.getElementById('planning-next').addEventListener('click',()=>void setPlanningMonth(shiftPlanningMonth(planningDate,1)));document.getElementById('planning-current').addEventListener('click',()=>void setPlanningMonth(planningCurrentMonth()));document.getElementById('planning-status-filter').addEventListener('change',event=>{planningStatusFilter=event.target.value||'all';renderPlanning()});document.getElementById('planning-move-all').addEventListener('click',()=>void moveAllPlanningPending());document.getElementById('new-family-invite-btn').addEventListener('click',()=>{document.getElementById('family-invite-form').reset();setFormError('family-invite-error','');openDialog('family-invite-dialog')});document.getElementById('family-monitor-close').addEventListener('click',()=>void closeFamilyMonitor());document.getElementById('family-monitor-prev').addEventListener('click',()=>void setFamilyMonitorMonth(shiftFamilyMonth(familyMonitorDate,-1)));document.getElementById('family-monitor-next').addEventListener('click',()=>{if(familyMonitorCanAdvance())void setFamilyMonitorMonth(shiftFamilyMonth(familyMonitorDate,1))});document.getElementById('family-monitor-current').addEventListener('click',()=>void setFamilyMonitorMonth(familyMonitorCurrentMonth()));document.getElementById('family-monitor-month-input').addEventListener('change',event=>{const date=familyDateFromMonth(event.target.value);if(date)void setFamilyMonitorMonth(date)});document.querySelectorAll('[data-theme-choice]').forEach(btn=>btn.addEventListener('click',async()=>{if(appActionBusy)return;try{await runAppOperation('Salvando aparência…','Guardando sua preferência de tema.',async()=>{currentProfile=await updateProfileSettings({theme:btn.dataset.themeChoice});applyTheme(currentProfile.theme);toast('Tema atualizado.','success')})}catch(e){console.error(e);toast('Não foi possível salvar o tema.','error')}}));
  document.getElementById('transaction-recurring').addEventListener('change',e=>document.getElementById('recurring-count-wrap').classList.toggle('hidden',!e.target.checked));['transaction-search','transaction-filter-type','transaction-filter-month'].forEach(id=>document.getElementById(id).addEventListener(id==='transaction-search'?'input':'change',renderTransactions));
  document.querySelectorAll('[data-month-action]').forEach(b=>b.addEventListener('click',async()=>{if(appActionBusy)return;const previousDashboard=new Date(dashboardDate),previousBudget=new Date(budgetDate);dashboardDate=addMonth(dashboardDate,b.dataset.monthAction==='next'?1:-1);budgetDate=new Date(dashboardDate);try{await runAppOperation('Carregando mês…',`Buscando o orçamento de ${monthLabel(budgetDate)}.`,async()=>{const [budget,planning]=await Promise.all([getBudget(budgetDate),listPlanningMonth(dashboardDate)]);state.budget=budget;state.planning=planning;if(planningSameMonth(planningDate,dashboardDate))planningItems=planning;renderHome();renderBudget();renderPlanning()})}catch(e){dashboardDate=previousDashboard;budgetDate=previousBudget;renderHome();renderBudget();toast('Não foi possível carregar o mês.','error')}}));document.querySelectorAll('[data-budget-month]').forEach(b=>b.addEventListener('click',async()=>{if(appActionBusy)return;const previousBudget=new Date(budgetDate);budgetDate=addMonth(budgetDate,b.dataset.budgetMonth==='next'?1:-1);try{await runAppOperation('Carregando orçamento…',`Buscando os limites de ${monthLabel(budgetDate)}.`,async()=>{state.budget=await getBudget(budgetDate);renderBudget()})}catch(e){budgetDate=previousBudget;renderBudget();toast('Não foi possível carregar o orçamento.','error')}}));document.addEventListener('click',handleDynamicClick)}

async function init(){bindUI();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&familyMonitorOwnerId&&!document.getElementById('family-monitor-panel')?.classList.contains('hidden'))void loadFamilyMonitor({animate:true,reason:'Conferindo atualizações…'})});void initPWA().catch(error=>console.warn('PWA:',error));const session=await getSession().catch(()=>null);if(session){setAuthBusy(true,'login','data');try{await enterApp(session)}finally{setAuthBusy(false,'login')}}else showAuth();onAuthChange(async next=>{if(next)await enterApp(next);else{bootstrapGeneration++;currentUser=null;currentProfile=null;if(notificationChannel){try{await notificationChannel.unsubscribe()}catch{}notificationChannel=null}await stopFamilyMonitorRealtime();familyMonitorOwnerId=null;showAuth()}})}
init();

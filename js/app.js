import {moneyValue,setMoney,initMoneyInputs} from './money-input.js?v=2.9.42';
import {GOAL_DEFAULT_ICON,goalAppearance,normalizeGoalIcon,nextGoalColor} from './goal-appearance.js?v=2.9.42';
import {GOAL_ICON_OPTIONS,goalIconSVG} from './goal-icons.js?v=2.9.42';
import { initTotalWorkspace } from './total-workspace.js?v=2.9.42';
import { pagedList, recentRecords, clearListPages, revealListRecord } from './list-pagination.js?v=2.9.42';
import { initCardsWorkspace,cardErrorMessage,showCardError } from './cards-workspace.js?v=2.9.42';
import { adjustmentsAsInstallments,buildCardInvoices,cardToday,cardMonth } from './card-domain.js?v=2.9.42';
import { formOperation, clearFormOperation } from './request-operation.js?v=2.9.42';
import { canonicalCategoryName, canonicalCategoryAmounts, canonicalCategoryLimits } from './category-alias.js?v=2.9.42';
import { spendingInPastMonths } from './budget-suggestion.js?v=2.9.42';
import { signIn,signUp,signOut,getSession,onAuthChange } from './auth.js?v=2.9.42';
import { ensureProfile,foundationHealthCheck } from './database.js?v=2.9.42';
import { listFamilyData,sendFamilyInvite,respondFamilyInvite,cancelFamilyInvite,updateFamilyPermissions,removeFamilyLink,loadFamilyOverview,subscribeFamilyOverview,getFamilyAccess,familyAccessSignature } from './family.js?v=2.9.42';
import { getLegacyMigrationStatus,claimLegacyAccount } from './migration.js?v=2.9.42';
import { updateProfileSettings } from './settings.js?v=2.9.42';
import { initPWA, activateAppUpdate } from './pwa.js?v=2.9.42';
import { localISO,listTransactions,createTransaction,updateTransaction,deleteTransaction,applyBalanceAdjustment,calculateCashStats,filterTransactions } from './finance.js?v=2.9.42';
import { listCards,createCard,updateCard,deleteCard,createPurchase,updatePurchase,deletePurchase,getPurchase,listPurchases,listInstallments,listInvoiceStatuses,setInvoicePaid,listCardPayments,listCardAdjustments,listCardReconciliations } from './cards.js?v=2.9.42';
import { listGoals,createGoal,updateGoal,deleteGoal } from './goals.js?v=2.9.42';
import { getBudget,listBudgetsByMonths,saveBudget,budgetSummary } from './budget.js?v=2.9.42';
import { listCategories,activeCategories,createCategory,updateCategory,setCategoryActive,deleteCustomCategory,categoryIconSVG,normalizeCategoryIconKey,CATEGORY_ICON_OPTIONS,CATEGORY_COLOR_OPTIONS } from './categories.js?v=2.9.42';
import { planningMonthKey,planningMonthDate,shiftPlanningMonth,planningMonthInput,planningLocalISO,listPlanningMonth,listPlanningByMonths,createPlanningItem,updatePlanningItem,cancelPlanningItem,completePlanningItem,movePlanningItem,movePendingPlanningMonth,planningNextMonthDate,planningStatusLabel,planningNature,summarizePlanning,summarizePlanningPeriod } from './planning-v18.js?v=2.9.42';
import { listNotifications,markNotificationRead,markAllNotificationsRead,markNotificationsForTarget,syncFinancialNotifications,subscribeNotifications } from './notifications.js?v=2.9.42';
import { setAuthMode,showAuth,showApp,showModule,setAuthError,setAuthBusy,setAppBusy,toast,setLoading,formatBRL,formatDate,monthLabel,escapeHTML,openDialog,closeDialog,setFormError,emptyState,applyTheme,captureDashboardMoneyState,prepareDashboardMoneyChange,playDashboardMoneyChange,settleDashboardMoneyChange } from './ui.js?v=2.9.42';
import { getReportMonthOptions,downloadFinancialReportPDF } from './reports.js?v=2.9.42';
import { beginDownloadMotion } from './download-motion-v16.js?v=2.9.42';
import { familyMonthKey,familyDateFromMonth,shiftFamilyMonth,buildFamilyMonitorModel,filterFamilyTransactions,captureFamilyMetricState,animateFamilyMetricChange } from './family-monitor-v17.js?v=2.9.42';
import { buildFinancialMonthLedger,isCardInvoicePayment,isCardInvoiceReversal,isCardPurchaseRefund,classifyTransaction } from './financial-ledger.js?v=2.9.42';
import { needsLegacyReview, legacyReview, ownTransferReview } from './financial-integrity.js?v=2.9.42';
import { downloadFinancialRowsCSV } from './report-export.js?v=2.9.42';
import { suggestNature,natureLabel } from './transaction-nature.js?v=2.9.42';
import { goalProgress, financialViewSummary } from './goal-integration.js?v=2.9.42';
import { buildReservePosition } from './reserve-position.js?v=2.9.42';
import { saveReserveReconciliation } from './reserve-reconciliation.js?v=2.9.42';
import { analysisMonthKey,analysisMonthDate,shiftAnalysisMonth,yearMonthKeys,equivalentComparisonSpec,availableAnalysisYears,buildAnalysisPeriod,comparePeriodTotals,compareCategories,compareCards,aggregateBudgetComparison,strongestCategoryChanges,buildMonthlyInsights,buildYearInsights,groupCategoryRowsWithRemainder } from './analytics.js?v=2.9.42';
import { buildDashboardOverview } from './dashboard-overview.js?v=2.9.42';
import { buildDashboardCashView, buildDashboardCardView, paidInvoiceMonthsForPurchase } from './dashboard-cash.js?v=2.9.42';
import { initUpdateCenter, promptAppUpdateIfNeeded } from './update-center.js?v=2.9.42';

initMoneyInputs();
let authMode='login', authBusy=false, appActionBusy=false, reportDownloadBusy=false, enterAppPromise=null, refreshBusy=false, bootstrapGeneration=0, notificationChannel=null, familyMonitorChannel=null;
let currentUser=null, currentProfile=null;
let cardsWorkspace=null;
let dashboardDate=new Date(new Date().getFullYear(),new Date().getMonth(),1,12);
let budgetDate=new Date(new Date().getFullYear(),new Date().getMonth(),1,12);
let dashboardBudget={plan:null,items:[]};
let familyMonitorOwnerId=null,familyMonitorDate=new Date(new Date().getFullYear(),new Date().getMonth(),1,12),familyMonitorFilter='all',familyMonitorData=null,familyMonitorModel=null,familyMonitorRequest=0,familyMonitorRefreshTimer=null;
let planningDate=new Date(new Date().getFullYear(),new Date().getMonth(),1,12),planningItems=[],planningTypeFilter='all',planningStatusFilter='all',planningSection='overview';
const familyMonitorMonths=new Map();
let reportReferenceDate=new Date(new Date().getFullYear(),new Date().getMonth(),1,12);
let state={transactions:[],cards:[],purchases:[],installments:[],invoiceStatuses:[],cardPayments:[],cardAdjustments:[],cardReconciliations:[],goals:[],budget:{plan:null,items:[]},planning:[],categories:[],family:null,migration:{claimed:false},notifications:[]};
let reservePosition=null;
const totalDetails=initTotalWorkspace({
 getContext:()=>({state,dashboardDate,planningDate,planningItems,family:familyMonitorOwnerId&&familyMonitorData?{owner:familyMonitorOwnerId,date:familyMonitorDate,data:familyMonitorData,model:familyMonitorModel,signature:familyAccessSignature(familyMonitorData.link)}:null}),
 onNavigate:navigateTotalRow,verifyFamily:verifyFamilyPageAccess
});

let categoriesKind='expense',categoriesSearch='',categoryActionId=null,budgetActionCategory='';

function categoryKindFromDirection(direction){return Number(direction)>0?'income':'expense'}
function categoryOptions(kind='expense',extra=''){
  const rows=activeCategories(state.categories||[],kind);
  const values=rows.map(row=>row.name);
  if(extra&&!values.some(name=>name.toLocaleLowerCase('pt-BR')===String(extra).trim().toLocaleLowerCase('pt-BR')))values.push(String(extra).trim());
  return values.filter(Boolean);
}
function fillCategorySelect(id,selected='',kind='expense'){
  const el=document.getElementById(id);if(!el)return;
  const value=selected||'';
  const options=categoryOptions(kind,value);
  el.innerHTML=options.length?options.map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join(''):'<option value="">Nenhuma categoria ativa</option>';
  el.disabled=!options.length;
  if(value&&options.includes(value))el.value=value;
}
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
async function executeLogout({closeMobile=false}={}){
  if(closeMobile)closeDialog('mobile-more-dialog');
  try{
    await runAppOperation('Saindo…','Encerrando sua sessão com segurança.',async()=>{const {error}=await signOut();if(error)throw error;showAuth()});
  }catch(e){
    console.error(e);
    toast('Não foi possível encerrar a sessão.','error');
  }
}

function renderBootstrapCore(){renderHome();renderTransactionPeriodOptions();renderTransactions();renderCards();renderGoals();renderBudget();renderPlanningHome()}

async function loadDeferredStartupData(generation){
  const current=()=>generation===bootstrapGeneration&&!!currentUser;
  const tasks=[
    ['compras',listPurchases,rows=>{state.purchases=rows;renderCards()}],
    ['família',listFamilyData,data=>{state.family=data;renderFamily()}],
    ['migração',getLegacyMigrationStatus,data=>{state.migration=data;renderSettings()}]
  ];
  const results=await Promise.allSettled(tasks.map(async([label,load,apply])=>{
    try{const data=await load();if(current())apply(data)}
    catch(error){if(current())console.warn(`Carregamento de ${label}:`,error);throw error;}
  }));
  if(current()&&results.some(result=>result.status==='rejected'))toast('Algumas informações ainda não foram sincronizadas. Você pode tentar novamente.','error');
}

async function loadNotificationStartupData(generation){
  try{
    await syncFinancialNotifications({budget:dashboardBudget,transactions:state.transactions,installments:state.installments,cards:state.cards,invoiceStatuses:state.invoiceStatuses,goals:state.goals,categories:state.categories});
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
      currentUser=session.user;cardsWorkspace?.reset();
      await stopFamilyMonitorRealtime();familyMonitorOwnerId=null;familyMonitorData=null;familyMonitorModel=null;
      state={transactions:[],cards:[],purchases:[],installments:[],invoiceStatuses:[],cardPayments:[],cardAdjustments:[],cardReconciliations:[],goals:[],budget:{plan:null,items:[]},planning:[],categories:[],family:null,migration:{claimed:false},notifications:[]};
      planningDate=new Date(dashboardDate);planningItems=[];
      const [profile,transactions,cards,installments,invoiceStatuses,cardPayments,cardAdjustments,cardReconciliations,goals,budget,planning,categories]=await Promise.all([
        ensureProfile(session.user),listTransactions(),listCards(),listInstallments(),listInvoiceStatuses(),listCardPayments(),listCardAdjustments(),listCardReconciliations(),listGoals(),getBudget(budgetDate),listPlanningMonth(dashboardDate),listCategories()
      ]);
      if(generation!==bootstrapGeneration)return;
      currentProfile=profile;
      state.transactions=transactions;state.cards=cards;state.installments=[...installments.map(i=>({...i,legacy_covered_amount:cardReconciliations.filter(r=>r.installment_id===i.id).reduce((sum,r)=>sum+Number(r.amount),0)})),...adjustmentsAsInstallments(cardAdjustments,cards)];state.invoiceStatuses=invoiceStatuses;state.cardPayments=cardPayments;state.cardAdjustments=cardAdjustments;state.cardReconciliations=cardReconciliations;state.goals=goals;state.budget=budget;dashboardBudget=budget;state.planning=planning;state.categories=categories;planningItems=planning;
      showModule('home');renderBootstrapCore();renderSettings();showApp(session.user,currentProfile);setTimeout(()=>promptAppUpdateIfNeeded(),180);
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

async function refreshAll({throwOnError=false}={}){if(refreshBusy)return;refreshBusy=true;setLoading(true);try{const [transactions,cards,purchases,installments,invoiceStatuses,cardPayments,cardAdjustments,cardReconciliations,goals,budget,planning,categories,family,migration]=await Promise.all([listTransactions(),listCards(),listPurchases(),listInstallments(),listInvoiceStatuses(),listCardPayments(),listCardAdjustments(),listCardReconciliations(),listGoals(),getBudget(budgetDate),listPlanningMonth(dashboardDate),listCategories(),listFamilyData(),getLegacyMigrationStatus()]);state={transactions,cards,purchases,installments:[...installments.map(i=>({...i,legacy_covered_amount:cardReconciliations.filter(r=>r.installment_id===i.id).reduce((sum,r)=>sum+Number(r.amount),0)})),...adjustmentsAsInstallments(cardAdjustments,cards)],invoiceStatuses,cardPayments,cardAdjustments,cardReconciliations,goals,budget,planning,categories,family,migration,notifications:state.notifications||[]};if(planningSameMonth(budgetDate,dashboardDate))dashboardBudget=budget;if(planningMonthKey(planningDate)===planningMonthKey(dashboardDate))planningItems=planning;await syncFinancialNotifications({budget:dashboardBudget,transactions:state.transactions,installments:state.installments,cards:state.cards,invoiceStatuses:state.invoiceStatuses,goals:state.goals,categories:state.categories});state.notifications=await listNotifications();renderAll()}catch(error){console.error(error);toast(error?.message||'Falha ao sincronizar dados.','error');if(throwOnError)throw error;}finally{setLoading(false);refreshBusy=false}}

function renderAll(){renderHome();if(document.getElementById('goal-history-dialog')?.open)renderGoalHistory();if(document.getElementById('reserve-dialog')?.open)renderReserveDetails();renderTransactionPeriodOptions();renderTransactions();renderCards();renderGoals();renderBudget();renderPlanningHome();renderPlanning();renderFamily();renderSettings();renderCategoriesManager();renderNotifications();void totalDetails.refresh();if(!document.getElementById('module-analytics')?.classList.contains('hidden'))void renderAnalytics()}

function renderHome(){
  document.getElementById('home-month-label').textContent=monthLabel(dashboardDate);document.getElementById('home-period').textContent=`Referência: ${monthLabel(dashboardDate)}`;
  const cash=calculateCashStats(state.transactions,dashboardDate);const dashboardLedger=buildFinancialMonthLedger({transactions:state.transactions,installments:state.installments,invoiceStatuses:state.invoiceStatuses,monthKey:dashboardDate});const cardView=buildDashboardCardView({cards:state.cards,installments:state.installments,invoiceStatuses:state.invoiceStatuses});const dashboardCash=buildDashboardCashView({cash,transactions:state.transactions,invoiceSummaries:cardView.invoices,refDate:dashboardDate});
  document.getElementById('stat-balance').textContent=formatBRL(cash.balance);document.getElementById('stat-income').textContent=formatBRL(cash.income);document.getElementById('stat-expense').textContent=formatBRL(dashboardCash.expensePaid);document.getElementById('stat-card-expense').textContent=formatBRL(cardView.payableTotal);document.getElementById('stat-month-result').textContent=formatBRL(dashboardCash.result);document.getElementById('stat-projected').textContent=formatBRL(dashboardCash.projected);
  const bs=budgetSummary(dashboardBudget,state.transactions,state.installments,dashboardDate,new Date(),state.categories);
  const overview=buildDashboardOverview({transactions:state.transactions,ledger:dashboardLedger,budget:bs,refDate:dashboardDate});
  // Patrimônio reservado: Metas + reservas avulsas confirmadas, menos resgates.
  // Valores não conciliados nunca são presumidos independentes, pois podem já compor o saldo manual das Metas.
  reservePosition=buildReservePosition({goals:state.goals,transactions:state.transactions,today:localISO()});
  document.getElementById('stat-allocation').textContent=formatBRL(reservePosition.confirmedBalance);
  document.getElementById('home-transactions').innerHTML=overview.recent.length?overview.recent.map(homeTransactionRowHTML).join(''):emptyState('Nenhum lançamento realizado neste mês.');
  const goals=state.goals.filter(g=>g.status!=='archived').slice(0,4);
  document.getElementById('home-goals').innerHTML=goals.length?goals.map(g=>`<button type="button" class="home-goal home-goal-row" style="--goal-color:var(--goal-${goalAppearance(g).colorKey})" data-edit-goal="${escapeHTML(g.id)}" aria-label="Abrir meta ${escapeHTML(g.name)}">${goalMiniHTML(g)}</button>`).join(''):emptyState('Nenhuma meta cadastrada.');
  document.getElementById('home-budget-spent').textContent=formatBRL(overview.limitedSpent);
  document.getElementById('home-budget-limit').textContent=bs.totalLimit?`de ${formatBRL(bs.totalLimit)}`:'Sem limite definido';
  document.getElementById('home-budget-caption').textContent=bs.totalLimit?`${overview.percent.toFixed(0)}% utilizado${overview.percent>100?' · Excedido':''}`:'Nenhum limite definido.';
  document.getElementById('home-budget-progress').style.width=`${Math.min(100,overview.percent)}%`;
  document.querySelector('#module-home .budget-summary').classList.toggle('over-budget',overview.percent>100);
  document.getElementById('home-budget-note').textContent=overview.unlimitedSpent>0?`${formatBRL(overview.unlimitedSpent)} em categorias sem limite.`:bs.totalLimit?'Nas categorias com limite definido.':'';
  renderPlanningHome();totalDetails.wireHome();
}


function renderReserveDetails(){
  const position=reservePosition||buildReservePosition({goals:state.goals,transactions:state.transactions,today:localISO()});
  const root=document.getElementById('reserve-detail-body');if(!root)return;
  const shortDate=position.asOf.split('-').reverse().join('/');
  const goalsList=position.accountedGoals.length
    ? position.accountedGoals.map(({goal,progress})=>`<div class="reserve-composition-row"><span>${escapeHTML(goal.name)}</span><strong>${formatBRL(progress.saved)}</strong></div>`).join('')
    : `<div class="reserve-empty-line">Nenhuma meta com saldo no momento.</div>`;
  const investLabel=position.independentBalance===0?'Nenhum valor investido fora das metas':'Valor investido fora das metas';
  const archivedNotice=position.archivedWithFunds.length?`<div class="reserve-inline-note">${position.archivedWithFunds.length} meta(s) arquivada(s) com saldo não entram na composição atual.</div>`:'';
  const pendingNotice=position.pending.length?`<div class="reserve-inline-note">${position.pending.length} movimentação(ões) ainda não conciliadas não entram neste total.</div>`:'';
  root.innerHTML=`
    <div class="reserve-detail-total reserve-highlight-card">
      <small>Saldo confirmado em ${shortDate}</small>
      <strong>${formatBRL(position.confirmedBalance)}</strong>
    </div>
    <section class="reserve-detail-section reserve-composition-block">
      <h4>Composição do saldo</h4>
      <div class="reserve-summary-card">
        <h5>Metas</h5>
        ${goalsList}
        <div class="reserve-composition-row reserve-composition-total"><span>Total em Metas</span><strong>${formatBRL(position.goalBalance)}</strong></div>
      </div>
      <div class="reserve-summary-card">
        <h5>Investidos</h5>
        <div class="reserve-composition-row"><span>${investLabel}</span><strong>${formatBRL(position.independentBalance)}</strong></div>
        <div class="reserve-composition-row reserve-composition-total"><span>Total Investidos</span><strong>${formatBRL(position.independentBalance)}</strong></div>
      </div>
      <div class="reserve-summary-card reserve-highlight-card reserve-grand-total">
        <h5>Total da composição</h5>
        <strong>${formatBRL(position.confirmedBalance)}</strong>
      </div>
      ${archivedNotice}${pendingNotice}
    </section>
  `;
}
async function setReserveTreatment(id,value){
  const row=state.transactions.find(t=>t.id===id);if(!row)return;
  if(value==='included'&&!confirm('Confirme: esse aporte JÁ está dentro do saldo manual de uma meta. Ele não será somado novamente. Continuar?'))return;
  if(value==='separate'&&!confirm('Confirme: esse dinheiro é uma reserva independente e NÃO está incluído nos saldos das metas. Continuar?'))return;
  await runAppOperation('Conciliando reserva…','Verificando a movimentação no banco de dados.',async()=>{
    await saveReserveReconciliation(id,value==='pending'?null:value);
    await refreshAll();
    renderReserveDetails();
    toast('Classificação da reserva atualizada.','success');
  },{animateDashboard:true});
}

// Componente único dos dois históricos: Dashboard (compacto) e Lançamentos (completo).
// Compartilha ícones, cores, badges, valores e ações; o Dashboard define apenas o recorte dos dados.
function sharedTransactionRowHTML(t,{compact=false}={}){
  const signed=Number(t.direction)*Number(t.amount||0);
  const isAdj=t.type==='balance_adjustment';
  const isPayment=isCardInvoicePayment(t)||isCardInvoiceReversal(t)||isCardPurchaseRefund(t);
  const categoryType=signed>=0?'income':'expense';
  const sameName=(c)=>String(c.name).toLocaleLowerCase('pt-BR')===String(t.category).toLocaleLowerCase('pt-BR');
  const historicName=(c)=>(c.name_history||[]).some(n=>String(n).toLocaleLowerCase('pt-BR')===String(t.category).toLocaleLowerCase('pt-BR'));
  const matchesType=(c)=>c.kind==='both'||c.kind===categoryType;
  const exact=(state.categories||[]).find(c=>sameName(c)&&matchesType(c));
  const historic=exact?null:(state.categories||[]).find(c=>historicName(c)&&matchesType(c));
  const originalVisual=historic?Object.entries(historic.name_history_visual||{}).find(([name])=>String(name).toLocaleLowerCase('pt-BR')===String(t.category).toLocaleLowerCase('pt-BR'))?.[1]:null;
  const record=exact||(historic?{...historic,...(originalVisual||{})}:null);
  const icon=record?categoryIconMarkup(record,t.category):`<span class="home-transaction-icon ${signed>=0?'income':'expense'}"><svg aria-hidden="true" class="ui-icon"><use href="#i-${isPayment?'card':isAdj?'wallet':signed>=0?'trending-up':'receipt'}"></use></svg></span>`;
  const name=escapeHTML(t.description||'Lançamento');
  const key=escapeHTML(t.id||'');
  const actions=isPayment?'<span class="home-payment-note">Via Cartões</span>':`${isAdj?'':`<button type="button" class="mini-btn" data-edit-transaction="${key}" aria-label="Editar ${name}" title="Editar"><svg aria-hidden="true" class="ui-icon"><use href="#i-pencil"></use></svg></button>`}<button type="button" class="mini-btn danger" data-delete-transaction="${key}" aria-label="Excluir ${name}" title="Excluir"><svg aria-hidden="true" class="ui-icon"><use href="#i-trash"></use></svg></button>`;
  const labels={income:'Receita',consumption:'Despesa',resgate:'Resgate',allocation:'Reserva',transfer:'Transferência',adjustment:'Ajuste',payment:'Pagamento de fatura',reversal:'Correção de pagamento',refund:'Estorno de compra',legacy:'Revisar'};
  const rawNature=isAdj?'adjustment':isCardInvoiceReversal(t)?'reversal':isCardPurchaseRefund(t)?'refund':isCardInvoicePayment(t)?'payment':t.financial_nature||'legacy';
  const nature=Object.hasOwn(labels,rawNature)?rawNature:'legacy';
  return `<div data-total-transaction="${key}" class="${compact?'home-transaction transaction-entry-compact home-tx-entry':'transaction-entry-full tx-entry'}">${icon}<div class="tx-copy"><span class="tx-nature tx-nature-${nature}">${labels[nature]}</span><div class="tx-title" title="${name}">${name}</div><div class="tx-meta"><span>${escapeHTML(t.category||'Outros')}</span><span>${formatDate(t.occurred_on)}</span>${t.recurring_group_id?'<span>Recorrente</span>':''}</div></div><div class="tx-side"><strong class="tx-value ${signed>=0?'positive':'negative'}">${signed>=0?'+':'−'} ${formatBRL(Math.abs(signed))}</strong><div class="row-actions">${actions}</div></div></div>`;
}
function homeTransactionRowHTML(t){return sharedTransactionRowHTML(t,{compact:true});}
function transactionRowHTML(t){return sharedTransactionRowHTML(t,{compact:false});}
function renderTransactionPeriodOptions(){const select=document.getElementById('transaction-filter-month');if(!select)return;const current=select.value||'';const months=[...new Set(state.transactions.map(t=>String(t.occurred_on||'').slice(0,7)).filter(v=>/^\d{4}-\d{2}$/.test(v)))].sort().reverse();select.innerHTML='<option value="">Todos os períodos</option>'+months.map(value=>{const [y,m]=value.split('-').map(Number);return `<option value="${value}">${escapeHTML(monthLabel(new Date(y,m-1,1,12)))}</option>`}).join('');select.value=current&&months.includes(current)?current:'';}
function transactionNatureBadge(t,showReview=false){return t.financial_nature?`<span class="nature-tag">${escapeHTML(natureLabel(t))}</span>`:(showReview&&needsLegacyReview(t))?'<span class="nature-tag" title="Classificação ainda não confirmada. Clique em Editar para revisar.">Revisar natureza</span>':'';}
function renderTransactions(){
  const search=document.getElementById('transaction-search').value||'';
  const type=document.getElementById('transaction-filter-type').value||'all';
  const month=document.getElementById('transaction-filter-month').value||'';
  const base=['allocation','transfer','resgate','legacy'].includes(type)?'all':type;
  const rows=filterTransactions(state.transactions,{search,type:base,month}).filter(t=>
    type==='legacy'?needsLegacyReview(t):type==='allocation'?classifyTransaction(t)==='allocation':
    type==='transfer'?t.financial_nature==='transfer':type==='resgate'?t.financial_nature==='resgate':true);
  const status=document.getElementById('transaction-sync-status');
  if(status){
    const filtered=search.trim()||type!=='all'||month;
    const legacyCount=legacyReview(state.transactions).length;
    const transferAudit=ownTransferReview(state.transactions);
    status.innerHTML=`<span class="tx-sync-copy">${filtered?`${rows.length} de ${state.transactions.length} lançamentos`:`${state.transactions.length} lançamentos`}<span class="tx-sync-divider">·</span><span class="tx-sync-state"><span class="tx-sync-dot" aria-hidden="true"></span>Sincronizado</span></span><span class="tx-review-notices">${legacyCount?`<span class="tx-review">${legacyCount} antigo${legacyCount===1?'':'s'} para revisar</span>`:''}${transferAudit.ambiguous.length?`<span class="tx-review">${transferAudit.ambiguous.length} transferência${transferAudit.ambiguous.length===1?'':'s'} para revisar</span>`:''}</span>`;

  }
  document.getElementById('transactions-list').innerHTML=pagedList('transactions',recentRecords(rows),transactionRowHTML,{context:JSON.stringify([search.trim(),type,month]),label:'lançamentos',empty:emptyState('Nenhum lançamento encontrado.')});
}

function purchasePaidInvoiceMonths(purchaseId){return paidInvoiceMonthsForPurchase(state.installments,state.invoiceStatuses,purchaseId)}
function purchaseTouchesPaidInvoice(purchaseId){return purchasePaidInvoiceMonths(purchaseId).length>0||state.cardAdjustments.some(a=>a.purchase_id===purchaseId)||state.cardReconciliations.some(r=>state.installments.some(i=>i.id===r.installment_id&&i.purchase_id===purchaseId))}
function explainPaidPurchaseLock(){toast('Corrija os pagamentos vinculados antes de editar ou excluir esta compra.','error')}

function renderCards(){cardsWorkspace?.render()}

function goalMiniHTML(g){
  const progress=goalProgress(g,state.transactions),appearance=goalAppearance(g),pct=progress.percent;
  return `<span class="home-goal-icon" aria-hidden="true">${goalIconSVG(appearance.iconKey)}</span><span class="home-goal-copy"><strong class="home-goal-name">${escapeHTML(g.name)}</strong><span class="home-goal-amounts"><span class="home-goal-money"><strong>${formatBRL(progress.saved)}</strong><span>de ${formatBRL(progress.target)}</span></span><strong class="home-goal-percent">${pct.toFixed(0)}%</strong></span><span class="progress" role="progressbar" aria-label="Progresso de ${escapeHTML(g.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><span style="width:${pct}%"></span></span></span>`;
}
function renderGoals(){
 const host=document.getElementById('goals-list');
 host.innerHTML=state.goals.length?state.goals.map(g=>{
  const progress=goalProgress(g,state.transactions),pct=progress.percent,appearance=goalAppearance(g);
  return `<article class="goal-card" style="--goal-color:var(--goal-${appearance.colorKey})" data-goal-card="${escapeHTML(g.id)}"><div class="goal-card-head"><span class="goal-main-icon" aria-hidden="true">${goalIconSVG(appearance.iconKey)}</span><h3>${escapeHTML(g.name)}</h3>${progress.completed?'<span class="goal-status">Concluída</span>':g.status==='archived'?'<span class="goal-status">Arquivada</span>':''}</div><div class="goal-amounts"><strong data-total-goal="${escapeHTML(g.id)}">${formatBRL(progress.saved)}</strong><span>de ${formatBRL(progress.target)}</span></div><div class="progress" role="progressbar" aria-label="Progresso de ${escapeHTML(g.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><span style="width:${pct}%"></span></div><div class="progress-meta"><span>${pct.toFixed(0)}%</span><span>Faltam ${formatBRL(progress.remaining)}</span></div><div class="goal-card-details">${progress.linked||progress.pending?`<p class="goal-progress-details">${formatBRL(progress.linked)} em movimentações vinculadas${progress.pending?` · ${formatBRL(progress.pending)} futuros`:''}</p>`:''}${g.due_date?`<p class="goal-due">${formatDate(g.due_date)}</p>`:''}</div><div class="card-actions"><button type="button" class="goal-history-action" data-goal-history="${escapeHTML(g.id)}">${inlineIcon('clock')}<span>Histórico</span></button><button type="button" class="mini-btn" data-edit-goal="${escapeHTML(g.id)}" aria-label="Editar ${escapeHTML(g.name)}" title="Editar meta">${inlineIcon('pencil')}</button><button type="button" class="mini-btn danger" data-delete-goal="${escapeHTML(g.id)}" aria-label="Excluir ${escapeHTML(g.name)}" title="Excluir meta">${inlineIcon('trash')}</button></div></article>`;
 }).join(''):emptyState('Nenhuma meta cadastrada.');
 totalDetails.wireGoals();
}
function inlineIcon(name){return `<svg class="ui-icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;}
function closeGoalIconPicker({focus=false}={}){
 document.getElementById('goal-icon-panel').classList.add('hidden');document.getElementById('goal-icon-toggle').setAttribute('aria-expanded','false');
 if(focus)document.getElementById('goal-icon-toggle').focus();
}
function renderGoalIconPicker(value){
 const selected=normalizeGoalIcon(value);document.getElementById('goal-icon-key').value=selected;
 const color=document.getElementById('goal-color-key').value;
 const preview=document.getElementById('goal-icon-preview');preview.innerHTML=goalIconSVG(selected);preview.style.setProperty('--goal-color',`var(--goal-${color})`);
 const grid=document.getElementById('goal-icon-grid');
 grid.innerHTML=GOAL_ICON_OPTIONS.map(([key,label])=>`<button type="button" class="category-icon-choice icon-only ${key===selected?'selected':''}" data-goal-icon="${escapeHTML(key)}" role="radio" aria-checked="${key===selected}" tabindex="${key===selected?0:-1}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}"><span class="category-icon-choice-glyph">${goalIconSVG(key)}</span></button>`).join('');
}
function prepareGoalAppearance(goal=null){
 const appearance=goal?goalAppearance(goal):{iconKey:GOAL_DEFAULT_ICON,colorKey:nextGoalColor(state.goals,crypto.randomUUID())};
 document.getElementById('goal-color-key').value=appearance.colorKey;
 document.getElementById('goal-icon-trigger-label').textContent=goal?'Trocar ícone':'Escolher ícone';
 renderGoalIconPicker(appearance.iconKey);closeGoalIconPicker();
}

let budgetDraft={income:0,limits:{}};
let budgetDraftDirty=false;
let budgetSuggestion=null;
function cleanBudgetCategoryName(value){return String(value??'').replace(/\s+/g,' ').trim()}
function currentBudgetSummary(){return budgetSummary(state.budget,state.transactions,state.installments,budgetDate,new Date(),state.categories)}
function resetBudgetDraftFromState(){
  const limits={};
  Object.assign(limits,canonicalCategoryLimits(state.budget.items||[],state.categories||[]));
  budgetDraft={income:Math.max(0,Number(state.budget.plan?.planned_income||0)),limits};
  budgetDraftDirty=false;
}
function budgetCategoryRecord(name){const canonical=canonicalCategoryName(name,state.categories||[]);return (state.categories||[]).find(row=>!row.is_deleted&&(row.kind==='expense'||row.kind==='both')&&String(row.name).toLocaleLowerCase('pt-BR')===String(canonical).toLocaleLowerCase('pt-BR'))||null}
function budgetDisplayCategories(bs){
  const pending=planningPendingExpenseMap();
  const names=new Set([...Object.keys(budgetDraft.limits||{}),...Object.keys(bs.spentMap||{}),...Object.keys(pending||{})]);
  return [...names].filter(cat=>Number(budgetDraft.limits?.[cat]||0)>0||Number(bs.spentMap?.[cat]||0)>0||Number(pending?.[cat]||0)>0).sort((a,b)=>a.localeCompare(b,'pt-BR',{sensitivity:'base'}));
}
function categoryIconMarkup(record,name=''){
  const color=escapeHTML(record?.color_key||'slate');
  return `<span class="category-icon-tile category-color-${color}" aria-hidden="true">${categoryIconSVG(record?.icon_key||'tag')}</span>`;
}
function planningPendingExpenseMap(){
  const out={};
  (planningItems||[]).forEach(item=>{if(item.status!=='pending'||planningNature(item)!=='consumption')return;const cat=canonicalCategoryName(cleanBudgetCategoryName(item.category)||'Outros',state.categories||[]);out[cat]=(out[cat]||0)+Number(item.amount||0)});
  return out;
}
function budgetCategoryRow(cat,bs){
  const limit=Math.max(0,Number(budgetDraft.limits[cat]||0));
  const spent=Math.max(0,Number(bs.spentMap[cat]||0));
  const pending=Math.max(0,Number(planningPendingExpenseMap()[cat]||0));
  const remaining=limit>0?limit-spent-pending:0;
  const record=budgetCategoryRecord(cat),hidden=record&&!record.is_active;
  const key=escapeHTML(cat);
  // Display percentages at currency precision; financial values remain untouched.
  const percentage=amount=>{const rounded=Math.round(Math.abs(amount)*100)/100;const pct=limit>0?rounded/limit*100:0;return pct>0&&pct<1?'&lt;1%':`${Math.round(pct)}%`;};
  const metric=(label,amount,tone='')=>`<div><span>${label}</span><strong class="${tone}">${formatBRL(amount)}</strong>${limit>0?`<small>${percentage(amount)} do limite</small>`:''}</div>`;
  const canEdit=limit>0||record?.is_active!==false;
  return `<article data-budget-category="${key}" tabindex="-1" class="budget-category-row budget-limit-clean ${limit>0?'has-limit':'no-limit'} ${limit>0&&remaining<0?'over':''}">
    <div class="budget-category-identity">${categoryIconMarkup(record,cat)}<div><strong>${key}</strong>${hidden?'<small class="category-hidden-badge">Categoria oculta</small>':''}<small>${limit>0?`Limite do mês: ${formatBRL(limit)}`:'Sem limite definido'}</small></div></div>
    ${limit>0?`<div class="budget-clean-bar" aria-hidden="true">${layeredLimitBarHTML({limit,spent,pending})}</div>`:''}
    <div class="budget-clean-stats">${metric('Realizado',spent,'budget-realized')}${metric('Comprometido',pending,'budget-committed')}${limit>0?metric(remaining>=0?'Disponível':'Excedente',Math.abs(remaining),remaining>=0?'positive':'negative'):'<div><span>Disponível</span><strong class="muted" aria-label="Disponível não se aplica sem limite definido">—</strong></div>'}</div>
    <div class="budget-clean-actions"><div class="budget-clean-desktop-actions">${canEdit?`<button type="button" class="mini-btn" data-budget-edit="${key}">${limit>0?'Editar':'Definir limite'}</button>`:''}${limit>0?`<button type="button" class="mini-btn danger" data-budget-remove="${key}">Remover</button>`:''}</div><button type="button" class="budget-mobile-menu budget-clean-menu" data-budget-menu="${key}" aria-label="Ações de ${key}">•••</button></div>
  </article>`;
}
function openBudgetMobileActions(category){
  budgetActionCategory=category||'';
  if(!budgetActionCategory)return;
  const limit=Math.max(0,Number(budgetDraft.limits?.[budgetActionCategory]||0));
  const title=document.getElementById('budget-mobile-actions-title');if(title)title.textContent=budgetActionCategory;
  const subtitle=document.getElementById('budget-mobile-actions-subtitle');if(subtitle)subtitle.textContent=limit>0?`Limite atual: ${formatBRL(limit)}`:'Sem limite definido';
  const primary=document.getElementById('budget-mobile-action-primary');if(primary)primary.textContent=limit>0?'Editar limite':'Definir limite';
  document.getElementById('budget-mobile-action-remove')?.classList.toggle('hidden',limit<=0);
  openDialog('budget-mobile-actions-dialog');
}
function closeBudgetMobileActions(){budgetActionCategory='';closeDialog('budget-mobile-actions-dialog')}

function renderBudgetDraft(){
  const bs=currentBudgetSummary();
  const pendingMap=planningPendingExpenseMap();
  const totalLimit=Object.values(budgetDraft.limits||{}).reduce((sum,value)=>sum+Math.max(0,Number(value||0)),0);
  const totalSpent=Number(bs.totalSpent||0);
  const totalPending=Object.values(pendingMap).reduce((sum,value)=>sum+Math.max(0,Number(value||0)),0);
  const available=totalLimit-totalSpent-totalPending;
  const spentPercent=totalLimit>0?(totalSpent/totalLimit)*100:0;
  const pendingPercent=totalLimit>0?(totalPending/totalLimit)*100:0;
  const active=budgetDisplayCategories(bs);
  const budgetedCount=Object.values(budgetDraft.limits||{}).filter(value=>Number(value)>0).length;
  const activeExpenseCount=activeCategories(state.categories||[],'expense').length;
  document.getElementById('budget-total-limit').textContent=formatBRL(totalLimit);
  document.getElementById('budget-total-spent').textContent=formatBRL(totalSpent);
  document.getElementById('budget-total-available').textContent=formatBRL(available);
  document.getElementById('budget-total-available').className=available>=0?'positive':'negative';
  document.getElementById('budget-spent-percent').textContent=totalLimit>0?`${Math.max(0,spentPercent).toFixed(1).replace('.',',')}% realizado · ${Math.max(0,pendingPercent).toFixed(1).replace('.',',')}% comprometido`:'Nenhum limite definido';
  document.getElementById('budget-available-percent').textContent=totalLimit>0?(available>=0?`${formatBRL(available)} ainda disponível`:`${formatBRL(Math.abs(available))} acima dos limites`):'Defina seus limites';
  document.getElementById('budget-category-count').textContent=String(budgetedCount);document.getElementById('budget-category-count-label').textContent=Number(document.getElementById('budget-category-count').textContent)===1?'categoria':'categorias';
  document.getElementById('budget-active-category-count').textContent=`de ${activeExpenseCount} categorias ativas`;
  document.getElementById('budget-category-title-count').textContent=`${budgetedCount} ${budgetedCount===1?'limite definido':'limites definidos'}`;
  document.getElementById('budget-items').innerHTML=active.length?active.map(cat=>budgetCategoryRow(cat,bs)).join(''):`<div class="empty-state budget-manager-empty"><strong>Nenhum limite definido</strong><span>Use “Novo limite” e escolha uma das suas categorias ativas.</span></div>`;
}
function renderBudget(){
  const label=document.getElementById('budget-month-label');if(label)label.textContent=monthLabel(budgetDate);
  resetBudgetDraftFromState();
  if(budgetSuggestion&&budgetSuggestion.monthKey!==monthPrefix(budgetDate))budgetSuggestion=null;
  renderBudgetDraft();
  renderPlanningOverview();
  renderBudgetSuggestionShell();
  renderBudgetSuggestionPreview();
}
async function persistBudgetDraft(successMessage='Limites atualizados.'){
  state.budget=await saveBudget(budgetDate,Math.max(0,Number(budgetDraft.income||0)),budgetDraft.limits||{});
  if(planningSameMonth(budgetDate,dashboardDate))dashboardBudget=state.budget;
  resetBudgetDraftFromState();
  renderBudgetDraft();if(planningSameMonth(budgetDate,planningDate))renderPlanningOverview();if(planningSameMonth(budgetDate,dashboardDate))renderHome();
  toast(successMessage,'success');
}
function budgetSelectableCategories(original=''){
  const planned=new Set(Object.keys(budgetDraft.limits||{}).map(name=>name.toLocaleLowerCase('pt-BR')));
  const rows=activeCategories(state.categories||[],'expense').filter(row=>!planned.has(row.name.toLocaleLowerCase('pt-BR'))||row.name===original);
  if(original&&!rows.some(row=>row.name===original)){
    const record=budgetCategoryRecord(original);
    rows.unshift(record||{name:original,icon_key:'tag',color_key:'slate',is_active:false});
  }
  return rows;
}
function updateBudgetCategoryDialog(){
  const original=document.getElementById('budget-category-original').value;
  const name=document.getElementById('budget-category-select').value||original;
  const spent=Math.max(0,Number(currentBudgetSummary().spentMap?.[name]||0));
  document.getElementById('budget-category-spent').textContent=formatBRL(spent);
}
function openBudgetCategoryEditor(category=''){
  const original=document.getElementById('budget-category-original');
  const select=document.getElementById('budget-category-select');
  const remove=document.getElementById('budget-category-remove');
  const title=document.getElementById('budget-category-dialog-title');
  const apply=document.getElementById('budget-category-apply');
  const limit=document.getElementById('budget-category-limit');
  setFormError('budget-category-error','');
  original.value=category||'';
  const rows=budgetSelectableCategories(category);
  select.innerHTML=rows.length?rows.map(row=>`<option value="${escapeHTML(row.name)}">${escapeHTML(row.name)}${row.is_active===false?' · oculta':''}</option>`).join(''):'<option value="">Nenhuma categoria ativa disponível</option>';
  select.disabled=!!category||!rows.length;
  if(category)select.value=category;
  title.textContent=category?'Editar limite':'Novo limite';
  apply.textContent=category?'Salvar limite':'Adicionar limite';
  setMoney(limit,category?(Number(budgetDraft.limits[category]||0)||''):'');
  remove.classList.toggle('hidden',!category||!Object.prototype.hasOwnProperty.call(budgetDraft.limits,category));
  updateBudgetCategoryDialog();
  openDialog('budget-category-dialog');
  setTimeout(()=>category?limit.focus():select.focus(),40);
}
async function applyBudgetCategoryDraft(){
  const original=document.getElementById('budget-category-original').value;
  const name=cleanBudgetCategoryName(document.getElementById('budget-category-select').value||original);
  const limit=Number(moneyValue('budget-category-limit')||0);
  setFormError('budget-category-error','');
  if(!name){setFormError('budget-category-error','Crie ou ative uma categoria em Configurações > Categorias antes de adicionar um limite.');return}
  if(!Number.isFinite(limit)||limit<=0){setFormError('budget-category-error','Informe um limite mensal maior que zero.');return}
  budgetDraft.limits[name]=Math.round(limit*100)/100;
  try{
    await runAppOperation(original?'Atualizando limite…':'Adicionando limite…',`Salvando o limite de ${name}.`,async()=>{await persistBudgetDraft(original?'Limite atualizado.':'Limite adicionado.');closeDialog('budget-category-dialog')});
  }catch(error){console.error(error);setFormError('budget-category-error',error?.message||'Não foi possível salvar este limite.')}
}
async function removeBudgetCategoryLimit(categoryOverride=''){
  const original=categoryOverride||document.getElementById('budget-category-original').value;
  if(!original||!Object.prototype.hasOwnProperty.call(budgetDraft.limits,original))return;
  if(!confirm(`Remover o limite de “${original}” deste mês? Seus lançamentos permanecem intactos.`))return;
  delete budgetDraft.limits[original];
  try{await runAppOperation('Removendo limite…','Preservando os lançamentos e retirando apenas o limite mensal.',async()=>{await persistBudgetDraft('Limite removido.');closeDialog('budget-category-dialog')})}catch(error){console.error(error);toast(error?.message||'Não foi possível remover o limite.','error')}
}
function budgetSuggestionIncome(){
  const planned=Math.max(0,Number(planningUnifiedModel().plannedIncome||0));
  return planned>0?planned:Math.max(0,Number(budgetDraft.income||0));
}
function budgetSuggestionMonthDates(){return [3,2,1].map(back=>addMonth(budgetDate,-back))}
function renderBudgetSuggestionShell(){
  const months=document.getElementById('budget-suggestion-months');
  const incomeEl=document.getElementById('budget-suggestion-income');
  if(months)months.innerHTML=budgetSuggestionMonthDates().map(date=>`<span><svg class="ui-icon" aria-hidden="true"><use href="#i-calendar"></use></svg>${escapeHTML(monthLabel(date))}</span>`).join('');
  if(incomeEl)incomeEl.textContent=formatBRL(budgetSuggestionIncome());
}
function buildBudgetSuggestion(){
  const income=budgetSuggestionIncome();
  if(income<=0)throw new Error('Adicione uma receita planejada para este mês antes de gerar a sugestão.');
  const prefixes=[1,2,3].map(back=>monthPrefix(addMonth(budgetDate,-back)));
  const history=spendingInPastMonths({transactions:state.transactions,installments:state.installments,categories:state.categories,months:prefixes.map(prefix=>prefix+'-01')});
  const activeRows=activeCategories(state.categories||[],'expense');
  const activeNames=new Set(activeRows.map(row=>row.name));
  const categoryTotals=Object.fromEntries(Object.entries(history.categoryTotals).filter(([name])=>activeNames.has(name)));
  const monthTotals=Object.fromEntries(Object.entries(history.monthlyCategoryTotals).map(([month,map])=>[month,Object.entries(map).filter(([name])=>activeNames.has(name)).reduce((sum,[,value])=>sum+value,0)]));
  const activeMonths=Object.values(monthTotals).filter(value=>value>0).length;
  if(!activeMonths)throw new Error('Ainda não há gastos realizados suficientes nas categorias ativas dos 3 meses anteriores.');
  const raw={};
  Object.keys(categoryTotals).forEach(cat=>raw[cat]=Math.round((((categoryTotals[cat]||0)/activeMonths)*1.10)*100)/100);
  let rawTotal=Object.values(raw).reduce((a,b)=>a+b,0);
  const factor=rawTotal>income&&rawTotal>0?income/rawTotal:1;
  const suggestions={};
  Object.keys(raw).forEach(cat=>suggestions[cat]=Math.round(raw[cat]*factor*100)/100);
  const rows=Object.keys(suggestions).map(category=>{
    const total=Number(categoryTotals[category]||0);
    const average=Math.round((total/activeMonths)*100)/100;
    const current=Math.max(0,Number(budgetDraft.limits?.[category]||0));
    const suggestion=Math.max(0,Number(suggestions[category]||0));
    return {category,average,current,suggestion,delta:suggestion-current,record:budgetCategoryRecord(category)};
  }).sort((a,b)=>b.suggestion-a.suggestion||a.category.localeCompare(b.category,'pt-BR',{sensitivity:'base'}));
  const totalSuggested=rows.reduce((sum,row)=>sum+row.suggestion,0);
  return {monthKey:monthPrefix(budgetDate),income,activeMonths,prefixes,rows,suggestions,totalSuggested,margin:income-totalSuggested,scaled:factor<1};
}
function budgetSuggestionVariationHTML(delta,current){
  const value=Number(delta||0);
  if(Math.abs(value)<0.005)return '<span class="budget-suggestion-variation neutral">Sem alteração</span>';
  const up=value>0;
  const label=current<=0&&up?`Novo ${formatBRL(value)}`:`${up?'↑':'↓'} ${formatBRL(Math.abs(value))}`;
  return `<span class="budget-suggestion-variation ${up?'up':'down'}">${escapeHTML(label)}</span>`;
}
function renderBudgetSuggestionPreview(){
  const preview=document.getElementById('budget-suggestion-preview');
  const rowsEl=document.getElementById('budget-suggestion-rows');
  if(!preview||!rowsEl)return;
  if(!budgetSuggestion){preview.classList.add('hidden');rowsEl.innerHTML='';return}
  preview.classList.remove('hidden');
  rowsEl.innerHTML=budgetSuggestion.rows.map(row=>`<tr><td><div class="budget-suggestion-category">${categoryIconMarkup(row.record,row.category)}<strong>${escapeHTML(row.category)}</strong></div></td><td>${formatBRL(row.average)}</td><td>${row.current>0?formatBRL(row.current):'<span class="muted">Sem limite</span>'}</td><td><strong>${formatBRL(row.suggestion)}</strong></td><td>${budgetSuggestionVariationHTML(row.delta,row.current)}</td></tr>`).join('');
  const total=document.getElementById('budget-suggestion-total');if(total)total.textContent=formatBRL(budgetSuggestion.totalSuggested);
  const income=document.getElementById('budget-suggestion-income-summary');if(income)income.textContent=formatBRL(budgetSuggestion.income);
  const margin=document.getElementById('budget-suggestion-margin');if(margin){margin.textContent=formatBRL(budgetSuggestion.margin);margin.className=budgetSuggestion.margin>=0?'positive':'negative'}
}
function openBudgetSuggestionPage(){
  const main=document.getElementById('budget-limits-main');
  const page=document.getElementById('budget-suggestion-page');
  if(!main||!page)return;
  main.classList.add('hidden');
  page.classList.remove('hidden');
  setFormError('budget-suggestion-error','');
  renderBudgetSuggestionShell();
  renderBudgetSuggestionPreview();
  page.scrollIntoView({behavior:'auto',block:'start'});
}
function closeBudgetSuggestionPage({clear=false,scroll=true}={}){
  const main=document.getElementById('budget-limits-main');
  const page=document.getElementById('budget-suggestion-page');
  if(!main||!page)return;
  page.classList.add('hidden');
  main.classList.remove('hidden');
  setFormError('budget-suggestion-error','');
  if(clear){budgetSuggestion=null;renderBudgetSuggestionPreview()}
  if(scroll)main.scrollIntoView({behavior:'auto',block:'start'});
}
function generateBudgetSuggestion(){
  setFormError('budget-suggestion-error','');
  try{budgetSuggestion=buildBudgetSuggestion();renderBudgetSuggestionShell();renderBudgetSuggestionPreview()}
  catch(error){budgetSuggestion=null;renderBudgetSuggestionPreview();setFormError('budget-suggestion-error',error?.message||'Não foi possível gerar a sugestão.')}
}
function cancelBudgetSuggestion(){closeBudgetSuggestionPage({clear:true})}
async function applyBudgetSuggestion(){
  if(!budgetSuggestion?.rows?.length)return;
  budgetDraft.income=budgetSuggestion.income;
  budgetDraft.limits={...budgetDraft.limits,...budgetSuggestion.suggestions};
  try{
    await runAppOperation('Aplicando sugestões…','Atualizando somente os limites do mês atual.',async()=>{
      await persistBudgetDraft(`Sugestões baseadas em ${budgetSuggestion.activeMonths} ${budgetSuggestion.activeMonths===1?'mês anterior':'meses anteriores'} aplicadas.`);
      budgetSuggestion=null;
      renderBudgetSuggestionShell();
      renderBudgetSuggestionPreview();
      closeBudgetSuggestionPage({clear:false});
    });
  }catch(error){setFormError('budget-suggestion-error',error?.message||'Não foi possível aplicar as sugestões.')}
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
function planningUnifiedModel(){
  const summary=summarizePlanning(planningItems);
  const cash=calculateCashStats(state.transactions,planningDate);
  const bs=budgetSummary(state.budget,state.transactions,state.installments,planningDate,new Date(),state.categories);
  const pendingMap=planningPendingExpenseMap();
  const categories=new Set([...Object.keys(bs.itemMap||{}),...Object.keys(bs.spentMap||{}),...Object.keys(pendingMap||{})]);
  const limitRows=[...categories].map(category=>{
    const limit=Math.max(0,Number(bs.itemMap?.[category]||0));
    const spent=Math.max(0,Number(bs.spentMap?.[category]||0));
    const pending=Math.max(0,Number(pendingMap?.[category]||0));
    const available=limit>0?limit-spent-pending:0;
    const spentPercent=limit>0?(spent/limit)*100:(spent>0?100:0);
    const committedPercent=limit>0?(pending/limit)*100:(pending>0?100:0);
    return {category,limit,spent,pending,committed:pending,available,spentPercent,committedPercent,record:budgetCategoryRecord(category)};
  });
  return {
    summary,cash,bs,pendingMap,limitRows,
    plannedIncome:Number(summary.plannedIncome||0),
    plannedExpense:Number(summary.plannedExpense||0),
    plannedResult:Number(summary.plannedResult||0)
  };
}
function layeredLimitBarHTML({limit=0,spent=0,pending=0,compact=false}={}){
  const safeLimit=Math.max(0,Number(limit||0));
  const safeSpent=Math.max(0,Number(spent||0));
  const safePending=Math.max(0,Number(pending||0));
  const spentPct=safeLimit>0?(safeSpent/safeLimit)*100:(safeSpent>0?100:0);
  const pendingPct=safeLimit>0?(safePending/safeLimit)*100:(safePending>0?100:0);
  const spentWidth=Math.max(0,Math.min(100,spentPct));
  const pendingWidth=Math.max(0,Math.min(100,pendingPct));
  const spentIsSmaller=spentWidth<=pendingWidth;
  const spentLayer=spentIsSmaller?'is-over':'is-under';
  const pendingLayer=spentIsSmaller?'is-under':'is-over';
  return `<div class="layered-limit ${compact?'compact':''}" aria-label="${spentPct.toFixed(0)}% realizado e ${pendingPct.toFixed(0)}% comprometido sobre limite de ${formatBRL(safeLimit)}"><span class="layered-limit-base"></span><span class="layered-limit-fill committed ${pendingLayer}" style="width:${pendingWidth}%"></span><span class="layered-limit-fill realized ${spentLayer}" style="width:${spentWidth}%"></span></div>`;
}
function planningOverviewItemHTML(item){
  const income=Number(item.direction)>0,overdue=item.planned_on<planningLocalISO(new Date());
  const canonical=canonicalCategoryName(item.category||'Outros',state.categories||[]);
  const record=(state.categories||[]).find(c=>!c.is_deleted&&String(c.name).toLocaleLowerCase('pt-BR')===canonical.toLocaleLowerCase('pt-BR'));
  return `<button type="button" class="planning-preview-row" data-edit-planning="${escapeHTML(item.id)}" aria-label="Editar plano ${escapeHTML(item.description)}">${categoryIconMarkup(record,item.category)}<span class="planning-preview-copy"><strong>${escapeHTML(item.description)}</strong><small><span class="planning-preview-date"><svg class="ui-icon" aria-hidden="true"><use href="#i-calendar"/></svg>${formatDate(item.planned_on)}</span>${overdue?'<span class="planning-overdue">Atrasado</span>':`<span class="planning-preview-category">${escapeHTML(item.category||'Outros')}</span>`}</small></span><strong class="planning-preview-amount ${income?'positive':'negative'}">${income?'+':'−'} ${formatBRL(item.amount)}</strong><span class="planning-preview-arrow" aria-hidden="true">›</span></button>`;
}
function planningOverviewLimitHTML(row){
  const percentage=Math.round(row.spentPercent),width=Math.min(100,Math.max(0,row.spentPercent));
  const hint=`Realizado ${formatBRL(row.spent)} de ${formatBRL(row.limit)}. Planejado pendente ${formatBRL(row.pending)}. Disponível ${formatBRL(row.available)}. Abrir detalhes do limite.`;
  return `<button type="button" class="planning-preview-limit ${row.spent>row.limit?'over':''}" data-planning-limit="${escapeHTML(row.category)}" aria-label="${escapeHTML(row.category+'. '+hint)}" title="${escapeHTML(hint)}">${categoryIconMarkup(row.record,row.category)}<span class="planning-preview-limit-body"><span class="planning-preview-limit-title"><strong>${escapeHTML(row.category)}</strong><span>${percentage}%</span></span><small>${formatBRL(row.spent)} / ${formatBRL(row.limit)}</small><span class="planning-preview-limit-bar" role="meter" aria-label="Gasto realizado de ${escapeHTML(row.category)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100,percentage)}" aria-valuetext="${percentage}% do limite realizado"><span style="width:${width}%"></span></span></span><span class="planning-preview-arrow" aria-hidden="true">›</span></button>`;
}
function renderPlanningOverview(){
  const hostItems=document.getElementById('planning-overview-items'),hostLimits=document.getElementById('planning-overview-limits');
  if(!hostItems||!hostLimits)return;
  const model=planningUnifiedModel();
  const next=(planningItems||[]).filter(item=>item.status==='pending').sort((a,b)=>String(a.planned_on).localeCompare(String(b.planned_on))||String(a.id).localeCompare(String(b.id))).slice(0,3);
  hostItems.innerHTML=next.length?next.map(planningOverviewItemHTML).join(''):emptyState('Nenhum plano pendente neste mês.');
  const limitRows=model.limitRows.filter(row=>row.limit>0).sort((a,b)=>Math.max(b.spentPercent,b.committedPercent)-Math.max(a.spentPercent,a.committedPercent)||b.spent+b.pending-a.spent-a.pending).slice(0,3);
  hostLimits.innerHTML=limitRows.length?limitRows.map(planningOverviewLimitHTML).join(''):emptyState('Nenhum limite definido para este mês.');
}
function setPlanningSection(section='overview'){
  planningSection=['overview','plans','limits'].includes(section)?section:'overview';
  closeBudgetSuggestionPage({clear:false,scroll:false});
  document.querySelectorAll('[data-planning-section]').forEach(btn=>{const active=btn.dataset.planningSection===planningSection;btn.classList.toggle('active',active);btn.setAttribute('aria-selected',String(active));btn.tabIndex=active?0:-1;});
  document.querySelectorAll('[data-planning-view]').forEach(view=>view.classList.toggle('hidden',view.dataset.planningView!==planningSection));
  document.getElementById('new-planning-btn')?.classList.toggle('hidden',planningSection==='limits');
  if(planningSection==='limits')renderBudget();
}
function planningRowHTML(item){
  const dir=Number(item.direction)>0?'income':'expense';
  const nature=planningNature(item);const type=dir==='income'?'A receber':nature==='allocation'?'Reservar':nature==='transfer'?'Transferir':'A pagar';
  const status=planningStatusLabel(item);
  const isDone=['paid','received'].includes(item.status);
  const isPending=item.status==='pending';
  let statusClass='';if(isDone)statusClass='done';else if(item.status==='deferred')statusClass='deferred';else if(item.status==='cancelled')statusClass='cancelled';
  const realized=item.realized_on?`<span>Realizado em ${formatDate(item.realized_on)}</span>`:'';
  const checkLabel=dir==='income'?'recebido':'pago';
  const checkControl=isPending
    ?`<button class="planning-check pending" type="button" data-complete-planning="${item.id}" aria-label="Marcar ${escapeHTML(item.description)} como ${checkLabel}" title="Marcar como ${checkLabel}"></button>`
    :`<span class="planning-check ${statusClass||'inactive'}" aria-hidden="true">${isDone?`<svg class="ui-icon"><use href="#i-check"></use></svg>`:item.status==='deferred'?`<svg class="ui-icon"><use href="#i-clock"></use></svg>`:'×'}</span>`;
  let actions='';
  if(isPending){
    const actionLabel=dir==='income'?'Receber':'Pagar';
    actions=`<button class="planning-action primary ${dir}" type="button" data-complete-planning="${item.id}"><svg class="ui-icon" aria-hidden="true"><use href="#i-check"></use></svg><span>${actionLabel}</span></button><button class="planning-action secondary" type="button" data-edit-planning="${item.id}"><svg class="ui-icon" aria-hidden="true"><use href="#i-pencil"></use></svg><span>Editar</span></button><button class="planning-action secondary" type="button" data-move-planning="${item.id}"><svg class="ui-icon" aria-hidden="true"><use href="#i-calendar"></use></svg><span>Próximo mês</span></button><button class="planning-action secondary danger" type="button" data-cancel-planning="${item.id}"><span class="planning-action-x" aria-hidden="true">×</span><span>Cancelar</span></button>`;
  }
  return `<article data-total-plan="${escapeHTML(item.id)}" class="planning-row planning-row-${statusClass||'pending'}"><div class="planning-check-slot">${checkControl}</div><div class="planning-row-main"><div class="planning-row-title"><span class="planning-type ${dir}">${type}</span><strong>${escapeHTML(item.description)}</strong></div><div class="planning-row-meta"><span>${escapeHTML(item.category||'Outros')}</span><span>Previsto ${formatDate(item.planned_on)}</span>${realized}${item.notes?`<span>${escapeHTML(item.notes)}</span>`:''}</div></div>${actions?`<div class="planning-actions">${actions}</div>`:''}<div class="planning-row-side"><strong class="${dir==='income'?'positive':'negative'}">${dir==='income'?'+':'-'} ${formatBRL(item.amount)}</strong><span class="planning-status ${statusClass}">${status}</span></div></article>`;
}
function renderPlanningCardObligations(){
 const month=planningMonthKey(planningDate),rows=state.cards.flatMap(card=>buildCardInvoices(card,state.installments,state.invoiceStatuses)).filter(inv=>inv.invoiceMonth===month&&inv.balanceDue>0);
 document.getElementById('planning-card-obligations').innerHTML=rows.length?rows.map(inv=>`<button type="button" class="planning-card-obligation" data-open-invoice="${escapeHTML(inv.card.id)}" data-invoice-month="${inv.invoiceMonth}"><span><strong>${escapeHTML(inv.card.name)}</strong><small>Fatura ${monthLabel(planningDate)} · Vence ${formatDate(inv.dueOn)}</small></span><strong>${formatBRL(inv.balanceDue)}</strong></button>`).join(''):emptyState('Nenhuma fatura pendente nesta competência.');
 document.getElementById('planning-card-total').textContent=formatBRL(rows.reduce((sum,inv)=>sum+inv.balanceDue,0));
 const invoiceTotal=rows.reduce((sum,inv)=>sum+inv.balanceDue,0);document.getElementById('planning-invoice-shortcut-total').textContent=formatBRL(invoiceTotal);document.querySelector('[data-planning-invoices]').classList.toggle('hidden',!rows.length);document.getElementById('planning-invoice-panel').classList.toggle('hidden',!rows.length);
}
function renderPlanning(){renderPlanningCardObligations();
  const label=document.getElementById('planning-month-label');if(!label)return;
  const model=planningUnifiedModel(),summary=model.summary;
  const allocations=buildFinancialMonthLedger({transactions:state.transactions,monthKey:planningDate});
  const allocated=document.getElementById('planning-allocation-realized'),future=document.getElementById('planning-allocation-future'),projected=document.getElementById('planning-cash-projected');
  if(allocated)allocated.textContent=formatBRL(allocations.allocation);
  if(future)future.textContent=formatBRL(allocations.futureAllocation);const plannedAllocation=document.getElementById('planning-allocation-planned');if(plannedAllocation)plannedAllocation.textContent=`Reservas programadas: ${formatBRL(summary.pendingAllocation)}`;
  if(projected){const cash=calculateCashStats(state.transactions,planningDate);const thisMonth=planningSameMonth(planningDate,planningCurrentMonth());projected.textContent=thisMonth?formatBRL(cash.projectedCashBalance):'—';projected.title=thisMonth?'Saldo atual mais lançamentos futuros já registrados, incluindo reservas. Não soma Meus planos para evitar duplicação.':'A projeção do saldo livre aparece somente no mês atual para não sugerir um saldo histórico incorreto.'}

  label.textContent=monthLabel(planningDate);
  const period=document.getElementById('planning-plans-period');if(period)period.textContent=monthLabel(planningDate);
  document.getElementById('planning-current')?.classList.toggle('hidden',planningSameMonth(planningDate,planningCurrentMonth()));
  const pendingItems=planningItems.filter(item=>item.status==='pending');
  for(const [kind,amount,nature] of [['income',summary.pendingIncome,'income'],['expense',summary.pendingExpense,'consumption']]){
    const count=pendingItems.filter(item=>planningNature(item)===nature).length;
    document.getElementById(`planning-pending-${kind}`).textContent=formatBRL(amount);
    document.getElementById(`planning-pending-${kind}-count`).textContent=`${count} ${count===1?'item pendente':'itens pendentes'}`;
  }
  document.getElementById('planning-income').textContent=formatBRL(model.plannedIncome);
  document.getElementById('planning-expense').textContent=formatBRL(model.plannedExpense);
  document.getElementById('planning-result').textContent=formatBRL(model.plannedResult);document.getElementById('planning-result').className=model.plannedResult>=0?'positive':'negative';
  document.getElementById('planning-income-detail').textContent=`${formatBRL(summary.pendingIncome)} ainda a receber`;
  document.getElementById('planning-expense-detail').textContent=summary.pendingExpense>0?`${formatBRL(summary.pendingExpense)} ainda pendente`:'Todos os planos de despesa concluídos';
  const completion=Math.min(100,Math.max(0,Math.round(summary.completionRate)));const ring=document.getElementById('planning-completion-ring');ring.style.setProperty('--planning-progress',`${completion}%`);ring.setAttribute('aria-valuenow',String(completion));document.getElementById('planning-completion').textContent=`${Math.round(summary.completionRate)}%`;document.getElementById('planning-completion-detail').textContent=`${summary.completedCount} de ${summary.completedCount+summary.pendingCount+summary.deferredCount} itens`;
  document.querySelectorAll('[data-planning-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.planningFilter===planningTypeFilter));const status=document.getElementById('planning-status-filter');if(status)status.value=planningStatusFilter;
  const rows=planningFilteredItems();const list=document.getElementById('planning-list');if(list)list.innerHTML=pagedList('planning-items',rows,planningRowHTML,{context:JSON.stringify([planningMonthKey(planningDate),planningTypeFilter,planningStatusFilter]),label:'planos',empty:emptyState('Nenhum item encontrado neste mês.')});
  const footer=document.getElementById('planning-footer');footer?.classList.toggle('hidden',summary.pendingCount===0);if(summary.pendingCount){document.getElementById('planning-footer-text').textContent=`${summary.pendingCount} ${summary.pendingCount===1?'item ainda está':'itens ainda estão'} pendente${summary.pendingCount===1?'':'s'} em ${monthLabel(planningDate)}.`;document.getElementById('planning-move-all').textContent=`Mover pendentes para ${monthLabel(shiftPlanningMonth(planningDate,1))}`}
  renderPlanningOverview();
  setPlanningSection(planningSection);
  totalDetails.wirePlanning();
}
async function loadPlanningMonth(date=planningDate,{quiet=false}={}){
  planningDate=planningMonthDate(date);budgetDate=new Date(planningDate);if(!quiet)setLoading(true);try{const [items,budget]=await Promise.all([listPlanningMonth(planningDate),getBudget(budgetDate)]);planningItems=items;state.budget=budget;if(planningSameMonth(planningDate,dashboardDate)){state.planning=planningItems;renderPlanningHome()}renderBudget();renderPlanning()}finally{if(!quiet)setLoading(false)}
}
function updatePlanningNatureVisibility(){const income=Number(document.getElementById('planning-direction').value)>0;const wrap=document.getElementById('planning-nature-wrap');if(wrap)wrap.classList.toggle('hidden',income);if(income)document.getElementById('planning-nature').value='consumption';}
function openNewPlanning(){const form=document.getElementById('planning-form');form.reset();document.getElementById('planning-id').value='';document.getElementById('planning-dialog-title').textContent='Novo item';document.getElementById('planning-date').value=planningDefaultDate();updatePlanningNatureVisibility();fillCategorySelect('planning-category','',categoryKindFromDirection(document.getElementById('planning-direction').value));setFormError('planning-form-error','');openDialog('planning-dialog')}
function openEditPlanning(id){const item=planningItems.find(row=>row.id===id);if(!item||item.status!=='pending')return;document.getElementById('planning-id').value=item.id;document.getElementById('planning-dialog-title').textContent='Editar item';document.getElementById('planning-direction').value=String(item.direction);document.getElementById('planning-description').value=item.description||'';setMoney('planning-amount',item.amount||'');document.getElementById('planning-date').value=item.planned_on;document.getElementById('planning-nature').value=planningNature(item)==='income'?'consumption':planningNature(item);updatePlanningNatureVisibility();fillCategorySelect('planning-category',item.category||'Outros',categoryKindFromDirection(item.direction));document.getElementById('planning-notes').value=item.notes||'';setFormError('planning-form-error','');openDialog('planning-dialog')}
async function onPlanningSubmit(event){event.preventDefault();const submittedForm=event.currentTarget;const btn=document.getElementById('planning-save-btn');setButtonBusy(btn,true);setFormError('planning-form-error','');try{const id=document.getElementById('planning-id').value;const input={direction:Number(document.getElementById('planning-direction').value),description:document.getElementById('planning-description').value,amount:Number(moneyValue('planning-amount')),date:document.getElementById('planning-date').value,category:document.getElementById('planning-category').value,financialNature:Number(document.getElementById('planning-direction').value)>0?'income':document.getElementById('planning-nature').value,notes:document.getElementById('planning-notes').value};if(!input.description.trim()||!input.date||input.amount<=0)throw new Error('Preencha descrição, data prevista e um valor maior que zero.');if(!input.category)throw new Error('Ative ou crie uma categoria em Configurações > Categorias antes de salvar.');await runAppOperation(id?'Atualizando planejamento…':'Salvando planejamento…','Guardando esta previsão sem alterar seus lançamentos reais.',async()=>{if(id)await updatePlanningItem(id,input);else await createPlanningItem({...input,operation:formOperation(submittedForm,input)});closeDialog('planning-dialog');await loadPlanningMonth(planningDate,{quiet:true});toast(id?'Item atualizado.':'Item adicionado ao planejamento.','success')})}catch(error){console.error(error);setFormError('planning-form-error',error?.message||'Não foi possível salvar este item.')}finally{setButtonBusy(btn,false)}}
async function setPlanningMonth(date){if(appActionBusy)return;await runAppOperation('Carregando planejamento…',`Buscando as previsões de ${monthLabel(date)}.`,async()=>{await loadPlanningMonth(date,{quiet:true})})}
async function completePlanningAction(id){const item=planningItems.find(row=>row.id===id);if(!item||item.status!=='pending')return;const isIncome=Number(item.direction)>0,nature=planningNature(item),verb=isIncome?'recebido':nature==='allocation'?'reservado':'pago';if(!confirm(`Marcar ${item.description} como ${verb} hoje e registrar ${isIncome?'uma receita':nature==='allocation'?'uma reserva':nature==='transfer'?'uma transferência':'uma despesa'} de ${formatBRL(item.amount)}?`))return;await runAppOperation(isIncome?'Registrando recebimento…':'Registrando pagamento…',`Criando o lançamento real com a data de hoje e concluindo o item do planejamento.`,async()=>{await completePlanningItem(id,planningLocalISO(new Date()),nature);await refreshAll();await loadPlanningMonth(planningDate,{quiet:true});toast(isIncome?'Recebimento registrado.':'Pagamento registrado.','success')},{animateDashboard:true})}
async function movePlanningAction(id){const item=planningItems.find(row=>row.id===id);if(!item||item.status!=='pending')return;const target=planningNextMonthDate(item.planned_on);if(!confirm(`Mover este item para ${monthLabel(planningMonthDate(target))}? O mês atual ficará registrado como adiado.`))return;await runAppOperation('Movendo planejamento…','Mantendo o histórico do mês original e criando o item pendente no mês seguinte.',async()=>{await movePlanningItem(id,target,planningNature(item));await loadPlanningMonth(planningDate,{quiet:true});toast('Item movido para o próximo mês.','success')})}
async function cancelPlanningAction(id){const item=planningItems.find(row=>row.id===id);if(!item||item.status!=='pending')return;if(!confirm('Cancelar este item do planejamento?'))return;await runAppOperation('Cancelando item…','Mantendo o registro no histórico como cancelado.',async()=>{await cancelPlanningItem(id);await loadPlanningMonth(planningDate,{quiet:true});toast('Item cancelado.','success')})}
async function moveAllPlanningPending(){const summary=summarizePlanning(planningItems);if(!summary.pendingCount)return;const next=shiftPlanningMonth(planningDate,1);if(!confirm(`Mover ${summary.pendingCount} ${summary.pendingCount===1?'item pendente':'itens pendentes'} para ${monthLabel(next)}?`))return;await runAppOperation('Movendo pendências…','Transferindo os itens pendentes e preservando o histórico deste mês.',async()=>{const count=await movePendingPlanningMonth(planningDate,next);await loadPlanningMonth(planningDate,{quiet:true});toast(`${count} ${count===1?'item movido':'itens movidos'} para ${monthLabel(next)}.`,'success')})}
function planningAnalysisPanel(summary,label,actual){
  const statusTotal=summary.completedCount+summary.pendingCount+summary.deferredCount;
  const statuses=[['Concluídos',summary.completedCount,'check','green'],['Pendentes',summary.pendingCount,'clock','orange'],['Adiados',summary.deferredCount,'calendar','orange'],['Execução',`${statusTotal?Math.round(summary.completionRate):0}%`,'analytics','purple']];
  const statusHTML=`<div class="planning-analysis-status">${statuses.map(([name,value,icon,color])=>`<article><span class="analytics-status-icon accent-${color}" aria-hidden="true">${analysisIcon(icon)}</span><div><span>${name}</span><strong>${value}</strong></div></article>`).join('')}</div>`;
  return analysisPanel(label,analysisComparisonBars([{label:'Receitas',a:summary.plannedIncome,b:actual.income},{label:'Despesas',a:summary.plannedExpense,b:actual.totalExpense},{label:'Resultado',a:summary.plannedResult,b:actual.result}],'Planejado','Real')+statusHTML,{icon:'calendar',extraClass:'analytics-planning-panel'});
}




let financialView='general';
let analysisMode='months';
let analysisTab='overview';
let analysisRenderSeq=0;
let analysisTrendMonths=6;
let analysisDistribution='chart';
function analysisIcon(name='analytics'){
  return `<svg class="ui-icon" aria-hidden="true"><use href="#i-${escapeHTML(name==='tag'?'receipt':name)}"/></svg>`;
}
function analysisStaticMetric(label,value,caption='',{icon='analytics',accent='orange',captionClass='',valueClass=''}={}){
  return `<article class="analytics-metric analytics-summary" data-analysis-metric="${escapeHTML(label)}"><span class="analytics-summary-icon accent-${escapeHTML(accent)}" aria-hidden="true">${analysisIcon(icon)}</span><div class="analytics-summary-copy"><span>${escapeHTML(label)}</span><strong class="${escapeHTML(valueClass)}">${value}</strong><small class="${escapeHTML(captionClass)}">${caption||'—'}</small></div></article>`;
}
function analysisPanel(title,body,{icon='analytics',controls='',extraClass='',subtitle=''}={}){
  const heading=`<h3>${analysisIcon(icon)}${escapeHTML(title)}</h3>`;
  return `<article class="panel-card analytics-chart-card ${extraClass}"><div class="section-title">${subtitle?`<div class="analytics-panel-heading">${heading}<p>${escapeHTML(subtitle)}</p></div>`:heading}${controls}</div>${body}</article>`;
}
function analysisTrendControl(){
  return analysisMode==='years'?'<span class="analytics-control-note">Meses do ano selecionado</span>':`<select class="analytics-trend-select" data-analysis-trend aria-label="Intervalo do gráfico de evolução">${[3,6,12].map(n=>`<option value="${n}" ${analysisTrendMonths===n?'selected':''}>Últimos ${n} meses</option>`).join('')}</select>`;
}
function analysisExplanation(title,items){
  return `<details class="analytics-explanation"><summary>${analysisIcon('analytics')}<span>${escapeHTML(title)}</span></summary>${analysisInsightsHTML(items)}</details>`;
}
function analysisVariations(periodA,periodB){
  const rows=compareCategories(periodA,periodB,100);
  const sides=[
    {title:'Gastou mais',cls:'negative',direction:'a mais',empty:'Nenhuma categoria com aumento de gastos.',items:rows.filter(r=>r.delta>0.005).sort((a,b)=>b.delta-a.delta).slice(0,3)},
    {title:'Gastou menos',cls:'positive',direction:'a menos',empty:'Nenhuma categoria com redução de gastos.',items:rows.filter(r=>r.delta<-.005).sort((a,b)=>a.delta-b.delta).slice(0,3)}
  ];
  return `<div class="analytics-variations">${sides.map(side=>`<section><h4 class="${side.cls}">${analysisIcon(side.cls==='negative'?'trending-up':'trending-down')}${side.title}</h4>${side.items.length?side.items.map(row=>{const record=analysisCategoryRecord(row.category);return `<div class="analytics-variation-row"><span class="analytics-category-icon category-color-${escapeHTML(record?.color_key||'slate')}" aria-hidden="true">${categoryIconSVG(record?.icon_key||'tag')}</span><span>${escapeHTML(row.category)}</span><span class="analytics-variation-value"><strong class="${side.cls}">${formatBRL(Math.abs(row.delta))}</strong><small>${side.direction}</small></span></div>`}).join(''):`<p class="analytics-muted">${side.empty}</p>`}</section>`).join('')}</div><p class="analytics-variations-note">Diferença de gastos entre os períodos.</p>`;
}

function analysisInputMonth(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`}
function analysisInputDate(value){const [year,month]=String(value||'').split('-').map(Number);return new Date(year||new Date().getFullYear(),(month||1)-1,1,12)}
function analysisKeyFromInput(value){return `${String(value||'').slice(0,7)}-01`}
function analysisShortMoney(value){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',notation:'compact',maximumFractionDigits:1}).format(Number(value)||0)}
function analysisPercent(change){if(change?.percent===null)return 'novo';const value=Number(change?.percent||0);return `${value>0?'+':''}${value.toFixed(1).replace('.',',')}%`}
function analysisMetric(label,change,{goodUp=true,icon='',accent=''}={}){
  const delta=Number(change?.delta||0),neutral=Math.abs(delta)<0.005;
  const cls=neutral?'neutral':((goodUp?delta>0:delta<0)?'positive':'negative');
  const caption=change?.percent===null?(Number(change?.previous||0)===0&&Number(change?.current||0)>0?'Sem base anterior':'Sem variação'):`${analysisPercent(change)} vs comparação`;
  const defaults=label.includes('Receita')?['trending-up','green']:label.includes('Despesa')||label.includes('Gasto')?['trending-down','red']:label.includes('Cart')?['card','orange']:['wallet','orange'];
  return analysisStaticMetric(label,formatBRL(change?.current||0),escapeHTML(caption),{icon:icon||defaults[0],accent:accent||defaults[1],captionClass:cls});
}

function analysisEmpty(title='Sem dados suficientes',text='Registre movimentações em mais períodos para visualizar esta comparação.'){
  return `<div class="analytics-empty"><svg class="ui-icon" aria-hidden="true"><use href="#i-analytics"></use></svg><strong>${escapeHTML(title)}</strong><span>${escapeHTML(text)}</span></div>`;
}
function analysisLegend(labelA,labelB){return `<div class="analytics-legend"><span><i class="analytics-key key-a"></i>${escapeHTML(labelA)}</span><span><i class="analytics-key key-b"></i>${escapeHTML(labelB)}</span></div>`}
function analysisComparisonBars(rows,labelA,labelB,labelKey='label'){
  if(!rows.length)return analysisEmpty('Nada para comparar','Não há valores nos períodos selecionados.');
  const max=Math.max(1,...rows.flatMap(row=>[Math.abs(Number(row.a||0)),Math.abs(Number(row.b||0))]));
  return `${analysisLegend(labelA,labelB)}<div class="analytics-hbars">${rows.map(row=>{
    const a=Number(row.a||0),b=Number(row.b||0),record=analysisCategoryRecord(row[labelKey]);
    const icon=record?categoryIconSVG(record.icon_key||'tag'):analysisIcon(row.label==='Receitas'?'trending-up':row.label==='Despesas'?'trending-down':row.label==='Resultado'?'wallet':'card');
    return `<div class="analytics-hbar-row" data-analysis-pair="${escapeHTML(row[labelKey]||'')}" data-value-a="${a}" data-value-b="${b}"><span class="analytics-pair-icon category-color-${escapeHTML(record?.color_key||'orange')}" aria-hidden="true">${icon}</span><div class="analytics-hbar-label"><strong>${escapeHTML(row[labelKey]||'')}</strong></div><div class="analytics-hbar-pair"><div><span class="bar-a" style="width:${Math.abs(a)/max*100}%"></span></div><div><span class="bar-b" style="width:${Math.abs(b)/max*100}%"></span></div></div><div class="analytics-pair-values"><span>${formatBRL(a)}</span><span>${formatBRL(b)}</span></div></div>`;
  }).join('')}</div>`;
}

function analysisLineChart(months,series,{fillArea=false}={}){
  if(!months?.length||!series?.length)return analysisEmpty();
  const width=Math.max(600,months.length*60),height=300,left=54,right=18,top=18,bottom=50,plotW=width-left-right,plotH=height-top-bottom;
  const values=series.flatMap(item=>months.map(month=>Math.max(0,Number(item.value(month)||0))));
  const max=Math.max(1,...values);
  const x=index=>months.length===1?left+plotW/2:left+(index/(months.length-1))*plotW;
  const y=value=>top+plotH-(Math.max(0,Number(value||0))/max)*plotH;
  const grid=Array.from({length:5},(_,i)=>{const gy=top+(plotH/4)*i;const val=max*(1-i/4);return `<line x1="${left}" y1="${gy}" x2="${width-right}" y2="${gy}" class="chart-grid"/><text x="${left-8}" y="${gy+4}" text-anchor="end" class="chart-axis">${escapeHTML(analysisShortMoney(val))}</text>`}).join('');
  const labels=months.map((month,i)=>`<text x="${x(i)}" y="${height-18}" text-anchor="middle" class="chart-axis chart-month">${escapeHTML(month.date.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''))}</text>`).join('');
  const gradientId=fillArea?`analysis-area-${crypto.randomUUID()}`:'';
  const gradients=fillArea?`<defs>${series.map((item,sidx)=>{
    const seriesTop=Math.min(...months.map(month=>y(item.value(month))));
    return `<linearGradient id="${gradientId}-${sidx}" gradientUnits="userSpaceOnUse" x1="0" y1="${seriesTop}" x2="0" y2="${y(0)}" class="chart-area-gradient series-${sidx}"><stop offset="0%" class="chart-area-start"/><stop offset="100%" class="chart-area-end"/></linearGradient>`;
  }).join('')}</defs>`:'';
  const areas=fillArea?series.map((item,sidx)=>{
    const points=months.map((month,i)=>`${x(i)},${y(item.value(month))}`);
    return `<polygon points="${x(0)},${y(0)} ${points.join(' ')} ${x(months.length-1)},${y(0)}" class="chart-area series-${sidx}" fill="url(#${gradientId}-${sidx})" aria-hidden="true" pointer-events="none"/>`;
  }).join(''):'';
  const paths=series.map((item,sidx)=>{
    const points=months.map((month,i)=>`${x(i)},${y(item.value(month))}`);
    const circles=months.map((month,i)=>`<circle cx="${x(i)}" cy="${y(item.value(month))}" r="4" class="chart-point series-${sidx}"><title>${escapeHTML(item.label)} · ${escapeHTML(monthLabel(month.date))}: ${formatBRL(item.value(month))}</title></circle>`).join('');
    return `<polyline points="${points.join(' ')}" class="chart-line series-${sidx}"/>${circles}`;
  }).join('');
  const legend=`<div class="analytics-chart-legend">${series.map((item,i)=>`<span><i class="series-dot series-${i}"></i>${escapeHTML(item.label)}</span>`).join('')}</div>`;
  return `${legend}<div class="analytics-svg-wrap"><svg class="analytics-line-chart" data-points="${months.length}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolução financeira">${gradients}${areas}${grid}${paths}${labels}</svg></div>`;
}
function analysisDonut(items,title='Distribuição'){
  const source=(items||[]).filter(item=>Number(item.total||0)>0);
  const total=source.reduce((sum,item)=>sum+Number(item.total||0),0);
  const rows=groupCategoryRowsWithRemainder(source,8);
  if(total<=0)return analysisEmpty('Sem distribuição','Não há gastos para montar este gráfico.');
  const colors=['#ff7a00','#38c878','#4c9dff','#a779ff','#ff5d6c','#f2b84b','#43c6c8','#8e98a4'];
  const r=70,circ=2*Math.PI*r;let offset=0;
  const circles=rows.map((item,i)=>{const frac=Number(item.total||0)/total;const dash=frac*circ;const el=`<circle cx="100" cy="100" r="${r}" fill="none" stroke="${colors[i%colors.length]}" stroke-width="24" stroke-dasharray="${dash} ${circ-dash}" stroke-dashoffset="-${offset}"/>`;offset+=dash;return el}).join('');
  const legend=rows.map((item,i)=>`<div class="analytics-donut-item"><i style="background:${colors[i%colors.length]}"></i><span>${escapeHTML(item.category||item.name||'Outros')}</span><strong>${formatBRL(item.total||0)}</strong></div>`).join('');
  return `<div class="analytics-donut-layout"><div class="analytics-donut"><svg viewBox="0 0 200 200" role="img" aria-label="${escapeHTML(title)}"><g transform="rotate(-90 100 100)">${circles}</g><text x="100" y="95" text-anchor="middle" class="donut-caption">Total</text><text x="100" y="116" text-anchor="middle" class="donut-value">${escapeHTML(analysisShortMoney(total))}</text></svg></div><div class="analytics-donut-legend">${legend}</div></div>`;
}
function analysisInsightsHTML(items){return `<div class="analytics-insights">${(items||[]).map(text=>`<article><span class="analytics-insight-icon"><svg class="ui-icon" aria-hidden="true"><use href="#i-analytics"></use></svg></span><p>${escapeHTML(text)}</p></article>`).join('')}</div>`}

function analysisCategoryRecord(name){
  return (state.categories||[]).find(row=>!row.is_deleted && String(row.name||'').localeCompare(String(name||''),'pt-BR',{sensitivity:'base'})===0) || null;
}
function analysisCategoryColorHex(colorKey='slate'){
  const map={orange:'#ff8f2f',blue:'#59a8ff',green:'#40df91',red:'#ff6257',purple:'#c77dff',pink:'#f472b6',yellow:'#ffd166',teal:'#49e2cb',slate:'#94a3b8'};
  return map[String(colorKey||'slate')]||map.slate;
}
function analysisCategoryRows(period){
  const items=(period?.categories||[]).filter(item=>Number(item.total||0)>0);
  const total=items.reduce((sum,item)=>sum+Number(item.total||0),0);
  return items.map(item=>{
    const record=analysisCategoryRecord(item.category)||budgetCategoryRecord(item.category);
    const value=Number(item.total||0);
    const pct=total>0?(value/total)*100:0;
    return {...item,record,value,pct,colorHex:analysisCategoryColorHex(record?.color_key||'slate')};
  });
}
function analysisCategoryMetricCard({title,value,caption='',icon='',accent='orange',strongClass=''}){
  return analysisStaticMetric(title,value,caption,{icon:title.includes('maior')?'trending-up':title.includes('menor')?'trending-down':title.includes('categorias')?'tag':'wallet',accent});
}

function analysisDetailedDonut(items,title='Distribuição por categoria',periodLabel=''){
  const source=(items||[]).filter(item=>Number(item.value||item.total||0)>0);
  const total=source.reduce((sum,item)=>sum+Number(item.value||item.total||0),0);
  const grouped=groupCategoryRowsWithRemainder(source.map(item=>({...item,total:Number(item.value||item.total||0),value:Number(item.value||item.total||0)})),8);
  const rows=(analysisDistribution==='list'?source:grouped).map(item=>{
    if(!item.isRemainder)return item;
    const value=Number(item.value||item.total||0);
    return {...item,category:'Demais',value,total:value,pct:total>0?value/total*100:0,record:null,colorHex:'#94a3b8'};
  });
  if(total<=0)return analysisEmpty('Sem distribuição','Não há gastos para montar este gráfico.');
  const r=72,circ=2*Math.PI*r;let offset=0;
  const circles=rows.map(item=>{
    const amount=Number(item.value||item.total||0);const frac=amount/total;const dash=frac*circ;
    const el=`<circle cx="110" cy="110" r="${r}" fill="none" stroke="${item.colorHex||'#94a3b8'}" stroke-width="28" stroke-dasharray="${dash} ${circ-dash}" stroke-dashoffset="-${offset}"/>`;
    offset+=dash;return el;
  }).join('');
  const legend=analysisDistribution==='list'?pagedList('analysis-category-details',rows,item=>`<div class="analytics-category-row"><div class="analytics-category-main"><span class="analytics-category-icon category-color-${escapeHTML(item.record?.color_key||'slate')}" aria-hidden="true">${categoryIconSVG(item.record?.icon_key||'tag')}</span><strong>${escapeHTML(item.category||item.name||'Outros')}</strong></div><div class="analytics-category-values"><strong>${formatBRL(item.value||item.total||0)}</strong><span>${(Number(item.pct||0)).toFixed(1).replace('.',',')}%</span></div></div>`,{context:JSON.stringify([analysisMode,periodLabel,financialView]),label:'categorias'}):rows.map(item=>`<div class="analytics-category-row"><div class="analytics-category-main"><span class="analytics-category-icon category-color-${escapeHTML(item.record?.color_key||'slate')}" aria-hidden="true">${categoryIconSVG(item.record?.icon_key||'tag')}</span><strong>${escapeHTML(item.category||item.name||'Outros')}</strong></div><div class="analytics-category-values"><strong>${formatBRL(item.value||item.total||0)}</strong><span>${(Number(item.pct||0)).toFixed(1).replace('.',',')}%</span></div></div>`).join('');
  const note='Os nomes, ícones e cores das categorias seguem o seu gerenciador de categorias, mantendo a mesma configuração utilizada em lançamentos, limites e relatórios.';
  return `<div class="analytics-category-split ${analysisDistribution==='list'?'list-only':''}"><div class="analytics-distribution-donut"><div class="analytics-donut analytics-donut-large"><svg viewBox="0 0 220 220" role="img" aria-label="${escapeHTML(title)}"><g transform="rotate(-90 110 110)">${circles}</g><circle cx="110" cy="110" r="49" fill="var(--surface)"/><text x="110" y="110" text-anchor="middle" class="donut-value">${escapeHTML(formatBRL(total))}</text><text x="110" y="132" text-anchor="middle" class="donut-caption">em despesas</text></svg></div></div><div class="analytics-category-list">${legend}</div></div>`;
}
function analysisGroupedBarChart(rows,labelA,labelB){
  if(!rows.length)return analysisEmpty('Nada para comparar','Não há valores nos períodos selecionados.');
  const width=860,height=360,left=62,right=18,top=34,bottom=74,plotW=width-left-right,plotH=height-top-bottom;
  const max=Math.max(1,...rows.flatMap(row=>[Number(row.a||0),Number(row.b||0)]));
  const groups=rows.length; const groupW=plotW/groups; const barW=Math.min(34,Math.max(14,groupW*0.22)); const pairGap=Math.max(8,groupW*0.08); const innerOffset=(groupW-(barW*2+pairGap))/2;
  const y=value=>top+plotH-(Math.max(0,Number(value||0))/max)*plotH;
  const ticks=5;
  const grid=Array.from({length:ticks+1},(_,i)=>{const val=max*(1-i/ticks); const gy=top+(plotH/ticks)*i; return `<line x1="${left}" y1="${gy}" x2="${width-right}" y2="${gy}" class="chart-grid"/><text x="${left-10}" y="${gy+4}" text-anchor="end" class="chart-axis">${escapeHTML(formatBRL(val))}</text>`;}).join('');
  const groupsSvg=rows.map((row,i)=>{const gx=left+i*groupW; const xA=gx+innerOffset; const xB=xA+barW+pairGap; const hA=Math.max(0,top+plotH-y(row.a||0)); const hB=Math.max(0,top+plotH-y(row.b||0)); const baseY=top+plotH; const label=String(row.label||row.category||'').length>12?`${String(row.label||row.category||'').slice(0,12)}…`:String(row.label||row.category||''); return `<g><rect x="${xA}" y="${y(row.a||0)}" width="${barW}" height="${hA}" rx="8" fill="var(--orange)"/><rect x="${xB}" y="${y(row.b||0)}" width="${barW}" height="${hB}" rx="8" fill="#4c9dff"/><text x="${xA+barW/2}" y="${Math.max(16,y(row.a||0)-8)}" text-anchor="middle" class="chart-value chart-value-a">${escapeHTML(analysisShortMoney(row.a||0))}</text><text x="${xB+barW/2}" y="${Math.max(16,y(row.b||0)-8)}" text-anchor="middle" class="chart-value chart-value-b">${escapeHTML(analysisShortMoney(row.b||0))}</text><text x="${gx+groupW/2}" y="${height-26}" text-anchor="middle" class="chart-axis chart-month">${escapeHTML(label)}</text></g>`;}).join('');
  const legend=analysisLegend(labelA,labelB);
  return `${legend}<div class="analytics-svg-wrap"><svg class="analytics-line-chart analytics-bar-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Comparação entre períodos por categoria">${grid}${groupsSvg}</svg></div>`;
}
function analysisCategoryHighlights(periodA,periodB,comparison,labelA,labelB){
  const rowsA=analysisCategoryRows(periodA);
  const top=rowsA[0]||null;
  const least=[...rowsA].filter(item=>item.value>0).sort((a,b)=>a.value-b.value)[0]||null;
  const changeText=comparison?.percent===null?'Sem base anterior':`${analysisPercent(comparison)} vs ${escapeHTML(labelB)}`;
  return `<div class="analytics-metrics analytics-category-metrics">${analysisCategoryMetricCard({title:'Total de despesas',value:formatBRL(periodA?.totals?.totalExpense||0),caption:`<span class="${Math.abs(Number(comparison?.delta||0))<0.005?'neutral':(Number(comparison?.delta||0)<=0?'positive':'negative')}">${changeText}</span>`})}${analysisCategoryMetricCard({title:'Categoria com maior gasto',value:top?escapeHTML(top.category):'Sem dados',caption:top?`${formatBRL(top.value)} (${top.pct.toFixed(1).replace('.',',')}%)`:'—',icon:top?categoryIconSVG(top.record?.icon_key||'tag'):'',accent:top?.record?.color_key||'orange'})}${analysisCategoryMetricCard({title:'Categoria com menor gasto',value:least?escapeHTML(least.category):'Sem dados',caption:least?`${formatBRL(least.value)} (${least.pct.toFixed(1).replace('.',',')}%)`:'—',icon:least?categoryIconSVG(least.record?.icon_key||'tag'):'',accent:least?.record?.color_key||'slate'})}${analysisCategoryMetricCard({title:'Total de categorias',value:String(rowsA.length),caption:'Categorias no período',icon:categoryIconSVG('tag'),accent:'blue'})}</div>`;
}
function analysisBudgetBars(summary,label){
  const rows=(summary?.categories||[]).filter(item=>item.limitDefined===true||item.limit>0||item.spent>0).slice(0,10);
  if(!rows.length)return analysisEmpty(`Sem limites em ${label}`,'Não há limites salvos nem gastos para comparar neste período.');
  const max=Math.max(1,...rows.flatMap(item=>[item.limit,item.spent]));
  return `<div class="analytics-budget-chart"><div class="analytics-budget-heading"><h4>${escapeHTML(label)}</h4>${analysisLegend('Limite','Gasto real')}</div>${rows.map(item=>{
    const hasLimit=item.limitDefined===true||Number(item.limit||0)>0,record=analysisCategoryRecord(item.category);
    return `<div class="analytics-budget-row" data-analysis-budget="${escapeHTML(item.category)}" data-limit="${item.limit}" data-spent="${item.spent}"><span class="analytics-category-icon category-color-${escapeHTML(record?.color_key||'orange')}" aria-hidden="true">${categoryIconSVG(record?.icon_key||'tag')}</span><div class="analytics-budget-label"><strong>${escapeHTML(item.category)}</strong><small class="${hasLimit&&item.spent>item.limit?'negative':''}">${hasLimit?(item.spent>item.limit?'Acima do limite':'Limite definido'):'Sem limite'}</small></div><div class="analytics-budget-track">${hasLimit?`<span class="budget-limit" style="width:${item.limit/max*100}%"></span>`:'<span class="budget-limit missing"></span>'}<span class="budget-spent" style="width:${item.spent/max*100}%"></span></div><div class="analytics-pair-values"><span>${hasLimit?formatBRL(item.limit):'—'}</span><span>${formatBRL(item.spent)}</span></div></div>`;
  }).join('')}</div>`;
}

function analysisMonthKeysAround(endDate,count=6){return Array.from({length:count},(_,index)=>analysisMonthKey(shiftAnalysisMonth(endDate,index-count+1)))}
function analysisLabelForPeriod(mode,a,b){if(mode==='years')return {a:String(a),b:String(b)};return {a:monthLabel(analysisMonthDate(a)),b:monthLabel(analysisMonthDate(b))}}
function analysisEquivalentLabels(spec,mode,yearA,yearB,keyA,keyB){
  if(mode==='years'){
    if(!spec.partial)return {a:String(yearA),b:String(yearB)};
    const monthNames=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
    const end=monthNames[spec.throughMonth]||'dez';
    const suffix=`até ${String(spec.throughDay).padStart(2,'0')}/${String(spec.throughMonth+1).padStart(2,'0')}`;
    return {a:`jan–${end}/${yearA} (${suffix})`,b:`jan–${end}/${yearB} (${suffix})`};
  }
  const base={a:monthLabel(analysisMonthDate(keyA)),b:monthLabel(analysisMonthDate(keyB))};
  if(!spec.partial)return base;
  const day=String(spec.throughDay).padStart(2,'0');
  return {a:`${base.a} (até dia ${day})`,b:`${base.b} (até dia ${day})`};
}

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
  totalDetails.clear('analysis:');
  const seq=++analysisRenderSeq;
  setupAnalyticsFilters();
  const monthA=document.getElementById('analytics-month-a')?.value||analysisInputMonth(dashboardDate);
  const monthB=document.getElementById('analytics-month-b')?.value||analysisInputMonth(addMonth(dashboardDate,-1));
  const yearA=Number(document.getElementById('analytics-year-a')?.value||new Date().getFullYear());
  const yearB=Number(document.getElementById('analytics-year-b')?.value||yearA-1);
  const spec=equivalentComparisonSpec({mode:analysisMode,monthA:analysisKeyFromInput(monthA),monthB:analysisKeyFromInput(monthB),yearA,yearB,today:new Date()});
  const keysA=spec.keysA,keysB=spec.keysB;
  const labels=analysisEquivalentLabels(spec,analysisMode,yearA,yearB,keysA[0],keysB[0]);
  host.setAttribute('aria-busy','true');host.innerHTML='<div class="analytics-loading"><span class="auth-spinner" aria-hidden="true"></span><span>Montando a análise…</span></div>';
  try{
    let budgets={},planningByMonth={};
    if(financialView==='general'&&analysisTab==='budget')budgets=await listBudgetsByMonths([...keysA,...keysB]);
    if(financialView==='general'&&analysisTab==='planning')planningByMonth=await listPlanningByMonths([...keysA,...keysB]);
    if(seq!==analysisRenderSeq)return;
    const periodA=buildAnalysisPeriod({transactions:state.transactions,installments:state.installments,invoiceStatuses:state.invoiceStatuses,budgetsByMonth:budgets,monthKeys:keysA,monthLabel,categories:state.categories,cutoffDaysByMonth:spec.cutoffDaysA});
    const periodB=buildAnalysisPeriod({transactions:state.transactions,installments:state.installments,invoiceStatuses:state.invoiceStatuses,budgetsByMonth:budgets,monthKeys:keysB,monthLabel,categories:state.categories,cutoffDaysByMonth:spec.cutoffDaysB});
    const comparison=comparePeriodTotals(periodA,periodB);
    if(financialView!=='general'){
      host.innerHTML=financialFocusHTML(periodA,periodB,labels,financialView);
    }else if(analysisTab==='overview'){
      const contextKeys=analysisMode==='years'?keysA:analysisMonthKeysAround(analysisInputDate(monthA),analysisTrendMonths);
      const context=buildAnalysisPeriod({transactions:state.transactions,installments:state.installments,invoiceStatuses:state.invoiceStatuses,monthKeys:contextKeys,monthLabel,categories:state.categories});
      const direct=[{label:'Receitas',a:periodA.totals.income,b:periodB.totals.income},{label:'Despesas',a:periodA.totals.totalExpense,b:periodB.totals.totalExpense},{label:'Cartões',a:periodA.totals.cardExpense,b:periodB.totals.cardExpense}];
      let insights;
      if(analysisMode==='years'){
        insights=buildYearInsights(periodA,yearA,formatBRL);
        const change=comparison.totalExpense;
        if(change.percent!==null)insights.unshift(`Os gastos de ${labels.a} estão ${Math.abs(change.percent).toFixed(1)}% ${change.delta>=0?'acima':'abaixo'} de ${labels.b}.`);
      }else insights=buildMonthlyInsights(periodA,periodB,labels.a,labels.b,formatBRL);
      host.innerHTML=`<div class="analytics-metrics">${analysisMetric('Receitas',comparison.income,{goodUp:true})}${analysisMetric('Despesas',comparison.totalExpense,{goodUp:false})}${analysisMetric('Resultado',comparison.result,{goodUp:true})}${analysisMetric('Cartão',comparison.cardExpense,{goodUp:false})}</div><div class="analytics-grid two">${analysisPanel('Evolução',analysisLineChart(context.months,[{label:'Receitas',value:m=>m.income},{label:'Despesas',value:m=>m.totalExpense}],{fillArea:true}),{controls:analysisTrendControl()})}${analysisPanel('Comparação direta',analysisComparisonBars(direct,labels.a,labels.b),{icon:'card'})}</div>${analysisPanel('Onde você gastou mais ou menos',analysisVariations(periodA,periodB),{icon:'trending-up',extraClass:'analytics-variations-panel',subtitle:`${labels.a} × ${labels.b}`,controls:'<button class="text-btn" data-analysis-go="categories" type="button">Ver categorias →</button>'})}${analysisExplanation('O que mudou',insights)}`;
    }else if(analysisTab==='categories'){
      const rows=compareCategories(periodA,periodB,6).map(item=>({...item,label:item.category}));
      const detailedRows=analysisCategoryRows(periodA);
      const displayControls=`<div class="analytics-distribution-controls" role="group" aria-label="Apresentação das categorias"><button type="button" data-analysis-distribution="chart" aria-pressed="${analysisDistribution==='chart'}" aria-label="Mostrar gráfico e lista">${analysisIcon('analytics')}</button><button type="button" data-analysis-distribution="list" aria-pressed="${analysisDistribution==='list'}" aria-label="Mostrar lista">${analysisIcon('receipt')}</button></div>`;
      host.innerHTML=`${analysisCategoryHighlights(periodA,periodB,comparison.totalExpense,labels.a,labels.b)}<div class="analytics-grid two analytics-grid-categories">${analysisPanel('Gastos por categoria',analysisDetailedDonut(detailedRows,'Distribuição por categoria',labels.a),{icon:'analytics',controls:displayControls})}${analysisPanel(analysisMode==='years'?'Comparação entre anos':'Comparação entre meses',analysisGroupedBarChart(rows,labels.a,labels.b),{icon:'analytics'})}</div>`;
    }else if(analysisTab==='budget'){
      const budgetA=aggregateBudgetComparison(periodA),budgetB=aggregateBudgetComparison(periodB);
      const limitChange={current:budgetA.totalLimit,previous:budgetB.totalLimit,delta:budgetA.totalLimit-budgetB.totalLimit,percent:budgetB.totalLimit?((budgetA.totalLimit-budgetB.totalLimit)/Math.abs(budgetB.totalLimit))*100:(budgetA.totalLimit?null:0)};
      const spentChange={current:budgetA.totalSpent,previous:budgetB.totalSpent,delta:budgetA.totalSpent-budgetB.totalSpent,percent:budgetB.totalSpent?((budgetA.totalSpent-budgetB.totalSpent)/Math.abs(budgetB.totalSpent))*100:(budgetA.totalSpent?null:0)};
      host.innerHTML=`<div class="analytics-metrics budget-analytics-metrics">${analysisMetric('Limites planejados',limitChange,{goodUp:false,icon:'target',accent:'orange'})}${analysisMetric('Gasto realizado',spentChange,{goodUp:false,icon:'wallet',accent:'orange'})}${analysisStaticMetric('Saldo dos limites',formatBRL(budgetA.totalLimit-budgetA.totalSpent),budgetA.totalLimit?`${Math.round(budgetA.totalSpent/budgetA.totalLimit*100)}% utilizado`:'Sem limites salvos',{icon:'analytics',accent:budgetA.totalLimit-budgetA.totalSpent>=0?'green':'red',valueClass:budgetA.totalLimit-budgetA.totalSpent<0?'negative':''})}</div><div class="analytics-grid two analytics-equal-grid">${analysisPanel('Período atual',analysisBudgetBars(budgetA,labels.a),{icon:'wallet',extraClass:'analytics-budget-panel'})}${analysisPanel('Comparação',analysisBudgetBars(budgetB,labels.b),{icon:'wallet',extraClass:'analytics-budget-panel'})}</div>`;
    }else if(analysisTab==='planning'){
      const planA=summarizePlanningPeriod(planningByMonth,keysA),planB=summarizePlanningPeriod(planningByMonth,keysB);
      const resultChange={current:planA.plannedResult,previous:planB.plannedResult,delta:planA.plannedResult-planB.plannedResult,percent:Math.abs(planB.plannedResult)>0.005?((planA.plannedResult-planB.plannedResult)/Math.abs(planB.plannedResult))*100:(Math.abs(planA.plannedResult)>0.005?null:0)};
      const pendingTotal=planA.pendingIncome+planA.pendingExpense;
      host.innerHTML=`<div class="analytics-metrics">${analysisStaticMetric('Receitas planejadas',formatBRL(planA.plannedIncome),`${formatBRL(planA.pendingIncome)} a receber`,{icon:'trending-up',accent:'green'})}${analysisStaticMetric('Despesas planejadas',formatBRL(planA.plannedExpense),`${formatBRL(planA.pendingExpense)} a pagar`,{icon:'trending-down',accent:'red'})}${analysisMetric('Saldo planejado',resultChange,{goodUp:true})}${analysisStaticMetric('Pendentes',formatBRL(pendingTotal),`${planA.pendingCount} ${planA.pendingCount===1?'item':'itens'}`,{icon:'clock',accent:'orange'})}</div><div class="analytics-grid two analytics-equal-grid">${planningAnalysisPanel(planA,labels.a,periodA.totals)}${planningAnalysisPanel(planB,labels.b,periodB.totals)}</div><div class="analytics-plan-summary">${analysisStaticMetric('Entradas planejadas',formatBRL(planA.plannedIncome),`${formatBRL(planA.plannedExpense)} em despesas`,{icon:'trending-up',accent:'green'})}${analysisStaticMetric('Andamento',`${planA.completedCount} concluídos`,`${planA.pendingCount} pendentes · ${planA.deferredCount} adiados`,{icon:'clock',accent:'orange'})}${analysisStaticMetric('Valor adiado',formatBRL(planA.deferred),'Para outro mês',{icon:'calendar',accent:'orange'})}</div>${analysisExplanation('Leitura do planejamento',[`Em ${labels.a}, foram planejados ${formatBRL(planA.plannedIncome)} em entradas e ${formatBRL(planA.plannedExpense)} em saídas.`,`${planA.completedCount} ${planA.completedCount===1?'item foi concluído':'itens foram concluídos'}, ${planA.pendingCount} permanecem pendentes e ${planA.deferredCount} foram adiados.`,planA.deferred?`${formatBRL(planA.deferred)} foi transferido para outro mês.`:'Nenhum valor foi adiado neste período.'])}`;
    }else if(analysisTab==='cards'){
      const rows=compareCards(periodA,periodB,8).map(item=>({...item,label:item.name}));
      const contextKeys=analysisMode==='years'?keysA:analysisMonthKeysAround(analysisInputDate(monthA),analysisTrendMonths);
      const context=buildAnalysisPeriod({transactions:state.transactions,installments:state.installments,invoiceStatuses:state.invoiceStatuses,monthKeys:contextKeys,monthLabel,categories:state.categories});
      host.innerHTML=`<div class="analytics-metrics cards-analytics-metrics">${analysisMetric('Gasto no cartão',comparison.cardExpense,{goodUp:false})}${analysisStaticMetric('Participação no gasto',periodA.totals.totalExpense?`${(periodA.totals.cardExpense/periodA.totals.totalExpense*100).toFixed(1).replace('.',',')}%`:'0%','Do total de despesas',{icon:'analytics',accent:'orange'})}</div><div class="analytics-grid two analytics-equal-grid">${analysisPanel('Por cartão',analysisComparisonBars(rows,labels.a,labels.b),{icon:'card'})}${analysisPanel('Evolução no crédito',analysisLineChart(context.months,[{label:'Cartão',value:m=>m.cardExpense}]),{icon:'trending-up',controls:analysisTrendControl()})}</div>`;
    }
    totalDetails.wireAnalytics(periodA,periodB,labels,planningByMonth,keysA);
  }catch(error){console.error('Análises:',error);host.innerHTML=analysisEmpty('Não foi possível montar a análise',error?.message||'Tente novamente em alguns instantes.')}finally{if(seq===analysisRenderSeq)host.setAttribute('aria-busy','false')}
}
function openAnalytics(){showModule('analytics');void renderAnalytics()}
function financialFocusHTML(periodA,periodB,labels,view){
  const a=financialViewSummary(periodA),b=financialViewSummary(periodB);
  const reserve=view==='allocation';
  const label=reserve?'Reservas e investimentos':'Despesas de consumo';
  const amount=reserve?a.allocation:a.consumption;
  const previous=reserve?b.allocation:b.consumption;
  const rows=reserve?a.allocationCategories:periodA.categories.map(r=>({category:r.category,amount:r.total}));
  const categoryHTML=rows.length?rows.slice(0,12).map(row=>`<div class="analytics-category-row"><div class="analytics-category-main"><strong>${escapeHTML(row.category)}</strong></div><strong>${formatBRL(row.amount)}</strong></div>`).join(''):analysisEmpty('Sem registros neste período','Altere o intervalo de comparação ou registre uma movimentação.');
  const context=reserve?'Aportes são destinações de dinheiro, não despesas de consumo.':'Despesas incluem compras no cartão uma única vez, sem duplicar o pagamento da fatura.';
  return `<div class="analytics-metrics">${analysisMetric(label,{current:amount,previous,delta:amount-previous,percent:Math.abs(previous)>.005?(amount-previous)/Math.abs(previous)*100:amount?null:0},{goodUp:reserve})}<article class="analytics-metric" data-analysis-metric="${reserve?'Aportes futuros registrados':'Receitas reconhecidas'}"><span>${reserve?'Aportes futuros registrados':'Receitas reconhecidas'} · ${escapeHTML(labels.a)}</span><strong>${formatBRL(reserve?periodA.totals.futureAllocation:a.income)}</strong><small>${reserve?'Ainda não entram no saldo da meta':'Sem transferências entre contas próprias'}</small></article><article class="analytics-metric" data-analysis-metric="${reserve?'Resultado antes dos aportes':'Resultado de consumo'}"><span>${reserve?'Resultado antes dos aportes':'Resultado de consumo'} · ${escapeHTML(labels.a)}</span><strong>${formatBRL(a.result)}</strong><small>Receitas − despesas de consumo</small></article></div><div class="analytics-grid two"><article class="panel-card analytics-chart-card"><div class="section-title"><div><h3>${escapeHTML(label)} por período</h3><p>${escapeHTML(context)}</p></div></div>${analysisComparisonBars([{label,a:amount,b:previous}],labels.a,labels.b)}</article><article class="panel-card analytics-chart-card"><div class="section-title"><div><h3>${reserve?'Destino dos aportes':'Despesas por categoria'}</h3><p>${escapeHTML(labels.a)}</p></div></div>${categoryHTML}</article></div><p class="financial-focus-note">As classificações antigas não são alteradas automaticamente. O saldo disponível continua independente deste filtro.</p>`;
}
function setFinancialView(view){financialView=['general','consumption','allocation'].includes(view)?view:'general';document.querySelectorAll('[data-financial-view]').forEach(btn=>{const active=btn.dataset.financialView===financialView;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active))});document.querySelector('.analytics-tabs')?.classList.toggle('hidden',financialView!=='general');void renderAnalytics();}
function setAnalysisMode(mode){analysisMode=mode==='years'?'years':'months';document.querySelectorAll('[data-analysis-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.analysisMode===analysisMode));document.getElementById('analytics-month-filters')?.classList.toggle('hidden',analysisMode!=='months');document.getElementById('analytics-year-filters')?.classList.toggle('hidden',analysisMode!=='years');void renderAnalytics()}
function setAnalysisTab(tab){analysisTab=['overview','categories','budget','planning','cards'].includes(tab)?tab:'overview';document.querySelectorAll('[data-analysis-tab]').forEach(btn=>{const active=btn.dataset.analysisTab===analysisTab;btn.classList.toggle('active',active);btn.setAttribute('aria-selected',String(active));btn.tabIndex=active?0:-1;});document.getElementById('analytics-content').setAttribute('aria-labelledby',`analytics-tab-${analysisTab}`);void renderAnalytics()}


function notificationIcon(type){if(String(type||'').startsWith('family_'))return 'i-users';if(type==='budget_near'||type==='budget_over')return 'i-wallet';if(type==='goal_reached')return 'i-target';if(type==='invoice_due')return 'i-card';return 'i-bell'}
function notificationActionLabel(n){if(n.type==='family_invite')return 'Ver convite';if(n.target==='family')return 'Ver Família';if(n.target==='budget')return 'Ver limites';if(n.target==='goals')return 'Ver meta';if(n.target==='cards')return 'Ver fatura';return 'Abrir'}
function notificationTime(value){const date=new Date(value);if(Number.isNaN(date.getTime()))return '';const diff=Math.max(0,Date.now()-date.getTime());const minutes=Math.floor(diff/60000);if(minutes<1)return 'Agora';if(minutes<60)return `Há ${minutes} min`;const hours=Math.floor(minutes/60);if(hours<24)return `Há ${hours} h`;const days=Math.floor(hours/24);if(days<7)return `Há ${days} dia${days===1?'':'s'}`;return date.toLocaleDateString('pt-BR')}
function notificationItemHTML(n){const unread=!n.read_at;return `<article class="notification-item ${unread?'unread':''}"><span class="notification-item-icon"><svg class="ui-icon" aria-hidden="true"><use href="#${notificationIcon(n.type)}"></use></svg></span><div class="notification-item-main"><div class="notification-item-title">${unread?'<span class="notification-dot" aria-hidden="true"></span>':''}<span>${escapeHTML(n.title||'Notificação')}</span></div>${n.body?`<div class="notification-item-body">${escapeHTML(n.body)}</div>`:''}<div class="notification-item-meta">${escapeHTML(notificationTime(n.created_at))}</div></div><button class="notification-item-action" type="button" data-notification-open="${n.id}">${escapeHTML(notificationActionLabel(n))}</button></article>`}
function renderNotifications(){const rows=state.notifications||[];const unread=rows.filter(n=>!n.read_at).length;const badge=document.getElementById('notification-badge');if(badge){badge.textContent=unread>99?'99+':String(unread);badge.classList.toggle('hidden',unread===0)}const caption=document.getElementById('notification-popover-caption');if(caption)caption.textContent=unread?`${unread} não lida${unread===1?'':'s'}`:'Nenhuma não lida';const preview=document.getElementById('notification-preview-list');if(preview)preview.innerHTML=rows.length?rows.slice(0,6).map(notificationItemHTML).join(''):'<div class="notification-empty">Nenhuma notificação por enquanto.</div>';const history=document.getElementById('notification-history-list');if(history)history.innerHTML=pagedList('notifications',recentRecords(rows,'created_at'),notificationItemHTML,{label:'notificações',empty:'<div class="notification-empty">Seu histórico de notificações está vazio.</div>'});const center=document.getElementById('notification-center-caption');if(center)center.textContent=`${rows.length} notificação${rows.length===1?'':'ões'} · ${unread} não lida${unread===1?'':'s'}`;document.getElementById('notification-mark-all')?.toggleAttribute('disabled',unread===0);document.getElementById('notification-center-mark-all')?.toggleAttribute('disabled',unread===0)}
function setNotificationPopover(open){const pop=document.getElementById('notification-popover'),bell=document.getElementById('notification-bell');if(!pop||!bell)return;pop.classList.toggle('hidden',!open);bell.setAttribute('aria-expanded',open?'true':'false')}
async function openNotification(id){const item=(state.notifications||[]).find(n=>n.id===id);if(!item)return;if(!item.read_at){await markNotificationRead(item.id);item.read_at=new Date().toISOString();renderNotifications()}setNotificationPopover(false);closeDialog('notification-center-dialog');if(item.target==='family'){showModule('family');setFamilyInvites('received');setTimeout(()=>document.getElementById('family-incoming')?.scrollIntoView({behavior:'smooth',block:'center'}),60);return}if(item.target==='budget'){showModule('planning');planningSection='limits';setPlanningSection('limits');void loadPlanningMonth(planningDate,{quiet:true});return}if(item.target==='goals'){showModule('goals');return}if(item.target==='cards'){showModule('cards');if(['invoice_due','invoice_overdue'].includes(item.type)&&item.target_id)setTimeout(()=>cardsWorkspace?.openInvoiceById(item.target_id),60);return}}
async function markAllNotifications(){if(!(state.notifications||[]).some(n=>!n.read_at))return;await markAllNotificationsRead();const now=new Date().toISOString();state.notifications.forEach(n=>{if(!n.read_at)n.read_at=now});renderNotifications()}

function familyProfile(id){return state.family?.profiles?.find(x=>x.user_id===id)||null}
function familyProfileName(id){const p=familyProfile(id);return p?.display_name||p?.username||'Membro da família'}
function familyProfileUsername(id){return familyProfile(id)?.username||''}
function permissionTags(link){const items=[['transactions','Lançamentos',link.can_view_transactions],['cards','Cartões',link.can_view_cards],['goals','Metas',link.can_view_goals],['budget','Limites',link.can_view_budget]];return `<div class="permission-tags">${items.map(([,label,on])=>`<span class="permission-tag ${on?'on':''}">${label}</span>`).join('')}</div>`}
function familyPersonHTML({name,subtitle='',actions='',tags=''}){
 const initial=escapeHTML(String(name||'F').trim().charAt(0).toUpperCase()||'F');
 return `<div class="family-person"><div class="family-avatar" aria-hidden="true">${initial}</div><div class="family-person-main"><strong>${escapeHTML(name||'Família')}</strong><small>${escapeHTML(subtitle)}</small>${tags?`<details class="family-person-access"><summary>Ver acesso</summary>${tags}</details>`:''}</div><div class="family-actions">${actions}</div></div>`;
}

function renderFamily(){const data=state.family;if(!data)return;const me=data.user.id;const incoming=data.invites.filter(i=>i.status==='pending'&&i.inviter_user_id!==me);const outgoing=data.invites.filter(i=>i.status==='pending'&&i.inviter_user_id===me);const viewing=data.links.filter(l=>l.active&&l.viewer_user_id===me);const viewers=data.links.filter(l=>l.active&&l.owner_user_id===me);
  document.getElementById('family-incoming').innerHTML=incoming.length?incoming.map(i=>familyPersonHTML({name:familyProfileName(i.inviter_user_id),subtitle:`@${familyProfileUsername(i.inviter_user_id)} quer compartilhar o financeiro com você`,actions:`<button class="mini-btn" data-family-respond="${i.id}" data-accept="1">Aceitar</button><button class="mini-btn danger" data-family-respond="${i.id}" data-accept="0">Recusar</button>`})).join(''):emptyState('Nenhum convite pendente.');
  document.getElementById('family-viewing').innerHTML=viewing.length?viewing.map(l=>familyPersonHTML({name:familyProfileName(l.owner_user_id),subtitle:`@${familyProfileUsername(l.owner_user_id)} · acesso autorizado`,tags:permissionTags(l),actions:`<button class="mini-btn" data-family-monitor="${l.owner_user_id}">Visualizar</button><button class="mini-btn danger" data-family-remove="${l.id}">Deixar de acompanhar</button>`})).join(''):emptyState('Você ainda não acompanha ninguém.');
  document.getElementById('family-viewers').innerHTML=viewers.length?viewers.map(l=>familyPersonHTML({name:familyProfileName(l.viewer_user_id),subtitle:`@${familyProfileUsername(l.viewer_user_id)} · pode acompanhar os grupos autorizados`,tags:permissionTags(l),actions:`<button class="mini-btn" data-family-permissions="${l.id}">Permissões</button><button class="mini-btn danger" data-family-remove="${l.id}">Remover</button>`})).join(''):emptyState('Ninguém acompanha seus dados atualmente.');
  document.getElementById('family-outgoing').innerHTML=outgoing.length?outgoing.map(i=>familyPersonHTML({name:familyProfileName(i.invitee_user_id),subtitle:`@${familyProfileUsername(i.invitee_user_id)} · convite enviado`,actions:`<button class="mini-btn danger" data-family-cancel-invite="${i.id}">Cancelar</button>`})).join(''):emptyState('Nenhum convite enviado aguardando resposta.');
  setFamilyInvites(familyInviteTab);
  if(familyMonitorOwnerId){const link=familyMonitorLink();if(!link){familyProfileAccessError('O titular encerrou o acesso a estes dados.',{revoked:true});void stopFamilyMonitorRealtime();}else if(familyMonitorData&&familyAccessSignature(link)!==familyAccessSignature(familyMonitorData.link)){void loadFamilyMonitor({reason:'Atualizando permissões…'});}}
}

function categoryOriginLabel(origin){return origin==='default'?'Padrão':origin==='system'?'Sistema':'Personalizada'}
function categoryManagerRows(active){
  const search=categoriesSearch.trim().toLocaleLowerCase('pt-BR');
  return (state.categories||[]).filter(row=>!row.is_deleted&&(row.kind===categoriesKind||row.kind==='both')&&row.is_active===active&&(!search||String(row.name).toLocaleLowerCase('pt-BR').includes(search))).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0)||String(a.name).localeCompare(String(b.name),'pt-BR',{sensitivity:'base'}));
}
function categoryManagerRow(row){
  const origin=categoryOriginLabel(row.origin),status=row.is_active?'Ativa':'Oculta';
  const toggleLabel=row.is_active?'Ocultar':'Restaurar';
  const deleteButton=row.origin==='custom'?`<button type="button" class="mini-btn danger category-desktop-action" data-category-delete="${row.id}">Excluir</button>`:'';
  return `<article class="category-manager-row">
    <div class="category-manager-identity">${categoryIconMarkup(row,row.name)}<div><strong>${escapeHTML(row.name)}</strong><small>${escapeHTML(origin)} · <span class="${row.is_active?'positive':'category-status-hidden'}">${status}</span></small></div></div>
    <div class="category-manager-actions">
      <button type="button" class="mini-btn category-desktop-action" data-category-edit="${row.id}">Editar</button>
      <button type="button" class="mini-btn category-desktop-action" data-category-toggle="${row.id}" data-category-active="${row.is_active?'1':'0'}">${toggleLabel}</button>
      ${deleteButton}
      <button type="button" class="category-more-btn" data-category-menu="${row.id}" aria-label="Ações de ${escapeHTML(row.name)}">⋮</button>
    </div>
  </article>`;
}
function renderCategoriesManager(){
  const active=categoryManagerRows(true),hidden=categoryManagerRows(false);
  document.querySelectorAll('[data-category-kind]').forEach(btn=>btn.classList.toggle('active',btn.dataset.categoryKind===categoriesKind));
  const input=document.getElementById('category-search-input');if(input&&document.activeElement!==input)input.value=categoriesSearch;
  const activeTitle=document.getElementById('active-categories-title');if(activeTitle)activeTitle.textContent=`Categorias ativas (${active.length})`;
  const hiddenTitle=document.getElementById('hidden-categories-title');if(hiddenTitle)hiddenTitle.textContent=`Categorias ocultas (${hidden.length})`;
  const activeList=document.getElementById('active-categories-list');if(activeList)activeList.innerHTML=active.length?active.map(categoryManagerRow).join(''):emptyState(categoriesSearch?'Nenhuma categoria ativa encontrada.':'Nenhuma categoria ativa neste grupo.');
  const hiddenList=document.getElementById('hidden-categories-list');if(hiddenList)hiddenList.innerHTML=hidden.length?hidden.map(categoryManagerRow).join(''):emptyState(categoriesSearch?'Nenhuma categoria oculta encontrada.':'Nenhuma categoria oculta neste grupo.');
}
const SETTINGS_PAGES=['account','install','categories','backup','logout'];
function closeSettingsPages(){
  document.getElementById('settings-home-panel')?.classList.remove('hidden');
  for(const page of SETTINGS_PAGES)document.getElementById(`settings-${page}-panel`)?.classList.add('hidden');
  const pageTitle=document.getElementById('page-title');if(pageTitle)pageTitle.textContent='Configurações';
  window.scrollTo({top:0,behavior:'auto'});
}
function openSettingsPage(page){
  const target=SETTINGS_PAGES.includes(page)?page:'account';
  closeDialog('mobile-more-dialog');
  showModule('settings');
  document.getElementById('settings-home-panel')?.classList.add('hidden');
  for(const name of SETTINGS_PAGES)document.getElementById(`settings-${name}-panel`)?.classList.toggle('hidden',name!==target);
  const pageTitle=document.getElementById('page-title');
  const labels={account:'Conta',install:'Instalar o app',categories:'Categorias',backup:'Importar dados antigos',logout:'Sair'};
  if(pageTitle)pageTitle.textContent=labels[target]||'Configurações';
  if(target==='categories')renderCategoriesManager();
  window.scrollTo({top:0,behavior:'auto'});
}
function openCategoriesManager(){
  closeDialog('budget-category-dialog');
  openSettingsPage('categories');
}
function closeCategoriesManager(){closeSettingsPages()}
function closeCategoryPickers(){
  for(const kind of ['icon','color']){
    const panel=document.getElementById(`category-${kind}-panel`);
    const trigger=document.getElementById(`category-${kind}-toggle`);
    panel?.classList.add('hidden');trigger?.setAttribute('aria-expanded','false');
  }
}
function toggleCategoryPicker(kind){
  const panel=document.getElementById(`category-${kind}-panel`);
  if(!panel)return;
  const opening=panel.classList.contains('hidden');
  closeCategoryPickers();
  if(opening){panel.classList.remove('hidden');document.getElementById(`category-${kind}-toggle`)?.setAttribute('aria-expanded','true');}
}
function renderCategoryIconPicker(selected='tag'){
  const input=document.getElementById('category-editor-icon');
  const grid=document.getElementById('category-icon-grid');
  if(!input||!grid)return;
  const safeSelected=normalizeCategoryIconKey(selected);
  input.value=safeSelected;
  grid.innerHTML=CATEGORY_ICON_OPTIONS.map(([value,label])=>`<button type="button" class="category-icon-choice icon-only ${value===safeSelected?'selected':''}" data-category-icon="${escapeHTML(value)}" role="radio" aria-checked="${value===safeSelected?'true':'false'}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}"><span class="category-icon-choice-glyph">${categoryIconSVG(value)}</span></button>`).join('');
  const preview=document.getElementById('category-icon-preview');
  if(preview)preview.innerHTML=categoryIconSVG(safeSelected);
}
function renderCategoryColorPicker(selected='orange'){
  const input=document.getElementById('category-editor-color');
  const grid=document.getElementById('category-color-grid');
  if(!input||!grid)return;
  const available=CATEGORY_COLOR_OPTIONS.map(([key])=>key);
  // Nunca sobrescreve uma cor antiga válida; a chave da categoria continua a mesma.
  const safeSelected=available.includes(selected)?selected:'orange';
  input.value=safeSelected;
  grid.innerHTML=CATEGORY_COLOR_OPTIONS.map(([value,label])=>`<button type="button" class="category-color-choice ${value===safeSelected?'selected':''}" data-category-color="${escapeHTML(value)}" role="radio" aria-checked="${value===safeSelected?'true':'false'}" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}"><span class="category-swatch-dot category-swatch-${escapeHTML(value)}">${value===safeSelected?'<svg class="ui-icon" aria-hidden="true"><use href="#i-check"></use></svg>':''}</span></button>`).join('');
  const preview=document.getElementById('category-color-preview');
  if(preview)preview.className=`category-color-preview category-swatch-${safeSelected}`;
}
function populateCategoryEditorOptions(){
  renderCategoryIconPicker(document.getElementById('category-editor-icon')?.value||'tag');
  renderCategoryColorPicker(document.getElementById('category-editor-color')?.value||'orange');
}
function openCategoryEditor(id=''){
  populateCategoryEditorOptions();setFormError('category-editor-error','');
  const row=(state.categories||[]).find(item=>item.id===id&&!item.is_deleted)||null;
  document.getElementById('category-editor-id').value=row?.id||'';
  document.getElementById('category-editor-title').textContent=row?'Editar categoria':'Nova categoria';
  const kind=document.getElementById('category-editor-kind');kind.value=row?.kind==='income'?'income':row?.kind==='expense'?'expense':categoriesKind;kind.disabled=!!row;
  const nameInput=document.getElementById('category-editor-name');nameInput.value=row?.name||'';nameInput.readOnly=row?.origin==='system';
  document.getElementById('category-editor-note').textContent=row?.origin==='system'?'“Outros” é uma categoria de segurança. Você pode alterar sua aparência ou ocultá-la, mas o nome é protegido.':'Alterar o nome não modifica lançamentos antigos; o histórico continua preservado.';
  renderCategoryIconPicker(row?.icon_key||'tag');
  renderCategoryColorPicker(row?.color_key||'orange');
  closeCategoryPickers();
  openDialog('category-editor-dialog');setTimeout(()=>document.getElementById('category-editor-name')?.focus(),40);
}
function openCategoryActions(id){
  const row=(state.categories||[]).find(item=>item.id===id&&!item.is_deleted);if(!row)return;
  categoryActionId=id;
  document.getElementById('category-actions-summary').innerHTML=`${categoryIconMarkup(row,row.name)}<div><strong>${escapeHTML(row.name)}</strong><small>${escapeHTML(categoryOriginLabel(row.origin))} · ${row.is_active?'Ativa':'Oculta'}</small></div>`;
  const toggle=document.getElementById('category-action-toggle');toggle.textContent=row.is_active?'◉ Ocultar':'↶ Restaurar';
  const del=document.getElementById('category-action-delete');del.classList.toggle('hidden',row.origin!=='custom');
  openDialog('category-actions-dialog');
}
async function reloadCategoriesAfterChange(){
  state.categories=await listCategories();renderCategoriesManager();renderBudget();
  fillCategorySelect('transaction-category','',categoryKindFromDirection(document.getElementById('transaction-direction')?.value||1));
  fillCategorySelect('purchase-category','', 'expense');
  fillCategorySelect('planning-category','',categoryKindFromDirection(document.getElementById('planning-direction')?.value||1));
}
async function onCategoryEditorSubmit(event){
  event.preventDefault();const btn=document.getElementById('category-editor-save');setButtonBusy(btn,true);setFormError('category-editor-error','');
  const id=document.getElementById('category-editor-id').value;
  const input={kind:document.getElementById('category-editor-kind').value,name:document.getElementById('category-editor-name').value,iconKey:document.getElementById('category-editor-icon').value,colorKey:document.getElementById('category-editor-color').value};
  try{await runAppOperation(id?'Atualizando categoria…':'Criando categoria…','Atualizando as opções disponíveis no Family Finance.',async()=>{if(id)await updateCategory(id,input);else await createCategory(input);await reloadCategoriesAfterChange();closeDialog('category-editor-dialog');toast(id?'Categoria atualizada.':'Categoria criada.','success')})}catch(error){console.error(error);setFormError('category-editor-error',error?.message||'Não foi possível salvar a categoria.')}finally{setButtonBusy(btn,false)}
}
async function toggleCategoryAction(id,currentlyActive){
  const row=(state.categories||[]).find(item=>item.id===id&&!item.is_deleted);if(!row)return;
  const next=!currentlyActive;
  if(!next&&!confirm(`Ocultar “${row.name}”? Ela deixará de aparecer em novos registros, mas o histórico será preservado.`))return;
  await runAppOperation(next?'Restaurando categoria…':'Ocultando categoria…','Atualizando as categorias disponíveis no app.',async()=>{await setCategoryActive(id,next);await reloadCategoriesAfterChange();closeDialog('category-actions-dialog');toast(next?'Categoria restaurada.':'Categoria ocultada.','success')});
}
async function deleteCategoryAction(id){
  const row=(state.categories||[]).find(item=>item.id===id&&!item.is_deleted);if(!row)return;
  if(row.origin!=='custom')return toast('Categorias padrão podem ser ocultadas, mas não excluídas.','error');
  if(!confirm(`Excluir “${row.name}” das opções futuras? Lançamentos e limites antigos continuarão preservados.`))return;
  await runAppOperation('Excluindo categoria…','Retirando a categoria das opções futuras sem alterar o histórico.',async()=>{await deleteCustomCategory(id);await reloadCategoriesAfterChange();closeDialog('category-actions-dialog');toast('Categoria excluída das opções futuras.','success')});
}

function renderSettings(){
  if(!currentProfile)return;
  const usernameInput=document.getElementById('settings-username');
  if(usernameInput)usernameInput.value=currentProfile.username||'';
  const nameInput=document.getElementById('settings-display-name');
  if(nameInput&&document.activeElement!==nameInput)nameInput.value=currentProfile.display_name||'';
  applyTheme(currentProfile.theme||'system');
  const status=state.migration||{claimed:false};
  const pill=document.getElementById('migration-status-pill'),form=document.getElementById('legacy-migration-form'),done=document.getElementById('migration-complete');
  if(pill&&form&&done){
    if(status.claimed){
      pill.textContent='Migrado';
      pill.classList.add('ok');
      form.classList.add('hidden');
      done.classList.remove('hidden');
      done.textContent=`Dados antigos vinculados ao usuário “${status.legacy_username}”. O backup legado permanece preservado.`;
    }else{
      pill.textContent='Não migrado';
      pill.classList.remove('ok');
      form.classList.remove('hidden');
      done.classList.add('hidden');
    }
  }
}

let familyInviteTab='received',familyMonitorTab='overview',familyListScroll=0,familyReturnOwner=null;
const familyProfileContexts=new Map();
function familyProfileVisible(){return !document.getElementById('module-family-profile')?.classList.contains('hidden')&&!!familyMonitorOwnerId;}
function setFamilyInvites(tab){
 familyInviteTab=tab==='sent'?'sent':'received';
 document.querySelectorAll('[data-family-invites]').forEach(button=>{const active=button.dataset.familyInvites===familyInviteTab;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
 document.getElementById('family-incoming').classList.toggle('hidden',familyInviteTab!=='received');document.getElementById('family-outgoing').classList.toggle('hidden',familyInviteTab!=='sent');
}

function clearFamilyProfileDOM(){
 totalDetails.clear('family:');
 for(const id of ['family-monitor-metrics','family-monitor-transactions','family-monitor-categories','family-monitor-extras','family-profile-cards','family-profile-goals','family-profile-budget'])document.getElementById(id).innerHTML='';
 document.getElementById('family-monitor-overview').classList.add('hidden');
 document.querySelectorAll('[data-family-profile-view]').forEach(el=>el.classList.add('hidden'));
 document.getElementById('family-profile-tabs').classList.add('hidden');
 document.getElementById('family-monitor-permission-note').classList.add('hidden');
}
function familyProfileAccessError(message,{revoked=false}={}){
 familyMonitorRequest++;clearFamilyProfileDOM();familyMonitorData=null;familyMonitorModel=null;
 if(revoked&&familyMonitorOwnerId){if(state.family)state.family.links=state.family.links.filter(link=>!(link.owner_user_id===familyMonitorOwnerId&&link.viewer_user_id===currentUser?.id));clearListPages(`family:${familyMonitorOwnerId}:`);familyProfileContexts.delete(familyMonitorOwnerId);familyMonitorMonths.delete(familyMonitorOwnerId);}
 document.getElementById('family-profile-error').classList.remove('hidden');document.getElementById('family-profile-error-text').textContent=message;
 document.getElementById('family-profile-retry').classList.toggle('hidden',revoked);familyMonitorSetBusy(false,revoked?'Acesso encerrado.':'Falha ao atualizar.');
}
async function verifyFamilyPageAccess(){
 const owner=familyMonitorOwnerId;if(!owner)return false;
 try{const link=await getFamilyAccess(owner);if(owner!==familyMonitorOwnerId)return false;
  if(familyAccessSignature(link)!==familyAccessSignature(familyMonitorData?.link)){await loadFamilyMonitor({reason:'Conferindo permissões…'});return false;}
  return true;
 }catch(error){if(owner===familyMonitorOwnerId)familyProfileAccessError(String(error?.message).includes('FAMILY_ACCESS_REVOKED')?'O titular encerrou o acesso a estes dados.':'Não foi possível conferir o acesso. Tente novamente.',{revoked:String(error?.message).includes('FAMILY_ACCESS_REVOKED')});return false;}
}
function familyMonitorRenderTabs(){
 const data=familyMonitorData,link=data.link,allowed={overview:link.can_view_transactions||link.can_view_cards,cards:link.can_view_cards,goals:link.can_view_goals,budget:link.can_view_budget};
 if(!allowed[familyMonitorTab])familyMonitorTab=Object.keys(allowed).find(key=>allowed[key])||'overview';
 const any=Object.values(allowed).some(Boolean);document.getElementById('family-profile-tabs').classList.toggle('hidden',!any);
 document.querySelectorAll('[data-family-profile-tab]').forEach(button=>{const key=button.dataset.familyProfileTab,active=allowed[key]&&familyMonitorTab===key;button.classList.toggle('hidden',!allowed[key]);button.classList.toggle('active',!!active);button.setAttribute('aria-selected',String(!!active));button.tabIndex=active?0:-1;});
 document.getElementById('family-monitor-overview').classList.toggle('hidden',!allowed.overview||familyMonitorTab!=='overview');
 document.querySelectorAll('[data-family-profile-view]').forEach(el=>el.classList.toggle('hidden',!allowed[el.dataset.familyProfileView]||familyMonitorTab!==el.dataset.familyProfileView));
 if(!any){document.getElementById('family-profile-error').classList.remove('hidden');document.getElementById('family-profile-error-text').textContent='O titular ainda não compartilhou grupos financeiros.';document.getElementById('family-profile-retry').classList.remove('hidden');}
 if(link.can_view_cards){
  const rows=(data.installments||[]).filter(row=>row.ff2_card_purchases?.record_kind!=='invoice_opening'&&!row.ff2_card_purchases?.cancelled_at);
  const cards=(data.cards||[]).map(card=>{const cardRows=rows.filter(row=>row.card_id===card.id),ledger=buildFinancialMonthLedger({transactions:[],installments:cardRows,monthKey:data.month});return `<article class="family-read-card"><h3>${escapeHTML(card.name)}</h3><span>Compras no mês</span><strong>${formatBRL(ledger.cardExpense)}</strong><small>Fechamento dia ${card.closing_day} · Vencimento dia ${card.due_day}</small></article>`}).join('');
  document.getElementById('family-profile-cards').innerHTML=`<div class="family-read-grid">${cards||emptyState('Nenhum cartão compartilhado.')}</div><article class="family-read-panel"><h3>Compras e parcelas compartilhadas</h3>${pagedList(`family:${familyMonitorOwnerId}:cards`,recentRecords(rows,'invoice_month'),row=>`<div class="family-read-row"><div><strong>${escapeHTML(row.ff2_card_purchases?.description||row.description||'Lançamento do cartão')}</strong><small>${escapeHTML(row.ff2_card_purchases?.category||row.category||'Outros')} · Parcela ${Number(row.installment_no||1)}</small></div><strong>${formatBRL(row.amount)}</strong></div>`,{context:familyMonthKey(familyMonitorDate),label:'parcelas compartilhadas',empty:emptyState('Nenhuma parcela neste mês.'),beforeChange:verifyFamilyPageAccess})}</article>`;
 }
 if(link.can_view_goals){
  document.getElementById('family-profile-goals').innerHTML=pagedList(`family:${familyMonitorOwnerId}:goals`,data.goals||[],goal=>{const status=(data.goalStatus||[]).find(row=>row.goal_id===goal.id),saved=Number(status?.saved??goal.saved_amount??0),target=Number(goal.target_amount||0),pct=target>0?Math.max(0,Math.min(100,saved/target*100)):0;return `<article class="family-read-card"><h3>${escapeHTML(goal.name)}</h3><strong data-total-family-goal="${escapeHTML(goal.id)}" data-total-detail="family:${escapeHTML(familyMonitorOwnerId)}:goal:${escapeHTML(goal.id)}" class="total-detail-trigger" role="button" tabindex="0" aria-haspopup="dialog" aria-controls="total-detail-dialog" aria-label="Conferir saldo da meta ${escapeHTML(goal.name)}">${formatBRL(saved)}</strong><small>Saldo atual · Objetivo ${formatBRL(target)}${goal.status==='archived'?' · Arquivada':status?.completed?' · Concluída':''}</small><div class="family-category-track"><span style="width:${pct}%"></span></div>${goal.due_date?`<small>Prazo ${formatDate(goal.due_date)}</small>`:''}</article>`},{context:'goals',label:'metas compartilhadas',empty:emptyState('Nenhuma meta compartilhada.'),beforeChange:verifyFamilyPageAccess});
 }
 if(link.can_view_budget){
  document.getElementById('family-profile-budget').innerHTML=`<div class="family-read-total"><span>Limites definidos neste mês</span><strong>${formatBRL(familyMonitorModel.budgetLimit)}</strong></div>${pagedList(`family:${familyMonitorOwnerId}:budget`,data.budget?.items||[],item=>`<div class="family-read-row"><strong>${escapeHTML(item.category)}</strong><div><small>Limite mensal</small><strong>${formatBRL(item.limit_amount)}</strong></div></div>`,{context:familyMonthKey(familyMonitorDate),label:'limites compartilhados',empty:emptyState('Nenhum limite definido neste mês.'),beforeChange:verifyFamilyPageAccess})}`;
 }
}
function familyMonitorLink(ownerId=familyMonitorOwnerId){return state.family?.links?.find(l=>l.owner_user_id===ownerId&&l.viewer_user_id===currentUser?.id&&l.active)||null}
function familyMonitorCurrentMonth(){const now=new Date();return new Date(now.getFullYear(),now.getMonth(),1,12)}
function familyMonitorCanAdvance(){return familyMonthKey(familyMonitorDate)<familyMonthKey(familyMonitorCurrentMonth())}
function familyMonitorSetBusy(busy,text=''){const panel=document.getElementById('family-monitor-panel');if(panel)panel.setAttribute('aria-busy',busy?'true':'false');const sync=document.getElementById('family-monitor-sync');if(sync&&text)sync.textContent=text}
function familyMoneyCard(key,label,value,{tone='',note=''}={}){return `<article class="family-monitor-summary-card ${tone}"><span>${escapeHTML(label)}</span><strong data-family-money-key="${escapeHTML(key)}" data-family-money-value="${Number(value)||0}">${formatBRL(value)}</strong>${note?`<small>${escapeHTML(note)}</small>`:''}</article>`}
function familyCountCard(label,value,note=''){return `<article class="family-monitor-summary-card"><span>${escapeHTML(label)}</span><strong>${escapeHTML(String(value))}</strong>${note?`<small>${escapeHTML(note)}</small>`:''}</article>`}
function familyMonitorRenderTransactions(){
 const host=document.getElementById('family-monitor-transactions'),caption=document.getElementById('family-monitor-transaction-caption'),link=familyMonitorData?.link;if(!host||!link)return;
 document.querySelectorAll('[data-family-monitor-filter]').forEach(btn=>btn.classList.toggle('active',btn.dataset.familyMonitorFilter===familyMonitorFilter));
 document.getElementById('family-profile-transactions-section').classList.toggle('hidden',!link.can_view_transactions);
 if(!link.can_view_transactions){host.innerHTML='';return;}
 const rows=recentRecords(filterFamilyTransactions(familyMonitorModel?.transactions||[],familyMonitorFilter));
 caption.textContent=`${rows.length} de ${familyMonitorModel?.transactionCount||0} lançamentos compartilhados.`;
 host.innerHTML=pagedList(`family:${familyMonitorOwnerId}:transactions`,rows,t=>{const signed=Number(t.direction||0)*Number(t.amount||0);return `<div class="family-monitor-transaction" data-family-transaction="${escapeHTML(t.id)}"><div class="family-monitor-transaction-main"><div class="family-monitor-transaction-title">${escapeHTML(t.description||'Lançamento')}</div><div class="family-monitor-transaction-meta"><span>${formatDate(t.occurred_on)}</span><span>${escapeHTML(t.category||'Outros')}</span>${t.recurring_group_id?'<span>Recorrente</span>':''}${t.type==='balance_adjustment'?'<span>Ajuste</span>':''}</div></div><div class="family-monitor-transaction-value ${signed>=0?'positive':'negative'}">${signed>=0?'+':'−'} ${formatBRL(Math.abs(signed))}</div></div>`},{context:`${familyMonthKey(familyMonitorDate)}:${familyMonitorFilter}`,label:'lançamentos compartilhados',empty:emptyState('Nenhum lançamento neste filtro.'),beforeChange:verifyFamilyPageAccess});
}

function familyMonitorRenderCategories(){const host=document.getElementById('family-monitor-categories');const caption=document.getElementById('family-monitor-category-caption');const link=familyMonitorLink();if(!host||!link)return;if(!link.can_view_transactions&&!link.can_view_cards){host.innerHTML=emptyState('Despesas não compartilhadas.');if(caption)caption.textContent='Nenhum grupo de despesas foi autorizado.';return}const rows=familyMonitorModel?.categoryRows||[];if(caption)caption.textContent=`Distribuição de ${formatBRL(familyMonitorModel?.categoryTotal||0)} em ${monthLabel(familyMonitorDate)}.`;host.innerHTML=rows.length?rows.map(row=>`<div class="family-category-row"><div class="family-category-row-top"><span>${escapeHTML(row.name)}</span><strong>${formatBRL(row.value)}</strong></div><div class="family-category-track"><span style="width:${Math.max(0,Math.min(100,row.percent)).toFixed(2)}%"></span></div></div>`).join(''):emptyState('Nenhuma despesa registrada neste mês.');}
function familyMonitorRenderExtras(){const host=document.getElementById('family-monitor-extras');const note=document.getElementById('family-monitor-permission-note');const link=familyMonitorLink();if(!host||!link)return;const extras=[];if(link.can_view_cards)extras.push(`<article class="family-monitor-extra"><span>Cartão no mês</span><strong>${formatBRL(familyMonitorModel?.cardExpense||0)}</strong></article>`);if(link.can_view_goals)extras.push(`<article class="family-monitor-extra"><span>Metas ativas</span><strong>${familyMonitorModel?.activeGoals||0}</strong></article>`);if(link.can_view_budget)extras.push(`<article class="family-monitor-extra"><span>Limites do mês</span><strong>${formatBRL(familyMonitorModel?.budgetLimit||0)}</strong></article>`);host.innerHTML=extras.join('');const partial=!(link.can_view_transactions&&link.can_view_cards&&link.can_view_goals&&link.can_view_budget);if(note){note.classList.toggle('hidden',!partial);note.textContent=partial?'Este painel considera somente os grupos financeiros que o titular autorizou compartilhar com você.':''}}
function renderFamilyMonitorView({animate=false,before=null}={}){
 const link=familyMonitorData?.link,panel=document.getElementById('family-monitor-panel');if(!link||!panel)return;
 const name=familyProfileName(familyMonitorOwnerId),username=familyProfileUsername(familyMonitorOwnerId);
 document.getElementById('family-monitor-name').textContent=name;document.getElementById('family-monitor-caption').textContent=`@${username} · somente consulta`;
 document.getElementById('family-monitor-month-label').textContent=monthLabel(familyMonitorDate);
 const input=document.getElementById('family-monitor-month-input');input.value=familyMonthKey(familyMonitorDate);input.max=familyMonthKey(familyMonitorCurrentMonth());
 document.getElementById('family-monitor-next').disabled=!familyMonitorCanAdvance();document.getElementById('family-monitor-current').classList.toggle('hidden',familyMonthKey(familyMonitorDate)===familyMonthKey(familyMonitorCurrentMonth()));
 familyMonitorModel=buildFamilyMonitorModel(familyMonitorData,link);const metrics=[];
 if(link.can_view_transactions){metrics.push(familyMoneyCard('income','Receitas',familyMonitorModel.income,{tone:'income'}),familyMoneyCard('expense','Despesas',familyMonitorModel.totalExpense,{tone:'expense',note:link.can_view_cards?'Inclui cartão compartilhado':'Lançamentos compartilhados'}),familyMoneyCard('result','Resultado',familyMonitorModel.result),familyCountCard('Lançamentos',familyMonitorModel.transactionCount));}
 else if(link.can_view_cards){metrics.push(familyMoneyCard('card','Cartão no mês',familyMonitorModel.cardExpense,{tone:'expense'}),familyCountCard('Parcelas',(familyMonitorData.installments||[]).length));}
 document.getElementById('family-monitor-metrics').innerHTML=metrics.join('');
 familyMonitorRenderCategories();familyMonitorRenderTransactions();familyMonitorRenderExtras();familyMonitorRenderTabs();totalDetails.wireFamily();panel.classList.remove('hidden');
 if(animate&&before)requestAnimationFrame(()=>animateFamilyMetricChange(before,panel,620));
}

async function loadFamilyMonitor({animate=false,scroll=false,reason='Carregando dados do mês…',retry=true}={}){
 const owner=familyMonitorOwnerId;if(!owner)return;const request=++familyMonitorRequest,previousScroll=window.scrollY;
 const panel=document.getElementById('family-monitor-panel'),before=animate&&familyMonitorData?captureFamilyMetricState(panel):null;
 clearFamilyProfileDOM();document.getElementById('family-monitor-month-label').textContent=monthLabel(familyMonitorDate);document.getElementById('family-monitor-month-input').value=familyMonthKey(familyMonitorDate);document.getElementById('family-profile-error').classList.add('hidden');familyMonitorSetBusy(true,reason);
 try{
  const data=await loadFamilyOverview(owner,familyMonitorDate);if(request!==familyMonitorRequest||owner!==familyMonitorOwnerId)return;
  familyMonitorData=data;
  const i=state.family.links.findIndex(link=>link.owner_user_id===owner&&link.viewer_user_id===currentUser.id);if(i>=0)state.family.links[i]=data.link;
  renderFamilyMonitorView({animate,before});familyMonitorSetBusy(false,`Atualizado agora · ${monthLabel(familyMonitorDate)}`);
  const context=familyProfileContexts.get(owner);if(scroll&&context)requestAnimationFrame(()=>window.scrollTo({top:context.scroll||0,behavior:'auto'}));else if(!scroll)requestAnimationFrame(()=>window.scrollTo({top:previousScroll,behavior:'auto'}));
 }catch(error){
  if(request!==familyMonitorRequest||owner!==familyMonitorOwnerId)return;
  if(String(error?.message).includes('FAMILY_ACCESS_CHANGED')&&retry)return loadFamilyMonitor({animate:false,reason:'Atualizando permissões…',retry:false});
  const revoked=String(error?.message).includes('FAMILY_ACCESS_REVOKED');
  familyProfileAccessError(revoked?'O titular encerrou o acesso a estes dados.':'Não foi possível carregar os dados. Tente novamente.',{revoked});
 }
}

async function stopFamilyMonitorRealtime(){if(familyMonitorRefreshTimer){clearTimeout(familyMonitorRefreshTimer);familyMonitorRefreshTimer=null}if(familyMonitorChannel){try{await familyMonitorChannel.unsubscribe()}catch{}familyMonitorChannel=null}}
function scheduleFamilyMonitorRefresh(){if(!familyProfileVisible())return;if(familyMonitorRefreshTimer)clearTimeout(familyMonitorRefreshTimer);familyMonitorRefreshTimer=setTimeout(()=>{familyMonitorRefreshTimer=null;void loadFamilyMonitor({animate:true,reason:'Novo movimento detectado. Atualizando…'})},260)}
async function startFamilyMonitorRealtime(ownerId){await stopFamilyMonitorRealtime();if(!ownerId)return;try{familyMonitorChannel=await subscribeFamilyOverview(ownerId,async event=>{if(ownerId!==familyMonitorOwnerId)return;if(event?.source==='family_links'){try{state.family=await listFamilyData();renderFamily();if(!familyMonitorLink(ownerId)){familyProfileAccessError('O titular encerrou o acesso a estes dados.',{revoked:true});await stopFamilyMonitorRealtime();return}}catch(error){console.warn('Permissões familiares:',error)}}scheduleFamilyMonitorRefresh()})}catch(error){console.warn('Realtime familiar indisponível:',error)}}
async function closeFamilyMonitor({navigate=true}={}){
 const owner=familyMonitorOwnerId;
 if(owner&&familyMonitorData)familyProfileContexts.set(owner,{month:new Date(familyMonitorDate),filter:familyMonitorFilter,tab:familyMonitorTab,scroll:window.scrollY});
 familyMonitorRequest++;familyMonitorOwnerId=null;familyMonitorData=null;familyMonitorModel=null;clearFamilyProfileDOM();await stopFamilyMonitorRealtime();
 if(navigate){renderFamily();showModule('family');requestAnimationFrame(()=>{window.scrollTo({top:familyListScroll,behavior:'auto'});[...document.querySelectorAll('[data-family-monitor]')].find(b=>b.dataset.familyMonitor===owner)?.focus({preventScroll:true});});}
}

async function setFamilyMonitorMonth(nextDate){if(!familyMonitorOwnerId||!nextDate)return;const current=familyMonitorCurrentMonth();const safe=familyMonthKey(nextDate)>familyMonthKey(current)?current:new Date(nextDate.getFullYear(),nextDate.getMonth(),1,12);if(familyMonthKey(safe)===familyMonthKey(familyMonitorDate))return;familyMonitorDate=safe;familyMonitorMonths.set(familyMonitorOwnerId,new Date(safe));familyMonitorFilter='all';await loadFamilyMonitor({animate:true,reason:`Carregando ${monthLabel(safe)}…`})}
async function openFamilyMonitor(ownerId){
 if(!familyMonitorLink(ownerId))return;
 familyListScroll=window.scrollY;familyReturnOwner=ownerId;const context=familyProfileContexts.get(ownerId);
 familyMonitorOwnerId=ownerId;familyMonitorDate=context?.month||familyMonitorMonths.get(ownerId)||familyMonitorCurrentMonth();familyMonitorFilter=context?.filter||'all';familyMonitorTab=context?.tab||'overview';familyMonitorData=null;familyMonitorModel=null;
 clearFamilyProfileDOM();showModule('family-profile');document.getElementById('family-monitor-panel').classList.remove('hidden');document.getElementById('family-monitor-name').textContent=familyProfileName(ownerId);document.getElementById('family-monitor-caption').textContent=`@${familyProfileUsername(ownerId)} · somente consulta`;
 await startFamilyMonitorRealtime(ownerId);await loadFamilyMonitor({scroll:true,reason:'Conferindo acesso e carregando acompanhamento…'});
}


function openFamilyPermissions(linkId){const link=state.family?.links?.find(l=>l.id===linkId&&l.owner_user_id===currentUser?.id);if(!link)return;document.getElementById('family-link-id').value=link.id;document.getElementById('family-permissions-title').textContent=familyProfileName(link.viewer_user_id);document.getElementById('perm-transactions').checked=!!link.can_view_transactions;document.getElementById('perm-cards').checked=!!link.can_view_cards;document.getElementById('perm-goals').checked=!!link.can_view_goals;document.getElementById('perm-budget').checked=!!link.can_view_budget;setFormError('family-permissions-error','');openDialog('family-permissions-dialog')}


function updateNatureSuggestion(){
 const desc=document.getElementById('transaction-description');
 const field=document.getElementById('transaction-nature');
 const hint=document.getElementById('transaction-nature-suggestion');
 if(!desc||!field||!hint)return;
 const direction=Number(document.getElementById('transaction-direction').value);
 const suggestion=suggestNature(desc.value,document.getElementById('transaction-category').value);
 const allowed=direction>0?['income','transfer','resgate']:['consumption','allocation','transfer'];
 for(const option of field.options){option.disabled=!allowed.includes(option.value);option.hidden=!allowed.includes(option.value)}
 if(!allowed.includes(field.value)){field.value=direction>0?'income':'consumption';delete field.dataset.manuallySet;}
 const relevant=!!suggestion&&allowed.includes(suggestion)&&field.value!==suggestion;
 hint.classList.toggle('suggested',relevant);
 hint.replaceChildren();
 if(relevant){
   hint.append(document.createTextNode(`Sugestão: ${natureLabel({financial_nature:suggestion})}. `));
   const accept=document.createElement('button');accept.type='button';accept.className='nature-accept-btn';accept.textContent='Aceitar sugestão';
   accept.addEventListener('click',()=>{field.value=suggestion;field.dataset.manuallySet='1';updateNatureSuggestion();updateGoalLinkUI({reset:true})});
   hint.append(accept);
 }else hint.textContent=direction>0?'Recebimentos podem ser receitas, resgates ou transferências próprias.':'Você decide como esta saída será contabilizada.';
 updateGoalLinkUI();
}
function updateGoalLinkUI({reset=false}={}){
  const nature=document.getElementById('transaction-nature')?.value;
  const direction=Number(document.getElementById('transaction-direction')?.value||-1);
  const wrap=document.getElementById('transaction-goal-wrap'),checkbox=document.getElementById('transaction-goal-link');
  const picker=document.getElementById('transaction-goal-picker'),select=document.getElementById('transaction-goal-id');
  if(!wrap||!checkbox||!picker||!select)return;
  const isAllocation=(nature==='allocation'&&direction<0)||(nature==='resgate'&&direction>0);
  wrap.classList.toggle('hidden',!isAllocation);
  if(!isAllocation||reset){checkbox.checked=false;select.value=''}
  const goals=(state.goals||[]).filter(g=>g.status!=='archived'||g.id===select.value);
  const previous=select.value;
  select.innerHTML='<option value="">Selecione uma meta</option>'+goals.map(g=>`<option value="${escapeHTML(g.id)}">${escapeHTML(g.name)}</option>`).join('');
  select.value=goals.some(g=>g.id===previous)?previous:'';
  picker.classList.toggle('hidden',!isAllocation||!checkbox.checked);
}
function resetNatureField(nature,{manual=false}={}){const field=document.getElementById('transaction-nature');if(manual)field.dataset.manuallySet='1';else delete field.dataset.manuallySet;field.value=nature||'consumption';updateNatureSuggestion();updateGoalLinkUI({reset:true});}
function openNewTransaction(){document.getElementById('transaction-form').reset();resetNatureField('consumption');fillCategorySelect('transaction-category','',categoryKindFromDirection(document.getElementById('transaction-direction').value));document.getElementById('transaction-id').value='';document.getElementById('transaction-dialog-title').textContent='Novo lançamento';document.getElementById('transaction-date').value=localISO();document.getElementById('transaction-recurring-count').value='12';document.getElementById('recurring-fields').classList.remove('hidden');document.getElementById('recurring-count-wrap').classList.add('hidden');setFormError('transaction-form-error','');openDialog('transaction-dialog')}
function openEditTransaction(id){if(isCardPurchaseRefund(state.transactions.find(t=>t.id===id))||isCardInvoicePayment(state.transactions.find(t=>t.id===id))||String(state.transactions.find(t=>t.id===id)?.reference_key||'').startsWith('invoice-reversal:'))return toast('Corrija este pagamento nos detalhes da fatura.','error');const t=state.transactions.find(x=>x.id===id);if(!t||t.type==='balance_adjustment')return;document.getElementById('transaction-form').reset();document.getElementById('transaction-direction').value=String(t.direction);fillCategorySelect('transaction-category',t.category||'Outros',categoryKindFromDirection(t.direction));document.getElementById('transaction-id').value=t.id;document.getElementById('transaction-dialog-title').textContent='Editar lançamento';document.getElementById('transaction-direction').value=String(t.direction);document.getElementById('transaction-description').value=t.description||'';setMoney('transaction-amount',Number(t.amount));document.getElementById('transaction-date').value=t.occurred_on;document.getElementById('transaction-category').value=t.category||'Outros';document.getElementById('transaction-notes').value=t.notes||'';resetNatureField(t.financial_nature||(Number(t.direction)>0?'income':classifyTransaction(t)==='allocation'?'allocation':'consumption'),{manual:true});if(t.goal_id&&['allocation','resgate'].includes(t.financial_nature)){document.getElementById('transaction-goal-link').checked=true;updateGoalLinkUI();document.getElementById('transaction-goal-id').value=t.goal_id;}document.getElementById('recurring-fields').classList.add('hidden');setFormError('transaction-form-error','');openDialog('transaction-dialog')}
function openBalance(){const cash=calculateCashStats(state.transactions,dashboardDate);document.getElementById('balance-form').reset();document.getElementById('balance-dialog-current').textContent=formatBRL(cash.balance);document.getElementById('balance-date').value=localISO();setFormError('balance-form-error','');openDialog('balance-dialog')}
function openNewCard(){document.getElementById('card-form').reset();document.getElementById('card-id').value='';document.getElementById('card-interest').value='0';document.getElementById('card-dialog-title').textContent='Novo cartão';document.getElementById('card-archive-btn').classList.add('hidden');setFormError('card-form-error','');openDialog('card-dialog')}
function openEditCard(id){const c=state.cards.find(x=>x.id===id);if(!c)return;document.getElementById('card-id').value=c.id;document.getElementById('card-name').value=c.name;setMoney('card-limit',Number(c.credit_limit));document.getElementById('card-closing').value=c.closing_day;document.getElementById('card-due').value=c.due_day;document.getElementById('card-interest').value=Number(c.revolving_interest||0);document.getElementById('card-dialog-title').textContent='Editar cartão';document.getElementById('card-archive-btn').classList.remove('hidden');setFormError('card-form-error','');openDialog('card-dialog')}
function updatePurchaseSummary(){
  const mode=document.getElementById('purchase-mode').value;
  const input=document.getElementById('purchase-installments');
  input.disabled=mode==='single';input.required=mode!=='single';
  document.getElementById('purchase-installments-wrap').classList.toggle('hidden',mode==='single');
  const card=state.cards.find(c=>c.id===document.getElementById('purchase-card-id').value);
  const count=mode==='single'?1:Math.max(2,Number(input.value)||2);
  document.getElementById('purchase-card-caption').textContent=card?.name||'Cartão';
  document.getElementById('purchase-summary').textContent=`${card?.name||'Cartão'} · ${count===1?'À vista':`${count} parcelas`}. Fatura calculada pela data e fechamento do cartão.`;
  if(state.purchases.some(p=>p.card_id===card?.id&&p.record_kind==='invoice_opening'))document.getElementById('purchase-summary').textContent+=' Se esta compra já compõe o saldo legado, confirme a conciliação nos detalhes da fatura.';
}
function setPurchaseFinancialLock(locked){for(const id of ['purchase-total','purchase-date','purchase-mode','purchase-installments'])document.getElementById(id).disabled=locked;document.getElementById('purchase-financial-lock').classList.toggle('hidden',!locked);}
function openNewPurchase(cardId){
  setPurchaseFinancialLock(false);
  document.getElementById('purchase-form').reset();fillCategorySelect('purchase-category','','expense');
  document.getElementById('purchase-id').value='';document.getElementById('purchase-card-id').value=cardId;
  document.getElementById('purchase-mode').value='single';document.getElementById('purchase-installments').value='2';
  document.getElementById('purchase-date').value=cardToday();document.getElementById('purchase-dialog-title').textContent='Nova compra';
  updatePurchaseSummary();setFormError('purchase-form-error','');openDialog('purchase-dialog');
}
async function resolvePurchase(id){
  document.querySelectorAll('.card-operation-error').forEach(node=>node.remove());
  const owner=currentUser?.id;
  if(!owner)throw new Error('AUTH_REQUIRED');
  const purchase=await getPurchase(id);
  if(currentUser?.id!==owner)throw new Error('SESSION_CHANGED');
  if(purchase.user_id!==owner)throw new Error('PURCHASE_NOT_FOUND');
  const index=state.purchases.findIndex(row=>row.id===purchase.id);
  if(index<0)state.purchases.push(purchase);else state.purchases[index]=purchase;
  return purchase;
}
async function openEditPurchase(id){
  if(appActionBusy||!currentUser)return;
  try{
    const p=await runAppOperation('Carregando compra…','Buscando os dados atuais para edição.',()=>resolvePurchase(id));
    if(!p)return;
    if(p.record_kind==='invoice_opening')return toast('Este registro preserva o saldo de conciliação.','error');
    document.getElementById('purchase-form').reset();fillCategorySelect('purchase-category',p.category||'Outros','expense');
    document.getElementById('purchase-id').value=p.id;document.getElementById('purchase-card-id').value=p.card_id;
    document.getElementById('purchase-description').value=p.description;setMoney('purchase-total',Number(p.total_amount));
    document.getElementById('purchase-mode').value=Number(p.installment_count)>1?'installments':'single';
    document.getElementById('purchase-installments').value=Math.max(2,Number(p.installment_count));
    document.getElementById('purchase-date').value=p.purchase_date;document.getElementById('purchase-category').value=p.category||'Outros';
    document.getElementById('purchase-dialog-title').textContent='Editar compra';updatePurchaseSummary();setPurchaseFinancialLock(purchaseTouchesPaidInvoice(id));setFormError('purchase-form-error','');openDialog('purchase-dialog');
  }catch(error){console.error(error);showCardError(error);}
}

function openNewGoal(){document.getElementById('goal-form').reset();document.getElementById('goal-id').value='';setMoney('goal-saved','0');document.getElementById('goal-dialog-title').textContent='Nova meta';prepareGoalAppearance();setFormError('goal-form-error','');openDialog('goal-dialog')}
function openEditGoal(id){const g=state.goals.find(x=>x.id===id);if(!g)return;document.getElementById('goal-id').value=g.id;document.getElementById('goal-name').value=g.name;setMoney('goal-target',Number(g.target_amount));setMoney('goal-saved',Number(g.saved_amount));document.getElementById('goal-due').value=g.due_date||'';document.getElementById('goal-dialog-title').textContent='Editar meta';prepareGoalAppearance(g);setFormError('goal-form-error','');openDialog('goal-dialog')}

function openInvoice(cardId,month=cardMonth(`${dashboardDate.getFullYear()}-${String(dashboardDate.getMonth()+1).padStart(2,'0')}-01`)){cardsWorkspace?.openInvoice(cardId,month)}

function reportDateOrFallback(refDate, fallbackDate) {
  if (refDate instanceof Date && !Number.isNaN(refDate.getTime())) return new Date(refDate.getFullYear(), refDate.getMonth(), 1, 12);
  return new Date(fallbackDate.getFullYear(), fallbackDate.getMonth(), 1, 12);
}
function reportMonthKey(date) {
  const ref=reportDateOrFallback(date,dashboardDate);
  return `${ref.getFullYear()}-${String(ref.getMonth()+1).padStart(2,'0')}-01`;
}
function reportDateFromKey(key) {
  const [year,month]=String(key||'').slice(0,7).split('-').map(Number);
  return new Date(year,(month||1)-1,1,12);
}
function selectedReportMonthKeys() {
  return [...document.querySelectorAll('#report-month-list input[data-report-month]:checked')].map(input=>input.dataset.reportMonth).sort();
}
function setReportCustomExpanded(expanded) {
  document.getElementById('report-custom-toggle').setAttribute('aria-expanded',String(expanded));
  document.getElementById('report-custom-area').hidden=!expanded;
}
function updateReportSelectionSummary() {
  const count=selectedReportMonthKeys().length;
  document.getElementById('report-selection-summary').textContent=`${count} ${count===1?'mês selecionado':'meses selecionados'}`;
}
function updateReportDownloadLabel() {
  if(reportDownloadBusy)return;
  const format=document.querySelector('input[name="report-format"]:checked')?.value==='csv'?'CSV':'PDF';
  document.getElementById('report-download-label').textContent=`Baixar ${format}`;
}
function updateReportPresetState(preset) {
  document.querySelectorAll('.report-presets [data-report-preset]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.reportPreset===preset)));
}
function renderReportMonthSelector(defaultDate=dashboardDate) {
  const today=new Date();
  const currentMonth=new Date(today.getFullYear(),today.getMonth(),1,12);
  const requested=reportDateOrFallback(defaultDate,dashboardDate);
  reportReferenceDate=requested>currentMonth?currentMonth:requested;
  const options=getReportMonthOptions(state.transactions,state.installments,reportReferenceDate).filter(option=>option.key<=reportMonthKey(currentMonth));
  const selectedKey=reportMonthKey(reportReferenceDate);
  const shortMonth=new Intl.DateTimeFormat('pt-BR',{month:'short'});
  document.getElementById('report-month-list').innerHTML=options.map(option=>{
    const name=shortMonth.format(option.date).replace('.','');
    const label=`${name.charAt(0).toUpperCase()}${name.slice(1)}/${option.date.getFullYear()}`;
    return `<label class="report-month-option"><input type="checkbox" data-report-month="${option.key}" aria-label="${escapeHTML(monthLabel(option.date))}" ${option.key===selectedKey?'checked':''}><span>${escapeHTML(label)}</span></label>`;
  }).join('');
  setFormError('report-form-error','');
  updateReportPresetState('current');
  updateReportSelectionSummary();
}
function applyReportPreset(preset) {
  if(reportDownloadBusy)return;
  const inputs=[...document.querySelectorAll('#report-month-list input[data-report-month]')];
  const wanted=new Set();
  if(preset==='current')wanted.add(reportMonthKey(reportReferenceDate));
  else if(preset==='3'||preset==='6'){
    for(let i=0;i<Number(preset);i+=1)wanted.add(reportMonthKey(addMonth(reportReferenceDate,-i)));
  }else if(preset==='all')inputs.forEach(input=>wanted.add(input.dataset.reportMonth));
  inputs.forEach(input=>{input.checked=wanted.has(input.dataset.reportMonth)});
  updateReportPresetState(preset);
  setFormError('report-form-error','');
  updateReportSelectionSummary();
}
function openReportBuilder(refDate) {
  if(reportDownloadBusy)return;
  renderReportMonthSelector(reportDateOrFallback(refDate,dashboardDate));
  setReportCustomExpanded(false);
  document.querySelector('input[name="report-format"][value="pdf"]').checked=true;
  updateReportDownloadLabel();
  openDialog('report-dialog');
}
function setReportControlsBusy(busy) {
  document.querySelectorAll('#report-dialog button,#report-dialog input').forEach(control=>{control.disabled=busy});
}
async function generateSelectedReport() {
  if(reportDownloadBusy)return;
  const monthKeys=selectedReportMonthKeys();
  if(!monthKeys.length){
    setReportCustomExpanded(true);
    setFormError('report-form-error','Selecione pelo menos um mês.');
    document.querySelector('#report-month-list input')?.focus();
    return;
  }
  const format=document.querySelector('input[name="report-format"]:checked')?.value==='csv'?'csv':'pdf';
  const motion=beginDownloadMotion(document.getElementById('report-generate-btn'),{initialLabel:'Preparando…'});
  reportDownloadBusy=true;
  setReportControlsBusy(true);
  setFormError('report-form-error','');
  try{
    if(format==='csv'){
      motion?.setProgress(72,'Montando CSV…');
      await new Promise(resolve=>requestAnimationFrame(resolve));
      downloadFinancialRowsCSV({transactions:state.transactions,monthKeys});
    }else{
      const latestDate=reportDateFromKey(monthKeys[monthKeys.length-1]);
      const comparisonKey=reportMonthKey(addMonth(latestDate,-1));
      const contextMonthKeys=Array.from({length:6},(_,i)=>reportMonthKey(addMonth(latestDate,i-5)));
      const budgetKeys=[...new Set([...monthKeys,comparisonKey,...contextMonthKeys])];
      motion?.setProgress(18,'Preparando dados…');
      const budgetsByMonth=await listBudgetsByMonths(budgetKeys);
      motion?.setProgress(72,'Montando PDF…');
      await new Promise(resolve=>requestAnimationFrame(resolve));
      await downloadFinancialReportPDF({
        transactions:state.transactions,installments:state.installments,
        invoiceStatuses:state.invoiceStatuses,budgetsByMonth,categories:state.categories,
        monthKeys,comparisonMonthKey:comparisonKey,contextMonthKeys,formatDate,formatBRL,monthLabel
      });
    }
    motion?.setProgress(96,'Finalizando…');
    await motion?.complete({hold:320});
    closeDialog('report-dialog');
    toast(format==='csv'?'Arquivo CSV gerado.':`Relatório financeiro gerado com ${monthKeys.length} ${monthKeys.length===1?'mês':'meses'}.`,'success');
  }catch(error){
    console.error('Falha ao exportar relatório financeiro:',error);
    setFormError('report-form-error',`Não foi possível gerar o ${format.toUpperCase()}. Tente novamente.`);
    await motion?.fail('Tente novamente',{hold:600});
  }finally{
    reportDownloadBusy=false;
    setReportControlsBusy(false);
    updateReportDownloadLabel();
  }
}

async function onTransactionSubmit(event){event.preventDefault();const submittedForm=event.currentTarget;const btn=document.getElementById('transaction-save-btn');setButtonBusy(btn,true);setFormError('transaction-form-error','');try{const id=document.getElementById('transaction-id').value;const input={direction:Number(document.getElementById('transaction-direction').value),description:document.getElementById('transaction-description').value,amount:Number(moneyValue('transaction-amount')),date:document.getElementById('transaction-date').value,category:document.getElementById('transaction-category').value,notes:document.getElementById('transaction-notes').value,recurring:document.getElementById('transaction-recurring').checked,recurringCount:Number(document.getElementById('transaction-recurring-count').value),financialNature:document.getElementById('transaction-nature').value,goalId:document.getElementById('transaction-goal-link').checked?document.getElementById('transaction-goal-id').value:null};if(!input.description.trim()||!input.date||input.amount<=0)throw new Error('Preencha descrição, data e um valor maior que zero.');if(!input.category)throw new Error('Ative ou crie uma categoria em Configurações > Categorias antes de salvar.');if(input.direction>0&&!['income','transfer','resgate'].includes(input.financialNature))throw new Error('Classificação inválida para recebimento.');if(input.direction<0&&!['consumption','allocation','transfer'].includes(input.financialNature))throw new Error('Classificação inválida para saída.');if(input.goalId&&!((input.financialNature==='allocation'&&input.direction<0)||(input.financialNature==='resgate'&&input.direction>0)))throw new Error('Somente aportes e resgates podem ser vinculados a metas.');if(document.getElementById('transaction-goal-link').checked&&!input.goalId)throw new Error('Selecione uma meta para vincular esta movimentação.');if(input.goalId&&!state.goals.some(g=>g.id===input.goalId))throw new Error('Esta meta não está mais disponível.');if(!input.goalId&&input.financialNature==='resgate'&&state.goals.length&&!window.confirm('Resgate sem meta vinculada: o saldo disponível aumentará, mas nenhuma meta será reduzida. Continuar?'))return;if(id&&needsLegacyReview(state.transactions.find(t=>t.id===id))&&!window.confirm('Este lançamento antigo ainda não tinha uma natureza financeira confirmada. Deseja confirmar a classificação selecionada e salvar?'))return;await runAppOperation(id?'Atualizando lançamento…':'Salvando lançamento…',input.recurring&&!id?'Criando a série recorrente e protegendo contra envios repetidos.':'Registrando a alteração no seu histórico financeiro.',async()=>{if(id){const original=state.transactions.find(t=>t.id===id);input.resetReserveReconciliation=!!original&&(!!input.goalId||input.financialNature!==original.financial_nature||Number(input.direction)!==Number(original.direction));await updateTransaction(id,input);}else await createTransaction({...input,operation:formOperation(submittedForm,input)});closeDialog('transaction-dialog');toast(id?'Lançamento atualizado.':'Lançamento salvo.','success');syncOperationMessage('Conferindo o histórico completo após a alteração.');await refreshAll()},{animateDashboard:true})}catch(e){console.error(e);setFormError('transaction-form-error',String(e?.message||'').includes('SALDO_META_INSUFICIENTE')?'Não há saldo suficiente na meta para esse resgate. Confira o valor disponível.':(e.message||'Não foi possível salvar.'))}finally{setButtonBusy(btn,false)}}
async function onBalanceSubmit(event){event.preventDefault();const submittedForm=event.currentTarget;const btn=document.getElementById('balance-save-btn');setButtonBusy(btn,true);setFormError('balance-form-error','');try{const input={mode:document.getElementById('balance-mode').value,amount:Number(moneyValue('balance-amount')),reason:document.getElementById('balance-reason').value,date:document.getElementById('balance-date').value};if(input.amount<0||!input.reason.trim()||!input.date)throw new Error('Informe valor, motivo e data.');await runAppOperation('Ajustando saldo…','Registrando o ajuste sem duplicar o resultado mensal.',async()=>{await applyBalanceAdjustment({...input,operation:formOperation(submittedForm,input)});closeDialog('balance-dialog');toast('Saldo ajustado.','success');syncOperationMessage();await refreshAll()},{animateDashboard:true})}catch(e){console.error(e);setFormError('balance-form-error',e.message||'Não foi possível ajustar o saldo.')}finally{setButtonBusy(btn,false)}}
async function onCardSubmit(event){event.preventDefault();const submittedForm=event.currentTarget;const btn=document.getElementById('card-save-btn');setButtonBusy(btn,true);setFormError('card-form-error','');try{const id=document.getElementById('card-id').value;const input={name:document.getElementById('card-name').value,limit:Number(moneyValue('card-limit')),closingDay:Number(document.getElementById('card-closing').value),dueDay:Number(document.getElementById('card-due').value),interest:Number(document.getElementById('card-interest').value||0)};if(!input.name.trim()||input.limit<0||input.closingDay<1||input.closingDay>31||input.dueDay<1||input.dueDay>31)throw new Error('Revise nome, limite, fechamento e vencimento.');await runAppOperation(id?'Atualizando cartão…':'Criando cartão…','Salvando limite, fechamento e vencimento.',async()=>{if(id)await updateCard(id,input);else await createCard({...input,operation:formOperation(submittedForm,input)});closeDialog('card-dialog');toast(id?'Cartão atualizado.':'Cartão criado.','success');syncOperationMessage();await refreshAll()})}catch(e){console.error(e);setFormError('card-form-error',e.message||'Não foi possível salvar o cartão.')}finally{setButtonBusy(btn,false)}}
async function onPurchaseSubmit(event){event.preventDefault();const submittedForm=event.currentTarget;const btn=document.getElementById('purchase-save-btn');setButtonBusy(btn,true);setFormError('purchase-form-error','');try{const id=document.getElementById('purchase-id').value;const input={cardId:document.getElementById('purchase-card-id').value,description:document.getElementById('purchase-description').value,total:Number(moneyValue('purchase-total')),installments:document.getElementById('purchase-mode').value==='single'?1:Number(document.getElementById('purchase-installments').value),date:document.getElementById('purchase-date').value,category:document.getElementById('purchase-category').value};if(!input.description.trim()||input.total<=0||!input.date||input.installments<1||input.installments>60)throw new Error('Revise descrição, valor, data e parcelas.');if(!input.category)throw new Error('Ative ou crie uma categoria de despesa em Configurações > Categorias antes de salvar.');await runAppOperation(id?'Atualizando compra…':'Salvando compra…',input.installments>1?'Gerando as parcelas e vinculando-as às faturas corretas.':'Registrando a compra no cartão.',async()=>{if(id)await updatePurchase(id,input);else await createPurchase({...input,operation:formOperation(submittedForm,input)});closeDialog('purchase-dialog');toast(id?'Compra atualizada.':'Compra salva e parcelas geradas.','success');syncOperationMessage();await refreshAll()},{animateDashboard:true})}catch(e){console.error(e);setFormError('purchase-form-error',cardErrorMessage(e))}finally{setButtonBusy(btn,false)}}
async function onGoalSubmit(event){event.preventDefault();const submittedForm=event.currentTarget;const btn=document.getElementById('goal-save-btn');setButtonBusy(btn,true);setFormError('goal-form-error','');try{const id=document.getElementById('goal-id').value;const input={name:document.getElementById('goal-name').value,target:Number(moneyValue('goal-target')),saved:Number(moneyValue('goal-saved')||0),dueDate:document.getElementById('goal-due').value,iconKey:normalizeGoalIcon(document.getElementById('goal-icon-key').value),colorKey:document.getElementById('goal-color-key').value};if(!input.name.trim()||input.target<=0||input.saved<0)throw new Error('Revise nome e valores da meta.');await runAppOperation(id?'Atualizando meta…':'Criando meta…','Salvando valores e progresso da meta.',async()=>{if(id)await updateGoal(id,input);else await createGoal({...input,operation:formOperation(submittedForm,input)});closeDialog('goal-dialog');toast(id?'Meta atualizada.':'Meta criada.','success');syncOperationMessage();await refreshAll()})}catch(e){console.error(e);setFormError('goal-form-error',String(e?.message||'').includes('SALDO_META_INSUFICIENTE')?'O valor manual da meta não pode ser reduzido abaixo dos resgates já vinculados.':(e.message||'Não foi possível salvar a meta.'))}finally{setButtonBusy(btn,false)}}
async function onFamilyInviteSubmit(event){event.preventDefault();const btn=document.getElementById('family-invite-save');setButtonBusy(btn,true,'Enviando…');setFormError('family-invite-error','');try{await runAppOperation('Enviando convite…','Localizando o usuário e registrando o convite familiar.',async()=>{await sendFamilyInvite(document.getElementById('family-invite-username').value);closeDialog('family-invite-dialog');toast('Convite enviado.','success');syncOperationMessage('Atualizando os vínculos e convites familiares.');await refreshAll()})}catch(e){console.error(e);setFormError('family-invite-error',e.message||'Não foi possível enviar o convite.')}finally{setButtonBusy(btn,false)}}
async function onFamilyPermissionsSubmit(event){event.preventDefault();const btn=document.getElementById('family-permissions-save');setButtonBusy(btn,true);setFormError('family-permissions-error','');try{await runAppOperation('Salvando permissões…','Atualizando exatamente quais grupos financeiros podem ser visualizados.',async()=>{await updateFamilyPermissions(document.getElementById('family-link-id').value,{transactions:document.getElementById('perm-transactions').checked,cards:document.getElementById('perm-cards').checked,goals:document.getElementById('perm-goals').checked,budget:document.getElementById('perm-budget').checked});closeDialog('family-permissions-dialog');toast('Permissões atualizadas.','success');syncOperationMessage('Atualizando os vínculos familiares.');await refreshAll()})}catch(e){console.error(e);setFormError('family-permissions-error',e.message||'Não foi possível salvar as permissões.')}finally{setButtonBusy(btn,false)}}
async function onProfileSettingsSubmit(event){event.preventDefault();const btn=document.getElementById('save-profile-settings-btn');setButtonBusy(btn,true);try{await runAppOperation('Salvando perfil…','Atualizando suas informações de exibição.',async()=>{currentProfile=await updateProfileSettings({displayName:document.getElementById('settings-display-name').value});showApp(currentUser,currentProfile);toast('Nome atualizado.','success');renderSettings()})}catch(e){console.error(e);toast('Não foi possível atualizar o perfil.','error')}finally{setButtonBusy(btn,false)}}
async function onLegacyMigrationSubmit(event){event.preventDefault();const btn=document.getElementById('legacy-migration-btn');setButtonBusy(btn,true,'Migrando…');setFormError('migration-error','');try{await runAppOperation('Migrando dados antigos…','Validando sua conta antiga e copiando os dados com segurança. Esta etapa pode levar alguns segundos.',async()=>{const result=await claimLegacyAccount(document.getElementById('legacy-username').value,document.getElementById('legacy-password').value);document.getElementById('legacy-password').value='';currentProfile=await ensureProfile(currentUser);showApp(currentUser,currentProfile);toast(`Migração concluída: ${result.transactions||0} lançamentos e ${result.goals||0} metas importados.`,'success');syncOperationMessage('Conferindo os dados migrados e reconstruindo a visão financeira.');await refreshAll()})}catch(e){console.error(e);setFormError('migration-error',e.message||'Não foi possível migrar os dados.')}finally{setButtonBusy(btn,false)}}
async function handleDynamicClick(event){const target=event.target.closest('button');if(!target||appActionBusy)return;try{
  if(target.dataset.reserveTreatment)return await setReserveTreatment(target.dataset.reserveId,target.dataset.reserveTreatment);
  if(target.dataset.reserveEdit){closeDialog('reserve-dialog');return openEditTransaction(target.dataset.reserveEdit);}
  if(target.dataset.notificationOpen)return await openNotification(target.dataset.notificationOpen);
  if(target.dataset.familyRespond)return await runAppOperation(target.dataset.accept==='1'?'Aceitando convite…':'Recusando convite…','Atualizando o vínculo familiar.',async()=>{const inviteId=target.dataset.familyRespond;await respondFamilyInvite(inviteId,target.dataset.accept==='1');await markNotificationsForTarget('family',inviteId).catch(()=>{});toast(target.dataset.accept==='1'?'Convite aceito.':'Convite recusado.','success');syncOperationMessage('Atualizando a área Família.');await refreshAll()});
  if(target.dataset.familyCancelInvite)return await runAppOperation('Cancelando convite…','Removendo o convite pendente.',async()=>{await cancelFamilyInvite(target.dataset.familyCancelInvite);toast('Convite cancelado.','success');syncOperationMessage('Atualizando a área Família.');await refreshAll()});
  if(target.dataset.familyPermissions)return openFamilyPermissions(target.dataset.familyPermissions);
  if(target.dataset.familyMonitor)return openFamilyMonitor(target.dataset.familyMonitor);
  if(target.dataset.familyMonitorFilter){if(!await verifyFamilyPageAccess())return;familyMonitorFilter=['all','income','expense'].includes(target.dataset.familyMonitorFilter)?target.dataset.familyMonitorFilter:'all';familyMonitorRenderTransactions();return}
  if(target.dataset.familyRemove){if(!confirm('Remover este vínculo familiar?'))return;return await runAppOperation('Removendo vínculo…','Atualizando o acesso familiar com segurança.',async()=>{await removeFamilyLink(target.dataset.familyRemove);toast('Vínculo removido.','success');if(familyMonitorOwnerId)await closeFamilyMonitor();syncOperationMessage('Atualizando a área Família.');await refreshAll()})}

  if(target.dataset.planningFilter){planningTypeFilter=['all','income','expense'].includes(target.dataset.planningFilter)?target.dataset.planningFilter:'all';renderPlanning();return}
  if(target.dataset.planningSection){setPlanningSection(target.dataset.planningSection);return}
  if(target.dataset.planningOpen){setPlanningSection(target.dataset.planningOpen);return}
  if(target.hasAttribute('data-planning-invoices')){setPlanningSection('plans');const panel=document.getElementById('planning-invoice-panel');panel.open=true;panel.querySelector('summary').focus();panel.scrollIntoView({block:'nearest'});return;}
  if(target.dataset.planningLimit){setPlanningSection('limits');const row=[...document.querySelectorAll('#budget-items [data-budget-category]')].find(el=>el.dataset.budgetCategory===target.dataset.planningLimit);if(row){row.focus({preventScroll:true});row.scrollIntoView({block:'center'});}return;}
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
  if(target.dataset.deletePurchase){if(purchaseTouchesPaidInvoice(target.dataset.deletePurchase))return explainPaidPurchaseLock();if(!confirm('Excluir esta compra e suas parcelas?'))return;return await runAppOperation('Excluindo compra…','Removendo a compra e as parcelas vinculadas.',async()=>{await deletePurchase(target.dataset.deletePurchase);toast('Compra excluída.','success');syncOperationMessage();await refreshAll()},{animateDashboard:true})}
  if(target.dataset.openInvoice)return target.dataset.invoiceMonth?openInvoice(target.dataset.openInvoice,target.dataset.invoiceMonth):openInvoice(target.dataset.openInvoice);

  if(target.hasAttribute('data-open-categories'))return openCategoriesManager();
  if(target.dataset.categoryEdit)return openCategoryEditor(target.dataset.categoryEdit);
  if(target.dataset.categoryMenu)return openCategoryActions(target.dataset.categoryMenu);
  if(target.dataset.categoryToggle)return await toggleCategoryAction(target.dataset.categoryToggle,target.dataset.categoryActive==='1');
  if(target.dataset.categoryDelete)return await deleteCategoryAction(target.dataset.categoryDelete);
  if(target.dataset.budgetMenu)return openBudgetMobileActions(target.dataset.budgetMenu);
  if(target.dataset.budgetRemove)return await removeBudgetCategoryLimit(target.dataset.budgetRemove);
  if(target.dataset.budgetEdit)return openBudgetCategoryEditor(target.dataset.budgetEdit);
  if(target.dataset.editGoal)return openEditGoal(target.dataset.editGoal);
  if(target.dataset.deleteGoal){if(!confirm('Excluir esta meta?'))return;return await runAppOperation('Excluindo meta…','Removendo a meta selecionada.',async()=>{await deleteGoal(target.dataset.deleteGoal);toast('Meta excluída.','success');syncOperationMessage();await refreshAll()})}
  if(target.dataset.goModule){if(target.dataset.goModule==='settings')closeSettingsPages();if(target.dataset.goModule==='planning'){showModule('planning');if(target.dataset.planningTarget)setPlanningSection(target.dataset.planningTarget);void loadPlanningMonth(planningDate,{quiet:true});return}return showModule(target.dataset.goModule)}
}catch(e){console.error(e);toast(e.message||'Não foi possível concluir a ação.','error')}}
function bindUI(){cardsWorkspace=initCardsWorkspace({totalDetails,getState:()=>state,onRefresh:()=>refreshAll({throwOnError:true}),onOperation:runAppOperation,onNewPurchase:openNewPurchase,onLoadPurchase:resolvePurchase,onEditPurchase:openEditPurchase,onEditCard:openEditCard,onCancelPurchase:async id=>runAppOperation('Excluindo compra…','Preservando o histórico da exclusão.',async()=>{await deletePurchase(id);await refreshAll();toast('Compra excluída.','success')},{animateDashboard:true})});
  document.getElementById('purchase-mode').addEventListener('change',updatePurchaseSummary);document.getElementById('purchase-installments').addEventListener('input',updatePurchaseSummary);
document.querySelectorAll('form').forEach(form=>form.addEventListener('reset',()=>clearFormOperation(form)));setAuthMode(authMode);fillCategorySelect('transaction-category','',categoryKindFromDirection(document.getElementById('transaction-direction')?.value||1));fillCategorySelect('purchase-category','','expense');fillCategorySelect('planning-category','',categoryKindFromDirection(document.getElementById('planning-direction')?.value||1));document.getElementById('transaction-filter-month').value='';document.getElementById('app-loading-dialog')?.addEventListener('cancel',event=>event.preventDefault());
  document.getElementById('auth-toggle').addEventListener('click',()=>{if(authBusy)return;authMode=authMode==='login'?'register':'login';setAuthError('');setAuthMode(authMode)});
  document.getElementById('auth-form').addEventListener('submit',async event=>{event.preventDefault();if(authBusy)return;setAuthError('');const username=document.getElementById('username').value.trim().toLowerCase(),password=document.getElementById('password').value;if(!username||!password)return setAuthError('Informe usuário e senha.');if(!/^[a-z0-9._-]{3,24}$/.test(username))return setAuthError('O usuário deve ter de 3 a 24 caracteres: letras minúsculas, números, ponto, hífen ou underline.');if(password.length<6)return setAuthError('A senha precisa ter pelo menos 6 caracteres.');authBusy=true;setAuthBusy(true,authMode,'auth');try{const submittedMode=authMode;const {data,error}=submittedMode==='register'?await signUp(username,password):await signIn(username,password);if(error)throw error;setAuthBusy(true,submittedMode,'data');await enterApp(data.session);if(submittedMode==='register')toast('Conta criada com sucesso.','success')}catch(error){console.error(error);setAuthError(error?.message||'Não foi possível autenticar.')}finally{authBusy=false;setAuthBusy(false,authMode)}});
  document.querySelectorAll('.nav-item[data-module]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.module==='settings')closeSettingsPages();showModule(b.dataset.module);if(b.dataset.module==='planning'){planningSection='overview';setPlanningSection('overview');void loadPlanningMonth(planningDate,{quiet:true})}}));document.querySelectorAll('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>{if(appActionBusy||cardsWorkspace?.isBusy())return;closeDialog(b.dataset.closeDialog)}));document.querySelectorAll('[data-go-module]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.goModule==='settings')closeSettingsPages();showModule(b.dataset.goModule);if(b.dataset.goModule==='planning'){if(b.closest('#module-home'))planningDate=new Date(dashboardDate);setPlanningSection(b.dataset.planningTarget||'overview');void loadPlanningMonth(planningDate,{quiet:true})}}));document.querySelectorAll('.mobile-nav-item[data-module]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.module==='settings')closeSettingsPages();showModule(b.dataset.module);if(b.dataset.module==='planning'){planningSection='overview';setPlanningSection('overview');void loadPlanningMonth(planningDate,{quiet:true})}}));document.getElementById('mobile-more-btn').addEventListener('click',()=>openDialog('mobile-more-dialog'));document.querySelectorAll('[data-mobile-go]').forEach(b=>b.addEventListener('click',()=>{closeDialog('mobile-more-dialog');if(b.dataset.mobileGo==='settings')closeSettingsPages();showModule(b.dataset.mobileGo);if(b.dataset.mobileGo==='planning'){planningSection='overview';setPlanningSection('overview');void loadPlanningMonth(planningDate,{quiet:true})}}));
  document.getElementById('notification-bell').addEventListener('click',event=>{event.stopPropagation();const pop=document.getElementById('notification-popover');setNotificationPopover(pop?.classList.contains('hidden'))});document.getElementById('notification-mark-all').addEventListener('click',()=>markAllNotifications().catch(e=>{console.error(e);toast('Não foi possível atualizar as notificações.','error')}));document.getElementById('notification-center-mark-all').addEventListener('click',()=>markAllNotifications().catch(e=>{console.error(e);toast('Não foi possível atualizar as notificações.','error')}));document.getElementById('notification-view-all').addEventListener('click',()=>{setNotificationPopover(false);renderNotifications();openDialog('notification-center-dialog')});document.addEventListener('click',event=>{if(!event.target.closest('.notification-anchor'))setNotificationPopover(false)});
  document.getElementById('logout-btn').addEventListener('click',()=>void executeLogout());document.getElementById('mobile-logout-btn').addEventListener('click',()=>void executeLogout({closeMobile:true}));
  document.getElementById('report-custom-toggle').addEventListener('click',()=>setReportCustomExpanded(document.getElementById('report-custom-toggle').getAttribute('aria-expanded')!=='true'));
  document.querySelectorAll('input[name="report-format"]').forEach(input=>input.addEventListener('change',updateReportDownloadLabel));
  document.getElementById('report-dialog').addEventListener('cancel',event=>{if(reportDownloadBusy)event.preventDefault()});
  document.getElementById('new-transaction-btn').addEventListener('click',openNewTransaction);document.getElementById('quick-transaction').addEventListener('click',openNewTransaction);document.getElementById('open-balance-adjust').addEventListener('click',openBalance);document.getElementById('new-card-btn').addEventListener('click',openNewCard);document.getElementById('new-goal-btn').addEventListener('click',openNewGoal);document.getElementById('quick-pdf').addEventListener('click',()=>openReportBuilder(dashboardDate));document.getElementById('quick-analytics').addEventListener('click',openAnalytics);document.querySelectorAll('[data-planning-section]').forEach(btn=>btn.addEventListener('click',()=>setPlanningSection(btn.dataset.planningSection)));document.querySelectorAll('[data-planning-open]').forEach(btn=>btn.addEventListener('click',()=>setPlanningSection(btn.dataset.planningOpen)));document.querySelectorAll('[data-new-planning-shortcut]').forEach(btn=>btn.addEventListener('click',openNewPlanning));document.querySelectorAll('[data-module="analytics"],[data-go-module="analytics"],[data-mobile-go="analytics"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(()=>void renderAnalytics(),0)));document.querySelectorAll('[data-analysis-mode]').forEach(btn=>btn.addEventListener('click',()=>setAnalysisMode(btn.dataset.analysisMode)));document.querySelectorAll('[data-financial-view]').forEach(btn=>btn.addEventListener('click',()=>setFinancialView(btn.dataset.financialView)));document.querySelectorAll('[data-analysis-tab]').forEach(btn=>btn.addEventListener('click',()=>setAnalysisTab(btn.dataset.analysisTab)));['analytics-month-a','analytics-month-b','analytics-year-a','analytics-year-b'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>void renderAnalytics()));document.getElementById('report-generate-btn').addEventListener('click',generateSelectedReport);document.getElementById('report-month-list').addEventListener('change',event=>{if(event.target.matches('[data-report-month]')){setFormError('report-form-error','');updateReportPresetState(null);updateReportSelectionSummary()}});document.querySelectorAll('[data-report-preset]').forEach(btn=>btn.addEventListener('click',()=>applyReportPreset(btn.dataset.reportPreset)));document.getElementById('budget-new-btn')?.addEventListener('click',()=>openBudgetCategoryEditor());document.getElementById('budget-current-btn')?.addEventListener('click',async()=>{const now=new Date();budgetDate=new Date(now.getFullYear(),now.getMonth(),1,12);await runAppOperation('Carregando limites…',`Buscando os limites de ${monthLabel(budgetDate)}.`,async()=>{state.budget=await getBudget(budgetDate);renderBudget()})});document.getElementById('budget-suggestion-toggle')?.addEventListener('click',openBudgetSuggestionPage);document.getElementById('budget-suggestion-back')?.addEventListener('click',()=>closeBudgetSuggestionPage({clear:true}));document.getElementById('budget-suggestion-generate')?.addEventListener('click',generateBudgetSuggestion);document.getElementById('budget-suggestion-cancel')?.addEventListener('click',cancelBudgetSuggestion);document.getElementById('budget-suggestion-apply')?.addEventListener('click',()=>void applyBudgetSuggestion());document.getElementById('budget-category-select')?.addEventListener('change',updateBudgetCategoryDialog);document.getElementById('budget-category-apply')?.addEventListener('click',applyBudgetCategoryDraft);document.getElementById('budget-category-remove')?.addEventListener('click',()=>removeBudgetCategoryLimit());document.getElementById('budget-mobile-action-primary')?.addEventListener('click',()=>{const cat=budgetActionCategory;closeBudgetMobileActions();if(cat)openBudgetCategoryEditor(cat)});document.getElementById('budget-mobile-action-remove')?.addEventListener('click',async()=>{const cat=budgetActionCategory;closeBudgetMobileActions();if(cat)await removeBudgetCategoryLimit(cat)});document.getElementById('budget-mobile-action-manage')?.addEventListener('click',()=>{closeBudgetMobileActions();openCategoriesManager()});document.querySelectorAll('[data-settings-page]').forEach(btn=>btn.addEventListener('click',()=>openSettingsPage(btn.dataset.settingsPage)));document.querySelectorAll('[data-settings-back]').forEach(btn=>btn.addEventListener('click',closeSettingsPages));document.getElementById('categories-back-settings')?.addEventListener('click',closeSettingsPages);document.getElementById('new-category-btn')?.addEventListener('click',()=>openCategoryEditor());document.getElementById('category-icon-toggle')?.addEventListener('click',()=>toggleCategoryPicker('icon'));document.getElementById('category-color-toggle')?.addEventListener('click',()=>toggleCategoryPicker('color'));document.getElementById('category-icon-grid')?.addEventListener('click',event=>{const btn=event.target.closest('[data-category-icon]');if(!btn)return;renderCategoryIconPicker(btn.dataset.categoryIcon||'tag');closeCategoryPickers()});document.getElementById('category-color-grid')?.addEventListener('click',event=>{const btn=event.target.closest('[data-category-color]');if(!btn)return;renderCategoryColorPicker(btn.dataset.categoryColor||'orange');closeCategoryPickers()});document.addEventListener('click',event=>{if(!document.getElementById('category-editor-dialog')?.open)return;if(event.target.closest('.category-picker-toggle,.category-picker-panel'))return;closeCategoryPickers()});document.getElementById('category-editor-dialog')?.addEventListener('close',closeCategoryPickers);document.getElementById('category-editor-form')?.addEventListener('submit',onCategoryEditorSubmit);document.getElementById('category-search-input')?.addEventListener('input',event=>{categoriesSearch=event.target.value||'';renderCategoriesManager()});document.querySelectorAll('[data-category-kind]').forEach(btn=>btn.addEventListener('click',()=>{categoriesKind=btn.dataset.categoryKind==='income'?'income':'expense';categoriesSearch='';renderCategoriesManager()}));document.getElementById('category-action-edit')?.addEventListener('click',()=>{const id=categoryActionId;closeDialog('category-actions-dialog');if(id)openCategoryEditor(id)});document.getElementById('category-action-toggle')?.addEventListener('click',async()=>{const row=(state.categories||[]).find(item=>item.id===categoryActionId);if(row)await toggleCategoryAction(row.id,!!row.is_active)});document.getElementById('category-action-delete')?.addEventListener('click',async()=>{if(categoryActionId)await deleteCategoryAction(categoryActionId)});
  document.getElementById('goal-icon-toggle').addEventListener('click',()=>{const panel=document.getElementById('goal-icon-panel'),opening=panel.classList.contains('hidden');panel.classList.toggle('hidden',!opening);document.getElementById('goal-icon-toggle').setAttribute('aria-expanded',String(opening));if(opening)panel.querySelector('[aria-checked="true"]')?.focus();});
  document.getElementById('goal-icon-grid').addEventListener('click',event=>{const button=event.target.closest('[data-goal-icon]');if(!button)return;renderGoalIconPicker(button.dataset.goalIcon);closeGoalIconPicker({focus:true});});
  document.getElementById('goal-icon-grid').addEventListener('keydown',event=>{const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];if(!keys.includes(event.key))return;const button=event.target.closest('[data-goal-icon]');if(!button)return;event.preventDefault();const columns=getComputedStyle(event.currentTarget).gridTemplateColumns.split(' ').length,index=GOAL_ICON_OPTIONS.findIndex(([key])=>key===button.dataset.goalIcon),delta=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:event.key==='ArrowUp'?-columns:columns;const next=event.key==='Home'?0:event.key==='End'?GOAL_ICON_OPTIONS.length-1:(index+delta+GOAL_ICON_OPTIONS.length)%GOAL_ICON_OPTIONS.length;renderGoalIconPicker(GOAL_ICON_OPTIONS[next][0]);document.getElementById('goal-icon-grid').querySelector('[aria-checked="true"]')?.focus();});
  document.getElementById('goal-dialog').addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.getElementById('goal-icon-panel').classList.contains('hidden')){event.preventDefault();event.stopPropagation();closeGoalIconPicker({focus:true});}});
  document.getElementById('goal-dialog').addEventListener('close',()=>closeGoalIconPicker());
  document.getElementById('goal-dialog').addEventListener('click',event=>{if(!event.target.closest('.goal-icon-field'))closeGoalIconPicker();});
  document.getElementById('transaction-form').addEventListener('submit',onTransactionSubmit);document.getElementById('planning-form').addEventListener('submit',onPlanningSubmit);document.getElementById('balance-form').addEventListener('submit',onBalanceSubmit);document.getElementById('card-form').addEventListener('submit',onCardSubmit);document.getElementById('purchase-form').addEventListener('submit',onPurchaseSubmit);document.getElementById('goal-form').addEventListener('submit',onGoalSubmit);document.getElementById('family-invite-form').addEventListener('submit',onFamilyInviteSubmit);document.getElementById('family-permissions-form').addEventListener('submit',onFamilyPermissionsSubmit);document.getElementById('profile-settings-form').addEventListener('submit',onProfileSettingsSubmit);document.getElementById('settings-logout-btn')?.addEventListener('click',()=>void executeLogout());document.getElementById('legacy-migration-form').addEventListener('submit',onLegacyMigrationSubmit);document.getElementById('new-planning-btn').addEventListener('click',openNewPlanning);document.getElementById('planning-prev').addEventListener('click',()=>void setPlanningMonth(shiftPlanningMonth(planningDate,-1)));document.getElementById('planning-next').addEventListener('click',()=>void setPlanningMonth(shiftPlanningMonth(planningDate,1)));document.getElementById('planning-current').addEventListener('click',()=>void setPlanningMonth(planningCurrentMonth()));document.getElementById('planning-status-filter').addEventListener('change',event=>{planningStatusFilter=event.target.value||'all';renderPlanning()});document.getElementById('planning-move-all').addEventListener('click',()=>void moveAllPlanningPending());document.getElementById('new-family-invite-btn').addEventListener('click',()=>{document.getElementById('family-invite-form').reset();setFormError('family-invite-error','');openDialog('family-invite-dialog')});document.getElementById('family-monitor-close').addEventListener('click',()=>void closeFamilyMonitor());document.getElementById('family-monitor-prev').addEventListener('click',()=>void setFamilyMonitorMonth(shiftFamilyMonth(familyMonitorDate,-1)));document.getElementById('family-monitor-next').addEventListener('click',()=>{if(familyMonitorCanAdvance())void setFamilyMonitorMonth(shiftFamilyMonth(familyMonitorDate,1))});document.getElementById('family-monitor-current').addEventListener('click',()=>void setFamilyMonitorMonth(familyMonitorCurrentMonth()));document.getElementById('family-monitor-month-input').addEventListener('change',event=>{const date=familyDateFromMonth(event.target.value);if(date)void setFamilyMonitorMonth(date)});document.querySelectorAll('[data-theme-choice]').forEach(btn=>btn.addEventListener('click',async()=>{if(appActionBusy)return;try{await runAppOperation('Salvando aparência…','Guardando sua preferência de tema.',async()=>{currentProfile=await updateProfileSettings({theme:btn.dataset.themeChoice});applyTheme(currentProfile.theme);toast('Tema atualizado.','success');renderSettings()})}catch(e){console.error(e);toast('Não foi possível salvar o tema.','error')}}));
  document.getElementById('transaction-description').addEventListener('input',updateNatureSuggestion);document.getElementById('transaction-nature').addEventListener('change',e=>{e.target.dataset.manuallySet='1';updateNatureSuggestion();updateGoalLinkUI({reset:true})});document.getElementById('transaction-goal-link').addEventListener('change',()=>updateGoalLinkUI());
  document.getElementById('transaction-recurring').addEventListener('change',e=>document.getElementById('recurring-count-wrap').classList.toggle('hidden',!e.target.checked));document.getElementById('transaction-direction')?.addEventListener('change',event=>{fillCategorySelect('transaction-category','',categoryKindFromDirection(event.target.value));updateNatureSuggestion()});document.getElementById('planning-direction')?.addEventListener('change',event=>{fillCategorySelect('planning-category','',categoryKindFromDirection(event.target.value));updatePlanningNatureVisibility();});['transaction-search','transaction-filter-type','transaction-filter-month'].forEach(id=>document.getElementById(id).addEventListener(id==='transaction-search'?'input':'change',renderTransactions));
  document.querySelectorAll('[data-month-action]').forEach(b=>b.addEventListener('click',async()=>{if(appActionBusy)return;const previousDashboard=new Date(dashboardDate);dashboardDate=addMonth(dashboardDate,b.dataset.monthAction==='next'?1:-1);try{await runAppOperation('Carregando mês…',`Buscando os dados de ${monthLabel(dashboardDate)}.`,async()=>{const [budget,planning]=await Promise.all([getBudget(dashboardDate),listPlanningMonth(dashboardDate)]);dashboardBudget=budget;state.planning=planning;if(planningSameMonth(planningDate,dashboardDate))planningItems=planning;renderHome();if(planningSameMonth(planningDate,dashboardDate)){state.budget=budget;budgetDate=new Date(planningDate);renderBudget();renderPlanning()}})}catch(e){dashboardDate=previousDashboard;renderHome();toast('Não foi possível carregar o mês.','error')}}));document.querySelectorAll('[data-budget-month]').forEach(b=>b.addEventListener('click',async()=>{if(appActionBusy)return;const previousBudget=new Date(budgetDate);budgetDate=addMonth(budgetDate,b.dataset.budgetMonth==='next'?1:-1);try{await runAppOperation('Carregando limites…',`Buscando os limites de ${monthLabel(budgetDate)}.`,async()=>{state.budget=await getBudget(budgetDate);renderBudget()})}catch(e){budgetDate=previousBudget;renderBudget();toast('Não foi possível carregar os limites.','error')}}));document.addEventListener('click',handleDynamicClick)}

async function init(){bindUI();initUpdateCenter({onUpdateNow:async()=>{await activateAppUpdate()}});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&familyProfileVisible())void loadFamilyMonitor({animate:true,reason:'Conferindo atualizações…'})});void initPWA().catch(error=>console.warn('PWA:',error));const session=await getSession().catch(()=>null);if(session){setAuthBusy(true,'login','data');try{await enterApp(session)}finally{setAuthBusy(false,'login')}}else showAuth();onAuthChange(async (next,event)=>{if(next){if(currentUser?.id===next.user.id)return;await enterApp(next);}else{bootstrapGeneration++;totalDetails.clear();clearListPages();familyProfileContexts.clear();clearFamilyProfileDOM();currentUser=null;currentProfile=null;if(notificationChannel){try{await notificationChannel.unsubscribe()}catch{}notificationChannel=null}await stopFamilyMonitorRealtime();familyMonitorOwnerId=null;showAuth()}})}
init();

document.getElementById('module-planning').addEventListener('keydown',event=>{
 const current=event.target.closest('[data-planning-section]');if(!current||appActionBusy)return;
 const tabs=[...document.querySelectorAll('[data-planning-section]')],index=tabs.indexOf(current);
 const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;
 if(next===null)return;event.preventDefault();setPlanningSection(tabs[next].dataset.planningSection);tabs[next].focus();
});

// Controls are delegated because charts are rendered again after a period change.
document.getElementById('module-analytics').addEventListener('change',event=>{
 if(event.target.matches('[data-analysis-trend]')){const value=Number(event.target.value);if([3,6,12].includes(value)){analysisTrendMonths=value;void renderAnalytics();}}
});
document.getElementById('module-analytics').addEventListener('click',event=>{
 const go=event.target.closest('[data-analysis-go]');if(go){setAnalysisTab(go.dataset.analysisGo);document.getElementById(`analytics-tab-${analysisTab}`).focus();return;}
 const display=event.target.closest('[data-analysis-distribution]');if(display){analysisDistribution=display.dataset.analysisDistribution==='list'?'list':'chart';void renderAnalytics().then(()=>document.querySelector(`[data-analysis-distribution="${analysisDistribution}"]`)?.focus());}
});
document.getElementById('module-analytics').addEventListener('keydown',event=>{
 const current=event.target.closest('[data-analysis-tab]');if(!current||appActionBusy)return;
 const tabs=[...document.querySelectorAll('[data-analysis-tab]')],index=tabs.indexOf(current);
 const next=event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;
 if(next===null)return;event.preventDefault();setAnalysisTab(tabs[next].dataset.analysisTab);tabs[next].focus();
});

document.getElementById('module-family').addEventListener('click',event=>{const tab=event.target.closest('[data-family-invites]');if(tab)setFamilyInvites(tab.dataset.familyInvites);});
document.getElementById('module-family-profile').addEventListener('click',event=>{const tab=event.target.closest('[data-family-profile-tab]');if(tab&&!tab.classList.contains('hidden')){familyMonitorTab=tab.dataset.familyProfileTab;void loadFamilyMonitor({reason:'Conferindo acesso…'});}});
document.getElementById('family-profile-retry').addEventListener('click',()=>void loadFamilyMonitor());
document.addEventListener('ff:module-change',event=>{if(familyMonitorOwnerId&&event.detail.module!=='family-profile')void closeFamilyMonitor({navigate:false});});
for(const selector of ['[data-family-profile-tab]','[data-family-invites]'])document.addEventListener('keydown',event=>{const current=event.target.closest(selector);if(!current)return;const tabs=[...current.parentElement.querySelectorAll(selector)].filter(el=>!el.classList.contains('hidden')),i=tabs.indexOf(current);const next=event.key==='ArrowRight'?(i+1)%tabs.length:event.key==='ArrowLeft'?(i+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:null;if(next===null)return;event.preventDefault();tabs[next].click();tabs[next].focus();});

let activeGoalHistory=null;
function renderGoalHistory(){
 const goal=state.goals.find(g=>g.id===activeGoalHistory);if(!goal)return;
 const progress=goalProgress(goal,state.transactions),rows=recentRecords(state.transactions.filter(t=>t.goal_id===goal.id&&((t.financial_nature==='allocation'&&Number(t.direction)===-1)||(t.financial_nature==='resgate'&&Number(t.direction)===1))));
 document.getElementById('goal-history-title').textContent=goal.name;
 document.getElementById('goal-history-content').innerHTML=`<div class="goal-history-total"><span>Saldo da meta</span><strong>${formatBRL(progress.saved)}</strong><small>Saldo inicial ${formatBRL(progress.base)} · Aportes líquidos ${formatBRL(progress.linked)}</small></div>${pagedList(`goal-history:${goal.id}`,rows,t=>{const deposit=t.financial_nature==='allocation',future=t.occurred_on>localISO();return `<div class="goal-history-row"><div><strong>${escapeHTML(t.description)}</strong><small>${formatDate(t.occurred_on)} · ${deposit?'Aporte':'Retirada'}${future?' · Futuro':''}</small></div><strong class="goal-history-value ${deposit?'positive':'negative'}">${deposit?'+':'−'} ${formatBRL(t.amount)}</strong></div>`},{label:'aportes e retiradas',empty:emptyState('Nenhum aporte ou retirada vinculado a esta meta.')})}`;
}
document.addEventListener('click',event=>{const button=event.target.closest('[data-goal-history]');if(!button)return;activeGoalHistory=button.dataset.goalHistory;renderGoalHistory();openDialog('goal-history-dialog');});


async function navigateTotalRow(action){
 if(!currentUser)return;
 if(action.kind==='composition'){await totalDetails.open(action.key,document.querySelector(`[data-total-detail="${CSS.escape(action.key)}"]`));return;}
 if(action.kind==='plan'){
  const date=planningMonthDate(action.date);showModule('planning');setPlanningSection('plans');
  planningTypeFilter='all';planningStatusFilter='all';await loadPlanningMonth(date,{quiet:true});
  await revealListRecord('planning-items',row=>row.id===action.id);highlightTotalRecord(document.querySelector(`[data-total-plan="${CSS.escape(action.id)}"]`));
 }else if(action.kind==='transaction'){
  document.getElementById('transaction-search').value='';document.getElementById('transaction-filter-type').value='all';document.getElementById('transaction-filter-month').value='';
  showModule('transactions');renderTransactions();await revealListRecord('transactions',row=>row.id===action.id);
  highlightTotalRecord(document.querySelector(`#transactions-list [data-total-transaction="${CSS.escape(action.id)}"]`));
 }else if(action.kind==='invoice'){showModule('cards');if(action.installmentId)await cardsWorkspace?.locateInvoiceItem(action.cardId,action.month,action.installmentId,action.purchaseId);else cardsWorkspace?.openInvoice(action.cardId,action.month);}
 else if(action.kind==='goal'){
  showModule('goals');const goal=state.goals.find(g=>g.id===action.id);if(!goal)return;
  const target=document.querySelector(`[data-total-goal="${CSS.escape(action.id)}"]`);if(target)await totalDetails.open('goal:'+action.id,target);
 }
}
function highlightTotalRecord(target){
 document.querySelectorAll('.total-detail-highlight').forEach(el=>el.classList.remove('total-detail-highlight'));
 if(!target){toast('O registro não está mais disponível. Atualize seus dados.','error');return;}
 target.classList.add('total-detail-highlight');target.tabIndex=-1;target.scrollIntoView({block:'center',behavior:'auto'});target.focus({preventScroll:true});
}

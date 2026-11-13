import {moneyValue,setMoney} from './money-input.js?v=2.9.42';
import {invoiceWorkspaceModel,invoiceWorkspacePage} from './invoice-workspace-model.js?v=2.9.42';
import { limitComposition } from './total-composition.js?v=2.9.42';
import {pagedList,recentRecords} from './list-pagination.js?v=2.9.42';
import {initCardAdjustments} from './card-adjustments-workspace.js?v=2.9.42';
import { buildCardInvoices,cardLimitSummary,cardToday,cardMonth,cardDate,invoiceStatusLabel,cardAdjustmentLabel } from './card-domain.js?v=2.9.42';
import { payCardInvoice,reverseCardPayment,deleteCard } from './cards.js?v=2.9.42';
import { formOperation,clearFormOperation } from './request-operation.js?v=2.9.42';
import { calculateCashStats } from './finance.js?v=2.9.42';
import { formatBRL,formatDate,monthLabel,escapeHTML,openDialog,closeDialog,setFormError,toast } from './ui.js?v=2.9.42';
import { categoryIconSVG } from './categories.js?v=2.9.42';
import { canonicalCategoryName } from './category-alias.js?v=2.9.42';
const e=escapeHTML;
const icon=(name)=>`<svg class="ui-icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const shortMonth=key=>new Intl.DateTimeFormat('pt-BR',{month:'short',year:'numeric'}).format(cardDate(key)).replace('.','').replace(' de ','/');
const empty=text=>`<p class="card-empty">${e(text)}</p>`;
export function initCardsWorkspace({totalDetails,getState,onRefresh,onOperation,onNewPurchase,onLoadPurchase,onEditPurchase,onEditCard,onCancelPurchase}){
 let selectedCardId=null,activeInvoice=null,activePurchase=null,paying=false,negativeApproved=false,lastRenderedCardId=null,historyCardId=null,historyFilter='all',chartPeriod='all';
 const adjustmentsUI=initCardAdjustments({getState,onRefresh,onOperation,onInvoiceEdited:result=>{if(activeInvoice)activeInvoice.key=result.invoice_month;}});
 let invoiceTab='purchases',invoicePages={purchases:0,payments:0,adjustments:0},returnToHistory=false,invoiceOpener=null,resetting=false,editingPurchases=false;
 const state=()=>getState();
 const findCard=id=>state().cards.find(card=>card.id===id);
 const invoices=card=>buildCardInvoices(card,state().installments,state().invoiceStatuses);
 const selectedInvoice=(id,key)=>{const card=findCard(id);return card?invoices(card).find(invoice=>invoice.invoiceMonth===key):null};
 const categoryTile=name=>{const canonical=canonicalCategoryName(name,state().categories);const record=state().categories.find(row=>!row.is_deleted&&row.name.toLocaleLowerCase('pt-BR')===canonical.toLocaleLowerCase('pt-BR'));return `<span class="category-icon-tile category-color-${e(record?.color_key||'slate')}">${categoryIconSVG(record?.icon_key||'tag')}</span>`};
 const statusBadge=invoice=>`<span class="card-status card-status-${e(invoice.status)}">${invoice.creditBalance>0?'Crédito disponível':invoice.total<=0&&invoice.baseAmount<=0?'Sem compras':e(invoiceStatusLabel(invoice.status))}</span>`;
 function filteredChartMonths(items){
  const current=cardMonth(),registered=items.filter(inv=>inv.total!==0||inv.paidAmount>0||inv.rows.length>0||inv.netAdjustments!==0);
  if(chartPeriod==='future')return registered.filter(i=>i.invoiceMonth>current);
  if(chartPeriod==='all')return registered;
  const since=cardDate(current);since.setMonth(since.getMonth()-Number(chartPeriod)+1);const lower=`${since.getFullYear()}-${String(since.getMonth()+1).padStart(2,'0')}-01`;
  return registered.filter(i=>i.invoiceMonth>=lower&&i.invoiceMonth<=current);
 }
 const canEditInvoice=inv=>inv&&!inv.settledAt&&inv.paidAmount===0&&inv.rows.some(r=>r.ff2_card_purchases?.record_kind==='invoice_opening');
 function chart(card,items){
  const months=filteredChartMonths(items);if(!months.length)return empty('Nenhuma fatura registrada neste período.');
  const max=Math.max(...months.map(inv=>Math.max(0,inv.total)),1)*1.18;
  const compact=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',notation:'compact',maximumFractionDigits:1}).format(v);
  const bars=months.map(inv=>`<button type="button" class="card-chart-column ${inv.invoiceMonth===cardMonth()?'current':inv.invoiceMonth>cardMonth()?'future':'past'}" data-card-invoice="${e(card.id)}" data-card-month="${inv.invoiceMonth}" aria-label="${e(monthLabel(cardDate(inv.invoiceMonth)))}: fatura de ${e(formatBRL(inv.total))}, ${e(invoiceStatusLabel(inv.status))}"><span class="card-chart-track"><span class="card-chart-fill" style="height:${Math.max(0,Math.min(100,inv.total/max*100)).toFixed(3)}%"><span class="card-chart-value"><span class="card-chart-value-full">${e(formatBRL(inv.total))}</span><span class="card-chart-value-compact">${e(compact(inv.total))}</span></span></span></span><span class="card-chart-month">${e(shortMonth(inv.invoiceMonth))}</span></button>`).join('');
  return `<div class="card-chart-layout"><div class="card-barchart"><div class="card-chart-scale" aria-hidden="true">${[1,.75,.5,.25,0].map(r=>`<span>${e(compact(max*r))}</span>`).join('')}</div><div class="card-chart-scroll" role="region" aria-label="Faturas registradas; selecione uma barra para abrir a fatura" tabindex="0"><div class="card-chart-bars" style="--card-months:${months.length}">${bars}</div></div></div><div class="card-chart-legend"><span><i class="card-legend-current"></i>Atual</span><span><i class="card-legend-other"></i>Outros meses</span></div></div>`;

 }
 function purchaseRow(row){
  const p=row.ff2_card_purchases||{},count=Number(p.installment_count)||1;
  return `<button type="button" class="card-purchase-row" data-card-purchase="${e(row.purchase_id)}">${categoryTile(p.category||'Outros')}<span class="card-row-copy"><strong>${e(p.description||'Compra no cartão')}</strong><small>${e(p.category||'Outros')} · ${count===1?'À vista':`${Number(row.installment_no)} de ${count}`}</small></span><strong class="card-row-amount">${e(formatBRL(row.amount))}</strong><span class="card-row-arrow" aria-hidden="true">›</span></button>`;
 }
 function purchaseHistory(card){
  const rows=invoices(card).slice().reverse().flatMap(inv=>inv.rows.filter(row=>row.ff2_card_purchases?.record_kind!=='invoice_opening').sort((a,b)=>String(b.ff2_card_purchases?.purchase_date||'').localeCompare(String(a.ff2_card_purchases?.purchase_date||''))||String(b.id).localeCompare(String(a.id))).map(row=>({inv,row})));
  return pagedList(`card-purchases:${card.id}`,rows,({inv,row},i,visibleIndex)=>`<div class="card-purchase-group">${visibleIndex===0||rows[i-1].inv.invoiceMonth!==inv.invoiceMonth?`<h4>${e(monthLabel(cardDate(inv.invoiceMonth)))}</h4>`:''}${purchaseRow(row)}</div>`,{label:'compras e parcelas',empty:empty('Nenhuma compra cadastrada neste cartão.')});
 }

 function render(){
  const previousScroll=document.querySelector('.card-chart-scroll')?.scrollLeft||0;
  const current=cardMonth();
  document.getElementById('cards-list').innerHTML=state().cards.length?state().cards.map(card=>{const inv=invoices(card).find(item=>item.invoiceMonth===current);return `<button type="button" class="card-entry" data-card-open="${e(card.id)}"><span class="card-entry-head"><span class="card-entry-icon" aria-hidden="true">${icon('card')}</span><strong>${e(card.name)}</strong><span class="card-entry-arrow" aria-hidden="true">›</span></span><span class="card-entry-invoice"><small>Fatura atual</small><strong>${e(formatBRL(inv?.total||0))}</strong></span></button>`}).join(''):`<div class="card-empty-state">${icon('card')}<p>Nenhum cartão cadastrado.</p><button type="button" class="secondary-btn" data-card-create>Adicionar primeiro cartão</button></div>`;
  const card=findCard(selectedCardId);if(!card)selectedCardId=null;
  document.getElementById('cards-overview').classList.toggle('hidden',!!card);
  document.getElementById('card-detail').classList.toggle('hidden',!card);
  if(!card)return;
  const items=invoices(card),limit=cardLimitSummary(card,items),currentInvoice=items.find(inv=>inv.invoiceMonth===current);
  document.getElementById('card-detail-name').textContent=card.name;
  document.getElementById('card-detail-content').innerHTML=`<section class="card-current-section card-focus-panel" aria-labelledby="card-current-title">
  <div class="card-focus-heading"><h3 id="card-current-title">Fatura atual <span>${e(monthLabel(cardDate(current)))}</span></h3>${statusBadge(currentInvoice)}</div>
  <div class="card-current-value"><small>Total da fatura</small><strong>${e(formatBRL(currentInvoice.total))}</strong></div>
  <div class="card-focus-facts"><span>${icon('calendar')}Vence ${formatDate(currentInvoice.dueOn)}</span>${currentInvoice.paidAmount>0?`<span>Pago <b class="positive">${e(formatBRL(currentInvoice.paidAmount))}</b></span><span>Falta pagar <b>${e(formatBRL(currentInvoice.balanceDue))}</b></span>`:''}</div>
  <div class="card-focus-actions"><button type="button" class="primary-compact card-current-invoice" data-card-invoice="${e(card.id)}" data-card-month="${current}">Ver fatura <span aria-hidden="true">›</span></button><button type="button" class="secondary-btn" data-card-new-purchase>＋ Nova compra</button></div></section>
  <section class="card-limit-panel card-limit-compact" aria-labelledby="card-limit-title"><div class="card-limit-top"><h3 id="card-limit-title">Limite disponível</h3><strong class="card-available ${limit.available<0?'negative':''}">${e(formatBRL(limit.available))}</strong></div><div class="card-limit-bar" role="meter" aria-label="Utilização do limite" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(limit.utilization)}" aria-valuetext="${e(formatBRL(limit.committed))} comprometidos de ${e(formatBRL(limit.total))}"><span style="width:${limit.utilization.toFixed(2)}%"></span></div><div class="card-limit-meta"><span>Em uso <b>${e(formatBRL(limit.committed))}</b></span><span>Total <b>${e(formatBRL(limit.total))}</b></span></div></section>
  <section class="card-chart-section" aria-labelledby="card-chart-title"><div class="card-section-heading"><h3 id="card-chart-title">Faturas por mês</h3><div class="card-chart-controls"><button type="button" class="card-history-link" data-card-invoice-history>${icon('clock')}<span>Histórico</span><span aria-hidden="true">›</span></button><label class="card-chart-period-label"><span class="sr-only">Período do gráfico</span><select data-card-chart-period aria-label="Período do gráfico"><option value="all" ${chartPeriod==='all'?'selected':''}>Todos os meses</option><option value="6" ${chartPeriod==='6'?'selected':''}>Últimos 6 meses</option><option value="12" ${chartPeriod==='12'?'selected':''}>Últimos 12 meses</option><option value="future" ${chartPeriod==='future'?'selected':''}>Faturas futuras</option></select></label></div></div>${chart(card,items)}</section>
  <details class="card-history-section card-purchase-history"><summary><span>Compras deste cartão</span><span aria-hidden="true">⌄</span></summary>${purchaseHistory(card)}</details>`;

  wireCardTotals(card,limit,currentInvoice);
  const scroll=document.querySelector('.card-chart-scroll');
  if(scroll){const currentBar=scroll.querySelector('.current');scroll.scrollLeft=lastRenderedCardId===card.id?previousScroll:currentBar?Math.max(0,currentBar.offsetLeft-scroll.clientWidth/2+currentBar.clientWidth/2):0;}
  lastRenderedCardId=card.id;
  if(historyCardId&&document.getElementById('card-invoice-history-dialog').open)renderInvoiceHistory();
  if(activeInvoice&&document.getElementById('invoice-dialog').open&&!paying)renderInvoice();
 }
 function renderInvoiceHistory(){
  const card=findCard(historyCardId);if(!card){closeDialog('card-invoice-history-dialog');historyCardId=null;return;}
  const list=document.getElementById('card-invoice-history-list'),scroll=list.scrollTop;
  const focused=document.activeElement?.closest('.card-invoice-history-row')?.dataset.cardMonth;
  document.getElementById('card-invoice-history-card').textContent=card.name;
  const current=cardMonth(),items=invoices(card).slice().reverse().filter(inv=>historyFilter==='all'||historyFilter==='past'&&inv.invoiceMonth<current||historyFilter==='current'&&inv.invoiceMonth===current||historyFilter==='future'&&inv.invoiceMonth>current);
  document.querySelectorAll('[data-card-history-filter]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.cardHistoryFilter===historyFilter));});
  document.getElementById('card-history-result').textContent=`${items.length} ${items.length===1?'fatura':'faturas'}`;
  list.innerHTML=pagedList(`invoice-history:${card.id}`,items,inv=>`<button type="button" class="card-invoice-history-row ${inv.invoiceMonth===current?'is-current':''}" data-card-invoice="${e(card.id)}" data-card-month="${inv.invoiceMonth}"><span class="card-history-month-tile" aria-hidden="true"><span>${e(new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(cardDate(inv.invoiceMonth)).replace('.',''))}</span><strong>${inv.invoiceMonth.slice(0,4)}</strong></span><span class="card-row-copy"><strong>${e(monthLabel(cardDate(inv.invoiceMonth)))}</strong><small>Vencimento ${formatDate(inv.dueOn)}${inv.invoiceMonth===current?' · Mês atual':''}</small>${statusBadge(inv)}</span><span class="card-invoice-history-value"><strong>${e(formatBRL(inv.total))}</strong>${inv.paidAmount>0&&inv.balanceDue>0?`<small>Falta ${e(formatBRL(inv.balanceDue))}</small>`:''}</span><span class="card-row-arrow" aria-hidden="true">›</span></button>`,{context:historyFilter,label:'faturas'})||empty('Nenhuma fatura registrada neste cartão.');
  list.scrollTop=scroll;
  if(focused)list.querySelector(`[data-card-month="${focused}"]`)?.focus({preventScroll:true});
 }
 function openInvoiceHistory(filter='all'){
  if(!findCard(selectedCardId))return;
  historyFilter=filter;historyCardId=selectedCardId;renderInvoiceHistory();
  document.getElementById('card-invoice-history-list').scrollTop=0;
  openDialog('card-invoice-history-dialog');
 }
 function openCard(id){if(!findCard(id))return;if(selectedCardId!==id)chartPeriod='all';selectedCardId=id;render();document.getElementById('card-detail-name').focus();}
 function openInvoice(cardId,key=cardMonth()){
  if(!selectedInvoice(cardId,key))return;
  if(!document.getElementById('invoice-dialog').open)invoiceOpener=document.activeElement;
  const history=document.getElementById('card-invoice-history-dialog');
  if(history.open){returnToHistory=true;history.dataset.invoiceSuspended='true';history.close();}
  else if(!document.getElementById('invoice-dialog').open)returnToHistory=false;
  activeInvoice={cardId,key};invoiceTab='purchases';invoicePages={purchases:0,payments:0,adjustments:0};editingPurchases=false;
  renderInvoice();openDialog('invoice-dialog');document.getElementById('invoice-title').tabIndex=-1;document.getElementById('invoice-title').focus({preventScroll:true});
 }
 function openInvoiceById(id){const stored=state().invoiceStatuses.find(inv=>inv.id===id);if(stored){openCard(stored.card_id);openInvoice(stored.card_id,stored.invoice_month)}else if(findCard(id)){openCard(id);openInvoice(id)}}
 async function locateInvoiceItem(cardId,key,installmentId,purchaseId){
  openInvoice(cardId,key);
  const inv=selectedInvoice(cardId,key);if(!inv)return;
  const rows=invoiceWorkspaceModel(inv,state().cardAdjustments,state().cardPayments).purchases,index=rows.findIndex(row=>row.source?.id===installmentId);
  if(index<0)return;invoicePages.purchases=Math.floor(index/4);renderInvoice();
  const target=[...document.querySelectorAll('#invoice-records [data-card-purchase]')].find(el=>el.dataset.cardPurchase===purchaseId);
  if(target){target.classList.add('total-detail-highlight');target.focus({preventScroll:true});}
 }
 function invoiceRow(row,inv){
  const source=row.source;
  if(row.kind==='purchase'&&source){
   const purchase=source.ff2_card_purchases||{},count=Number(purchase.installment_count)||1;
   return `<button type="button" class="card-purchase-row ${editingPurchases?'invoice-purchase-editable':''}" aria-label="${e((editingPurchases?'Editar ':'Consultar ')+(purchase.description||row.label))}" data-invoice-row="${e(row.id)}" ${editingPurchases?'data-card-edit-purchase':'data-card-purchase'}="${e(source.purchase_id)}">${categoryTile(purchase.category||'Outros')}<span class="card-row-copy"><strong>${e(purchase.description||row.label)}</strong><small>${e(purchase.category||'Outros')} · ${count===1?'À vista':`${Number(source.installment_no)} de ${count}`}${Number(source.legacy_covered_amount)?' · Conciliado':''}</small></span><strong class="card-row-amount ${row.amount<0?'negative':''}">${e(formatBRL(row.amount))}</strong><span class="card-row-arrow" aria-hidden="true">${editingPurchases?icon('pencil'):'›'}</span></button>`;
  }
  if(row.kind==='payment'){
   const reversed=!!source?.reversed_at;
   const options=source?`${source.transaction_id?`<button type="button" class="card-history-link" data-card-linked-transaction="${e(source.transaction_id)}">Ver lançamento</button>`:''}${source.reversal_transaction_id?`<button type="button" class="card-history-link" data-card-linked-transaction="${e(source.reversal_transaction_id)}">Ver devolução</button>`:''}${!reversed?`<button type="button" class="card-history-link" data-card-reverse="${e(source.id)}">Corrigir pagamento</button>`:''}`:'';
   return `<div class="invoice-entry" data-invoice-row="${e(row.id)}">${icon('card')}<span><strong>${e(row.label)}</strong><small>${source?formatDate(source.paid_on):e(row.meta)}${reversed?' · Revertido':''}${source?.difference_kind==='charges'?' · Inclui '+e(formatBRL(source.difference_amount))+' em encargos':source?.difference_kind==='credit'?' · Crédito: '+e(formatBRL(source.difference_amount)):''}</small></span><b class="${reversed?'muted':'positive'}">${e(formatBRL(source?.amount??row.amount))}</b>${options?`<details class="invoice-row-options"><summary aria-label="Ações do pagamento">•••</summary><div>${reversed&&source.reversal_reason?`<p>${e(source.reversal_reason)}</p>`:''}${options}</div></details>`:''}</div>`;
  }
  if(row.kind==='adjustment'&&source){
   return `<div class="invoice-entry" data-invoice-row="${e(row.id)}">${icon('receipt')}<span><strong>${e(cardAdjustmentLabel(source.kind))}</strong><small title="${e(source.reason||'')}">${!row.amount?'Sem efeito na fatura · ':''}${formatDate(source.occurred_on)} · ${e(source.reason||row.meta)}</small></span><b class="${row.amount<0?'negative':''}">${e(formatBRL(row.amount||source.amount))}</b>${adjustmentsUI.adjustmentActions(source,inv)}</div>`;
  }
  const tag=row.kind==='opening'&&canEditInvoice(inv)?'button':'div';
  return `<${tag} ${tag==='button'?'type="button" data-card-edit-invoice':''} class="invoice-entry invoice-history-entry" data-invoice-row="${e(row.id)}">${icon('receipt')}<span><strong>${e(row.label)}</strong><small title="${e(row.meta)}">${e(row.meta)}</small></span><b class="${row.amount<0?'negative':''}">${e(formatBRL(row.amount))}</b></${tag}>`;
 }
 function renderInvoice(){
  if(!activeInvoice)return;
  const inv=selectedInvoice(activeInvoice.cardId,activeInvoice.key);if(!inv){closeDialog('invoice-dialog');activeInvoice=null;return;}
  const model=invoiceWorkspaceModel(inv,state().cardAdjustments,state().cardPayments),rows=model[invoiceTab],page=invoiceWorkspacePage(rows,invoicePages[invoiceTab]);
  invoicePages[invoiceTab]=page.page;
  const dialog=document.getElementById('invoice-dialog');dialog.classList.add('unified-invoice-dialog');
  document.getElementById('invoice-title').textContent=monthLabel(cardDate(inv.invoiceMonth));
  document.getElementById('invoice-card-name').textContent=inv.card.name;
  const sourceLabel=model.hasOpening?'Composição':'Compras';
  document.getElementById('invoice-content').innerHTML=`${returnToHistory?'<button type="button" class="card-history-link invoice-history-return" data-card-history-return>‹ Voltar ao histórico</button>':''}<div class="invoice-status">${statusBadge(inv)}<span>Vence ${formatDate(inv.dueOn)}</span></div>
  <section class="invoice-amount"><span>Total da fatura</span><strong>${e(formatBRL(inv.total))}</strong><div class="invoice-facts"><button type="button" data-invoice-tab="payments" aria-label="Consultar pagamentos: ${e(formatBRL(inv.paidAmount))}"><span>Pago</span><b class="positive">${e(formatBRL(inv.paidAmount))}</b></button><div><span>${inv.creditBalance>0?'Crédito disponível':'Falta pagar'}</span><b>${e(formatBRL(inv.creditBalance>0?inv.creditBalance:inv.balanceDue))}</b></div><div><span>Fechamento</span><b>${formatDate(inv.closingOn)}</b></div></div></section>
  <div class="invoice-tabs" role="tablist" aria-label="Registros da fatura">${[['purchases',sourceLabel,model.purchases.length],['payments','Pagamentos',model.payments.length],['adjustments','Ajustes',model.adjustments.length]].map(([key,label,count])=>`<button type="button" id="invoice-tab-${key}" role="tab" aria-selected="${invoiceTab===key}" aria-controls="invoice-records" tabindex="${invoiceTab===key?0:-1}" data-invoice-tab="${key}">${e(label)}<span>${count}</span></button>`).join('')}</div>
  <section class="invoice-list" id="invoice-records" role="tabpanel" aria-labelledby="invoice-tab-${invoiceTab}" tabindex="-1">${page.rows.map(row=>invoiceRow(row,inv)).join('')||empty('Nenhum registro nesta aba.')}</section>
  ${page.pages>1?`<nav class="invoice-pages" aria-label="Paginação dos registros"><button type="button" data-invoice-page="-1" ${page.page===0?'disabled':''}>‹ Anterior</button><span id="invoice-page-status" tabindex="-1" role="status" aria-live="polite">Página ${page.page+1} de ${page.pages}</span><button type="button" data-invoice-page="1" ${page.page===page.pages-1?'disabled':''}>Próxima ›</button></nav>`:''}
  ${invoiceTab==='purchases'?`<div class="invoice-breakdown"><span>${model.hasOpening?'Base registrada':'Compras'} <b>${e(formatBRL(model.base))}</b></span><button type="button" data-invoice-tab="adjustments">Ajustes <b>${e(formatBRL(model.adjustmentsTotal))}</b></button></div>`:invoiceTab==='payments'?`<div class="invoice-breakdown"><span>Total pago <b>${e(formatBRL(model.paidTotal))}</b></span></div>`:`<div class="invoice-breakdown"><span>Efeito na fatura <b>${e(formatBRL(model.adjustmentsTotal))}</b></span></div>`}
  ${invoiceTab==='adjustments'?adjustmentsUI.invoiceNotes(inv):''}
  <footer class="invoice-actions">${invoiceTab==='adjustments'&&!inv.settledAt?'<button type="button" class="secondary-btn" data-card-new-adjustment>＋ Registrar ajuste</button>':canEditInvoice(inv)?`<button type="button" class="secondary-btn" data-card-edit-invoice>${icon('pencil')}Editar fatura</button>`:model.purchases.some(row=>row.kind==='purchase')?`<button type="button" class="secondary-btn" data-card-edit-purchases aria-pressed="${editingPurchases}">${icon('pencil')}${editingPurchases?'Cancelar seleção':'Editar compras'}</button>`:`<button type="button" class="secondary-btn" data-invoice-tab="adjustments">Ver ajustes</button>`}${inv.balanceDue>0?'<button type="button" class="primary-compact" data-card-pay>Registrar pagamento</button>':'<button class="secondary-btn" type="button" data-close-dialog="invoice-dialog">Fechar</button>'}</footer>`;
 }
 function setInvoiceTab(tab,{focus=true}={}){
  if(!['purchases','payments','adjustments'].includes(tab))return;
  invoiceTab=tab;renderInvoice();
  if(focus)document.getElementById('invoice-tab-'+tab)?.focus({preventScroll:true});
 }
 function changeInvoicePage(delta){
  invoicePages[invoiceTab]+=delta;renderInvoice();document.getElementById('invoice-page-status')?.focus({preventScroll:true});
 }
 function wireCardTotals(card,limit){
  if(totalDetails)for(const [selector,field]of [['.card-available','available'],['.card-limit-meta>span:first-child>b','committed']])totalDetails.attach(document.querySelector(selector),'card:'+card.id+':'+field,()=>{const latest=findCard(card.id);if(!latest)return null;const items=invoices(latest);return limitComposition(latest,items,cardLimitSummary(latest,items),field)},field==='available'?'Limite disponível':'Limite comprometido');
  const value=document.querySelector('.card-current-value>strong');if(!value)return;
  value.classList.add('total-detail-trigger');value.setAttribute('role','button');value.tabIndex=0;value.setAttribute('aria-haspopup','dialog');value.setAttribute('aria-controls','invoice-dialog');value.title='Consultar fatura';value.setAttribute('aria-label','Consultar fatura do mês: '+value.textContent.trim());
  value.addEventListener('click',()=>openInvoice(card.id));value.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();openInvoice(card.id);}});
 }
 async function openPurchase(id){
  if(!onLoadPurchase)return;
  const purchase=await onOperation('Carregando compra…','Buscando os dados da compra selecionada.',()=>onLoadPurchase(id));
  if(!purchase)return;
  activePurchase=id;
  const card=findCard(purchase.card_id);const rows=state().installments.filter(row=>!row.card_adjustment&&row.purchase_id===id).sort((a,b)=>a.installment_no-b.installment_no);
  const locked=rows.some(row=>{const inv=selectedInvoice(purchase.card_id,row.invoice_month);return inv?.paidAmount>0||inv?.settledAt})||state().cardAdjustments.some(a=>a.purchase_id===id)||state().cardReconciliations.some(r=>rows.some(row=>row.id===r.installment_id))||purchase.record_kind==='invoice_opening';
  document.getElementById('card-purchase-title').textContent=purchase.description;
  document.getElementById('card-purchase-detail').innerHTML=`<dl class="card-purchase-facts"><div><dt>Cartão</dt><dd>${e(card?.name||purchase.ff2_cards?.name||'Cartão')}</dd></div><div><dt>Data original</dt><dd>${formatDate(purchase.purchase_date)}</dd></div><div><dt>Valor total</dt><dd>${e(formatBRL(purchase.total_amount))}</dd></div><div><dt>Categoria</dt><dd>${e(purchase.category||'Outros')}</dd></div><div><dt>Parcelamento</dt><dd>${Number(purchase.installment_count)===1?'À vista':`${Number(purchase.installment_count)} parcelas`}</dd></div></dl><h4>Parcelas e faturas</h4><div class="card-purchase-invoices">${pagedList(`purchase-installments:${purchase.id}`,rows,row=>`<button type="button" class="card-related-invoice" data-card-related-invoice="${e(purchase.card_id)}" data-card-month="${row.invoice_month}"><span>${e(shortMonth(row.invoice_month))} · ${row.installment_no} de ${purchase.installment_count}</span><strong>${e(formatBRL(row.amount))}</strong><span aria-hidden="true">›</span></button>`,{context:'',label:'parcelas'})}</div>${locked?'<p class="card-lock-note">O histórico financeiro desta compra está protegido. Descrição e categoria podem ser corrigidas; valores exigem ajuste ou estorno separado.</p>':''}`;
  document.getElementById('card-purchase-edit').disabled=purchase.record_kind==='invoice_opening';document.getElementById('card-purchase-delete').disabled=locked;
  document.getElementById('card-purchase-refund').disabled=purchase.record_kind==='invoice_opening';
  openDialog('card-purchase-dialog');
 }
 function paymentFieldsChanged({keepNegative=false}={}){
  if(!keepNegative){negativeApproved=false;document.getElementById('card-payment-warning').classList.add('hidden');setFormError('card-payment-error','');}
  const inv=activeInvoice&&selectedInvoice(activeInvoice.cardId,activeInvoice.key);if(!inv)return;
  const amount=moneyValue('card-payment-amount'),paidCents=Math.round(amount*100),dueCents=Math.round(inv.balanceDue*100),partial=document.getElementById('card-payment-mode').value==='partial';
  const mismatch=amount>0&&(partial?paidCents>=dueCents:paidCents<dueCents);
  const notice=document.getElementById('card-payment-type-notice'),fix=document.getElementById('card-payment-type-fix');notice.classList.toggle('hidden',!mismatch);
  if(mismatch){document.getElementById('card-payment-type-message').textContent=partial?'Este valor quita o saldo pendente.':'O valor informado é menor que o saldo pendente.';fix.dataset.mode=partial?'full':'partial';fix.textContent=partial?'Registrar como integral':'Registrar como parcial';}
  const difference=(paidCents-dueCents)/100,kind=document.getElementById('card-payment-difference-kind');
  document.getElementById('card-payment-difference').classList.toggle('hidden',difference<=0);kind.required=difference>0;kind.disabled=difference<=0||paying;
  if(difference>0)document.getElementById('card-payment-difference-value').textContent='Diferença: +'+formatBRL(difference);
  document.getElementById('card-payment-difference-help').textContent=kind.value==='charges'?'Registre somente encargos já cobrados pelo emissor nesta quitação. Encargos cobrados em outra fatura ficam naquela competência.':kind.value==='credit'?'O valor excedente fica identificado como crédito no cartão. A aplicação em outra fatura depende da confirmação do emissor.':'';
  const date=document.getElementById('card-payment-date').value||cardToday();document.getElementById('card-payment-date-hint').textContent=(date===cardToday()?'Hoje — ':'')+formatDate(date);document.getElementById('card-payment-date-display').textContent=document.getElementById('card-payment-date-hint').textContent;
  const button=document.getElementById('card-payment-save');button.disabled=paying||!Number.isFinite(amount)||amount<=0||mismatch||difference>0&&!['charges','credit'].includes(kind.value);button.textContent=paying?'Registrando…':negativeApproved?'Confirmar mesmo assim':'Confirmar pagamento';
 }
 function openPayment(){
  const inv=activeInvoice&&selectedInvoice(activeInvoice.cardId,activeInvoice.key);if(!inv||inv.balanceDue<=0)return;
  const form=document.getElementById('card-payment-form');form.reset();clearFormOperation(form);
  document.getElementById('card-payment-title').textContent='Registrar pagamento';document.getElementById('card-payment-origin').textContent=inv.card.name+' · '+monthLabel(cardDate(inv.invoiceMonth));
  document.getElementById('card-payment-due').value=formatBRL(inv.balanceDue);
  const date=document.getElementById('card-payment-date');date.max=cardToday();date.value=cardToday();
  document.getElementById('card-payment-amount').removeAttribute('max');setMoney('card-payment-amount','');paymentFieldsChanged();openDialog('card-payment-dialog');
 }

 function showNegative(before,amount,after){
  document.getElementById('card-payment-warning').innerHTML=`<strong>O pagamento ultrapassa seu saldo disponível.</strong><dl><div><dt>Saldo disponível</dt><dd>${e(formatBRL(before))}</dd></div><div><dt>Pagamento</dt><dd>${e(formatBRL(amount))}</dd></div><div><dt>Saldo após pagamento</dt><dd>${e(formatBRL(after))}</dd></div></dl><p>Você pode confirmar para continuar com saldo negativo.</p>`;
  document.getElementById('card-payment-warning').classList.remove('hidden');document.getElementById('card-payment-save').textContent='Confirmar mesmo assim';negativeApproved=true;
 }
 function setPaymentBusy(busy){paying=busy;document.querySelectorAll('#card-payment-dialog button,#card-payment-dialog input,#card-payment-dialog select').forEach(el=>{el.disabled=busy});paymentFieldsChanged({keepNegative:true});}
 async function submitPayment(event){
  event.preventDefault();if(paying)return;
  const inv=activeInvoice&&selectedInvoice(activeInvoice.cardId,activeInvoice.key);if(!inv)return;
  const form=event.currentTarget,mode=document.getElementById('card-payment-mode').value,date=document.getElementById('card-payment-date').value||cardToday(),amount=moneyValue('card-payment-amount'),delta=Math.round((amount-inv.balanceDue)*100)/100;
  if(!date||date>cardToday()){setFormError('card-payment-error','Informe uma data de pagamento até hoje.');return;}
  if(!Number.isFinite(amount)||amount<=0){setFormError('card-payment-error','Informe quanto foi pago.');return;}
  if(mode==='partial'&&delta>=0||mode==='full'&&delta<0){paymentFieldsChanged();return;}
  const differenceKind=delta>0?document.getElementById('card-payment-difference-kind').value:'none';
  if(delta>0&&!['charges','credit'].includes(differenceKind)){setFormError('card-payment-error','Identifique o motivo da diferença.');return;}
  const balance=calculateCashStats(state().transactions).balance;
  if(balance-amount<0&&!negativeApproved){showNegative(balance,amount,balance-amount);return;}
  const input={cardId:inv.card.id,month:inv.invoiceMonth,date,amount,mode,expectedDue:inv.balanceDue,differenceKind,allowNegative:negativeApproved};input.operation=formOperation(form,input);
  setPaymentBusy(true);setFormError('card-payment-error','');
  try{await onOperation('Registrando pagamento…','Atualizando fatura, valor pago e diferença juntos.',async()=>{await payCardInvoice(input);await onRefresh();},{animateDashboard:true});closeDialog('card-payment-dialog');clearFormOperation(form);render();renderInvoice();toast('Pagamento registrado.','success');}
  catch(error){if(error.message==='NEGATIVE_BALANCE_CONFIRMATION'){try{const detail=JSON.parse(error.details||error.detail);showNegative(detail.before,detail.payment,detail.after)}catch{showNegative(balance,amount,balance-amount)}}else setFormError('card-payment-error',cardErrorMessage(error));}
  finally{setPaymentBusy(false);}
 }

 async function submitReversal(event){
  event.preventDefault();if(paying)return;
  const id=document.getElementById('card-reversal-id').value,reason=document.getElementById('card-reversal-reason').value.trim();if(reason.length<3){setFormError('card-reversal-error','Informe o motivo da correção.');return;}
  const button=document.getElementById('card-reversal-save');paying=true;button.disabled=true;
  try{await onOperation('Revertendo pagamento…','Preservando o pagamento original e registrando a correção.',async()=>{await reverseCardPayment(id,reason);await onRefresh();},{animateDashboard:true});closeDialog('card-reversal-dialog');render();renderInvoice();toast('Pagamento revertido.','success')}
  catch(error){setFormError('card-reversal-error',cardErrorMessage(error))}
  finally{paying=false;button.disabled=false}
 }
 document.addEventListener('click',async event=>{
  const entry=event.target.closest('[data-module],[data-go-module],[data-mobile-go]');
  if((entry?.dataset.module||entry?.dataset.goModule||entry?.dataset.mobileGo)==='cards'){selectedCardId=null;activeInvoice=null;lastRenderedCardId=null;render();}
  const button=event.target.closest('button');if(!button||paying||adjustmentsUI.isBusy())return;
  try{
   if(button.dataset.cardOpen)return openCard(button.dataset.cardOpen);
   if(button.hasAttribute('data-card-back')){selectedCardId=null;render();document.querySelector('[data-card-open]')?.focus();return;}
   if(button.hasAttribute('data-card-create'))return document.getElementById('new-card-btn').click();
   if(button.hasAttribute('data-card-new-purchase'))return onNewPurchase(selectedCardId);
   if(button.hasAttribute('data-card-settings'))return onEditCard(selectedCardId);
   if(button.dataset.cardHistoryFilter){historyFilter=button.dataset.cardHistoryFilter;document.getElementById('card-invoice-history-list').scrollTop=0;return renderInvoiceHistory();}
   if(button.dataset.invoiceTab){editingPurchases=false;return setInvoiceTab(button.dataset.invoiceTab);}
   if(button.dataset.invoicePage)return changeInvoicePage(Number(button.dataset.invoicePage));
   if(button.hasAttribute('data-card-edit-purchases')){
    const inv=activeInvoice&&selectedInvoice(activeInvoice.cardId,activeInvoice.key);if(!inv)return;
    const rows=invoiceWorkspaceModel(inv,state().cardAdjustments,state().cardPayments).purchases.filter(row=>row.kind==='purchase');
    const ids=[...new Set(rows.map(row=>row.source.purchase_id))];
    if(ids.length===1)return await onEditPurchase(ids[0]);
    invoiceTab='purchases';editingPurchases=!editingPurchases;renderInvoice();
    if(editingPurchases){toast('Selecione a compra que deseja editar.');document.querySelector('#invoice-records [data-card-edit-purchase]')?.focus({preventScroll:true});}return;
   }
   if(button.dataset.cardEditPurchase)return await onEditPurchase(button.dataset.cardEditPurchase);
   if(button.hasAttribute('data-card-invoice-history'))return openInvoiceHistory();
   if(button.hasAttribute('data-card-history-return'))return closeDialog('invoice-dialog');
   if(button.dataset.cardInvoice)return openInvoice(button.dataset.cardInvoice,button.dataset.cardMonth);
   if(button.dataset.cardRelatedInvoice){closeDialog('card-purchase-dialog');return openInvoice(button.dataset.cardRelatedInvoice,button.dataset.cardMonth);}
   if(button.dataset.cardPurchase)return await openPurchase(button.dataset.cardPurchase);
   if(button.hasAttribute('data-card-new-adjustment'))return adjustmentsUI.openAdjustment(selectedInvoice(activeInvoice.cardId,activeInvoice.key));
   if(button.hasAttribute('data-card-edit-invoice')&&!canEditInvoice(selectedInvoice(activeInvoice.cardId,activeInvoice.key)))return;
   if(button.hasAttribute('data-card-edit-invoice'))return adjustmentsUI.openAdjustment(selectedInvoice(activeInvoice.cardId,activeInvoice.key),null,null,'invoice_total');
   if(button.hasAttribute('data-card-conciliate'))return adjustmentsUI.openReconciliation(selectedInvoice(activeInvoice.cardId,activeInvoice.key));
   if(button.id==='card-purchase-refund')return adjustmentsUI.openAdjustment(null,state().purchases.find(p=>p.id===activePurchase));
   if(button.hasAttribute('data-card-pay'))return openPayment();
   if(button.dataset.cardReverse){document.getElementById('card-reversal-form').reset();document.getElementById('card-reversal-id').value=button.dataset.cardReverse;setFormError('card-reversal-error','');return openDialog('card-reversal-dialog');}
   if(button.id==='card-purchase-edit'){closeDialog('card-purchase-dialog');return await onEditPurchase(activePurchase);}
   if(button.id==='card-purchase-delete'){if(!confirm('Excluir esta compra e suas parcelas? O registro da exclusão será preservado.'))return;await onCancelPurchase(activePurchase);closeDialog('card-purchase-dialog');render();return;}
   if(button.id==='card-archive-btn'){const id=document.getElementById('card-id').value;if(!id||!confirm('Arquivar este cartão? O histórico será preservado. É necessário quitar todas as faturas.'))return;await onOperation('Arquivando cartão…','Preservando compras e pagamentos anteriores.',async()=>{await deleteCard(id);closeDialog('card-dialog');await onRefresh();});render();toast('Cartão arquivado.','success');}
  }catch(error){console.error(error);showCardError(error);}
 });
 document.addEventListener('change',event=>{if(event.target.matches('[data-card-chart-period]')){chartPeriod=event.target.value;render();document.querySelector('[data-card-chart-period]')?.focus();}});
 document.getElementById('invoice-dialog').addEventListener('close',()=>{
  if(document.getElementById('invoice-dialog').dataset.totalDetailSuspended||document.getElementById('invoice-dialog').open)return;
  const history=document.getElementById('card-invoice-history-dialog');
  if(returnToHistory&&!resetting){returnToHistory=false;delete history.dataset.invoiceSuspended;renderInvoiceHistory();openDialog('card-invoice-history-dialog');document.querySelector(`#card-invoice-history-list [data-card-month="${activeInvoice?.key}"]`)?.focus({preventScroll:true});}
  else if(!resetting&&invoiceOpener?.isConnected)invoiceOpener.focus({preventScroll:true});
 });
 document.getElementById('invoice-dialog').addEventListener('cancel',event=>{if(paying||adjustmentsUI.isBusy())event.preventDefault();});
 document.getElementById('invoice-dialog').addEventListener('keydown',event=>{
  if(event.key==='Escape'){
   const menu=document.querySelector('#invoice-dialog .invoice-row-options[open]');
   if(menu){event.preventDefault();menu.open=false;menu.querySelector('summary')?.focus();return;}
  }
  const button=event.target.closest('[role="tab"][data-invoice-tab]');if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const tabs=['purchases','payments','adjustments'],index=tabs.indexOf(invoiceTab);setInvoiceTab(event.key==='Home'?tabs[0]:event.key==='End'?tabs.at(-1):tabs[(index+(event.key==='ArrowRight'?1:2))%3]);
 });
 document.getElementById('invoice-dialog').addEventListener('click',event=>{
  for(const menu of document.querySelectorAll('#invoice-dialog .invoice-row-options[open]'))if(!menu.contains(event.target)||event.target.closest('button'))menu.open=false;
 },true);
 document.getElementById('invoice-dialog').addEventListener('focusin',event=>{
  for(const menu of document.querySelectorAll('#invoice-dialog .invoice-row-options[open]'))if(!menu.contains(event.target))menu.open=false;
 });
 document.getElementById('card-invoice-history-dialog').addEventListener('close',()=>{
  const history=document.getElementById('card-invoice-history-dialog');if(history.dataset.totalDetailSuspended||history.dataset.invoiceSuspended||history.open)return;
  historyCardId=null;if(!resetting)document.querySelector('#card-detail [data-card-invoice-history]')?.focus({preventScroll:true});
 });
 document.getElementById('card-payment-form').addEventListener('submit',submitPayment);
 document.getElementById('card-payment-date-open').addEventListener('click',()=>{const field=document.getElementById('card-payment-date');try{if(field.showPicker)field.showPicker();else{field.focus();field.click();}}catch{field.focus();field.click();}});
 for(const id of ['card-payment-date','card-payment-amount','card-payment-difference-kind'])document.getElementById(id).addEventListener('input',()=>paymentFieldsChanged());
 document.querySelectorAll('[name="card-payment-type"]').forEach(radio=>radio.addEventListener('change',()=>{document.getElementById('card-payment-mode').value=radio.value;paymentFieldsChanged();}));
 document.getElementById('card-payment-type-fix').addEventListener('click',event=>{const mode=event.currentTarget.dataset.mode;document.querySelector(`[name="card-payment-type"][value="${mode}"]`).checked=true;document.getElementById('card-payment-mode').value=mode;paymentFieldsChanged();});
 document.getElementById('card-reversal-form').addEventListener('submit',submitReversal);
 for(const id of ['card-payment-dialog','card-reversal-dialog'])document.getElementById(id).addEventListener('cancel',event=>{if(paying)event.preventDefault()});
 return {render,openInvoice,openInvoiceById,locateInvoiceItem,reset(){resetting=true;returnToHistory=false;invoiceOpener=null;editingPurchases=false;delete document.getElementById('card-invoice-history-dialog').dataset.invoiceSuspended;adjustmentsUI.reset();selectedCardId=null;activeInvoice=null;activePurchase=null;historyCardId=null;for(const id of ['card-invoice-history-dialog','invoice-dialog','card-payment-dialog','card-purchase-dialog','card-reversal-dialog'])closeDialog(id);queueMicrotask(()=>{resetting=false});},isBusy:()=>paying||adjustmentsUI.isBusy()};
}
export function cardErrorMessage(error){
 const messages={PURCHASE_NOT_FOUND:'Esta compra não está disponível ou foi excluída. Atualize a fatura.',AUTH_REQUIRED:'Entre novamente para editar a compra.',SESSION_CHANGED:'Sua sessão mudou. Entre novamente para editar a compra.',SETTLED_INVOICE_IMMUTABLE:'Esta fatura possui histórico quitado e não pode ser reescrita. Registre um ajuste em outra competência.',PURCHASE_HAS_ADJUSTMENTS:'Esta compra possui ajustes ou conciliação. Corrija somente descrição e categoria.',INVOICE_ALREADY_PAID:'Esta fatura já está quitada. Atualize os dados.',INVOICE_HAS_PAYMENTS:'Corrija os pagamentos desta fatura antes de alterar a compra.',PAYMENT_BALANCE_CHANGED:'O saldo da fatura mudou. Feche o pagamento e confira os valores atualizados.',PAYMENT_TYPE_MISMATCH:'Confira se o pagamento é parcial ou integral.',PAYMENT_DIFFERENCE_REQUIRED:'Identifique o motivo da diferença.',INVALID_PAYMENT_AMOUNT:'Informe um valor de pagamento válido.',INVALID_PAYMENT_DATE:'Informe uma data de pagamento até hoje.',CARD_HAS_BALANCE:'Quite todas as faturas antes de arquivar o cartão.',CARD_PAYMENT_LINKED:'Corrija este pagamento nos detalhes da fatura.',RECONCILIATION_LOCKED:'Este registro é um saldo de conciliação e mantém o histórico anterior.',REQUEST_CONFLICT:'Esta operação mudou. Feche o formulário e tente novamente.',INVALID_INSTALLMENTS:'Revise a quantidade de parcelas e o valor da compra.'};
 if(error?.code==='42501')return 'Você não tem acesso para editar esta compra.';
 if(/Failed to fetch|NetworkError|Load failed/i.test(error?.message||''))return 'Não foi possível carregar a compra. Verifique a conexão e tente novamente.';
 return messages[error?.message]||(/^(Revise|Ative|Corrija)/.test(error?.message||'')?error.message:'Não foi possível concluir. Tente novamente.');
}

export function showCardError(error){
 const message=cardErrorMessage(error);
 const parent=document.querySelector('#card-purchase-dialog[open] #card-purchase-detail')||document.querySelector('#invoice-dialog[open] #invoice-content');
 if(!parent){toast(message,'error');return;}
 let alert=parent.querySelector('.card-operation-error');
 if(!alert){alert=document.createElement('p');alert.className='form-error card-operation-error';alert.setAttribute('role','alert');alert.tabIndex=-1;parent.prepend(alert);}
 alert.textContent=message;alert.focus();
}

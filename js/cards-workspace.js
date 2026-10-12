import {initCardAdjustments} from './card-adjustments-workspace.js?v=2.9.20';
import { buildCardInvoices,cardLimitSummary,cardToday,cardMonth,cardDate,invoiceStatusLabel } from './card-domain.js?v=2.9.20';
import { payCardInvoice,reverseCardPayment,deleteCard } from './cards.js?v=2.9.20';
import { formOperation,clearFormOperation } from './request-operation.js?v=2.9.20';
import { calculateCashStats } from './finance.js?v=2.9.20';
import { formatBRL,formatDate,monthLabel,escapeHTML,openDialog,closeDialog,setFormError,toast } from './ui.js?v=2.9.20';
import { categoryIconSVG } from './categories.js?v=2.9.20';
import { canonicalCategoryName } from './category-alias.js?v=2.9.20';
const e=escapeHTML;
const icon=(name)=>`<svg class="ui-icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const shortMonth=key=>new Intl.DateTimeFormat('pt-BR',{month:'short',year:'numeric'}).format(cardDate(key)).replace('.','').replace(' de ','/');
const empty=text=>`<p class="card-empty">${e(text)}</p>`;
export function initCardsWorkspace({getState,onRefresh,onOperation,onNewPurchase,onEditPurchase,onEditCard,onCancelPurchase}){
 let selectedCardId=null,activeInvoice=null,activePurchase=null,paying=false,negativeApproved=false,lastRenderedCardId=null,historyCardId=null,historyFilter='all',chartPeriod='all';
 const adjustmentsUI=initCardAdjustments({getState,onRefresh,onOperation,onInvoiceEdited:result=>{if(activeInvoice)activeInvoice.key=result.invoice_month;}});
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
  const max=Math.max(Number(card.credit_limit)||0,...months.map(inv=>Math.max(0,inv.total)),1),limitPosition=Math.max(0,Math.min(100,Number(card.credit_limit)/max*100));
  const compact=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',notation:'compact',maximumFractionDigits:1}).format(v);
  const bars=months.map(inv=>`<button type="button" class="card-chart-column ${inv.invoiceMonth===cardMonth()?'current':''}" data-card-invoice="${e(card.id)}" data-card-month="${inv.invoiceMonth}" aria-label="${e(monthLabel(cardDate(inv.invoiceMonth)))}: fatura de ${e(formatBRL(inv.total))}, ${e(invoiceStatusLabel(inv.status))}"><span class="card-chart-track"><span class="card-chart-fill" style="height:${Math.max(0,Math.min(100,inv.total/max*100)).toFixed(3)}%"><span class="card-chart-value"><span class="card-chart-value-full">${e(formatBRL(inv.total))}</span><span class="card-chart-value-compact">${e(compact(inv.total))}</span></span></span></span><span class="card-chart-month">${e(shortMonth(inv.invoiceMonth))}</span></button>`).join('');
  return `<div class="card-chart-layout"><div class="card-barchart"><div class="card-chart-scale" aria-hidden="true">${[1,.75,.5,.25,0].map(r=>`<span>${e(compact(max*r))}</span>`).join('')}</div><div class="card-chart-scroll" role="region" aria-label="Faturas registradas; selecione uma barra para abrir a fatura" tabindex="0"><div class="card-chart-bars" style="--card-months:${months.length}"><div class="card-chart-limit" style="bottom:calc(44px + (100% - 66px)*${limitPosition/100})" aria-hidden="true"></div>${bars}</div></div></div><div class="card-chart-legend"><span><i class="card-legend-current"></i>Fatura atual</span><span><i class="card-legend-other"></i>Outras faturas</span><span><i class="card-legend-limit"></i>Limite total (${e(formatBRL(card.credit_limit))})</span></div></div>`;

 }
 function purchaseRow(row){
  const p=row.ff2_card_purchases||{},count=Number(p.installment_count)||1;
  return `<button type="button" class="card-purchase-row" data-card-purchase="${e(row.purchase_id)}">${categoryTile(p.category||'Outros')}<span class="card-row-copy"><strong>${e(p.description||'Compra no cartão')}</strong><small>${e(p.category||'Outros')} · ${count===1?'À vista':`${Number(row.installment_no)} de ${count}`}</small></span><strong class="card-row-amount">${e(formatBRL(row.amount))}</strong><span class="card-row-arrow" aria-hidden="true">›</span></button>`;
 }
 function purchaseHistory(card){
  const groups=invoices(card).slice().reverse().map(inv=>({inv,rows:inv.rows.filter(row=>row.ff2_card_purchases?.record_kind!=='invoice_opening')})).filter(group=>group.rows.length);
  return groups.length?groups.map(({inv,rows})=>`<div class="card-purchase-group"><h4>${e(monthLabel(cardDate(inv.invoiceMonth)))}</h4>${rows.slice().sort((a,b)=>String(b.ff2_card_purchases?.purchase_date||'').localeCompare(String(a.ff2_card_purchases?.purchase_date||''))||String(a.id).localeCompare(String(b.id))).map(purchaseRow).join('')}</div>`).join(''):empty('Nenhuma compra cadastrada neste cartão.');
 }
 function render(){
  const previousScroll=document.querySelector('.card-chart-scroll')?.scrollLeft||0;
  const current=cardMonth();
  document.getElementById('cards-list').innerHTML=state().cards.length?state().cards.map(card=>{const inv=invoices(card).find(item=>item.invoiceMonth===current);return `<button type="button" class="card-entry" data-card-open="${e(card.id)}">${icon('card')}<span><strong>${e(card.name)}</strong><small>Fatura atual · ${e(formatBRL(inv?.total||0))}</small></span><span class="card-entry-arrow" aria-hidden="true">›</span></button>`}).join(''):`<div class="card-empty-state">${icon('card')}<p>Nenhum cartão cadastrado.</p><button type="button" class="secondary-btn" data-card-create>Adicionar primeiro cartão</button></div>`;
  const card=findCard(selectedCardId);if(!card)selectedCardId=null;
  document.getElementById('cards-overview').classList.toggle('hidden',!!card);
  document.getElementById('card-detail').classList.toggle('hidden',!card);
  if(!card)return;
  const items=invoices(card),limit=cardLimitSummary(card,items),currentInvoice=items.find(inv=>inv.invoiceMonth===current);
  document.getElementById('card-detail-name').textContent=card.name;
  const recent=items.filter(i=>i.invoiceMonth<=current&&(i.rows.length||i.total!==0||i.paidAmount>0||i.invoiceMonth===current)).slice(-3).reverse();
  document.getElementById('card-detail-content').innerHTML=`<section class="card-limit-panel" aria-labelledby="card-limit-title"><h3 id="card-limit-title">Limite disponível</h3><strong class="card-available ${limit.available<0?'negative':''}">${e(formatBRL(limit.available))}</strong><div class="card-limit-meta"><span>Comprometido <b>${e(formatBRL(limit.committed))} · ${limit.utilization.toFixed(1).replace('.',',')}% do limite</b></span><span>Limite total <b>${e(formatBRL(limit.total))}</b></span></div><div class="card-limit-bar" role="meter" aria-label="Utilização do limite" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(limit.utilization)}" aria-valuetext="${e(formatBRL(limit.committed))} comprometidos de ${e(formatBRL(limit.total))}"><span style="width:${limit.utilization.toFixed(2)}%"></span></div></section>
  <section class="card-current-section" aria-labelledby="card-current-title"><div class="card-current-main"><div class="card-current-copy">${icon('receipt')}<div><h3 id="card-current-title">Fatura do mês atual</h3><strong>${e(monthLabel(cardDate(current)))}</strong><small>Vencimento ${formatDate(currentInvoice.dueOn)}</small>${statusBadge(currentInvoice)}</div></div><div class="card-current-value"><small>Valor da fatura</small><strong>${e(formatBRL(currentInvoice.total))}</strong>${currentInvoice.paidAmount>0&&currentInvoice.balanceDue>0?`<small>Falta ${e(formatBRL(currentInvoice.balanceDue))}</small>`:''}<button type="button" class="primary-compact card-current-invoice" data-card-invoice="${e(card.id)}" data-card-month="${current}">Ver fatura <span aria-hidden="true">›</span></button></div></div><div class="card-current-actions"><button type="button" class="card-quick-action" data-card-invoice-history aria-haspopup="dialog" aria-controls="card-invoice-history-dialog">${icon('receipt')}<span>Histórico de faturas</span><b aria-hidden="true">›</b></button><button type="button" class="card-quick-action" data-card-current-details>${icon('analytics')}<span>Detalhes da fatura</span><b aria-hidden="true">›</b></button><button type="button" class="card-quick-action" data-card-future-invoices>${icon('calendar')}<span>Próximas faturas</span><b aria-hidden="true">›</b></button>${canEditInvoice(currentInvoice)?`<button type="button" class="card-quick-action card-edit-shortcut" data-card-current-edit>${icon('pencil')}<span>Editar fatura</span><b aria-hidden="true">›</b></button>`:''}</div></section>
  <section class="card-chart-section" aria-labelledby="card-chart-title"><div class="card-section-heading"><h3 id="card-chart-title">${icon('analytics')} Faturas por mês</h3><label class="card-chart-period-label"><span class="sr-only">Período do gráfico</span><select data-card-chart-period aria-label="Período do gráfico"><option value="all" ${chartPeriod==='all'?'selected':''}>Todos os meses</option><option value="6" ${chartPeriod==='6'?'selected':''}>Últimos 6 meses</option><option value="12" ${chartPeriod==='12'?'selected':''}>Últimos 12 meses</option><option value="future" ${chartPeriod==='future'?'selected':''}>Faturas futuras</option></select></label></div>${chart(card,items)}</section>
  <section class="card-recent-section" aria-labelledby="card-recent-title"><div class="card-section-heading"><h3 id="card-recent-title">${icon('receipt')} Últimas faturas</h3><button type="button" class="card-history-link" data-card-recent-history>Ver histórico ›</button></div>${recent.map(inv=>`<button type="button" class="card-recent-invoice" data-card-invoice="${e(card.id)}" data-card-month="${inv.invoiceMonth}"><span class="card-row-copy"><strong>${e(monthLabel(cardDate(inv.invoiceMonth)))}</strong><small>Vencimento ${formatDate(inv.dueOn)}</small></span>${statusBadge(inv)}<strong>${e(formatBRL(inv.total))}</strong><span aria-hidden="true">›</span></button>`).join('')}</section>
  <section class="card-history-section" aria-labelledby="card-history-title"><h3 id="card-history-title">Histórico de compras</h3>${purchaseHistory(card)}</section>`;

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
  list.innerHTML=items.map(inv=>`<button type="button" class="card-invoice-history-row ${inv.invoiceMonth===current?'is-current':''}" data-card-invoice="${e(card.id)}" data-card-month="${inv.invoiceMonth}"><span class="card-history-month-tile" aria-hidden="true"><span>${e(new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(cardDate(inv.invoiceMonth)).replace('.',''))}</span><strong>${inv.invoiceMonth.slice(0,4)}</strong></span><span class="card-row-copy"><strong>${e(monthLabel(cardDate(inv.invoiceMonth)))}</strong><small>Vencimento ${formatDate(inv.dueOn)}${inv.invoiceMonth===current?' · Mês atual':''}</small>${statusBadge(inv)}</span><span class="card-invoice-history-value"><strong>${e(formatBRL(inv.total))}</strong>${inv.paidAmount>0&&inv.balanceDue>0?`<small>Falta ${e(formatBRL(inv.balanceDue))}</small>`:''}</span><span class="card-row-arrow" aria-hidden="true">›</span></button>`).join('')||empty('Nenhuma fatura registrada neste cartão.');
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
  closeDialog('invoice-manage-dialog');activeInvoice={cardId,key};renderInvoice();openDialog('invoice-dialog');
 }
 function openInvoiceById(id){const stored=state().invoiceStatuses.find(inv=>inv.id===id);if(stored){openCard(stored.card_id);openInvoice(stored.card_id,stored.invoice_month)}else if(findCard(id)){openCard(id);openInvoice(id)}}
 function renderInvoice(){
  if(!activeInvoice)return;
  const inv=selectedInvoice(activeInvoice.cardId,activeInvoice.key);if(!inv)return;
  document.getElementById('invoice-title').textContent=`${inv.card.name} · ${monthLabel(cardDate(inv.invoiceMonth))}`;
  const hasOpening=inv.rows.some(r=>r.ff2_card_purchases?.record_kind==='invoice_opening');
  document.getElementById('invoice-content').innerHTML=`${document.getElementById('card-invoice-history-dialog').open?'<button type="button" class="card-history-link card-history-return" data-card-history-return>‹ Voltar ao histórico</button>':''}<div class="card-invoice-top-actions">${canEditInvoice(inv)?'<button type="button" class="secondary-btn card-edit-invoice-button" data-card-edit-invoice>'+icon('pencil')+' Editar fatura</button>':hasOpening?'<span class="card-history-caption">'+(inv.settledAt?'Valor protegido: esta fatura possui histórico quitado.':'Valor protegido: esta fatura possui pagamentos.')+'</span>':'<button type="button" class="secondary-btn" data-card-invoice-details>Editar compras</button>'}</div><div class="card-invoice-summary"><div><small>Valor da fatura</small><strong>${e(formatBRL(inv.total))}</strong>${statusBadge(inv)}</div><dl><div><dt>${icon('calendar')}Fechamento</dt><dd>${formatDate(inv.closingOn)}</dd></div><div><dt>${icon('calendar')}Vencimento</dt><dd>${formatDate(inv.dueOn)}</dd></div><div><dt>${icon('card')}Pago</dt><dd>${e(formatBRL(inv.paidAmount))}</dd></div><div><dt>${icon('clock')}Saldo devido</dt><dd>${e(formatBRL(inv.balanceDue))}</dd></div></dl></div>
  ${inv.balanceDue>0?'<button type="button" class="primary-compact card-pay-button" data-card-pay>'+icon('card')+' Registrar pagamento</button>':''}
  <section class="card-invoice-purchases card-consult-purchases" tabindex="-1"><h4>Compras e parcelas</h4>${inv.rows.filter(row=>row.ff2_card_purchases?.record_kind!=='invoice_opening').map(purchaseRow).join('')||empty('Nenhuma compra detalhada nesta fatura.')}</section>
  <div class="card-invoice-manage-access"><button type="button" class="card-history-link card-manage-link" data-card-manage aria-haspopup="dialog" aria-controls="invoice-manage-dialog">${icon('settings')}<span>Gerenciar fatura</span></button></div>`;
  if(document.getElementById('invoice-manage-dialog').open)renderInvoiceManagement();
 }
 function renderInvoiceManagement(){
  const inv=activeInvoice&&selectedInvoice(activeInvoice.cardId,activeInvoice.key);if(!inv){closeDialog('invoice-manage-dialog');return;}
  const panel=document.querySelector('#invoice-manage-dialog .modal-card'),scroll=panel.scrollTop;
  document.getElementById('invoice-manage-title').textContent=`${inv.card.name} · ${monthLabel(cardDate(inv.invoiceMonth))}`;
  const payments=(state().cardPayments||[]).filter(p=>p.invoice_id===inv.id).sort((a,b)=>String(b.paid_on).localeCompare(String(a.paid_on))||String(b.id).localeCompare(String(a.id)));
  document.getElementById('invoice-management-content').innerHTML=`<p class="card-history-caption card-management-summary">Valor da fatura <strong>${e(formatBRL(inv.total))}</strong> · Saldo devido <strong>${e(formatBRL(inv.balanceDue))}</strong></p><p class="card-history-caption">Base ${e(formatBRL(inv.baseAmount))} · Ajustes líquidos ${e(formatBRL(inv.netAdjustments))}</p>
  <section class="card-payments-section"><h4>Pagamentos</h4>${payments.length?payments.map(p=>`<div class="card-payment-row"><span><strong>${e(formatBRL(p.amount))}</strong><small>${formatDate(p.paid_on)}${p.reversed_at?' · Revertido':''}</small>${p.reversed_at?`<small>${e(p.reversal_reason||'')}</small>`:''}</span>${p.transaction_id?`<button type="button" class="card-history-link" data-card-linked-transaction="${e(p.transaction_id)}">Ver lançamento</button>`:''}${p.reversal_transaction_id?`<button type="button" class="card-history-link" data-card-linked-transaction="${e(p.reversal_transaction_id)}">Ver devolução</button>`:''}${!p.reversed_at?`<button type="button" class="text-btn" data-card-reverse="${e(p.id)}">Corrigir</button>`:''}</div>`).join(''):empty(inv.paidAmount>0?'Quitação anterior preservada na conciliação.':'Nenhum pagamento registrado.')}</section>${adjustmentsUI.invoiceExtras(inv)}`;
  panel.scrollTop=scroll;
 }
 function openInvoiceManagement(){
  if(!activeInvoice||!selectedInvoice(activeInvoice.cardId,activeInvoice.key))return;
  renderInvoiceManagement();openDialog('invoice-manage-dialog');
  document.querySelector('#invoice-manage-dialog .modal-card').scrollTop=0;
 }

 function openPurchase(id){
  const purchase=state().purchases.find(p=>p.id===id);if(!purchase){toast('Aguarde a sincronização dos detalhes da compra.','error');return;}
  activePurchase=id;
  const card=findCard(purchase.card_id);const rows=state().installments.filter(row=>!row.card_adjustment&&row.purchase_id===id).sort((a,b)=>a.installment_no-b.installment_no);
  const locked=rows.some(row=>{const inv=selectedInvoice(purchase.card_id,row.invoice_month);return inv?.paidAmount>0||inv?.settledAt})||state().cardAdjustments.some(a=>a.purchase_id===id)||state().cardReconciliations.some(r=>rows.some(row=>row.id===r.installment_id))||purchase.record_kind==='invoice_opening';
  document.getElementById('card-purchase-title').textContent=purchase.description;
  document.getElementById('card-purchase-detail').innerHTML=`<dl class="card-purchase-facts"><div><dt>Cartão</dt><dd>${e(card?.name||purchase.ff2_cards?.name||'Cartão')}</dd></div><div><dt>Data original</dt><dd>${formatDate(purchase.purchase_date)}</dd></div><div><dt>Valor total</dt><dd>${e(formatBRL(purchase.total_amount))}</dd></div><div><dt>Categoria</dt><dd>${e(purchase.category||'Outros')}</dd></div><div><dt>Parcelamento</dt><dd>${Number(purchase.installment_count)===1?'À vista':`${Number(purchase.installment_count)} parcelas`}</dd></div></dl><h4>Parcelas e faturas</h4><div class="card-purchase-invoices">${rows.map(row=>`<button type="button" class="card-related-invoice" data-card-related-invoice="${e(purchase.card_id)}" data-card-month="${row.invoice_month}"><span>${e(shortMonth(row.invoice_month))} · ${row.installment_no} de ${purchase.installment_count}</span><strong>${e(formatBRL(row.amount))}</strong><span aria-hidden="true">›</span></button>`).join('')}</div>${locked?'<p class="card-lock-note">O histórico financeiro desta compra está protegido. Descrição e categoria podem ser corrigidas; valores exigem ajuste ou estorno separado.</p>':''}`;
  document.getElementById('card-purchase-edit').disabled=purchase.record_kind==='invoice_opening';document.getElementById('card-purchase-delete').disabled=locked;
  document.getElementById('card-purchase-refund').disabled=purchase.record_kind==='invoice_opening';
  openDialog('card-purchase-dialog');
 }
 function paymentFieldsChanged(){negativeApproved=false;document.getElementById('card-payment-warning').classList.add('hidden');document.getElementById('card-payment-save').textContent='Confirmar pagamento';setFormError('card-payment-error','');const partial=document.getElementById('card-payment-mode').value==='partial';document.getElementById('card-payment-amount-wrap').classList.toggle('hidden',!partial);document.getElementById('card-payment-amount').required=partial;document.getElementById('card-payment-amount').disabled=!partial;}
 function openPayment(){
  const inv=activeInvoice&&selectedInvoice(activeInvoice.cardId,activeInvoice.key);if(!inv||inv.balanceDue<=0)return;
  const form=document.getElementById('card-payment-form');form.reset();clearFormOperation(form);
  document.getElementById('card-payment-title').textContent=`Pagar fatura · ${inv.card.name}`;
  document.getElementById('card-payment-due').textContent=formatBRL(inv.balanceDue);
  const date=document.getElementById('card-payment-date');date.max=cardToday();date.value=cardToday();
  document.getElementById('card-payment-amount').max=inv.balanceDue.toFixed(2);paymentFieldsChanged();openDialog('card-payment-dialog');
 }
 function showNegative(before,amount,after){
  document.getElementById('card-payment-warning').innerHTML=`<strong>O pagamento ultrapassa seu saldo disponível.</strong><dl><div><dt>Saldo disponível</dt><dd>${e(formatBRL(before))}</dd></div><div><dt>Pagamento</dt><dd>${e(formatBRL(amount))}</dd></div><div><dt>Saldo após pagamento</dt><dd>${e(formatBRL(after))}</dd></div></dl><p>Você pode confirmar para continuar com saldo negativo.</p>`;
  document.getElementById('card-payment-warning').classList.remove('hidden');document.getElementById('card-payment-save').textContent='Confirmar mesmo assim';negativeApproved=true;
 }
 function setPaymentBusy(busy){paying=busy;document.querySelectorAll('#card-payment-dialog button,#card-payment-dialog input,#card-payment-dialog select').forEach(el=>{el.disabled=busy});document.getElementById('card-payment-save').textContent=busy?'Registrando…':'Confirmar pagamento';if(!busy)document.getElementById('card-payment-amount').disabled=document.getElementById('card-payment-mode').value!=='partial'}
 async function submitPayment(event){
  event.preventDefault();if(paying)return;
  const inv=activeInvoice&&selectedInvoice(activeInvoice.cardId,activeInvoice.key);if(!inv)return;
  const form=event.currentTarget,partial=document.getElementById('card-payment-mode').value==='partial',date=document.getElementById('card-payment-date').value;
  const amount=partial?Number(document.getElementById('card-payment-amount').value):inv.balanceDue;
  if(!date||date>cardToday()){setFormError('card-payment-error','Informe uma data de pagamento até hoje.');return;}
  if(!Number.isFinite(amount)||amount<=0||amount>inv.balanceDue||Math.abs(amount*100-Math.round(amount*100))>1e-6){setFormError('card-payment-error','Informe um valor válido até o saldo devido.');return;}
  const balance=calculateCashStats(state().transactions).balance;
  if(balance-amount<0&&!negativeApproved){showNegative(balance,amount,balance-amount);return;}
  const input={cardId:inv.card.id,month:inv.invoiceMonth,date,amount:partial?amount:null,allowNegative:negativeApproved};input.operation=formOperation(form,input);
  setPaymentBusy(true);setFormError('card-payment-error','');
  try{
   await onOperation('Registrando pagamento…','Atualizando fatura, lançamento e limite juntos.',async()=>{await payCardInvoice(input);await onRefresh();},{animateDashboard:true});
   closeDialog('card-payment-dialog');clearFormOperation(form);render();renderInvoice();toast('Pagamento registrado.','success');
  }catch(error){
   if(error.message==='NEGATIVE_BALANCE_CONFIRMATION'){
    try{const detail=JSON.parse(error.details||error.detail);showNegative(detail.before,detail.payment,detail.after)}catch{showNegative(balance,amount,balance-amount)}
   }else setFormError('card-payment-error',cardErrorMessage(error));
  }finally{setPaymentBusy(false);if(negativeApproved&&document.getElementById('card-payment-dialog').open)document.getElementById('card-payment-save').textContent='Confirmar mesmo assim';}
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
   if(button.hasAttribute('data-card-future-invoices'))return openInvoiceHistory('future');
   if(button.hasAttribute('data-card-current-details'))return openInvoice(selectedCardId);
   if(button.hasAttribute('data-card-current-edit')){openInvoice(selectedCardId);return adjustmentsUI.openAdjustment(selectedInvoice(selectedCardId,cardMonth()),null,null,'invoice_total');}
   if(button.hasAttribute('data-card-invoice-details')){const purchases=document.querySelector('#invoice-content .card-invoice-purchases');purchases.scrollIntoView({block:'nearest'});purchases.querySelector('button')?.focus({preventScroll:true});return;}
   if(button.hasAttribute('data-card-manage'))return openInvoiceManagement();
   if(button.hasAttribute('data-card-management-return'))return closeDialog('invoice-manage-dialog');
   if(button.hasAttribute('data-card-invoice-history')||button.hasAttribute('data-card-recent-history'))return openInvoiceHistory();
   if(button.hasAttribute('data-card-history-return'))return closeDialog('invoice-dialog');
   if(button.dataset.cardInvoice)return openInvoice(button.dataset.cardInvoice,button.dataset.cardMonth);
   if(button.dataset.cardRelatedInvoice){closeDialog('card-purchase-dialog');return openInvoice(button.dataset.cardRelatedInvoice,button.dataset.cardMonth);}
   if(button.dataset.cardPurchase)return openPurchase(button.dataset.cardPurchase);
   if(button.hasAttribute('data-card-new-adjustment'))return adjustmentsUI.openAdjustment(selectedInvoice(activeInvoice.cardId,activeInvoice.key));
   if(button.hasAttribute('data-card-edit-invoice')&&!canEditInvoice(selectedInvoice(activeInvoice.cardId,activeInvoice.key)))return;
   if(button.hasAttribute('data-card-edit-invoice'))return adjustmentsUI.openAdjustment(selectedInvoice(activeInvoice.cardId,activeInvoice.key),null,null,'invoice_total');
   if(button.hasAttribute('data-card-conciliate'))return adjustmentsUI.openReconciliation(selectedInvoice(activeInvoice.cardId,activeInvoice.key));
   if(button.id==='card-purchase-refund')return adjustmentsUI.openAdjustment(null,state().purchases.find(p=>p.id===activePurchase));
   if(button.hasAttribute('data-card-pay'))return openPayment();
   if(button.dataset.cardReverse){document.getElementById('card-reversal-form').reset();document.getElementById('card-reversal-id').value=button.dataset.cardReverse;setFormError('card-reversal-error','');return openDialog('card-reversal-dialog');}
   if(button.id==='card-purchase-edit'){closeDialog('card-purchase-dialog');return onEditPurchase(activePurchase);}
   if(button.id==='card-purchase-delete'){if(!confirm('Excluir esta compra e suas parcelas? O registro da exclusão será preservado.'))return;await onCancelPurchase(activePurchase);closeDialog('card-purchase-dialog');render();return;}
   if(button.id==='card-archive-btn'){const id=document.getElementById('card-id').value;if(!id||!confirm('Arquivar este cartão? O histórico será preservado. É necessário quitar todas as faturas.'))return;await onOperation('Arquivando cartão…','Preservando compras e pagamentos anteriores.',async()=>{await deleteCard(id);closeDialog('card-dialog');await onRefresh();});render();toast('Cartão arquivado.','success');}
  }catch(error){console.error(error);toast(cardErrorMessage(error),'error');}
 });
 document.addEventListener('change',event=>{if(event.target.matches('[data-card-chart-period]')){chartPeriod=event.target.value;render();document.querySelector('[data-card-chart-period]')?.focus();}});
 document.getElementById('invoice-manage-dialog').addEventListener('close',()=>{if(document.getElementById('invoice-dialog').open)document.querySelector('[data-card-manage]')?.focus({preventScroll:true});});
 document.getElementById('invoice-manage-dialog').addEventListener('cancel',event=>{if(paying||adjustmentsUI.isBusy())event.preventDefault();});
 document.getElementById('invoice-dialog').addEventListener('close',()=>{
  closeDialog('invoice-manage-dialog');
  if(document.getElementById('card-invoice-history-dialog').open&&activeInvoice?.cardId===historyCardId){
   document.querySelector(`#card-invoice-history-list [data-card-month="${activeInvoice.key}"]`)?.focus({preventScroll:true});
  }
 });
 document.getElementById('card-invoice-history-dialog').addEventListener('close',()=>{
  historyCardId=null;
  document.querySelector('#card-detail [data-card-invoice-history]')?.focus({preventScroll:true});
 });
 document.getElementById('card-payment-form').addEventListener('submit',submitPayment);
 for(const id of ['card-payment-mode','card-payment-date','card-payment-amount'])document.getElementById(id).addEventListener('input',paymentFieldsChanged);
 document.getElementById('card-reversal-form').addEventListener('submit',submitReversal);
 for(const id of ['card-payment-dialog','card-reversal-dialog'])document.getElementById(id).addEventListener('cancel',event=>{if(paying)event.preventDefault()});
 return {render,openInvoice,openInvoiceById,reset(){adjustmentsUI.reset();selectedCardId=null;activeInvoice=null;activePurchase=null;historyCardId=null;for(const id of ['invoice-manage-dialog','card-invoice-history-dialog','invoice-dialog','card-payment-dialog','card-purchase-dialog','card-reversal-dialog'])closeDialog(id);},isBusy:()=>paying||adjustmentsUI.isBusy()};
}
export function cardErrorMessage(error){
 const messages={SETTLED_INVOICE_IMMUTABLE:'Esta fatura possui histórico quitado e não pode ser reescrita. Registre um ajuste em outra competência.',PURCHASE_HAS_ADJUSTMENTS:'Esta compra possui ajustes ou conciliação. Corrija somente descrição e categoria.',INVOICE_ALREADY_PAID:'Esta fatura já está quitada. Atualize os dados.',INVOICE_HAS_PAYMENTS:'Corrija os pagamentos desta fatura antes de alterar a compra.',INVALID_PAYMENT_AMOUNT:'O pagamento deve ser maior que zero e até o saldo devido.',INVALID_PAYMENT_DATE:'Informe uma data de pagamento até hoje.',CARD_HAS_BALANCE:'Quite todas as faturas antes de arquivar o cartão.',CARD_PAYMENT_LINKED:'Corrija este pagamento nos detalhes da fatura.',RECONCILIATION_LOCKED:'Este registro é um saldo de conciliação e mantém o histórico anterior.',REQUEST_CONFLICT:'Esta operação mudou. Feche o formulário e tente novamente.',INVALID_INSTALLMENTS:'Revise a quantidade de parcelas e o valor da compra.'};
 return messages[error?.message]||(/^(Revise|Ative|Corrija)/.test(error?.message||'')?error.message:'Não foi possível concluir. Tente novamente.');
}

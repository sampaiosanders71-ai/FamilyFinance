import { buildFinancialMonthLedger, classifyTransaction } from './financial-ledger.js';
import { ownTransferReview, legacyReview, reviewedPeriodRows } from './financial-integrity.js';
import { buildVisualPdf, PDF_PAGE } from './pdf.js';

const C = {
  ink:'#171717', muted:'#6f7379', subtle:'#9b9da1', panel:'#f5f2ed', line:'#dedbd5',
  orange:'#f28a2b', orangeSoft:'#fff0df', green:'#2f8f61', red:'#b84e4e', blue:'#4477aa', white:'#ffffff', dark:'#242526'
};

function requireDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new TypeError('REPORT_DATE_REQUIRED');
  return new Date(value.getFullYear(), value.getMonth(), 1, 12, 0, 0, 0);
}
function monthPrefix(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function monthKey(date) { return `${monthPrefix(date)}-01`; }
function dateFromMonthKey(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})(?:-01)?$/);
  if (!match) throw new TypeError('INVALID_REPORT_MONTH');
  return new Date(Number(match[1]), Number(match[2]) - 1, 1, 12, 0, 0, 0);
}
function normalizeMonthKey(value) { return monthKey(value instanceof Date ? requireDate(value) : dateFromMonthKey(value)); }
function sortedMonthKeys(keys) { return [...new Set((keys || []).map(normalizeMonthKey))].sort(); }
function shiftKey(key, offset) { const d=dateFromMonthKey(key); return monthKey(new Date(d.getFullYear(),d.getMonth()+Number(offset||0),1,12)); }
function reportMoney(formatBRL, value) { return String(formatBRL(Number(value) || 0)).replace(/\u00a0/g, ' '); }
function compactText(value, max = 72) { const t=String(value??'').replace(/\s+/g,' ').trim(); return t.length<=max?t:`${t.slice(0,Math.max(1,max-3))}...`; }
function pctChange(current, previous) { const a=Number(current||0), b=Number(previous||0); if(Math.abs(b)<0.005)return Math.abs(a)<0.005?0:null; return ((a-b)/Math.abs(b))*100; }
function addCategory(target,category,cash=0,card=0){const name=String(category||'Outros').trim()||'Outros';if(!target[name])target[name]={category:name,cash:0,card:0,total:0};target[name].cash+=Number(cash||0);target[name].card+=Number(card||0);target[name].total=target[name].cash+target[name].card}
function addCard(target,cardName,amount,status='open'){const name=String(cardName||'Cartão').trim()||'Cartão';if(!target[name])target[name]={name,total:0,status};target[name].total+=Number(amount||0);if(status==='paid')target[name].status='paid'}

function buildMonthModel({transactions,installments,invoiceStatuses,budget,key,today,throughDay,monthLabel}){
  const ledger=buildFinancialMonthLedger({transactions,installments,invoiceStatuses,monthKey:key,today,throughDay});
  const date=dateFromMonthKey(key);
  const limits=Object.fromEntries((budget?.items||[]).map(item=>[item.category,Number(item.limit_amount||0)]));
  const usage=ledger.budgetUsageMap||{};
  const budgetCategories=[...new Set([...Object.keys(limits),...Object.keys(usage)])]
    .map(category=>{const spent=Number(usage[category]||0),limit=Number(limits[category]||0);return{category,limit,spent,available:limit-spent,limitDefined:Object.prototype.hasOwnProperty.call(limits,category)}})
    .filter(item=>item.limitDefined||item.spent>0)
    .sort((a,b)=>Math.max(b.limit,b.spent)-Math.max(a.limit,a.spent));
  return {
    ...ledger,
    key,date,label:monthLabel(date),
    scheduledExpense:ledger.futureExpense,
    details:(ledger.details||[]).filter(row=>row.kind==='consumption'||row.kind==='card_consumption'),
    allocationDetails:(ledger.details||[]).filter(row=>row.kind==='allocation'),
    movementDetails:(transactions||[]).filter(row=>String(row.occurred_on||'').startsWith(key.slice(0,7)) && row.occurred_on<=ledger.cutoff)
      .filter(row=>['allocation','transfer_in','transfer_out'].includes(classifyTransaction(row)))
      .map(row=>({date:row.occurred_on,description:row.description||'Movimentação',category:row.category||'Outros',amount:Math.abs(Number(row.amount)||0),
        kind:classifyTransaction(row),nature:row.financial_nature||'legacy',goalId:row.goal_id||null})).sort((a,b)=>a.date.localeCompare(b.date)),
    budget:{plannedIncome:Number(budget?.plan?.planned_income||0),totalLimit:Object.values(limits).reduce((s,v)=>s+Number(v||0),0),categories:budgetCategories,exists:!!budget?.plan}
  };
}
function aggregateCategories(months){const map={};for(const month of months)for(const item of month.categories||[])addCategory(map,item.category,item.cash,item.card);return Object.values(map).sort((a,b)=>b.total-a.total||a.category.localeCompare(b.category,'pt-BR'))}
function aggregateCards(months){const map={};for(const month of months)for(const item of month.cards||[])addCard(map,item.name,item.total,item.status);return Object.values(map).sort((a,b)=>b.total-a.total)}
function aggregateBudget(months){const map={};let plannedIncome=0,totalLimit=0;for(const month of months){plannedIncome+=month.budget.plannedIncome;totalLimit+=month.budget.totalLimit;for(const item of month.budget.categories){if(!map[item.category])map[item.category]={category:item.category,limit:0,spent:0,limitDefined:false};map[item.category].limit+=item.limit;map[item.category].spent+=item.spent;map[item.category].limitDefined=map[item.category].limitDefined||item.limitDefined}}return{plannedIncome,totalLimit,categories:Object.values(map).map(item=>({...item,available:item.limit-item.spent})).sort((a,b)=>Math.max(b.limit,b.spent)-Math.max(a.limit,a.spent))}}

export function getMonthlyDRE(transactions,installments,refDate,today=new Date()){
  const date=requireDate(refDate);
  const ledger=buildFinancialMonthLedger({transactions:transactions||[],installments:installments||[],monthKey:monthKey(date),today});
  return {
    income:ledger.income,
    cashExpense:ledger.cashExpense,
    cardExpense:ledger.cardExpense,
    totalExpense:ledger.totalExpense,
    allocation:ledger.allocation,
    transferIn:ledger.transferIn,
    transferOut:ledger.transferOut,
    cardPayments:ledger.cardPayments,
    cashOutflow:ledger.cashOutflow,
    cashResult:ledger.cashResult,
    result:ledger.result,
    futureExpense:ledger.futureExpense,
    realizedThrough:ledger.cutoff,
    partial:ledger.partial
  };
}
export function getReportMonthOptions(transactions,installments,referenceDate=new Date()){const reference=requireDate(referenceDate),now=new Date(),todayISO=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`,keys=new Set([monthKey(reference)]);for(let offset=0;offset<12;offset++)keys.add(monthKey(new Date(reference.getFullYear(),reference.getMonth()-offset,1,12)));for(const row of transactions||[]){const raw=String(row.occurred_on||'');if(raw<=todayISO&&/^\d{4}-\d{2}/.test(raw))keys.add(`${raw.slice(0,7)}-01`)}for(const row of installments||[]){const raw=String(row.invoice_month||''),purchaseDate=String(row.ff2_card_purchases?.purchase_date||'');if(/^\d{4}-\d{2}-01$/.test(raw)&&(!purchaseDate||purchaseDate<=todayISO))keys.add(raw)}return[...keys].map(key=>({key,date:dateFromMonthKey(key)})).sort((a,b)=>b.key.localeCompare(a.key))}
export function buildFinancialReportModel({transactions,installments,invoiceStatuses,budgetsByMonth={},monthKeys,monthLabel,today=new Date(),cutoffDaysByMonth={}}){
  const keys=sortedMonthKeys(monthKeys||[]);if(!keys.length)throw new Error('Selecione pelo menos um mês para o relatório.');
  const months=keys.map(key=>buildMonthModel({transactions,installments,invoiceStatuses,budget:budgetsByMonth[key]||{plan:null,items:[]},key,today,throughDay:cutoffDaysByMonth?.[key]??null,monthLabel}));
  const fields=['income','cashExpense','cardExpense','totalExpense','result','allocation','cashOutflow','cashResult','transferOut','transferIn','cardPayments','adjustments','futureIncome','futureExpense','futureAllocation','committedCard'];
  const totals=months.reduce((a,m)=>{for(const field of fields)a[field]+=Number(m[field]||0);return a;},Object.fromEntries(fields.map(field=>[field,0])));
  const periodRows=reviewedPeriodRows(transactions,keys,today);
  const legacy=legacyReview(periodRows);
  const reconciliation=ownTransferReview(transactions||[]);
  const periodIds=new Set(periodRows.map(r=>r.id));
  const transferReview={...reconciliation,pairs:reconciliation.pairs.filter(pair=>periodIds.has(pair.outId)||periodIds.has(pair.inId)),unmatched:reconciliation.unmatched.filter(row=>periodIds.has(row.id)),ambiguous:reconciliation.ambiguous.filter(row=>periodIds.has(row.id))};
  return{keys,months,totals,categories:aggregateCategories(months),cards:aggregateCards(months),budget:aggregateBudget(months),audit:{legacy,transferReview}};
}

function wrapText(text,maxChars=70){const words=String(text||'').split(/\s+/).filter(Boolean),lines=[];let current='';for(const word of words){const next=current?`${current} ${word}`:word;if(next.length>maxChars&&current){lines.push(current);current=word}else current=next}if(current)lines.push(current);return lines.length?lines:['']}
function page(){return[]}
function text(p,x,y,value,size=10,opts={}){p.push({type:'text',x,y,text:String(value??''),size,bold:!!opts.bold,color:opts.color||C.ink,align:opts.align});}
function rect(p,x,y,w,h,fill,stroke){p.push({type:'rect',x,y,w,h,fill,stroke});}
function line(p,x1,y1,x2,y2,color=C.line,width=1){p.push({type:'line',x1,y1,x2,y2,color,width});}
function circle(p,x,y,r,fill){p.push({type:'circle',x,y,r,fill});}
function polyline(p,points,color,width=2){p.push({type:'polyline',points,color,width});}
function sectionTitle(p,y,title,subtitle=''){text(p,44,y,title,13,{bold:true});if(subtitle)text(p,44,y+18,subtitle,8,{color:C.muted});return y+34}
function metricCard(p,x,y,w,label,value,change,formatMoney,{goodUp=true,captionOverride='',comparisonCaption='vs mês anterior'}={}){rect(p,x,y,w,72,C.panel);text(p,x+12,y+12,label,8,{color:C.muted});text(p,x+12,y+31,reportMoney(formatMoney,value),15,{bold:true});let caption=captionOverride||'Sem base anterior',color=C.muted;if(!captionOverride&&change!==null&&Number.isFinite(change)){caption=`${change>0?'+':''}${change.toFixed(1)}% ${comparisonCaption}`;const good=goodUp?change>=0:change<=0;color=Math.abs(change)<0.05?C.muted:(good?C.green:C.red)}text(p,x+12,y+53,caption,7.5,{color});}
function drawLineChart(p,{x,y,w,h,months,formatMoney}){rect(p,x,y,w,h,C.white,C.line);const plot={x:x+44,y:y+26,w:w-58,h:h-52};const max=Math.max(1,...months.flatMap(m=>[m.income,m.totalExpense]));for(let i=0;i<4;i++){const gy=plot.y+(plot.h/3)*i;line(p,plot.x,gy,plot.x+plot.w,gy,'#e7e4df',0.6);const val=max*(1-i/3);text(p,plot.x-8,gy-4,compactText(reportMoney(formatMoney,val),11),6.5,{color:C.subtle,align:'right'})}const pointsFor=field=>months.map((m,i)=>({x:plot.x+(months.length===1?plot.w/2:(plot.w*i/(months.length-1))),y:plot.y+plot.h-(Number(m[field]||0)/max)*plot.h}));const incomePts=pointsFor('income'),expensePts=pointsFor('totalExpense');if(incomePts.length>1){polyline(p,incomePts,C.green,1.8);polyline(p,expensePts,C.orange,1.8)}incomePts.forEach(pt=>circle(p,pt.x,pt.y,2.3,C.green));expensePts.forEach(pt=>circle(p,pt.x,pt.y,2.3,C.orange));months.forEach((m,i)=>{const px=plot.x+(months.length===1?plot.w/2:(plot.w*i/(months.length-1)));text(p,px,plot.y+plot.h+10,String(m.label).slice(0,3),6.8,{color:C.muted,align:'center'})});circle(p,x+14,y+14,2.5,C.green);text(p,x+21,y+8,'Receitas',7,{color:C.muted});circle(p,x+78,y+14,2.5,C.orange);text(p,x+85,y+8,'Despesas',7,{color:C.muted});}
function categoryRowsWithRemainder(rows,limit=5){
  const clean=(rows||[]).filter(row=>Number(row?.total||0)>0).sort((a,b)=>Number(b.total||0)-Number(a.total||0)||String(a.category||'').localeCompare(String(b.category||''),'pt-BR'));
  if(clean.length<=limit)return clean;
  const visible=clean.slice(0,Math.max(1,limit-1)),rest=clean.slice(Math.max(1,limit-1));
  const demais=rest.reduce((acc,row)=>{acc.cash+=Number(row.cash||0);acc.card+=Number(row.card||0);acc.total+=Number(row.total||0);return acc;},{category:'Demais',cash:0,card:0,total:0,isRemainder:true});
  return [...visible,demais];
}
function drawCategoryBars(p,{x,y,w,rows,total,formatMoney}){const max=Math.max(1,...rows.map(r=>r.total));let cy=y;for(const row of rows){text(p,x,cy,compactText(row.category,22),8,{bold:true});text(p,x+w,cy,reportMoney(formatMoney,row.total),8,{align:'right'});const by=cy+13;rect(p,x,by,w,8,'#eeeae4');rect(p,x,by,w*(row.total/max),8,C.orange);const pct=total>0?(row.total/total*100):0;text(p,x+w,by+11,`${pct.toFixed(1)}%`,6.5,{color:C.muted,align:'right'});cy+=35}return cy}
function categoryComparisonRows(current,previous,limit=7){
  const a=Object.fromEntries((current.categories||[]).map(i=>[i.category,Number(i.total||0)])),b=Object.fromEntries((previous.categories||[]).map(i=>[i.category,Number(i.total||0)]));
  const rows=[...new Set([...Object.keys(a),...Object.keys(b)])].map(category=>({category,a:a[category]||0,b:b[category]||0})).sort((x,y)=>Math.max(y.a,y.b)-Math.max(x.a,x.b)||x.category.localeCompare(y.category,'pt-BR'));
  if(rows.length<=limit)return rows;
  const visible=rows.slice(0,Math.max(1,limit-1)),rest=rows.slice(Math.max(1,limit-1));
  const demais=rest.reduce((acc,row)=>{acc.a+=Number(row.a||0);acc.b+=Number(row.b||0);return acc;},{category:'Demais',a:0,b:0,isRemainder:true});
  return [...visible,demais];
}
function drawCategoryComparisonBars(p,{x,y,w,rows,labelA,labelB,formatMoney}){const max=Math.max(1,...rows.flatMap(r=>[r.a,r.b]));circle(p,x,y+4,2.4,C.orange);text(p,x+8,y-2,labelA,6.7,{color:C.muted});circle(p,x+112,y+4,2.4,C.blue);text(p,x+120,y-2,labelB,6.7,{color:C.muted});let cy=y+22;for(const row of rows){text(p,x,cy,compactText(row.category,22),8,{bold:true});text(p,x+w,cy,`${reportMoney(formatMoney,row.a)} / ${reportMoney(formatMoney,row.b)}`,7.3,{align:'right',color:C.muted});rect(p,x,cy+13,w,6,'#eeeae4');rect(p,x,cy+13,w*(row.a/max),6,C.orange);rect(p,x,cy+22,w,6,'#eeeae4');rect(p,x,cy+22,w*(row.b/max),6,C.blue);cy+=39}return cy}
function drawBudgetBars(p,{x,y,w,rows,formatMoney}){const max=Math.max(1,...rows.flatMap(r=>[r.limit,r.spent]));let cy=y;for(const row of rows){const hasLimit=row.limitDefined===true||Number(row.limit||0)>0;const label=hasLimit?`${reportMoney(formatMoney,row.spent)} / limite ${reportMoney(formatMoney,row.limit)}`:`${reportMoney(formatMoney,row.spent)} / Sem limite`;text(p,x,cy,compactText(row.category,22),8,{bold:true});text(p,x+w,cy,label,7.5,{align:'right',color:C.muted});rect(p,x,cy+13,w,6,'#eeeae4');if(hasLimit)rect(p,x,cy+13,w*(row.limit/max),6,C.blue);rect(p,x,cy+22,w,6,'#eeeae4');rect(p,x,cy+22,w*(row.spent/max),6,hasLimit&&row.spent>row.limit?C.red:C.orange);cy+=39}text(p,x,cy+2,'Limite',6.5,{color:C.blue});text(p,x+62,cy+2,'Uso realizado',6.5,{color:C.orange});return cy+16}
function detailLayout(row){
  const description=wrapText(row?.description||'Despesa',34);
  const category=wrapText(row?.category||'Outros',20);
  const source=wrapText(row?.source||'',34);
  const descriptionLines=[...description,...(String(row?.source||'').trim()?source:[])];
  const lines=Math.max(descriptionLines.length,category.length,1);
  return {descriptionLines,categoryLines:category,height:Math.max(19,7+lines*9)};
}
function rowsHeight(rows){return (rows||[]).reduce((sum,row)=>sum+detailLayout(row).height,0)}
function paginateDetailRows(rows,firstHeight,nextHeight){
  const source=[...(rows||[])]; if(!source.length)return [];
  const pages=[]; let index=0; let available=firstHeight;
  while(index<source.length){
    const batch=[]; let used=0;
    while(index<source.length){const h=detailLayout(source[index]).height;if(batch.length&&used+h>available)break;if(!batch.length&&h>available)break;batch.push(source[index]);used+=h;index++;}
    if(!batch.length){pages.push([]);available=nextHeight;continue;}
    pages.push(batch);available=nextHeight;
  }
  if(pages.length>1&&pages[pages.length-1].length===1&&pages[pages.length-2].length>=3){
    const previous=pages[pages.length-2],last=pages[pages.length-1],candidate=previous[previous.length-1];
    if(rowsHeight([candidate,...last])<=nextHeight){previous.pop();last.unshift(candidate);}
  }
  return pages;
}
function drawDetailHeader(p,y){text(p,48,y,'Data',7,{bold:true,color:C.muted});text(p,110,y,'Descrição / origem',7,{bold:true,color:C.muted});text(p,338,y,'Categoria',7,{bold:true,color:C.muted});text(p,506,y,'Valor',7,{bold:true,color:C.muted});line(p,48,y+12,564,y+12,C.line,.7);return y+18}
function drawDetailRows(p,y,rows,formatDate,formatBRL){let cy=y;for(const row of rows||[]){const layout=detailLayout(row);text(p,48,cy,formatDate(row.date),7.2);layout.descriptionLines.forEach((lineText,index)=>text(p,110,cy+index*9,lineText,7.1,{color:index>=wrapText(row?.description||'Despesa',34).length?C.muted:C.ink}));layout.categoryLines.forEach((lineText,index)=>text(p,338,cy+index*9,lineText,7.1));text(p,564,cy,reportMoney(formatBRL,row.amount),7.2,{align:'right'});cy+=layout.height;line(p,48,cy-3,564,cy-3,'#eeeae4',.45)}return cy}
function monthComparisonLabel(month){
  if(!month)return '';
  if(!month.partial)return month.label;
  const raw=String(month.cutoff||'');
  const day=raw.slice(8,10),mon=raw.slice(5,7);
  return `${month.label} até ${day}/${mon}`;
}
function insightLines(current,previous,formatMoney){const expensePct=pctChange(current.totalExpense,previous.totalExpense),result=[];if(expensePct===null){if(current.totalExpense>0&&previous.totalExpense===0)result.push('As despesas de consumo saíram de zero no período atual.')}else if(Math.abs(expensePct)<0.1)result.push('As despesas de consumo ficaram praticamente estáveis em relação ao período comparado.');else result.push(`As despesas de consumo ${expensePct>0?'aumentaram':'diminuíram'} ${Math.abs(expensePct).toFixed(1)}% em relação ao mês anterior.`);const a=Object.fromEntries(current.categories.map(i=>[i.category,i.total])),b=Object.fromEntries(previous.categories.map(i=>[i.category,i.total]));const changes=[...new Set([...Object.keys(a),...Object.keys(b)])].map(category=>({category,delta:(a[category]||0)-(b[category]||0)}));const inc=[...changes].sort((x,y)=>y.delta-x.delta).find(i=>i.delta>0.005),dec=[...changes].sort((x,y)=>x.delta-y.delta).find(i=>i.delta<-0.005);if(inc)result.push(`${inc.category} teve o maior aumento: ${reportMoney(formatMoney,Math.abs(inc.delta))}.`);if(dec)result.push(`${dec.category} teve a maior redução: ${reportMoney(formatMoney,Math.abs(dec.delta))}.`);result.push(current.result>=0?'O mês mais recente fechou com resultado positivo.':'O mês mais recente fechou com resultado negativo.');return result.slice(0,4)}


function decorateReportPages(pages,{today,periodText}){
  const total=pages.length;
  pages.forEach((ops,index)=>{
    const footer=[];
    text(footer,505,730,`Página ${index+1} de ${total}`,6.8,{align:'right',color:C.subtle});
    if(index===0){
      text(footer,552,117,`Gerado em ${today.toLocaleDateString('pt-BR')}`,7,{align:'right',color:C.subtle});
      text(footer,552,129,compactText(periodText,38),7,{align:'right',color:C.muted});
    }
    pages[index]=ops.concat(footer);
  });
  return pages;
}

function reportTitle(p,title,subtitle=''){
  text(p,48,126,title,20,{bold:true,color:C.ink});
  if(subtitle) text(p,48,151,subtitle,10,{color:C.muted});
}

function buildAnalyticalPages({model,comparisonModel,contextModel,formatDate,formatBRL,monthLabel,today}){
  const pages=[];
  const latest=model.months[model.months.length-1],previous=comparisonModel.months[0];
  const latestComparisonLabel=monthComparisonLabel(latest),previousComparisonLabel=monthComparisonLabel(previous);
  const comparisonCaption=previous?.partial?`vs 01-${String(previous.cutoff||'').slice(8,10)}/${String(previous.cutoff||'').slice(5,7)}`:'vs mês anterior';
  const selectedLabels=model.months.map(m=>m.label);
  const periodText=selectedLabels.length===1?monthComparisonLabel(latest):`${selectedLabels[0]} a ${monthComparisonLabel(latest)}`;

  const p1=page();pages.push(p1);
  reportTitle(p1,'Relatório Financeiro',periodText);
  text(p1,48,176,'Resumo executivo',13,{bold:true});
  const cardW=121,gap=10,multiCaption=model.months.length>1?`Total de ${model.months.length} meses`:'';
  metricCard(p1,48,198,cardW,'Receitas',model.totals.income,model.months.length===1?pctChange(latest.income,previous.income):null,formatBRL,{goodUp:true,captionOverride:multiCaption,comparisonCaption});
  metricCard(p1,48+cardW+gap,198,cardW,'Consumo',model.totals.totalExpense,model.months.length===1?pctChange(latest.totalExpense,previous.totalExpense):null,formatBRL,{goodUp:false,captionOverride:multiCaption,comparisonCaption});
  metricCard(p1,48+(cardW+gap)*2,198,cardW,'Resultado consumo',model.totals.result,model.months.length===1?pctChange(latest.result,previous.result):null,formatBRL,{goodUp:true,captionOverride:multiCaption,comparisonCaption});
  metricCard(p1,48+(cardW+gap)*3,198,cardW,'Compras cartão',model.totals.cardExpense,model.months.length===1?pctChange(latest.cardExpense,previous.cardExpense):null,formatBRL,{goodUp:false,captionOverride:multiCaption,comparisonCaption});
  let y=292;
  y=sectionTitle(p1,y,'Evolução financeira','Receitas e despesas de consumo por competência, sem confundir pagamento de fatura com novo consumo.');
  drawLineChart(p1,{x:48,y,w:516,h:160,months:contextModel.months,formatMoney:formatBRL});
  y+=182;
  y=sectionTitle(p1,y,'Leitura automática',`${latestComparisonLabel} comparado a ${previousComparisonLabel}.`);
  rect(p1,48,y,516,112,C.orangeSoft);
  let iy=y+14;
  for(const insight of insightLines(latest,previous,formatBRL)){
    for(const wrapped of wrapText(insight,80)){text(p1,62,iy,`- ${wrapped}`,8.1,{color:C.ink});iy+=14}
    iy+=2;
  }
  text(p1,48,710,'Compras no cartão: consumo por competência. Quitações não duplicam consumo. Reservas e transferências são separadas.',6.6,{color:C.subtle});

  const p2=page();pages.push(p2);
  reportTitle(p2,'Categorias e limites',`Comparativo financeiro - ${periodText}`);
  let y2=184;
  y2=sectionTitle(p2,y2,'Consumo por categoria',`${latest.label} x ${previous.label}. Laranja = atual; azul = anterior.`);
  const compareRows=categoryComparisonRows(latest,previous,5);
  if(compareRows.length)y2=drawCategoryComparisonBars(p2,{x:48,y:y2,w:516,rows:compareRows,labelA:latestComparisonLabel,labelB:previousComparisonLabel,formatMoney:formatBRL});
  else{text(p2,48,y2,'Nenhum gasto realizado nos meses comparados.',9,{color:C.muted});y2+=28}
  y2+=12;
  y2=sectionTitle(p2,y2,'Limites x realizado','Comparação entre os limites configurados e os gastos realizados.');
  const budgetRows=model.budget.categories.filter(r=>r.limitDefined===true||r.spent>0).slice(0,5);
  if(budgetRows.length)y2=drawBudgetBars(p2,{x:48,y:y2,w:516,rows:budgetRows,formatMoney:formatBRL});
  else{text(p2,48,y2,'Nenhum limite salvo para os meses selecionados.',9,{color:C.muted});y2+=30}
  if(y2<650){
    y2+=10;y2=sectionTitle(p2,y2,'Cartões',model.cards.length?'Compras no cartão por competência; fatura aberta não significa pagamento já realizado.':'Nenhuma compra no cartão no período.');
    if(model.cards.length){
      const max=Math.max(1,...model.cards.map(c=>c.total));let cy=y2;
      for(const card of model.cards.slice(0,3)){
        text(p2,48,cy,compactText(`${card.name} · ${card.status==='paid'?'fatura paga':'fatura aberta'}`,42),8,{bold:true});
        text(p2,564,cy,reportMoney(formatBRL,card.total),8,{align:'right'});
        rect(p2,48,cy+13,516,7,'#eeeae4');rect(p2,48,cy+13,516*(card.total/max),7,C.blue);cy+=31;
      }
    }
  }

  for(const month of model.months){
    const p=page();pages.push(p);
    const monthlySubtitle=month.partial?`Resumo realizado até ${String(month.cutoff||'').slice(8,10)}/${String(month.cutoff||'').slice(5,7)} e detalhamento do consumo.`:'Resumo mensal e detalhamento do consumo realizado.';
    reportTitle(p,month.label,monthlySubtitle);
    metricCard(p,48,170,121,'Receitas',month.income,null,formatBRL);
    metricCard(p,179,170,121,'Consumo',month.totalExpense,null,formatBRL,{goodUp:false});
    metricCard(p,310,170,121,'Resultado consumo',month.result,null,formatBRL);
    metricCard(p,441,170,123,'Compras cartão',month.cardExpense,null,formatBRL,{goodUp:false});
    let y=254;
    if(Number(month.allocation||0)>0){text(p,48,y,`Reservas e investimentos: ${reportMoney(formatBRL,month.allocation)} · destinação financeira, fora do consumo.`,7.4,{color:C.muted});y+=18;}
    if(Number(month.futureExpense||0)>0){text(p,48,y,`Previsto ainda não realizado: ${reportMoney(formatBRL,month.futureExpense)}.`,7.4,{color:C.muted});y+=18;}
    y=sectionTitle(p,y,'Principais categorias','Despesas de consumo por categoria. Valores adicionais são agrupados em "Demais".');
    const categoryRows=categoryRowsWithRemainder(month.categories,4);
    if(categoryRows.length)y=drawCategoryBars(p,{x:48,y,w:516,rows:categoryRows,total:month.totalExpense,formatMoney:formatBRL});
    else{text(p,48,y,'Sem despesas de consumo realizadas neste mês.',9,{color:C.muted});y+=25}
    y+=8;y=sectionTitle(p,y,'Detalhamento do consumo','Descrição completa, origem e categoria dos valores reconhecidos como consumo.');
    const rows=month.details||[],contentBottom=710;
    if(!rows.length){text(p,48,y,'Nenhum consumo realizado para detalhar.',9,{color:C.muted});continue;}
    const firstHeaderY=y,firstBodyY=firstHeaderY+18;
    let firstHeight=contentBottom-firstBodyY;
    const minimumRows=Math.min(3,rows.length),minimumHeight=rowsHeight(rows.slice(0,minimumRows));
    if(rows.length>minimumRows&&firstHeight<minimumHeight)firstHeight=0;
    const nextHeaderY=188,nextBodyY=nextHeaderY+18,nextHeight=contentBottom-nextBodyY;
    const batches=paginateDetailRows(rows,firstHeight,nextHeight);
    let batchIndex=0;
    if(batches[0]?.length){drawDetailHeader(p,firstHeaderY);drawDetailRows(p,firstBodyY,batches[0],formatDate,formatBRL);batchIndex=1;}
    else if(batches[0]?.length===0)batchIndex=1;
    for(;batchIndex<batches.length;batchIndex++){
      const batch=batches[batchIndex]; if(!batch?.length)continue;
      const extra=page();pages.push(extra);reportTitle(extra,`${month.label} - continuação`,'Detalhamento do consumo realizado.');
      const bodyY=drawDetailHeader(extra,nextHeaderY);drawDetailRows(extra,bodyY,batch,formatDate,formatBRL);
    }
  }
  // Anexo de conciliação: valores realizados e classificações explícitas por mês.
  for(const month of model.months){
    const p=page();pages.push(p);
    reportTitle(p,`Movimentações - ${month.label}`,'Complemento do resultado de consumo: fluxo de caixa e destinações de dinheiro.');
    let y=187;
    for(const [label,value] of [
      ['Reservado / investido',month.allocation],['Resgates e transferências de entrada',month.transferIn],
      ['Transferências de saída',month.transferOut],['Quitações de cartão (saída do caixa)',month.cardPayments],
      ['Variação de caixa registrada (sem ajustes)',month.cashResult],
      ['Resultado por consumo (receitas - despesas)',month.result],
      ['Reservas futuras, fora do realizado',month.futureAllocation]
    ]){
      text(p,48,y,label,8.1,{color:C.muted});text(p,562,y,reportMoney(formatBRL,value),9,{align:'right',bold:true});
      line(p,48,y+15,564,y+15,C.line,.45);y+=34;
    }
    y+=13;
    y=sectionTitle(p,y,'Aportes, transferências e resgates','Valores efetivos; lançamentos futuros ficam somente nos indicadores de previsão.');
    const movements=month.movementDetails||[];
    if(!movements.length){text(p,48,y,'Nenhuma movimentação desta natureza no mês.',8,{color:C.muted});}
    else{
      const batchSize=8;
      for(let i=0;i<movements.length;i+=batchSize){
        const group=movements.slice(i,i+batchSize);
        const target=i===0?p:page();
        if(i>0){pages.push(target);reportTitle(target,`${month.label} - movimentações`,'Continuação do detalhamento financeiro.');}
        const start=i===0?y:196;
        const rows=group.map(row=>({date:row.date,description:`${row.nature==='legacy'?'Anterior (inferido)':row.nature==='resgate'?'Resgate':row.kind==='allocation'?'Reserva':row.kind==='transfer_in'?'Transferência entrada':'Transferência saída'}: ${row.description}`,category:row.category,source:row.goalId?'Vinculado à meta':'',amount:row.amount}));
        drawDetailHeader(target,start);drawDetailRows(target,start+18,rows,formatDate,formatBRL);
      }
    }
  }
  // Revisão não destrutiva do histórico; pareamentos por valor/data são apenas candidatos.
  const auditPage=page();pages.push(auditPage);
  reportTitle(auditPage,'Integridade e revisão','Transações anteriores não foram alteradas automaticamente.');
  let ay=193;
  const checklist=[
    `Lançamentos sem natureza explícita: ${model.audit.legacy.length}`,
    `Possíveis pares entre contas próprias: ${model.audit.transferReview.pairs.length}`,
    `Movimentações de transferência sem par visível: ${model.audit.transferReview.unmatched.length}`,
    `Transferências com múltiplas combinações: ${model.audit.transferReview.ambiguous.length}`
  ];
  for(const item of checklist){text(auditPage,48,ay,item,9,{color:C.ink});ay+=28;}
  ay+=14;
  for(const warning of [
    'Pares são sugeridos por valor e data; não demonstram conciliação bancária.',
    'Uma única ponta de transferência pode existir porque a outra conta não é cadastrada.',
    'Aportes e resgates não representam despesas ou receitas de consumo.',
    'A natureza de registros anteriores pode ser inferida para compatibilidade, mas não está confirmada. Edite no histórico.'
  ]){for(const ln of wrapText(warning,83)){text(auditPage,48,ay,`- ${ln}`,8,{color:C.muted});ay+=15;}}
  ay+=20;
  ay=sectionTitle(auditPage,ay,'Registros antigos a revisar','Edite a natureza do lançamento no histórico para confirmar a classificação.');
  const suggestionLabel={allocation:'Reserva',resgate:'Resgate',transfer:'Transferência'};
  const exampleRows=model.audit.legacy.slice(0,5).map(row=>({date:row.date,description:row.description,category:row.suggestion?`Sugestão: ${suggestionLabel[row.suggestion]||'Revisar'}`:'Revisar manual',amount:row.amount}));
  if(exampleRows.length){drawDetailHeader(auditPage,ay);drawDetailRows(auditPage,ay+18,exampleRows,formatDate,formatBRL);if(model.audit.legacy.length>5)text(auditPage,48,690,`Mais ${model.audit.legacy.length-5} registros antigos disponíveis no CSV e no Histórico.`,7.5,{color:C.muted});}
  else text(auditPage,48,ay,'Não foram identificados registros antigos sem natureza no período.',8,{color:C.muted});
  return decorateReportPages(pages,{today,periodText});
}

let letterheadCache=null;
async function loadLetterheadJpeg(){
  if(letterheadCache)return letterheadCache;
  const response=await fetch('./assets/report-letterhead.jpg?rev=official-letterhead',{cache:'force-cache'});
  if(!response.ok)throw new Error('Não foi possível carregar o papel timbrado do relatório.');
  letterheadCache={bytes:new Uint8Array(await response.arrayBuffer()),width:1530,height:1980};
  return letterheadCache;
}

export async function buildFinancialReportPDFBytes({transactions,installments,invoiceStatuses,budgetsByMonth,monthKeys,comparisonMonthKey,contextMonthKeys,formatDate,formatBRL,monthLabel,today=new Date(),backgroundJpeg=null}){
  const model=buildFinancialReportModel({transactions,installments,invoiceStatuses,budgetsByMonth,monthKeys,monthLabel,today});
  const latestKey=model.keys[model.keys.length-1],comparisonKey=normalizeMonthKey(comparisonMonthKey||shiftKey(latestKey,-1));
  const currentKey=monthKey(new Date(today.getFullYear(),today.getMonth(),1,12));
  const comparisonCutoff=latestKey===currentKey?{[comparisonKey]:today.getDate()}:{};
  const comparisonModel=buildFinancialReportModel({transactions,installments,invoiceStatuses,budgetsByMonth,monthKeys:[comparisonKey],monthLabel,today,cutoffDaysByMonth:comparisonCutoff});
  const contextKeys=(contextMonthKeys&&contextMonthKeys.length?contextMonthKeys:Array.from({length:6},(_,i)=>shiftKey(latestKey,i-5))).map(normalizeMonthKey);
  const contextModel=buildFinancialReportModel({transactions,installments,invoiceStatuses,budgetsByMonth,monthKeys:contextKeys,monthLabel,today});
  const pages=buildAnalyticalPages({model,comparisonModel,contextModel,formatDate,formatBRL,monthLabel,today});
  const bg=backgroundJpeg||await loadLetterheadJpeg();
  const bytes=buildVisualPdf(pages,{backgroundJpeg:bg});
  return{model,bytes};
}

export async function downloadFinancialReportPDF(args){
  const {model,bytes}=await buildFinancialReportPDFBytes(args);
  const blob=new Blob([bytes],{type:'application/pdf'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;const first=model.keys[0].slice(0,7),last=model.keys[model.keys.length-1].slice(0,7);
  anchor.download=first===last?`family-finance-analise-${first}.pdf`:`family-finance-analise-${first}-a-${last}.pdf`;
  anchor.style.display='none';document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);return model;
}


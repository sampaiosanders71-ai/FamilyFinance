import { classifyTransaction } from './financial-ledger.js';
import { needsLegacyReview } from './financial-integrity.js';
const escapeCell=value=>'"'+String(value??'').replace(/"/g,'""').replace(/[\r\n]+/g,' ').replace(/^[=+@-]/,'\u0027$&')+'"';
export function financialRowsCSV({transactions=[],monthKeys=[],today=new Date()}={}){
  const months=new Set(monthKeys.map(k=>String(k).slice(0,7)));
  const cutoff=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const headers=['Data','Descrição','Categoria','Natureza registrada','Classificação no cálculo','Direção','Valor (R$)','Meta vinculada','Revisão necessária','Situação'];
  const lines=[headers.map(escapeCell).join(';')];
  const rows=(transactions||[]).filter(t=>months.has(String(t.occurred_on||'').slice(0,7))).sort((a,b)=>String(a.occurred_on).localeCompare(String(b.occurred_on)));
  for(const t of rows){
    const dir=Number(t.direction||0),kind=classifyTransaction(t),future=String(t.occurred_on)>cutoff;
    lines.push([t.occurred_on,t.description,t.category,t.financial_nature||'Anterior sem confirmação',kind,dir>0?'Entrada':dir<0?'Saída':'Ajuste',
      (Math.abs(Number(t.amount)||0)).toFixed(2).replace('.',','),t.goal_id||'',needsLegacyReview(t)?'Sim':'Não',future?'Previsto':'Efetivado'].map(escapeCell).join(';'));
  }
  return '\uFEFF'+lines.join('\r\n');
}
export function downloadFinancialRowsCSV(args){
  const csv=financialRowsCSV(args);const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`family-finance-lancamentos-${args.monthKeys?.[0]?.slice(0,7)||'periodo'}-a-${args.monthKeys?.at(-1)?.slice(0,7)||'periodo'}.csv`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}

// Explicit user classification overrides legacy keyword inference.
export function normalizeNatureText(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim()}
export function suggestNature(description,category=''){
 const s=normalizeNatureText(description),c=normalizeNatureText(category);
 if(/\b(reserva de hotel|reserva de mesa|reserva de passagem|reserva de viagem|reserva de restaurante|reserva de quarto|reserva de hospedagem|compra de|comprar|pagamento de)\b/.test(s))return null;
 if(/\b(resgate|resgatar|retirada da reserva|sacar da reserva|retirei da caixinha)\b/.test(s))return 'resgate';
 if(/\b(pix entre contas|transferencia propria|transferencia entre (minhas |as )?contas|movimentacao entre contas|transferi para minha conta)\b/.test(s))return 'transfer';
 if(/\b(reserva|reservinha|poupanca|poupar|poupei|guardei|guardar dinheiro|dinheiro guardado|cofrinho|caixinha|pe de meia|fundo de emergencia|investi|investir|investimento|investindo|aplicacao financeira|apliquei|aporte|cdb|cdi|tesouro direto|lci|lca|etf|renda fixa)\b/.test(s))return 'allocation';
 // A category such as Autoinvestimento is not sufficient evidence.
 return null;
}
export function transactionNature(row){
 if(['consumption','allocation','transfer','resgate','income'].includes(row?.financial_nature))return row.financial_nature;
 return null;
}
export function natureLabel(row){const n=transactionNature(row);return ({consumption:'Despesa de consumo',allocation:'Reserva / investimento',transfer:'Transferência própria',resgate:'Resgate',income:'Receita'})[n]||'Classificação anterior';}

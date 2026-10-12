// Identidade histórica: reconciliação de rótulos sem reescrever lançamentos antigos.
function key(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');}
export function canonicalCategoryName(name,categories=[]) {
 const value=String(name||'Outros').trim()||'Outros', k=key(value);
 const current=(categories||[]).filter(row=>key(row.name)===k);
 if(current.length===1)return current[0].name; // nome atual tem precedência sobre alias
 if(current.length>1)return value;
 const matched=(categories||[]).filter(row=>(row.name_history||[]).some(old=>key(old)===k));
 // Alias com vários donos não pode ser resolvido automaticamente.
 return matched.length===1?matched[0].name:value;
}
export function canonicalCategoryAmounts(amounts={},categories=[]) {
 const out={};for(const [name,value] of Object.entries(amounts||{})) {
  const canonical=canonicalCategoryName(name,categories);
  out[canonical]=(out[canonical]||0)+Number(value||0);
 }return out;
}
export function canonicalCategoryLimits(items=[],categories=[]) {
 const out={};for(const item of items||[]) {
  const canonical=canonicalCategoryName(item.category,categories);
  out[canonical]=(out[canonical]||0)+Number(item.limit_amount||0);
 }return out;
}

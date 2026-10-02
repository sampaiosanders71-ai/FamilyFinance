import { supabase } from './supabase.js';
import { getCurrentUser } from './database.js';

export const CATEGORY_DEFAULTS = [
  { kind:'expense', name:'Alimentação', origin:'default', default_key:'expense_food', icon_key:'food', color_key:'orange', sort_order:10 },
  { kind:'expense', name:'Transporte', origin:'default', default_key:'expense_transport', icon_key:'car', color_key:'blue', sort_order:20 },
  { kind:'expense', name:'Moradia', origin:'default', default_key:'expense_home', icon_key:'home', color_key:'green', sort_order:30 },
  { kind:'expense', name:'Saúde', origin:'default', default_key:'expense_health', icon_key:'health', color_key:'red', sort_order:40 },
  { kind:'expense', name:'Lazer', origin:'default', default_key:'expense_leisure', icon_key:'leisure', color_key:'purple', sort_order:50 },
  { kind:'expense', name:'Educação', origin:'default', default_key:'expense_education', icon_key:'education', color_key:'purple', sort_order:60 },
  { kind:'expense', name:'Assinaturas', origin:'default', default_key:'expense_subscriptions', icon_key:'subscription', color_key:'pink', sort_order:70 },
  { kind:'expense', name:'Dívidas', origin:'default', default_key:'expense_debt', icon_key:'debt', color_key:'red', sort_order:80 },
  { kind:'expense', name:'Investimento', origin:'default', default_key:'expense_investment', icon_key:'investment', color_key:'green', sort_order:90 },
  { kind:'expense', name:'Outros', origin:'system', default_key:'expense_other', icon_key:'more', color_key:'slate', sort_order:999 },
  { kind:'income', name:'Salário', origin:'default', default_key:'income_salary', icon_key:'salary', color_key:'green', sort_order:10 },
  { kind:'income', name:'Bolsa', origin:'default', default_key:'income_scholarship', icon_key:'education', color_key:'purple', sort_order:20 },
  { kind:'income', name:'Pensão', origin:'default', default_key:'income_pension', icon_key:'income', color_key:'green', sort_order:30 },
  { kind:'income', name:'Benefícios', origin:'default', default_key:'income_benefits', icon_key:'benefit', color_key:'blue', sort_order:40 },
  { kind:'income', name:'Rendimentos', origin:'default', default_key:'income_returns', icon_key:'investment', color_key:'green', sort_order:50 },
  { kind:'income', name:'Reembolso', origin:'default', default_key:'income_refund', icon_key:'refund', color_key:'teal', sort_order:60 },
  { kind:'income', name:'Outros', origin:'system', default_key:'income_other', icon_key:'more', color_key:'slate', sort_order:999 }
];

export const CATEGORY_ICON_OPTIONS = [
  ['tag','Categoria'],['food','Alimentação'],['car','Transporte'],['home','Moradia'],['health','Saúde'],
  ['education','Educação'],['leisure','Lazer'],['subscription','Assinaturas'],['debt','Dívidas'],
  ['investment','Investimento'],['salary','Salário'],['income','Receita'],['benefit','Benefícios'],
  ['refund','Reembolso'],['fuel','Combustível'],['gift','Presentes'],['pet','Pets'],['travel','Viagens'],['more','Outros']
];

export const CATEGORY_COLOR_OPTIONS = [
  ['orange','Laranja'],['blue','Azul'],['green','Verde'],['red','Vermelho'],['purple','Roxo'],
  ['pink','Rosa'],['yellow','Amarelo'],['teal','Turquesa'],['slate','Cinza']
];

const ICON_KEYS = new Set(CATEGORY_ICON_OPTIONS.map(([key])=>key));

const ICON_PATHS = {
  tag:'<path d="M20 13 13 20 4 11V4h7l9 9Z"/><circle cx="8.5" cy="8.5" r="1.2"/>',
  food:'<path d="M6 3v7M9 3v7M6 7h3M7.5 10v11"/><path d="M15 3v18M15 3c3 1 4 4 4 7h-4"/>',
  car:'<path d="M5 17h14l-1-7-2-4H8L6 10l-1 7Z"/><path d="M4 12h16M7 17v2M17 17v2"/><circle cx="8" cy="14.5" r="1"/><circle cx="16" cy="14.5" r="1"/>',
  home:'<path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10M9 20v-6h6v6"/>',
  health:'<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"/><path d="M9 12h6M12 9v6"/>',
  education:'<path d="m3 9 9-5 9 5-9 5-9-5Z"/><path d="M7 12v4c3 2 7 2 10 0v-4M21 10v6"/>',
  leisure:'<path d="M7 9h10a4 4 0 0 1 3.6 5.8L19 18h-3l-2-3h-4l-2 3H5l-1.6-3.2A4 4 0 0 1 7 9Z"/><path d="M8 11v4M6 13h4M16.5 12h.01M18.5 14h.01"/>',
  subscription:'<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 9h16M8 14h3"/>',
  debt:'<path d="M12 3v14M8 13l4 4 4-4"/><path d="M5 21h14"/>',
  investment:'<path d="M4 18 10 12l4 4 6-8"/><path d="M15 8h5v5"/>',
  salary:'<rect x="4" y="6" width="16" height="13" rx="2"/><path d="M8 6V4h8v2M12 9v7M14.5 11c-.7-1-4-1.2-4 .5s4 .7 4 2.5-3.3 1.6-4 .5"/>',
  income:'<circle cx="12" cy="12" r="8"/><path d="M12 16V8M9 11l3-3 3 3"/>',
  benefit:'<path d="M12 21s-7-4-7-10a4 4 0 0 1 7-2.8A4 4 0 0 1 19 11c0 6-7 10-7 10Z"/><path d="M8 5h8M12 2v6"/>',
  refund:'<path d="M8 7H4v-4"/><path d="M4 7a8 8 0 1 1-1 8"/><path d="M12 9v6M14 11.5c-.6-1-4-1.1-4 .4s4 .8 4 2.5"/>',
  fuel:'<path d="M6 21V4h9v17M5 21h11M8 8h5"/><path d="M15 7h2l2 2v7a1.5 1.5 0 0 0 3 0v-5l-2-2"/>',
  gift:'<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M3 9h18v-3H3v3ZM12 6v14"/><path d="M12 6H8.5A2.5 2.5 0 1 1 11 3.5L12 6ZM12 6h3.5A2.5 2.5 0 1 0 13 3.5L12 6Z"/>',
  pet:'<circle cx="8" cy="8" r="2"/><circle cx="16" cy="8" r="2"/><circle cx="5.5" cy="12" r="1.5"/><circle cx="18.5" cy="12" r="1.5"/><path d="M12 11c-3 0-5 3-5 5.2C7 18 8.5 19 10 18.4c1.2-.5 2.8-.5 4 0 1.5.6 3-.4 3-2.2C17 14 15 11 12 11Z"/>',
  travel:'<path d="M3 11h7l4-7 2 1-2 6h5l2-2h1l-1 4 1 4h-1l-2-2h-5l2 6-2 1-4-7H3l-2-2 2-2Z"/>',
  more:'<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'
};

function cleanName(value){return String(value??'').replace(/\s+/g,' ').trim()}

export function normalizeCategoryIconKey(iconKey='tag'){
  const key=String(iconKey||'tag').trim();
  return ICON_KEYS.has(key)?key:'tag';
}

export function categoryIconSVG(iconKey='tag',className='category-icon-svg'){
  const key=normalizeCategoryIconKey(iconKey);
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[key]||ICON_PATHS.tag}</svg>`;
}

// Compatibilidade com chamadas antigas. O app novo usa categoryIconSVG.
export function categoryGlyph(iconKey='tag'){
  return normalizeCategoryIconKey(iconKey);
}

async function ensureDefaults(user){
  const { data: existing, error } = await supabase.from('ff2_categories').select('kind,name,default_key').eq('user_id',user.id).eq('is_deleted',false);
  if(error)throw error;
  const identityKeys=new Set((existing||[]).map(row=>row.default_key).filter(Boolean));
  const legacyKeys=new Set((existing||[]).map(row=>`${row.kind}|${String(row.name).toLocaleLowerCase('pt-BR')}`));
  const missing=CATEGORY_DEFAULTS.filter(row=>!identityKeys.has(row.default_key)&&!legacyKeys.has(`${row.kind}|${row.name.toLocaleLowerCase('pt-BR')}`)).map(row=>({user_id:user.id,...row}));
  if(!missing.length)return;
  const { error: insertError }=await supabase.from('ff2_categories').insert(missing);
  if(insertError)throw insertError;
}

export async function listCategories(){
  const user=await getCurrentUser();
  await ensureDefaults(user);
  const { data,error }=await supabase.from('ff2_categories').select('*').eq('user_id',user.id).eq('is_deleted',false).order('kind').order('sort_order').order('name');
  if(error)throw error;
  return (data||[]).map(row=>({...row,icon_key:normalizeCategoryIconKey(row.icon_key)}));
}

export function activeCategories(rows,kind){
  return (rows||[]).filter(row=>!row.is_deleted&&row.is_active&&(row.kind===kind||row.kind==='both'));
}

export async function createCategory({kind,name,iconKey='tag',colorKey='orange'}){
  const user=await getCurrentUser();
  const cleaned=cleanName(name);
  if(!['income','expense'].includes(kind))throw new Error('Escolha se a categoria é de receita ou despesa.');
  if(cleaned.length<2||cleaned.length>60)throw new Error('O nome da categoria deve ter entre 2 e 60 caracteres.');
  const { data:duplicates,error:duplicateError }=await supabase.from('ff2_categories').select('id').eq('user_id',user.id).eq('kind',kind).eq('is_deleted',false).ilike('name',cleaned).limit(1);
  if(duplicateError)throw duplicateError;
  if((duplicates||[]).length)throw new Error(`A categoria “${cleaned}” já existe.`);
  const { data,error }=await supabase.from('ff2_categories').insert({
    user_id:user.id,kind,name:cleaned,origin:'custom',is_active:true,is_deleted:false,
    icon_key:normalizeCategoryIconKey(iconKey),color_key:String(colorKey||'orange'),sort_order:1000,updated_at:new Date().toISOString()
  }).select('*').single();
  if(error)throw error;
  return data;
}

export async function updateCategory(id,{name,iconKey,colorKey}){
  const user=await getCurrentUser();
  const cleaned=cleanName(name);
  if(cleaned.length<2||cleaned.length>60)throw new Error('O nome da categoria deve ter entre 2 e 60 caracteres.');
  const { data:current,error:currentError }=await supabase.from('ff2_categories').select('*').eq('id',id).eq('user_id',user.id).single();
  if(currentError)throw currentError;
  const safeName=current.origin==='system'?current.name:cleaned;
  const { data:dupes,error:dupeError }=await supabase.from('ff2_categories').select('id').eq('user_id',user.id).eq('kind',current.kind).eq('is_deleted',false).ilike('name',safeName);
  if(dupeError)throw dupeError;
  if((dupes||[]).some(row=>row.id!==id))throw new Error(`A categoria “${safeName}” já existe.`);
  const { data,error }=await supabase.from('ff2_categories').update({
    name:safeName,icon_key:normalizeCategoryIconKey(iconKey||current.icon_key),color_key:String(colorKey||current.color_key||'slate'),updated_at:new Date().toISOString()
  }).eq('id',id).eq('user_id',user.id).select('*').single();
  if(error)throw error;
  return data;
}

export async function setCategoryActive(id,active){
  const user=await getCurrentUser();
  const { data,error }=await supabase.from('ff2_categories').update({is_active:!!active,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id).eq('is_deleted',false).select('*').single();
  if(error)throw error;
  return data;
}

export async function deleteCustomCategory(id){
  const user=await getCurrentUser();
  const { data:current,error:currentError }=await supabase.from('ff2_categories').select('*').eq('id',id).eq('user_id',user.id).single();
  if(currentError)throw currentError;
  if(current.origin!=='custom')throw new Error('Categorias padrão podem ser ocultadas, mas não excluídas.');
  const { data,error }=await supabase.from('ff2_categories').update({is_active:false,is_deleted:true,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id).select('*').single();
  if(error)throw error;
  return data;
}

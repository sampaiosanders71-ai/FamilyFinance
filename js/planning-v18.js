import { supabase } from './supabase.js';
import { getCurrentUser, newRequestId } from './database.js';

export function planningMonthKey(value=new Date()){
  const date=value instanceof Date?value:new Date(`${String(value).slice(0,7)}-01T12:00:00`);
  if(Number.isNaN(date.getTime()))throw new TypeError('INVALID_PLANNING_MONTH');
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-01`;
}
export function planningMonthDate(value){const key=planningMonthKey(value);return new Date(Number(key.slice(0,4)),Number(key.slice(5,7))-1,1,12)}
export function shiftPlanningMonth(value,offset){const d=planningMonthDate(value);return new Date(d.getFullYear(),d.getMonth()+Number(offset||0),1,12)}
export function planningMonthInput(value){return planningMonthKey(value).slice(0,7)}
export function planningLocalISO(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function nextMonthKey(value){return planningMonthKey(shiftPlanningMonth(value,1))}

export async function listPlanningMonth(value=new Date()){
  const user=await getCurrentUser();const start=planningMonthKey(value),end=nextMonthKey(value);
  const {data,error}=await supabase.from('ff2_planning_items').select('*').eq('user_id',user.id).gte('planned_on',start).lt('planned_on',end).order('planned_on',{ascending:true}).order('created_at',{ascending:true});
  if(error)throw error;return data||[];
}
export async function listPlanningByMonths(monthKeys=[]){
  const user=await getCurrentUser();const keys=[...new Set((monthKeys||[]).map(planningMonthKey))].sort();if(!keys.length)return{};
  const start=keys[0],end=nextMonthKey(keys[keys.length-1]);
  const {data,error}=await supabase.from('ff2_planning_items').select('*').eq('user_id',user.id).gte('planned_on',start).lt('planned_on',end).order('planned_on',{ascending:true});
  if(error)throw error;const wanted=new Set(keys);const out=Object.fromEntries(keys.map(k=>[k,[]]));
  (data||[]).forEach(row=>{const key=`${String(row.planned_on).slice(0,7)}-01`;if(wanted.has(key))out[key].push(row)});return out;
}
export async function createPlanningItem(input){
  const user=await getCurrentUser();const row={user_id:user.id,direction:Number(input.direction)>0?1:-1,description:String(input.description||'').trim(),amount:Number(input.amount),planned_on:input.date,category:input.category||'Outros',status:'pending',notes:String(input.notes||'').trim()||null,client_request_id:newRequestId()};
  const {data,error}=await supabase.from('ff2_planning_items').insert(row).select('*').single();if(error)throw error;return data;
}
export async function updatePlanningItem(id,input){
  const user=await getCurrentUser();const changes={direction:Number(input.direction)>0?1:-1,description:String(input.description||'').trim(),amount:Number(input.amount),planned_on:input.date,category:input.category||'Outros',notes:String(input.notes||'').trim()||null,updated_at:new Date().toISOString()};
  const {data,error}=await supabase.from('ff2_planning_items').update(changes).eq('id',id).eq('user_id',user.id).eq('status','pending').select('*').single();if(error)throw error;return data;
}
export async function cancelPlanningItem(id){const user=await getCurrentUser();const {data,error}=await supabase.from('ff2_planning_items').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id).eq('status','pending').select('*').single();if(error)throw error;return data}
export async function completePlanningItem(id,realizedOn=planningLocalISO(new Date())){const {data,error}=await supabase.rpc('ff2_complete_planning_item',{p_item_id:id,p_realized_on:realizedOn});if(error)throw error;return data}
export async function movePlanningItem(id,targetDate){const {data,error}=await supabase.rpc('ff2_move_planning_item',{p_item_id:id,p_target_date:targetDate});if(error)throw error;return data}
export async function movePendingPlanningMonth(sourceMonth,targetMonth){const {data,error}=await supabase.rpc('ff2_move_pending_planning_month',{p_source_month:planningMonthKey(sourceMonth),p_target_month:planningMonthKey(targetMonth)});if(error)throw error;return Number(data||0)}
export function planningNextMonthDate(plannedOn){const d=new Date(`${plannedOn}T12:00:00`);const target=new Date(d.getFullYear(),d.getMonth()+1,1,12);const last=new Date(target.getFullYear(),target.getMonth()+1,0,12).getDate();target.setDate(Math.min(d.getDate(),last));return planningLocalISO(target)}
export function planningStatusLabel(item){if(item.status==='received')return'Recebido';if(item.status==='paid')return'Pago';if(item.status==='deferred')return'Adiado';if(item.status==='cancelled')return'Cancelado';return'Pendente'}
export function summarizePlanning(items=[]){
  const summary={plannedIncome:0,plannedExpense:0,plannedResult:0,received:0,paid:0,pendingIncome:0,pendingExpense:0,deferred:0,cancelled:0,completedCount:0,pendingCount:0,deferredCount:0,cancelledCount:0,totalCount:items.length,completionRate:0};
  items.forEach(item=>{const amount=Number(item.amount||0),dir=Number(item.direction||0);if(item.status!=='cancelled'){if(dir>0)summary.plannedIncome+=amount;else summary.plannedExpense+=amount}if(item.status==='received'){summary.received+=amount;summary.completedCount++}else if(item.status==='paid'){summary.paid+=amount;summary.completedCount++}else if(item.status==='pending'){if(dir>0)summary.pendingIncome+=amount;else summary.pendingExpense+=amount;summary.pendingCount++}else if(item.status==='deferred'){summary.deferred+=amount;summary.deferredCount++}else if(item.status==='cancelled'){summary.cancelled+=amount;summary.cancelledCount++}});
  summary.plannedResult=summary.plannedIncome-summary.plannedExpense;const base=summary.completedCount+summary.pendingCount+summary.deferredCount;summary.completionRate=base?summary.completedCount/base*100:0;return summary;
}
export function summarizePlanningPeriod(byMonth={},monthKeys=[]){return summarizePlanning((monthKeys||[]).flatMap(key=>byMonth[planningMonthKey(key)]||[]))}

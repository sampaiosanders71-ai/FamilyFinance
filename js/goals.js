import { operationIds, insertOnce } from './request-operation.js?v=2.9.20';
import { listAllRows } from './pagination.js?v=2.9.20';
import { supabase } from './supabase.js?v=2.9.20';
import { getCurrentUser } from './database.js?v=2.9.20';

export async function listGoals() {
  const user = await getCurrentUser();
  return listAllRows(options => supabase.from('ff2_goals').select('*',options).eq('user_id',user.id).order('created_at').order('id'), 'Metas');
}

export async function createGoal(input) {
  const user = await getCurrentUser();
  const row = {
    id: operationIds(input)[0],
    user_id:user.id, name:input.name.trim(), target_amount:Number(input.target), saved_amount:Number(input.saved || 0),
    due_date:input.dueDate || null, status:Number(input.saved || 0) >= Number(input.target) ? 'completed' : 'active'
  };
  return (await insertOnce(supabase, 'ff2_goals', row, user.id, 'id'))[0];
}

export async function updateGoal(id, input) {
  const user = await getCurrentUser();
  const saved = Number(input.saved || 0), target = Number(input.target);
  const { data, error } = await supabase.from('ff2_goals').update({
    name:input.name.trim(), target_amount:target, saved_amount:saved, due_date:input.dueDate || null,
    status:saved >= target ? 'completed' : 'active', updated_at:new Date().toISOString()
  }).eq('id', id).eq('user_id', user.id).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteGoal(id) {
  const user = await getCurrentUser();
  const { error } = await supabase.from('ff2_goals').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

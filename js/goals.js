import { supabase } from './supabase.js';
import { getCurrentUser } from './database.js';

export async function listGoals() {
  const user = await getCurrentUser();
  const { data, error } = await supabase.from('ff2_goals').select('*').eq('user_id', user.id).order('created_at');
  if (error) throw error;
  return data || [];
}

export async function createGoal(input) {
  const user = await getCurrentUser();
  const { data, error } = await supabase.from('ff2_goals').insert({
    user_id:user.id, name:input.name.trim(), target_amount:Number(input.target), saved_amount:Number(input.saved || 0),
    due_date:input.dueDate || null, status:Number(input.saved || 0) >= Number(input.target) ? 'completed' : 'active'
  }).select('*').single();
  if (error) throw error;
  return data;
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

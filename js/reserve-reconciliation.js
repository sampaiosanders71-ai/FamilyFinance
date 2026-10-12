import { supabase } from './supabase.js?v=2.9.20';
// A conciliação é persistida em um RPC com autorização e verificação de saldo independente.
export async function saveReserveReconciliation(transactionId,treatment){
  if(!transactionId || (treatment!==null&&!['separate','included'].includes(treatment)))throw new Error('Conciliação inválida.');
  const {data,error}=await supabase.rpc('ff2_reconcile_unlinked_reserve_299',{p_transaction_id:transactionId,p_treatment:treatment});
  if(error){
    if(String(error.message||'').includes('RESERVA_AVULSA_INSUFICIENTE'))throw new Error('A reserva avulsa não tem saldo suficiente para essa movimentação. Confira outros aportes e resgates antes de confirmar.');
    throw error;
  }
  return data;
}

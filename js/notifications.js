import { supabase } from './supabase.js';
import { getCurrentUser } from './database.js';
import { budgetSummary } from './budget.js';
import { cardInvoiceSummaries } from './cards.js';

function monthKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`}
function sameMonth(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()}

const NOTIFICATION_PAGE_SIZE=500;

export async function listNotifications(){
  const user=await getCurrentUser();
  const rows=[];
  for(let from=0;;from+=NOTIFICATION_PAGE_SIZE){
    const to=from+NOTIFICATION_PAGE_SIZE-1;
    const {data,error}=await supabase
      .from('ff2_notifications')
      .select('*')
      .eq('user_id',user.id)
      .order('created_at',{ascending:false})
      .order('id',{ascending:false})
      .range(from,to);
    if(error)throw error;
    const page=data||[];
    rows.push(...page);
    if(page.length<NOTIFICATION_PAGE_SIZE)break;
  }
  return rows;
}

export async function markNotificationRead(id){
  const user=await getCurrentUser();
  const {error}=await supabase.from('ff2_notifications').update({read_at:new Date().toISOString()}).eq('id',id).eq('user_id',user.id);
  if(error)throw error;
}

export async function markAllNotificationsRead(){
  const user=await getCurrentUser();
  const {error}=await supabase.from('ff2_notifications').update({read_at:new Date().toISOString()}).eq('user_id',user.id).is('read_at',null);
  if(error)throw error;
}

export async function markNotificationsForTarget(target,targetId){
  if(!target||!targetId)return;
  const user=await getCurrentUser();
  const {error}=await supabase.from('ff2_notifications').update({read_at:new Date().toISOString()}).eq('user_id',user.id).eq('target',target).eq('target_id',targetId).is('read_at',null);
  if(error)throw error;
}

export async function syncFinancialNotifications({budget,transactions,installments,cards,invoiceStatuses,goals}){
  const user=await getCurrentUser();
  const now=new Date();
  const rows=[];

  if(budget?.plan){
    const budgetMonth=new Date(`${String(budget.plan.month).slice(0,10)}T12:00:00`);
    if(!Number.isNaN(budgetMonth.getTime())&&sameMonth(budgetMonth,now)){
      const summary=budgetSummary(budget,transactions||[],installments||[],now);
      for(const item of budget.items||[]){
        const limit=Number(item.limit_amount||0);
        const spent=Number(summary.spentMap[item.category]||0);
        if(limit<=0||spent<=0)continue;
        const ratio=spent/limit;
        if(ratio>=1){
          rows.push({user_id:user.id,type:'budget_over',title:`Limite de ${item.category} ultrapassado`,body:`Você gastou ${Math.round(ratio*100)}% do limite de ${item.category} neste mês.`,target:'budget',target_id:budget.plan.id,event_key:`budget-over:${monthKey(now)}:${item.category}`});
        }else if(ratio>=0.8){
          rows.push({user_id:user.id,type:'budget_near',title:`${item.category} perto do limite`,body:`Você já utilizou ${Math.round(ratio*100)}% do limite de ${item.category} neste mês.`,target:'budget',target_id:budget.plan.id,event_key:`budget-near:${monthKey(now)}:${item.category}`});
        }
      }
    }
  }

  for(const goal of goals||[]){
    const target=Number(goal.target_amount||0),saved=Number(goal.saved_amount||0);
    if(target>0&&saved>=target&&goal.status!=='archived'){
      rows.push({user_id:user.id,type:'goal_reached',title:'Meta atingida',body:`Você alcançou a meta “${goal.name}”.`,target:'goals',target_id:goal.id,event_key:`goal-reached:${goal.id}`});
    }
  }

  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
  const summaries=cardInvoiceSummaries(cards||[],installments||[],invoiceStatuses||[],now);
  for(const summary of summaries){
    if(summary.total<=0||summary.status==='paid')continue;
    const due=new Date(summary.dueDate.getFullYear(),summary.dueDate.getMonth(),summary.dueDate.getDate(),12);
    const days=Math.ceil((due-today)/86400000);
    if(days<0||days>5)continue;
    const when=days===0?'vence hoje':days===1?'vence amanhã':`vence em ${days} dias`;
    rows.push({user_id:user.id,type:'invoice_due',title:`Fatura ${when}`,body:`A fatura de ${summary.card.name} ${when}. Confira o valor e o pagamento.`,target:'cards',target_id:summary.card.id,event_key:`invoice-due:${summary.card.id}:${summary.invoiceMonth}`});
  }

  if(!rows.length)return 0;
  const {error}=await supabase.from('ff2_notifications').upsert(rows,{onConflict:'user_id,event_key',ignoreDuplicates:true});
  if(error)throw error;
  return rows.length;
}

export async function subscribeNotifications(onChange){
  const user=await getCurrentUser();
  return supabase.channel(`ff2-notifications-${user.id}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'ff2_notifications',filter:`user_id=eq.${user.id}`},()=>{try{onChange?.()}catch(error){console.warn('Notificação em tempo real:',error)}})
    .subscribe(status=>{
      if(status==='SUBSCRIBED'){
        try{onChange?.()}catch(error){console.warn('Sincronização inicial de notificações:',error)}
      }
    });
}

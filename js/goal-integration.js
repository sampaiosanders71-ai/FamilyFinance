// Fonte única para o progresso das metas: base manual + aportes efetivados vinculados.
// O vínculo não cria outro lançamento; a exclusão/edição do aporte atualiza este cálculo.
export function goalProgress(goal, transactions=[],today=new Date()) {
  const now=typeof today==='string'?today:`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const base=Math.max(0,Number(goal?.saved_amount)||0);
  const target=Math.max(0,Number(goal?.target_amount)||0);
  let linked=0,pending=0,rescued=0,pendingRescues=0,count=0;
  for(const t of transactions||[]){
    if(!goal?.id||t.goal_id!==goal.id)continue;
    const isDeposit=t.financial_nature==='allocation'&&Number(t.direction)===-1;
    const isRescue=t.financial_nature==='resgate'&&Number(t.direction)===1;
    if(!isDeposit&&!isRescue)continue;
    const amount=Math.max(0,Number(t.amount)||0);
    if(String(t.occurred_on||'')<=now){if(isDeposit){linked+=amount;count++}else rescued+=amount;}
    else if(isDeposit) pending+=amount;
    else pendingRescues+=amount;
  }
  const linkedNet=Math.round((linked-rescued)*100)/100;
  const rawSaved=Math.round((base+linkedNet)*100)/100;
  const saved=Math.max(0,rawSaved);
  return {base,rawSaved,invalidBalance:rawSaved<0,linked:linkedNet,allocated:linked,rescued,pendingRescues,pending:Math.round(pending*100)/100,count,saved,target,remaining:Math.max(0,target-saved),percent:target>0?Math.max(0,Math.min(100,saved/target*100)):0,completed:target>0&&saved>=target};
}

// Dados de apoio para as três visões sem contar reservas como despesa de consumo.
export function financialViewSummary(period){
  const income=Number(period?.totals?.income||0);
  const consumption=Number(period?.totals?.totalExpense||0);
  const allocation=Number(period?.totals?.allocation||0);
  const allocationMap={};
  for(const month of period?.months||[]){
    for(const [category,amount] of Object.entries(month.allocationMap||{})){
      allocationMap[category]=(allocationMap[category]||0)+Number(amount||0);
    }
  }
  return {income,consumption,allocation,result:income-consumption,freeAfterAllocation:income-consumption-allocation,allocationCategories:Object.entries(allocationMap).map(([category,amount])=>({category,amount})).sort((a,b)=>b.amount-a.amount||a.category.localeCompare(b.category,'pt-BR'))};
}

// Money fields store no formatted strings in the ledger: callers read/write reais explicitly.
const formatter=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const el=value=>typeof value==='string'?document.getElementById(value):value;
const digits=value=>String(value||'').replace(/\D/g,'');
const normalized=value=>value.replace(/^0+(?=\d)/,'');
function paint(input,raw,right=0){
 if(!raw){input.value='';input.dataset.moneyDigits='';input.setCustomValidity('');return;}
 raw=normalized(raw);const cents=Number(raw);
 if(!Number.isSafeInteger(cents)){input.setCustomValidity('O valor informado é muito alto.');return;}
 input.value=formatter.format(cents/100);input.dataset.moneyDigits=raw;input.setCustomValidity('');
 if(document.activeElement===input){let pos=input.value.length,remaining=right;while(pos>0&&remaining>0){pos--;if(/\d/.test(input.value[pos]))remaining--; }input.setSelectionRange(pos,pos);}
}
export function moneyValue(value){const input=el(value);if(!input||!input.value.trim())return 0;const cents=Number(digits(input.value));return Number.isSafeInteger(cents)?cents/100:NaN;}
export function setMoney(value,amount){const input=el(value);if(!input)return;if(amount===''||amount===null||amount===undefined){paint(input,'');return;}const n=Number(amount);if(!Number.isFinite(n)||n<0){input.value='';input.setCustomValidity('Informe um valor monetário válido.');return;}paint(input,String(Math.round(n*100)));}
function pastedDigits(text){
 text=String(text).trim();if(!text||/-/.test(text))return null;
 if(!/^[\d\s.,R$]+$/i.test(text))return null;
 const clean=text.replace(/R\$|\s/g,'');
 if(clean.includes(',')){
  if(!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{0,2}$/.test(clean))return null;
  const [whole,fraction='']=clean.replace(/\./g,'').split(',');return whole+fraction.padEnd(2,'0');
 }
 if(/^\d+\.\d{1,2}$/.test(clean)){const [whole,fraction]=clean.split('.');return whole+fraction.padEnd(2,'0');}
 if(/^\d{1,3}(?:\.\d{3})+$/.test(clean)||/R\$/i.test(text))return digits(clean)+'00';
 return /^\d+$/.test(clean)?clean:null;
}
function rawSelection(input){const raw=input.dataset.moneyDigits??normalized(digits(input.value)),start=input.selectionStart??input.value.length,end=input.selectionEnd??start;return{raw,start:Math.max(0,raw.length-digits(input.value.slice(start)).length),end:Math.max(0,raw.length-digits(input.value.slice(end)).length)};}
function notify(input){input.dispatchEvent(new Event('input',{bubbles:true}));}
function insert(input,addition){const {raw,start,end}=rawSelection(input);paint(input,raw.slice(0,start)+addition+raw.slice(end),raw.length-end);notify(input);}
function enhance(input){
 if(input.dataset.moneyReady)return;input.dataset.moneyReady='1';const initial=input.value;
 input.type='text';input.inputMode='numeric';input.autocomplete='off';input.spellcheck=false;
 input.classList.add('money-input');input.placeholder='0,00';const control=document.createElement('span');control.className='money-control';const prefix=document.createElement('span');prefix.className='money-prefix';prefix.textContent='R$';prefix.setAttribute('aria-hidden','true');input.before(control);control.append(prefix,input);setMoney(input,initial);
 input.defaultValue=input.value;
 input.addEventListener('beforeinput',event=>{
  if(input.readOnly||input.disabled||event.isComposing)return;
  if(event.inputType==='insertText'){
   event.preventDefault();if(/^\d+$/.test(event.data||''))insert(input,event.data);return;
  }
  if(['deleteContentBackward','deleteContentForward','deleteByCut'].includes(event.inputType)){
   event.preventDefault();let {raw,start,end}=rawSelection(input);
   if(start===end){if(event.inputType==='deleteContentBackward')start=Math.max(0,start-1);else if(event.inputType==='deleteContentForward')end=Math.min(raw.length,end+1);}
   paint(input,raw.slice(0,start)+raw.slice(end),raw.length-end);notify(input);
  }
 });
 input.addEventListener('paste',event=>{if(input.readOnly||input.disabled)return;event.preventDefault();const text=event.clipboardData.getData('text'),raw=pastedDigits(text);if(raw===null){input.setCustomValidity('Cole um valor como R$ 1.234,56.');input.reportValidity();return;}insert(input,raw);});
 input.addEventListener('input',()=>{const current=digits(input.value),raw=current?normalized(current):'';if(input.value===(raw?formatter.format(Number(raw)/100):'')&&input.dataset.moneyDigits===raw)return;paint(input,raw);});
}
export function initMoneyInputs(){
 document.querySelectorAll('input[data-money]').forEach(enhance);
 document.addEventListener('reset',event=>queueMicrotask(()=>event.target.querySelectorAll('[data-money]').forEach(input=>{input.setCustomValidity('');paint(input,normalized(digits(input.value)));})));
 document.addEventListener('change',event=>{event.target.closest('form')?.querySelectorAll('input[data-money]').forEach(input=>input.setCustomValidity(''));});
 document.addEventListener('submit',event=>{
  for(const input of event.target.querySelectorAll('input[data-money]')){
   if(input.disabled||input.readOnly)continue;const value=moneyValue(input);
   const invalid=input.value!==''&&(!Number.isFinite(value)||input.hasAttribute('min')&&value<Number(input.min)||input.hasAttribute('max')&&input.max!==''&&value>Number(input.max));
   input.setCustomValidity(invalid?'Informe um valor dentro do intervalo permitido.':'');
   if(invalid){event.preventDefault();event.stopImmediatePropagation();input.reportValidity();return;}
  }
 },true);
}

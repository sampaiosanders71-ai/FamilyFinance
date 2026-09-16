const activeControllers=new WeakMap();
const clamp=value=>Math.max(0,Math.min(100,Number(value)||0));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function ensureStructure(button){
  if(button.querySelector('.ff-download-content'))return;
  button.dataset.ffDownloadOriginalHtml=button.innerHTML;
  const rect=button.getBoundingClientRect();
  if(rect.width>0)button.style.width=`${Math.ceil(rect.width)}px`;
  if(rect.height>0)button.style.height=`${Math.ceil(rect.height)}px`;
  button.classList.add('ff-download-motion');
  button.innerHTML='<span class="ff-download-fill" aria-hidden="true"></span><span class="ff-download-content"><span class="ff-download-orb" aria-hidden="true"></span><span class="ff-download-label">Preparando…</span></span>';
}

function restore(button){
  const original=button.dataset.ffDownloadOriginalHtml;
  if(original!==undefined)button.innerHTML=original;
  button.classList.remove('ff-download-motion');
  button.removeAttribute('data-download-state');
  button.style.removeProperty('--ff-download-progress');
  button.style.removeProperty('width');
  button.style.removeProperty('height');
  button.disabled=false;
  delete button.dataset.ffDownloadOriginalHtml;
  button.removeAttribute('aria-busy');
}

export function beginDownloadMotion(button,{initialLabel='Preparando…'}={}){
  if(!button)return null;
  activeControllers.get(button)?.cancel?.();
  ensureStructure(button);
  button.disabled=true;
  button.setAttribute('aria-busy','true');
  button.dataset.downloadState='working';
  const label=button.querySelector('.ff-download-label');
  const orb=button.querySelector('.ff-download-orb');
  let current=0;
  let cancelled=false;
  let ticker=null;

  const paint=(progress,text)=>{
    current=Math.max(current,clamp(progress));
    button.style.setProperty('--ff-download-progress',String(current/100));
    if(label)label.textContent=text||`${Math.round(current)}%`;
  };
  if(label)label.textContent=initialLabel;
  paint(4,initialLabel);

  // Progresso visual avança suavemente até 88% e então aguarda o arquivo real ficar pronto.
  ticker=setInterval(()=>{
    if(cancelled||current>=88)return;
    const step=current<35?5:current<65?3:1.5;
    paint(Math.min(88,current+step),`${Math.round(Math.min(88,current+step))}%`);
  },120);

  const controller={
    setProgress(progress,text){if(!cancelled)paint(progress,text)},
    async complete({hold=820}={}){
      if(cancelled)return;
      clearInterval(ticker);ticker=null;
      paint(100,'100%');
      await wait(220);
      if(cancelled)return;
      button.dataset.downloadState='success';
      if(orb){orb.textContent='✓';orb.style.animation='none';void orb.offsetWidth;orb.style.animation=''}
      if(label)label.textContent='Concluído';
      button.removeAttribute('aria-busy');
      await wait(hold);
      if(!cancelled)restore(button);
      activeControllers.delete(button);
    },
    async fail(message='Tentar novamente',{hold=1100}={}){
      if(cancelled)return;
      clearInterval(ticker);ticker=null;
      button.dataset.downloadState='error';
      if(orb)orb.textContent='!';
      if(label)label.textContent=message;
      button.removeAttribute('aria-busy');
      await wait(hold);
      if(!cancelled)restore(button);
      activeControllers.delete(button);
    },
    cancel(){
      if(cancelled)return;
      cancelled=true;
      clearInterval(ticker);ticker=null;
      restore(button);
      activeControllers.delete(button);
    }
  };
  activeControllers.set(button,controller);
  return controller;
}

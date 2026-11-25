(() => {
  const $ = (s, node=document) => node.querySelector(s);
  const $$ = (s, node=document) => Array.from(node.querySelectorAll(s));
  const menu=$('.mobile-nav'), toggle=$('.menu-toggle');
  function showMenu(open,focus=false){
    menu.hidden=!open;
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');
    if(focus)toggle.focus();
  }
  toggle.addEventListener('click',()=>showMenu(menu.hidden));
  menu.addEventListener('click',e=>{if(e.target.closest('a'))showMenu(false)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden)showMenu(false,true)});
  document.addEventListener('pointerdown',e=>{if(!menu.hidden&&!e.target.closest('.mast'))showMenu(false)});
  matchMedia('(min-width:801px)').addEventListener('change',e=>{if(e.matches)showMenu(false)});

  const motion=matchMedia('(prefers-reduced-motion: reduce)'), fine=matchMedia('(hover:hover) and (pointer:fine)');
  function pointResponse(node,change,reset) {
    let frame=0,evt=null,bounds=null;
    const cancel=()=>{cancelAnimationFrame(frame);frame=0;evt=null;bounds=null;reset()};
    node.addEventListener('pointerenter',()=>{bounds=node.getBoundingClientRect()});
    node.addEventListener('pointermove',e=>{
      if(motion.matches||!fine.matches||e.pointerType==='touch')return;
      evt=e;
      if(frame)return;
      frame=requestAnimationFrame(()=>{
        frame=0;
        if(!evt)return;
        const r=bounds||node.getBoundingClientRect();
        change(Math.min(1,Math.max(0,(evt.clientX-r.left)/r.width)),Math.min(1,Math.max(0,(evt.clientY-r.top)/r.height)));
      });
    });
    node.addEventListener('pointerleave',cancel);
    window.addEventListener('scroll',()=>{bounds=null},{passive:true});
    motion.addEventListener('change',cancel);
  }
  const magnet=$('.mast-contact');
  pointResponse(magnet,(x,y)=>{magnet.style.setProperty('--mx',(x-.5)*6+'px');magnet.style.setProperty('--my',(y-.5)*4+'px')},()=>{magnet.style.removeProperty('--mx');magnet.style.removeProperty('--my')});
  for(const card of $$('.material-hover,.order-steps article,.contact-copy,.plan-drawing,.hero-copy,.spec-card')){
    pointResponse(card,(x,y)=>{
      card.style.setProperty('--gx',x*100+'%');card.style.setProperty('--gy',y*100+'%');
      card.style.setProperty('--sx',(x-.5)*13+'px');card.style.setProperty('--sy',(y-.5)*8+'px');
      card.style.setProperty('--glow','1');card.style.setProperty('--shine','95px');
    },()=>{for(const prop of ['--gx','--gy','--sx','--sy','--glow','--shine'])card.style.removeProperty(prop)});
  }
  const band=$('#material-study');
  if(band){
    let scheduled=false,observed=false;
    function paint(){
      scheduled=false;if(!observed)return;
      const rect=band.getBoundingClientRect();
      const p=Math.min(1,Math.max(0,(innerHeight-rect.top)/(innerHeight*.53+rect.height*.45)));
      band.style.setProperty('--spread',motion.matches?'0':(1-p).toFixed(4));
      band.dataset.progress=p.toFixed(4);
    }
    const tick=()=>{if(observed&&!scheduled){scheduled=true;requestAnimationFrame(paint)}};
    new IntersectionObserver(([entry])=>{observed=entry.isIntersecting;if(observed)tick()},{rootMargin:'12% 0px'}).observe(band);
    addEventListener('scroll',tick,{passive:true});addEventListener('resize',tick);motion.addEventListener('change',tick);
  }
  const search=$('#catalog-search');
  if(!search)return;
  const rows=$$('.catalog-row'),buttons=$$('[data-filter]'),empty=$('#no-matches'),count=$('#catalog-count');
  let chosen='all';
  const fold=s=>s.toLocaleLowerCase('ru').replaceAll('ё','е').trim();
  function refresh(){
    const keywords=fold(search.value).split(/\s+/).filter(Boolean);
    let total=0;
    for(const row of rows){
      const tagged=!!row.dataset.price;
      const visible=(chosen==='all'||(chosen==='price'?tagged:!tagged))&&keywords.every(k=>fold(row.dataset.terms).includes(k));
      row.hidden=!visible;if(visible)total++;
    }
    for(const b of buttons)b.setAttribute('aria-pressed',String(b.dataset.filter===chosen));
    count.textContent='Найдено моделей: '+total;empty.hidden=total!==0;
  }
  search.addEventListener('input',refresh);
  for(const b of buttons)b.addEventListener('click',()=>{chosen=b.dataset.filter;refresh()});
  $('#clear-search').addEventListener('click',()=>{chosen='all';search.value='';refresh();search.focus()});
  window.addEventListener('pageshow',refresh);
})();

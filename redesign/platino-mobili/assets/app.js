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
  matchMedia('(min-width:1031px)').addEventListener('change',e=>{if(e.matches)showMenu(false)});

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
    const wrap=$('.material-wrap',band), drawing=$('.strata-panel',band);
    const pieces=Object.fromEntries($$('[data-part]',drawing).map(part=>[part.dataset.part,part]));
    const steps=$$('.assembly-steps li',band);
    let scheduled=false, nearby=true;
    const clamp=n=>Math.max(0,Math.min(1,n));
    function ease(value,from,to){
      const t=clamp((value-from)/(to-from));
      return t*t*(3-2*t);
    }
    function shift(name,x,y){
      pieces[name].setAttribute('transform','translate('+x.toFixed(2)+' '+y.toFixed(2)+')');
    }
    function paint(){
      scheduled=false;
      const still=motion.matches;
      band.toggleAttribute('data-scrolling',!still);
      const header=$('.mast').offsetHeight;
      // Use the drawing's original position within the section, including while it is sticky.
      const entry=innerHeight-drawing.offsetTop-Math.min(75,drawing.offsetHeight*.16);
      const runway=Math.max(0,band.offsetHeight-wrap.offsetHeight);
      const distance=Math.max(180,entry-header+runway*.86);
      const p=still ? .43 : clamp((entry-band.getBoundingClientRect().top)/distance);
      const build=1-ease(p,0,.36),insert=1-ease(p,.35,.69),seat=1-ease(p,.67,.99);
      shift('base',-8*build,-8*build);
      shift('back',11*build,-32*build);
      shift('left',-29*build,-16*build);
      shift('partition',8*build,-14*build);
      shift('return',36*build,-12*build);
      shift('front',-19*build,12*build);
      shift('drawer',-61*insert,36*insert);
      shift('counter',15*seat,-49*seat);
      const active=p<.35?0:p<.69?1:2;
      steps.forEach((step,i)=>{
        if(!still && i===active)step.setAttribute('aria-current','step');
        else step.removeAttribute('aria-current');
      });
      band.dataset.progress=p.toFixed(4);
    }
    function tick(){if(!scheduled){scheduled=true;requestAnimationFrame(paint)}}
    new IntersectionObserver(([entry])=>{nearby=entry.isIntersecting;if(nearby)tick()},{rootMargin:'35% 0px'}).observe(band);
    addEventListener('scroll',()=>{if(nearby&&!motion.matches)tick()},{passive:true});
    addEventListener('resize',tick);motion.addEventListener('change',tick);
    new ResizeObserver(tick).observe(wrap);
    paint();
  }

  const viewer=$('.gallery-dialog');
  if(viewer && typeof viewer.showModal==='function'){
    const items=$$('.view-sample'),picture=$('.viewer-stage img',viewer);
    const stage=$('.viewer-stage',viewer),close=$('.viewer-close',viewer);
    const controls=$$('.viewer-controls button',viewer);
    let current=0,opener=null,touch=null;
    function show(index){
      current=(index+items.length)%items.length;
      const item=items[current];
      picture.alt=$('img',item).alt;
      picture.src=item.href;
      $('.viewer-title',viewer).textContent=item.dataset.caption;
      $('.viewer-count',viewer).textContent=(current+1)+' / '+items.length;
    }
    if(items.length<2)$('.viewer-controls',viewer).hidden=true;
    items.forEach((item,i)=>item.addEventListener('click',e=>{
      if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
      e.preventDefault();opener=item;show(i);viewer.showModal();close.focus({preventScroll:true});
    }));
    close.addEventListener('click',()=>viewer.close());
    viewer.addEventListener('close',()=>{touch=null;opener?.focus({preventScroll:true})});
    controls.forEach(button=>button.addEventListener('click',()=>show(current+Number(button.dataset.shift))));
    viewer.addEventListener('keydown',e=>{
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
        e.preventDefault();show(current+(e.key==='ArrowRight'?1:-1));
      }
    });
    stage.addEventListener('touchstart',e=>{touch=e.touches.length===1?e.touches[0]:null},{passive:true});
    stage.addEventListener('touchcancel',()=>{touch=null});
    stage.addEventListener('touchend',e=>{
      if(!touch||e.touches.length)return;
      const end=e.changedTouches[0],dx=end.clientX-touch.clientX,dy=end.clientY-touch.clientY;
      if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.35)show(current+(dx<0?1:-1));
      touch=null;
    },{passive:true});
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

(() => {
  const $=(q,root=document)=>root.querySelector(q);
  const $$=(q,root=document)=>[...root.querySelectorAll(q)];
  const menu=$('#mobile-nav'),trigger=$('.menu-trigger');
  function setMenu(open,restore=false){
    menu.hidden=!open;trigger.setAttribute('aria-expanded',String(open));trigger.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');
    if(restore)trigger.focus();
  }
  trigger.addEventListener('click',()=>setMenu(menu.hidden));
  menu.addEventListener('click',event=>{if(event.target.closest('a'))setMenu(false);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden)setMenu(false,true);});
  document.addEventListener('pointerdown',e=>{if(!menu.hidden&&!e.target.closest('.mast'))setMenu(false);});
  document.addEventListener('focusin',e=>{if(!menu.hidden&&!e.target.closest('.mast'))setMenu(false);});
  matchMedia('(min-width:761px)').addEventListener('change',e=>{if(e.matches)setMenu(false);});

  const animationAllowed=matchMedia('(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)');
  let moving=null,raf=0,px=0,py=0;
  function clearMotion(el){if(!el)return;for(const k of ['--px','--py','--mx','--my','--light'])el.style.removeProperty(k);}
  function motion(){
    raf=0;if(!moving)return;
    const b=moving.getBoundingClientRect();const x=Math.min(1,Math.max(0,(px-b.left)/b.width)),y=Math.min(1,Math.max(0,(py-b.top)/b.height));
    if(moving.matches('.magnet')){moving.style.setProperty('--mx',(x-.5)*6+'px');moving.style.setProperty('--my',(y-.5)*5+'px');}
    else if(moving.hasAttribute('data-trace'))moving.style.setProperty('--light',Math.round(x*100)+'%');
    else {moving.style.setProperty('--px',(x-.5)*9+'px');moving.style.setProperty('--py',(y-.5)*8+'px');}
  }
  document.addEventListener('pointermove',e=>{
    if(!animationAllowed.matches||e.pointerType==='touch')return;
    const target=e.target.closest('[data-shift],[data-trace],.magnet');
    if(target!==moving){clearMotion(moving);moving=target;}
    if(!target)return;
    px=e.clientX;py=e.clientY;if(!raf)raf=requestAnimationFrame(motion);
  },{passive:true});
  document.addEventListener('pointerout',e=>{if(!e.relatedTarget){clearMotion(moving);moving=null;}});
  animationAllowed.addEventListener('change',()=>{clearMotion(moving);moving=null;});

  for(const list of $$('[data-list]')){
    const results=$('[data-results]',list), cards=[...results.children];
    const search=$('[data-search-input]',list), filters=$$('[data-filter]',list), sort=$('[data-sort]',list);
    let filter='all',direction=0;
    const norm=s=>s.toLocaleLowerCase('ru').replaceAll('ё','е').trim();
    const refresh=()=>{
      const term=norm(search.value);let count=0;
      for(const c of cards){
        const year=c.dataset.year||'none';
        c.hidden=!(norm(c.dataset.search).includes(term)&&(filter==='all'||filter===year));
        if(!c.hidden)count++;
      }
      $('.list-count',list).textContent=(list.dataset.list==='projects'?'Проектов: ':'Вариантов: ')+count;
      $('.list-empty',list).hidden=count!==0;
      for(const f of filters)f.setAttribute('aria-pressed',String(f.dataset.filter===filter));
    };
    search.addEventListener('input',refresh);
    for(const f of filters)f.addEventListener('click',()=>{filter=f.dataset.filter;refresh();});
    if(sort)sort.addEventListener('click',()=>{
      direction=direction===1?-1:1;
      const ordered=[...cards].sort((a,b)=>{
        const ap=Number(a.dataset.price),bp=Number(b.dataset.price);
        const aq=ap===999999999,bq=bp===999999999;
        return aq===bq?direction*(ap-bp):Number(aq)-Number(bq);
      });
      results.append(...ordered);sort.textContent=direction===1?'Сначала дешевле':'Сначала дороже';
    });
    $('[data-clear]',list).addEventListener('click',()=>{filter='all';search.value='';refresh();search.focus();});
    refresh();
  }

  for(const gallery of $$('[data-gallery]')){
    const main=$('.gallery-main',gallery),display=$('.main-picture',gallery),thumbs=$$('.thumb',gallery);
    const dlg=$('.lightbox',gallery),enlarged=$('img',dlg),count=$('.gallery-count',gallery);
    const total=thumbs.length||1;
    let index=0, committed=0, version=0;
    const pending=new Map();
    function loadFull(url){
      if(!pending.has(url)){
        const img=new Image();img.src=url;
        const promise=img.decode().catch(error=>{pending.delete(url);throw error;});
        pending.set(url,promise);
      }
      return pending.get(url);
    }
    function warmAdjacent(){
      if(thumbs.length<2)return;
      const next=thumbs[(committed+1)%total].href;
      loadFull(next).catch(()=>{});
    }
    async function show(n){
      index=(n+total)%total;
      const target=index,ticket=++version,current=thumbs[target];
      const url=current?current.href:main.href;
      if(target!==committed){
        gallery.setAttribute('aria-busy','true');
        try{await loadFull(url);}
        catch{
          if(ticket===version){index=committed;gallery.removeAttribute('aria-busy');if(count)count.textContent='Не удалось загрузить вид. Попробуйте ещё раз.';}
          return;
        }
      }
      if(ticket!==version)return;
      committed=target;
      if(current){
        main.href=url;display.src=url;display.alt=$('img',current).alt;
        thumbs.forEach((el,i)=>{if(i===committed)el.setAttribute('aria-current','true');else el.removeAttribute('aria-current');});
      }
      const caption='Вид '+(committed+1)+' из '+total;
      if(count)count.textContent=caption;
      if(dlg.open){enlarged.src=url;enlarged.alt=display.alt;$('.light-count',dlg).textContent=caption;}
      gallery.removeAttribute('aria-busy');warmAdjacent();
    }
    if(display.complete)warmAdjacent();
    else display.addEventListener('load',warmAdjacent,{once:true});
    for(const t of thumbs)t.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey)return;e.preventDefault();show(Number(t.dataset.image));});
    for(const btn of $$('[data-step]',gallery))btn.addEventListener('click',()=>show(index+Number(btn.dataset.step)));
    main.addEventListener('click',e=>{
      if(e.ctrlKey||e.metaKey||e.shiftKey||!dlg.showModal)return;
      e.preventDefault();dlg.showModal();show(index);$('.close-light',dlg).focus({preventScroll:true});
    });
    $('.close-light',dlg).addEventListener('click',()=>dlg.close());
    dlg.addEventListener('close',()=>main.focus({preventScroll:true}));
    dlg.addEventListener('click',e=>{if(e.target===dlg){const b=dlg.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dlg.close();}});
    gallery.addEventListener('keydown',e=>{
      if(total<2||!['ArrowRight','ArrowLeft'].includes(e.key))return;
      e.preventDefault();show(index+(e.key==='ArrowRight'?1:-1));if(e.target.closest('.thumb'))thumbs[index].focus();
    });
    let start=null;
    dlg.addEventListener('touchstart',e=>{start=e.touches.length===1?[e.touches[0].clientX,e.touches[0].clientY]:null;},{passive:true});
    dlg.addEventListener('touchend',e=>{if(!start)return;const t=e.changedTouches[0],dx=t.clientX-start[0],dy=t.clientY-start[1];if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.6)show(index+(dx<0?1:-1));start=null;},{passive:true});
  }
})();

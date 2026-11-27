'use strict';
(() => {
  const one = (selector, parent = document) => parent.querySelector(selector);
  const all = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const navButton = one('.nav-toggle');
  const mobileNav = one('#mobile-nav');
  function closeNav(focus = false) {
    mobileNav.hidden = true;
    navButton.setAttribute('aria-expanded', 'false');
    navButton.setAttribute('aria-label', 'Открыть меню');
    if (focus) navButton.focus();
  }
  navButton.addEventListener('click', () => {
    if (!mobileNav.hidden) return closeNav();
    mobileNav.hidden = false;
    navButton.setAttribute('aria-expanded', 'true');
    navButton.setAttribute('aria-label', 'Закрыть меню');
  });
  document.addEventListener('click', event => {
    if (!mobileNav.hidden && (!mobileNav.contains(event.target) && !navButton.contains(event.target) || event.target.closest('#mobile-nav a'))) closeNav();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileNav.hidden) closeNav(true);
  });
  document.addEventListener('focusin', event => {
    if (!mobileNav.hidden && !mobileNav.contains(event.target) && !one('.site-header').contains(event.target)) closeNav();
  });
  matchMedia('(min-width: 951px)').addEventListener('change', () => closeNav());

  // Use the full-size original in a single, keyboard- and touch-operable viewer.
  const lightbox = one('#lightbox');
  const fullPhoto = one('#full-photo');
  const caption = one('#photo-caption');
  const position = one('#photo-index');
  let gallery = [], index = 0, opener;
  function paintPhoto() {
    const item = gallery[index];
    fullPhoto.alt = item.dataset.caption;
    fullPhoto.src = item.href;
    caption.textContent = item.dataset.caption;
    position.textContent = (index + 1) + ' / ' + gallery.length;
    one('.view-tools').hidden = gallery.length < 2;
  }
  function step(amount) {
    if (gallery.length < 2) return;
    index = (index + amount + gallery.length) % gallery.length;
    paintPhoto();
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-group]');
    if (!link || event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !lightbox.showModal) return;
    event.preventDefault();
    opener = link;
    gallery = all('a[data-group]').filter(item => item.dataset.group === link.dataset.group);
    index = gallery.indexOf(link);
    paintPhoto();
    lightbox.showModal();
    one('[data-close]').focus({preventScroll:true});
  });
  one('[data-close]').addEventListener('click', () => lightbox.close());
  one('[data-prev]').addEventListener('click', () => step(-1));
  one('[data-next]').addEventListener('click', () => step(1));
  lightbox.addEventListener('click', event => {
    if (event.target === lightbox || event.target.matches('.viewer,.viewer-image,.view-top')) lightbox.close();
  });
  lightbox.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  lightbox.addEventListener('close', () => {
    if(lightbox.open)return;
    fullPhoto.removeAttribute('src');
    opener?.focus({preventScroll:true});
  });
  let finger;
  fullPhoto.addEventListener('touchstart', event => {
    finger = event.touches.length === 1 ? [event.touches[0].clientX,event.touches[0].clientY] : null;
  }, {passive:true});
  fullPhoto.addEventListener('touchend', event => {
    if (!finger) return;
    const x = event.changedTouches[0].clientX-finger[0], y = event.changedTouches[0].clientY-finger[1];
    if (Math.abs(x) > 46 && Math.abs(x) > 1.5*Math.abs(y)) step(x < 0 ? 1 : -1);
    finger = null;
  }, {passive:true});

  const filterButtons = all('[data-filter]');
  function filterRental(name) {
    if (!filterButtons.some(b => b.dataset.filter === name)) name = 'all';
    filterButtons.forEach(b => b.setAttribute('aria-pressed',String(b.dataset.filter === name)));
    const cards=all('[data-category]');
    cards.forEach(c => { c.hidden = name !== 'all' && c.dataset.category !== name; });
    const count=cards.filter(c=>!c.hidden).length;
    one('#rental-count').textContent=count+' '+(count===1?'вариант':count>1 && count<5?'варианта':'вариантов');
  }
  if (filterButtons.length) {
    filterRental(new URL(location.href).searchParams.get('category') || 'all');
    filterButtons.forEach(button => button.addEventListener('click', () => {
      filterRental(button.dataset.filter);
      const url=new URL(location.href);
      if (button.dataset.filter==='all') url.searchParams.delete('category');
      else url.searchParams.set('category',button.dataset.filter);
      if(location.protocol!=='file:')history.replaceState(history.state,'',url);
    }));
  }
  const form = one('#request-form');
  if (form) {
    const picker = one('#interest-choice'), list=one('#interest-list');
    const choices = all('[role="option"]',list), current=one('#interest-current');
    const summary=one('#request-summary'), success=one('#request-success');
    const picks=all('[data-pick]'), result=one('#selected-result'), reset=one('.reset-compare'), visit=one('#compare-visit');
    const visitor=one('#visitor'), contact=one('#reply'), wishes=one('#wishes');
    let selected='general', active=0, word='',wordTimer;
    function clearSuccess() {
      success.hidden=true;
      form.hidden=false;
    }
    function select(value, syncAddress = true) {
      const chosen = choices.find(o=>o.dataset.value === value);
      if (!chosen) return;
      selected=value;
      if(syncAddress && location.protocol!=='file:'){
        const url=new URL(location.href);
        if(value==='general')url.searchParams.delete('interest');else url.searchParams.set('interest',value);
        if(url.href!==location.href)history.replaceState(history.state,'',url);
      }
      current.textContent=chosen.textContent;
      choices.forEach(o=>o.setAttribute('aria-selected',String(o===chosen)));
      const saleModel=picks.find(b=>b.dataset.pick===value);
      picks.forEach(b=>b.setAttribute('aria-pressed',String(b===saleModel)));
      result.textContent=saleModel?'К прослушиванию: '+chosen.textContent:'Выберите инструмент для прослушивания';
      reset.hidden=!saleModel;visit.hidden=!saleModel;
      clearSuccess();
    }
    function closeList() {
      list.hidden=true;
      picker.setAttribute('aria-expanded','false');
      picker.removeAttribute('aria-activedescendant');
      choices.forEach(o=>o.classList.remove('active'));
    }
    function setActive(i) {
      active=clamp(i,0,choices.length-1);
      choices.forEach((o,j)=>o.classList.toggle('active',j===active));
      picker.setAttribute('aria-activedescendant',choices[active].id);
      const row=choices[active];
      if (row.offsetTop<list.scrollTop) list.scrollTop=row.offsetTop-4;
      if (row.offsetTop+row.offsetHeight>list.scrollTop+list.clientHeight) list.scrollTop=row.offsetTop+row.offsetHeight-list.clientHeight+4;
    }
    function openList() {
      const r=picker.getBoundingClientRect();
      const top=one('.site-header').getBoundingClientRect().bottom;
      const below=innerHeight-r.bottom-12, above=r.top-top-10;
      const up=below<215 && above>below;
      list.classList.toggle('above',up);
      list.style.setProperty('--list-space',Math.max(50,up?above:below)+'px');
      list.hidden=false;
      picker.setAttribute('aria-expanded','true');
      setActive(choices.findIndex(o=>o.dataset.value===selected));
    }
    picker.addEventListener('click',()=>list.hidden?openList():closeList());
    list.addEventListener('mousedown',e=>e.preventDefault());
    list.addEventListener('click',e=>{
      const o=e.target.closest('[role="option"]');
      if (!o) return;
      select(o.dataset.value);closeList();picker.focus({preventScroll:true});
    });
    picker.addEventListener('keydown',e=>{
      if (e.key==='Tab') {closeList();return;}
      if (e.key==='Escape') {if (!list.hidden) {e.preventDefault();closeList();} return;}
      if (['ArrowDown','ArrowUp','Enter',' ','Home','End'].includes(e.key)) {
        e.preventDefault();
        if (list.hidden) {openList();if(e.key==='Home')setActive(0);if(e.key==='End')setActive(choices.length-1);return;}
        if(e.key==='Enter' || e.key===' ') {select(choices[active].dataset.value);closeList();return;}
        setActive(e.key==='Home'?0:e.key==='End'?choices.length-1:active+(e.key==='ArrowDown'?1:-1));
      } else if (e.key.length===1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if(list.hidden)openList();
        clearTimeout(wordTimer);word+=e.key.toLocaleLowerCase('ru');wordTimer=setTimeout(()=>{word='';},600);
        const found=choices.findIndex(o=>o.textContent.toLocaleLowerCase('ru').startsWith(word));
        if(found>=0)setActive(found);
      }
    });
    document.addEventListener('pointerdown',e=>{if(!e.target.closest('.picker'))closeList();});
    picker.addEventListener('blur',e=>{if(!one('.picker').contains(e.relatedTarget))closeList();});
    window.addEventListener('resize',()=>{if(!list.hidden)closeList();});
    let listFrame;
    addEventListener('scroll',()=>{if(!list.hidden && !listFrame)listFrame=requestAnimationFrame(()=>{listFrame=0;if(!list.hidden)closeList();});},{passive:true});

    const angles=all('[data-angle]');
    function angle(value) {
      angles.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.angle===value)));
      all('[data-view]').forEach(v=>{v.hidden=v.dataset.view!==value;});
    }
    angles.forEach(b=>b.addEventListener('click',()=>angle(b.dataset.angle)));
    picks.forEach(b=>b.addEventListener('click',()=>select(b.dataset.pick)));
    reset.addEventListener('click',()=>{select('general');angle('0');picks[0].focus({preventScroll:true});});
    select(new URL(location.href).searchParams.get('interest')||'general',false);
    clearSuccess();
    document.addEventListener('click', e=>{
      const a=e.target.closest('a[href*="?interest="]');
      if(!a || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)return;
      const target=new URL(a.href);
      const same=target.origin===location.origin && target.pathname.replace(/index\.html$/,'')===location.pathname.replace(/index\.html$/,'');
      const value=target.searchParams.get('interest');
      if(!same || !choices.some(o=>o.dataset.value===value))return;
      e.preventDefault();select(value,false);
      history.pushState(null,'',location.protocol==='file:'?target.hash:target);one('#request').scrollIntoView();picker.focus({preventScroll:true});
    });
    addEventListener('popstate',()=>{
      if(location.protocol==='file:')return;
      const restored=new URL(location.href).searchParams.get('interest')||'general';
      if(restored!==selected)select(restored,false);
    });
    function showError(input,message) {
      const box=one('#'+input.id+'-error');
      box.textContent=message;
      input.setAttribute('aria-invalid',String(Boolean(message)));
    }
    [visitor,contact].forEach(input=>input.addEventListener('input',()=>showError(input,'')));
    form.addEventListener('submit',e=>{
      e.preventDefault();
      closeList();
      const name=visitor.value.trim(), reply=contact.value.trim();
      const digits=reply.replace(/\D/g,'');
      const phone=/^[+\d\s().-]+$/.test(reply)&&digits.length>=7&&digits.length<=15;
      const email=/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(reply);
      showError(visitor,name?'':'Введите ваше имя.');
      showError(contact,phone||email?'':'Укажите телефон с кодом или полный адрес почты.');
      if (!name || !phone&&!email) {(name?contact:visitor).focus();return;}
      const details=[current.textContent,'Контакт для связи — '+reply];
      if(wishes.value.trim())details.push('Пожелания — '+wishes.value.trim());
      summary.textContent=name+', ваш запрос: '+details.join('. ')+'.';
      form.hidden=true;success.hidden=false;
      success.focus();
    });
    one('#again').addEventListener('click',()=>{
      form.reset();[visitor,contact].forEach(i=>showError(i,''));summary.textContent='';
      select('general');angle('0');picker.focus();
    });
  }

  // Pointer input changes decorative layers while hit targets and text stay fixed.
  const hero=one('#hero'), stage=one('#piano-stage'), mechanism=one('.mechanism-visual');
  const magnet=one('.contact-magnet');
  let turn=0, tilt=0, touchStart=null;
  let pending, frame=0, last;
  function clearPointer(el) {
    if(!el)return;
    ['--dx','--dy','--px','--py','--rx','--ry','--mx','--my','--shine-x','--shine-y','--gleam'].forEach(key=>el.style.removeProperty(key));
  }
  function pointerPaint() {
    frame=0;
    if(!pending||reduced.matches||!fine.matches)return;
    const {el,clientX,clientY}=pending;
    const r=el.getBoundingClientRect();
    const x=clamp((clientX-r.left)/r.width*2-1,-1,1),y=clamp((clientY-r.top)/r.height*2-1,-1,1);
    if(el===hero){
      const area=stage.getBoundingClientRect();
      turn=clamp((clientX-area.left)/area.width*2-1,-1,1);
      tilt=clamp((clientY-area.top)/area.height*2-1,-1,1);
      stage.style.setProperty('--shine-x',(50+turn*32)+'%');
      stage.style.setProperty('--shine-y',(45+tilt*29)+'%');
      queueScroll();
    }else if(el===magnet){
      el.style.setProperty('--mx',x*3+'px');el.style.setProperty('--my',y*2+'px');
    }else{
      el.style.setProperty('--dx',x*3.8+'px');el.style.setProperty('--dy',y*3+'px');
      el.style.setProperty('--gleam',(50+42*x)+'%');
    }
  }
  function clearLast() {
    clearPointer(last===hero?stage:last);
    if(last && last===hero){turn=0;tilt=0;queueScroll();}
    last=null;pending=null;
  }
  document.addEventListener('pointermove',e=>{
    if(!fine.matches||reduced.matches||e.pointerType==='touch')return;
    const el=e.target.closest('.contact-magnet,[data-pointer],.hero');
    if(el!==last){clearLast();last=el;}
    if(!el)return;
    pending={el,clientX:e.clientX,clientY:e.clientY};
    if(!frame)frame=requestAnimationFrame(pointerPaint);
  },{passive:true});
  document.addEventListener('pointerout',e=>{if(!e.relatedTarget)clearLast();},{passive:true});
  if(!hero)return;
  const svg=one('.piano-art',stage);
  const paintGrand=window.createGrandPiano(svg);
  const scene=one('#mechanism'), panel=one('.mechanism-stick',scene), header=one('.site-header');
  const key=one('.part-key',scene), jack=one('.part-jack',scene), hammer=one('.part-hammer',scene);
  const damper=one('.part-damper',scene), strings=all('.part-string path',scene), steps=all('.action-steps li',scene);
  let scrollFrame=0, heroIn=true, sceneIn=true, lastGrand='', lastAction=-1;
  function cameraSemantics(){
    stage.tabIndex=reduced.matches?-1:0;
    stage.setAttribute('role',reduced.matches?'img':'slider');
    stage.setAttribute('aria-label',reduced.matches?'Эскиз рояля Blutner 230':'Ракурс рояля Blutner 230');
    if(reduced.matches){
      ['aria-valuenow','aria-valuemin','aria-valuemax','aria-valuetext'].forEach(n=>stage.removeAttribute(n));
    }else{
      stage.setAttribute('aria-valuemin','-17');stage.setAttribute('aria-valuemax','17');
    }
  }
  stage.addEventListener('keydown',event=>{
    if(reduced.matches||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    event.preventDefault();
    const direction=['ArrowRight','ArrowUp'].includes(event.key)?1:-1;
    turn=event.key==='Home'?-1:event.key==='End'?1:clamp(turn+direction*.25,-1,1);
    queueScroll();
  });
  stage.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch'&&!reduced.matches)touchStart={id:e.pointerId,x:e.clientX,y:e.clientY,turn};
  },{passive:true});
  stage.addEventListener('pointermove',e=>{
    if(!touchStart||e.pointerId!==touchStart.id||reduced.matches)return;
    const dx=e.clientX-touchStart.x,dy=e.clientY-touchStart.y;
    if(Math.abs(dx)<8 || Math.abs(dx)<Math.abs(dy))return;
    turn=clamp(touchStart.turn+dx/110,-1,1);
    queueScroll();
  },{passive:true});
  function endDrag(){touchStart=null;}
  stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);
  const smooth=(a,b,p)=>{
    const t=clamp((p-a)/(b-a),0,1);
    return t*t*(3-2*t);
  };
  function paintAction(p) {
    if(p===lastAction)return;
    lastAction=p;
    const press=smooth(.02,.40,p)*(1-smooth(.74,.98,p));
    const flight=smooth(.13,.43,p)*(1-.77*smooth(.43,.55,p))*(1-smooth(.72,.91,p));
    const lift=smooth(.09,.34,p)*(1-smooth(.76,.95,p));
    key.setAttribute('transform','rotate('+(-7*press).toFixed(2)+' 228 191)');
    jack.setAttribute('transform','translate(0 '+(-10*press).toFixed(2)+') rotate('+(-5.4*press).toFixed(2)+' 277 177)');
    hammer.setAttribute('transform','rotate('+(-15.2*flight).toFixed(2)+' 323 188)');
    damper.setAttribute('transform','translate(0 '+(-21*lift).toFixed(2)+')');
    const time=clamp((p-.43)/.5,0,1);
    const vibration=10*Math.sin(time*Math.PI*8)*(1-time)*smooth(0,.055,time);
    strings.forEach((string,i)=>{
      const y=72+i*4, a=vibration*(1-i*.12);
      string.setAttribute('d','M95 '+y+'C200 '+(y+a).toFixed(2)+' 237 '+(y+a*1.35).toFixed(2)+' 327 '+y+'S474 '+(y-a*1.3).toFixed(2)+' 563 '+y);
    });
    const current=p<.36?0:p<.76?1:2;
    steps.forEach((step,i)=>{
      if(i===current&&!reduced.matches)step.setAttribute('aria-current','step');
      else step.removeAttribute('aria-current');
    });
    scene.dataset.phase=String(current+1);
    scene.dataset.progress=p.toFixed(4);
  }
  function drawScroll(){
    scrollFrame=0;
    const headerHeight=header.offsetHeight;
    if(heroIn){
      const box=hero.getBoundingClientRect();
      const travel=reduced.matches?0:clamp((headerHeight-box.top)/(box.height*.70),0,1);
      const x=reduced.matches?0:turn, y=reduced.matches?0:tilt;
      const signature=[x,y,travel].map(v=>v.toFixed(4)).join(',');
      if(signature!==lastGrand){
        paintGrand(x,y,travel);
        lastGrand=signature;
      }
      if(!reduced.matches){
        const degrees=Math.round(x*17);
        stage.setAttribute('aria-valuenow',String(degrees));
        stage.setAttribute('aria-valuetext',degrees===0?'Исходный ракурс':Math.abs(degrees)+'° '+(degrees>0?'вправо':'влево'));
      }
    }
    if(sceneIn || reduced.matches){
      const bounds=scene.getBoundingClientRect(), viewport=innerHeight;
      let progress;
      if(reduced.matches)progress=.43;
      else if(scene.classList.contains('scrub')){
        progress=bounds.top>headerHeight
          ? .18*clamp((viewport-bounds.top)/Math.max(1,viewport-headerHeight),0,1)
          : .18+.82*clamp((headerHeight-bounds.top)/Math.max(1,bounds.height-panel.offsetHeight),0,1);
      }else{
        const figure=mechanism.getBoundingClientRect();
        progress=clamp((viewport-figure.top-figure.height*.45)/Math.max(1,viewport-headerHeight-figure.height*.45),0,1);
      }
      paintAction(Math.round(progress*10000)/10000);
    }
  }
  function queueScroll(){if(!scrollFrame&&(heroIn||sceneIn||reduced.matches))scrollFrame=requestAnimationFrame(drawScroll);}
  function measureScene(){
    const style=getComputedStyle(panel);
    const naturalHeight=panel.firstElementChild.offsetHeight+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom);
    scene.classList.toggle('scrub',!reduced.matches && naturalHeight <= innerHeight-header.offsetHeight-8);
    queueScroll();
  }
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.target===hero)heroIn=e.isIntersecting;else sceneIn=e.isIntersecting;});
    queueScroll();
  },{rootMargin:'100px 0px'});
  observer.observe(hero);observer.observe(scene);
  new ResizeObserver(measureScene).observe(panel);
  cameraSemantics();measureScene();drawScroll();
  addEventListener('scroll',queueScroll,{passive:true});addEventListener('resize',measureScene);
  reduced.addEventListener('change',()=>{clearLast();lastAction=-1;lastGrand='';turn=tilt=0;cameraSemantics();measureScene();});
})();

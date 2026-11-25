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
  matchMedia('(min-width: 776px)').addEventListener('change', () => closeNav());

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
    if (event.target !== lightbox) return;
    const r = lightbox.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) lightbox.close();
  });
  lightbox.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  lightbox.addEventListener('close', () => {
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
      for(const [key,val] of Object.entries({'--px':x*13+'px','--py':y*6+'px','--rx':-y*6+'deg','--ry':x*10+'deg','--shine-x':(50+x*32)+'%','--shine-y':(45+y*29)+'%'}))stage.style.setProperty(key,val);
    }else if(el===magnet){
      el.style.setProperty('--mx',x*3+'px');el.style.setProperty('--my',y*2+'px');
    }else{
      el.style.setProperty('--dx',x*3.8+'px');el.style.setProperty('--dy',y*3+'px');
      el.style.setProperty('--gleam',(50+42*x)+'%');
    }
  }
  function clearLast() {clearPointer(last===hero?stage:last);last=null;pending=null;}
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
  const lid=one('#grand-lid'), stayLines=all('#grand-stay path'), pieces=['.part-key','.part-hammer','.part-string'].map(s=>one(s));
  let scrollFrame=0, heroIn=true, partsIn=true;
  function drawScroll(){
    scrollFrame=0;
    if(heroIn){
      const r=hero.getBoundingClientRect(),motion=reduced.matches?0:clamp((one('.site-header').offsetHeight-r.top)/r.height,0,1);
      const theta=(82+14*motion)*Math.PI/180, c=Math.cos(theta),s=Math.sin(theta);
      lid.setAttribute('transform','matrix('+[1.27*c,.235*c-.83*s,.73,-.7,49,467-.83*154].join(' ')+')');
      const start=[49+1.27*289+.73*128,467+.235*289-.70*128-.83*148];
      const end=[49+1.27*240*c+.73*155,467+.235*240*c-.70*155-.83*(154+240*s)];
      stayLines.forEach(line=>line.setAttribute('d','M'+start.join(' ')+'L'+end.join(' ')));
    }
    if(partsIn){
      const rect=mechanism.getBoundingClientRect();
      const progress=reduced.matches?0.64:clamp((innerHeight-rect.top)/(innerHeight*.74+rect.height*.4),0,1);
      pieces[0].style.transform='translate('+((1-progress)*-30)+'px,'+((1-progress)*12)+'px) rotate('+(progress*-4)+'deg)';
      pieces[1].style.transform='translate('+((1-progress)*24)+'px,'+((1-progress)*22)+'px) rotate('+((1-progress)*16-progress*5)+'deg)';
      pieces[2].style.transform='translateY('+((1-progress)*-27)+'px)';
    }
  }
  function queueScroll(){if(!scrollFrame && (heroIn||partsIn))scrollFrame=requestAnimationFrame(drawScroll);}
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.target===hero)heroIn=e.isIntersecting;else partsIn=e.isIntersecting;});
    queueScroll();
  },{rootMargin:'65px 0px'});
  observer.observe(hero);observer.observe(mechanism);
  drawScroll();
  addEventListener('scroll',queueScroll,{passive:true});addEventListener('resize',queueScroll);
  reduced.addEventListener('change',()=>{clearLast();queueScroll();});
})();

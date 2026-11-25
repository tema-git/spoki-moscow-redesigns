(() => {
  'use strict';
  const one = (selector, scope = document) => scope.querySelector(selector);
  const all = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const read = id => JSON.parse(document.getElementById(id).textContent);
  const base = document.body.dataset.base;
  const money = value => value ? Math.round(value).toLocaleString('ru-RU') + ' ₽' : 'Цена по запросу';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(pointer: fine)');
  const menu = one('.menu-button');
  const nav = one('#mobile-menu');
  function setMenu(open) {
    nav.hidden = !open;
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  }
  menu.addEventListener('click', () => setMenu(nav.hidden));
  nav.addEventListener('click', () => setMenu(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !nav.hidden) { setMenu(false); menu.focus(); }
  });
  document.addEventListener('pointerdown', event => {
    if (!nav.hidden && !event.target.closest('.top')) setMenu(false);
  });
  matchMedia('(max-width: 890px)').addEventListener('change', () => setMenu(false));

  const hero = one('.hero');
  const boards = one('.finish-stack');
  let scrollFrame = 0;
  function renderScroll() {
    scrollFrame = 0;
    if (reduced.matches) return;
    if (hero) {
      const rect = hero.getBoundingClientRect();
      const t = Math.max(0, Math.min(1, (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar')) - rect.top) / Math.min(370, rect.height)));
      hero.style.setProperty('--top-lift', (-18 * t).toFixed(1) + 'px');
      hero.style.setProperty('--desk-float', (3 * t).toFixed(1) + 'px');
      hero.style.setProperty('--scroll-drawer', (15 * t).toFixed(2));
    }
    if (boards) {
      const rect = boards.getBoundingClientRect();
      const enter = Math.max(0, Math.min(1, (innerHeight - rect.top) / (innerHeight * .62 + rect.height * .25)));
      boards.style.setProperty('--spread', (1 - enter).toFixed(3));
    }
  }
  const scheduleScroll = () => {
    if (!scrollFrame && !reduced.matches && (hero || boards)) scrollFrame = requestAnimationFrame(renderScroll);
  };
  addEventListener('scroll', scheduleScroll, {passive:true});
  addEventListener('resize', scheduleScroll, {passive:true});
  if (hero && 'ResizeObserver' in window) new ResizeObserver(scheduleScroll).observe(hero);
  reduced.addEventListener('change', scheduleScroll);
  scheduleScroll();

  let pointerFrame = 0, lastEvent = null, lastHover = null;
  const deskReset = () => {
    if (!hero) return;
    for (const key of ['--desk-x','--desk-y','--drawer-x','--drawer-y']) hero.style.removeProperty(key);
  };
  function pointerUpdate() {
    pointerFrame = 0;
    if (!lastEvent || reduced.matches || !fine.matches) return;
    const {target,clientX,clientY} = lastEvent;
    const current = target.closest('[data-react],.contact-pill');
    if (lastHover && current !== lastHover) {
      for (const key of ['--photo-x','--photo-y','--mag-x','--mag-y']) lastHover.style.removeProperty(key);
    }
    lastHover = current;
    if (current) {
      const r = current.getBoundingClientRect();
      const x = (clientX-r.left)/Math.max(1,r.width)-.5, y = (clientY-r.top)/Math.max(1,r.height)-.5;
      current.style.setProperty('--photo-x',(x*9).toFixed(1)+'px');
      current.style.setProperty('--photo-y',(y*7).toFixed(1)+'px');
      if (current.classList.contains('contact-pill')) {
        current.style.setProperty('--mag-x',(x*7).toFixed(1)+'px');
        current.style.setProperty('--mag-y',(y*5).toFixed(1)+'px');
      }
    }
    if (hero && hero.contains(target)) {
      const r=hero.getBoundingClientRect(), x=(clientX-r.left)/r.width, y=(clientY-r.top)/r.height;
      hero.style.setProperty('--desk-y',((x-.5)*25).toFixed(1)+'deg');
      hero.style.setProperty('--desk-x',((.5-y)*16).toFixed(1)+'deg');
      hero.style.setProperty('--drawer-x',(-5-x*32).toFixed(1)+'px');
      hero.style.setProperty('--drawer-y',(2+x*15).toFixed(1)+'px');
    } else deskReset();
  }
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !fine.matches || reduced.matches) return;
    lastEvent=event;
    if (!pointerFrame) pointerFrame=requestAnimationFrame(pointerUpdate);
  }, {passive:true});
  document.documentElement.addEventListener('pointerleave', () => {
    lastEvent=null; deskReset();
    if (lastHover) for (const key of ['--photo-x','--photo-y','--mag-x','--mag-y']) lastHover.style.removeProperty(key);
  });
  all('[data-hero]').forEach(button => button.addEventListener('click', () => {
    const idx=button.dataset.hero;
    all('.hero-slide').forEach(slide => { slide.hidden = slide.dataset.slide!==idx; });
    all('[data-hero]').forEach(b => b.setAttribute('aria-pressed',String(b===button)));
  }));

  const dialog = one('.lightbox');
  const lightPhoto = one('.light-stage img',dialog);
  let album=[], active=0, opener=null;
  function renderLight() {
    const item=album[active];
    lightPhoto.src=item.src;lightPhoto.alt=item.alt;
    one('#light-title',dialog).textContent=item.alt;
    one('.light-count',dialog).textContent=(active+1)+' / '+album.length;
    const original=one('.light-original',dialog);
    original.href=item.full||item.src;
    all('[data-light-step]',dialog).forEach(b=>{b.hidden=album.length<2;});
  }
  function openLight(items,index,trigger) {
    if (!items.length) return;
    album=items;active=index;opener=trigger;renderLight();dialog.showModal();
    one('.end-light',dialog).focus();
  }
  function stepLight(direction) {
    if (!album.length) return;
    active=(active+direction+album.length)%album.length;renderLight();
  }
  all('[data-light-step]',dialog).forEach(btn=>btn.addEventListener('click',()=>stepLight(Number(btn.dataset.lightStep))));
  function closeLight(){
    const trigger=opener;opener=null;dialog.close();
    if(trigger?.isConnected)trigger.focus({preventScroll:true});
  }
  one('.end-light',dialog).addEventListener('click',closeLight);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeLight();});
  dialog.addEventListener('click',event=>{if(event.target===dialog && !event.target.closest('.light-stage')) {
    const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) closeLight();
  }});
  dialog.addEventListener('keydown',event=>{
    if (event.key==='ArrowRight' || event.key==='ArrowLeft') { event.preventDefault();stepLight(event.key==='ArrowRight'?1:-1); }
  });
  let touchX=null;
  one('.light-stage',dialog).addEventListener('touchstart',event=>{touchX=event.touches[0].clientX;},{passive:true});
  one('.light-stage',dialog).addEventListener('touchend',event=>{
    if(touchX!==null){const dx=event.changedTouches[0].clientX-touchX;if(Math.abs(dx)>45)stepLight(dx<0?1:-1);}
    touchX=null;
  },{passive:true});
  all('[data-gallery]').forEach(group=>group.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-photo]');if(!trigger)return;
    const buttons=all('[data-photo]',group);
    openLight(buttons.map(b=>({src:b.dataset.photo,alt:b.dataset.alt,full:b.dataset.orig})),buttons.indexOf(trigger),trigger);
  }));

  const catalog=one('#catalog-records');
  if(catalog){
    const records=read('catalog-records'), grid=one('.catalog-grid'), find=one('.catalog-search input'), more=one('.more-products'),empty=one('.empty-results'),count=one('.result-count');
    const str=v=>String(v||'').toLocaleLowerCase('ru-RU').replaceAll('ё','е').trim();
    let results=records,shown=Math.min(18,records.length);
    function makeCard(r){
      const a=document.createElement('a');a.href=base+'items/'+r.i+'/index.html';a.className='product-card';a.setAttribute('data-react','');
      const photo=document.createElement('div');photo.className='product-photo';
      if(r.t){const img=new Image();img.src=base+r.t;img.loading='lazy';img.decoding='async';img.alt=r.n;photo.append(img);}
      else{const empty=document.createElement('span');empty.textContent='Открыть карточку';photo.append(empty);}
      const info=document.createElement('div');info.className='product-lines';
      const title=document.createElement('span');title.className='product-name';title.textContent=r.n;
      const price=document.createElement('strong');price.textContent=money(r.p);
      info.append(title,price);a.append(photo,info);return a;
    }
    function appendBatch(){
      const chunk=results.slice(shown,shown+18), frag=new DocumentFragment();
      chunk.forEach(r=>frag.append(makeCard(r)));grid.append(frag);shown+=chunk.length;
      more.hidden=shown>=results.length;
    }
    find.addEventListener('input',()=>{
      const words=str(find.value).split(/\s+/).filter(Boolean);
      results=records.filter(r=>words.every(w=>str(r.n+' '+r.s+' OK'+r.i).includes(w)));shown=0;
      grid.replaceChildren();appendBatch();empty.hidden=!!results.length;count.textContent='Найдено моделей: '+results.length;
    });
    more.addEventListener('click',()=>{
      const old=shown;appendBatch();grid.children[old]?.focus({preventScroll:true});
    });
    all('.group-menu').forEach(menu=>menu.addEventListener('toggle',()=>{
      if(menu.open)all('.group-menu').filter(m=>m!==menu).forEach(m=>m.open=false);
    }));
  }

  if(one('#item-data')){
    const product=read('item-data'), thumbs=all('[data-thumb]'), main=one('[data-main-photo]');
    let photoIndex=0;
    function showPhoto(index,bringIntoView=false){
      if (!product.album[index] || !main)return;
      photoIndex=index;const item=product.album[index],img=one('img',main);
      img.src=item.src;img.alt=item.alt;
      thumbs.forEach((b,i)=>b.setAttribute('aria-pressed',String(index===i)));
      if(bringIntoView) thumbs[index]?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
    }
    thumbs.forEach((b,i)=>{
      b.addEventListener('click',()=>showPhoto(i));
      b.addEventListener('keydown',event=>{
        if(event.key==='ArrowLeft' || event.key==='ArrowRight'){event.preventDefault();const n=(i+(event.key==='ArrowRight'?1:-1)+thumbs.length)%thumbs.length;showPhoto(n,true);thumbs[n].focus({preventScroll:true});}
      });
    });
    if(main)main.addEventListener('click',()=>openLight(product.album,photoIndex,main));
    const plan=one('[data-item-plan]'),request=one('[data-item-request]'),params=new URLSearchParams(location.search);
    const requested=params.get('v'), sz=all('[name="item-size"]');
    if(requested!==null){const match=sz.find(r=>r.value===requested);if(match)match.checked=true;}
    function calcPrice(basePrice,options){
      if(!basePrice)return 0;
      return options.reduce((amount,input)=>(amount+1)*(1+(Number(input.dataset.markup)||0)/100)-1,basePrice);
    }
    function refreshProduct(){
      const sizeIndex=Number(one('[name="item-size"]:checked')?.value||0), variant=product.variants[sizeIndex];
      const options=all('input[data-markup]:checked');
      one('.item-price').textContent=money(calcPrice(variant?.price||product.basePrice,options));
      all('[data-table-price]').forEach(cell=>{const j=Number(cell.dataset.tablePrice);cell.textContent=money(calcPrice(product.variants[j].price,options));cell.parentElement.classList.toggle('active',j===sizeIndex);});
      const finishes=options.map(f=>f.dataset.name);
      const caption=one('.selected-finishes');if(caption)caption.textContent=finishes.join(' · ');
      const info=[product.name,variant?.label?variant.label+' мм':'',...finishes].filter(Boolean).join(', ');
      request.href=base+'contacts/index.html?'+new URLSearchParams({model:info})+'#request';
      if(plan){
        plan.hidden=!(variant?.length>0 && variant?.width>0);
        plan.href=base+'primerka/index.html?'+new URLSearchParams({item:product.id,v:sizeIndex,...(finishes.length?{finish:finishes.join(', ')}:{})});
      }
    }
    one('.item-purchase').addEventListener('change',refreshProduct);refreshProduct();
  }

  all('.request-form').forEach(form=>{
    const person=form.elements.person,reply=form.elements.reply,interest=form.elements.interest;
    const initial=new URLSearchParams(location.search).get('model')||'';
    if(initial)interest.value=initial.slice(0,1800);
    const submit=one('[type="submit"]',form);submit.disabled=false;
    const success=one('.form-success',form.parentElement);
    function validate(){
      person.setCustomValidity(person.value.trim()?'':'Введите имя.');
      const value=reply.value.trim(),digits=value.replace(/\D/g,'');
      const goodMail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const goodPhone=/^\+?[\d\s().-]+$/.test(value)&&digits.length>=7&&digits.length<=15;
      reply.setCustomValidity(goodMail||goodPhone?'':'Укажите номер телефона или электронную почту.');
    }
    person.addEventListener('input',validate);reply.addEventListener('input',validate);
    form.addEventListener('submit',event=>{
      event.preventDefault();validate();if(!form.reportValidity())return;
      form.hidden=true;success.hidden=false;success.focus({preventScroll:true});form.reset();interest.value='';person.setCustomValidity('');reply.setCustomValidity('');
    });
    one('.new-request',success).addEventListener('click',()=>{
      success.hidden=true;form.hidden=false;interest.value=initial;person.focus();
    });
  });
})();

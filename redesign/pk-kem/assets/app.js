(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const all = (s, root = document) => [...root.querySelectorAll(s)];
  const rub = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const menu = $('.topnav'), menuKey = $('.menu-key');
  function closeMenu(focus = false) {
    menu.classList.remove('open');
    menuKey.setAttribute('aria-expanded', 'false');
    menuKey.setAttribute('aria-label', 'Открыть меню');
    if (focus) menuKey.focus();
  }
  menuKey.addEventListener('click', () => {
    if (menu.classList.contains('open')) return closeMenu();
    menu.classList.add('open');
    menuKey.setAttribute('aria-expanded', 'true');
    menuKey.setAttribute('aria-label', 'Закрыть меню');
  });
  menu.addEventListener('click', () => closeMenu());
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('open')) closeMenu(true);
  });
  document.addEventListener('click', e => {
    if (menu.classList.contains('open') && !e.target.closest('.site-header')) closeMenu();
  });
  document.addEventListener('focusin', e => {
    if (menu.classList.contains('open') && !e.target.closest('.site-header')) closeMenu();
  });
  const hero = $('.hero'), art = $('.art-stage'), process = $('.binding-track');
  const layout = $('.binding-layout'), steps = all('.binding-steps li');
  const heroDrawing = art && window.KemBookModel.bind($('.book-art',art));
  const bindingDrawing = process && window.KemBookModel.bind($('.process-art .binding-art',process));
  const active = new Set();
  let scrollFrame = 0, cameraX = 0, cameraY = 0, shownX = 0, shownY = 0, currentPhase = -1;
  const bound = n => Math.min(1,Math.max(0,n));
  function drawScroll() {
    scrollFrame = 0;
    if (motion.matches) {
      heroDrawing?.(0,0,0);
      bindingDrawing?.(.52,0,0);
      steps.forEach(el=>el.removeAttribute('aria-current'));
      currentPhase = -1;
      return;
    }
    if (hero && active.has(hero)) {
      const rect = hero.getBoundingClientRect();
      const progress = bound(-rect.top / Math.max(1,rect.height * .76));
      shownX += (cameraX-shownX)*.32;
      shownY += (cameraY-shownY)*.32;
      if(Math.abs(cameraX-shownX)<.002) shownX=cameraX;
      if(Math.abs(cameraY-shownY)<.002) shownY=cameraY;
      heroDrawing(progress,shownX,shownY);
      if(shownX!==cameraX || shownY!==cameraY) queueScroll();
    }
    if (process && active.has(process)) {
      const rect = process.getBoundingClientRect();
      const start = innerHeight * .88;
      const pinTop = parseFloat(getComputedStyle(layout).top);
      const travel = Math.max(1,rect.height-layout.offsetHeight);
      const progress = rect.top >= pinTop
        ? .20 * bound((start-rect.top)/Math.max(1,start-pinTop))
        : .20 + .80 * bound((pinTop-rect.top)/travel);
      bindingDrawing(progress);
      process.style.setProperty('--prog',progress.toFixed(5));
      const next = progress < .34 ? 0 : progress < .67 ? 1 : 2;
      if (currentPhase!==next) {
        steps.forEach((el,index)=>{if(index===next)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
        currentPhase=next;
      }
    }
  }
  function queueScroll() { if (!scrollFrame && active.size) scrollFrame=requestAnimationFrame(drawScroll); }
  const observer=new IntersectionObserver(records=>{
    for (const record of records) {
      if(record.isIntersecting) active.add(record.target);
      else active.delete(record.target);
    }
    queueScroll();
  },{rootMargin:'100px'});
  [hero,process].filter(Boolean).forEach(el=>observer.observe(el));
  addEventListener('scroll',queueScroll,{passive:true});
  addEventListener('resize',queueScroll);
  motion.addEventListener('change',drawScroll);
  function point(e, el) {
    const r = el.getBoundingClientRect();
    return [Math.max(-1,Math.min(1,2*(e.clientX-r.left)/r.width-1)),Math.max(-1,Math.min(1,2*(e.clientY-r.top)/r.height-1))];
  }
  let lastCard=null, pointerFrame=0, pxEvent;
  function setCard(el,x,y) { el.style.setProperty('--mx',x);el.style.setProperty('--my',y); }
  function move() {
    pointerFrame = 0;
    const e=pxEvent;
    if (motion.matches || !pointer.matches) return;
    const current=e.target.closest('.work-card,.photo-link,.entry-card,.shelf-block,.heading-row,.contact-copy,.config-preview,.foot-top,.case-spread,.shop-unit');
    if(lastCard && lastCard!==current)setCard(lastCard,0,0);
    if(current){const [x,y]=point(e,current);setCard(current,x,y);}
    lastCard=current;
    if (art && e.target.closest('.hero')) {
      [cameraX,cameraY]=point(e,art);queueScroll();
    }
    const contact=e.target.closest('.contact-hit');
    if(contact){const [x,y]=point(e,contact);contact.style.setProperty('--magx',x*3+'px');contact.style.setProperty('--magy',y*3+'px');}
  }
  document.addEventListener('pointermove',e=>{
    if(!pointer.matches || motion.matches)return;
    pxEvent=e;if(!pointerFrame)pointerFrame=requestAnimationFrame(move);
  },{passive:true});
  hero?.addEventListener('pointerleave',()=>{cameraX=0;cameraY=0;queueScroll();});
  $('.contact-hit').addEventListener('pointerleave',e=>{e.currentTarget.style.setProperty('--magx','0px');e.currentTarget.style.setProperty('--magy','0px');});
  const filter=$('#catalog-filter');
  if(filter) {
    const search=()=>{const q=filter.value.trim().toLocaleLowerCase('ru').replaceAll('ё','е');let count=0;
      all('[data-search]').forEach(el=>{el.hidden=!!q&&!el.dataset.search.includes(q);if(!el.hidden)count++;});
      all('.catalog-group').forEach(group=>{group.hidden=!group.querySelector('[data-search]:not([hidden])');});
      $('#search-state').textContent=q?(count?'Найдено позиций: '+count:'Совпадений нет. Попробуйте другое название.'):'';
    };
    filter.addEventListener('input',search);all('.nav-chips a[href^="#"]').forEach(a=>a.addEventListener('click',()=>{filter.value='';search();}));
  }
  const dialog=$('#viewer');
  if(dialog) {
    let links=[], index=0, opener=null, startTouch=null;
    const canvas=$('.pop-image',dialog);
    function show(ix) {
      index=(ix+links.length)%links.length;
      const link=links[index]; canvas.src=link.href;canvas.alt=link.dataset.caption;
      $('.pop-title',dialog).textContent=link.dataset.caption;
      $('.pop-count',dialog).textContent=(index+1)+' / '+links.length;
      ['.pop-prev','.pop-next'].forEach(s=>$(s,dialog).hidden=links.length<2);
      const following=links[(index+1)%links.length];if(following!==link){const hint=new Image();hint.src=following.href;}
    }
    document.addEventListener('click',e=>{
      const link=e.target.closest('[data-view]');if(!link || e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
      e.preventDefault();opener=link;
      const group=link.closest('[data-gallery]');links=all('[data-view]',group||document);
      show(links.indexOf(link)); dialog.showModal();document.body.classList.add('view-open');$('.pop-close',dialog).focus();
    });
    $('.pop-close',dialog).addEventListener('click',()=>dialog.close());
    $('.pop-prev',dialog).addEventListener('click',()=>show(index-1));
    $('.pop-next',dialog).addEventListener('click',()=>show(index+1));
    dialog.addEventListener('keydown',e=>{
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();show(index+(e.key==='ArrowRight'?1:-1));}
    });
    dialog.addEventListener('click',e=>{if(e.target===dialog || e.target.classList.contains('pop-body'))dialog.close();});
    $('.pop-body',dialog).addEventListener('touchstart',e=>{startTouch=e.touches.length===1?[e.touches[0].clientX,e.touches[0].clientY]:null;},{passive:true});
    $('.pop-body',dialog).addEventListener('touchend',e=>{
      if(!startTouch)return;const t=e.changedTouches[0], dx=t.clientX-startTouch[0],dy=t.clientY-startTouch[1];startTouch=null;
      if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4)show(index+(dx<0?1:-1));
    },{passive:true});
    dialog.addEventListener('close',()=>{document.body.classList.remove('view-open');opener?.focus({preventScroll:true});});
  }
  const form=$('#demo-form');
  if(!form)return;
  const query=new URLSearchParams(location.search);
  const profiles=window.KEM_PRICES.filter(item=>item.book);
  const defaultProfile=profiles.find(p=>p.id==='integral');
  const start=profiles.find(p=>p.id===query.get('profile'))||defaultProfile;
  let profile=start, pages=start.pages.includes(+query.get('pages'))?+query.get('pages'):start.pages[0], run=start.runs.includes(+query.get('run'))?+query.get('run'):start.runs[0];
  const formats=[...new Set([defaultProfile.format,...profiles.map(p=>p.format)])];
  let transferred=false, specText='';
  const details=$('#request-detail'), edit=$('.spec-edit');
  const priceFor=()=>profile.values[pages]?.[run];
  function renderOptions(el,name,options,selected) {
    const fragment=document.createDocumentFragment();
    options.forEach(option=>{
      const label=document.createElement('label');label.className='choice';
      const input=document.createElement('input');input.type='radio';input.name=name;input.value=String(option.value);input.checked=String(option.value)===String(selected);
      const text=document.createElement('span');text.textContent=option.label;label.append(input,text);fragment.append(label);
    });
    el.replaceChildren(fragment);
  }
  const choice=(arr,unit='')=>arr.map(v=>({value:v,label:rub.format(v)+(unit?' '+unit:'')}));
  function selectProfile(next) {
    profile=next;if(!profile.pages.includes(pages))pages=profile.pages[0];
    if(!profile.runs.includes(run))run=profile.runs[0];
  }
  function redrawFields(changed='all') {
    if(changed==='all')renderOptions($('#formats'),'format',formats.map(v=>({value:v,label:v})),profile.format);
    if(changed==='format'||changed==='all'){
      const matches=profiles.filter(p=>p.format===profile.format);
      renderOptions($('#bindings'),'binding',matches.map(p=>({value:p.id,label:p.binding+(p.id.startsWith('ill-')?' · с иллюстрациями':p.id==='color-a4'?' · цветная книга':'')})),profile.id);
    }
    if(['all','format','binding'].includes(changed)){
      renderOptions($('#pages-list'),'pages',choice(profile.pages),pages);
      renderOptions($('#runs-list'),'run',choice(profile.runs),run);
    }
    const widths={'130 × 200 мм':104,'205 × 290 мм':119,'170 × 240 мм':118,'A5':114,'A4':135,'200 × 200 мм':136};
    const book=$('.sample-book');
    book.style.setProperty('--w',widths[profile.format]+'px');
    book.style.setProperty('--h',(profile.format==='200 × 200 мм'?135:profile.format==='A4'?168:153)+'px');
    book.style.setProperty('--thick',(4+pages*.055)+'px');
    book.style.setProperty('--cover',profile.binding.includes('Твёрдый')?'#395467':profile.binding==='Мягкий'?'#537859':'#b7344a');
    const fmt=profile.format==='A5'?'A5 (148 × 210 мм)':profile.format==='A4'?'A4 (210 × 297 мм)':profile.format;
    $('.preview-format').textContent=profile.format.replace(' мм','');
    const price=priceFor();
    const priceLabel=price==null?'По запросу':rub.format(price)+' ₽';
    $('.spec-amount').textContent=priceLabel;
    $('.spec-caption').textContent=price==null?'Стоимость этого сочетания уточнит менеджер.':(profile.unit==='unit'?'За экземпляр. Тираж по этой ставке — '+rub.format(price*run)+' ₽.':'За тираж по прайсу типографии.');
    $('.spec-detail').textContent=[fmt,profile.binding,pages+' стр.',rub.format(run)+' экз.'].join(' · ');
    $('.spec-sub').textContent=[profile.method==='По макету'?'Способ печати уточняется':'Печать — '+profile.method.toLocaleLowerCase('ru'),profile.notes].filter(Boolean).join('. ');
    specText=[profile.title,fmt,profile.binding,pages+' стр.',rub.format(run)+' экз.',profile.notes,price==null?'Запросить расчёт':priceLabel+(profile.unit==='unit'?' за экземпляр':' за тираж')].filter(Boolean).join(' · ');
    $('#transfer').firstElementChild.textContent=price==null?'Запросить расчёт':'Включить в заявку';
    if(transferred){$('#form-spec').textContent=specText;}
  }
  $('#spec-controls').addEventListener('change',e=>{
    const {name,value}=e.target;
    if(name==='format'){selectProfile(profiles.find(p=>p.format===value&&p.binding===profile.binding)||profiles.find(p=>p.format===value));}
    if(name==='binding') selectProfile(profiles.find(p=>p.id===value));
    if(name==='pages')pages=+value;if(name==='run')run=+value;
    redrawFields(name);
  });
  $('#config-reset').addEventListener('click',()=>{
    profile=defaultProfile;pages=profile.pages[0];run=profile.runs[0];
    transferred=false;$('#form-spec').textContent='';$('#form-spec-wrap').hidden=true;redrawFields();
    $('#spec-controls input:checked').focus({preventScroll:true});$('#spec').scrollIntoView();
  });
  function showForm(){form.hidden=false;$('#done').hidden=true;}
  function goToPart(hash, section, focusTarget) {
    if (location.hash!==hash) history.pushState(null,'',hash);
    section.scrollIntoView({block:'start'});
    focusTarget.focus({preventScroll:true});
  }
  $('#transfer').addEventListener('click',e=>{
    e.preventDefault();showForm();transferred=true;$('#form-spec-wrap').hidden=false;$('#form-spec').textContent=specText;
    goToPart('#contacts',$('.form-box'),$('#request-name'));
  });
  edit.addEventListener('click',e=>{
    e.preventDefault();goToPart('#spec',$('#spec-controls'),$('#spec-controls input:checked'));
  });
  function invalid(el,message) {
    el.setAttribute('aria-invalid',String(!!message));$('#'+el.id+'-error').textContent=message;return !!message;
  }
  const nameField=$('#request-name'),contactField=$('#request-contact');
  function validate(el) {
    const value=el.value.trim();
    if(el===nameField)return invalid(el,value.length<2?'Введите имя, хотя бы два символа.':'');
    const isEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    const isPhone=/^\+?[\d\s().-]+$/.test(value) && /^\d{7,15}$/.test(value.replace(/\D/g,''));
    return invalid(el,!isEmail&&!isPhone?'Укажите телефон или адрес электронной почты.':'');
  }
  form.addEventListener('input',e=>{if([nameField,contactField].includes(e.target)&&e.target.getAttribute('aria-invalid')==='true') validate(e.target);});
  form.addEventListener('submit',e=>{
    e.preventDefault();const bad=[nameField,contactField].filter(validate);
    if(bad.length){bad[0].focus();return;}
    const receipt=[transferred?specText:'',details.value.trim()].filter(Boolean).join('\n');
    $('#receipt').textContent=receipt;
    form.reset();form.hidden=true;$('#done').hidden=false;$('#done').focus();
  });
  $('#again').addEventListener('click',()=>{transferred=false;$('#form-spec-wrap').hidden=true;$('#form-spec').textContent='';$('#receipt').textContent='';form.reset();showForm();nameField.focus();});
  const item=query.get('item');
  if(item&&item.length<=190)details.value=item.slice(0,190);
  if(query.get('quote')==='1'&&query.has('profile')&&profiles.some(p=>p.id===query.get('profile'))){transferred=true;$('#form-spec-wrap').hidden=false;}
  form.querySelector('fieldset').disabled=false;redrawFields();
})();

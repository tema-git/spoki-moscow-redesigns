'use strict';
(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const all = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const data = window.shopCatalog;
  const products = new Map(data.products.map(product => [product.id, product]));
  const stateKey = 'tt-equipment:' + new URL('.', location.href).pathname;
  const status = $('#global-status');
  const say = text => { status.textContent = text; };
  function node(tag, text, className) {
    const item = document.createElement(tag);
    if (text) item.textContent = text;
    if (className) item.className = className;
    return item;
  }
  function symbol(name) {
    const paths = {close:'m6 6 12 12M18 6 6 18', check:'m4 13 5 5L20 6', plus:'M12 5v14M5 12h14'};
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('width','20'); svg.setAttribute('height','20');
    svg.setAttribute('aria-hidden','true'); svg.setAttribute('class','icon');
    const path = document.createElementNS(svg.namespaceURI,'path');
    path.setAttribute('d', paths[name]); path.setAttribute('fill','none'); path.setAttribute('stroke','currentColor');
    path.setAttribute('stroke-width','1.8'); path.setAttribute('stroke-linecap','round'); path.setAttribute('stroke-linejoin','round');
    svg.append(path); return svg;
  }

  // Across pages only catalogue identifiers travel. Names, contacts and free text remain in the currently open document.
  function validSelection(raw) {
    if (!Array.isArray(raw)) return [];
    const unique = new Map();
    raw.forEach(row => {
      if (!Array.isArray(row)) return;
      const [id, variant] = row, item = products.get(id);
      if (item && Number.isInteger(variant) && variant >= 0 && variant < Math.max(1,item.variants.length)) {
        unique.set(id + ':' + variant, [id, variant]);
      }
    });
    return [...unique.values()];
  }
  function readSelection() {
    try {
      if (location.protocol === 'file:') {
        const qs = new URL(location.href).searchParams;
        if (qs.has('pick')) return validSelection(qs.get('pick').split(',').map(x => {
          const [id,v] = x.split('~'); return [id,Number(v)];
        }));
      }
      return validSelection(JSON.parse(sessionStorage.getItem(stateKey) || '[]'));
    } catch { return []; }
  }
  let selected = readSelection();
  function saveSelection() {
    try { sessionStorage.setItem(stateKey, JSON.stringify(selected)); } catch { /* Private browsing may disable tab storage. */ }
    if (location.protocol === 'file:') {
      const u = new URL(location.href);
      u.searchParams.set('pick', selected.map(([id,v]) => id+'~'+v).join(','));
      try { history.replaceState(null,'',u); } catch { /* Some file viewers restrict history. */ }
    }
  }
  if (location.protocol === 'file:') document.addEventListener('click', e => {
    const a=e.target.closest('a[href]');if (!a) return;
    const u=new URL(a.href);
    if (u.protocol==='file:' && u.pathname.endsWith('.html') && u.pathname!==location.pathname) {
      u.searchParams.set('pick',selected.map(([id,v])=>id+'~'+v).join(','));
      a.href=u.href;
    }
  },true);
  function labelFor([id,v]) {
    const p = products.get(id), model = p.variants[v];
    const name = [p.short,p.brand,model?.[0]].filter(Boolean).join(' ');
    const specs = model?.[1] || p.facts.join(' · ');
    return {name,specs};
  }
  const brief = $('#brief'), list = $('#selection-list'), form = $('#contact-form');
  let generated = false, formEdited = false;
  function summary() {
    if (!selected.length) return '';
    const batch = $('#batch-size')?.value.trim();
    const rows = selected.map((entry,i) => {
      const {name,specs} = labelFor(entry);
      return (i+1)+'. '+name+(specs?' — '+specs:'');
    });
    const product = $('#produce')?.value.trim(), volume = $('#output')?.value.trim();
    return ['Прошу подобрать оборудование и рассчитать стоимость:',...rows,
      product && 'Изделие: '+product, volume && 'Плановый выпуск: '+volume,
      batch && !$('#batch-row').hidden && 'Требуемая масса одного замеса: '+batch+' кг',
      'Прошу уточнить комплектацию, сроки поставки и условия монтажа.'].filter(Boolean).join('\n');
  }
  function updateSummary() {
    const text = summary();
    if (generated && text) $('#brief-preview').textContent = text;
    if (brief && !text) { generated = false; $('#brief-result').hidden = true; }
    if (form && !formEdited) $('#message').value = text;
  }
  function refresh() {
    all('.pick-count,.item-total').forEach(e => {e.textContent=selected.length;});
    $('.pick-link')?.setAttribute('aria-label','Выбранное оборудование, позиций: '+selected.length);
    if (list) {
      list.replaceChildren();
      selected.forEach((entry,i) => {
        const {name,specs} = labelFor(entry);
        const li=node('li'), block=node('div'); block.append(node('strong',name));
        if (specs) block.append(node('small',specs));
        const remove=node('button',null,'remove-item');
        remove.type='button'; remove.setAttribute('aria-label','Убрать '+name); remove.append(symbol('close'));
        remove.addEventListener('click',() => {
          selected.splice(i,1);saveSelection();refresh();
          const next=all('.remove-item',list)[Math.min(i,selected.length-1)] || $('#add-choice');
          next.focus({preventScroll:true});say('Убрано: '+name);
        });
        li.append(block,remove);list.append(li);
      });
      $('#brief-empty').hidden=selected.length>0;
      $('#batch-row').hidden=!selected.some(([id])=>id==='sancassiano'||id==='effedue');
      if($('#batch-row').hidden)$('#batch-size').value='';
    }
    styleDetail();styleAdd();updateSummary();
  }
  function has(id,v){return selected.some(([p,i])=>p===id&&v===i);}
  function add(id,v) {
    const fresh=!has(id,v);
    if (fresh) {selected.push([id,v]);saveSelection();}
    if ($('#brief-error')) $('#brief-error').textContent='';
    refresh();say((fresh?'Добавлено: ':'Уже в подборке: ')+labelFor([id,v]).name);
    return fresh;
  }

  const menuButton=$('.menu-button'), nav=$('#main-nav');
  function closeMenu(returnFocus=false){nav.classList.remove('open');menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Открыть меню');if(returnFocus) menuButton.focus();}
  menuButton?.addEventListener('click',e=>{
    if(nav.classList.contains('open')){closeMenu();return;}
    nav.classList.add('open');menuButton.setAttribute('aria-expanded','true');menuButton.setAttribute('aria-label','Закрыть меню');
    if(e.detail===0)nav.querySelector('a').focus({preventScroll:true});
  });
  nav?.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
  document.addEventListener('click',e=>{if(nav.classList.contains('open')&&!e.target.closest('.mast'))closeMenu();});
  document.addEventListener('focusin',e=>{if(nav.classList.contains('open')&&!e.target.closest('.mast'))closeMenu();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open'))closeMenu(true);});
  matchMedia('(min-width:1191px)').addEventListener('change',()=>closeMenu());

  const search=$('#find-product');
  if(search){
    const normalize=text=>text.toLowerCase().replaceAll('ё','е').replace(/[-‐‑–—]/g,' ').trim();
    const rows=all('[data-search-item]');
    const apply=()=>{
      const tokens=normalize(search.value).split(/\s+/).filter(Boolean);let count=0;
      rows.forEach(row=>{row.hidden=!tokens.every(t=>normalize(row.dataset.search).includes(t));if(!row.hidden)count++;});
      all('.catalog-group').forEach(g=>{g.hidden=!g.querySelector('[data-search-item]:not([hidden])');});
      $('#search-status').textContent=tokens.length?(count?'Найдено позиций: '+count:'Совпадений нет. Попробуйте название машины или производителя.'):'';
    };
    search.addEventListener('input',apply);window.addEventListener('pageshow',apply);
  }

  const detail=$('[data-detail]'), detailButton=$('#add-detail');
  const detailVariant=()=> Number($('input[name="model"]:checked')?.value || 0);
  function styleDetail(){
    if(!detailButton)return;
    const id=detail.dataset.detail,v=detailVariant(),included=has(id,v);
    detailButton.replaceChildren(symbol(included?'check':'plus'),document.createTextNode(included?'В подборке':'В подборку'));
    const note=$('#variant-note');
    if(note)note.textContent=products.get(id).variants[v][1];
    const photographs=all('[data-model-photo]',detail);
    if(photographs.length){
      photographs.forEach(pic=>{pic.hidden=Number(pic.dataset.modelPhoto)!==v;});
      const current=photographs[v];
      current.parentElement.style.setProperty('--photo-ratio',current.style.getPropertyValue('--photo-ratio'));
      const caption=$('.variant-caption',detail);
      caption.textContent=[products.get(id).brand,products.get(id).variants[v][0]].join(' ');
    }
  }
  if(detailButton){
    all('input[name="model"]').forEach(r=>r.addEventListener('change',()=>{styleDetail();$('.detail-status').textContent='';}));
    detailButton.addEventListener('click',()=>{
      const fresh=add(detail.dataset.detail,detailVariant());
      $('.detail-status').textContent=fresh?'Позиция добавлена. Перейдите к запросу или продолжите выбор.':'Эта позиция уже есть в вашей подборке.';
    });
  }

  // A single-focus combobox keeps native tab order while its list supports arrows, typeahead and Escape.
  let openPicker=null;
  function makePicker(id,onChange){
    const root=$('#'+id),trigger=$('.picker-button',root),box=$('.pick-options',root),label=$('#'+id+'-value');
    let choices=[],index=0,active=0,letters='',typedAt=0;
    function close(){
      if(box.hidden)return;
      box.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-activedescendant');
      if(openPicker===api)openPicker=null;
    }
    function fit(){
      const rect=trigger.getBoundingClientRect(),top=document.querySelector('.mast').getBoundingClientRect().bottom;
      const below=innerHeight-rect.bottom-8,above=rect.top-top-8,up=below<175&&above>below;
      box.classList.toggle('above',up);
      box.style.setProperty('--list-height',Math.max(70,Math.min(250,up?above:below))+'px');
    }
    function activeRow(n){
      active=clamp(n,0,choices.length-1);
      [...box.children].forEach((row,i)=>row.classList.toggle('active',i===active));
      const option=box.children[active];
      if(option){
        trigger.setAttribute('aria-activedescendant',option.id);
        const pos=option.offsetTop;
        if(pos<box.scrollTop)box.scrollTop=pos;
        else if(pos+option.offsetHeight>box.scrollTop+box.clientHeight)box.scrollTop=pos+option.offsetHeight-box.clientHeight;
      }
    }
    function open(){
      if(!choices.length)return;if(openPicker&&openPicker!==api)openPicker.close();
      openPicker=api;fit();box.hidden=false;trigger.setAttribute('aria-expanded','true');activeRow(index);
    }
    function setIndex(n,notify=true){
      index=clamp(n,0,choices.length-1);label.textContent=choices[index]?.label||'Выбрать';
      [...box.children].forEach((el,i)=>el.setAttribute('aria-selected',i===index?'true':'false'));
      close();if(notify)onChange(choices[index]?.value);
    }
    function replace(options,initial=0){
      close();choices=options;box.replaceChildren();
      choices.forEach((opt,i)=>{
        const row=node('div',opt.label);row.id=id+'-opt-'+i;row.setAttribute('role','option');row.tabIndex=-1;
        row.addEventListener('click',()=>{setIndex(i);trigger.focus({preventScroll:true});});box.append(row);
      });setIndex(initial,false);
    }
    const api={close,replace,fit,value:()=>choices[index]?.value};
    trigger.addEventListener('click',()=>box.hidden?open():close());
    trigger.addEventListener('keydown',e=>{
      if(e.key==='Tab'){close();return;}
      if(e.key==='Escape'){if(!box.hidden){e.preventDefault();e.stopPropagation();close();}return;}
      if(['Enter',' ','ArrowDown','ArrowUp','Home','End'].includes(e.key)){
        e.preventDefault();const closed=box.hidden;
        if(closed)open();
        if(!closed && (e.key==='Enter'||e.key===' '))setIndex(active);
        else if(e.key==='Home')activeRow(0);
        else if(e.key==='End')activeRow(choices.length-1);
        else if(!closed && e.key==='ArrowDown')activeRow(active+1);
        else if(!closed && e.key==='ArrowUp')activeRow(active-1);
        return;
      }
      if(e.key.length===1&&!e.ctrlKey&&!e.metaKey){
        const now=performance.now();letters=(now-typedAt>650?'':letters)+e.key.toLocaleLowerCase('ru');typedAt=now;open();
        const next=choices.findIndex(o=>o.label.toLocaleLowerCase('ru').startsWith(letters));
        if(next!==-1)activeRow(next);
      }
    });
    root.addEventListener('focusout',e=>{if(e.relatedTarget&&!root.contains(e.relatedTarget))close();});
    return api;
  }
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('.picker'))openPicker?.close();});
  window.addEventListener('resize',()=>openPicker?.fit(),{passive:true});
  window.addEventListener('scroll',()=>openPicker?.fit(),{passive:true});
  let department,equipment,variant;
  function syncVariants(){
    const p=products.get(equipment.value()); if(!p)return;
    const options=p.variants.map(([name],i)=>({value:i,label:name}));
    variant.replace(options.length?options:[{value:0,label:'Уточнить при подборе'}]);
    $('#variant').hidden=options.length<2;styleAdd();
  }
  function syncEquipment(){
    const group=department.value();
    const options=data.products.filter(p=>p.group===group).map(p=>({value:p.id,label:[p.short,p.brand].filter(Boolean).join(' ')}));
    equipment.replace(options);syncVariants();
  }
  function styleAdd(){
    if(!variant||!equipment)return;
    const p=products.get(equipment.value()),v=variant.value()||0,chosen=has(p.id,v);
    $('#choice-facts').textContent=p.variants[v]?.[1]||p.facts.join(' · ')||'Комплектацию и параметры уточнит технолог.';
    $('#add-choice').replaceChildren(symbol(chosen?'check':'plus'),document.createTextNode(chosen?'Уже в подборке':'Добавить в подборку'));
  }
  function resetBrief(){
    selected=[];saveSelection();formEdited=false;generated=false;
    if(brief){
      $('#produce').value='';$('#output').value='';$('#batch-size').value='';$('#batch-size').removeAttribute('aria-invalid');$('#brief-preview').textContent='';$('#brief-result').hidden=true;$('#brief-error').textContent='';
      department.replace(data.groups.map(g=>({value:g.id,label:g.label})));syncEquipment();
    }
    refresh();
  }
  if(brief){
    department=makePicker('department',syncEquipment);
    equipment=makePicker('equipment',syncVariants);
    variant=makePicker('variant',styleAdd);
    department.replace(data.groups.map(g=>({value:g.id,label:g.label})));syncEquipment();
    $('#add-choice').addEventListener('click',()=>add(equipment.value(),variant.value()||0));
    $('#make-brief').addEventListener('click',()=>{
      if(!selected.length){$('#brief-error').textContent='Добавьте хотя бы одну позицию в подборку.';$('#add-choice').focus();return;}
      const batch=$('#batch-size'),value=batch.value.trim();
      if(!$('#batch-row').hidden&&value&&(!/^\d+(?:[.,]\d+)?$/.test(value)||Number(value.replace(',','.'))<=0)){
        $('#brief-error').textContent='Укажите положительную массу замеса в килограммах.';batch.setAttribute('aria-invalid','true');batch.focus();return;
      }
      generated=true;$('#brief-error').textContent='';$('#brief-result').hidden=false;updateSummary();$('#brief-result h4').focus();
    });
    $('#use-brief').addEventListener('click',e=>{
      e.preventDefault();const field=$('#message');field.value=summary();formEdited=false;
      if(form.hidden){$('#success').hidden=true;form.hidden=false;}
      clearErrors();location.hash='contacts';$('#contacts').scrollIntoView({block:'start'});$('#client-name').focus({preventScroll:true});
    });
    $('#batch-size').addEventListener('input',()=>{$('#batch-size').removeAttribute('aria-invalid');$('#brief-error').textContent='';updateSummary();});
    $('#produce').addEventListener('input',updateSummary);$('#output').addEventListener('input',updateSummary);
    $('#reset-brief').addEventListener('click',()=>{resetBrief();say('Подборка сброшена.');$('#department button').focus();});
  }
  function clearErrors(){
    if(!form)return;
    $('#reply-error').textContent='';$('#message-error').textContent='';
    $('#reply-to').removeAttribute('aria-invalid');$('#message').removeAttribute('aria-invalid');
  }
  if(form){
    const contact=$('#reply-to'),message=$('#message');
    message.addEventListener('input',()=>{formEdited=true;$('#message-error').textContent='';message.removeAttribute('aria-invalid');});
    contact.addEventListener('input',()=>{$('#reply-error').textContent='';contact.removeAttribute('aria-invalid');});
    form.addEventListener('submit',e=>{
      e.preventDefault();clearErrors();let first=null;
      const value=contact.value.trim(),digits=value.replace(/\D/g,'');
      const validEmail=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
      const validPhone=/^\+?[\d()\s.-]+$/.test(value)&&digits.length>=7&&digits.length<=15;
      if(!validEmail&&!validPhone){
        $('#reply-error').textContent='Укажите телефон с кодом города или электронную почту.';contact.setAttribute('aria-invalid','true');first=contact;
      }
      if(!message.value.trim()){
        $('#message-error').textContent='Опишите задачу или перенесите подборку оборудования.';message.setAttribute('aria-invalid','true');first ||= message;
      }
      if(first){first.focus();return;}
      $('#submitted-text').textContent=message.value.trim();form.hidden=true;$('#success').hidden=false;$('#success h3').focus();
    });
    $('#restart').addEventListener('click',()=>{
      form.reset();clearErrors();$('#submitted-text').textContent='';$('#success').hidden=true;form.hidden=false;resetBrief();
      location.hash='brief';$('#brief').scrollIntoView({block:'start'});$('#department button').focus({preventScroll:true});say('Можно собрать новый запрос.');
    });
  }
  refresh();
  window.addEventListener('pageshow',e=>{if(e.persisted){selected=readSelection();refresh();}});

  const zoomLinks=all('[data-zoom]');
  if(zoomLinks.length){
    const dialog=node('dialog',null,'lightbox'),bar=node('div',null,'lightbox-head'),caption=node('p');
    caption.id='lightbox-caption';dialog.setAttribute('aria-labelledby',caption.id);
    const close=node('button',null,'zoom-close');close.type='button';close.setAttribute('aria-label','Закрыть изображение');close.append(symbol('close'));bar.append(caption,close);
    const stage=node('div',null,'lightbox-stage'),photo=node('img'),controls=node('div',null,'lightbox-controls');
    const prev=node('button','Предыдущее'),next=node('button','Следующее'),counter=node('span');counter.setAttribute('aria-live','polite');
    controls.append(prev,counter,next);if(zoomLinks.length<2){prev.hidden=true;next.hidden=true;}
    stage.append(photo);dialog.append(bar,stage,controls);document.body.append(dialog);let index=0,origin=0;
    function display(n){
      index=(n+zoomLinks.length)%zoomLinks.length;const a=zoomLinks[index],title=$('img',a).alt;
      const thumb=$('img',a);
      photo.width=Number(thumb.getAttribute('width'));photo.height=Number(thumb.getAttribute('height'));
      photo.src=a.href;photo.alt=title;caption.textContent=title;counter.textContent=(index+1)+' / '+zoomLinks.length;
    }
    zoomLinks.forEach((a,i)=>a.addEventListener('click',e=>{if(e.metaKey||e.ctrlKey)return;e.preventDefault();origin=i;display(i);dialog.showModal();close.focus({preventScroll:true});}));
    close.addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{
      photo.removeAttribute('src');
      const active=document.activeElement;
      if(active===document.body||active?.id==='main'||dialog.contains(active))zoomLinks[origin].focus({preventScroll:true});
    });
    stage.addEventListener('click',e=>{if(e.target===stage)dialog.close();});
    prev.addEventListener('click',()=>display(index-1));next.addEventListener('click',()=>display(index+1));
    dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();display(index+(e.key==='ArrowRight'?1:-1));}});
    let touchX=0,touchY=0;
    photo.addEventListener('touchstart',e=>{touchX=e.touches[0].clientX;touchY=e.touches[0].clientY;},{passive:true});
    photo.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-touchX,dy=e.changedTouches[0].clientY-touchY;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5)display(index+(dx<0?1:-1));},{passive:true});
  }

  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)');
  const hero=$('.hero'), stage=$('.mixer-stage'),line=$('.scroll-line');
  const roots=[hero,line].filter(Boolean), visible=new Set(roots);
  let scrollFrame=0,moveFrame=0,hoverRoot=null,localX=0,localY=0;
  function updateScene(){
    scrollFrame=0;if(reduced.matches)return;
    if(hero&&visible.has(hero)){
      const rect=hero.getBoundingClientRect(),p=clamp((document.querySelector('.mast').offsetHeight-rect.top)/(rect.height*.72),0,1);
      hero.style.setProperty('--lift',(-p*37)+'px');hero.style.setProperty('--head-x',(p*10)+'px');
      hero.style.setProperty('--bowl-y',(p*8)+'px');hero.style.setProperty('--bowl-x',(-p*20)+'px');
    }
    if(line&&visible.has(line)){
      const rect=line.getBoundingClientRect(),p=clamp((innerHeight-rect.top)/(innerHeight*.65+rect.height*.25),0,1);
      line.style.setProperty('--bin',((-1+p)*77)+'px');line.style.setProperty('--oven',((1-p)*83)+'px');
      line.style.setProperty('--table',((1-p)*30)+'px');line.style.setProperty('--flow',(1-p)*82);
    }
  }
  function queueScroll(){if(!scrollFrame&&!reduced.matches&&visible.size)scrollFrame=requestAnimationFrame(updateScene);}
  if(roots.length){
    const io=new IntersectionObserver(entries=>{entries.forEach(entry=>entry.isIntersecting?visible.add(entry.target):visible.delete(entry.target));queueScroll();},{rootMargin:'80px'});
    roots.forEach(e=>io.observe(e));window.addEventListener('scroll',queueScroll,{passive:true});window.addEventListener('resize',queueScroll,{passive:true});queueScroll();
  }
  function clearPointer(el){
    if(!el)return;
    ['--dx','--dy','--mx','--my','--tx','--ty','--rx','--ry','--glow','--spot-x','--spot-y','--lx','--ly'].forEach(k=>el.style.removeProperty(k));
  }
  function pointerPaint(){
    moveFrame=0;if(!hoverRoot||reduced.matches||!fine.matches)return;
    const el=hoverRoot,r=el.getBoundingClientRect(),x=clamp((localX-r.left)/r.width,0,1),y=clamp((localY-r.top)/r.height,0,1);
    const dx=2*x-1,dy=2*y-1;const style=el.style;
    if(el===hero){
      style.setProperty('--tx',dx*15+'px');style.setProperty('--ty',dy*6+'px');
      style.setProperty('--rx',-dy*8+'deg');style.setProperty('--ry',dx*11+'deg');style.setProperty('--lx',x*100+'%');style.setProperty('--ly',y*100+'%');
    }else if(el.matches('.magnet')){
      style.setProperty('--mx',dx*3+'px');style.setProperty('--my',dy*2+'px');
    }else if(el.matches('[data-glow]')){
      style.setProperty('--spot-x',x*100+'%');style.setProperty('--spot-y',y*100+'%');style.setProperty('--glow',1);
    }else{style.setProperty('--dx',dx*5+'px');style.setProperty('--dy',dy*4+'px');}
  }
  document.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch'||reduced.matches||!fine.matches)return;
    const target=e.target.closest('.magnet,[data-tilt],[data-glow],.hero');
    if(hoverRoot!==target)clearPointer(hoverRoot);
    hoverRoot=target;localX=e.clientX;localY=e.clientY;
    if(target&&!moveFrame)moveFrame=requestAnimationFrame(pointerPaint);
  },{passive:true});
  document.addEventListener('pointerout',e=>{if(!e.relatedTarget){clearPointer(hoverRoot);hoverRoot=null;}});
  reduced.addEventListener('change',()=>{clearPointer(hoverRoot);hoverRoot=null;queueScroll();});
})();

(() => {
  'use strict';
  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));
  const root = document.body.dataset.root;
  const all = window.BS_CATALOG || [];
  const byId = new Map(all.map(item => [item.id, item]));
  const query = new URLSearchParams(location.search);
  const svg = type => {
    const paths = {arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',compare:'<path d="M3 20h18M5 16V8h4v8m3 0V4h4v12m3 0v-5"/>',metal:'<path d="M2 18h20M3 15h18M3 6h5v8H3zM8 9h10m0-2h3v7h-3zM6 18v2m12-2v2M11 11h4v3h-4z"/>'};
    return '<svg class="ico '+type+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[type]+'</svg>';
  };
  const e = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => n ? new Intl.NumberFormat('ru-RU').format(n)+' ₽' : 'Цена по запросу';
  const catalogKey = 'belstanko-comparison-v1';
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(catalogKey)); } catch {}
  let ids = Array.isArray(saved) ? saved.filter((id,i,a) => /^\d+$/.test(id) && a.indexOf(id) === i).slice(0,2) : [];
  const initialExample = [ '1077', '1075' ];
  const isCompare = Boolean($('[data-compare-tool]'));
  if (isCompare && saved === null && ids.length === 0) ids = initialExample.filter(id => byId.has(id));
  if (isCompare && query.has('models')) ids = [...new Set(query.get('models').split(',').filter(id => byId.has(id)))].slice(0,2);
  function persist() {
    try { sessionStorage.setItem(catalogKey, JSON.stringify(ids)); } catch {}
    refreshCompareControls();
  }
  function refreshCompareControls() {
    $$('[data-count]').forEach(el => { el.textContent = ids.length; el.hidden = !ids.length; });
    $$('[data-compare]').forEach(btn => {
      const on = ids.includes(btn.dataset.compare);
      btn.setAttribute('aria-pressed', String(on));
      const label = $('span',btn);
      if (label) label.textContent = on ? 'В сравнении' : 'Сравнить';
    });
  }
  let noticeTimeout;
  function notify(message, compareLink = false) {
    const notice = $('#notice'); clearTimeout(noticeTimeout);
    notice.replaceChildren(document.createTextNode(message));
    if (compareLink) {
      const a = document.createElement('a'); a.href = root+'compare.html'; a.textContent = 'К сравнению'; notice.append(a);
    }
    noticeTimeout = setTimeout(() => { if (!notice.contains(document.activeElement)) notice.replaceChildren(); }, 5200);
  }
  document.addEventListener('click', ev => {
    const btn = ev.target.closest('[data-compare]'); if (!btn) return;
    const id = btn.dataset.compare;
    if (ids.includes(id)) { ids = ids.filter(x => x !== id); notify('Модель убрана из сравнения.'); }
    else if (ids.length < 2) { ids.push(id); notify('Модель добавлена.',true); }
    else { notify('Уже выбраны две модели. Замените одну в сравнении.',true); return; }
    persist();
  });
  if (isCompare) persist(); else refreshCompareControls();
  window.addEventListener('pageshow', ev => {
    if (!ev.persisted) return;
    try { const newer=JSON.parse(sessionStorage.getItem(catalogKey)); if(Array.isArray(newer)) ids=newer; } catch {}
    refreshCompareControls(); if (isCompare) renderComparison();
  });
  const menuBtn=$('.menu-toggle'), menu=$('#mobile-menu');
  function toggleMenu(open) {
    menu.hidden=!open; menuBtn.setAttribute('aria-expanded',String(open)); menuBtn.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');
  }
  menuBtn?.addEventListener('click',()=>toggleMenu(menu.hidden));
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape' && !menu.hidden){ toggleMenu(false);menuBtn.focus(); }});
  document.addEventListener('click',ev=>{if(!menu.hidden && !ev.target.closest('header'))toggleMenu(false);});
  matchMedia('(min-width:1001px)').addEventListener('change',e=>{ if(e.matches)toggleMenu(false); });
  // Subject and measurement marks follow inputs only while those sections are in view.
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'), fine=matchMedia('(hover:hover) and (pointer:fine)');
  const hero=$('.hero'), figure=$('.hero-figure'), scene=$('.dimension-scene'), magnet=$('.contacts-btn');
  let hx=0,hy=0,scrollFrame=0,pointerFrame=0,pointer=null;
  const live=new Set();
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{if(entry.isIntersecting)live.add(entry.target);else live.delete(entry.target);});
    scheduleScene();
  },{rootMargin:'90px'});
  [hero,scene].filter(Boolean).forEach(el=>observer.observe(el));
  function scheduleScene(){if(!scrollFrame && !reduced.matches)scrollFrame=requestAnimationFrame(paintScene);}
  function paintScene(){
    scrollFrame=0; if(reduced.matches)return;
    if(hero && live.has(hero)){
      const rect=hero.getBoundingClientRect(), p=Math.max(0,Math.min(1,(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--head'))-rect.top)/rect.height));
      window.BelstankoLathe?.draw(hx,hy,p);
      figure.style.setProperty('--hx',(hx*14+p*9)+'px');figure.style.setProperty('--hy',(hy*8-p*15)+'px');figure.style.setProperty('--hr',(hx*5)+'deg');figure.style.setProperty('--hs',(-p*3+hx*.9)+'deg');
      figure.style.setProperty('--feed',(hx*22+p*49)+'px');figure.style.setProperty('--rise',(-(hx*22+p*49)*.115)+'px');
    }
    if(scene && live.has(scene)){
      const rect=scene.getBoundingClientRect(); const p=Math.max(0,Math.min(1,(innerHeight-rect.top)/(innerHeight*.60+rect.height*.12)));
      scene.style.setProperty('--s1',((1-p)*-53)+'px');scene.style.setProperty('--s2',((1-p)*76)+'px');
    }
  }
  addEventListener('scroll',()=>{if(live.size)scheduleScene();},{passive:true});addEventListener('resize',scheduleScene,{passive:true});
  let lastReact=null;
  function clearReact(){ if(lastReact){ ['--px','--py','--ix','--iy'].forEach(k=>lastReact.style.removeProperty(k)); lastReact=null; } }
  function paintPointer(){
    pointerFrame=0;if(!pointer || reduced.matches || !fine.matches) return;
    const {target,x,y}=pointer;
    const rectPosition=el=>{const b=el.getBoundingClientRect();return [Math.max(-1,Math.min(1,2*(x-b.left)/Math.max(1,b.width)-1)),Math.max(-1,Math.min(1,2*(y-b.top)/Math.max(1,b.height)-1))];};
    if(hero){if(hero.contains(target)){[hx,hy]=rectPosition(figure);}else{hx=hy=0;} if(live.has(hero))scheduleScene();}
    const react=target.closest?.('.react');
    if(react!==lastReact)clearReact();
    if(react){lastReact=react;const [a,b]=rectPosition(react);react.style.setProperty('--px',(50+ a*50)+'%');react.style.setProperty('--py',(50+b*50)+'%');react.style.setProperty('--ix',(a*5)+'px');react.style.setProperty('--iy',(b*4)+'px');}
    if(magnet.contains(target)){const [a,b]=rectPosition(magnet);magnet.style.setProperty('--mx',(a*3.4)+'px');magnet.style.setProperty('--my',(b*2.5)+'px');}
    else{magnet.style.removeProperty('--mx');magnet.style.removeProperty('--my');}
  }
  document.addEventListener('pointermove',ev=>{if(ev.pointerType==='touch'||!fine.matches||reduced.matches)return;pointer={target:ev.target,x:ev.clientX,y:ev.clientY};if(!pointerFrame)pointerFrame=requestAnimationFrame(paintPointer);},{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{hx=hy=0;clearReact();magnet.style.removeProperty('--mx');magnet.style.removeProperty('--my');scheduleScene();});
  reduced.addEventListener('change',()=>{if(reduced.matches){clearReact();if(figure)figure.removeAttribute('style');if(scene)scene.removeAttribute('style');}else scheduleScene();});
  // Full-size local photography. A gallery is limited to the current model or article.
  const lightbox=$('#lightbox'), large=$('#large-photo'); let photos=[],current=0;
  function showPhoto(index){
    current=(index+photos.length)%photos.length;const a=photos[current],im=$('img',a);
    large.src=a.href;large.alt=im?.alt || a.getAttribute('aria-label') || 'Фотография';
    $('#photo-count').textContent=photos.length>1?(current+1)+' / '+photos.length:large.alt;
    $('[data-prev]',lightbox).hidden=photos.length<2;$('[data-next]',lightbox).hidden=photos.length<2;
  }
  document.addEventListener('click',ev=>{
    const a=ev.target.closest('a[data-gallery]');if(!a||!lightbox.showModal)return;
    ev.preventDefault();const scope=a.closest('[data-gallery-set]')||a.closest('section')||a.parentElement;
    photos=[...new Map($$('a[data-gallery]',scope).map(x=>[x.href,x])).values()];if(!photos.length)photos=[a];
    showPhoto(Math.max(0,photos.findIndex(x=>x.href===a.href))); lightbox.showModal();
  });
  $('[data-prev]',lightbox).addEventListener('click',()=>showPhoto(current-1));$('[data-next]',lightbox).addEventListener('click',()=>showPhoto(current+1));
  lightbox.addEventListener('keydown',ev=>{if(ev.key==='ArrowRight'){ev.preventDefault();showPhoto(current+1);}if(ev.key==='ArrowLeft'){ev.preventDefault();showPhoto(current-1);}});
  $$('dialog').forEach(dialog=>{dialog.addEventListener('click',ev=>{if(ev.target.closest('[data-close]'))dialog.close();else if(ev.target===dialog){if(dialog===lightbox){dialog.close();return;}const b=dialog.getBoundingClientRect();if(ev.clientX<b.left||ev.clientX>b.right||ev.clientY<b.top||ev.clientY>b.bottom)dialog.close();}});});
  const normalize=s=>String(s||'').toLocaleLowerCase('ru').replace(/ё/g,'е').normalize('NFKC').replace(/[‐‑‒–—]/g,'-').replace(/\s+/g,' ').trim();
  function matches(p,text){const q=normalize(text).split(' ').filter(Boolean);const hay=normalize(p.name+' '+p.category);return q.every(w=>hay.includes(w));}
  const picker=$('#picker'), field=$('#picker-query');let choose=null,excluded='',limit=32;
  function pickerList(){
    const items=all.filter(p=>p.id!==excluded && matches(p,field.value));const shown=items.slice(0,limit);
    $('#picker-results').innerHTML=shown.length?shown.map(p=>'<button type="button" class="pick-option" data-pick="'+p.id+'">'+e(p.name)+'<small>'+e(p.category)+' · '+e(money(p.price))+'</small></button>').join(''):'<p>Совпадений нет. Попробуйте часть названия модели.</p>';
    $('#more-picker').hidden=items.length<=limit;
  }
  function openPicker(trigger,onChoose,except=''){
    choose=onChoose;excluded=except;field.value='';limit=32;pickerList();picker.showModal();field.focus();
  }
  if(picker){
    field.addEventListener('input',()=>{limit=32;pickerList();});
    $('#more-picker').addEventListener('click',()=>{limit+=32;pickerList();$('.pick-option:nth-child('+(limit-31)+')',picker)?.focus();});
    picker.addEventListener('click',ev=>{const b=ev.target.closest('[data-pick]');if(!b)return;const p=byId.get(b.dataset.pick);picker.close();if(p)choose(p);});
    field.addEventListener('keydown',ev=>{if(ev.key==='ArrowDown'){ev.preventDefault();$('.pick-option',picker)?.focus();}});
    picker.addEventListener('keydown',ev=>{const option=ev.target.closest('.pick-option');if(!option)return;const step=ev.key==='ArrowDown'?option.nextElementSibling:ev.key==='ArrowUp'?option.previousElementSibling:null;if(step){ev.preventDefault();step.focus();}else if(ev.key==='ArrowUp'){ev.preventDefault();field.focus();}});
  }
  const pendingSpecs=new Map();
  function readSpec(id){
    if(!id)return Promise.resolve(null);
    if(window.BS_SPECS?.[id])return Promise.resolve(window.BS_SPECS[id]);
    if(pendingSpecs.has(id))return pendingSpecs.get(id);
    const p=new Promise(resolve=>{const s=document.createElement('script');s.src=root+'assets/spec/'+id+'.js';s.onload=()=>resolve(window.BS_SPECS?.[id]||null);s.onerror=()=>{pendingSpecs.delete(id);resolve(null);};document.head.append(s);});pendingSpecs.set(id,p);return p;
  }
  let renderNumber=0;
  function slot(p,i){
    if(!p)return '<article class="slot"><div><h2>'+ (i===0?'Первая модель':'Вторая модель')+'</h2></div><div class="slot-actions"><button class="btn ghost" data-edit="'+i+'">Выбрать модель</button></div></article>';
    return '<article class="slot">'+(p.thumb?'<img src="'+root+p.thumb+'" alt="">':'')+'<div><h2><a href="'+root+'products/'+p.id+'.html">'+e(p.model)+'</a></h2><p>'+e(p.name===p.model?p.category:p.name.substring(p.model.length).trim())+'</p></div><div class="slot-actions"><button class="quiet" data-edit="'+i+'">Заменить модель</button><a class="line-link" href="'+root+'contacts.html?model='+p.id+'#request">Запрос по модели'+svg('arrow')+'</a></div></article>';
  }
  function compRow(label,a,b){
    if($('#diff-only').checked && normalize(a)===normalize(b))return '';
    return '<div class="comp-row" role="row"><b role="rowheader">'+e(label)+'</b><span role="cell">'+e(a||'Нет данных')+'</span><span role="cell">'+e(b||'Нет данных')+'</span></div>';
  }
  async function renderComparison(){
    if(!isCompare)return;
    const revision=++renderNumber;
    const selected=[byId.get(ids[0]),byId.get(ids[1])];$('#slots').innerHTML=selected.map(slot).join('');
    const target=$('#comparison');
    if(!selected.every(Boolean)){target.innerHTML='<p class="empty-compare">'+(selected.some(Boolean)?'Выберите вторую модель, чтобы увидеть различия.':'Выберите модели из каталога или откройте <button class="quiet" id="example">сравнение 1К625Д-1500 и 1К625Д-2000</button>.')+'</p>';return;}
    const [a,b]=selected;const [da,db]=await Promise.all([readSpec(a.id),readSpec(b.id)]);
    if(revision!==renderNumber)return;
    const head='<div class="compare-head" role="row"><span role="columnheader">Параметр</span><span role="columnheader">'+e(a.model)+'</span><span role="columnheader">'+e(b.model)+'</span></div>';
    let result=compRow('Цена',money(a.price),money(b.price));
    if(a.old || b.old)result+=compRow('Прежняя цена',a.old?money(a.old):'',b.old?money(b.old):'');
    if(a.stock || b.stock)result+=compRow('Наличие',a.stock,b.stock);
    Object.keys({...a.summary,...b.summary}).forEach(k=>{result+=compRow(k,a.summary[k],b.summary[k]);});
    const purposeText=compRow('Назначение',da?.purpose,db?.purpose);
    const groups=new Map();
    for(const [index,details] of [da,db].entries()){
      for(const [g,label,value] of details?.spec || []){
        const groupName=g||'Характеристики', gkey=normalize(groupName).replace(/[.,;:]+$/,'');
        if(!groups.has(gkey))groups.set(gkey,{name:groupName,rows:new Map()});
        const map=groups.get(gkey).rows,key=normalize(label).replace(/\s*([,.()])\s*/g,'$1').replace(/[.,:]+$/,'');
        if(!map.has(key))map.set(key,{label,values:['','']});
        const r=map.get(key);r.values[index]=r.values[index] ? r.values[index]+' / '+value : value;
      }
    }
    let more='';
    groups.forEach(g=>{const rows=[...g.rows.values()].map(r=>compRow(r.label,...r.values)).join('');if(rows)more+='<div class="comp-group">'+e(g.name)+'</div>'+rows;});
    if(!result&&!purposeText&&!more)result='<p>В опубликованных значениях различий нет.</p>';
    target.innerHTML='<div role="table" aria-label="Сравнение моделей">'+head+result+purposeText+(more?'<details class="group-detail"><summary>Все сопоставимые характеристики</summary>'+more+'</details>':'')+'</div>';
  }
  if(isCompare){
    $('#slots').addEventListener('click',ev=>{
      const b=ev.target.closest('[data-edit]');if(!b)return;const ix=Number(b.dataset.edit);
      openPicker(b,p=>{ids[ix]=p.id;ids=ids.filter(Boolean);persist();renderComparison();window.requestAnimationFrame(()=>$('#slots [data-edit="'+Math.min(ix,ids.length-1)+'"]')?.focus({preventScroll:true}));},ids[1-ix]);
    });
    $('#clear-compare').addEventListener('click',()=>{ids=[];persist();$('#diff-only').checked=false;renderComparison();});
    $('#comparison').addEventListener('click',ev=>{if(ev.target.id==='example'){ids=initialExample.filter(id=>byId.has(id));persist();renderComparison();}});
    $('#diff-only').addEventListener('change',renderComparison);renderComparison();
  }
  if($('#results')){
    const input=$('.searchbox input'),searchBtn=$('#more-search');let count=24;input.value=query.get('q')||'';
    function renderResults(){
      const items=all.filter(p=>matches(p,input.value));$('#search-count').textContent='Найдено позиций: '+items.length;
      $('#results').innerHTML=items.slice(0,count).map(p=>{
        const url=root+'products/'+p.id+'.html',sub=p.name===p.model?p.category:p.name.substring(p.model.length).trim();
        return '<article class="card react"><a class="card-photo" style="'+e(p.photoGeometry)+'" aria-label="'+e(p.name)+'" href="'+url+'">'+(p.thumb?'<img loading="lazy" src="'+root+p.thumb+'" alt="">':'<div class="no-image">'+svg('metal')+'</div>')+'</a><div class="card-info"><a href="'+url+'"><h3>'+e(p.model)+'</h3><p>'+e(sub)+'</p></a><span class="pricing"><b>'+e(money(p.price))+'</b>'+(p.old?'<del>'+e(money(p.old))+'</del>':'')+'</span><button class="add-compare" type="button" data-compare="'+p.id+'">'+svg('compare')+'<span>Сравнить</span></button></div></article>';
      }).join('') || '<p>Попробуйте другой артикул или название.</p>';searchBtn.hidden=items.length<=count;refreshCompareControls();
    }
    input.addEventListener('input',()=>{count=24;renderResults();});
    $('.searchbox').addEventListener('submit',ev=>{ev.preventDefault();const url=new URL(location.href);url.searchParams.set('q',input.value);history.replaceState(null,'',url);renderResults();});
    searchBtn.addEventListener('click',()=>{count+=24;renderResults();$('#results .card:nth-child('+(count-23)+') a')?.focus();});renderResults();
  }
  const form=$('#request-form');
  if(form){
    let selected=byId.get(query.get('model'))||null;
    const choice=$('#model-choice'),name=$('#contact-person'),contact=$('#contact-value'),message=$('#message'),success=$('#success');
    let suggestedText='';
    function updateChoice(){
      $('span',choice).textContent=selected?selected.name:'Выбрать модель или запросить подбор';
      const context=$('#model-context');context.hidden=!selected;
      context.textContent=selected?[money(selected.price),selected.stock].filter(Boolean).join(' · '):'';
      const next=selected?(selected.stock==='Снят с производства'?'Подберите, пожалуйста, аналог модели '+selected.model+'.':'Подтвердите, пожалуйста, цену, комплектацию и срок поставки модели '+selected.model+'.'):'';
      if(!message.value.trim() || message.value===suggestedText)message.value=next;
      suggestedText=next;
    }
    updateChoice();choice.addEventListener('click',()=>openPicker(choice,p=>{selected=p;updateChoice();}));
    function error(input,where,text){input.setAttribute('aria-invalid',String(Boolean(text)));input.setAttribute('aria-describedby',where.id);where.textContent=text;}
    const ep=$('#err-person'),ec=$('#err-contact');
    [name,contact].forEach((input,i)=>input.addEventListener('input',()=>{if(input.getAttribute('aria-invalid')==='true')error(input,i?ec:ep,'');}));
    form.addEventListener('submit',ev=>{
      ev.preventDefault();const who=name.value.trim(),way=contact.value.trim(),digits=way.replace(/\D/g,'');
      const valid=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(way)||(/^[+\d][\d\s+().-]*$/.test(way)&&digits.length>=7&&digits.length<=15);
      error(name,ep,who?'':'Укажите ваше имя.');error(contact,ec,valid?'':'Введите номер телефона или адрес электронной почты.');
      if(!who||!valid){(!who?name:contact).focus();return;}
      const lines=[['Оборудование',selected?.name||'Подбор оборудования'],['Контакт',who+' · '+way]];
      if(message.value.trim())lines.push(['Вопрос',message.value.trim()]);
      $('#request-summary').innerHTML='<dl>'+lines.map(([k,v])=>'<div><dt>'+e(k)+'</dt><dd>'+e(v)+'</dd></div>').join('')+'</dl>';
      form.hidden=true;success.hidden=false;success.focus();success.scrollIntoView({block:'nearest'});
    });
    $('#repeat-request').addEventListener('click',()=>{form.reset();selected=null;updateChoice();error(name,ep,'');error(contact,ec,'');$('#request-summary').replaceChildren();success.hidden=true;form.hidden=false;choice.focus();});
  }
})();

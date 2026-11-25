(() => {
  'use strict';
  const form=document.querySelector('#finder-form');
  if(!form)return;
  const rows=(window.RA_CATALOG||[]).filter(row=>row.work);
  const result=document.querySelector('#finder-results'), list=document.querySelector('#result-list');
  const title=document.querySelector('#result-title'), more=document.querySelector('#results-more');
  const hint=document.querySelector('#parameter-hint');
  const seriesBox=form.querySelector('[data-select="series"]'), paramBox=form.querySelector('[data-select="param"]');
  let work='vibro',series='',parameter='',matches=[],shown=0;
  const categoryName=(id)=>window.RA_CATEGORIES[id];
  const wording={vibro:'Вибропогружение',hammer:'Забивка свай'};
  const labels={vibro:'Максимальная частота',hammer:'Энергия удара'};
  function keyFor(p){return p[0]+'|'+p[1]+'|'+p[2];}
  function displayParam(p){
    const mode=p[0].split(', ')[1];
    return p[2]+' '+p[1]+(mode?' · '+mode:'');
  }
  function setOptions(box, options, value, onPick){
    const panel=box.querySelector('.option-list');
    panel.replaceChildren();
    const selected=options.find(op=>op[0]===value)||options[0];
    box.querySelector('summary span').textContent=selected[1];
    options.forEach(([key,name])=>{
      const b=document.createElement('button');
      b.type='button'; b.dataset.value=key;b.textContent=name;b.setAttribute('aria-pressed',String(key===selected[0]));
      b.addEventListener('click',()=>{
        box.open=false;onPick(key);box.querySelector('summary').focus({preventScroll:true});
      });
      panel.append(b);
    });
  }
  function hideResult(){result.hidden=true;list.replaceChildren();matches=[];shown=0;}
  function renderInputs(){
    const workRows=rows.filter(m=>m.work===work);
    const ids=[...new Set(workRows.map(m=>m.series))];
    const scoped=workRows.filter(m=>!series||m.series===series);
    const params=new Map();
    scoped.forEach(m=>m.parameters.forEach(p=>params.set(keyFor(p),p)));
    const options=Array.from(params).sort((a,b)=>{
      const na=parseFloat(String(a[1][2]).replace(',','.')),nb=parseFloat(String(b[1][2]).replace(',','.'));
      return String(a[1][1]).localeCompare(String(b[1][1]),'ru') || na-nb || a[0].localeCompare(b[0],'ru');
    }).map(([key,val])=>[key,displayParam(val)]);
    if(parameter&&!params.has(parameter))parameter='';
    setOptions(seriesBox,[['','Все серии'],...ids.map(s=>[s,categoryName(s)])],series,k=>{series=k;parameter='';hideResult();renderInputs();});
    setOptions(paramBox,[['','Любое значение'],...options],parameter,k=>{parameter=k;hideResult();renderInputs();});
    paramBox.closest('.choice-field').querySelector('.field-name').textContent=labels[work];
    hint.textContent=work==='vibro'?'Частота приведена в оборотах в минуту. Для моделей с одинаковым обозначением учитывается производитель.':'Для серии LX значение зависит от типа цилиндра. У каждого варианта указаны единицы и режим.';
  }
  function closeBoxes(except=null){[seriesBox,paramBox].forEach(b=>{if(b!==except)b.open=false;});}
  function placeBox(b){
    const r=b.querySelector('summary').getBoundingClientRect(),head=document.querySelector('.site-header').getBoundingClientRect().bottom;
    const down=innerHeight-r.bottom-10,up=r.top-head-9;
    const above=down<195&&up>down;
    b.classList.toggle('up',above);b.style.setProperty('--room',Math.max(48,Math.floor(above?up:down))+'px');
  }
  [seriesBox,paramBox].forEach(b=>{
    b.querySelector('summary').addEventListener('click',()=>placeBox(b));
    b.addEventListener('toggle',()=>{if(b.open){closeBoxes(b);placeBox(b);}});
    b.addEventListener('focusout',e=>{if(e.relatedTarget&&!b.contains(e.relatedTarget))b.open=false;});
    b.addEventListener('keydown',e=>{
      const summary=b.querySelector('summary'),options=Array.from(b.querySelectorAll('button'));
      if(e.key==='Escape'&&b.open){e.preventDefault();b.open=false;summary.focus();return;}
      if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;
      e.preventDefault();
      if(!b.open){b.open=true;placeBox(b);(b.querySelector('[aria-pressed="true"]')||options[0]).focus();return;}
      const i=options.indexOf(document.activeElement);
      const target=e.key==='Home'?0:e.key==='End'?options.length-1:e.key==='ArrowDown'?Math.min(i+1,options.length-1):(i<0?options.length-1:Math.max(i-1,0));
      options[target].focus();
    });
  });
  document.addEventListener('click',e=>{if(!e.target.closest('.dropdown'))closeBoxes();});
  window.addEventListener('resize',()=>{placeBox(seriesBox);placeBox(paramBox);});
  window.addEventListener('scroll',()=>{if(seriesBox.open)placeBox(seriesBox);if(paramBox.open)placeBox(paramBox);},{passive:true});
  form.addEventListener('change',e=>{
    if(e.target.name!=='work')return;
    work=e.target.value;series='';parameter='';closeBoxes();hideResult();renderInputs();
  });
  function appendMatches(){
    matches.slice(shown,shown+6).forEach(m=>{
      const row=document.createElement('div');row.className='result-item';
      const card=document.createElement('a'),model=document.createElement('strong'),sub=document.createElement('small'),ask=document.createElement('a');
      const selected=m.parameters.find(p=>keyFor(p)===parameter);
      const tag=wording[work]+(selected?'. '+selected[0]+' '+displayParam(selected):'');
      model.className='result-name';model.textContent=m.name;
      sub.textContent=m.brand+' · '+(selected?displayParam(selected):m.summary||m.category);
      card.href='models/'+encodeURIComponent(m.id)+'.html?pick='+encodeURIComponent(tag);
      card.setAttribute('aria-label','Карточка '+m.name+', '+m.brand);
      card.append(model,sub);
      ask.className='result-ask';ask.href='index.html?model='+encodeURIComponent(m.id)+'&pick='+encodeURIComponent(tag)+'#contacts';
      ask.textContent='В запрос';ask.setAttribute('aria-label','В запрос '+m.name+', '+m.brand);
      row.append(card,ask);list.append(row);
    });
    shown+=6;more.hidden=shown>=matches.length;
  }
  more.addEventListener('click',()=>{
    const prev=list.children.length;appendMatches();list.children[prev]?.querySelector('a').focus({preventScroll:true});
  });
  form.addEventListener('submit',e=>{
    e.preventDefault();closeBoxes();list.replaceChildren();shown=0;
    matches=rows.filter(m=>m.work===work&&(!series||series===m.series)&&(!parameter||m.parameters.some(p=>keyFor(p)===parameter)));
    result.hidden=false;title.textContent='Подходящие модели ('+matches.length+')';appendMatches();title.focus();
  });
  form.addEventListener('reset',()=>{
    work='vibro';series='';parameter='';closeBoxes();hideResult();renderInputs();
    requestAnimationFrame(()=>form.querySelector('input[value="vibro"]').focus({preventScroll:true}));
  });
  renderInputs();
})();

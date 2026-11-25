'use strict';

(() => {
  const models = JSON.parse(document.querySelector('#model-data').textContent);
  const swatches = JSON.parse(document.querySelector('#swatch-data').textContent);
  const bySlug = new Map(models.map(model => [model.slug, model]));
  const initial = bySlug.get('pryamaya-shuba');
  const unsure = 'Обсудить на примерке';
  const fur = ['Соболь','Норка','Свакара','Шиншилла','Рысь','Рысевидная кошка','Лисица','Песец','Бобр','Куница','Кролик'];
  const trim = ['Соболь','Норка','Свакара','Лисица','Песец','Рысь','Шиншилла','Куница'];
  const lining = ['Соболь','Норка','Рысь','Куница','Лисица','Кролик'];
  const modelMaterials = {fur, vest:fur, svakara:['Свакара'], parka:lining, denim:['Норка','Соболь','Куница'], combo:trim, shear:['Овчина даблфейс']};
  const upper = {parka:['Плащёвка','Кашемир'],denim:['Джинсовая ткань','Готовая куртка на размер больше'],combo:['Кашемир','Шерсть']};
  const flatTechnique = {svakara:'Пошив из каракульчи', parka:'Меховая подстёжка', denim:'Меховая подстёжка', combo:'Меховая отделка', shear:'Пошив из овчины'};
  const fieldNames = {model:'Модель',shape:'Силуэт',material:'Вид меха',fabric:'Ткань верха',technique:'Техника'};
  const el = id => document.getElementById(id);
  const pick = el('pick-dialog');
  const choices = el('choices');
  const options = el('options');
  const form = el('request');
  const success = el('success');
  const sheet = document.querySelector('.work-sheet');
  const initialSlug = new URLSearchParams(location.search).get('model');
  let active = bySlug.has(initialSlug);
  let model;
  let state;
  let editing;
  function techniques() {
    if (flatTechnique[model.kind]) return [flatTechnique[model.kind], unsure];
    return state.material === 'Норка' ? ['Ручная перфорация','Классический пошив',unsure] : ['Классический пошив',unsure];
  }
  function selectModel(next) {
    model = next;
    state = {model:next.title, shape:next.shape, material:next.material, fabric:upper[next.kind] ? unsure : '', technique:next.technique || flatTechnique[next.kind] || unsure};
  }
  function getOptions(key) {
    if (key === 'model') return models.map(m => m.title);
    if (key === 'shape') return ['Прямой','Расклешённый',unsure];
    if (key === 'material') return [...modelMaterials[model.kind],unsure];
    if (key === 'fabric') return [...upper[model.kind],unsure];
    return techniques();
  }
  function fields() { return ['model','shape','material',...(upper[model.kind] ? ['fabric'] : []),'technique']; }
  function fieldName(key) {
    if (key === 'material' && ['parka','denim'].includes(model.kind)) return 'Мех подстёжки';
    if (key === 'material' && model.kind === 'combo') return 'Мех отделки';
    return fieldNames[key];
  }
  function sampleFor(field, value) {
    const kind = ['svakara','vest'].includes(model.kind) ? 'fur' : model.kind;
    const key = field === 'fabric' ? 'fabric-' + kind : kind;
    return (swatches[key] || {})[value];
  }
  function summary() {
    const details = [model.title];
    if (state.shape !== unsure && !(model.technique && model.shape === state.shape)) details.push(state.shape.toLowerCase() + ' силуэт');
    if (state.material !== unsure) details.push(state.material.toLowerCase());
    if (state.fabric && state.fabric !== unsure) details.push(state.fabric.toLowerCase());
    if (state.technique !== unsure && !['denim','parka','combo'].includes(model.kind)) details.push(state.technique.toLowerCase());
    return details.join(' · ');
  }
  function render() {
    choices.replaceChildren();
    for (const key of fields()) {
      const div = document.createElement('div');
      div.className = 'pick-field';
      const label = document.createElement('span');
      label.textContent = fieldName(key);label.id = 'label-' + key;
      const button = document.createElement('button');
      button.type = 'button';button.dataset.field = key;
      button.setAttribute('aria-haspopup','dialog');
      button.setAttribute('aria-controls','pick-dialog');
      button.setAttribute('aria-labelledby',label.id + ' value-' + key);
      const value = document.createElement('b');
      value.id = 'value-' + key;value.textContent = state[key];value.style.fontWeight = '500';
      button.append(value,document.querySelector('.faq .chev').cloneNode(true));div.append(label,button);choices.append(div);
    }
    const sample = sampleFor('material',state.material);
    el('sheet-sample').hidden = !sample;
    if (sample) { el('sheet-swatch').src = sample; el('sheet-swatch').alt = state.material; }
    const line = summary();
    el('choice-summary').textContent = line;
    el('request-choice').textContent = active ? line : 'Фасон можно обсудить при встрече.';
    el('edit-choice').textContent = active ? 'Изменить выбор' : 'Выбрать фасон';
    el('sketch-caption').textContent = state.shape === unsure ? 'Посадка по макету' : state.shape + ' силуэт';
    sheet.dataset.shape = state.shape === 'Расклешённый' ? 'flare' : 'straight';
    sheet.dataset.kind = model.kind;
    sheet.dataset.short = String(['denim','vest'].includes(model.kind));
    sheet.dataset.perf = String(state.technique === 'Ручная перфорация');
    sheet.style.setProperty('--cloth',({Норка:'#d6dce0',Соболь:'#bda696',Свакара:'#c6bec2',Лисица:'#e1b49c','Овчина даблфейс':'#dac5ac'})[state.material] || '#ddd2cd');
    sheet.style.setProperty('--collar',({Норка:'#bfc7ce',Соболь:'#9e8373',Свакара:'#afa5ae'})[state.material] || '#c6b4ad');
  }
  function showEditor(key) {
    editing = key;
    el('pick-title').textContent = fieldName(key);
    options.replaceChildren();
    for (const name of getOptions(key)) {
      const button = document.createElement('button');button.type='button';button.className='pick-option';
      button.textContent=name;button.dataset.value=name;button.setAttribute('aria-pressed',String(name===state[key]));
      if (key === 'material' || key === 'fabric') {
        const url = sampleFor(key,name);
        if (url) { const image=document.createElement('img');image.src=url;image.alt='';image.width=48;image.height=35;button.insertBefore(image,button.firstChild); }
      }
      options.append(button);
    }
    pick.showModal();
    (options.querySelector('[aria-pressed=true]') || options.firstElementChild).focus({preventScroll:true});
    options.querySelector(':focus')?.scrollIntoView({block:'nearest'});
  }
  choices.addEventListener('click',event => {
    const b=event.target.closest('[data-field]');if(b)showEditor(b.dataset.field);
  });
  options.addEventListener('click',event => {
    const b=event.target.closest('[data-value]');if(!b)return;
    const name=b.dataset.value;
    if (editing==='model') selectModel(models.find(m=>m.title===name));
    else {
      state[editing]=name;
      if (editing==='material' && !techniques().includes(state.technique)) state.technique=unsure;
      // A change of fur or silhouette may make a named example a different commission.
      if ((editing==='material' || editing==='shape' || editing==='technique') && model.kind==='fur') {
        const namedPerf=Boolean(model.technique);
        const otherFur=editing==='material' && state.material!==model.material;
        const otherCut=namedPerf && (state.shape!==model.shape || state.technique!==model.technique);
        if(otherFur || otherCut) {
          const next=bySlug.get(state.material==='Норка'?'norka':state.material==='Соболь'?'sobol':'drugoy-meh');
          model=next;state.model=next.title;
        }
      }
    }
    active=true;form.hidden=false;success.hidden=true;render();pick.close();
  });
  pick.querySelectorAll('[data-close-pick]').forEach(b=>b.addEventListener('click',()=>pick.close()));
  pick.addEventListener('click',event=>{
    if(event.target===pick){const r=pick.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)pick.close();}
  });
  pick.addEventListener('close',()=>choices.querySelector('[data-field="'+editing+'"]')?.focus({preventScroll:true}));
  options.addEventListener('keydown',event=>{
    const buttons=[...options.children];const i=buttons.indexOf(document.activeElement);
    const offset={ArrowDown:1,ArrowUp:-1}[event.key];
    if(offset || ['Home','End'].includes(event.key)){event.preventDefault();buttons[offset ? (i+offset+buttons.length)%buttons.length : event.key==='Home' ? 0 : buttons.length-1].focus();}
  });
  function clearErrors(){
    el('measure-error').textContent='';
    for(const id of ['height-cm','weight-kg'])el(id).removeAttribute('aria-invalid');
    for(const key of ['name','phone']){el('client-'+key).removeAttribute('aria-invalid');el(key+'-error').textContent='';}
  }
  function resetChoices(){
    selectModel(initial);active=false;form.hidden=false;success.hidden=true;render();
    if(location.search){const url=new URL(location.href);url.searchParams.delete('model');history.replaceState(null,'',url);}
  }
  el('clear-choice').addEventListener('click',()=>{resetChoices();choices.querySelector('button').focus({preventScroll:true});});
  el('transfer').addEventListener('click',()=>{
    active=true;form.hidden=false;success.hidden=true;render();
    requestAnimationFrame(()=>el('client-name').focus({preventScroll:true}));
  });
  el('edit-choice').addEventListener('click',()=>requestAnimationFrame(()=>choices.querySelector('button').focus({preventScroll:true})));
  form.addEventListener('input',event=>{
    if(event.target.id==='client-name' || event.target.id==='client-phone'){
      event.target.removeAttribute('aria-invalid');el(event.target.id.replace('client-','')+'-error').textContent='';
    }
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();clearErrors();
    const name=el('client-name').value.trim(),phone=el('client-phone').value.trim();
    const digits=phone.replace(/\D/g,'');
    const errors=[];
    if(!name || !/\p{L}/u.test(name))errors.push(['name','Введите имя.']);
    if(!/^\+?[\d\s().-]+$/.test(phone)||digits.length<7||digits.length>15)errors.push(['phone','Введите номер телефона, включая код города или страны.']);
    for(const [key,msg] of errors){el('client-'+key).setAttribute('aria-invalid','true');el(key+'-error').textContent=msg;}
    if(errors.length){el('client-'+errors[0][0]).focus();return;}
    const measureIds=[['height-cm','Рост','см'],['weight-kg','Вес','кг']];
    const measures=[];
    for(const [id,label,unit] of measureIds){const input=el(id);if(input.validity.badInput || (input.value && !(Number(input.value)>0))){form.querySelector('.measurements').open=true;input.setAttribute('aria-invalid','true');el('measure-error').textContent='Введите положительное число или оставьте поле пустым.';input.focus();return;}if(input.value)measures.push(label+' '+input.value+' '+unit);}
    const wishes=el('wishes').value.trim();
    el('success-summary').textContent=[active ? summary() : 'Фасон обсудим при встрече',form.elements.meeting.value,...measures,wishes].filter(Boolean).join('. ')+'.';
    form.hidden=true;success.hidden=false;success.focus({preventScroll:true});success.scrollIntoView({block:'nearest'});
  });
  el('again').addEventListener('click',()=>{
    form.reset();form.querySelector('.measurements').open=false;clearErrors();el('success-summary').textContent='';resetChoices();
    el('client-name').focus(); 
  });
  selectModel(bySlug.get(initialSlug)||initial);
  render();
})();


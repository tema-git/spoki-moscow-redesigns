(() => {
  'use strict';
  const get=id=>document.getElementById(id);
  const form=get('plan-form'),brief=get('brief-form'),dialog=get('model-dialog');
  if(!form||!brief||!window.PLATINO_MODELS)return;
  const choices=window.PLATINO_MODELS,models=new Map(choices.map(m=>[m.id,m]));
  const picked=new URLSearchParams(location.search).get('model');
  const initial=models.get(picked)||models.get('kukhni--makassar');
  const length=get('length'),width=get('width'),drawing=get('room-svg'),group=get('layout-field'), fileInput=get('file-plan');
  const radios=Array.from(form.querySelectorAll('[name=layout]'));
  const layouts={line:'Прямая',angle:'Угловая',u:'П-образная',island:'С островом'};
  const format=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:3});
  const focusAt=el=>{el.focus({preventScroll:true});el.scrollIntoView({block:'start',behavior:'instant'})};
  function tag(name,txt,cls){const el=document.createElement(name);if(txt!==undefined)el.textContent=txt;if(cls)el.className=cls;return el;}
  function button(txt,cls,fn){const b=tag('button',txt,cls);b.type='button';b.addEventListener('click',fn);return b;}
  let model=initial,committed=false,attachment=null,url='',revision=0,reading=false,complete=false;
  const shape=()=>model.kitchen?radios.find(r=>r.checked).value:'room';
  const areaText=(a,b)=>{const value=a*b/1e6;return (value>0&&value<.001?'< 0,001':format.format(value))+' м²'};
  function room(){
    const a=length.valueAsNumber,b=width.valueAsNumber;
    return Number.isSafeInteger(a)&&Number.isSafeInteger(b)&&a>0&&b>0&&length.validity.valid&&width.validity.valid?{a,b}:null;
  }
  function elSVG(name,attrs,parent=drawing,txt){
    const e=document.createElementNS('http://www.w3.org/2000/svg',name);
    for(const [key,value] of Object.entries(attrs))e.setAttribute(key,String(value));
    if(txt!==undefined)e.textContent=txt;parent.append(e);return e;
  }
  function renderRoom(){
    const dims=room();drawing.replaceChildren();
    if(!dims){get('area').textContent='—';get('mobile-area').textContent='Введите оба размера комнаты.';drawing.setAttribute('aria-label','Укажите размеры помещения');elSVG('text',{x:240,y:160,'text-anchor':'middle','font-size':19,fill:'#545641'},drawing,'Укажите оба размера');return}
    const {a,b}=dims,scale=Math.min(313/a,198/b),w=a*scale,h=b*scale;
    const x=(480-w)/2+8,y=(330-h)/2+8;
    const rect=(xx,yy,ww,hh,fill,stroke='none',sw=1)=>elSVG('rect',{x:xx,y:yy,width:Math.max(0,ww),height:Math.max(0,hh),fill,stroke,'stroke-width':sw});
    const line=(x1,y1,x2,y2,stroke='#696b56',sw=1)=>elSVG('line',{x1,y1,x2,y2,stroke,'stroke-width':sw});
    rect(x,y,w,h,'#f9f6eb','#434837',3);
    const d=Math.min(32,w*.17,h*.18);
    if(model.kitchen){
      rect(x+2,y+2,w-4,d,'#a29c7a','#61634d',1);
      for(let i=1;i<Math.min(7,Math.ceil(w/32));i++){const xx=x+w*i/Math.min(7,Math.ceil(w/32));line(xx,y+3,xx,y+d+1,'#666854',1)}
      if(shape()==='angle'||shape()==='u'){
        rect(x+2,y+d+2,d,h-d-4,'#a29c7a','#61634d',1);
        line(x+2,y+h*.62,x+d+2,y+h*.62);
      }
      if(shape()==='u')rect(x+w-d-2,y+d+2,d,h-d-4,'#a29c7a','#61634d',1);
      if(shape()==='island')rect(x+w*.29,y+h*.50,w*.44,d,'#b9a275','#665c43',1.3);
      if(w>45&&h>28){
        rect(x+w*.30,y+d*.18,w*.115,d*.69,'#e4e0cc','#60614d',1);
        rect(x+w*.68,y+d*.17,w*.11,d*.72,'#5d604c');
        for(const dx of [.7,.75])elSVG('circle',{cx:x+w*dx,cy:y+d*.5,r:Math.min(2.5,d*.18),fill:'none',stroke:'#dedaca','stroke-width':1});
      }
    }
    const dy=y-15,dx=x-16;
    line(x,dy,x+w,dy);line(x,dy-5,x,dy+5);line(x+w,dy-5,x+w,dy+5);
    line(dx,y,dx,y+h);line(dx-5,y,dx+5,y);line(dx-5,y+h,dx+5,y+h);
    const style={fill:'#3e4335','font-family':'Manrope,Arial,sans-serif','font-weight':600,'font-size':16,'text-anchor':'middle'};
    elSVG('text',{...style,x:x+w/2,y:dy-8},drawing,format.format(a)+' мм');
    elSVG('text',{...style,transform:'translate('+(dx-9)+' '+(y+h/2)+') rotate(-90)',x:0,y:0},drawing,format.format(b)+' мм');
    drawing.setAttribute('aria-label',(layouts[shape()]||'Комната')+', '+a+' на '+b+' миллиметров');
    get('area').textContent=areaText(a,b);get('mobile-area').textContent='Площадь помещения: '+areaText(a,b);
  }
  function message(id,value){const e=get(id);e.textContent=value;e.hidden=!value}
  function releaseFile(){
    revision++;reading=false;
    if(url){URL.revokeObjectURL(url);url=''}
    attachment=null;fileInput.value='';get('file-details').replaceChildren();get('file-details').hidden=true;
  }
  function planLink(text){
    const a=tag('a',text,'text-action');a.href='#plan';return a;
  }
  function summary(){
    const s=get('brief-summary');s.replaceChildren();
    const r=room();
    s.append(tag('strong',model.name+' · '+model.price));
    if(committed&&r){
      s.append(tag('span',(layouts[shape()]||'Помещение')+' · '+format.format(r.a)+' × '+format.format(r.b)+' мм · '+areaText(r.a,r.b)));
      if(attachment)s.append(tag('span','План: '+attachment.name));
      s.append(planLink('Изменить планировку'));
    }else{s.append(tag('span',committed?'Проверьте размеры комнаты.':'Размеры помещения ещё не добавлены.'),planLink('К планировке'))}
  }
  function makeEditable(){
    if(!complete)return;
    complete=false;get('brief-success').hidden=true;get('brief-success').replaceChildren();brief.hidden=false;get('brief-summary').hidden=false;
  }
  function refresh(){
    get('selected-name').textContent=model.name;
    group.hidden=!model.kitchen;
    renderRoom();summary();
  }
  function validRoom(){
    let invalid=null;
    for(const input of [length,width]){
      const valid=input.validity.valid&&Number.isSafeInteger(input.valueAsNumber)&&input.valueAsNumber>0;
      input.setAttribute('aria-invalid',String(!valid));if(!valid&&!invalid)invalid=input;
    }
    if(invalid){message('plan-error','Введите длину и ширину положительными целыми числами в миллиметрах.');invalid.focus();return false}
    message('plan-error','');return true;
  }
  for(const el of [length,width,...radios])el.addEventListener('input',()=>{
    makeEditable();el.removeAttribute('aria-invalid');message('plan-error','');refresh();
  });
  function resetPlanner(resetBrief){
    makeEditable();releaseFile();model=initial;committed=false;form.reset();
    length.removeAttribute('aria-invalid');width.removeAttribute('aria-invalid');message('plan-error','');
    if(resetBrief){brief.reset();message('brief-error','');for(const el of [get('person'),get('reply')])el.removeAttribute('aria-invalid')}
    refresh();
  }
  get('plan-reset').addEventListener('click',()=>resetPlanner(false));

  const modelSearch=get('model-search'),list=get('model-options'),chooser=get('choose-model');
  const fold=s=>s.toLowerCase().replaceAll('ё','е');
  function listModels(){
    const query=fold(modelSearch.value).trim().split(/\s+/).filter(Boolean),fragment=document.createDocumentFragment();
    for(const entry of choices){
      if(!query.every(q=>fold(entry.name+' '+entry.category).includes(q)))continue;
      const b=button('','model-option',()=>{
        makeEditable();model=entry;refresh();dialog.close();chooser.focus();
      });
      const title=tag('span',entry.name);title.append(tag('small',entry.category));b.append(title,tag('span',entry.price));b.setAttribute('aria-pressed',String(entry.id===model.id));fragment.append(b);
    }
    if(!fragment.childNodes.length)fragment.append(tag('p','Такой модели нет. Попробуйте другое название.','dialog-empty'));
    list.replaceChildren(fragment);list.scrollTop=0;
  }
  chooser.addEventListener('click',()=>{modelSearch.value='';listModels();dialog.showModal();modelSearch.focus()});
  dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();dialog.close()}});
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()});
  modelSearch.addEventListener('input',listModels);

  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files[0];if(!file)return;
    makeEditable();if(url){URL.revokeObjectURL(url);url=''}attachment=null;
    const ticket=++revision;reading=true;get('file-details').hidden=true;get('file-details').replaceChildren();message('plan-error','');
    function reject(text){if(ticket!==revision)return;releaseFile();message('plan-error',text);summary()}
    if(file.size>10*1024*1024||!file.size){reject('Выберите непустой файл размером до 10 МБ.');return}
    try{
      const bytes=new Uint8Array(await file.slice(0,12).arrayBuffer());
      if(ticket!==revision)return;
      const sig=Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join(''),ascii=String.fromCharCode(...bytes);
      const pdf=ascii.startsWith('%PDF-'),image=sig.startsWith('89504e470d0a1a0a')||sig.startsWith('ffd8ff')||(ascii.startsWith('RIFF')&&ascii.slice(8,12)==='WEBP');
      if(!pdf&&!image){reject('Подойдут изображение PNG, JPG, WebP или документ PDF.');return}
      const box=get('file-details'),fragment=document.createDocumentFragment();
      if(image){
        const src=URL.createObjectURL(file);url=src;const img=new Image();img.alt='Локальный просмотр вашего плана';img.src=src;await img.decode();
        if(ticket!==revision)return;fragment.append(img);
      }
      attachment={name:file.name};reading=false;
      fragment.append(tag('span',file.name+(pdf?' · PDF':'')),button('Убрать','subtle',()=>{releaseFile();summary()}));box.replaceChildren(fragment);box.hidden=false;summary();
    }catch{reject('Файл не удалось открыть. Выберите другой план.')}
  });
  form.addEventListener('submit',e=>{
    e.preventDefault();makeEditable();if(!validRoom())return;
    if(reading){message('plan-error','Дождитесь открытия файла.');return}
    committed=true;message('brief-error','');refresh();focusAt(get('brief-heading'));
  });
  for(const field of [get('person'),get('reply')])field.addEventListener('input',()=>{field.removeAttribute('aria-invalid');message('brief-error','')});
  brief.addEventListener('submit',e=>{
    e.preventDefault();
    if(!committed||!room()){
      message('brief-error','Добавьте в бриф планировку и размеры помещения.');get('brief-summary').querySelector('a').focus();return;
    }
    const person=get('person'),reply=get('reply'),name=person.value.trim(),address=reply.value.trim();
    const digits=address.replace(/\D/g,'');
    const okEmail=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
    const okPhone=/^\+?[\d\s().-]+$/.test(address)&&digits.length>=7&&digits.length<=15;
    person.setAttribute('aria-invalid',String(!name));reply.setAttribute('aria-invalid',String(!okEmail&&!okPhone));
    if(!name||(!okEmail&&!okPhone)){message('brief-error',!name?'Укажите ваше имя.':'Введите телефон с кодом города или электронную почту.');(!name?person:reply).focus();return}
    if(reading){message('brief-error','Дождитесь открытия файла в планировщике.');return}
    message('brief-error','');
    const success=get('brief-success'),r=room(),details=tag('ul'),wishes=get('wishes').value.trim();
    const lines=[model.name+' · '+model.price,(layouts[shape()]||'Помещение')+' · '+format.format(r.a)+' × '+format.format(r.b)+' мм · '+areaText(r.a,r.b)];
    if(attachment)lines.push('Локальное вложение: '+attachment.name);
    if(wishes)lines.push('Пожелания: '+wishes);
    for(const value of lines)details.append(tag('li',value));
    success.replaceChildren(tag('h3','Бриф готов'),tag('p','Это локальный результат. Данные не отправлены, заявка в салоне не создана.'),details,
      button('Начать новый бриф','primary',()=>{resetPlanner(true);focusAt(chooser)}));
    brief.hidden=true;get('brief-summary').hidden=true;success.hidden=false;complete=true;brief.reset();releaseFile();focusAt(success);
  });
  // Clear personal fields, object URLs and measurements when leaving, including back/forward cache.
  window.addEventListener('pagehide',()=>{dialog.open&&dialog.close();resetPlanner(true)});
  refresh();
})();

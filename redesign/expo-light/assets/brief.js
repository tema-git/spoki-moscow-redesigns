(() => {
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const root=$('#planner');
  if(!root)return;
  const data=JSON.parse($('#brief-data').textContent);
  const form=$('#contact-form'), width=$('#width'), depth=$('#depth'), request=$('#submitted-brief'),ref=$('#project-ref');
  const dims=[width,depth],modes=['','Линейный','Угловой','Полуостров','Остров'];
  const equipNames={desk:'Рецепция',table:'Переговорная',case:'Витрина',sign:'Подвес'};
  const serviceDialog=$('#service-dialog'),serviceButton=$('#choose-service'),serviceText=$('#service-value');
  const defaultService='Выставочный стенд';
  let reference='',linked=false,record=null;
  const cleaned=s=>s.trim().replace(/\s+/g,' ');
  const number=n=>n.toLocaleString('ru-RU',{maximumFractionDigits:4});
  function getState(){
    const values=dims.map(el=>el.valueAsNumber);
    const invalid=dims.some(el=>!el.validity.valid||!Number.isFinite(el.valueAsNumber));
    if(invalid)return null;
    const [w,d]=values,area=Math.round(w*d*10000)/10000;
    if(!Number.isFinite(area))return null;
    return {w,d,area,open:Number(root.elements.layout.value),equipment:$$('[name="equipment"]:checked').map(el=>el.value),pack:data.packs.find(p=>area>=p.min&&area<=p.max)};
  }
  const money=s=>s.pack?s.pack.price:'По запросу';
  function description(s){
    const elements=s.equipment.map(key=>equipNames[key]).join(', ')||'Без дополнительного оснащения';
    const values=['Стенд '+number(s.w)+' × '+number(s.d)+' м, '+number(s.area)+' м².','Планировка — '+modes[s.open].toLocaleLowerCase('ru')+'.','Оснащение — '+elements+'.',s.pack?'Пакет '+s.pack.label+', '+money(s)+'.':'Площадь вне опубликованных пакетов. Стоимость по запросу.'];
    if(reference)values.push(reference);
    return values.join('\n');
  }
  function setRequest(value,fromPlan){
    request.value=value;
    $('#request-context').hidden=!value;
    $('#revise-brief').hidden=!fromPlan;
    linked=fromPlan;
  }
  function planDrawing(s){
    const svg=$('#plan');
    const NS='http://www.w3.org/2000/svg';
    const node=(kind,props,text)=>{
      const el=document.createElementNS(NS,kind);
      for(const [k,v] of Object.entries(props))el.setAttribute(k,v);
      if(text)el.textContent=text;return el;
    };
    svg.replaceChildren();
    const scale=Math.min(324/s.w,155/s.d), w=s.w*scale,h=s.d*scale, x=(460-w)/2,y=(223-h)/2;
    const small=Math.min(w,h), ink='#a4e1ec',paper='#ceeef2',accent='#50a2e4';
    const add=(kind,props,text)=>svg.appendChild(node(kind,props,text));
    const rect=(rx,ry,rw,rh,fill,stroke,sw=1.6)=>add('rect',{x:rx,y:ry,width:rw,height:rh,fill,stroke,'stroke-width':sw});
    const line=(x1,y1,x2,y2,color,sw=1,dash='')=>add('line',{x1,y1,x2,y2,stroke:color,'stroke-width':sw,'stroke-dasharray':dash,'stroke-linecap':'square'});
    const text=(tx,ty,v,more={})=>add('text',{x:tx,y:ty,fill:paper,'font-size':15,'font-weight':550,'font-family':'Montserrat,Arial','text-anchor':'middle',...more},v);
    line(x,y-12,x+w,y-12,'#79a5ba');line(x,y-16,x,y-7,ink);line(x+w,y-16,x+w,y-7,ink);
    text(x+w/2,y-19,number(s.w)+' м');
    const labelX=x+w+17;line(labelX,y,labelX,y+h,'#79a5ba');line(labelX-4,y,labelX+4,y,ink);line(labelX-4,y+h,labelX+4,y+h,ink);
    text(labelX+11,y+h/2+5,number(s.d)+' м',{'text-anchor':'start'});
    rect(x,y,w,h,'#29495a','none');
    const walls=[s.open<=3,s.open<=2,false,s.open===1];
    [[x,y,x+w,y],[x+w,y,x+w,y+h],[x,y+h,x+w,y+h],[x,y,x,y+h]].forEach((q,i)=>line(...q,ink,walls[i]?4:1.7,walls[i]?'':'5 5'));
    if(s.equipment.includes('sign')){
      const g=add('rect',{x:x+w*.14,y:y+h*.12,width:w*.72,height:h*.64,fill:'none',stroke:'#8fbae7','stroke-width':1.7,'stroke-dasharray':'7 4',rx:Math.min(small*.02,3)});
      g.append(node('title',{},'Проекция подвеса'));
    }
    if(s.equipment.includes('case')){
      const rx=x+w*.08,ry=y+h*.14,rw=w*.26,rh=h*.16;
      rect(rx,ry,rw,rh,'#789eaa','#d8f0fa');line(rx+rw*.5,ry,rx+rw*.5,ry+rh,ink);line(rx,ry+rh/2,rx+rw,ry+rh/2,ink);
    }
    if(s.equipment.includes('desk')){
      const rw=w*.28,rh=h*.14,rx=x+w*.11,ry=y+h*.70;
      rect(rx,ry,rw,rh,accent,'#bce6ff');line(rx+rw*.06,ry+rh*.23,rx+rw*.94,ry+rh*.23,'#c7e9ff');
    }
    if(s.equipment.includes('table')){
      const cx=x+w*.68,cy=y+h*.49,r=small*.12;
      for(const [a,b] of [[-1.38,0],[1.38,0],[0,-1.4],[0,1.4]])add('circle',{cx:cx+a*r,cy:cy+b*r,r:r*.32,fill:'#aac4bc',stroke:'#d4e6e1','stroke-width':1});
      add('circle',{cx,cy,r,fill:'#cad9cb',stroke:'#ecf3e6','stroke-width':1.5});
    }
    text(230,235,s.open+' '+(['','открытая сторона','открытые стороны','открытые стороны','открытые стороны'][s.open]),{'font-size':14});
    svg.setAttribute('aria-label',modes[s.open]+' стенд '+s.w+' на '+s.d+' метров. Открытых сторон: '+s.open+'. '+s.equipment.map(k=>equipNames[k]).join(', '));
  }
  function render(showError=true){
    const s=getState();
    for(const el of dims)el.setAttribute('aria-invalid',String(showError&&(!el.validity.valid||!Number.isFinite(el.valueAsNumber))));
    $('#dim-error').textContent=!s&&showError?'Введите положительные размеры в метрах с точностью до сантиметра.':'';
    $('#show-plan').disabled=$('#apply-brief').disabled=$('#download-brief').disabled=!s;
    if(!s){
      $('#plan').replaceChildren();$('#plan').setAttribute('aria-label','Укажите размеры для построения схемы.');
      $('#live-area').textContent='—';$('#plan-price').textContent='—';$('#plan-band').textContent='Укажите размеры';
      if(linked)request.value='';
      return;
    }
    planDrawing(s);$('#live-area').textContent=number(s.area)+' м²';$('#plan-price').textContent=money(s);
    $('#plan-band').textContent=s.pack?'Пакет '+s.pack.label:'Индивидуальный расчёт';
    if(linked)request.value=description(s);
  }
  root.addEventListener('input',()=>render());
  for(const btn of $$('[data-nudge]'))btn.addEventListener('click',()=>{
    const input=document.getElementById(btn.dataset.nudge);const old=input.valueAsNumber;
    input.value=Math.max(.01,Math.round(((Number.isFinite(old)?old:1)+Number(btn.dataset.by))*100)/100);
    render();
  });
  function removeSourceQuery(){
    const url=new URL(location.href);url.searchParams.delete('item');url.searchParams.delete('project');
    try{history.replaceState(null,'',url.href);}catch{/* Local file preview still works. */}
  }
  root.addEventListener('reset',()=>{
    setRequest('',false);record=null;reference='';ref.hidden=true;ref.textContent='';removeSourceQuery();
    setTimeout(()=>render(false),0);
  });
  function openForm(){
    $('#form-shell').hidden=false;$('#form-success').hidden=true;
    try{history.replaceState(null,'','#contacts');}catch{/* Local anchor focus is sufficient. */}
    $('#form-shell').scrollIntoView({block:'start'});form.elements.person.focus({preventScroll:true});
  }
  function apply(){
    const s=getState();if(!s){render();dims.find(el=>!el.validity.valid)?.focus();return;}
    setRequest(description(s),true);serviceText.textContent=defaultService;openForm();
  }
  $('#show-plan').addEventListener('click',()=>{$('#plan-result').scrollIntoView({block:'start'});$('#plan-result').focus({preventScroll:true});});
  $('#apply-brief').addEventListener('click',apply);root.addEventListener('submit',e=>{e.preventDefault();apply();});
  request.addEventListener('input',()=>{linked=false;});
  $('#download-brief').addEventListener('click',()=>{
    const s=getState();if(!s)return;
    const text='Бриф выставочного стенда — Экспо Лайт\n\n'+description(s)+'\n\nУсловная схема для согласования. Итоговую смету определяет компания.';
    const url=URL.createObjectURL(new Blob(['\uFEFF',text],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='expo-light-brief.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
  });
  const lookup=new URLSearchParams(location.search),item=Object.hasOwn(data.items,lookup.get('item'))?data.items[lookup.get('item')]:null,project=Object.hasOwn(data.projects,lookup.get('project'))?data.projects[lookup.get('project')]:null;
  if(item){
    const services={premium:'Мобильный стенд',sego:'Мобильный стенд','mobilnaya-arenda':'Мобильный стенд','pop-up':'Мобильный стенд',osnashchenie:'Мебель и техника',pechat:'Полиграфия и сувениры',video:'Видеомонтаж'};
    serviceText.textContent=services[item.category]||defaultService;
    const article=item.article?' · '+item.article:'';
    record=item.title+article+' — '+item.price;setRequest(record,false);
  }else if(project){
    reference='Ориентир из портфолио — '+project.title+', '+project.event+', '+project.area+'.';
    ref.hidden=false;ref.textContent=reference+' Размеры эскиза можно изменить.';
    const n=parseInt(project.area,10);
    if(Number.isInteger(n)&&n>0){
      let divisor=Math.floor(Math.sqrt(n));
      while(divisor>1 && n%divisor!==0)divisor--;
      width.value=n/divisor;depth.value=divisor;
    }
  }
  serviceButton.addEventListener('click',()=>{
    for(const option of $$('[name="service-option"]'))option.checked=option.value===serviceText.textContent;
    serviceDialog.showModal();serviceDialog.querySelector(':checked')?.focus();
  });
  $('#confirm-service').addEventListener('click',()=>{serviceText.textContent=serviceDialog.querySelector(':checked').value;serviceDialog.close();});
  $('#cancel-service').addEventListener('click',()=>serviceDialog.close());
  serviceDialog.addEventListener('close',()=>serviceButton.focus({preventScroll:true}));
  serviceDialog.addEventListener('click',e=>{
    const b=serviceDialog.getBoundingClientRect();
    if(e.target===serviceDialog&&(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom))serviceDialog.close();
  });
  const file=form.elements.planfile;
  function fileState(){const name=file.files[0]?.name||'';$('#file-name').textContent=name;$('#remove-file').hidden=!name;}
  file.addEventListener('change',fileState);$('#remove-file').addEventListener('click',()=>{file.value='';fileState();file.focus();});
  const messages={
    person:el=>cleaned(el.value)?'':'Укажите имя.',
    phone:el=>{const raw=cleaned(el.value);return /^[+\d\s().-]+$/.test(raw)&&/^\d{7,15}$/.test(raw.replace(/\D/g,''))?'':'Введите телефон с кодом города или страны.';},
    email:el=>el.validity.typeMismatch?'Проверьте адрес электронной почты.':''
  };
  function validate(name){
    const el=form.elements[name],msg=messages[name](el);
    $('#error-'+name).textContent=msg;el.setAttribute('aria-invalid',String(Boolean(msg)));return !msg;
  }
  for(const name of Object.keys(messages))form.elements[name].addEventListener('input',()=>{
    if(form.elements[name].getAttribute('aria-invalid')==='true')validate(name);
  });
  form.addEventListener('submit',e=>{
    e.preventDefault();
    const invalid=Object.keys(messages).filter(k=>!validate(k));
    if(invalid.length){form.elements[invalid[0]].focus();return;}
    if(linked&&!getState()){location.hash='brief';render();width.focus();return;}
    form.reset();fileState();setRequest('',false);record=null;serviceText.textContent=defaultService;
    $('#form-shell').hidden=true;$('#form-success').hidden=false;$('#form-success').focus();
  });
  $('#again').addEventListener('click',()=>{root.reset();openForm();});
  render(false);form.querySelector('[type=submit]').disabled=false;
})();

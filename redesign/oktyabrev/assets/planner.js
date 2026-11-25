(() => {
  'use strict';
  const models=window.ROOM_CATALOG || [];
  if(!models.length)return;
  const get=id=>document.getElementById(id), base=document.body.dataset.base;
  const q=new URLSearchParams(location.search);
  const byId=new Map(models.map(model=>[String(model.i),model]));
  const standard=byId.get('9880')||models[0];
  const start=byId.get(q.get('item'))||standard;
  const variantAt=(m,index)=>m.v.find(v=>v.i===Number(index))||m.v[0];
  const first={model:start,variant:variantAt(start,q.get('v')),rotate:false,finish:(q.get('finish')||'').slice(0,250)};
  const copy=slot=>({...slot});
  let slots=[copy(first)],picking=0,returnButton=null;
  const roomW=get('room-w'),roomD=get('room-d'),slotBox=get('plan-slots'),svg=get('room-svg');
  const picker=get('model-picker'),modelList=get('model-list'),search=get('model-search');
  const cm=n=>(Math.round(n*10)/10).toLocaleString('ru-RU',{maximumFractionDigits:1});
  function el(tag,cls,text){
    const n=document.createElement(tag);
    if(cls)n.className=cls;if(text!==undefined)n.textContent=text;
    return n;
  }
  function button(cls,text){const b=el('button',cls,text);b.type='button';return b;}
  function labels(index){return index?'Вариант Б':'Вариант А';}
  function drawSlots(focusKey){
    slotBox.replaceChildren();
    slots.forEach((s,i)=>{
      const container=el('div','slot');
      const heading=el('div','slot-head');heading.append(el('span','',labels(i)));
      if(i){
        const drop=button('slot-remove','Убрать из сравнения');
        drop.addEventListener('click',()=>{slots.splice(i,1);drawSlots();get('compare-add').focus();});
        heading.append(drop);
      }
      const choose=button('slot-model',s.model.n);
      choose.id='model-'+i;choose.setAttribute('aria-label',labels(i)+'. Выбрать модель. '+s.model.n);
      choose.setAttribute('aria-haspopup','dialog');
      const marker=el('span','chev');marker.setAttribute('aria-hidden','true');choose.append(marker);
      choose.addEventListener('click',()=>openPicker(i,choose));
      container.append(heading,choose);
      const options=el('fieldset','option-set'),legend=el('legend','', 'Высота × длина × ширина, мм');
      options.append(legend);
      const list=el('div','size-options');
      s.model.v.forEach(v=>{
        const label=el('label','choice'),radio=el('input');radio.type='radio';radio.name='room-variant-'+i;radio.value=String(v.i);radio.checked=s.variant.i===v.i;
        radio.addEventListener('change',()=>{s.variant=v;updateRoom();});
        label.append(radio,el('span','',v.s));list.append(label);
      });
      options.append(list);container.append(options);
      const rotate=el('label','rotate-check'),check=el('input');check.type='checkbox';check.checked=s.rotate;check.setAttribute('aria-label','Повернуть '+labels(i)+' на 90°');
      check.addEventListener('change',()=>{s.rotate=check.checked;updateRoom();});
      rotate.append(check,document.createTextNode('Повернуть на 90°'));container.append(rotate);
      if(s.finish)container.append(el('p','plan-note','Отделка: '+s.finish));
      slotBox.append(container);
    });
    get('compare-add').hidden=slots.length>=2;updateRoom();
    if(focusKey)get(focusKey)?.focus({preventScroll:true});
  }
  get('compare-add').addEventListener('click',()=>{
    if(slots.length>=2)return;
    const a=slots[0],others=a.model.v.filter(v=>v.i!==a.variant.i);
    const model=others.length?a.model:models.find(m=>m.i!==a.model.i)||a.model;
    slots.push({model,variant:others[0]||model.v[0],rotate:false,finish:model===a.model?a.finish:''});
    drawSlots('model-1');
  });
  function openPicker(index,trigger){
    picking=index;returnButton=trigger;search.value='';renderList();picker.showModal();search.focus();
  }
  function renderList(){
    const clean=v=>v.toLocaleLowerCase('ru-RU').replaceAll('ё','е');
    const words=clean(search.value.trim()).split(/\s+/);
    const filtered=models.filter(m=>words.every(w=>clean(m.n+' OK'+m.i).includes(w)));
    modelList.replaceChildren();modelList.scrollTop=0;
    if(!filtered.length){modelList.append(el('p','plan-note','Совпадений нет. Попробуйте другое название.'));return;}
    const frag=new DocumentFragment();
    filtered.forEach(m=>{
      const b=button('',m.n);b.setAttribute('data-model-id',m.i);
      b.addEventListener('click',()=>{
        slots[picking]={model:m,variant:m.v[0],rotate:false,finish:''};
        closePicker(false);drawSlots('model-'+picking);
      });
      frag.append(b);
    });
    modelList.append(frag);
  }
  function closePicker(restore=true){
    const trigger=returnButton;returnButton=null;
    picker.close();
    if(restore && trigger?.isConnected)trigger.focus({preventScroll:true});
  }
  picker.querySelector('.picker-close').addEventListener('click',()=>closePicker());
  picker.addEventListener('cancel',event=>{event.preventDefault();closePicker();});
  picker.addEventListener('click',event=>{
    if(event.target!==picker)return;
    const rect=picker.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closePicker();
  });
  search.addEventListener('input',renderList);
  picker.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      event.preventDefault();event.stopPropagation();closePicker();
      return;
    }
    if(!['ArrowDown','ArrowUp'].includes(event.key))return;
    const buttons=[...modelList.querySelectorAll('button')];
    if(!buttons.length)return;
    event.preventDefault();
    const old=buttons.indexOf(document.activeElement);
    const index=old<0?0:Math.max(0,Math.min(buttons.length-1,old+(event.key==='ArrowDown'?1:-1)));
    buttons[index].focus();
  });
  function svgEl(tag,attrs,txt){
    const n=document.createElementNS('http://www.w3.org/2000/svg',tag);
    Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,String(v)));
    if(txt!==undefined)n.textContent=txt;return n;
  }
  function paint(w,d,items) {
    svg.replaceChildren();
    const left=46,top=36, maxW=Math.max(w,...items.map(i=>i.l)),maxD=Math.max(d,...items.map(i=>i.d));
    const scale=Math.min(466/maxW,270/maxD);
    svg.append(svgEl('title',{},'План комнаты '+cm(w)+' на '+cm(d)+' см. Габаритные прямоугольники показаны от верхнего левого угла.'));
    const step=Math.max(12,Math.min(52,50*scale)),defs=svgEl('defs',{}),grid=svgEl('pattern',{id:'room-grid',width:step,height:step,patternUnits:'userSpaceOnUse',x:left,y:top});
    grid.append(svgEl('path',{d:'M'+step+' 0H0V'+step,stroke:'#99a084',opacity:'.34',fill:'none'}));defs.append(grid);svg.append(defs);
    svg.append(svgEl('rect',{x:left,y:top,width:w*scale,height:d*scale,fill:'url(#room-grid)',stroke:'#f3e9d0','stroke-width':3}));
    const caption=(x,y,txt)=>svgEl('text',{x,y,fill:'#f2e8d5','font-size':17,'font-family':'Manrope, sans-serif'},txt);
    svg.append(caption(left,top-12,cm(w)+' см'));
    svg.append(caption(left,top+Math.max(d*scale,...items.map(o=>o.d*scale))+28,'Глубина комнаты '+cm(d)+' см'));
    const colors=['#dfbd8b','#c1d3de'];
    items.forEach((item,i)=>{
      const x=left+2,y=top+2,width=Math.max(.5,item.l*scale-3),height=Math.max(.5,item.d*scale-3);
      svg.append(svgEl('rect',{x,y,width,height,fill:colors[i],'fill-opacity':i?.09:.47,stroke:colors[i],'stroke-width':i?3:2,'stroke-dasharray':i?'8 5':'none'}));
      if(width>28 && height>22){
        const xx=i?x+Math.min(width-17,43):x+7;
        svg.append(svgEl('text',{x:xx,y:y+19,fill:i?'#fff':'#191c16','font-size':17,'font-family':'Manrope, sans-serif','font-weight':700},i?'Б':'А'));
      }
    });
  }
  function updateRoom(){
    const w=roomW.valueAsNumber,d=roomD.valueAsNumber, result=get('plan-result'),link=get('plan-request');
    result.replaceChildren();
    if(!roomW.validity.valid || !roomD.validity.valid || !Number.isFinite(w)||!Number.isFinite(d)){
      svg.replaceChildren();get('plan-dimensions').textContent='';result.append(el('p','plan-error','Укажите ширину и глубину от 1 до 10 000 см с точностью до миллиметра.'));link.hidden=true;return;
    }
    link.hidden=false;
    get('plan-dimensions').textContent=cm(w)+' × '+cm(d)+' см';
    const picked=slots.map(s=>({l:(s.rotate?s.variant.d:s.variant.l)/10,d:(s.rotate?s.variant.l:s.variant.d)/10}));
    paint(w,d,picked);const desc=['Комната '+cm(w)+' × '+cm(d)+' см'];
    slots.forEach((s,i)=>{
      const item=picked[i],dx=Math.round((w-item.l)*10)/10,dy=Math.round((d-item.d)*10)/10,ok=dx>=0 && dy>=0;
      const block=el('div','plan-result-card'+(ok?'':' oversize'));
      block.append(el('strong','',labels(i)+(ok?' помещается по габаритам':' выходит за границы')));
      const space=(n,axis)=>n>=0?'по '+axis+' свободно '+cm(n)+' см':'по '+axis+' не хватает '+cm(-n)+' см';
      block.append(el('div','plan-measures','На плане '+cm(item.l)+' × '+cm(item.d)+' см'+(s.variant.h?' · высота '+cm(s.variant.h/10)+' см':'')));
      block.append(el('span','',space(dx,'ширине')+', '+space(dy,'глубине')+'.'));
      result.append(block);
      desc.push(labels(i)+'. '+s.model.n+', '+s.variant.s+' мм'+(s.rotate?', поворот на 90°':'')+(s.finish?', '+s.finish:''));
    });
    link.href=base+'contacts/index.html?'+new URLSearchParams({model:desc.join('\n')})+'#request';
  }
  get('plan-jump').addEventListener('click',()=>{
    if(!roomW.reportValidity()||!roomD.reportValidity())return;
    const sheet=get('plan-sheet');sheet.focus({preventScroll:true});sheet.scrollIntoView({block:'start'});
  });
  roomW.addEventListener('input',updateRoom);roomD.addEventListener('input',updateRoom);
  get('plan-reset').addEventListener('click',()=>{
    slots=[copy(first)];roomW.value='450';roomD.value='320';drawSlots();roomW.focus({preventScroll:true});
  });
  drawSlots();
})();

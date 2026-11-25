(() => {
  'use strict';
  const form=document.querySelector('#request-form'); if(!form)return;
  const input=form.elements,success=document.querySelector('#request-success'),err=document.querySelector('#form-error');
  const q=new URLSearchParams(location.search),row=(window.RA_CATALOG||[]).find(m=>m.id===q.get('model'));
  const categories=window.RA_CATEGORIES||{};
  if(row){
    const base=[row.brand,row.name].filter(Boolean);
    input.task.value=(row.name.startsWith(row.brand+' ')?row.name:base.join(' · '))+' — '+row.category+'.'+(q.get('pick')?' '+q.get('pick').slice(0,250)+'.':'');
  } else if(categories[q.get('category')]) input.task.value=categories[q.get('category')]+'.';
  else if(q.get('topic')==='service') input.task.value='Диагностика и ремонт оборудования. ';
  else if(q.get('topic')==='parts') input.task.value='Запасная часть. Каталожный номер: ';
  const names={company:'организацию',city:'город',person:'контактное лицо',phone:'телефон',task:'технику или условия работ'};
  function check(el){
    const v=el.value.trim();
    if(el.required && !v)return 'Укажите '+names[el.name]+'.';
    if(el.name==='phone' && (!/^[+0-9\s().-]+$/.test(v)||v.replace(/\D/g,'').length<6||v.replace(/\D/g,'').length>15))return 'Укажите телефон с кодом города или оператора.';
    if(el.name==='email'&&v&&!el.validity.valid)return 'Проверьте электронный адрес.';
    return '';
  }
  form.addEventListener('input',e=>{if(e.target.matches('input,textarea')){e.target.removeAttribute('aria-invalid');e.target.removeAttribute('aria-describedby');err.textContent='';}});
  form.addEventListener('submit',e=>{
    e.preventDefault();
    let first=null;
    for(const el of form.querySelectorAll('input,textarea')){
      const message=check(el);
      if(message){el.setAttribute('aria-invalid','true');if(!first)first=[el,message];}
      else {el.removeAttribute('aria-invalid');el.removeAttribute('aria-describedby');}
    }
    if(first){err.textContent=first[1];first[0].setAttribute('aria-describedby','form-error');first[0].focus();return;}
    err.textContent='';
    success.querySelector('.draft-text').textContent=[input.company.value.trim()+' · '+input.city.value.trim(),input.person.value.trim()+' · '+input.phone.value.trim(),input.email.value.trim(),input.task.value.trim()].filter(Boolean).join('\n');
    form.hidden=true;success.hidden=false;success.querySelector('h3').focus();
  });
  document.querySelector('[data-edit]').addEventListener('click',()=>{success.hidden=true;form.hidden=false;input.task.focus();});
  document.querySelector('[data-again]').addEventListener('click',()=>{
    form.reset();input.task.value='';err.textContent='';success.querySelector('.draft-text').textContent='';
    for(const item of form.querySelectorAll('[aria-invalid]'))item.removeAttribute('aria-invalid');
    success.hidden=true;form.hidden=false;input.company.focus();
  });
  document.querySelector('#request-fields').disabled=false;
})();

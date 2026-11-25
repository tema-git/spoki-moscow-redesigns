(() => {
  const input=document.querySelector('#model-search'), box=document.querySelector('#search-results'), status=document.querySelector('#search-count');
  const norm=s=>s.toLocaleLowerCase('ru').replace(/[\s·-]+/g,'');
  function render(){
    const q=norm(input.value.trim());box.replaceChildren();status.textContent='';if(!q)return;
    const matches=window.RA_CATALOG.filter(m=>[m.name,m.brand+' '+m.name,m.category,m.brand+' '+m.category].some(s=>norm(s).includes(q)));
    status.textContent=matches.length?'Найдено позиций: '+matches.length:'Совпадений нет. Попробуйте обозначение без названия серии.';
    matches.forEach(m=>{
      const a=document.createElement('a'),title=document.createElement('strong'),desc=document.createElement('small');
      a.href='models/'+encodeURIComponent(m.id)+'.html';a.className='search-hit';
      title.textContent=m.name;desc.textContent=m.brand+' · '+m.category;
      a.append(title,desc);box.append(a);
    });
  }
  input.addEventListener('input',render);
})();

(() => {
  'use strict';
  const grid=document.querySelector('#gallery-grid'),more=document.querySelector('#gallery-more');
  if(!grid)return;
  const entries=window.RA_MEDIA||[],filters=Array.from(document.querySelectorAll('[data-album]'));
  const total=document.querySelector('.gallery-total');
  let selection='all',items=[],shown=0;
  function append(){
    const batch=document.createDocumentFragment();
    items.slice(shown,shown+16).forEach(m=>{
      const fig=document.createElement('figure'),a=document.createElement('a'),img=document.createElement('img'),cap=document.createElement('figcaption');
      fig.className='gallery-item';fig.dataset.photo=String(m.is_photo);
      a.href=m.local;a.dataset.zoom=m.id;a.className='zoom';a.setAttribute('aria-label','Увеличить. '+m.caption);
      img.src=m.local;img.width=m.width;img.height=m.height;img.alt=m.caption;img.loading='lazy';img.decoding='async';
      cap.textContent=m.caption;a.append(img);
      fig.append(a,cap);batch.append(fig);
    });
    shown=Math.min(shown+16,items.length);grid.append(batch);more.hidden=shown>=items.length;
    total.textContent='Показано '+shown+' из '+items.length;
  }
  function render(key){
    selection=filters.some(a=>a.dataset.album===key)?key:'all';
    filters.forEach(a=>{if(a.dataset.album===selection)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});
    items=entries.filter(m=>selection==='documents' ? !m.is_photo&&!['logo','archive-poster','map'].includes(m.role) : m.is_photo&&(selection==='all'||(selection==='archive' ? !(m.albums||[]).length : (m.albums||[]).includes(selection.replace('album-','')))));
    window.raVisibleGallery=items.map(m=>String(m.id));
    shown=0;grid.replaceChildren();append();
  }
  more.addEventListener('click',()=>{
    const prev=shown;append();const target=grid.children[prev]?.querySelector('a');
    if(target)target.focus({preventScroll:true});
  });
  filters.forEach(a=>a.addEventListener('click',e=>{
    if(e.metaKey||e.ctrlKey||e.shiftKey)return;e.preventDefault();history.pushState(null,'',a.getAttribute('href'));render(a.dataset.album);
  }));
  function fromUrl(){render(new URLSearchParams(location.search).get('album')||'all');}
  window.addEventListener('popstate',fromUrl);fromUrl();
})();

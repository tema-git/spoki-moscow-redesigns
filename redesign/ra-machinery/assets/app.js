(() => {
  'use strict';
  const root = document.body.dataset.root;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const nav = document.querySelector('.primary-nav');
  const menu = document.querySelector('.menu-toggle');
  function closeNav(focus = false) {
    nav.classList.remove('open');
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Открыть меню');
    if (focus) menu.focus();
  }
  menu.addEventListener('click', () => {
    if (nav.classList.contains('open')) { closeNav(true); return; }
    nav.classList.add('open');
    menu.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-label', 'Закрыть меню');
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('header') || event.target.closest('nav a,.contact-magnet,.header-phone')) closeNav();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && nav.classList.contains('open')) closeNav(true);
  });
  nav.addEventListener('focusout', e => {
    if (e.relatedTarget && !nav.contains(e.relatedTarget) && e.relatedTarget !== menu) closeNav();
  });
  matchMedia('(min-width:1101px)').addEventListener('change', () => closeNav());

  function positionEffect(el, paint) {
    if (!el) return;
    let box, frame = 0, x = 0, y = 0;
    function flush() { frame = 0; paint(x, y); }
    function reset() { if(frame) cancelAnimationFrame(frame); frame = 0; paint(0, 0); box = null; }
    el.addEventListener('pointerenter', () => { box = el.getBoundingClientRect(); });
    el.addEventListener('pointermove', event => {
      if (motion.matches || event.pointerType === 'touch') return;
      box = box || el.getBoundingClientRect();
      x = Math.min(1, Math.max(-1, 2 * (event.clientX - box.left) / box.width - 1));
      y = Math.min(1, Math.max(-1, 2 * (event.clientY - box.top) / box.height - 1));
      if (!frame) frame = requestAnimationFrame(flush);
    }, {passive:true});
    for (const name of ['pointerleave','pointercancel']) el.addEventListener(name,reset);
    el.addEventListener('pointerup',e=>{ if(e.pointerType==='touch') reset(); });
    motion.addEventListener('change', reset);
  }
  const set = (node, name, value) => node.style.setProperty(name, value);
  const magnet = document.querySelector('.contact-magnet');
  positionEffect(magnet,(x,y)=>{set(magnet,'--mx',x*3.2+'px');set(magnet,'--my',y*2.1+'px');});
  document.querySelectorAll('.feature-card,.project,.service-band,.contact-info,.section-head,.category-entry,.finder-box').forEach(el => {
    positionEffect(el,(x,y)=>{set(el,'--px',x*5+'px');set(el,'--py',y*4+'px');set(el,'--glint',(50+x*45)+'%');});
  });
  const study = document.querySelector('.pile-study');
  if (study) {
    const parts = study ? Array.from(study.querySelectorAll('.pile')) : [];
    const present = new Set();
    let frame = 0;
    const clamp = n=>Math.max(0,Math.min(1,n));
    function scrollFrame() {
      frame = 0;
      if (document.hidden) return;
      if (study && present.has(study)) {
        const box=study.getBoundingClientRect();
        const t=motion.matches?1:clamp((innerHeight-box.top)/(box.height+innerHeight*.34));
        parts.forEach((p,i)=>{
          const travel=1-clamp((t-i*.053)*1.42);
          set(p,'--offset-x',(i-2.2)*9*travel+'px');
          set(p,'--offset-y',(-64+6*(i%3))*travel+'px');
        });
      }
    }
    const schedule=()=>{if(present.size && !frame)frame=requestAnimationFrame(scrollFrame);};
    const observer=new IntersectionObserver(entries=>{
      entries.forEach(entry=>entry.isIntersecting?present.add(entry.target):present.delete(entry.target));
      schedule();
    },{rootMargin:'30px'});
    observer.observe(study);
    window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
    document.addEventListener('visibilitychange',schedule);motion.addEventListener('change',schedule);
  }

  const media = window.RA_MEDIA || [];
  const mediaMap = new Map(media.map(m=>[String(m.id),m]));
  const dialog = document.querySelector('.lightbox');
  const image = dialog.querySelector('#light-image');
  const title = dialog.querySelector('#lightbox-title');
  const indicator = dialog.querySelector('#light-index');
  const prev = dialog.querySelector('[data-light-prev]'), next = dialog.querySelector('[data-light-next]');
  let entries=[], index=0, opener=null;
  function showPhoto(i) {
    index = Math.max(0,Math.min(entries.length-1,i));
    const item=entries[index];
    if (!item) return;
    image.width=item.width; image.height=item.height;
    dialog.style.setProperty('--photo-ratio',item.width/item.height);
    dialog.style.setProperty('--source-width',item.width+'px');
    image.src=root+item.local; image.alt=item.caption; title.textContent=item.caption;
    const full=dialog.querySelector('#light-full'), contextLink=dialog.querySelector('#light-context');
    full.href=root+item.local;contextLink.hidden=!item.contextUrl;
    if(item.contextUrl){contextLink.href=item.contextUrl.startsWith('https:')?item.contextUrl:root+item.contextUrl;contextLink.textContent=item.contextLabel;}
    dialog.querySelector('#light-credit').textContent=item.credit||'';
    indicator.textContent=(index+1)+' / '+entries.length;
    prev.disabled=index===0; next.disabled=index===entries.length-1;
  }
  document.addEventListener('click',event=>{
    const a=event.target.closest('a[data-zoom]');
    if(!a || event.ctrlKey || event.metaKey || event.button>0 || !dialog.showModal) return;
    const group=a.closest('.media-grid,.model-photo,.route-box') || a.parentElement;
    const ids=window.raVisibleGallery && group.id==='gallery-grid' ? window.raVisibleGallery : Array.from(group.querySelectorAll('[data-zoom]')).map(n=>n.dataset.zoom);
    entries=Array.from(new Set(ids)).map(id=>mediaMap.get(String(id))).filter(Boolean);
    const at=entries.findIndex(m=>String(m.id)===a.dataset.zoom);
    if(at<0)return;
    event.preventDefault();opener=a;showPhoto(at);dialog.showModal();fitLightbox();document.documentElement.classList.add('viewing-photo');
    dialog.querySelector('.light-close').focus();
  });
  prev.onclick=()=>showPhoto(index-1);next.onclick=()=>showPhoto(index+1);
  dialog.addEventListener('keydown',e=>{
    if(e.key==='ArrowRight'){e.preventDefault();showPhoto(index+1);}
    if(e.key==='ArrowLeft'){e.preventDefault();showPhoto(index-1);}
  });
  dialog.addEventListener('click',e=>{ if(e.target===dialog) dialog.close(); });
  const lightControls = [...dialog.querySelectorAll('.lightbar,.lighttools,.lightfoot')];
  function fitLightbox() {
    if (!dialog.open) return;
    const height = lightControls.reduce((total, node) => total + node.getBoundingClientRect().height, 0);
    dialog.style.setProperty('--light-controls', Math.ceil(height) + 'px');
  }
  const controlObserver = new ResizeObserver(fitLightbox);
  lightControls.forEach(control => controlObserver.observe(control));
  let touchX,touchY;
  image.addEventListener('touchstart',e=>{touchX=e.touches[0].clientX;touchY=e.touches[0].clientY;},{passive:true});
  image.addEventListener('touchend',e=>{
    if(touchX==null)return;
    const dx=e.changedTouches[0].clientX-touchX,dy=e.changedTouches[0].clientY-touchY;
    if(Math.abs(dx)>55 && Math.abs(dx)>2*Math.abs(dy))showPhoto(index+(dx<0?1:-1));
    touchX=null;
  },{passive:true});
  dialog.addEventListener('close',()=>{
    document.documentElement.classList.remove('viewing-photo');
    if(opener?.isConnected)opener.focus({preventScroll:true});
    image.removeAttribute('src');opener=null;
  });

  const q=new URLSearchParams(location.search);
  if(q.has('pick')){
    document.querySelectorAll('a.relay').forEach(link=>{
      const target=new URL(link.href);
      target.searchParams.set('pick',q.get('pick'));link.href=target.href;
    });
  }
})();


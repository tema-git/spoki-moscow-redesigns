'use strict';

const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');

function setMenu(open, restoreFocus = false) {
  mobileNav.hidden = !open;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  if (restoreFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => setMenu(mobileNav.hidden));
mobileNav.addEventListener('click', event => {
  if (event.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !mobileNav.hidden) setMenu(false, true);
});
document.addEventListener('pointerdown', event => {
  if (!mobileNav.hidden && !event.target.closest('.header')) setMenu(false);
});
matchMedia('(min-width:811px)').addEventListener('change', event => {
  if (event.matches) setMenu(false);
});

const reactive = '[data-react], .magnet';
let pointed = null;
let pointerFrame = 0;
let lastPoint;
function resetPoint() {
  if (!pointed) return;
  for (const variable of ['--px','--py','--zoom','--mx','--my','--line','--sk-rot']) {
    pointed.style.removeProperty(variable);
  }
  pointed = null;
}
function drawPoint() {
  pointerFrame = 0;
  if (!pointed || !lastPoint) return;
  const rect = pointed.getBoundingClientRect();
  const x = Math.max(-1, Math.min(1, (lastPoint.x - rect.left) / rect.width * 2 - 1));
  const y = Math.max(-1, Math.min(1, (lastPoint.y - rect.top) / rect.height * 2 - 1));
  pointed.style.setProperty('--px', (x * 7).toFixed(2) + 'px');
  pointed.style.setProperty('--py', (y * 6).toFixed(2) + 'px');
  pointed.style.setProperty('--mx', (x * 3.4).toFixed(2) + 'px');
  pointed.style.setProperty('--my', (y * 2.7).toFixed(2) + 'px');
  pointed.style.setProperty('--zoom', '1.055');
  pointed.style.setProperty('--line', String(.7 + x * .3));
  pointed.style.setProperty('--sk-rot', (x * 3.5).toFixed(2) + 'deg');
}
document.addEventListener('pointermove', event => {
  if (motionPreference.matches || !finePointer.matches || event.pointerType === 'touch') return;
  const target = event.target.closest(reactive);
  if (target !== pointed) { resetPoint(); pointed = target; }
  if (!target) return;
  lastPoint = {x:event.clientX, y:event.clientY};
  if (!pointerFrame) pointerFrame = requestAnimationFrame(drawPoint);
}, {passive:true});
document.addEventListener('pointerout', event => {
  if (!event.relatedTarget || !pointed?.contains(event.relatedTarget)) resetPoint();
}, {passive:true});
document.addEventListener('focusin', event => {
  const link = event.target.closest('[data-react]');
  if (link && !motionPreference.matches && event.target.matches(':focus-visible')) {
    link.style.setProperty('--zoom','1.025');
  }
});
document.addEventListener('focusout', event => event.target.closest('[data-react]')?.style.removeProperty('--zoom'));
motionPreference.addEventListener('change', resetPoint);

const viewer = document.querySelector('#photo-dialog');
const largeImage = document.querySelector('#viewer-image');
const caption = document.querySelector('#viewer-caption');
const count = document.querySelector('#viewer-count');
const frame = document.querySelector('.viewer-frame');
let sequence = [];
let photoIndex = 0;
let opener;
let touchStart;
function showPhoto(index) {
  photoIndex = (index + sequence.length) % sequence.length;
  const photo = sequence[photoIndex];
  const description = photo.dataset.caption;
  largeImage.alt = description;
  largeImage.src = photo.href;
  document.querySelector('#full-photo').href = photo.dataset.full || photo.href;
  caption.textContent = description;
  count.textContent = (photoIndex + 1) + ' из ' + sequence.length;
  viewer.querySelector('.viewer-controls').hidden = sequence.length < 2;
  for (const offset of [-1, 1]) {
    const adjacent = sequence[(photoIndex + offset + sequence.length) % sequence.length];
    if (adjacent !== photo) { const buffer = new Image(); buffer.src = adjacent.href; }
  }
}
document.addEventListener('click', event => {
  const link = event.target.closest('a[data-photo]');
  if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !viewer.showModal) return;
  event.preventDefault();
  sequence = Array.from(document.querySelectorAll('a[data-photo]')).filter(el => el.dataset.photo === link.dataset.photo);
  opener = link;
  showPhoto(sequence.indexOf(link));
  viewer.showModal();
  viewer.querySelector('.viewer-close').focus({preventScroll:true});
});
viewer.querySelector('[data-prev]').addEventListener('click', () => showPhoto(photoIndex - 1));
viewer.querySelector('[data-next]').addEventListener('click', () => showPhoto(photoIndex + 1));
viewer.querySelector('.viewer-close').addEventListener('click', () => viewer.close());
viewer.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    showPhoto(photoIndex + (event.key === 'ArrowRight' ? 1 : -1));
  }
});
viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
viewer.addEventListener('close', () => { opener?.focus({preventScroll:true}); });
frame.addEventListener('touchstart', event => {
  if (event.touches.length === 1) touchStart = [event.touches[0].clientX,event.touches[0].clientY];
  else touchStart = null;
}, {passive:true});
frame.addEventListener('touchend', event => {
  if (!touchStart || !event.changedTouches.length) return;
  const dx = event.changedTouches[0].clientX - touchStart[0];
  const dy = event.changedTouches[0].clientY - touchStart[1];
  if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.5) showPhoto(photoIndex + (dx < 0 ? 1 : -1));
  touchStart = null;
}, {passive:true});


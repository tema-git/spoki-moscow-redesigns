(() => {
  'use strict';
  const section = document.querySelector('.cycle-section');
  if (!section) return;
  const track = section.querySelector('.cycle-track');
  const panel = section.querySelector('.cycle-panel');
  const mast = document.querySelector('.mast');
  const steps = [...section.querySelectorAll('.cycle-steps li')];
  const parts = Object.fromEntries([...section.querySelectorAll('[data-motion]')].map(el => [el.dataset.motion, el]));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, nearby = true, last = -1;
  const clamp = p => Math.min(1, Math.max(0, p));
  function segment(progress, start, end) {
    const p = clamp((progress - start) / (end - start));
    return p * p * (3 - 2 * p);
  }
  function position(part, x, y = 0) {
    parts[part].setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')');
  }
  function render() {
    frame = 0;
    const box = track.getBoundingClientRect();
    const restingTop = parseFloat(getComputedStyle(panel).top) || mast.offsetHeight;
    const entry = (innerHeight - restingTop) * 0.43;
    const travel = Math.max(1, box.height - panel.offsetHeight);
    const p = reduced.matches ? 0.58 : clamp((restingTop + entry - box.top) / (travel + entry));
    if (Math.abs(last - p) < .0001) return;
    last = p;
    const feed = segment(p, 0, .32);
    const lock = segment(p, .29, .43) - segment(p, .7, .81);
    const insert = segment(p, .40, .53) - segment(p, .65, .76);
    const dose = segment(p, .50, .68);
    const out = segment(p, .78, 1);
    const advance = 85 * feed + 116 * out;
    position('belt', advance);
    position('batch', advance);
    position('press', 0, 13 * lock);
    position('cut-press', 0, 9 * lock);
    position('section-product', -45 * (1 - feed) + 27 * out);
    position('needle', 41 * (1 - insert) - 59 * insert);
    parts.filling.setAttribute('transform', 'translate(192 60) scale(' + Math.max(.001, dose).toFixed(4) + ' ' + (.32 + dose * .68).toFixed(4) + ') translate(-192 -60)');
    parts.brush.setAttribute('transform', 'rotate(' + (out * 245).toFixed(2) + ')');
    const phase = p < .33 ? 0 : p < .765 ? 1 : 2;
    steps.forEach((step, i) => {
      if (i === phase && !reduced.matches) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    section.dataset.phase = String(phase + 1);
    section.style.setProperty('--cycle-progress', p.toFixed(4));
  }
  function queue() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  function layout() {
    section.classList.toggle('cycle-live', !reduced.matches);
    const header = mast.offsetHeight;
    // A tall or zoomed-in panel releases its heading normally and pins when its bottom is in view.
    const spare = innerHeight - header - panel.offsetHeight;
    const restingTop = header + Math.max(12, spare * .38);
    panel.style.setProperty('--cycle-top', Math.min(restingTop, innerHeight - panel.offsetHeight - 10) + 'px');
    last = -1;
    queue();
  }
  new IntersectionObserver(([entry]) => { nearby = entry.isIntersecting; queue(); }, {rootMargin:'100px'}).observe(track);
  const resize = new ResizeObserver(layout);
  resize.observe(panel);
  resize.observe(mast);
  window.addEventListener('resize', layout, {passive:true});
  window.addEventListener('scroll', () => { if (nearby && !reduced.matches) queue(); }, {passive:true});
  reduced.addEventListener('change', layout);
  layout();
})();

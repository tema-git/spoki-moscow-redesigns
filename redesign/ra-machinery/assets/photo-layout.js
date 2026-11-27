(() => {
  'use strict';
  const grids = document.querySelectorAll('.media-grid');
  if (!grids.length) return;

  // Row widths come from the original dimensions. Captions remain in reading
  // order. Appending a batch can extend the last row without moving older rows.
  function arrange(grid) {
    const width = grid.clientWidth;
    if (!width) return;
    const gap = parseFloat(getComputedStyle(grid).columnGap);
    const target = width < 550 ? Math.min(178, width * .46) : Math.min(258, width * .275);
    const rows = [];
    let row = [], ratioSum = 0;
    function finish(full) {
      if (!row.length) return;
      const available = width - gap * (row.length - 1);
      const height = full ? available / ratioSum : Math.min(target, available / ratioSum);
      rows.push({ items: row, height });
      row = []; ratioSum = 0;
    }
    for (const figure of grid.children) {
      const img = figure.querySelector('img');
      if (!img) continue;
      const ratio = Number(img.getAttribute('width')) / Number(img.getAttribute('height')) || 1;
      if (width < 470 && row.length === 2) finish(true);
      const current = ratioSum ? (width - gap * (row.length - 1)) / ratioSum : Infinity;
      const next = (width - gap * row.length) / (ratioSum + ratio);
      if (row.length && next < target && current - target < target - next) finish(true);
      row.push({ figure, ratio }); ratioSum += ratio;
      if ((width - gap * (row.length - 1)) / ratioSum <= target) finish(true);
    }
    finish(false);
    for (const {items, height} of rows) for (const {figure, ratio} of items) {
      const fitted = (Math.floor(height * ratio * 32) / 32) + 'px';
      if (figure.style.getPropertyValue('--tile-width') !== fitted) figure.style.setProperty('--tile-width', fitted);
    }
    grid.classList.add('justified');
  }
  for (const grid of grids) {
    let width = -1, pending = 0;
    const queue = () => {
      if (!pending) pending = requestAnimationFrame(() => { pending = 0; arrange(grid); });
    };
    new ResizeObserver(entries => {
      const next = entries[0].contentRect.width;
      if (next !== width) { width = next; queue(); }
    }).observe(grid);
    new MutationObserver(queue).observe(grid, {childList:true});
    arrange(grid);
  }
})();

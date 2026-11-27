'use strict';

// The soundboard, rim, music desk and hinged lid each live on a different plane.
// Paths for the keyboard, pedals and case retain their three-dimensional vertices.
window.createGrandPiano = function (svg) {
  const read = value => value.split(',').map(Number);
  const shapes = [...svg.querySelectorAll('[data-vertices]')].map(element => ({
    element,
    polygon: element.localName === 'polygon',
    points: element.dataset.vertices.split(' ').map(read),
  }));
  const floorMarks = [...svg.querySelectorAll('[data-center]')].map(element => ({
    element, position: read(element.dataset.center), drop: Number(element.dataset.drop || 0),
  }));
  const planes = [...svg.querySelectorAll('[data-plane]')].map(element => ({
    element, height: Number(element.dataset.plane),
  }));
  const lid = svg.querySelector('#grand-lid');
  const desk = svg.querySelector('#grand-desk');
  const stays = [...svg.querySelectorAll('#grand-stay path')];
  const lacquer = svg.querySelector('#fp-lid');
  const fmt = value => Number(value.toFixed(2));
  const pair = ([x, y]) => fmt(x) + ',' + fmt(y);
  const setPlane = (element, values) =>
    element.setAttribute('transform', 'matrix(' + values.map(n => Number(n.toFixed(5))).join(' ') + ')');
  return (turn, tilt, travel) => {
    const yaw = .58 + turn * .29 + travel * .12;
    const pitch = .46 - tilt * .105 + travel * .09;
    const ax = 1.4 * Math.cos(yaw), bx = 1.4 * Math.sin(yaw);
    const ay = 1.4 * Math.sin(yaw) * Math.sin(pitch);
    const by = -1.4 * Math.cos(yaw) * Math.sin(pitch), cz = -1.36 * Math.cos(pitch);
    const ox = 328 - 158 * ax - 190 * bx, oy = 278 - 158 * ay - 190 * by - 151 * cz;
    const point = ([x, y, z]) => [ox + ax*x + bx*y, oy + ay*x + by*y + cz*(z < 103 ? z-(103-z)*.27 : z)];
    for (const {element, polygon, points} of shapes) {
      const coords = points.map(p => pair(point(p)));
      element.setAttribute(polygon ? 'points' : 'd', polygon ? coords.join(' ') : 'M'+coords.join('L'));
    }
    for (const {element, position, drop} of floorMarks) {
      const [x,y] = point(position);
      element.setAttribute('cx', fmt(x));
      element.setAttribute('cy', fmt(y+drop));
    }
    for (const {element, height} of planes) setPlane(element, [ax, ay, bx, by, ox, oy+cz*height]);
    const angle = (63 + 22*travel) * Math.PI/180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    setPlane(lid, [ax*cos, ay*cos+cz*sin, bx, by, ox, oy+cz*154]);
    const a = point([289,128,148]), b = point([240*cos,155,154+240*sin]);
    stays.forEach(e => e.setAttribute('d', 'M'+pair(a)+'L'+pair(b)));
    const base = point([20,88,149]);
    setPlane(desk, [ax,ay,bx*.25,by*.25+cz,...base]);
    lacquer.setAttribute('x1', String(.12 + turn*.12));
    lacquer.setAttribute('x2', String(.94 - turn*.16));
    svg.dataset.yaw = yaw.toFixed(3);
    svg.dataset.lid = (63 + 22*travel).toFixed(2);
  };
};

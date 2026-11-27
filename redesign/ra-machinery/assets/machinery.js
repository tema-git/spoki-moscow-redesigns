(() => {
  'use strict';
  const stage = document.querySelector('.machine-stage');
  const section = document.querySelector('.driving');
  if (!stage || !section) return;
  const canvas = stage.querySelector('canvas');
  const context = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));
  const tau = Math.PI * 2;
  const smooth = (a, b, t) => {
    const n = clamp((t - a) / (b - a));
    return n * n * (3 - 2 * n);
  };

  // Solids are specified in millimetre-like model units. Every face is projected
  // from the same camera, including the near and far cheeks of the lifting eye.
  const solids = [];
  const paint = '#f9c337', edge = '#ffda66', iron = '#59615b', dark = '#353e38';
  const steel = '#b9c2b7', rubber = '#404840', ochre = '#c7922c';
  function surface(points, normal, color, seam = false) {
    const light = Math.max(0, -.29 * normal[0] + .73 * normal[1] + .65 * normal[2]);
    const shade = .61 + .45 * light;
    const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
    const tone = k => 'rgb(' + rgb.map(v => Math.round(Math.min(255, v * k))).join(',') + ')';
    return { points, normal, fill: tone(shade), glint: tone(shade + .055), seam };
  }
  const length = n => Math.hypot(...n);
  const unit = n => n.map(v => v / length(n));
  const axes = {
    z: (u, v, a) => [u, v, a],
    x: (u, v, a) => [a, v, -u],
    y: (u, v, a) => [u, a, -v],
  };
  function extrusion(outline, back, front, color, group = 'body', axis = 'z', rim = true) {
    const map = axes[axis];
    const faces = [];
    const winding = outline.reduce((sum, [x, y], i) => {
      const [u, v] = outline[(i + 1) % outline.length];
      return sum + x * v - y * u;
    }, 0);
    if (winding < 0) outline = [...outline].reverse();
    for (let i = 0; i < outline.length; i++) {
      const [x, y] = outline[i], [u, v] = outline[(i + 1) % outline.length];
      const n = unit([v - y, x - u, 0]);
      faces.push(surface([map(x, y, back), map(u, v, back), map(u, v, front), map(x, y, front)], map(...n), color));
    }
    faces.push(surface(outline.map(([u, v]) => map(u, v, front)), map(0, 0, 1), color, rim));
    faces.push(surface(outline.map(([u, v]) => map(u, v, back)), map(0, 0, -1), color));
    solids.push({ group, faces });
  }
  function block(x1, x2, y1, y2, z1, z2, color, group = 'body') {
    extrusion([[x1,y1],[x2,y1],[x2,y2],[x1,y2]], z1, z2, color, group);
  }
  function plate(x1, x2, y1, y2, bevel, z1, z2, color, group) {
    extrusion([[x1+bevel,y1],[x2-bevel,y1],[x2,y1+bevel],[x2,y2-bevel],
      [x2-bevel,y2],[x1+bevel,y2],[x1,y2-bevel],[x1,y1+bevel]], z1, z2, color, group);
  }
  function circle(u, v, r, count = 32, phase = 0) {
    return Array.from({length:count}, (_, i) => [u + r * Math.cos(phase + tau*i/count), v + r * Math.sin(phase + tau*i/count)]);
  }
  function disc(u, v, r, back, front, color, group, sides = 32, axis = 'z') {
    extrusion(circle(u, v, r, sides), back, front, color, group, axis, sides <= 8 || r > 8);
  }
  function fastener(x, y, z, size, group) {
    disc(x, y, size * 1.25, z, z + .8, dark, group, 12);
    disc(x, y, size, z + .8, z + 2.5, steel, group, 6);
  }
  function liftingEye(z) {
    const cy = 115, radius = 23, bore = 11;
    const outer = circle(0, cy, radius, 36);
    const inner = circle(0, cy, bore, 36);
    const faces = [];
    const vertex = (p, depth) => [...p, depth];
    for (let i = 0; i < outer.length; i++) {
      const j = (i + 1) % outer.length;
      const normal = [Math.cos((i+.5)*tau/36), Math.sin((i+.5)*tau/36), 0];
      faces.push(surface([vertex(outer[i],z),vertex(outer[j],z),vertex(outer[j],z+8),vertex(outer[i],z+8)], normal, ochre));
      faces.push(surface([vertex(inner[i],z),vertex(inner[j],z),vertex(inner[j],z+8),vertex(inner[i],z+8)], normal.map(v=>-v), '#9b792e'));
      faces.push(surface([vertex(outer[i],z+8),vertex(outer[j],z+8),vertex(inner[j],z+8),vertex(inner[i],z+8)], [0,0,1], paint));
      faces.push(surface([vertex(outer[i],z),vertex(outer[j],z),vertex(inner[j],z),vertex(inner[i],z)], [0,0,-1], paint));
    }
    plate(-30, 30, 85, 93, 2, z - 4, z + 12, edge, 'head');
    extrusion([[-28,91],[-22,116],[-11,108],[-8,103],[8,103],[11,108],[22,116],[28,91]], z, z+8, paint, 'head');
    solids.push({ group:'head', faces });
  }

  // Clamp with two separate jaws, toothed pads and a hydraulic pivot.
  plate(-36,36,-73,-52,6,-25,23,iron,'clamp');
  extrusion([[-35,-68],[-13,-69],[-12,-94],[-17,-124],[-26,-130],[-35,-122],[-38,-91]],-19,22,dark,'clamp');
  extrusion([[1,-68],[30,-66],[36,-81],[30,-120],[15,-131],[6,-124],[11,-93]],-22,19,iron,'clamp');
  for (let i=0;i<5;i++) {
    block(-17,-11,-124+i*5,-121+i*5,2,23,steel,'clamp');
    block(4,10,-123+i*5,-120+i*5,2,20,steel,'clamp');
  }
  disc(1,-77,18,21,27,dark,'clamp');
  disc(1,-77,12,27,31,steel,'clamp');
  fastener(1,-77,31,5,'clamp');
  for (const x of [-27,23]) fastener(x,-106,22,3,'clamp');
  plate(-57,57,-58,-49,4,-32,33,iron,'clamp');

  // Cast case with longitudinal cooling ribs, a side drive and twin bearing covers.
  const casting = [[-84,17],[-79,26],[70,26],[85,15],[85,-33],[68,-51],
    [54,-55],[-54,-55],[-72,-47],[-84,-29]];
  extrusion(casting,-43,35,paint);
  for (const z of [-36,-23,-10,3,16,29]) {
    extrusion([[-z-2,12],[-z+2,12],[-z+2,-31],[-z-2,-36]],84.8,88,ochre,'body','x');
  }
  disc(13,-5,20,87,99,iron,'body',32,'x');
  disc(13,-5,15,99,104,steel,'body',24,'x');
  disc(13,-5,10,104,109,dark,'body',12,'x');
  const frontCase = [[-80,14],[-69,21],[65,21],[78,11],[78,-30],[61,-47],[-56,-47],[-74,-33]];
  extrusion(frontCase,35,38,edge);
  plate(-69,69,-42,16,11,38,40,ochre,'body');
  for (const x of [-33,33]) {
    disc(x,-12,30,40,43,dark,'body');
    disc(x,-12,27,43,46,iron,'body');
    disc(x,-12,20,46,48,'#798378','body');
    disc(x,-12,18,48,49,'#5e695d','body');
    disc(x,-12,6.7,49,51,steel,'body');
    disc(x,-12,4,51,52,dark,'body',8);
    for(let i=0;i<8;i++) fastener(x+24.6*Math.cos(tau*i/8),-12+24.6*Math.sin(tau*i/8),46,1.65,'body');
  }
  for (const [x,y] of [[-73,12],[70,12],[-63,-38],[61,-38]]) fastener(x,y,38,2.6,'body');
  block(-20,20,-51,-46,38,39,dark);
  block(-16,13,-48.9,-48,39,39.4,steel);
  plate(-86,86,23,29,3,-44,39,edge,'body');

  // Elastomer stacks are visible through the open suspension frame.
  for (const z of [-34,10]) {
    for (const x of [-50,0,50]) {
      block(x-16,x+16,29,32,z,z+22,iron,'mounts');
      for (let i=0;i<4;i++) {
        plate(x-14,x+14,32+i*7.2,38.6+i*7.2,1.5,z+1,z+21,rubber,'mounts');
        block(x-15,x+15,38+i*7.2,39.5+i*7.2,z,z+22,'#767d70','mounts');
      }
    }
  }
  plate(-91,91,60,86,6,-46,40,paint,'head');
  plate(-93,93,83,89,3,-46,41,edge,'head');
  plate(-89,89,59,63,2,-44,39,ochre,'head');
  for (const x of [-65,-50,-35]) extrusion([[x,68],[x+6,68],[x+13,80],[x+7,80]],40,40.6,dark,'head');
  plate(11,55,69,81,1,40,41,'#41483e','head');
  for (const [a,b,y] of [[15,51,78],[15,35,75],[15,44,72.5]]) block(a,b,y,y+.7,41,41.3,steel,'head');
  for(const x of [-81,78]) for(const y of [67,79]) fastener(x,y,40,2.7,'head');
  liftingEye(-33);
  disc(0,115,8.3,-24,23,'#919d91','head');
  liftingEye(17);

  function bezier(points, t) {
    let segment = points;
    while(segment.length>1) segment=segment.slice(1).map((b,i)=>b.map((v,j)=>segment[i][j]*(1-t)+v*t));
    return segment[0];
  }
  const hosePaths = [0,1].map(i=>{
    const z=-24+i*16;
    const control=[[89,69,z],[128,66,z-3],[143,-63,z+7],[89,-24,z+3]];
    return Array.from({length:28},(_,k)=>bezier(control,k/27));
  });
  function projection(yaw,pitch,spread) {
    const c=Math.cos(yaw), s=Math.sin(yaw), cp=Math.cos(pitch), sp=Math.sin(pitch);
    const camera=[s*cp,sp,c*cp];
    const scale=1.43, ox=293, oy=215;
    const shifts={body:0,head:spread*14,mounts:spread*6,clamp:-spread*12};
    function point([x,y,z],dy=0) {
      const depth=x*s+z*c;
      return [ox+scale*(x*c-z*s),oy+scale*(depth*sp-(y+dy)*cp)];
    }
    return { point, camera, shifts };
  }
  function path(ctx, vertices) {
    ctx.beginPath();
    vertices.forEach(([x,y],i)=>{if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});
  }
  function drawSolid(ctx, solid, view) {
    const dy=view.shifts[solid.group];
    for (const face of solid.faces) {
      if (face.normal.reduce((sum,n,i)=>sum+n*view.camera[i],0) <= .001) continue;
      const vertices=face.points.map(p=>view.point(p,dy));
      path(ctx,vertices);ctx.closePath();
      if(face.seam) {
        const gradient=ctx.createLinearGradient(vertices[0][0]-16,vertices[0][1]-30,vertices[0][0]+83,vertices[0][1]+36);
        gradient.addColorStop(0,face.glint);gradient.addColorStop(1,face.fill);ctx.fillStyle=gradient;
      } else ctx.fillStyle=face.fill;
      ctx.fill();
      // Close antialias seams on the curved cheeks, rims and cylindrical surfaces.
      ctx.strokeStyle=face.seam?'rgba(27,32,24,.45)':face.fill;ctx.lineWidth=face.seam?.8:.63;ctx.stroke();
    }
  }
  function drawHoses(ctx,view) {
    for(const hose of hosePaths){
      const projected=hose.map((p,i)=>view.point(p,view.shifts.head*(1-i/(hose.length-1))));
      path(ctx,projected);ctx.strokeStyle='#171e19';ctx.lineWidth=6.8;ctx.stroke();
      path(ctx,projected.map(([x,y])=>[x+.7,y-1.3]));ctx.strokeStyle='#707b6c';ctx.lineWidth=1.5;ctx.stroke();
      for(const end of [0,1]) {
        const tail=end?projected.slice(-3):projected.slice(0,3);
        path(ctx,tail);ctx.strokeStyle='#a4ac98';ctx.lineWidth=7;ctx.stroke();
        path(ctx,tail);ctx.strokeStyle='#576255';ctx.lineWidth=3.6;ctx.stroke();
      }
    }
  }
  function floor(ctx,view) {
    ctx.save();
    const p=view.point;
    path(ctx,[p([-148,-142,-66]),p([148,-142,-66]),p([148,-142,64]),p([-148,-142,64])]);ctx.clip();
    ctx.strokeStyle='rgba(164,181,155,.12)';ctx.lineWidth=.6;
    for(let x=-144;x<149;x+=18){path(ctx,[p([x,-142,-70]),p([x,-142,70])]);ctx.stroke();}
    for(let z=-72;z<=72;z+=18){path(ctx,[p([-148,-142,z]),p([148,-142,z])]);ctx.stroke();}
    ctx.restore();
    const [x,y]=p([2,-142,0]);
    ctx.save();ctx.translate(x,y);ctx.scale(1,.15);
    const shadow=ctx.createRadialGradient(0,0,1,0,0,110);
    shadow.addColorStop(0,'rgba(6,11,7,.65)');shadow.addColorStop(1,'rgba(6,11,7,0)');
    ctx.beginPath();ctx.arc(0,0,110,0,tau);ctx.fillStyle=shadow;ctx.fill();ctx.restore();
  }
  function label(ctx, anchor, name, x, y, left, size) {
    const tip=left?x-8:x+8, lineEnd=left?tip-20:tip+20;
    path(ctx,[anchor,[lineEnd,y+7],[tip,y+7]]);ctx.strokeStyle='rgba(205,215,193,.7)';ctx.lineWidth=.9;ctx.stroke();
    ctx.beginPath();ctx.arc(...anchor,2.8,0,tau);ctx.fillStyle='#ffdb63';ctx.fill();
    ctx.textAlign=left?'left':'right';ctx.fillStyle='#dce3d2';ctx.font='500 '+size+'px "Roboto Condensed", Arial, sans-serif';
    ctx.fillText(name,x,y+size*.33);
  }
  let orbit=0, tilt=0, touch=null;
  function drawHero() {
    if(!context) return;
    const bounds=stage.getBoundingClientRect();
    const density=Math.min(devicePixelRatio||1,2);
    const w=Math.round(bounds.width*density), h=Math.round(bounds.height*density);
    if (!w || !h) return;
    if(canvas.width!==w || canvas.height!==h){canvas.width=w;canvas.height=h;}
    const hero=stage.closest('.hero');
    const spread=reduced.matches?0:clamp(scrollY/Math.max(240,hero.offsetHeight*.76));
    const yaw=.47+(reduced.matches?0:orbit*.41)+spread*.22;
    const pitch=.22+(reduced.matches?0:tilt*.105)+spread*.055;
    const view=projection(yaw,pitch,spread), ctx=context;
    const scale=Math.min(w/590,h/442);
    ctx.setTransform(scale,0,0,scale,(w-590*scale)/2,(h-442*scale)/2);
    ctx.clearRect(-w/scale,-h/scale,w/scale*3,h/scale*3);
    ctx.lineJoin='round';ctx.lineCap='round';floor(ctx,view);
    solids.forEach(solid=>drawSolid(ctx,solid,view));
    drawHoses(ctx,view);
    const size=clamp(15*density/scale,15,29);
    label(ctx,view.point([13,125,25],view.shifts.head),'Подвеска',439,48,true,size);
    label(ctx,view.point([50,-11,46]),'Виброблок',467,246,true,size);
    label(ctx,view.point([-17,-105,21],view.shifts.clamp),'Зажим',122,358,false,size);
    stage.classList.add('painted');
    if(!reduced.matches) {
      const degrees=Math.round(orbit*24);
      stage.setAttribute('aria-valuenow',String(degrees));
      stage.setAttribute('aria-valuetext',degrees===0?'Исходный ракурс':Math.abs(degrees)+'° '+(degrees>0?'вправо':'влево'));
    }
  }

  const plateNode=section.querySelector('.driving-plate'), phases=[...section.querySelectorAll('.drive-phases li')];
  const caption=section.querySelector('.drive-caption');
  let currentPhase = -1;
  const rig=section.querySelector('[data-rig]'), wire=section.querySelector('[data-wire]'), sheet=section.querySelector('[data-sheet]');
  const jaws=[...section.querySelectorAll('[data-jaw]')],rotors=[...section.querySelectorAll('[data-rotor]')], wave=section.querySelector('[data-wave]');
  const translate=(node,x,y)=>node.setAttribute('transform','translate('+x.toFixed(3)+' '+y.toFixed(3)+')');
  function drawCycle() {
    const rect=section.getBoundingClientRect(), header=document.querySelector('.site-header').offsetHeight;
    const entry=innerHeight*.96, remaining=Math.max(1,rect.height-plateNode.offsetHeight);
    // The approach starts as soon as the section enters. The full working stroke
    // plays while the drawing stays beside its caption, with no wheel interception.
    let t=rect.top>header ? .22*clamp((entry-rect.top)/Math.max(1,entry-header))
                          : .22+.78*clamp((header-rect.top)/remaining);
    if(reduced.matches) t=1;
    const approach=smooth(.015,.30,t), close=smooth(.30,.44,t), drive=smooth(.46,.82,t), lift=smooth(.84,.99,t);
    const spin=smooth(.44,.82,t);
    const shake=reduced.matches?0:Math.sin(spin*tau*4)*Math.sin(spin*Math.PI)*1.8;
    const x=426-62*approach+18*lift, y=135+35*approach+63*drive-53*lift+shake;
    translate(rig,x,y);translate(sheet,0,63*drive+shake);
    wire.setAttribute('d','M'+x.toFixed(3)+' -4V'+(y-102).toFixed(3));
    const gap=8*(1-close)+8*smooth(.81,.89,t);
    jaws.forEach((jaw,i)=>translate(jaw,(i?1:-1)*gap,0));
    rotors.forEach(rotor=>rotor.setAttribute('transform','rotate('+(Number(rotor.dataset.rotor)*spin*540).toFixed(3)+')'));
    wave.style.opacity=(Math.sin(spin*Math.PI)*.83).toFixed(3);
    const phase=t<.30?0:t<.45?1:t<.83?2:3;
    if (currentPhase !== phase) {
      phases.forEach((li,i)=>{if(i===phase)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
      caption.textContent=phases[phase].querySelector('p').textContent;
      currentPhase=phase;
    }
    section.classList.add('cycle-ready');
  }
  let frame=0, heroVisible=true, cycleVisible=false;
  function paintFrame() {
    frame=0;
    if(document.hidden)return;
    if(heroVisible)drawHero();
    if(cycleVisible || reduced.matches)drawCycle();
  }
  function queue() {if(!frame)frame=requestAnimationFrame(paintFrame);}
  const observer=new IntersectionObserver(entries=>{
    for(const item of entries) {
      if(item.target===stage)heroVisible=item.isIntersecting;
      else cycleVisible=item.isIntersecting;
    }
    queue();
  },{rootMargin:'48px'});
  observer.observe(stage);observer.observe(section);
  new ResizeObserver(queue).observe(stage);
  addEventListener('scroll',()=>{if(heroVisible||cycleVisible)queue();},{passive:true});
  addEventListener('resize',queue); document.addEventListener('visibilitychange',queue);
  function semantics() {
    const interactive=Boolean(context) && !reduced.matches;
    if(!context)return;
    stage.tabIndex=interactive?0:-1;
    stage.setAttribute('role',interactive?'slider':'img');
    stage.setAttribute('aria-label',interactive?'Ракурс модели подвесного вибропогружателя':'Подвесной вибропогружатель с подвеской, виброблоком и гидравлическим зажимом');
    if(interactive) {
      stage.setAttribute('aria-valuemin','-24');stage.setAttribute('aria-valuemax','24');
      stage.setAttribute('aria-valuenow',String(Math.round(orbit*24)));
    } else {
      for(const key of ['aria-valuemin','aria-valuemax','aria-valuenow','aria-valuetext'])stage.removeAttribute(key);
      orbit=0;tilt=0;
    }
    queue();
  }
  stage.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch'&&!reduced.matches)touch={x:e.clientX,orbit};
  });
  stage.addEventListener('pointermove',e=>{
    if(reduced.matches)return;
    if(e.pointerType==='touch') {
      if(!touch)return;
      orbit=clamp(touch.orbit+(e.clientX-touch.x)/115,-1,1);tilt=0;
    } else {
      const b=stage.getBoundingClientRect();
      orbit=clamp(2*(e.clientX-b.left)/b.width-1,-1,1);
      tilt=clamp(2*(e.clientY-b.top)/b.height-1,-1,1);
    }
    queue();
  },{passive:true});
  for(const type of ['pointerup','pointercancel'])stage.addEventListener(type,()=>{touch=null;});
  stage.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch'){orbit=0;tilt=0;queue();}});
  stage.addEventListener('keydown',e=>{
    if(reduced.matches || !['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
    e.preventDefault();
    if(e.key==='Home')orbit=-1;
    else if(e.key==='End')orbit=1;
    else orbit=clamp(orbit+(['ArrowRight','ArrowUp'].includes(e.key)?.2:-.2),-1,1);
    queue();
  });
  reduced.addEventListener('change',semantics);semantics();
  document.fonts.ready.then(queue);
  drawCycle();
})();

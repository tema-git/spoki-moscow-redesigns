(() => {
  'use strict';
  const view = document.querySelector('.machine-view');
  if (!view) return;
  const canvas = view.querySelector('canvas');
  const gl = canvas.getContext('webgl', {alpha:true, antialias:true, premultipliedAlpha:false, powerPreference:'low-power'});
  if (!gl) return;

  const vs = `
    attribute vec3 aPosition, aNormal, aColour;
    attribute float aMetal, aPart;
    uniform vec4 uPose;
    uniform float uLift;
    varying vec3 normal, colour;
    varying float metal, height;
    void main() {
      vec3 p = aPosition, n = aNormal;
      if (aPart > .5 && aPart < 1.5) {
        float angle = uLift*.16, c=cos(angle), s=sin(angle);
        vec2 arm = p.yz - vec2(2.5,-1.27);
        p.yz = vec2(arm.x*c+arm.y*s, arm.y*c-arm.x*s) + vec2(2.5+uLift*.44,-1.27);
        n.yz = vec2(n.y*c+n.z*s,n.z*c-n.y*s);
      } else if (aPart > 1.5) { p.z += uLift*.65; }
      float dx = p.x*uPose.x-p.z*uPose.y;
      float dz = p.x*uPose.y+p.z*uPose.x;
      float y = p.y*uPose.z-dz*uPose.w;
      float depth = p.y*uPose.w+dz*uPose.z;
      gl_Position = vec4((321.0+dx*102.0)/320.0-1.0, 1.0-(360.0-y*102.0)/220.0, -depth*.13, 1.0);
      normal=n; colour=aColour; metal=aMetal; height=p.y;
    }`;
  const fs = `
    precision mediump float;
    uniform vec3 uViewer;
    varying vec3 normal, colour;
    varying float metal, height;
    void main() {
      vec3 n=normalize(normal), key=normalize(vec3(-.5,.86,.64));
      float diffuse=max(dot(n,key),0.0), bounce=max(dot(n,normalize(vec3(.8,.18,-.42))),0.0);
      vec3 r=reflect(-uViewer,n);
      float az=atan(r.x,r.z);
      float softbox=smoothstep(.62,.97,cos(az*2.0-.5));
      float strip=smoothstep(.84,.98,cos(az*4.0+.65))*.46;
      float spec=pow(max(dot(n,normalize(key+uViewer)),0.0),36.0);
      vec3 paint=colour*(.60+.37*diffuse+.12*bounce) + vec3(1.0,.89,.76)*spec*.22;
      vec3 steel=colour*(.44+.22*diffuse+.12*max(n.y,0.0)+.30*softbox+strip*.76)
                 +vec3(.14,.16,.16)*softbox+vec3(.15)*spec;
      steel += vec3(.06)*pow(1.0-abs(dot(n,uViewer)),3.0);
      gl_FragColor=vec4(mix(paint,steel,metal),1.0);
    }`;
  function shader(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
    return s;
  }
  const vert = shader(gl.VERTEX_SHADER, vs), frag = shader(gl.FRAGMENT_SHADER, fs);
  if (!vert || !frag) return;
  const program = gl.createProgram();
  gl.attachShader(program, vert); gl.attachShader(program, frag); gl.linkProgram(program);
  gl.deleteShader(vert); gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  const vertices = [], tau = Math.PI * 2;
  const enamel='#ef5149', seal='#253a45', metal='#c9d5d7', bright='#e4e9e6', cast='#bcc9cc';
  let group = 0, rgb = [], sheen = 0;
  function material(hex, reflectivity) {
    rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255);
    sheen = reflectivity;
  }
  function unit(v) {
    const n = Math.hypot(...v) || 1;
    return v.map(x => x/n);
  }
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  function point(p,n) { vertices.push(...p,...n,...rgb,sheen,group); }
  function quad(a,b,c,d) { for (const v of [a,b,c,a,c,d]) point(v[0],v[1]); }
  function joinRings(rings) {
    for (let j=1; j<rings.length; j++) {
      const a=rings[j-1], b=rings[j];
      for (let i=0; i<a.length; i++) {
        const k=(i+1)%a.length;
        quad(a[i],a[k],b[k],b[i]);
      }
    }
  }
  // Swept profiles preserve both the inside and the rolled lip of the bowl.
  function lathe(x,z,profile,hex,reflectivity=0,segments=72) {
    material(hex,reflectivity);
    const rings=profile.map(([r,y],j) => {
      const before=profile[Math.max(0,j-1)], after=profile[Math.min(profile.length-1,j+1)];
      const dr=after[0]-before[0], dy=after[1]-before[1];
      return Array.from({length:segments},(_,i) => {
        const a=tau*i/segments, c=Math.cos(a), s=Math.sin(a);
        return [[x+r*c,y,z+r*s],unit([dy*c,-dr,dy*s])];
      });
    });
    joinRings(rings);
  }
  function roundedRing(x,z,w,d,r,y,tilt) {
    const corners=[[w/2-r,d/2-r],[-w/2+r,d/2-r],[-w/2+r,-d/2+r],[w/2-r,-d/2+r]];
    return corners.flatMap(([cx,cz],j) => Array.from({length:7},(_,i)=>{
      const a=(j+i/6)*Math.PI/2, c=Math.cos(a), s=Math.sin(a);
      return [[x+cx+r*c,y,z+cz+r*s],unit([c,tilt,s])];
    }));
  }
  function housing(x,z,levels,hex,reflectivity=0) {
    material(hex,reflectivity);
    const rings=levels.map(([w,d,r,y,ny=0])=>roundedRing(x,z,w,d,r,y,ny));
    joinRings(rings);
    for (const [ring,n] of [[rings[0],[0,-1,0]],[rings[rings.length-1],[0,1,0]]]) {
      for (let i=0;i<ring.length;i++) {
        point([x,ring[i][0][1],z],n); point(ring[i][0],n); point(ring[(i+1)%ring.length][0],n);
      }
    }
  }
  function block(x,y,z,w,h,d,hex,reflectivity=0,radius=.025) {
    const r=Math.min(radius,w*.42,d*.42), a=y-h/2, b=y+h/2;
    housing(x,z,[[w,d,r,a],[w,d,r,b]],hex,reflectivity);
  }
  function tube(points,r,hex,reflectivity=.7,sides=8) {
    material(hex,reflectivity);
    const rings=points.map((p,i)=>{
      const prev=points[Math.max(0,i-1)], next=points[Math.min(points.length-1,i+1)];
      const t=unit(next.map((v,j)=>v-prev[j]));
      const ref=Math.abs(t[1])>.985?[1,0,0]:[0,1,0];
      const b=unit(cross(t,ref)), c=cross(t,b);
      return Array.from({length:sides},(_,j)=>{
        const a=tau*j/sides, n=b.map((v,k)=>v*Math.cos(a)+c[k]*Math.sin(a));
        return [p.map((v,k)=>v+r*n[k]),n];
      });
    });
    joinRings(rings);
  }
  function ring(x,y,z,r,thick,hex,reflectivity=.8) {
    const points=Array.from({length:81},(_,i)=>[x+r*Math.cos(tau*i/80),y,z+r*Math.sin(tau*i/80)]);
    tube(points,thick,hex,reflectivity);
  }
  function disc(x,y,z,r,h,hex,reflectivity=0) {
    lathe(x,z,[[0,y],[r*.93,y],[r,y+.009],[r,y+h-.008],[r*.93,y+h],[0,y+h]],hex,reflectivity,28);
  }

  // Fixed cast base and rear drive column.
  for (const x of [-.66,.66]) for (const z of [-1.25,.38]) {
    disc(x,.025,z,.145,.13,seal); disc(x,.15,z,.079,.105,metal,.75);
  }
  housing(0,-.30,[[1.50,2.55,.24,.21,-.5],[1.77,2.78,.28,.30],[1.77,2.78,.28,.49],[1.62,2.64,.25,.55,.65]],cast,.27);
  housing(0,-1.01,[[1.28,1.14,.18,.49],[1.38,1.21,.16,.61],[1.24,1.12,.16,2.40],[1.22,1.11,.15,2.52,.5]],'#afc1c7',.37);
  for (let i=0;i<8;i++) block(.66-i*.002,1.56+i*.074,-1.00,.023,.026,.62,'#40555f',.1,.008);
  for (const x of [-.48,.48]) tube([[x,.62,-.448],[x,2.43,-.448]],.028,bright,.75);
  housing(0,-1.02,[[1.27,1.15,.16,2.4],[1.31,1.17,.18,2.47],[1.24,1.13,.16,2.56]],seal,.12);
  for (const x of [-.39,.39]) disc(x,2.5,-1.05,.105,.60,metal,.8);

  // Removable bowl, trolley, pressed ribs and polished inner wall.
  group=2;
  const bz=.76;
  for (const x of [-.63,.63]) for (const z of [.53,1.13]) {
    block(x,.19,z,.20,.19,.23,'#8a9ba2',.3);
    disc(x,.032,z,.128,.124,seal);
  }
  housing(0,bz,[[1.45,1.39,.25,.25,-.5],[1.73,1.67,.29,.32],[1.74,1.68,.29,.43],[1.54,1.49,.28,.48,.7]],'#b8c9cf',.47);
  disc(0,.46,bz,.55,.13,'#708592',.64);
  lathe(0,bz,[[.23,.53],[.46,.545],[.60,.59],[.74,.69],[.85,.83],[.94,1.01],[1.005,1.24],[1.031,1.53],[1.033,1.67],[1.048,1.70],[1.055,1.727],[1.045,1.744],[1.024,1.741],[1.004,1.718],[.995,1.58],[.97,1.32],[.91,1.10],[.82,.93],[.67,.78],[.48,.69],[.25,.65],[0,.644]],metal,.95);
  ring(0,1.70,bz,1.047,.023,bright,.95);
  ring(0,.88,bz,.88,.009,'#9fb2bb',.84);
  ring(0,.855,bz,.873,.010,bright,.92);

  // Lifting head includes its spiral tool and a cage built from individual curved rods.
  group=1;
  const hx=-.10, hz=.64;
  disc(hx,2.05,hz,.10,.39,metal,.85);
  disc(hx,2.34,hz,.22,.14,'#82959b',.75);
  const helix=[[hx,2.14,hz],[hx,2.04,hz],[hx+.09,1.98,hz+.03]];
  for(let i=0;i<=82;i++) {
    const t=i/82, a=-.32+t*tau*1.1, rad=.14+.17*Math.sin(t*Math.PI*.85);
    helix.push([hx+rad*Math.cos(a),1.99-t*.89,hz+rad*Math.sin(a)]);
  }
  tube(helix,.065,bright,.96,12);
  tube([[.45,2.46,.48],[.45,1.15,.48],[.40,1.04,.47]],.040,metal,.82,10);
  for (const [r,y] of [[1.045,1.79],[.91,1.98],[.68,2.20]]) ring(0,y,bz,r,.020,bright,.82);
  for (let j=0;j<18;j++) {
    const angle=tau*j/18;
    const curve=Array.from({length:13},(_,i)=>{
      const t=i/12, rad=1.04-.49*t*t, a=angle+.12*t;
      return [rad*Math.cos(a),1.79+.53*t,bz+rad*Math.sin(a)];
    });
    tube(curve,.0145,metal,.87);
  }
  housing(0,-.37,[[1.38,2.46,.26,2.35,-.6],[1.67,2.71,.29,2.44],[1.70,2.74,.30,2.51]],seal,.18);
  housing(0,-.37,[[1.63,2.69,.28,2.48,-.7],[1.78,2.78,.30,2.54],[1.82,2.80,.31,2.72],[1.78,2.74,.32,2.96],[1.66,2.59,.32,3.08,.8],[1.55,2.48,.30,3.105,2.0]],enamel,.045);
  for (let i=0;i<9;i++) block(.903,2.69,-1.29+i*.097,.017,.135,.035,'#632d33',.05,.009);
  housing(0,.34,[[.86,.55,.06,3.10],[.84,.54,.06,3.13],[.79,.49,.055,3.14]],'#2a404b',.13);
  block(-.12,3.15,.38,.39,.024,.25,'#a6c6bc',.04,.022);
  for (const [i,w] of [[0,.25],[1,.18]]) block(-.13,3.167,.34+i*.052,w,.006,.011,'#476965',0,.003);
  for (let i=0;i<3;i++) disc(.205,3.14,.20+i*.105,.036,.022,i===2?'#efc271':'#a9bec0',.21);
  disc(.53,3.09,.14,.118,.056,'#e8b355');
  disc(.53,3.14,.14,.08,.12,'#a62c35');
  disc(.53,3.245,.14,.111,.044,'#ed5949');
  for (const z of [-1.40,.65]) block(.898,2.63,z,.025,.046,.045,'#bf9a96',.35);

  const buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
  const stride=11*4;
  for (const [name,size,offset] of [['aPosition',3,0],['aNormal',3,3],['aColour',3,6],['aMetal',1,9],['aPart',1,10]]) {
    const id=gl.getAttribLocation(program,name);
    gl.enableVertexAttribArray(id); gl.vertexAttribPointer(id,size,gl.FLOAT,false,stride,offset*4);
  }
  const count=vertices.length/11;
  vertices.length=0;
  const pose=gl.getUniformLocation(program,'uPose'), lift=gl.getUniformLocation(program,'uLift'), viewer=gl.getUniformLocation(program,'uViewer');
  gl.enable(gl.DEPTH_TEST); gl.clearColor(0,0,0,0);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const hero=view.closest('.hero'), mast=document.querySelector('.mast'), leaders=view.querySelector('.model-leaders');
  const fallback=view.querySelector('.mixer-drawing');
  let yaw=.75, pitch=.345, spread=0, frame=0, visible=true, pointerX=0, pointerY=0, touch=null;
  function label(name, coords, direction,scale) {
    const [x,y,z]=coords, c=Math.cos(yaw), s=Math.sin(yaw), ct=Math.cos(pitch), st=Math.sin(pitch);
    const sx=321+(x*c-z*s)*102, sy=360-(y*ct-(x*s+z*c)*st)*102;
    const endX=direction>0?Math.max(sx+85,590):Math.min(sx-64,69), endY=sy+(direction>0?-38:23);
    const g=leaders.querySelector('[data-part="'+name+'"]');
    g.querySelector('path').setAttribute('d','M'+sx.toFixed(1)+' '+sy.toFixed(1)+' L'+(endX-direction*29).toFixed(1)+' '+endY.toFixed(1)+' H'+endX.toFixed(1));
    const dot=g.querySelector('circle'); dot.setAttribute('cx',sx);dot.setAttribute('cy',sy);
    const txt=g.querySelector('text');txt.style.fontSize=Math.max(14,14/scale)+'px';txt.setAttribute('x',endX);txt.setAttribute('y',endY-6);txt.setAttribute('text-anchor',direction>0?'end':'start');
  }
  function render() {
    frame=0;
    const box=view.getBoundingClientRect();
    if (!box.width || !box.height || gl.isContextLost()) return;
    const dpr=Math.min(devicePixelRatio || 1,2);
    // The canvas and the SVG annotations share a centred 640 by 440 drawing area.
    const scale=Math.min(box.width/640,box.height/440);
    const w=Math.max(1,Math.round(scale*640*dpr)), h=Math.max(1,Math.round(scale*440*dpr));
    if(canvas.width!==w || canvas.height!==h) {canvas.width=w;canvas.height=h;}
    const hb=hero.getBoundingClientRect();
    const travelled=Math.max(0,mast.offsetHeight-hb.top);
    spread=reduced.matches?0:Math.min(1,travelled/(hb.height*.34));
    view.style.setProperty('--tracking',(reduced.matches?0:Math.min(box.height*.125,travelled*.82)).toFixed(2)+'px');
    yaw=.75+(reduced.matches?0:pointerX*.48)+spread*.10;
    pitch=.345+(reduced.matches?0:pointerY*.125)+spread*.055;
    const c=Math.cos(yaw),s=Math.sin(yaw),ct=Math.cos(pitch),st=Math.sin(pitch);
    gl.viewport(0,0,w,h);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniform4f(pose,c,s,ct,st);gl.uniform1f(lift,spread);gl.uniform3f(viewer,s*ct,st,c*ct);
    gl.drawArrays(gl.TRIANGLES,0,count);
    label('drive',[.89,2.80+spread*.56,-.95],1,scale);
    label('bowl',[-.44,1.26,bz+.89+spread*.65],-1,scale);
    canvas.hidden=false;leaders.removeAttribute('hidden');fallback.setAttribute('hidden','');view.classList.add('model-live');
  }
  function queue(){ if(!frame) frame=requestAnimationFrame(render); }
  function pointer(event) {
    if(reduced.matches || event.pointerType==='touch') return;
    const r=view.getBoundingClientRect();
    pointerX=Math.min(1,Math.max(-1,2*(event.clientX-r.left)/r.width-1));
    pointerY=Math.min(1,Math.max(-1,1-2*(event.clientY-r.top)/r.height));
    queue();
  }
  view.addEventListener('pointermove',pointer,{passive:true});
  view.addEventListener('pointerleave',()=>{if(touch===null){pointerX=0;pointerY=0;queue();}},{passive:true});
  view.addEventListener('touchstart',e=>{if(e.touches.length===1) touch=[e.touches[0].clientX,e.touches[0].clientY,pointerX];},{passive:true});
  view.addEventListener('touchmove',e=>{
    if(!touch || reduced.matches || e.touches.length!==1)return;
    const dx=e.touches[0].clientX-touch[0],dy=e.touches[0].clientY-touch[1];
    if(Math.abs(dx)>Math.abs(dy)) {pointerX=Math.max(-1,Math.min(1,touch[2]+dx/100));queue();}
  },{passive:true});
  for(const event of ['touchend','touchcancel'])view.addEventListener(event,()=>{touch=null;},{passive:true});
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)queue();},{rootMargin:'50px'}).observe(hero);
  new ResizeObserver(queue).observe(view);
  window.addEventListener('scroll',()=>{if(visible&&!reduced.matches)queue();},{passive:true});
  reduced.addEventListener('change',()=>{pointerX=0;pointerY=0;queue();});
  canvas.addEventListener('webglcontextlost',()=>{canvas.hidden=true;leaders.setAttribute('hidden','');fallback.removeAttribute('hidden');view.classList.remove('model-live');});
  queue();
})();

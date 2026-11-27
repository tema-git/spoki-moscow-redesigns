/* Original study of a kitchen island. The camera and drawer are rendered on demand. */
(() => {
  const stage = document.querySelector('.island-stage');
  if (!stage) return;
  const prefix = document.body.dataset.base || '';
  const palettes = {walnut:'Орех', linen:'Лён', graphite:'Графит'};
  let drawChanges = () => {};
  const controls = stage.querySelectorAll('[data-finish]');
  const poster = stage.querySelector('.island-poster');
  function finish(value) {
    stage.dataset.finish = value;
    stage.querySelector('.finish-value').textContent = palettes[value];
    for (const button of controls) button.setAttribute('aria-pressed',String(button.dataset.finish===value));
    if (poster && poster.dataset.ready) poster.src=prefix+'assets/art/island-'+value+'.webp';
    drawChanges();
  }
  for (const button of controls) button.addEventListener('click',() => finish(button.dataset.finish));
  if (!window.THREE) return;
  const T = window.THREE;
  const canvas = stage.querySelector('canvas');
  const viewport = stage.querySelector('.island-view') || stage;
  let renderer;
  try {
    renderer = new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});
  } catch { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.55));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.06;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene = new T.Scene();
  scene.background = new T.Color('#c6b6a2');
  const camera = new T.OrthographicCamera(-3,3,2,-2,.1,90);
  const group = new T.Group();
  scene.add(group);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let visible=true, frame=0, width=1,height=1, pending=true;
  let px=0, py=0, prog=0, ax=0, ay=0, ap=0;
  const manager=new T.LoadingManager();
  const textureLoader=new T.TextureLoader(manager);
  const surface=(file,rx=1,ry=1) => {
    let t;
    if(location.protocol==='file:'){
      // Local-file browsers cannot issue texture requests. Generate a separate local canvas surface.
      const tile=document.createElement('canvas');tile.width=tile.height=256;
      const c=tile.getContext('2d'),base={walnut:'#956a4b',calcite:'#ded7c8',plaster:'#cfc1aa'};
      c.fillStyle=base[file];c.fillRect(0,0,256,256);
      let seed=29;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
      for(let i=0;i<(file==='calcite'?25:950);i++){
        const a=rand()*256,b=rand()*256;
        c.strokeStyle=file==='walnut'?'rgba(51,29,18,.21)':file==='calcite'?'rgba(121,104,86,.20)':'rgba(88,81,65,.055)';
        c.lineWidth=file==='calcite'?.7:rand()*1.4;
        c.beginPath();c.moveTo(a,b);
        if(file==='walnut')c.bezierCurveTo(a+3,b+13,a-2,b+26,a+1,b+42);
        else if(file==='calcite')c.bezierCurveTo(a+32,b+8,a+24,b+28,a+90,b+39);
        else c.lineTo(a+1,b+1);
        c.stroke();
      }
      t=new T.CanvasTexture(tile);
    }else t=textureLoader.load(prefix+'assets/art/'+file+'.webp');
    t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rx,ry);t.colorSpace=T.SRGBColorSpace;
    t.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return t;
  };
  const woodMap=surface('walnut'),stoneMap=surface('calcite'),wallMap=surface('plaster',2,1);
  const material=(color,roughness=.55,metalness=0,map=null) => new T.MeshStandardMaterial({color,roughness,metalness,map});
  const wood=material('#fcdfc2',.44,0,woodMap);
  const darkWood=material('#5d3d2a',.52);
  const stone=material('#fff8ec',.27,0,stoneMap);
  const bronze=material('#ac8050',.27,.76);
  const brass=material('#c5a573',.18,.90);
  const bronzeDark=material('#423a2f',.36,.76);
  const iron=material('#292825',.28,.61);
  const porcelain=material('#d3c5a7',.43);
  const green=material('#515337',.66);
  const lightGreen=material('#74724a',.68);
  const wall=material('#d7c6b1',.91,0,wallMap);
  const floor=material('#e1d7c5',.62,0,wallMap);
  const env=document.createElement('canvas');env.width=512;env.height=256;
  const ctx=env.getContext('2d'), grd=ctx.createLinearGradient(0,0,0,256);
  grd.addColorStop(0,'#e8dac5');grd.addColorStop(.5,'#b5a68e');grd.addColorStop(.53,'#66594c');grd.addColorStop(1,'#65554c');ctx.fillStyle=grd;ctx.fillRect(0,0,512,256);
  ctx.fillStyle='#fffbea';ctx.fillRect(62,40,88,92);ctx.fillStyle='#302b26';ctx.fillRect(218,38,29,115);ctx.fillStyle='#f5e0bb';ctx.fillRect(357,40,50,70);
  const environment=new T.CanvasTexture(env);environment.mapping=T.EquirectangularReflectionMapping;environment.colorSpace=T.SRGBColorSpace;
  scene.environment=environment;
  const boxGeo=new T.BoxGeometry(1,1,1);
  function box(parent,x,y,z,w,h,d,mat) {
    const m=new T.Mesh(boxGeo,mat);m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  function cyl(parent,x,y,z,r1,r2,h,mat,s=44) {
    const m=new T.Mesh(new T.CylinderGeometry(r1,r2,h,s),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;
  }
  function tube(parent,points,r,mat){
    const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)));
    const m=new T.Mesh(new T.TubeGeometry(curve,32,r,10,false),mat);m.castShadow=true;parent.add(m);return m;
  }
  // A cyclorama with sun falling through tall reveals. The original textures are generated locally.
  box(scene,0,-.12,0,90,.22,90,floor);
  box(scene,0,6,-3.65,32,12,.20,wall);
  const lightWall=material('#eee2cd',.95,0,wallMap), midWall=material('#cbb7a0',.91,0,wallMap);
  box(scene,-5.25,4,-3.22,5.6,8,.45,lightWall);
  for (let i=0;i<6;i++) box(scene,2.15+i*.48,3.7,-3.41,.032,7.4,.14,midWall);
  const sun=new T.DirectionalLight(0xffead0,3.2);sun.position.set(-3.9,6.8,4.5);sun.castShadow=true;scene.add(sun);
  const shadowResolution=viewport.clientWidth < 660 ? 1024 : 2048;
  sun.shadow.mapSize.set(shadowResolution,shadowResolution);
  Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-5,near:.5,far:24});
  sun.shadow.normalBias=.017;sun.shadow.bias=-.0002;
  scene.add(new T.HemisphereLight(0xfff2dd,0x8e7760,1.0));
  const rim=new T.DirectionalLight(0xffefdf,1.15);rim.position.set(3.9,3,-2);scene.add(rim);
  // A soft contact shadow holds the object to the floor at every camera angle.
  const aoCanvas=document.createElement('canvas');aoCanvas.width=aoCanvas.height=128;
  const ac=aoCanvas.getContext('2d'),ag=ac.createRadialGradient(64,64,14,64,64,62);
  ag.addColorStop(0,'rgba(52,36,20,.66)');ag.addColorStop(.62,'rgba(52,36,20,.32)');ag.addColorStop(1,'rgba(52,36,20,0)');ac.fillStyle=ag;ac.fillRect(0,0,128,128);
  const shadow=new T.Mesh(new T.PlaneGeometry(5.9,2.85),new T.MeshBasicMaterial({map:new T.CanvasTexture(aoCanvas),transparent:true,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;shadow.position.set(.02,.002,.04);group.add(shadow);

  box(group,0,.09,0,3.77,.16,1.17,bronzeDark);
  // Open cabinet cavities reveal the slides when a drawer travels forward.
  box(group,-.43,.73,-.625,2.93,1.19,.064,darkWood);
  box(group,-.43,.22,0,2.93,.085,1.27,darkWood);
  const slideMetal=material('#8c806a',.36,.53);
  const trayWood=material('#cdab7e',.55);
  for(const x of [-1.86,-.55,.983]){
    box(group,x,.77,0,.045,1.22,1.27,darkWood);
    box(group,x,1.01,.04,.078,.034,1.18,slideMetal);
  }
  // Thin end grain, drawer partitions, bevel catches and individual semicircular walnut reeds.
  const drawers=[];
  function reededFront(x,w,y,h,moving) {
    const drawer=new T.Group();drawer.position.set(x,y,.67);group.add(drawer);
    box(drawer,0,0,0,w,h,.080,wood);
    const n=Math.round(w/.047),reed=new T.CylinderGeometry(.021,.021,h-.009,12);
    const im=new T.InstancedMesh(reed,wood,n),tr=new T.Object3D();
    for(let i=0;i<n;i++){tr.position.set((i+.5)*w/n-w/2,0,.039);tr.updateMatrix();im.setMatrixAt(i,tr.matrix);}
    im.castShadow=im.receiveShadow=true;drawer.add(im);
    if(moving){
      const bottom=-h*.38;
      box(drawer,0,bottom,-.48,w-.032,.038,.95,trayWood);
      for(const side of [-1,1])box(drawer,side*(w/2-.029),-.015,-.40,.043,h*.68,.79,wood);
      box(drawer,0,.01,-.84,w-.05,h*.71,.033,wood);
      for(const divider of [-.20,.16]){
        box(drawer,divider*w,bottom+.10,-.43,.023,.18,.78,trayWood);
      }
      box(drawer,-.35*w,bottom+.10,-.48,.27*w,.18,.025,trayWood);
      for(const side of [-1,1])box(drawer,side*(w/2-.014),bottom+.065,-.47,.024,.047,.86,slideMetal);
      drawers.push(drawer);
    }
  }
  for (const [x,w] of [[-1.22,1.30],[.22,1.51]]) {
    reededFront(x,w,.46,.62,false);reededFront(x,w,1.105,.62,true);
  }
  box(group,-1.91,.77,0,.065,1.34,1.36,wood);
  box(group,1.43,.738,-.004,.95,1.435,1.49,stone);
  const sx=-.56,sz=-.11;
  // Cut the sink through the stone. Share a continuous UV on the top and the four rim pieces.
  const topShape=new T.Shape();
  topShape.moveTo(-1.99,-.77);topShape.lineTo(1.99,-.77);topShape.lineTo(1.99,.77);topShape.lineTo(-1.99,.77);topShape.closePath();
  const aperture=new T.Path(),sw=.74,sd=.415;
  aperture.moveTo(sx-sw/2,-sz-sd/2);aperture.lineTo(sx-sw/2,-sz+sd/2);aperture.lineTo(sx+sw/2,-sz+sd/2);aperture.lineTo(sx+sw/2,-sz-sd/2);aperture.closePath();topShape.holes.push(aperture);
  const solid=new T.ExtrudeGeometry(topShape,{depth:.082,bevelEnabled:true,bevelSegments:1,bevelSize:.003,bevelThickness:.003});
  const top=new T.Mesh(solid,stone);top.rotation.x=-Math.PI/2;top.position.y=1.427;top.castShadow=top.receiveShadow=true;group.add(top);
  box(group,sx,1.399,sz,.742,.008,.418,iron);
  for(const side of [-1,1]){
    box(group,sx+side*.373,1.452,sz,.008,.12,.42,iron);
    box(group,sx,1.452,sz+side*.208,.747,.12,.008,iron);
    box(group,sx+side*.375,1.516,sz,.012,.006,.431,bronzeDark);
    box(group,sx,1.516,sz+side*.212,.758,.006,.012,bronzeDark);
  }
  cyl(group,sx+.14,1.408,sz-.035,.034,.034,.006,bronzeDark);
  const fx=sx-.08,fz=sz-.33;
  cyl(group,fx,1.529,fz,.059,.070,.036,brass);
  tube(group,[[fx,1.54,fz],[fx,1.97,fz],[fx,2.10,fz+.022],[fx,2.16,fz+.11],[fx,2.15,fz+.20],[fx,2.10,fz+.245],[fx,2.02,fz+.248]],.024,brass);
  cyl(group,fx+.076,1.64,fz,.023,.025,.18,brass);
  tube(group,[[fx+.076,1.73,fz],[fx+.076,1.83,fz-.035]],.014,brass);
  // A dark turned-wood bowl and three pears give the island human scale.
  const bowlProfile=[[.0,0],[.085,0],[.088,.022],[.17,.044],[.265,.096],[.313,.151],[.312,.161],[.298,.163],[.245,.116],[.16,.071],[.07,.055],[0,.054]];
  const bowl=new T.Mesh(new T.LatheGeometry(bowlProfile.map(v=>new T.Vector2(...v)),60),material('#4a372a',.39,0,woodMap));bowl.position.set(1.16,1.519,.13);bowl.castShadow=true;group.add(bowl);
  function pear(x,y,z,scale,mat,tilt){
    const points=[[.001,0],[.064,.012],[.093,.067],[.083,.12],[.047,.17],[.029,.212],[.008,.216]];
    const mesh=new T.Mesh(new T.LatheGeometry(points.map(p=>new T.Vector2(...p)),24),mat);mesh.position.set(x,y,z);mesh.scale.setScalar(scale);mesh.rotation.z=tilt;mesh.castShadow=true;group.add(mesh);
    const stem=cyl(mesh,0,.229,0,.005,.007,.045,darkWood,6);stem.rotation.z=.23;
  }
  pear(1.055,1.61,.11,1,green,.17);pear(1.23,1.614,.09,1.08,lightGreen,-.23);pear(1.17,1.60,.25,.9,green,.46);

  // A suspended linear brass luminaire occupies the negative space above the stone.
  function cord(x,z){
    cyl(scene,x,3.86,z,.007,.007,2.72,bronzeDark,10);
  }
  cord(-.90,-.25);cord(.98,-.25);
  const shade=cyl(scene,.04,2.51,-.25,.050,.050,2.18,bronze,36);
  shade.rotation.z=Math.PI/2;
  const diffuser=box(scene,.04,2.472,-.25,2.09,.011,.034,new T.MeshBasicMaterial({color:0xffefd0}));
  function applyPalette(){
    const v=stage.dataset.finish;
    wood.color.set(v==='graphite'?'#4d514c':v==='linen'?'#ddcaaa':'#ebc5a3');
    wood.map=v==='walnut'?woodMap:null;wood.needsUpdate=true;
  }
  let lastPalette='',shadowAt=-1;
  function render(){
    frame=0;
    if(!visible || document.hidden || !pending)return;
    ax+=(px-ax)*.23;ay+=(py-ay)*.23;ap+=(prog-ap)*.26;
    if(lastPalette!==stage.dataset.finish){applyPalette();lastPalette=stage.dataset.finish;}
    const aspect=width/height;
    const viewH=Math.max(2.8,5.05/aspect);
    camera.left=-viewH*aspect/2;camera.right=viewH*aspect/2;camera.top=viewH/2;camera.bottom=-viewH/2;camera.updateProjectionMatrix();
    const theta=.56+ax*.27+ap*.12;
    camera.position.set(8.2*Math.sin(theta),3.51+ay*.5+ap*1.65,8.2*Math.cos(theta));
    camera.lookAt(0,1.23+ap*.025,.18*ap);
    const drawerTravel=T.MathUtils.smoothstep(ap,0,.78);
    drawers[0].position.z=.67+drawerTravel*.86;
    drawers[1].position.z=.67+T.MathUtils.smoothstep(ap,.5,1)*.38;
    if(Math.abs(ap-shadowAt)>.009 || (ap<.001 && shadowAt!==0)){renderer.shadowMap.needsUpdate=true;shadowAt=ap<.001?0:ap}
    renderer.render(scene,camera);
    stage.dataset.angle=theta.toFixed(4);stage.dataset.open=ap.toFixed(4);
    if(Math.abs(px-ax)+Math.abs(py-ay)+Math.abs(prog-ap)>.0008)requestDraw();
  }
  function requestDraw(){if(!frame && visible && !document.hidden)frame=requestAnimationFrame(render);}
  drawChanges=requestDraw;
  function size(){
    width=viewport.clientWidth;height=viewport.clientHeight;
    renderer.setSize(width,height,false);requestDraw();
  }
  function scroll(){
    if(!visible)return;
    const r=stage.getBoundingClientRect();
    const header=document.querySelector('.mast')?.offsetHeight || 0;
    prog=reduced.matches ? 0 : Math.min(1,Math.max(0,(header-r.top)/Math.max(165,r.height*.55)));
    requestDraw();
  }
  stage.addEventListener('pointermove',e=>{
    if(reduced.matches || !fine.matches || e.pointerType==='touch')return;
    const rect=stage.getBoundingClientRect();px=(e.clientX-rect.left)/rect.width*2-1;py=(e.clientY-rect.top)/rect.height*2-1;requestDraw();
  });
  stage.addEventListener('pointerleave',()=>{px=py=0;requestDraw()});
  reduced.addEventListener('change',()=>{px=py=ax=ay=ap=0;scroll()});
  window.addEventListener('scroll',scroll,{passive:true});
  document.addEventListener('visibilitychange',requestDraw);
  new ResizeObserver(size).observe(viewport);
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible){scroll();requestDraw()}}).observe(stage);
  manager.onLoad=()=>{stage.classList.add('scene-ready');requestDraw()};
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();pending=false;stage.classList.remove('scene-ready')});
  if(location.protocol==='file:')stage.classList.add('scene-ready');
  size();scroll();requestDraw();
})();

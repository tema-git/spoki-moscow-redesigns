/* A small orthographic pavilion renderer. Each surface is drawn in physical coordinates. */
(() => {
  const canvases = [...document.querySelectorAll('[data-pavilion]')];
  if (!canvases.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const logo = new Image();
  logo.src = document.body.dataset.root + 'assets/expo-light.svg';
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const texture = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return [c, c.getContext('2d')];
  };
  function printWall() {
    const [surface, pen] = texture(1080, 470);
    const blue = pen.createLinearGradient(0, 450, 920, 0);
    blue.addColorStop(0, '#0c2c84'); blue.addColorStop(.46, '#1752c1'); blue.addColorStop(1, '#3389e5');
    pen.fillStyle = blue; pen.fillRect(0, 0, 1080, 470);
    pen.save();
    pen.translate(946, 235); pen.rotate(-.30);
    for (let i = 0; i < 17; i++) {
      pen.beginPath();
      pen.ellipse(-i * 8, 0, 120 + i * 28, 270 + i * 12, .18, 0, Math.PI * 2);
      pen.lineWidth = 4 + i * .22;
      pen.strokeStyle = 'rgba(159,235,255,' + (.96 - i * .025) + ')'; pen.stroke();
    }
    pen.restore();
    if (logo.complete && logo.naturalWidth) pen.drawImage(logo, 63, 109, 360, 141);
    pen.fillStyle = '#effaff'; pen.font = '16px Arial'; pen.fillText('ВЫСТАВОЧНЫЕ СИСТЕМЫ', 68, 301);
    return surface;
  }
  function counterPrint() {
    const [surface, g] = texture(660, 300);
    const shade = g.createLinearGradient(0, 0, 660, 300);
    shade.addColorStop(0, '#63c3fa'); shade.addColorStop(.45, '#1971d8'); shade.addColorStop(1, '#174baf');
    g.fillStyle=shade;g.fillRect(0,0,660,300);
    if(logo.complete && logo.naturalWidth) g.drawImage(logo,74,64,315,123);
    g.lineWidth=6;g.strokeStyle='#a9ebff';
    for(let i=0;i<6;i++){g.beginPath();g.ellipse(724,200,95+i*24,198+i*24,-.45,0,Math.PI*2);g.stroke();}
    return surface;
  }
  let wallPrint = printWall(), deskPrint = counterPrint();
  const metal = ['#b7c4cc','#e7eff2','#fafdfd'];
  const white = ['#b6c8ce','#edf3f1','#ffffff'];
  const wood = ['#9a7857','#d7b387','#f2d9ad'];
  const indigo = ['#19418d','#2665b9','#66a0e3'];

  function draw(canvas, state) {
    const ctx=canvas.getContext('2d'), rect=canvas.getBoundingClientRect();
    const W=rect.width, H=rect.height;
    if(!W || !H) return;
    const ratio=Math.min(devicePixelRatio || 1,1.8);
    const bw=Math.round(W*ratio),bh=Math.round(H*ratio);
    if(canvas.width!==bw || canvas.height!==bh){canvas.width=bw;canvas.height=bh;}
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,W,H);
    const assembly=canvas.dataset.pavilion==='assembly', reveal=state.scroll;
    const yaw=(assembly ? -.66 : -.43) + state.x*.22 + (assembly?0:reveal*.14);
    const elevation=(assembly ? .50 : .47)+state.y*.09+(assembly?0:reveal*.12);
    const cy=Math.cos(yaw),sy=Math.sin(yaw),ce=Math.cos(elevation),se=Math.sin(elevation);
    const scale=Math.min(W/(assembly?10.5:8.95),H/(assembly?7.4:6.35));
    const ox=W*.51,oy=H*(assembly?.70:.716);
    const project=([x,y,z])=>[ox+(x*cy-z*sy)*scale,oy+((x*sy+z*cy)*se-y*ce)*scale];
    const depth=([x,y,z])=>(x*sy+z*cy)*ce+y*se;
    const toPts=pts=>pts.map(project);
    const shape=(pts,fill,stroke,width=.65)=>{
      ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
      if(fill){ctx.fillStyle=fill;ctx.fill();}
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
    };
    const line=(a,b,color,width=1)=>{ctx.beginPath();ctx.moveTo(...project(a));ctx.lineTo(...project(b));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
    function floorOval(x,z,rx,rz,colors,y=.005){
      const c=project([x,y,z]),a=project([x+rx,y,z]),b=project([x,y,z+rz]);
      ctx.save();ctx.transform(a[0]-c[0],a[1]-c[1],b[0]-c[0],b[1]-c[1],c[0],c[1]);
      const g=ctx.createRadialGradient(0,0,0,0,0,1);colors.forEach(([t,v])=>g.addColorStop(t,v));
      ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
    }
    const faces=[];
    function face(pts,color,bonus=0){
      faces.push({d:pts.reduce((v,p)=>v+depth(p),0)/pts.length+bonus,paint:()=>shape(toPts(pts),color,color,.28)});
    }
    function box(x,y,z,w,h,d,colors){
      const l=x-w/2,r=x+w/2,b=z-d/2,f=z+d/2,t=y+h;
      face([[l,y,b],[l,t,b],[l,t,f],[l,y,f]],colors[0]);
      face([[l,y,f],[l,t,f],[r,t,f],[r,y,f]],colors[1]);
      face([[l,t,b],[r,t,b],[r,t,f],[l,t,f]],colors[2]);
    }
    function flatTexture(tl,tr,bl,image){
      const br=tl.map((v,i)=>tr[i]+bl[i]-v);
      faces.push({d:[tl,tr,bl,br].reduce((n,p)=>n+depth(p),0)/4+.018,paint:()=>{
        const a=project(tl),b=project(tr),c=project(bl);
        ctx.save();ctx.transform((b[0]-a[0])/image.width,(b[1]-a[1])/image.width,(c[0]-a[0])/image.height,(c[1]-a[1])/image.height,a[0],a[1]);ctx.drawImage(image,0,0);ctx.restore();
      }});
    }
    function cylinder(x,y,z,r,h,top,front,edge){
      const c=project([x,y+h,z]);const rad=r*scale;
      faces.push({d:depth([x,y+h*.56,z]),paint:()=>{
        const bottom=project([x,y,z]);const half=rad*se;
        const g=ctx.createLinearGradient(c[0]-rad,0,c[0]+rad,0);g.addColorStop(0,edge);g.addColorStop(.40,front);g.addColorStop(1,edge);
        ctx.beginPath();ctx.moveTo(c[0]-rad,c[1]);ctx.lineTo(c[0]-rad,bottom[1]);ctx.ellipse(bottom[0],bottom[1],rad,half,0,Math.PI,0,true);ctx.lineTo(c[0]+rad,c[1]);ctx.fillStyle=g;ctx.fill();
        ctx.beginPath();ctx.ellipse(...c,rad,half,0,0,Math.PI*2);ctx.fillStyle=top;ctx.fill();
      }});
    }
    function flush(){
      faces.sort((a,b)=>a.d-b.d);for(const f of faces) f.paint();faces.length=0;
    }
    function dimension(a,b,label,offset,align){
      const col=assembly?'#8bc4d5':'#7492a5';
      const aa=project(a),bb=project(b);
      ctx.save();ctx.strokeStyle=col;ctx.lineWidth=.85;ctx.beginPath();ctx.moveTo(...aa);ctx.lineTo(...bb);ctx.stroke();
      for(const [x,y] of [aa,bb]){ctx.beginPath();ctx.moveTo(x-2,y+4);ctx.lineTo(x+2,y-4);ctx.stroke();}
      ctx.translate((aa[0]+bb[0])/2,(aa[1]+bb[1])/2);ctx.rotate(Math.atan2(bb[1]-aa[1],bb[0]-aa[0]));
      ctx.font='500 '+clamp(W*.021,11,15)+'px Montserrat, Arial';ctx.textAlign='center';ctx.fillStyle=assembly?'#c2e4ee':'#456277';ctx.fillText(label,align||0,offset);ctx.restore();
    }
    const split=assembly?1-reveal:0,base=.18;
    // The construction grid stays at ground level while the elevation changes.
    ctx.save();
    const grid=assembly?'rgba(150,205,225,.17)':'rgba(104,143,163,.15)';
    for(let i=-5;i<=5;i++){
      line([i,0,-3.7],[i,0,3.65],grid,.65);
      if(i>=-3 && i<=3)line([-4.9,0,i],[4.9,0,i],grid,.65);
    }
    ctx.restore();
    floorOval(.16,.15,4.38,3.05,[[0,'rgba(27,49,64,.33)'],[.68,'rgba(45,65,79,.22)'],[1,'rgba(79,103,121,0)']]);
    box(0,0,0,6.35,.11,4.35,['#6a8390','#8199a4','#cedae0']);flush();
    box(0,.11,0,6.4,.07,4.4,['#a9b8bc','#bdcbd1','#f2f2ec']);flush();
    for(let i=-3;i<=3;i++)line([i,base+.01,-2.15],[i,base+.01,2.15],'#d9dddd',.55);
    for(let i=-2;i<=2;i++)line([-3.16,base+.01,i],[3.16,base+.01,i],'#dadddb',.55);
    floorOval(.55,-1.65,2.6,.53,[[0,'rgba(77,83,83,.36)'],[1,'rgba(77,83,83,0)']],base+.015);
    const wallY=base+split*.45,wallZ=-1.94-split*.48;
    box(-.17,wallY,wallZ,5.76,2.61,.16,white);
    flatTexture([-2.98,wallY+2.54,wallZ+.089],[2.63,wallY+2.54,wallZ+.089],[-2.98,wallY+.08,wallZ+.089],wallPrint);
    flush();
    const sideX=2.76+split*.70;
    box(sideX,wallY,-.22,.16,2.60,3.56,['#d4d9d2','#9ca9a9','#edf4ed']);flush();
    for(let j=0;j<22;j++)box(sideX-.13,wallY,-1.89+j*.157,.15,2.56,.073,wood);
    box(sideX-.14,wallY+2.57,-.22,.18,.045,3.57,metal);flush();
    // Reception, meeting furniture and plant are drawn as individual depth groups.
    floorOval(-1.35,.95,1.45,.82,[[0,'rgba(28,50,63,.30)'],[1,'rgba(28,50,63,0)']],base+.02);
    function seat(x,z,angle){
      for(const [a,b] of [[-.13,-.13],[.13,-.13],[-.13,.13],[.13,.13]])box(x+a,base,z+b,.038,.46,.04,metal);
      cylinder(x,base+.45,z,.25,.09,'#a6c6d7','#729bb2','#45657c');
      const dx=Math.sin(angle)*.19,dz=Math.cos(angle)*.19;
      box(x+dx,base+.52,z+dz,.36,.30,.065,['#6b8b9c','#90b0c2','#c0d3dd']);
    }
    seat(.23,-.74,3.13);seat(1.48,-.26,1.2);seat(.28,.37,-.45);
    cylinder(.83,base+.01,-.15,.28,.045,'#93a4ac','#718897','#637783');
    cylinder(.83,base+.05,-.15,.047,.79,'#bfcbd1','#c5d1d8','#728895');
    cylinder(.83,base+.82,-.15,.55,.068,'#fcfaf3','#d9d4c7','#abb1ac');flush();
    const deskX=-1.60,deskZ=1.11;
    box(deskX,base+.012,deskZ,1.91,.105,.72,metal);
    box(deskX,base+.11,deskZ,2.04,.89,.78,indigo);
    flatTexture([deskX-1.01,base+.99,deskZ+.397],[deskX+1.01,base+.99,deskZ+.397],[deskX-1.01,base+.12,deskZ+.397],deskPrint);
    box(deskX,base+.999,deskZ,2.10,.078,.87,white);flush();
    box(-1.95,base+1.08,1.12,.38,.031,.24,metal);box(-1.95,base+1.108,1.04,.36,.22,.022,['#394850','#223949','#8e9ca8']);flush();
    const px=2.45,pz=1.47;
    cylinder(px,base,pz,.22,.42,'#d9d2c0','#f7efe2','#b7b6aa');flush();
    for(let i=0;i<21;i++){
      const a=i*2.40,len=.40+(i%6)*.066,r=.18+((i*3)%7)*.029;
      const bx=px+Math.cos(a)*.055,bz=pz+Math.sin(a)*.055;
      const start=[bx,base+.37,bz],tip=[px+Math.cos(a)*r,base+.36+len,pz+Math.sin(a)*r];
      const mid=[mix(start[0],tip[0],.49)-Math.sin(a)*.060,base+.44+len*.60,mix(start[2],tip[2],.49)+Math.cos(a)*.060];
      const mid2=[mix(start[0],tip[0],.56)+Math.sin(a)*.047,base+.45+len*.48,mix(start[2],tip[2],.56)-Math.cos(a)*.047];
      shape(toPts([start,mid,tip,mid2]),['#4e7661','#628b69','#345f51','#96ab78'][i%4]);
    }
    // A suspended, illuminated rectangular fascia. The void in the middle stays open.
    const signY=3.04+split*.90+(assembly?0:reveal*.53), signZ=-.34-split*.10;
    const sx=-.12,sw=5.11,sd=2.28,th=.13,sh=.39;
    for(const [xx,zz] of [[sx-sw*.4,signZ+sd*.36],[sx+sw*.4,signZ+sd*.36],[sx+sw*.4,signZ-sd*.36],[sx-sw*.4,signZ-sd*.36]]){
      line([xx,signY+sh,zz],[xx,signY+sh+.65,zz],assembly?'rgba(185,217,229,.64)':'rgba(111,138,153,.48)',.7);
    }
    box(sx,signY,signZ-sd*.5,sw,sh,th,metal);
    box(sx+sw*.5,signY,signZ,th,sh,sd,white);
    box(sx-sw*.5,signY,signZ,th,sh,sd,['#6f8b9d','#ccdce1','#f7faf8']);
    box(sx,signY,signZ+sd*.5,sw+.13,sh,th,['#8099aa','#e9f3f8','#fffffc']);flush();
    line([sx-sw*.5,signY+.022,signZ+sd*.5+.07],[sx+sw*.5,signY+.022,signZ+sd*.5+.07],'#87dbfe',2);
    const A=project([sx-sw*.5+.27,signY+sh*.66,signZ+sd*.5+.078]),B=project([sx-sw*.5+1.27,signY+sh*.66,signZ+sd*.5+.078]),C=project([sx-sw*.5+.27,signY+sh*.66-1,signZ+sd*.5+.078]);
    ctx.save();ctx.transform(B[0]-A[0],B[1]-A[1],C[0]-A[0],C[1]-A[1],A[0],A[1]);ctx.scale(.008,.008);ctx.fillStyle='#244659';ctx.font='bold 21px Arial';ctx.fillText('E X P O   L I G H T',0,14);ctx.restore();
    dimension([-3.15,.005,2.55],[3.15,.005,2.55],'6 м',15);
    dimension([-3.55,.005,-2.16],[-3.55,.005,2.16],'4 м',-6);
    canvas.dataset.frame=[state.x,state.y,reveal].map(v=>v.toFixed(3)).join(',');
  }
  const states = canvases.map(canvas=>({canvas,x:0,y:0,scroll:canvas.dataset.pavilion==='assembly'?1:0,visible:true}));
  let scheduled=false;
  function render(){
    scheduled=false;
    for(const state of states){
      if(!state.visible)continue;
      const b=state.canvas.getBoundingClientRect(),h=innerHeight;
      if(reduce.matches){state.x=0;state.y=0;state.scroll=state.canvas.dataset.pavilion==='assembly'?1:0;}
      else if(state.canvas.dataset.pavilion==='assembly')state.scroll=clamp((h-b.top)/(h*.47+b.height*.32),0,1);
      else state.scroll=clamp(scrollY/(h*.80),0,1);
      draw(state.canvas,state);
    }
  }
  function request(){if(!scheduled){scheduled=true;requestAnimationFrame(render);}}
  const vis=new IntersectionObserver(entries=>{for(const e of entries){states.find(s=>s.canvas===e.target).visible=e.isIntersecting;}request();},{rootMargin:'60px'});
  const resize=new ResizeObserver(request);
  for(const state of states){
    const el=state.canvas;resize.observe(el);vis.observe(el);
    if(el.dataset.pavilion==='assembly')continue;
    el.addEventListener('pointermove',event=>{
      if(!fine.matches || reduce.matches || event.pointerType==='touch')return;
      const b=el.getBoundingClientRect();state.x=clamp((event.clientX-b.left)/b.width*2-1,-1,1);state.y=clamp((event.clientY-b.top)/b.height*2-1,-1,1);request();
    });
    el.addEventListener('pointerleave',()=>{state.x=state.y=0;request();});
  }
  logo.onload=()=>{wallPrint=printWall();deskPrint=counterPrint();request();};
  window.addEventListener('scroll',request,{passive:true});reduce.addEventListener('change',request);request();
})();

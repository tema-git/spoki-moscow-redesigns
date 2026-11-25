'use strict';

(() => {
  const hero=document.querySelector('.hero');
  const art=hero.querySelector('.hero-art');
  const canvas=document.querySelector('#tape');
  const ctx=canvas.getContext('2d');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const hover=matchMedia('(hover: hover) and (pointer: fine)');
  const target={x:0,y:0,scroll:0};
  const current={x:0,y:0,scroll:0};
  let frame=0,visible=true,scale=1;
  const WIDTH=610,HEIGHT=230;

  function bezier(a,b,c,d,t) {
    const s=1-t;
    return [s*s*s*a[0]+3*s*s*t*b[0]+3*s*t*t*c[0]+t*t*t*d[0],s*s*s*a[1]+3*s*s*t*b[1]+3*s*t*t*c[1]+t*t*t*d[1]];
  }
  function drawTape() {
    if(!ctx || !canvas.width || !canvas.height)return;
    const {x,y,scroll}=current;
    ctx.setTransform(canvas.width/WIDTH,0,0,canvas.height/HEIGHT,0,0);
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    // The tail curves around itself before crossing the foreground of the photograph.
    const segments=[
      [[25+x*15,143+y*16],[101+x*15,108-scroll*20],[169,187+y*28],[233+x*17,158+y*12]],
      [[233+x*17,158+y*12],[316+x*16,118+y*10],[285+x*20,45-scroll*26],[232+x*12,76+y*14]],
      [[232+x*12,76+y*14],[170,118+y*28],[258+x*30,180+scroll*16],[360,149-scroll*12]],
      [[360,149-scroll*12],[454+x*20,122-scroll*20],[548,51+y*20],[636,79+scroll*18]]
    ];
    ctx.lineJoin='round';ctx.lineCap='round';
    let distance=0,nextTick=5,tick=0;
    for(let s=0;s<segments.length;s++){
      const samples=[];
      for(let j=0;j<=64;j++){
        const t=j/64,seg=segments[s],p=bezier(...seg,t),a=bezier(...seg,Math.max(0,t-.008)),b=bezier(...seg,Math.min(1,t+.008));
        const angle=Math.atan2(b[1]-a[1],b[0]-a[0]);
        const nx=-Math.sin(angle),ny=Math.cos(angle);
        const twist=s===1 ? .48+.52*Math.cos(Math.PI*t*.85) : s===2 ? .45+.55*Math.sin(t*Math.PI*.65) : 1;
        const wide=Math.max(3,9.2*Math.abs(twist)+2.3);
        samples.push({p,angle,nx,ny,wide,upper:[p[0]+nx*wide,p[1]+ny*wide],lower:[p[0]-nx*wide,p[1]-ny*wide]});
      }
      const grad=ctx.createLinearGradient(0,40,0,178);
      if(s===1){grad.addColorStop(0,'#421321');grad.addColorStop(.6,'#991733');grad.addColorStop(1,'#b3153d');}
      else{grad.addColorStop(0,'#de4771');grad.addColorStop(.42,'#d62155');grad.addColorStop(1,'#a50033');}
      ctx.beginPath();ctx.moveTo(...samples[0].upper);
      for(const k of samples.slice(1))ctx.lineTo(...k.upper);
      for(const k of [...samples].reverse())ctx.lineTo(...k.lower);
      ctx.closePath();ctx.fillStyle=grad;ctx.shadowColor='rgba(52,18,28,.19)';ctx.shadowBlur=3*scale;ctx.shadowOffsetY=2;ctx.fill();ctx.shadowColor='transparent';ctx.shadowOffsetY=0;
      ctx.beginPath();ctx.moveTo(...samples[0].lower);for(const k of samples.slice(1))ctx.lineTo(...k.lower);
      ctx.strokeStyle='rgba(255,175,188,.75)';ctx.lineWidth=.85;ctx.stroke();
      for(let j=1;j<samples.length;j++){
        const a=samples[j-1],v=samples[j];const length=Math.hypot(v.p[0]-a.p[0],v.p[1]-a.p[1]);
        distance+=length;if(distance<nextTick)continue;
        const long=tick%5===0,middle=tick%5===2;
        const len=v.wide*(long?1.12:middle?.72:.44);
        ctx.strokeStyle='rgba(255,244,233,.95)';ctx.lineWidth=long?1.15:.75;
        ctx.beginPath();ctx.moveTo(...v.lower);ctx.lineTo(v.lower[0]+v.nx*len,v.lower[1]+v.ny*len);ctx.stroke();
        if(long&&v.wide>6){
          ctx.save();ctx.translate(v.p[0]+v.nx*4.1,v.p[1]+v.ny*4.1);ctx.rotate(v.angle);
          ctx.font='600 8px Arial';ctx.fillStyle='#fff4ec';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(18+Math.floor(tick/5)),0,0);ctx.restore();
        }
        nextTick=distance+3.25;tick++;
      }
      if(s===0){
        const tip=samples[0];ctx.save();ctx.translate(...tip.p);ctx.rotate(tip.angle);
        const metal=ctx.createLinearGradient(-5,-11,4,11);metal.addColorStop(0,'#76685f');metal.addColorStop(.4,'#f4e9d4');metal.addColorStop(1,'#a59182');
        ctx.fillStyle=metal;ctx.fillRect(-5,-11.5,8,23);ctx.strokeStyle='#64534a';ctx.lineWidth=.7;ctx.strokeRect(-5,-11.5,8,23);ctx.restore();
      }
    }
  }
  function paint(){
    frame=0;
    let change=0;
    for(const k of ['x','y','scroll']){const d=target[k]-current[k];current[k]+=d*.24;change+=Math.abs(d);}
    const {x,y,scroll}=current;
    hero.style.setProperty('--hx',(x*6-scroll*6).toFixed(2)+'px');
    hero.style.setProperty('--hy',(y*4+scroll*6).toFixed(2)+'px');
    hero.style.setProperty('--paper-x',(x*17-scroll*30).toFixed(2)+'px');
    hero.style.setProperty('--paper-y',(y*13+scroll*32).toFixed(2)+'px');
    const paper=hero.querySelector('.hero-paper');
    paper.style.rotate=(x*8+scroll*10).toFixed(2)+'deg';
    drawTape();
    if(change>.008&&visible&&!reduced.matches)frame=requestAnimationFrame(paint);
  }
  function schedule(){if(!frame&&visible)frame=requestAnimationFrame(paint);}
  function resize(){
    const rect=canvas.getBoundingClientRect();scale=Math.min(devicePixelRatio||1,2);
    canvas.width=Math.max(1,Math.round(rect.width*scale));canvas.height=Math.max(1,Math.round(rect.height*scale));drawTape();
  }
  function move(event) {
    if(reduced.matches)return;
    const r=art.getBoundingClientRect();
    target.x=Math.max(-1,Math.min(1,(event.clientX-r.left)/r.width*2-1));
    target.y=Math.max(-1,Math.min(1,(event.clientY-r.top)/r.height*2-1));schedule();
  }
  hero.addEventListener('pointermove',event=>{if(hover.matches&&event.pointerType!=='touch')move(event);},{passive:true});
  art.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')move(event);},{passive:true});
  hero.addEventListener('pointerleave',()=>{target.x=target.y=0;schedule();},{passive:true});
  const visibility=new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;
    if(visible)schedule();else if(frame){cancelAnimationFrame(frame);frame=0;}
  });visibility.observe(hero);
  new ResizeObserver(resize).observe(canvas);resize();
  if(window.gsap&&window.ScrollTrigger){
    gsap.registerPlugin(ScrollTrigger);
    const mm=gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)',()=>{
      ScrollTrigger.create({trigger:hero,start:'top top',end:'bottom top',onUpdate:self=>{target.scroll=self.progress;schedule();}});
      const tl=gsap.timeline({defaults:{ease:'none'},scrollTrigger:{trigger:'.technique',start:'top 100%',end:'center 50%',scrub:true,invalidateOnRefresh:true}});
      const panel='.assembly ';
      tl.from(panel+'.left-sleeve',{x:-43,y:-16,rotation:-15,transformOrigin:'top right'},0)
        .from(panel+'.right-sleeve',{x:43,y:-13,rotation:15,transformOrigin:'top left'},0)
        .from(panel+'.left-panel',{x:-21,y:22,rotation:-6,transformOrigin:'center'},0)
        .from(panel+'.right-panel',{x:21,y:22,rotation:6,transformOrigin:'center'},0)
        .from(panel+'.lapel',{y:-31,scale:.86,transformOrigin:'center'},0);
      return ()=>{target.x=target.y=target.scroll=current.x=current.y=current.scroll=0;paint();};
    });
    document.fonts.ready.then(()=>ScrollTrigger.refresh());
  }
  reduced.addEventListener('change',()=>{if(reduced.matches){target.x=target.y=target.scroll=current.x=current.y=current.scroll=0;paint();}});
})();


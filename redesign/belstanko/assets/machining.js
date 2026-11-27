(() => {
  'use strict';
  const canvas = document.querySelector('.lathe-canvas');
  const geometry = window.BelstankoGeometry;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = value => Math.max(0, Math.min(1, value));
  function ramp(value, start, end) {
    const t = clamp((value - start) / (end - start));
    return t * t * (3 - 2 * t);
  }

  if (canvas && geometry) {
    const context = canvas.getContext('2d');
    if (context) {
      const field = canvas.parentElement;
      const { points, palette, strokes } = geometry;
      const projected = new Float32Array(points.length * 2);
      let lastInput = [0, 0, 0], lastKey = '', width = 0, height = 0, dpr = 1;
      function draw(hx = 0, hy = 0, scroll = 0) {
        lastInput = [hx, hy, scroll];
        if (motion.matches) hx = hy = scroll = 0;
        const key = [hx, hy, scroll, width, height, dpr].map(n => n.toFixed(3)).join('/');
        if (!width || !height || key === lastKey) return;
        lastKey = key;
        const yaw = -.3665 + hx * .219 - scroll * .072;
        const tilt = .3142 - hy * .13 + scroll * .091;
        const cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
        const feed = hx * 9 - scroll * 35;
        const spindle = hx * .35 + scroll * 6.65, sr = Math.sin(spindle), cr = Math.cos(spindle);
        for (let i = 0; i < points.length; i++) {
          let [x, y, z, part] = points[i];
          if (part === 1) x += feed;
          if (part === 2) {
            const dy = y - 207, dz = z - 38;
            y = 207 + dy * cr - dz * sr;
            z = 38 + dy * sr + dz * cr;
          }
          x -= 300; y -= 127; z -= 42;
          projected[2*i] = 332.1 + x * cy - z * sy;
          projected[2*i+1] = 171.1 - y * ct + (x * sy + z * cy) * st;
        }
        const scale = Math.min(width / 656, height / 346);
        context.setTransform(1,0,0,1,0,0);
        context.clearRect(0,0,canvas.width,canvas.height);
        context.setTransform(dpr*scale,0,0,dpr*scale,dpr*(width-656*scale)/2,dpr*(height-346*scale)/2);
        context.save();
        context.translate(349,286);context.rotate(-.105);context.scale(294,36);
        const shade = context.createRadialGradient(0,0,0,0,0,1);
        shade.addColorStop(0,'rgba(32,60,52,.31)');shade.addColorStop(.58,'rgba(49,75,64,.17)');shade.addColorStop(1,'rgba(49,75,64,0)');
        context.fillStyle=shade;context.fillRect(-1,-1,2,2);context.restore();
        context.lineJoin='round';context.lineCap='round';
        for (const shape of strokes) {
          const color=palette[shape[0]], lineWidth=shape[1];
          context.beginPath();
          let j=shape[2]*2;
          context.moveTo(projected[j],projected[j+1]);
          for (let k=3;k<shape.length;k++) {j=shape[k]*2;context.lineTo(projected[j],projected[j+1]);}
          context.strokeStyle=color;context.lineWidth=Math.abs(lineWidth);
          if (lineWidth>0) {context.closePath();context.fillStyle=color;context.fill();}
          context.stroke();
        }
        canvas.hidden = false;
        field.classList.add('model-drawn');
      }
      function resize() {
        const rect = field.getBoundingClientRect();
        width = Math.round(rect.width); height = Math.round(rect.height); dpr = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(width*dpr));
        canvas.height = Math.max(1, Math.round(height*dpr));
        lastKey='';draw(...lastInput);
      }
      window.BelstankoLathe = { draw };
      new ResizeObserver(resize).observe(field);
      motion.addEventListener('change', () => {lastKey='';draw(...lastInput);});
      resize();
    }
  }

  const story = document.querySelector('.turning-story');
  if (!story) return;
  const pin = story.querySelector('.turning-pin');
  const diagram = story.querySelector('.turning-diagram svg');
  const small = matchMedia('(max-width:620px)');
  function frameDiagram() {
    diagram.setAttribute('viewBox',small.matches ? '62 47 657 243' : '32 40 717 255');
  }
  small.addEventListener('change',frameDiagram);
  frameDiagram();

  const steps = [...story.querySelectorAll('.turning-stages li')];
  const nodes = Object.fromEntries(['spindle','bar','rough-body','fine-lines','shoulder','uncut-end','stock-glint','tool','chip','witness'].map(key => [key, document.getElementById('turn-'+key)]));
  const jaws = story.querySelectorAll('.turn-jaw');
  let inRange = false, pending = 0, previous = -1;
  function render(progress) {
    if (Math.abs(previous-progress)<.0003) return;
    previous=progress;
    const grip=ramp(progress,0,.21), approach=ramp(progress,.22,.44), feed=ramp(progress,.44,.82), withdraw=ramp(progress,.82,.97);
    const cutX=613-205*feed;
    const xTool=657-44*approach-205*feed+45*withdraw;
    const yTool=230-53*approach+49*withdraw;
    const rotation=540*ramp(progress,.19,.92);
    const translate=(el,x,y)=>el.setAttribute('transform','translate('+x.toFixed(2)+' '+y.toFixed(2)+')');
    translate(nodes.bar,91*(1-grip),0);
    nodes.spindle.setAttribute('transform','rotate('+rotation.toFixed(2)+')');
    jaws.forEach(jaw=>translate(jaw,0,-9*(1-grip)));
    nodes['rough-body'].setAttribute('d','M226 111H'+cutX.toFixed(2)+'v78H226Z');
    nodes['fine-lines'].setAttribute('d','M'+cutX.toFixed(2)+' 123H613v54H'+cutX.toFixed(2)+'Z');
    nodes['stock-glint'].setAttribute('d','M235 119H'+Math.max(235,cutX-4).toFixed(2));
    translate(nodes.shoulder,cutX,150);
    nodes['uncut-end'].setAttribute('opacity',(1-ramp(feed,0,.08)).toFixed(3));
    translate(nodes.tool,xTool,yTool);
    translate(nodes.chip,xTool,yTool);
    nodes.chip.setAttribute('opacity',(ramp(progress,.44,.49)*(1-ramp(progress,.79,.84))).toFixed(3));
    nodes.chip.setAttribute('transform',nodes.chip.getAttribute('transform')+' rotate('+ (Math.sin(feed*Math.PI*12)*16).toFixed(2)+')');
    nodes.witness.setAttribute('opacity',ramp(progress,.85,.98).toFixed(3));
    const stage=progress<.22?0:progress<.44?1:progress<.82?2:3;
    steps.forEach((el,i)=>{
      const current=!motion.matches && i===stage;
      el.classList.toggle('current',current);
      if(current)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
    });
    story.dataset.phase=String(stage+1);
  }
  function paint() {
    pending=0;
    if (motion.matches) {render(1);return;}
    const top=story.getBoundingClientRect().top;
    const header=document.querySelector('.top').getBoundingClientRect().height;
    const entry=innerHeight-Math.min(56,pin.offsetHeight*.11);
    const travel=Math.max(1,story.offsetHeight-pin.offsetHeight);
    const sticky = getComputedStyle(pin).position === 'sticky';
    const progress = sticky
      ? (top>header ? .2*clamp((entry-top)/Math.max(1,entry-header)) : .2+.8*clamp((header-top)/travel))
      : clamp((entry-top) / (entry + story.offsetHeight * .55));
    render(progress);
  }
  const schedule=()=>{if(!pending)pending=requestAnimationFrame(paint);};
  new IntersectionObserver(entries => {inRange=entries[0].isIntersecting;if(inRange)schedule();},{rootMargin:'110px'}).observe(story);
  addEventListener('scroll',()=>{if(inRange && !motion.matches)schedule();},{passive:true});
  addEventListener('resize',schedule,{passive:true});
  motion.addEventListener('change',()=>{previous=-1;schedule();});
  schedule();
})();

/* Orthographic bookbinding models. The same geometry supplies the first paint and live views. */
(function (root, make) {
  const model = make();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.KemBookModel = model;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const W = 240, D = 300;
  const clamp = value => Math.max(0, Math.min(1, value));
  function phase(value,start,end) {
    const t = clamp((value-start)/(end-start));
    return t*t*(3-2*t);
  }
  const num = value => Number(value.toFixed(3));
  function textures(id) {
    const ref = name => 'url(#'+id+'-'+name+')';
    const group = (name,body) => '<g id="'+id+'-'+name+'">'+body+'</g>';
    const rect = (x,y,w,h,color) => '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+color+'"/>';
    const path = (d,color,width) => '<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+width+'"/>';
    const type = (x,y,size,caption,font,ink) => '<text x="'+x+'" y="'+y+'" font-family="'+font+'" font-size="'+size+'" fill="'+ink+'">'+caption+'</text>';
    const serif = "'PT Serif',Georgia,serif";
    let waves='', rules='', paperRows='', threadBands='', goldEdges='';
    for (let j=0;j<32;j++) {
      waves+=path('M-12 '+(184+j*1.65)+' C45 '+(259+j*1.0)+' 95 '+(165+j*1.15)+' 151 '+(174+j*1.78)+' S207 '+(229+j*.67)+' 256 '+(148+j*2.8),'#f9dca3',.91);
    }
    for (let j=0;j<16;j++) {
      rules+=rect(27,131+j*5.9,j===15?61:80-(j%5)*2,1.2,'#84755e')+rect(124,131+j*5.9,j===15?54:85-(j%4)*2,1.2,'#84755e');
    }
    for (let j=0;j<11;j++) paperRows+=path('M0 '+(1+j*1.85)+' Q55 '+(1.9+j*1.85)+' 115 '+(1.15+j*1.85)+' T240 '+(1.5+j*1.85),j%3?'#b0a087':'#897558',j%3?.45:.72);
    for (let j=0;j<15;j++) threadBands+=rect(j*2.2,0,1.1,6,j%2?'#f0d6a0':'#b32140');
    for (let j=0;j<13;j++) goldEdges+=path('M'+(6+j*18)+' 4v13','#82715d',.32);
    const paperTop=rect(0,0,W,D,ref('ivory'))+path('M9 0v300','#b5a184',1);
    const crop='<clipPath id="'+id+'-bounds"><rect width="240" height="300" rx="2"/></clipPath>';
    let out='<defs>'+crop+
      '<linearGradient id="'+id+'-cloth" x2=".83" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#ff5265"/><stop offset=".42" stop-color="#e72f4d"/><stop offset="1" stop-color="#b61938"/></linearGradient>'+
      '<linearGradient id="'+id+'-ivory" x2=".9" y2=".18" gradientUnits="objectBoundingBox"><stop stop-color="#d2c2a5"/><stop offset=".12" stop-color="#f1e5cb"/><stop offset=".8" stop-color="#fff9e9"/><stop offset="1" stop-color="#e4d5ba"/></linearGradient>'+
      '<pattern id="'+id+'-weave" width="2.9" height="3.1" patternUnits="userSpaceOnUse"><path d="M0 0h3M0 0v3.1" stroke="#651727" stroke-width=".35" opacity=".39"/></pattern>'+
      '<radialGradient id="'+id+'-shadow"><stop stop-color="#201820" stop-opacity=".52"/><stop offset=".69" stop-color="#201820" stop-opacity=".19"/><stop offset="1" stop-color="#201820" stop-opacity="0"/></radialGradient>';
    out+=group('shade','<ellipse cx="120" cy="150" rx="137" ry="165" fill="'+ref('shadow')+'"/>');
    out+=group('jacket','<g clip-path="'+ref('bounds')+'">'+rect(0,0,W,D,ref('cloth'))+rect(0,0,W,D,ref('weave'))+
      path('M10 0v300','#9c2139',2.5)+path('M13 0v300','#ff8290',.8)+
      '<g fill="#fff0d4" font-family="Mulish,Arial,sans-serif" font-size="7" font-weight="700" letter-spacing="1.4"><text x="24" y="23">ПК КЕМ</text><text x="220" y="23" text-anchor="end">ПЕРЕПЛЁТ</text></g>'+
      type(22,76,44,'Форма',serif,'#ffe9c9')+type(23,119,44,'книги',serif,'#ffe9c9')+waves+
      path('M23 277h60','#eeb78b',.8)+'</g>');
    out+=group('lower',rect(0,0,W,D,'#282b36')+rect(0,0,W,D,ref('weave'))+path('M12 0v300','#63616a',1.4)+
      type(26,279,11,'Полиграфический комплекс',serif,'#e7cfab')+path('M163 277h52','#d4bb8e',.8));
    out+=group('paper',paperTop);
    out+=group('text',paperTop+type(26,42,7,'ПОЛИГРАФИЧЕСКИЙ КОМПЛЕКС','Mulish,Arial,sans-serif','#9a2540')+
      type(25,81,27,'Переплёт',serif,'#35303a')+path('M27 100h184','#a73449',1.8)+rules+type(208,280,9,'08',serif,'#7b6655'));
    out+=group('plate',paperTop+rect(22,30,95,70,'#c03b45')+rect(124,30,90,70,'#5b7c83')+rect(22,110,192,2,'#423c39')+rules+type(205,280,9,'04',serif,'#7b6655'));
    out+=group('fly',rect(0,0,W,D,'#e9ac90')+path('M12 0v300','#b97766',1.3)+path('M15 0v300','#f6ceaa',.8));
    out+=group('inside',rect(0,0,W,D,'#e6b398')+path('M11 0v300','#b57464',2)+rect(20,19,201,262,'none')+
      path('M21 20h199v259H21z','#d19a80',1));
    out+=group('pagesEdge',rect(0,0,W,20,'#e9ddc1')+paperRows);
    out+=group('pagesFore',rect(0,0,W,20,'#d6c4a4')+paperRows+goldEdges);
    out+=group('redEdge',rect(0,0,W,20,'#89152d')+rect(0,0,W,3,'#e74d67'));
    out+=group('darkEdge',rect(0,0,W,20,'#171e29')+rect(0,0,W,3,'#545263'));
    out+=group('fold',rect(0,0,W,20,'#b7a88b')+path('M0 7Q114 14 240 7','#f2e8cc',2.6));
    out+=group('headband',rect(0,0,33,6,'#d3a979')+threadBands);
    out+=group('ribbon','<path d="M0 0h14v72l-7-7-7 7z" fill="#a51d39"/><path d="M3 0v62" stroke="#e35b70" stroke-width="1"/>');
    return out+'</defs>';
  }
  function geometry(kind, p, mx, my, id) {
    const hero=kind==='hero', yaw=(hero?.54:-.64)+(hero?.32*mx:0), pitch=(hero?.695:.72)+(hero?-.16*my:0);
    const lift=hero?phase(p,0,1):0;
    const scale=hero?1.33-.10*lift:1.08;
    const project=([x,y,z])=>{
      const depth=x*Math.sin(yaw)+z*Math.cos(yaw);
      return [320+scale*(x*Math.cos(yaw)-z*Math.sin(yaw)),(hero?226+44*lift:218)+scale*(depth*Math.sin(pitch)-y*Math.cos(pitch))];
    };
    const faces=[];
    function node(key,tag,attrs){faces.push({key,tag,attrs});}
    function flat(key,material,p0,p1,p2,width=W,height=D,opacity=1) {
      const a=project(p0),b=project(p1),c=project(p2);
      const matrix=[(b[0]-a[0])/width,(b[1]-a[1])/width,(c[0]-a[0])/height,(c[1]-a[1])/height,a[0],a[1]];
      node(key,'use',{href:'#'+id+'-'+material,transform:'matrix('+matrix.map(num).join(' ')+')',opacity:num(opacity)});
    }
    function line(key,points,color,width,opacity=1) {
      node(key,'path',{d:points.map((v,i)=>(i?'L':'M')+project(v).map(num).join(' ')).join(' '),fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round','stroke-linejoin':'round',opacity:num(opacity)});
    }
    function circle(key,pos,r,fill,opacity=1) {
      const c=project(pos);node(key,'circle',{cx:num(c[0]),cy:num(c[1]),r,fill,opacity:num(opacity)});
    }
    function pose(dx=0,dy=0,dz=0,angle=0) {
      const c=Math.cos(angle),s=Math.sin(angle);
      return (x,y,z)=>[dx+x*c-z*s,dy+y,dz+x*s+z*c];
    }
    function panel(key,space,width,depth,y,thick,top,edge,angle=0,opacity=1,pivot=-width/2) {
      const left=-width/2,right=width/2,back=-depth/2,front=depth/2;
      const c=Math.cos(angle),s=Math.sin(angle);
      function at(x,e,z){return space(pivot+(x-pivot)*c-e*s,y+(x-pivot)*s+e*c,z);}
      const ply = edge==='pagesEdge';
      flat(key+'-front',edge,at(left,0,front),at(right,0,front),at(left,-thick,front),W,20,opacity);
      if(hero) flat(key+'-side',ply?'pagesFore':edge,at(right,0,front),at(right,0,back),at(right,-thick,front),W,20,opacity);
      else flat(key+'-side',ply?'fold':edge,at(left,0,back),at(left,0,front),at(left,-thick,back),W,20,opacity);
      flat(key+'-face',top,at(left,0,back),at(right,0,back),at(left,0,front),W,D,opacity);
    }
    if(hero) {
      const table=pose(-3,-22,5,.10),lower=pose(-15,-7,17,.145),book=pose(9,21,-9,-.035);
      flat('shadow','shade',table(-156,0,-169),table(155,0,-169),table(-156,0,180));
      panel('base-board',lower,254,308,1,3,'lower','darkEdge');
      panel('base-block',lower,249,300,19,18,'text','pagesEdge');
      panel('base-lid',lower,254,308,23,4,'lower','darkEdge');
      panel('red-board',book,240,300,4,4,'jacket','redEdge');
      panel('volume',book,231,291,30,25,'text','pagesEdge');
      flat('headband','headband',book(-116,30,145),book(-96,30,145),book(-116,24,145),33,6);
      flat('bookmark','ribbon',book(15,15,144),book(29,15,144),book(15,5,201),14,72);
      const open=phase(p,0,.94);
      panel('folio-a',book,231,291,31.5,1.5,'text','pagesEdge',.011+open*.063);
      panel('folio-b',book,231,291,34,1.7,'text','pagesEdge',.021+open*.18);
      panel('endpaper',book,233,293,36,1.4,'fly','fold',.035+open*.31);
      panel('cover',book,240,300,40,4,'jacket','redEdge',.055+open*.78);
    } else {
      const gather=phase(p,0,.36), sew=phase(p,.32,.66), insert=phase(p,.61,.86), close=phase(p,.78,1);
      const table=pose(6,-14,8);
      flat('shade','shade',table(-145,0,-167),table(148,0,-167),table(-145,0,169));
      const casePart=pose(46*(1-insert),-7-13*(1-insert),25*(1-insert),.10*(1-insert));
      const caseAlpha=phase(p,.55,.78);
      panel('case-back',casePart,232,277,0,5,'inside','redEdge',0,caseAlpha);
      for(let i=0;i<6;i++) {
        const arrive=phase(gather,Math.max(0,(i-1)*.065),.61+i*.075);
        const drift=(1-arrive)*(i%2===0?-1:1);
        const section=pose((1-arrive)*(i-2.5)*24+drift*19,(1-insert)*13+(1-arrive)*i*10,drift*(18+i*3.3),drift*.17);
        panel('signature-'+i,section,220,264,3+i*4.6,4.1,i===5?'text':i%2?'plate':'paper','pagesEdge',i===5?.16*(1-gather):0);
      }
      const blockY=29+(1-insert)*13;
      const stations=[-104,-65,-26,13,52,91];
      for(let i=0;i<stations.length;i++){
        const z=stations[i], stitched=phase(sew,i/7,(i+1.55)/7);
        circle('hole-'+i,[-110,blockY-3,z],1.8,'#684132',gather*(1-close));
        const start=[-108,blockY-3,z],mid=[-115,blockY-12,z+7],end=[-110,blockY-14,z+26];
        const lerp=(a,b,t)=>a.map((v,k)=>v+(b[k]-v)*t);
        const bend=lerp(start,mid,Math.min(1,stitched*2));
        const curve=[start,bend,stitched<.5?bend:lerp(mid,end,stitched*2-1)];
        line('thread-'+i,curve,'#b42d4b',2.3,stitched*(1-close));
      }
      const needleZ=-111+235*sew;
      const needleAlpha=phase(p,.26,.36)*(1-phase(p,.61,.70));
      line('thread-tail',[[-111,blockY-3,needleZ],[-150,blockY+9,needleZ-12],[-166,blockY+4,needleZ-34]],'#d9a16c',2,needleAlpha);
      line('needle',[[-134,blockY+9,needleZ-6],[-101,blockY-5,needleZ+3]],'#c2d1d9',2.5,needleAlpha);
      line('needle-highlight',[[-131,blockY+10,needleZ-5],[-108,blockY-1,needleZ+1]],'#fff9ea',.8,needleAlpha);
      panel('endpaper',casePart,225,271,28,1.5,'fly','fold',.48*(1-insert),phase(p,.60,.80));
      const hingeAngle=1.33*(1-close)+.035*close;
      panel('jacket',casePart,232,277,33,4,'jacket','redEdge',hingeAngle,phase(p,.69,.82));
    }
    return faces;
  }
  const attrs = values=>Object.entries(values).map(([key,v])=>' '+key+'="'+v+'"').join('');
  const title = {hero:'Книга в твёрдом переплёте с приоткрывающейся крышкой, форзацем и ляссе',binding:'Ниткошвейный переплёт. Тетради складываются в блок, прошиваются по корешку и входят в крышку'};
  function svg(kind,id,progress=0,live=true) {
    const bounds=kind==='hero'?'0 -32 640 492':'60 0 520 405';
    const nodes=geometry(kind,progress,0,0,id).map(n=>'<'+n.tag+' data-part="'+n.key+'"'+attrs(n.attrs)+'/>').join('');
    return '<svg xmlns="'+NS+'" viewBox="'+bounds+'" class="'+(kind==='hero'?'book-art':'binding-art')+'" data-art-id="'+id+'"'+(live?' data-book-model="'+kind+'"':' aria-hidden="true"')+' role="img" aria-label="'+title[kind]+'">'+textures(id)+'<g data-faces>'+nodes+'</g></svg>';
  }
  function bind(svg) {
    const kind=svg.dataset.bookModel,id=svg.dataset.artId,parts=new Map();
    for(const node of svg.querySelector('[data-faces]').children) parts.set(node.dataset.part,node);
    let signature='';
    return function paint(progress=0,x=0,y=0){
      const next=[progress,x,y].map(v=>v.toFixed(4)).join(',');
      if(next===signature)return;
      signature=next;
      for (const item of geometry(kind,progress,x,y,id)) {
        const node=parts.get(item.key);
        for(const [key,value] of Object.entries(item.attrs)){
          const text=String(value);
          if(node.getAttribute(key)!==text)node.setAttribute(key,text);
        }
      }
    };
  }
  return {svg,bind};
});

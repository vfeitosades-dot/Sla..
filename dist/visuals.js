// Original, resolution-independent pixel silhouettes. All renderers preserve canvas state.
const ink = '#04050a';
const box = (c,x,y,w,h,color) => { c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h))); };
function shape(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();}
function halo(c,x,y,r,color){if(r<=0)return;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
function line(c,x1,y1,x2,y2,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(Math.round(x1)+.5,Math.round(y1)+.5);c.lineTo(Math.round(x2)+.5,Math.round(y2)+.5);c.stroke();}
function label(c,text,x,y,color='#e7dcff',size=7){c.font=`${size}px monospace`;c.textAlign='center';c.textBaseline='middle';const w=c.measureText(text).width;box(c,x-w/2-4,y-6,w+8,12,'#0a0b16e8');c.fillStyle=color;c.fillText(text,Math.round(x),Math.round(y));}
function diamond(c,x,y,r,color){shape(c,[[x,y-r],[x+r,y],[x,y+r],[x-r,y]],color);}
function rune(c,symbol,x,y,color,scale=1){
  if(/^I{1,3}$/.test(symbol||'')){const n=symbol.length;for(let i=0;i<n;i++)box(c,x+(i-(n-1)/2)*4*scale,y-4*scale,scale,8*scale,color);}
  else {diamond(c,x,y,4*scale,color);diamond(c,x,y,2*scale,'#151528');}
}

/** Animation states use physics fields; no visual state can change collision geometry. */
export function drawShadow(c,{x,y,scale=1,time=0,facing=1,alpha=1,color=null,vx=0,vy=0,grounded=true,dash=0,attack=0,invulnerable=0,land=0}={}){
  c.save();c.translate(Math.round(x+7*scale),Math.round(y+22*scale));c.scale(scale,scale);
  c.globalAlpha=Math.max(0,Math.min(1,alpha));
  const running=grounded&&Math.abs(vx)>10,frame=Math.floor(time*12)%6;
  const breathing=Math.sin(time*3.1)*.55;
  let sx=1,sy=1,lean=0;
  if(dash>0){sx=1.45;sy=.63;lean=facing*3;}
  else if(land>0){const k=Math.min(1,land/.13);sx=1+k*.2;sy=1-k*.15;}
  else if(!grounded){sy=vy<0?1.09:.94;sx=vy<0?.91:1.08;lean=facing*.6;}
  else if(running){lean=facing*1.1;sy=1+[0,.025,.045,0,-.035,-.015][frame];}
  c.scale(sx,sy);c.translate(lean,0);
  if(color)halo(c,0,-12,17,color+'35');
  if(dash>0){
    for(let i=0;i<4;i++)box(c,-facing*(12+i*6)-(facing<0?0:7),-17+i*4,7+i*2,2,['#8062aa65','#a386c255','#66517f45','#9f88b835'][i]);
  }
  const bob=grounded&&!running?breathing:0;
  const tail=running?Math.sin(frame/6*Math.PI*2)*2:Math.sin(time*4)*1.1;
  // Hood, drifting arms, and a changing cloth hem form one black silhouette.
  shape(c,[[-4,-21+bob],[-2,-24+bob],[2,-23+bob],[5,-20+bob],[6,-13],[7,-6],[9,-2],
    [5,-1],[3,-3+tail*.45],[1,0],[-2,-2-tail*.45],[-5,0],[-8,-3],[-6,-10],[-6,-18+bob]],ink);
  if(running){
    const feet=[[2,-2],[4,-1],[1,0],[-2,2],[-4,1],[-1,0]][frame];
    box(c,-5+feet[0],-2,4,2,ink);box(c,2-feet[0],-3+feet[1],4,3,ink);
    shape(c,[[-4,-12],[-facing*10,-9+tail],[-facing*8,-5+tail],[-3,-8]],ink);
  } else if(!grounded){shape(c,[[-5,-12],[-10,-8],[-8,-5],[-4,-8]],ink);shape(c,[[5,-12],[10,-9],[9,-6],[4,-9]],ink);}
  // A restrained rim keeps the requested black character readable on black scenery.
  box(c,-5,-17+bob,1,8,color||'#53415e');box(c,-4,-21+bob,2,1,'#45364f');box(c,5,-12,1,7,'#252032');
  if(invulnerable>0&&Math.floor(time*16)%2===0){box(c,-4,-20,8,1,'#9a81af');box(c,-6,-16,1,9,'#9a81af');}
  const blink=grounded&&!running&&attack<=0&&((time+1.3)%5.2)>.0&&((time+1.3)%5.2)<.12;
  const eyeY=-17+bob+(dash>0?1:0),eyeHeight=blink?1:dash>0?3:4;
  box(c,-4+facing*.65,eyeY,3,eyeHeight,'#ffffff');box(c,1+facing*.65,eyeY,3,eyeHeight,'#ffffff');
  if(attack>0){
    c.save();c.scale(facing,1);
    const phase=1-Math.min(1,attack/.2),a=-1.25+phase*2.3;
    c.translate(3,-11);c.rotate(a*.27);
    shape(c,[[7,-16],[18,-15],[29,-8],[35,2],[29,11],[17,16],[7,15],[18,10],[24,4],[23,-4],[17,-10]],'#b9a2de66');
    shape(c,[[16,-13],[27,-8],[33,2],[27,11],[16,14],[24,8],[28,2],[24,-6]],'#e6d8ff');
    box(c,8,-1,14,2,'#fffaff');c.restore();
  }
  c.restore();
}

export function drawMechanisms(c,level,camera,time,player){
  c.save();
  const viewport=c.canvas.width,p=level.puzzle||{},switches=level.switches||[],gates=level.gates||[];
  const nearby=player&&!player.dead?switches.filter(s=>Math.abs(player.x+7-s.x)<46&&Math.abs(player.y+22-s.y)<58).sort((a,b)=>Math.abs(player.x+7-a.x)-Math.abs(player.x+7-b.x))[0]:null;
  for(const gate of gates){
    const x=gate.x-camera,y=gate.y,w=gate.w,h=gate.h;if(x<-80||x>viewport+80)continue;
    box(c,x-5,y-6,w+10,7,'#5e5078');box(c,x-7,y+h-3,w+14,5,'#76638f');
    box(c,x-5,y,4,h,'#302c45');box(c,x+w+1,y,4,h,'#302c45');
    if(gate.open){
      box(c,x,y,w,4,'#b7e5ce');
      for(let i=0;i<4;i++){const yy=y+((time*19+i*27)%h);box(c,x-2,yy,1,3,'#a5d7cb77');box(c,x+w+2,yy+6,1,3,'#a5d7cb55');}
    }else{
      box(c,x,y,w,h,'#1a1a2b');
      for(let a=2;a<w;a+=5)box(c,x+a,y,2,h,'#73618f');
      for(let yy=y+15;yy<y+h;yy+=25){box(c,x,yy,w,2,'#a08bb9');diamond(c,x+w/2,yy-5,3,'#ceb4ec');}
      halo(c,x+w/2,y+h/2,24,'#9c70c221');
    }
  }
  for(const s of switches){
    const x=s.x-camera,y=s.y;if(x<-70||x>viewport+70)continue;
    const col=s.active?'#a6e4c5':'#c8afea',near=nearby===s;
    if(s.kind==='plate'){
      box(c,x-16,y-4,32,4,'#353448');box(c,x-13,y-(s.active?3:6),26,3,col);
      for(let i=0;i<3;i++)box(c,x-8+i*8,y-2,2,2,'#738f92');
      if(near&&!s.active)label(c,'PISE',x,y-20,col,6);
    }else{
      box(c,x-8,y-3,16,4,'#6c5c80');box(c,x-6,y-24,12,21,'#29273c');box(c,x-5,y-24,2,20,'#594b6c');
      box(c,x-8,y-26,16,4,'#68577d');
      if(s.kind==='lever'||s.kind==='timed'){
        line(c,x,y-14,x+(s.active?6:-6),y-25,col,2);box(c,x+(s.active?4:-8),y-28,5,4,col);
        if(s.kind==='timed'){box(c,x-3,y-13,6,1,col);box(c,x-3,y-7,6,1,col);shape(c,[[x-2,y-12],[x+2,y-12],[x,y-9]],col);}
        else diamond(c,x,y-10,3,col);
      }else rune(c,s.symbol,x,y-15,col);
      if(near){halo(c,x,y-17,20,'#b99cdc22');label(c,s.active&&s.kind==='rune'?'✓':matchMediaSafe()?'TOQUE ◇':'E · ATIVAR',x,y-41,col,6);}
    }
    if(s.active)halo(c,x,y-12,23,'#83d8b51a');
  }
  // Clues remain next to the puzzle, so learning the pattern never depends on a toast.
  if(switches.length&&p.sequence?.length){
    const x=switches[0].x-camera,y=switches[0].y-63;
    if(x>-100&&x<viewport+100){
      const width=p.sequence.length*22+12;box(c,x-width/2,y-11,width,22,'#13121fe8');
      line(c,x-width/2,y-12,x+width/2,y-12,'#75628a');
      p.sequence.forEach((symbol,i)=>rune(c,symbol,x+(i-(p.sequence.length-1)/2)*22,y,i<(p.progress||0)?'#b3e6ca':'#d6c0ed'));
    }
  }
  if(p.timer>0&&!p.solved){
    const s=switches.find(s=>s.kind==='timed'||s.kind==='plate')||switches[0];
    if(s){const x=s.x-camera;label(c,`${Math.ceil(p.timer)}s`,x,s.y-55,'#ffe0a2');const ratio=Math.min(1,p.timer/(p.duration||p.timer));box(c,x-20,s.y-47,40,2,'#3a3044');box(c,x-20,s.y-47,40*ratio,2,'#f0cc8b');}
  }
  c.restore();
}
function matchMediaSafe(){return typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches;}

function drawWarden(c,b,t){
  const walk=b.state==='attack'?Math.sin(t*20)*3:Math.sin(t*2.1);
  const pale=b.phase===2?'#f4b786':'#c3b8d5',body='#2c253d',edge='#74617f';
  shape(c,[[5,17],[27,17],[31,40],[24,43],[19,40],[14,44],[8,41],[1,43]],body);
  box(c,6+walk,39,8,9,'#352d43');box(c,20-walk,39,7,9,'#352d43');box(c,4+walk,46,11,2,edge);box(c,19-walk,46,11,2,edge);
  shape(c,[[5,9],[10,3],[22,3],[27,9],[24,23],[17,28],[8,23]],pale);
  shape(c,[[8,0],[12,-4],[13,5],[10,8]],edge);shape(c,[[22,0],[25,-3],[24,9],[21,7]],edge);
  box(c,9,12,4,3,'#1b1929');box(c,20,12,4,3,'#1b1929');box(c,15,18,3,5,'#4e3a54');
  for(let i=0;i<3;i++)line(c,9+i*6,27,8+i*7,38,edge);
  const arm=b.facing<0?-8:35;line(c,b.facing<0?4:28,25,arm,30,pale,4);line(c,arm,19,arm,44,edge,2);
  box(c,arm-6,17,12,3,edge);box(c,arm-5,20,10,12,'#523b4a');box(c,arm-2,22,4,8,'#ffdb9c');box(c,arm-6,32,12,3,edge);
  halo(c,arm,26,b.state==='telegraph'?31:19,b.state==='telegraph'?'#ffd28b70':'#edbf7730');
}
function drawWeaver(c,b,t){
  const flutter=Math.sin(t*(b.state==='attack'?17:5)),pale=b.phase===2?'#e9acb9':'#b6d3d4';
  for(const side of [-1,1]){
    const xx=20+side*16;
    shape(c,[[20,10],[xx+side*15,2+flutter*4],[xx+side*12,18],[xx+side*20,32-flutter*3],[xx,29],[20,35]],'#374354');
    line(c,20,17,xx+side*10,10+flutter*3,'#6f8e9e');line(c,20,22,xx+side*13,30-flutter*3,'#566f88');
    for(let j=0;j<3;j++){const yy=20+j*6;line(c,20+side*6,yy,xx+side*7,yy-3,pale);line(c,xx+side*7,yy-3,xx+side*11,yy+4+flutter,'#7ca7af');}
  }
  shape(c,[[15,11],[25,11],[30,30],[25,40],[20,35],[15,40],[10,29]],'#182637');
  shape(c,[[14,1],[20,-3],[26,1],[27,12],[20,18],[13,12]],pale);box(c,15,6,3,4,'#16202a');box(c,22,6,3,4,'#16202a');
  line(c,16,0,10,-9,'#84a8b0');line(c,24,0,30,-9,'#84a8b0');diamond(c,10,-9,2,'#cee8d9');diamond(c,30,-9,2,'#cee8d9');
  for(let j=0;j<4;j++){const yy=19+j*4;box(c,19,yy,2,2,j%2?pale:'#7e99b2');}
  if(b.state==='telegraph')for(let i=0;i<5;i++){const a=t*2+i*1.256;diamond(c,20+Math.cos(a)*29,19+Math.sin(a)*23,2,'#bbefef');}
}
function drawSovereign(c,b,t){
  const wave=Math.sin(t*3),pale=b.phase===2?'#ffcb9c':'#ddd0e9';
  for(let i=0;i<8;i++){const a=i*Math.PI/4+t*.15;line(c,18+Math.cos(a)*24,7+Math.sin(a)*24,18+Math.cos(a)*28,7+Math.sin(a)*28,'#ad7e8655');}
  shape(c,[[10,20],[26,20],[32,36],[36,53],[26,49],[18,54],[10,49],[0,53],[4,36]],'#312337');
  shape(c,[[10,24],[18,29],[26,24],[29,44],[18,50],[7,44]],'#4e344b');
  line(c,18,30,18,47,'#ba8596');for(let j=0;j<3;j++){line(c,9+j,33+j*4,16,36+j*4,'#8b5a70');line(c,27-j,33+j*4,20,36+j*4,'#8b5a70');}
  shape(c,[[8,0],[12,6],[18,-3],[24,6],[29,0],[27,17],[20,25],[13,22],[7,13]],pale);
  shape(c,[[10,8],[16,10],[15,14],[10,12]],'#231627');shape(c,[[20,10],[26,8],[26,12],[21,14]],'#231627');
  box(c,17,16,2,5,'#735065');diamond(c,18,3,3,'#f6bd84');
  for(const side of [-1,1]){line(c,18+side*12,27,18+side*24,34+wave,pale,3);line(c,18+side*24,34+wave,18+side*29,29+wave,pale,2);}
  if(b.state==='telegraph'){halo(c,18,9,43,'#f4a86735');for(let i=0;i<4;i++)diamond(c,18+Math.cos(t*3+i*1.57)*35,12+Math.sin(t*3+i*1.57)*23,2,'#ffcf8f');}
}

export function drawBoss(c,boss,hazards=[],camera=0,time=0){
  c.save();
  for(const h of hazards){
    const x=h.x-camera,y=h.y,w=h.w||8,hh=h.h||8,warming=h.warmup>0;if(x+w<-40||x>c.canvas.width+40)continue;
    if(warming){
      box(c,x,y,w,hh,'#e9b87914');line(c,x,y,x,y+hh,'#eac19377');line(c,x+w,y,x+w,y+hh,'#eac19377');
      for(let yy=y;yy<y+hh;yy+=12)box(c,x+w/2-1,yy+(time*12%8),2,3,'#ffdba188');
      diamond(c,x+w/2,y+hh-6,4,'#ffdfac');
    }else if(h.type==='beam'){
      halo(c,x+w/2,y+hh*.55,40,'#f7b67555');box(c,x-3,y,w+6,hh,'#ed95623b');box(c,x,y,w,hh,'#eeb58c');box(c,x+w*.3,y,w*.4,hh,'#fff1d2');
      for(let j=0;j<5;j++)box(c,x-5+(j%2)*(w+8),y+((time*160+j*47)%hh),2,8,'#ffddb6');
    }else if(h.type==='wave'){
      shape(c,[[x,y+hh],[x+w*.15,y+hh*.4],[x+w*.45,y],[x+w*.7,y+hh*.6],[x+w,y+hh]],'#edbf9a');
      shape(c,[[x+w*.25,y+hh],[x+w*.45,y+4],[x+w*.65,y+hh]],'#fff0ce');
    }else{
      halo(c,x+w/2,y+hh/2,16,'#dcb7ec45');diamond(c,x+w/2,y+hh/2,Math.max(w,hh)*.6,'#dbbde9');box(c,x+w*.3,y+hh*.3,w*.4,hh*.4,'#fff1ff');
      const direction=Math.sign(h.vx||1);for(let i=1;i<4;i++)box(c,x+w/2-direction*i*4,y+hh/2-1,2,2,'#c897d660');
    }
  }
  const b=boss;if(!b){c.restore();return;}
  const x=b.x-camera;if(x+b.w<-100||x>c.canvas.width+100){c.restore();return;}
  if(b.state==='telegraph'&&b.attackType==='charge'){
    const end=x+b.facing*170;line(c,x+b.w/2,b.y+b.h-1,end,b.y+b.h-1,'#edc08c88',2);
    shape(c,[[end,b.y+b.h-1],[end-b.facing*8,b.y+b.h-5],[end-b.facing*8,b.y+b.h+3]],'#f5d29f');
  }
  c.translate(Math.round(x),Math.round(b.y));
  if(b.state==='defeated'){c.globalAlpha=.28;box(c,1,b.h-5,b.w-2,5,'#83708d');diamond(c,b.w/2,b.h-14+Math.sin(time*2),6,'#d0b9e6');c.restore();return;}
  if(b.active===false)c.globalAlpha=.65;
  box(c,-4,b.h-2,b.w+8,3,'#04061166');
  if(b.kind==='weaver'){c.translate(0,Math.round(Math.sin(time*3)*2));drawWeaver(c,b,time);}
  else if(b.kind==='sovereign')drawSovereign(c,b,time);
  else drawWarden(c,b,time);
  if(b.state==='recover'){for(let i=0;i<3;i++){const a=time*4+i*2.094;diamond(c,b.w/2+Math.cos(a)*16,-10+Math.sin(a)*4,1,'#bed7d4');}}
  if(b.state==='telegraph'){label(c,({charge:'INVESTIDA',volley:'RAJADA',slam:'IMPACTO',beam:'LUZ'})[b.attackType]||'CUIDADO',b.w/2,-22,'#f6c68f',6);}
  c.restore();
}

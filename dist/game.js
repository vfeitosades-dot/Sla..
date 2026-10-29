import {makeLevel,makePlayer,stepPlayer,lampPosition,inLight,LEVEL_NAMES,validateState} from './core.js';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false});
const GAME_VERSION=1;
let W=640,H=360,mode='menu',level=makeLevel(0),player=makePlayer(level.spawn),camera=0,simTime=0,ambientTime=0,last=0,acc=0,playTime=0,deaths=0,checkpoint=level.spawn,checkpointIndex=-1,gems=new Set(),particles=[],trails=[],toastUntil=0,netElapsed=0,pausedByModal=false;
let respawnDelay=0;
let remote=null,remoteTarget=null,remoteSeen=0,peer=null,conn=null,isHost=false,roomCode='',networkTimer=0,netEpoch=0,netReady=false,stageComplete=false;
const input={left:false,right:false,jump:false,dash:false,holdJump:false},held=new Set();
let stored={unlocked:0,best:0,sound:false};try{stored={...stored,...JSON.parse(localStorage.getItem('umbra-save')||'{}')};}catch{}
function save(){try{localStorage.setItem('umbra-save',JSON.stringify(stored));}catch{}}
const palettes=[['#100e22','#201834','#332343','#53405f','#887094','#c6a8df'],['#0d1723','#1b2938','#2b3d4a','#43606b','#6d8d90','#b2d5ca'],['#1a1020','#2a1b33','#42253f','#68465a','#a37c8d','#e0b2bc']];
const rand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
function poly(points,c){ctx.fillStyle=c;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)));ctx.closePath();ctx.fill();}
function glow(x,y,r,color){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function resize(){const box=canvas.getBoundingClientRect();H=document.body.classList.contains('in-game')&&matchMedia('(pointer:coarse)').matches?270:360;W=Math.max(240,Math.min(960,Math.round(box.width/box.height*H)));canvas.width=W;canvas.height=H;ctx.imageSmoothingEnabled=false;}
new ResizeObserver(resize).observe($('game-frame'));resize();
function branch(x,y,len,angle,width,depth,color,seed){if(depth<0||len<4)return;const ex=x+Math.cos(angle)*len,ey=y+Math.sin(angle)*len;const nx=Math.sin(angle)*width*.5,ny=-Math.cos(angle)*width*.5;poly([[x+nx,y+ny],[ex+nx*.5,ey+ny*.5],[ex-nx*.5,ey-ny*.5],[x-nx,y-ny]],color);branch(ex,ey,len*.72,angle-.38-rand(seed)*.3,width*.68,depth-1,color,seed+3);branch(ex,ey,len*.62,angle+.4+rand(seed+2)*.35,width*.6,depth-1,color,seed+6);}
function pine(x,y,size,color){rect(x-3*size,y-65*size,6*size,66*size,color);for(let j=0;j<4;j++){const py=y-90*size+j*17*size;poly([[x,py],[x-(15+j*5)*size,py+40*size],[x+(14+j*5)*size,py+40*size]],color);}}
function foliage(x,y,w,color,seed){for(let k=0;k<12;k++){const bx=x+(rand(seed+k)-.5)*w,by=y+(rand(seed+k+31)-.5)*w*.3;rect(bx,by,14+rand(seed+k+18)*26,6+rand(seed+k+14)*13,color);}}
function background(cam,t,palette=palettes[level.index],menu=false){
  rect(0,0,W,360,palette[0]);
  for(let y=0;y<260;y+=6){const a=Math.round(12+17*y/260).toString(16).padStart(2,'0');rect(0,y,W,6,palette[2]+a);}
  for(let i=0;i<100;i++){const x=((rand(i+50)*1700-cam*.06)%(W+30)+W+30)%(W+30);const y=rand(i+80)*175;const twinkle=.35+(.5+.5*Math.sin(t*.9+i))*.45;ctx.globalAlpha=twinkle;rect(x,y,i%17===0?2:1,i%17===0?2:1,i%4===0?'#b5a2cf':'#81718e');}ctx.globalAlpha=1;
  const mx=menu?W*.76:W*.77-cam*.025,my=73;
  glow(mx,my,90,palette[4]+'17');ctx.fillStyle=palette[4]+'55';ctx.beginPath();ctx.arc(mx,my,34,0,Math.PI*2);ctx.fill();ctx.fillStyle=palette[5];ctx.beginPath();ctx.arc(mx,my,29,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.17;for(let i=0;i<17;i++)rect(mx-22+rand(i+100)*42,my-22+rand(i+230)*42,4+rand(i)*7,3+rand(i+3)*6,palette[2]);ctx.globalAlpha=1;
  for(let i=0;i<6;i++){const cx=((i*173+t*1.5-cam*.08)%(W+250)+W+250)%(W+250)-130;foliage(cx,52+i%3*36,125,palette[2]+'55',i+40);}
  for(let layer=0;layer<3;layer++){
    const par=.12+layer*.14,spacing=layer===0?70:125,base=250+layer*23;
    for(let i=Math.floor(cam*par/spacing)-2;i<(cam*par+W)/spacing+2;i++){
      const x=i*spacing-cam*par+rand(i+layer*82)*40,sz=.55+layer*.23+rand(i+19)*.35,col=palette[layer+1];
      if(layer<2)pine(x,base+rand(i+31)*20,sz,col);
      else{branch(x,base+30,80+rand(i+13)*80,-Math.PI/2,.8*sz+12,4,col,i+31);foliage(x-22,base-130,70,col,i+21);foliage(x+20,base-80,80,col,i+7);}
    }
  }
  const towerX=1460-cam*.3;if(towerX>-100&&towerX<W+200){rect(towerX,130,48,170,palette[2]);rect(towerX-5,127,58,8,palette[3]);for(let i=0;i<4;i++)rect(towerX+i*14,113,8,20,palette[2]);rect(towerX+17,162,14,26,palette[0]);rect(towerX+19,210,12,21,palette[0]);}
  for(let i=0;i<4;i++){ctx.globalAlpha=.035;rect(0,230+i*18,W,10+i*8,palette[5]);}ctx.globalAlpha=1;
  for(let i=0;i<36;i++){const fx=((rand(i+400)*W*2+t*(2+i%3)-cam*.2)%(W+30)+W+30)%(W+30),fy=130+rand(i+100)*180+Math.sin(t*.7+i)*10;ctx.globalAlpha=.2+Math.sin(t+i)*.15;rect(fx,fy,i%3?1:2,1,palette[5]);}ctx.globalAlpha=1;
}
function platform(s,p=palettes[level.index],seed=0){const x=Math.floor(s.x-camera),y=s.y;if(x+s.w<0||x>W)return;
  rect(x,y,s.w,s.h,'#100e1b');rect(x,y,s.w,3,p[4]);rect(x,y+3,s.w,4,p[3]);rect(x,y+7,s.w,4,p[2]);
  for(let a=0;a<s.w;a+=12){const r=rand(seed+a);rect(x+a,y-2-r*3,5+r*6,3+r*3,p[3]);if(r>.5)rect(x+a+2,y-5-r*5,2,7,p[4]);if(s.h>20){for(let b=16;b<62;b+=13){rect(x+a+rand(a+b)*5,y+b,3+rand(a+b+7)*7,2,p[2]);}}}
  if(s.h<20){for(let a=5;a<s.w;a+=17){const len=6+rand(a+seed)*12;rect(x+a,y+s.h,3,len,p[1]);rect(x+a+2,y+s.h,2,len*.5,p[2]);}}
}
function plant(x,y,t,seed,p=palettes[level.index]){x-=camera;if(x<-30||x>W+30)return;const h=9+rand(seed)*16;rect(x,y-h,2,h,p[3]);for(let j=0;j<3;j++){rect(x-4-j,y-h+j*5,5,2,p[3]);rect(x+2,y-h+2+j*5,5,2,p[4]+'88');}if(seed%3===0){glow(x,y-h,12,'#ba85e523');rect(x-3,y-h-3,8,3,p[4]);rect(x-1,y-h-5,4,2,p[5]);}}
function ghost(x,y,scale=1,t=0,facing=1,color=null,alpha=1,moving=false){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(scale,scale);ctx.globalAlpha=alpha;
  const b=Math.sin(t*3)*.65;const fill='#05060b';
  if(color){ctx.shadowBlur=8;ctx.shadowColor=color;}
  poly([[3,0+b],[5,-2+b],[10,0+b],[12,3+b],[13,11],[15,17],[13,21],[10,20],[8,22],[5,20],[2,22],[-1,18],[1,11],[1,4+b]],fill);
  ctx.shadowBlur=0;rect(2,4+b,1,9,'#1e1830');rect(11,7+b,1,8,'#13101d');
  const blink=Math.sin(t*.6)> .994;const eyeY=6+b,eh=blink?1:4;rect(3+facing*.6,eyeY,3,eh,'#f9f4ff');rect(8+facing*.6,eyeY,3,eh,'#f9f4ff');
  if(moving){rect(2,20+Math.sin(t*18)*1.2,3,2,fill);rect(9,20-Math.sin(t*18)*1.2,3,2,fill);}
  ctx.restore();
}
function crystal(x,y,t,taken=false){if(taken)return;const yy=y+Math.sin(t*2.5+x)*2;glow(x,yy,17,'#b67ce43f');poly([[x,yy-6],[x+5,yy],[x,yy+7],[x-5,yy]],'#bfa0ed');poly([[x,yy-6],[x,yy+5],[x-4,yy]],'#e5caff');rect(x-1,yy-3,1,3,'#fff5ff');}
function portal(x,y,t,open){const p=palettes[level.index];x-=camera;if(x<-70||x>W+70)return;
  glow(x,y-28,65,open?'#c791f038':'#9180a019');
  rect(x-29,y-56,10,57,p[2]);rect(x+19,y-56,10,57,p[2]);rect(x-24,y-62,48,9,p[3]);rect(x-16,y-68,32,8,p[3]);rect(x-32,y-3,64,8,p[3]);rect(x-26,y-56,3,54,p[4]);rect(x+20,y-55,3,53,p[4]);
  if(open){for(let i=0;i<10;i++){ctx.globalAlpha=.06+i*.017;rect(x-18+i,y-55+i,36-i*2,54-i*2,p[5]);}ctx.globalAlpha=1;for(let i=0;i<14;i++){const a=t*.6+i*.45;rect(x+Math.sin(a)*14,y-28+Math.cos(a)*22,1,2,'#e5c8ff');}}
  else{rect(x-13,y-50,26,47,'#171121');for(let i=0;i<6;i++)rect(x-14+i*5,y-14,2,3,gems.has(i)?'#cda4ec':'#44304f');}
}
function drawLights(t){for(const light of level.lights){const l=lampPosition(light,t),x=l.x-camera;if(x+l.r<-20||x-l.r>W+20)continue;
    // Cast light in narrow columns, clipping each ray at the first platform.
    for(let offset=-l.r;offset<=l.r;offset+=3){let endY=306;for(const s of level.platforms){if(s.y<=l.y||s.y>=endY)continue;const at=l.x+offset*(s.y-l.y)/(306-l.y);if(at>=s.x&&at<=s.x+s.w)endY=s.y;}
      const endX=x+offset*(endY-l.y)/(306-l.y);const edge=1-Math.abs(offset)/l.r;poly([[x-1,l.y],[endX-2,endY],[endX+2,endY],[x+1,l.y]],`rgba(249,204,139,${.035+edge*.033})`);}
    glow(x,l.y,24,'#f7bd6c30');rect(x-1,0,1,l.y-7,'#483644');rect(x-5,l.y-8,10,2,'#8d7666');rect(x-4,l.y-6,8,9,'#46303c');rect(x-2,l.y-5,4,7,'#ebc585');rect(x-5,l.y+3,10,2,'#806557');
  }}
function drawMenu(t){const p=palettes[0];camera=0;background(0,t,p,true);
  const base=314;platform({x:0,y:base,w:W*.46,h:60},p,14);platform({x:W*.53,y:base-7,w:W*.5,h:70},p,71);
  const island={x:W*.59,y:249,w:W*.22,h:20};platform(island,p,43);plant(W*.63,249,t,3);plant(W*.78,249,t,9);plant(W*.91,307,t,21);
  const lx=W*.44,ly=128;poly([[lx,ly],[lx-56,314],[lx+64,314]],'#d8b4760e');glow(lx,ly,24,'#e1b97630');rect(lx-1,0,1,ly-4,'#5c455a');rect(lx-4,ly-5,8,10,'#d8b88c');rect(lx-6,ly-8,12,3,'#85687a');
  glow(W*.69,244,45,'#b295d329');ghost(W*.69,217,1.5,t,1,null,1);crystal(W*.80,219,t);
  const oldCam=camera;camera=0;portal(W*.9,307,t,false);camera=oldCam;
  // Dark foreground silhouettes make the forest feel deeper.
  branch(W+12,365,154,-Math.PI/2,27,4,'#0b0c16',44);branch(-11,364,165,-Math.PI/2,26,4,'#0b0c16',21);
  for(let i=0;i<14;i++)plant(i*W/13,356,t,17+i*4,p);
}
function draw(t){
  if(mode==='menu'||mode==='lobby'){drawMenu(t);return;}
  ctx.save();ctx.translate(0,H-360);
  const target=Math.max(0,Math.min(level.width-W,player.x-W*.42));camera+=(target-camera)*Math.min(1,8/60);
  background(camera,t);level.platforms.forEach((s,i)=>platform(s,palettes[level.index],i*29));
  for(let i=0;i<50;i++){const x=i*63+rand(i+10)*18;if(!level.platforms.some(s=>s.y===306&&x>=s.x&&x<s.x+s.w))continue;plant(x,306,t,i*3);}
  for(const s of level.spikes){for(let i=0;i<s.w;i+=7)poly([[s.x+i-camera,s.y+7],[s.x+i+3-camera,s.y-2],[s.x+i+7-camera,s.y+7]],'#a489a5');}
  level.checkpoints.forEach((c,i)=>{const x=c.x-camera;if(x<0||x>W)return;rect(x-5,c.y-15,10,15,'#3c304b');rect(x-3,c.y-18,6,5,i<=checkpointIndex?'#b5d2bd':'#625073');if(i<=checkpointIndex)glow(x,c.y-18,20,'#91bca332');});
  drawLights(simTime);level.gems.forEach((g,i)=>crystal(g.x-camera,g.y,t,gems.has(i)));portal(level.portal.x,level.portal.y,t,gems.size===6);
  for(const tr of trails)ghost(tr.x-camera,tr.y,1,t,tr.facing,null,tr.life*1.4);
  if(remote&&netReady){ghost(remote.x-camera,remote.y,1,t,remote.facing,'#8abfb2',.82,Math.abs(remote.vx||0)>1);rect(remote.x-camera-4,remote.y-10,22,1,'#91c1b8');ctx.fillStyle='#b6e1d2';ctx.font='6px monospace';ctx.textAlign='center';ctx.fillText('AMIGO',remote.x-camera+7,remote.y-13);}
  if(!player.dead){if(player.inLight&&player.invulnerable<=0)glow(player.x-camera+7,player.y+12,24,'#e2925a30');ghost(player.x-camera,player.y,1,t,player.facing,null,player.invulnerable>0&&Math.floor(t*14)%2?.45:1,Math.abs(player.vx)>0);}
  for(const p of particles){ctx.globalAlpha=Math.min(1,p.life*2);rect(p.x-camera,p.y,p.size,p.size,p.color);}ctx.globalAlpha=1;
  if(player.health<30&&!player.dead){ctx.fillStyle=`rgba(157,46,69,${.05+Math.sin(t*6)*.025})`;ctx.fillRect(0,0,W,360);}
  ctx.restore();
}
function emit(x,y,color,n=12,speed=45){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=Math.random()*speed;particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-12,life:.45+Math.random()*.6,size:Math.random()>.7?2:1,color});}}
function toast(text,duration=3){$('toast').textContent=text;$('toast').classList.remove('hidden');toastUntil=ambientTime+duration;}
let audioCtx=null,soundEnabled=!!stored.sound,nextNote=0;
function tone(freq=.0,duration=.2,type='sine',volume=.035,slide=0){if(!soundEnabled)return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,audioCtx.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(slide,audioCtx.currentTime+duration);g.gain.setValueAtTime(0,audioCtx.currentTime);g.gain.linearRampToValueAtTime(volume,audioCtx.currentTime+.015);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}catch{}}
function sfx(name){if(name==='jump')tone(175,.18,'triangle',.035,410);if(name==='dash')tone(180,.25,'sawtooth',.018,40);if(name==='gem'){tone(658,.28,'sine',.055);setTimeout(()=>tone(988,.4,'sine',.04),90);}if(name==='hurt'||name==='death')tone(115,.4,'triangle',.055,33);if(name==='checkpoint')tone(440,.6,'sine',.05,660);}
function syncSound(){ $('audio').innerHTML=soundEnabled?'♫':'♫<span class="sound-off">×</span>';$('audio').setAttribute('aria-label',soundEnabled?'Desativar som':'Ativar som');$('audio').title=soundEnabled?'Desativar som':'Ativar som';}
$('audio').onclick=()=>{soundEnabled=!soundEnabled;stored.sound=soundEnabled;save();syncSound();if(soundEnabled)tone(220,.4);};syncSound();
function showGame(){['menu','scene-label','hero-caption'].forEach(id=>$(id).classList.add('hidden'));['hud','game-hint','dash-meter','touch-controls'].forEach(id=>$(id).classList.remove('hidden'));$('game-frame').classList.add('playing');document.body.classList.add('in-game');resize();canvas.focus();}
function resetLevel(index,resetClock=true){level=makeLevel(index);player=makePlayer(level.spawn);checkpoint={...level.spawn};checkpointIndex=-1;gems=new Set();particles=[];trails=[];camera=0;stageComplete=false;respawnDelay=0;remoteSeen=ambientTime;if(resetClock)simTime=0;remote=null;remoteTarget=null;$('stage-label').textContent=`0${index+1} · ${LEVEL_NAMES[index].toUpperCase()}`;$('game-hint').textContent=index===0?'Encontre os 6 fragmentos e alcance o portal.':'Use as plataformas para se abrigar da luz.';}
function startSolo(index=0){disconnect();closeModal(false);playTime=0;deaths=0;resetLevel(index);mode='playing';showGame();toast(matchMedia('(pointer:coarse)').matches?'Esquerda: mover · Seta para cima: pular · Seta dupla: impulso':'A / D para andar · Espaço para pular · Shift para impulso',4);tone(220,.6);}
function home(){disconnect();mode='menu';level=makeLevel(0);closeModal(false);['menu','scene-label','hero-caption'].forEach(id=>$(id).classList.remove('hidden'));['hud','game-hint','dash-meter','touch-controls'].forEach(id=>$(id).classList.add('hidden'));$('game-frame').classList.remove('playing');document.body.classList.remove('in-game');resize();$('toast').classList.add('hidden');clearInput();}
function tick(dt){
  if(mode!=='playing')return;
  simTime+=dt;playTime+=dt;const events=stepPlayer(player,input,dt,level,simTime);input.jump=false;input.dash=false;
  for(const e of events){sfx(e);if(e==='dash')emit(player.x+7,player.y+12,'#a58acd',10,30);if(e==='hurt')emit(player.x+7,player.y+10,'#efab79',18,60);if(e==='death'){deaths++;emit(player.x+7,player.y+10,'#b28fc8',35,80);respawnDelay=.9;}}
  if(player.dead){respawnDelay-=dt;if(respawnDelay<=0){player=makePlayer(checkpoint);player.invulnerable=1;toast('A sombra sempre encontra um jeito de voltar.',2);}}
  if(player.dash>0)trails.push({x:player.x,y:player.y,facing:player.facing,life:.28});
  if(player.inLight&&!player.dead&&Math.random()<.35)emit(player.x+7,player.y+5,'#dca26d',1,15);
  if(!player.dead){level.gems.forEach((g,i)=>{if(!gems.has(i)&&Math.abs(player.x+7-g.x)<15&&Math.abs(player.y+11-g.y)<21){gems.add(i);emit(g.x,g.y,'#dcc0ff',20);sfx('gem');send({type:'gem',index:i,level:level.index,epoch:netEpoch});if(gems.size===6)toast('O portal despertou. Siga para a direita!');}});
    level.checkpoints.forEach((c,i)=>{if(i>checkpointIndex&&Math.abs(player.x-c.x)<22&&player.grounded&&player.y>260){checkpointIndex=i;checkpoint={x:c.x,y:c.y-22};sfx('checkpoint');toast('Refúgio encontrado · progresso protegido',2);emit(c.x,c.y-20,'#b2ddc5',20);}});
    if(gems.size===6&&Math.abs(player.x-level.portal.x)<23&&player.y>250){if(!netReady||isHost)complete();else toast('Aguardando seu amigo chegar ao portal.',2);}
  }
  if(remoteTarget){if(!remote)remote={...remoteTarget};const blend=1-Math.exp(-dt*18);remote.x+=(remoteTarget.x-remote.x)*blend;remote.y+=(remoteTarget.y-remote.y)*blend;remote.facing=remoteTarget.facing;remote.vx=remoteTarget.vx;}
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=45*dt;p.life-=dt;}particles=particles.filter(p=>p.life>0);for(const tr of trails)tr.life-=dt;trails=trails.filter(tr=>tr.life>0);
  netElapsed+=dt;if(netReady&&netElapsed>.05){netElapsed=0;send({type:'state',level:level.index,epoch:netEpoch,x:player.x,y:player.y,health:player.health,facing:player.facing,vx:player.vx,t:simTime,gems:[...gems]});if(ambientTime-remoteSeen>12){toast('Seu amigo perdeu a conexão. Você pode continuar solo.',5);disconnect();}}
}
function hud(){const h=Math.ceil(player.health);$('health-number').textContent=h+'%';$('health-fill').style.width=h+'%';$('health-fill').classList.toggle('danger',player.inLight);$('shade-status').textContent=player.dead?'○ Reunindo sua essência…':player.inLight?'☼ Na luz · perdendo essência':h===100?'● Nas sombras · protegido':'● Nas sombras · recuperando';$('shade-status').style.color=player.inLight?'#edb17d':'#a6c4b7';$('crystals').textContent=`◇ ${gems.size} / 6`;$('dash-fill').style.width=(1-player.cooldown/1.65)*100+'%';$('partner-status').textContent=netReady?'● DUPLA CONECTADA':'';}
function loop(ms){const dt=Math.min((ms-last)/1000||0,.1);last=ms;ambientTime+=dt;acc+=dt;let steps=0;while(acc>=1/60&&steps<6){tick(1/60);acc-=1/60;steps++;}if(steps===6)acc=0;draw(ambientTime);if(mode==='playing')hud();if(toastUntil&&ambientTime>toastUntil){$('toast').classList.add('hidden');toastUntil=0;}if(soundEnabled&&ambientTime>nextNote){const notes=[110,164.81,146.83,130.81,220];tone(notes[Math.floor(ambientTime/7)%5],5,'sine',.015);tone(notes[Math.floor(ambientTime/7)%5]*2,4,'sine',.008);nextNote=ambientTime+6;}requestAnimationFrame(loop);}
requestAnimationFrame(loop);
function clearInput(){held.clear();input.left=false;input.right=false;input.jump=false;input.dash=false;input.holdJump=false;document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('active'));}
window.addEventListener('keydown',e=>{if(e.target.matches('input'))return;if(['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyD','KeyW','ShiftLeft','ShiftRight','Escape','KeyP'].includes(e.code))e.preventDefault();if(e.code==='Escape'||e.code==='KeyP'){if($('modal').open)closeModal();else if(mode==='playing')pause();return;}if(mode!=='playing')return;if(e.code==='KeyA'||e.code==='ArrowLeft')input.left=true;if(e.code==='KeyD'||e.code==='ArrowRight')input.right=true;if(['Space','KeyW','ArrowUp'].includes(e.code)){if(!held.has(e.code))input.jump=true;input.holdJump=true;}if(e.code.startsWith('Shift')&&!held.has(e.code))input.dash=true;held.add(e.code);});
window.addEventListener('keyup',e=>{held.delete(e.code);input.left=held.has('KeyA')||held.has('ArrowLeft');input.right=held.has('KeyD')||held.has('ArrowRight');input.holdJump=held.has('Space')||held.has('KeyW')||held.has('ArrowUp');});
window.addEventListener('blur',()=>{clearInput();if(mode==='playing'&&!netReady)pause();});
document.addEventListener('visibilitychange',()=>{clearInput();if(document.hidden&&mode==='playing'&&!netReady)pause();});
document.querySelectorAll('[data-control]').forEach(button=>{const c=button.dataset.control;const release=e=>{if(e)e.preventDefault();button.classList.remove('active');if(c==='left'||c==='right')input[c]=false;if(c==='jump')input.holdJump=false;};button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);button.classList.add('active');input[c]=true;if(c==='jump')input.holdJump=true;});button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);});
function openModal(html,pauseGame=true){pausedByModal=mode==='playing'&&!netReady&&pauseGame;if(pausedByModal)mode='paused';clearInput();$('modal-content').innerHTML=html;if(!$('modal').open)$('modal').showModal();}
function closeModal(resume=true){$('modal').close();if(resume&&pausedByModal)mode='playing';pausedByModal=false;canvas.focus();}
$('close-modal').onclick=()=>{if(mode==='lobby'||mode==='complete'){disconnect();home();}else closeModal();};$('modal').addEventListener('cancel',e=>{e.preventDefault();$('close-modal').click();});
function pause(){openModal(`<span class="kicker">UM INSTANTE NAS SOMBRAS</span><h2>${netReady?'Respire.':'Pausa.'}</h2><p>${netReady?'A partida online continua enquanto este menu está aberto.':'Seu caminho espera por você. Descanse o tempo que precisar.'}</p><button class="primary" id="resume">CONTINUAR <span>→</span></button><button class="secondary" id="restart">VOLTAR AO REFÚGIO</button><button class="secondary" id="exit">SAIR PARA O MENU</button>`);$('resume').onclick=()=>closeModal();$('restart').onclick=()=>{player=makePlayer(checkpoint);player.invulnerable=1;closeModal();};$('exit').onclick=home;}
function help(){openModal('<span class="kicker">ENCONTRE SEU RITMO</span><h2>Como jogar</h2><p>Você é uma sombra. A luz consome sua essência; a escuridão recupera sua vida. Plataformas bloqueiam os feixes e criam abrigos.</p><div class="controls-list"><span>Mover</span><span><kbd>A</kbd> <kbd>D</kbd> ou <kbd>←</kbd> <kbd>→</kbd></span><span>Pular · segure para ir mais alto</span><kbd>ESPAÇO</kbd><span>Impulso · atravesse a luz</span><kbd>SHIFT</kbd><span>Pausar</span><kbd>ESC</kbd></div><p>No celular, use os botões na tela. Recomendamos jogar na horizontal. Colete os 6 fragmentos de cada fase e entre no portal. Os obeliscos guardam seu ponto de retorno.</p><p>No cooperativo, os fragmentos são compartilhados. O criador da sala conduz a passagem entre fases.</p>');}
function world(){openModal('<span class="kicker">O UNIVERSO DE UMBRA</span><h2>Um lugar<br>para pertencer.</h2><p>Quando o último sol se apagou, as sombras ganharam vida. Mas as antigas lanternas continuam acesas, procurando o que restou da noite.</p><p>Você é uma delas: pequena, curiosa e feita de escuridão. Reúna os fragmentos do eclipse e encontre um caminho de volta para casa.</p><div class="controls-list"><span>01</span><span>Floresta do silêncio</span><span>02</span><span>Ruínas do crepúsculo</span><span>03</span><span>O último eclipse</span></div><p>Arte em pixels e sons sintetizados criados para esta aventura.</p>');}
function about(){openModal('<span class="kicker">UMBRA · VERSÃO 1.0</span><h2>Além da luz.</h2><p>Aplicativo para Windows e Android. O modo solo funciona sem internet. O cooperativo conecta dois jogadores por WebRTC com sinalização PeerJS.</p><p>Algumas redes móveis, empresariais ou com NAT restritivo podem impedir a conexão direta. Se isso acontecer, tente outra rede. Não há chat, anúncios ou compras no jogo.</p><p>Seus recordes são salvos neste aparelho. Use a mesma versão do jogo nos dois dispositivos.</p>');}
$('play').onclick=()=>{if(stored.unlocked>0){openModal(`<span class="kicker">SEU CAMINHO CONTINUA</span><h2>Voltar à noite</h2><p>Você chegou à fase ${Math.min(3,stored.unlocked+1)}. Continue de lá ou comece uma nova jornada.</p><button class="primary" id="continue">CONTINUAR</button><button class="secondary" id="new-game">NOVA JORNADA</button>`);$('continue').onclick=()=>startSolo(Math.min(2,stored.unlocked));$('new-game').onclick=()=>startSolo();}else startSolo();};
$('nav-play').onclick=()=>mode==='playing'?canvas.focus():$('play').click();$('nav-help').onclick=help;$('nav-world').onclick=world;$('downloads').textContent='Sobre o jogo ↗';$('downloads').onclick=about;$('pause').onclick=pause;$('brand').onclick=e=>{e.preventDefault();if(mode==='playing')pause();else home();};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('game-frame').requestFullscreen();}catch{toast('Gire o celular para jogar na horizontal.');}};
function complete(){if(stageComplete)return;stageComplete=true;if(netReady){if(!isHost)return;send({type:'complete',level:level.index,epoch:netEpoch});}showComplete();}
function showComplete(){mode='complete';clearInput();stored.unlocked=Math.max(stored.unlocked,Math.min(2,level.index+1));save();const lastStage=level.index===2;const seconds=Math.floor(playTime),minutes=Math.floor(seconds/60);if(lastStage&&(!stored.best||playTime<stored.best)){stored.best=playTime;save();}
  openModal(`<span class="kicker">${lastStage?'O ECLIPSE ESTÁ COMPLETO':'MAIS UM PASSO PARA CASA'}</span><h2>${lastStage?'A noite é sua.':'Portal desperto.'}</h2><p>${lastStage?'Você atravessou a luz e devolveu os fragmentos ao céu. Até a menor sombra pode guardar um mundo inteiro.':'O silêncio abre um novo caminho. Há mais escuridão para descobrir do outro lado.'}</p><div class="stats"><div><b>6 / 6</b><span>FRAGMENTOS</span></div><div><b>${minutes}:${String(seconds%60).padStart(2,'0')}</b><span>TEMPO</span></div><div><b>${deaths}</b><span>RETORNOS</span></div></div><button class="primary" id="next-stage">${lastStage?'VOLTAR AO INÍCIO':netReady&&!isHost?'AGUARDANDO O CRIADOR…':'PRÓXIMA FASE →'}</button>`,false);
  sfx('gem');$('next-stage').disabled=netReady&&!isHost&&!lastStage;$('next-stage').onclick=()=>{if(lastStage){home();return;}if(netReady){netEpoch++;send({type:'start',level:level.index+1,epoch:netEpoch});}const next=level.index+1;closeModal(false);resetLevel(next);mode='playing';showGame();};}
function send(data){try{if(conn?.open)conn.send(data);}catch{}}
function disconnect(){clearTimeout(networkTimer);netReady=false;const old=conn;conn=null;try{old?.close();peer?.destroy();}catch{}peer=null;remote=null;remoteTarget=null;roomCode='';isHost=false;netEpoch=0;}
function netStatus(text){const s=$('net-status');if(s)s.textContent=text;}
function onlineMenu(){openModal('<span class="kicker">DUAS SOMBRAS. UM CAMINHO.</span><h2>Jogar em dupla</h2><p>Um no PC, outro no celular — ou como vocês quiserem. Crie uma sala e compartilhe o código com seu amigo.</p><button class="primary" id="create-room">CRIAR SALA <span>+</span></button><div class="split">OU ENTRE EM UMA SALA</div><label for="room-input">CÓDIGO DA SALA</label><input id="room-input" maxlength="6" placeholder="EX.: L7PK2M" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="secondary" id="join-room">ENTRAR NA SALA →</button><p class="modal-status" id="net-status" role="status">É necessária uma conexão com a internet.</p>',false);$('create-room').onclick=createRoom;$('join-room').onclick=joinRoom;$('room-input').onkeydown=e=>{if(e.key==='Enter')joinRoom();};}
$('online').onclick=onlineMenu;
function getPeer(id){if(typeof Peer==='undefined')throw Error('O componente online não foi carregado. Reinstale o jogo.');return id?new Peer(id,{debug:0}):new Peer({debug:0});}
function bindPeerErrors(p){p.on('error',e=>{if(peer!==p)return;const messages={'peer-unavailable':'Sala não encontrada. Confira o código e se seu amigo está conectado.','network':'Não foi possível alcançar o serviço online. Verifique sua internet.','unavailable-id':'Este código já está em uso. Crie uma nova sala.','browser-incompatible':'Atualize o Android System WebView para usar o modo online.','server-error':'O serviço de salas está indisponível. Tente novamente mais tarde.'};netStatus(messages[e.type]||'A conexão falhou. Tente outra rede ou crie a sala novamente.');if(mode==='playing')toast('A conexão foi interrompida. Você pode continuar solo.',5);clearTimeout(networkTimer);netReady=false;$('create-room')?.removeAttribute('disabled');$('join-room')?.removeAttribute('disabled');});p.on('disconnected',()=>{if(peer===p&&!netReady)netStatus('Conexão com o serviço de salas perdida. Feche e tente novamente.');});}
function randomCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const data=new Uint8Array(6);crypto.getRandomValues(data);return [...data].map(n=>chars[n%chars.length]).join('');}
function createRoom(){disconnect();isHost=true;roomCode=randomCode();mode='lobby';const code=roomCode;openModal(`<span class="kicker">SUA SALA</span><h2>Convide uma sombra</h2><p>Seu amigo deve abrir o modo online e digitar este código:</p><div class="code">${code}</div><button class="secondary" id="copy-code">COPIAR CÓDIGO</button><p class="modal-status" id="net-status" role="status">Criando sala…</p><button class="primary" id="start-duo" disabled>AGUARDANDO SEU AMIGO…</button><p>A partida começa quando os dois estiverem conectados.</p>`,false);
  $('copy-code').onclick=async()=>{try{await navigator.clipboard.writeText(code);$('copy-code').textContent='CÓDIGO COPIADO';}catch{$('copy-code').textContent=code;}};
  try{peer=getPeer('umbra-v1-'+code);bindPeerErrors(peer);peer.on('open',()=>netStatus('Sala aberta. Aguardando seu amigo…'));peer.on('connection',c=>{if(conn){c.on('open',()=>{c.send({type:'full'});c.close();});return;}attach(c,true);});networkTimer=setTimeout(()=>{if(!netReady)netStatus('Ainda aguardando. Se não conectar, verifique a internet e tente outra rede.');},25000);}catch(e){netStatus(e.message);}
}
function joinRoom(){const code=$('room-input').value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(code)){netStatus('Digite um código de 6 letras e números.');return;}disconnect();roomCode=code;isHost=false;mode='lobby';$('join-room').disabled=true;$('create-room').disabled=true;netStatus('Conectando à sala…');try{peer=getPeer();bindPeerErrors(peer);peer.on('open',()=>{attach(peer.connect('umbra-v1-'+code,{reliable:true,serialization:'json',metadata:{version:GAME_VERSION}}),false);});networkTimer=setTimeout(()=>{if(!netReady){netStatus('Tempo de conexão esgotado. Confira o código ou tente outra rede.');$('join-room')?.removeAttribute('disabled');$('create-room')?.removeAttribute('disabled');}},22000);}catch(e){netStatus(e.message);}}
function attach(c,host){conn=c;c.on('open',()=>{if(conn!==c)return;send({type:'hello',version:GAME_VERSION});});c.on('data',d=>{if(conn!==c||!d||typeof d!=='object'||typeof d.type!=='string')return;
    if(d.type==='hello'){if(d.version!==GAME_VERSION){netStatus('Vocês precisam usar a mesma versão do jogo.');c.close();return;}clearTimeout(networkTimer);netReady=true;remoteSeen=ambientTime;netStatus(host?'Seu amigo chegou. Vocês estão prontos!':'Conectado! Aguarde o criador iniciar a partida.');if(host){$('start-duo').disabled=false;$('start-duo').textContent='INICIAR EM DUPLA →';$('start-duo').onclick=()=>{netEpoch++;send({type:'start',level:0,epoch:netEpoch});closeModal(false);resetLevel(0);playTime=0;deaths=0;mode='playing';showGame();toast('Fragmentos compartilhados. Encontrem o caminho juntos.',4);};}else mode='lobby';return;}
    if(d.type==='full'){netStatus('Esta sala já tem duas sombras.');return;}
    if(!netReady)return;
    if(d.type==='start'&&!host&&Number.isInteger(d.level)&&d.level>=0&&d.level<3&&Number.isInteger(d.epoch)&&d.epoch>netEpoch){netEpoch=d.epoch;closeModal(false);resetLevel(d.level);if(d.level===0){playTime=0;deaths=0;}mode='playing';showGame();return;}
    if(d.epoch!==netEpoch||d.level!==level.index)return;
    if(d.type==='state'&&validateState(d)){remoteTarget={x:d.x,y:d.y,health:d.health,facing:d.facing===-1?-1:1,vx:Number.isFinite(d.vx)?d.vx:0};remoteSeen=ambientTime;if(!host&&Number.isFinite(d.t)&&Math.abs(d.t-simTime)>.2)simTime=d.t;if(Array.isArray(d.gems))for(const g of d.gems)if(Number.isInteger(g)&&g>=0&&g<6)gems.add(g);}
    if(d.type==='gem'&&Number.isInteger(d.index)&&d.index>=0&&d.index<6){if(!gems.has(d.index)){gems.add(d.index);sfx('gem');const g=level.gems[d.index];emit(g.x,g.y,'#b3dfce',14);if(gems.size===6)toast('Seu amigo completou os fragmentos. O portal despertou!');}}
    if(d.type==='complete'&&!host&&!stageComplete){stageComplete=true;showComplete();}
  });c.on('close',()=>{if(conn!==c)return;conn=null;netReady=false;remote=null;remoteTarget=null;netStatus('Seu amigo saiu. Feche este menu para criar outra sala.');if(mode==='playing')toast('Seu amigo saiu. A aventura continua no modo solo.',4);if($('start-duo'))$('start-duo').disabled=true;if(mode==='complete'&&$('next-stage')){$('next-stage').disabled=false;$('next-stage').textContent=level.index===2?'VOLTAR AO INÍCIO':'PRÓXIMA FASE →';}});c.on('error',()=>netStatus('A conexão direta falhou. Tente outra rede.'));}
window.addEventListener('beforeunload',disconnect);

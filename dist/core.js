import {createCampaignLevel,LEVEL_NAMES} from './campaign.js';
export {LEVEL_NAMES};
export const PHYSICS={speed:128,gravity:810,jump:-314,dash:380,damage:27,heal:21};
export const makeLevel=createCampaignLevel;
export const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export function lampPosition(l,t){return {x:l.x+Math.sin(t*(l.speed??.7)+(l.phase??0))*(l.sway??0),y:l.y,r:l.r};}
export function inLight(p,level,t){
  const px=p.x+p.w/2,py=p.y+p.h*.55;
  return level.lights.some(light=>{
    if(light.disabled)return false;
    const l=lampPosition(light,t);if(py<l.y||py>330||Math.abs(px-l.x)>l.r*(py-l.y)/(306-l.y))return false;
    return !level.platforms.some(s=>{if(s.y>=306||s.y<=l.y||s.y>=py-2)return false;const atX=l.x+(px-l.x)*(s.y-l.y)/(py-l.y);return atX>s.x-2&&atX<s.x+s.w+2;});
  });
}
export function makePlayer(spawn){return {x:spawn.x,y:spawn.y,w:14,h:22,vx:0,vy:0,health:100,facing:1,grounded:false,coyote:0,jumpBuffer:0,dash:0,cooldown:0,attack:0,attackCooldown:0,attackId:0,invulnerable:0,inLight:false,dead:false};}
export function attackBox(p){return {x:p.facing<0?p.x-34:p.x+p.w-2,y:p.y-6,w:36,h:p.h+12};}
function hurtPlayer(p,damage,events,knockback=0){if(p.invulnerable>0||p.dead||p.dash>0)return;p.health=Math.max(0,p.health-damage);p.invulnerable=.9;p.vy=-190;if(knockback)p.x+=knockback;events.push('hurt');}
export function stepPlayer(p,input,dt,level,time){
  if(p.dead)return [];
  const events=[];dt=Math.max(0,Math.min(dt,1/30));
  p.cooldown=Math.max(0,p.cooldown-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);p.attack=Math.max(0,(p.attack||0)-dt);p.attackCooldown=Math.max(0,(p.attackCooldown||0)-dt);
  p.coyote=p.grounded?.11:Math.max(0,p.coyote-dt);p.jumpBuffer=input.jump?.12:Math.max(0,(p.jumpBuffer||0)-dt);
  const axis=(input.right?1:0)-(input.left?1:0);if(axis)p.facing=axis;
  if(p.jumpBuffer>0&&p.coyote>0){p.vy=PHYSICS.jump;p.coyote=0;p.jumpBuffer=0;p.grounded=false;events.push('jump');}
  if(input.dash&&p.cooldown===0){p.dash=.18;p.cooldown=1.65;events.push('dash');}
  if(input.attack&&p.attackCooldown===0){p.attack=.18;p.attackCooldown=.34;p.attackId=(p.attackId||0)+1;events.push('attack');}
  if(p.dash>0){p.dash=Math.max(0,p.dash-dt);p.vx=p.facing*PHYSICS.dash;p.vy=0;}
  else{p.vx=axis*PHYSICS.speed;p.vy+=PHYSICS.gravity*dt;if(!input.holdJump&&p.vy<-130)p.vy+=PHYSICS.gravity*dt*.8;}
  const previousX=p.x;p.x=Math.max(0,Math.min(level.width-p.w,p.x+p.vx*dt));
  for(const g of level.gates||[]){if(g.open||p.y+p.h<=g.y||p.y>=g.y+g.h)continue;if(g.entryOnly&&previousX<g.x+g.w&&p.vx>=0)continue;if(p.x+p.w>g.x&&p.x<g.x+g.w){p.x=previousX+p.w<=g.x+1?g.x-p.w:previousX>=g.x+g.w-1?g.x+g.w:(p.x+p.w/2<g.x+g.w/2?g.x-p.w:g.x+g.w);p.vx=0;}}
  const prevBottom=p.y+p.h;p.y+=p.vy*dt;p.grounded=false;
  if(p.vy>=0){let landed=null;for(const s of level.platforms){if(p.x+p.w>s.x&&p.x<s.x+s.w&&prevBottom<=s.y+1&&p.y+p.h>=s.y&&p.y<s.y+s.h&&(!landed||s.y<landed.y))landed=s;}if(landed){p.y=landed.y-p.h;p.vy=0;p.grounded=true;}}
  p.inLight=inLight(p,level,time)&&p.dash<=0;
  if(p.invulnerable<=0){const healing=level.boss?.active&&level.boss.health>0?5:PHYSICS.heal;p.health=Math.max(0,Math.min(100,p.health+(p.inLight?-PHYSICS.damage*(1+level.index*.045):healing)*dt));}
  if(level.spikes.some(s=>overlaps(p,s))&&p.invulnerable<=0){p.health=Math.max(0,p.health-32);p.vy=-220;p.invulnerable=1.2;events.push('hurt');}
  const b=level.boss;if(b?.active&&b.health>0&&b.state!=='recover'&&overlaps(p,b))hurtPlayer(p,24,events,p.x<b.x?-8:8);
  for(const h of level.hazards||[])if(h.warmup<=0&&overlaps(p,h)){hurtPlayer(p,h.damage||22,events);if(h.type==='bolt')h.ttl=0;}
  if(p.y>390)p.health=0;
  if(p.health<=0){p.dead=true;events.push('death');}
  return events;
}
const event=(type,message,x=0,y=0)=>({type,message,x,y});
const switchNear=(s,p)=>Math.abs(p.x+p.w/2-s.x)<36&&Math.abs(p.y+p.h-s.y)<34;
function solve(level,events){if(level.puzzle.solved)return;level.puzzle.solved=true;level.puzzle.timer=0;level.gates.forEach(g=>g.open=true);events.push(event('puzzle-solved','Selo desfeito. O caminho está livre.',level.gates.at(-1)?.x||0,280));}
export function interactWorld(level,player,time=0){
  if(player.dead||level.puzzle.solved||level.boss)return [];
  const events=[],s=level.switches.find(s=>s.kind!=='plate'&&switchNear(s,player));if(!s)return events;
  const p=level.puzzle;
  if(p.kind==='lever'){s.active=true;p.progress=1;solve(level,events);}
  else if(p.kind==='timed'){s.active=true;p.timer=p.duration;level.gates.forEach(g=>g.open=true);events.push(event('switch','O relógio começou. Atravesse o selo!',s.x,s.y-20));}
  else if(p.kind==='runes'||p.kind==='sequence-timed'){
    if(p.timer>0)return events;
    if(s.symbol!==p.sequence[p.progress]){p.progress=0;level.switches.forEach(o=>o.active=false);events.push(event('puzzle-error','A ordem se desfez. Leia as runas e tente novamente.',s.x,s.y-20));}
    else{s.active=true;p.progress++;events.push(event('switch',`${s.symbol} · ${p.progress} / ${p.sequence.length}`,s.x,s.y-20));if(p.progress===p.sequence.length){if(p.kind==='runes')solve(level,events);else{p.timer=p.duration;level.gates.forEach(g=>g.open=true);events.push(event('switch','Sequência completa. Atravesse o selo!',s.x,s.y-20));}}}
  }else if(p.kind==='circuits'){
    if(!s.active){s.active=true;p.progress++;const circuit=level.switches.indexOf(s);level.lights.forEach((l,i)=>{if(i%2===circuit)l.disabled=true;});events.push(event('switch',`Espelho apagado · ${p.progress} / 2`,s.x,s.y-20));if(p.progress===level.switches.length)solve(level,events);}
  }
  return events;
}
function resetBoss(level){const b=level.boss;b.health=b.maxHealth;b.x=960;b.y=306-b.h;b.state='idle';b.active=false;b.phase=1;b.timer=0;b.cycle=0;b.lastHits=[-1,-1];level.hazards=[];level.gates[0].open=true;level.gates[1].open=false;}
function chooseAttack(b){if(b.kind==='warden')return b.cycle%3===2?'slam':'charge';if(b.kind==='weaver')return b.cycle%3===2?'charge':'volley';return ['beam','charge','slam','volley'][b.cycle%4];}
function startTelegraph(b,target){b.state='telegraph';b.timer=b.phase===2?.68:.95;b.attackType=chooseAttack(b);b.targetX=Math.max(560,Math.min(1120,target.x));b.facing=b.targetX<b.x?-1:1;}
function addHazard(level,type,x,y,w,h,vx,vy,ttl,warmup=0,damage=22){level.hazards.push({type,x,y,w,h,vx,vy,ttl,warmup,damage});}
function launchAttack(level,b){
  b.state='attack';b.timer=b.attackType==='charge'?.65:b.attackType==='slam'?.65:.5;
  const rank=b.rank,second=b.phase===2;
  if(b.attackType==='volley'){
    const count=second?5:3, originX=b.x+b.w/2,originY=b.y+b.h*.35;
    for(let i=0;i<count;i++){const angle=(b.facing<0?Math.PI:0)+(i-(count-1)/2)*.24;addHazard(level,'bolt',originX,originY,8,8,Math.cos(angle)*(145+rank*18),Math.sin(angle)*115,3.5,0,20);}
  }else if(b.attackType==='slam'){
    for(const direction of [-1,1])addHazard(level,'wave',b.x+b.w/2,294,21,12,direction*(170+rank*25),0,3,0,24);
    if(second)for(const direction of [-1,1])addHazard(level,'wave',b.x+b.w/2,273,15,10,direction*135,0,3,.3,20);
  }else if(b.attackType==='beam'){
    const positions=second?[b.targetX-80,b.targetX,b.targetX+80]:[b.targetX-58,b.targetX+58];
    for(const x of positions)addHazard(level,'beam',Math.max(550,Math.min(1130,x)),90,18,216,0,0,1.35,.65,26);
    b.timer=.9;
  }
}
export function stepWorld(level,players,dt,time=0){
  dt=Math.max(0,Math.min(dt,1/30));const events=[],alive=players.filter(p=>p&&!p.dead&&p.health>0);
  const puzzle=level.puzzle;
  if(!level.boss&&!puzzle.solved){
    if(puzzle.kind==='plates')level.switches.forEach((s,i)=>{if(!s.active&&alive.some(p=>switchNear(s,p)&&p.grounded)){s.active=true;puzzle.progress++;level.gates[i].open=true;events.push(event('switch',`Circuito ${i+1} ativado.`,s.x,s.y-12));if(puzzle.progress===level.switches.length)solve(level,events);}});
    if(puzzle.timer>0){if(alive.some(p=>p.x>level.gates.at(-1).x+level.gates.at(-1).w)){solve(level,events);}else{puzzle.timer=Math.max(0,puzzle.timer-dt);if(puzzle.timer===0){puzzle.progress=0;level.switches.forEach(s=>s.active=false);level.gates.forEach(g=>g.open=false);events.push(event('puzzle-error','O tempo acabou. O mecanismo pode ser ativado novamente.'));}}}
  }
  for(const h of level.hazards){h.ttl-=dt;if(h.warmup>0)h.warmup=Math.max(0,h.warmup-dt);else{h.x+=h.vx*dt;h.y+=h.vy*dt;}}
  level.hazards=level.hazards.filter(h=>h.ttl>0&&h.x>480&&h.x<1190&&h.y>-30&&h.y<350);
  const b=level.boss;if(!b||b.health<=0)return events;
  if(b.active&&(!alive.length||alive.every(p=>p.x<520))){resetBoss(level);return [event('boss-reset','O guardião voltou a vigiar. Tente novamente.')];}
  if(!b.active){const entered=alive.find(p=>p.x>550&&p.x<1160);if(!entered)return events;b.active=true;level.gates[0].open=false;startTelegraph(b,entered);events.push(event('boss-start',b.name,b.x,b.y));}
  const target=alive.reduce((best,p)=>!best||Math.abs(p.x-b.x)<Math.abs(best.x-b.x)?p:best,null);if(!target)return events;
  for(let i=0;i<players.length;i++){const p=players[i];if(!p||p.dead||!(p.attack>0)||!Number.isInteger(p.attackId)||b.lastHits[i]===p.attackId)continue;if(overlaps(attackBox(p),b)){b.lastHits[i]=p.attackId;const damage=b.state==='recover'?20:12;b.health=Math.max(0,b.health-damage);events.push(event('boss-hit','',b.x+b.w/2,b.y+b.h/2));}}
  if(b.health<=0){b.health=0;b.state='defeated';b.active=false;level.hazards=[];solve(level,events);events.push(event('boss-defeated',`${b.name} se rendeu à noite.`,b.x,b.y));return events;}
  if(b.health<=b.maxHealth*.5&&b.phase===1){b.phase=2;events.push(event('boss-phase','A luz ficou mais feroz. Observe os sinais!',b.x,b.y));}
  b.timer-=dt;
  if(b.state==='telegraph'&&b.timer<=0)launchAttack(level,b);
  else if(b.state==='attack'){
    if(b.attackType==='charge'){b.x+=b.facing*(b.phase===2?315:255)*dt;if(b.x<552||b.x+b.w>1150){b.x=Math.max(552,Math.min(1150-b.w,b.x));b.timer=0;}}
    if(b.timer<=0){b.state='recover';b.timer=b.phase===2?.9:1.2;}
  }else if(b.state==='recover'&&b.timer<=0){b.cycle++;startTelegraph(b,target);}
  return events;
}
export function objectiveComplete(level){return !!level.puzzle?.solved&&(!level.boss||level.boss.health<=0);}
export function worldSnapshot(level){return {puzzle:{...level.puzzle,sequence:[...level.puzzle.sequence]},switches:level.switches.map(s=>s.active),gates:level.gates.map(g=>g.open),lights:level.lights.map(l=>!!l.disabled),boss:level.boss?{...level.boss,lastHits:[...level.boss.lastHits]}:null,hazards:level.hazards.map(h=>({...h}))};}
const finite=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
export function applyWorldSnapshot(level,s){
  if(!s||typeof s!=='object'||!s.puzzle||typeof s.puzzle.solved!=='boolean'||!finite(s.puzzle.progress,0,3)||!finite(s.puzzle.timer,0,20))return false;
  if(!Array.isArray(s.switches)||s.switches.length!==level.switches.length||!s.switches.every(v=>typeof v==='boolean')||!Array.isArray(s.gates)||s.gates.length!==level.gates.length||!s.gates.every(v=>typeof v==='boolean')||!Array.isArray(s.lights)||s.lights.length!==level.lights.length||!s.lights.every(v=>typeof v==='boolean'))return false;
  if(!Array.isArray(s.hazards)||s.hazards.length>40||!s.hazards.every(h=>h&&['bolt','wave','beam'].includes(h.type)&&finite(h.x,-50,3200)&&finite(h.y,-100,400)&&finite(h.w,1,50)&&finite(h.h,1,300)&&finite(h.vx,-500,500)&&finite(h.vy,-500,500)&&finite(h.ttl,0,5)&&finite(h.warmup,0,2)&&finite(h.damage,0,50)))return false;
  if(level.boss){const b=s.boss;if(!b||b.kind!==level.boss.kind||!finite(b.x,500,1200)||!finite(b.y,150,310)||!finite(b.health,0,level.boss.maxHealth)||!['idle','telegraph','attack','recover','defeated'].includes(b.state)||!['charge','volley','slam','beam'].includes(b.attackType)||![1,2].includes(b.phase)||![-1,1].includes(b.facing)||typeof b.active!=='boolean'||!finite(b.timer,-.1,3)||!finite(b.targetX,500,1200)||!Number.isSafeInteger(b.cycle)||b.cycle<0||b.cycle>1000000)return false;}
  // Copy only mutable state. Remote packets cannot redefine collision geometry or boss statistics.
  level.puzzle.solved=s.puzzle.solved;level.puzzle.progress=s.puzzle.progress;level.puzzle.timer=s.puzzle.timer;
  level.switches.forEach((v,i)=>v.active=s.switches[i]);level.gates.forEach((v,i)=>v.open=s.gates[i]);level.lights.forEach((v,i)=>v.disabled=s.lights[i]);level.hazards=s.hazards.map(h=>({...h}));
  if(level.boss)for(const key of ['x','y','health','state','attackType','timer','phase','facing','targetX','active','cycle'])level.boss[key]=s.boss[key];
  return true;
}
export function validateState(v){return v&&typeof v==='object'&&finite(v.x,0,3120)&&finite(v.y,-200,450)&&finite(v.health,0,100)&&(!('attack' in v)||finite(v.attack,0,.2))&&(!('attackId' in v)||Number.isSafeInteger(v.attackId)&&v.attackId>=0);}

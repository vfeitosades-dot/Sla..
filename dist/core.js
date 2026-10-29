export const LEVEL_NAMES = ['Floresta do silêncio','Ruínas do crepúsculo','O último eclipse'];
export const PHYSICS = { speed: 128, gravity: 810, jump: -314, dash: 380, damage: 27, heal: 21 };
export function makeLevel(index=0) {
  const n=Math.max(0,Math.min(2,index));
  const platforms=[
    {x:0,y:306,w:700,h:100},{x:775,y:306,w:825,h:100},{x:1680,y:306,w:680,h:100},{x:2440,y:306,w:680,h:100},
    {x:245,y:264,w:130,h:14},{x:425,y:222,w:120,h:14},{x:585,y:182,w:110,h:14},
    {x:930,y:264,w:110,h:14},{x:1060,y:222,w:135,h:14},{x:1260,y:260,w:110,h:14},
    {x:1375,y:220,w:105,h:14},{x:1500,y:180,w:100,h:14},{x:1720,y:258,w:100,h:14},
    {x:1900,y:260,w:110,h:14},{x:2025,y:220,w:100,h:14},{x:2150,y:178,w:120,h:14},
    {x:2500,y:264,w:110,h:14},{x:2640,y:224,w:100,h:14},{x:2780,y:264,w:110,h:14}
  ];
  const gems=[{x:310,y:248},{x:640,y:166},{x:1128,y:206},{x:1550,y:164},{x:2210,y:162},{x:2840,y:248}];
  const lights=[{x:455,y:115,r:95,sway:17,phase:0},{x:1030,y:105,r:115,sway:25,phase:1},{x:1460,y:75,r:108,sway:20,phase:2},{x:1980,y:105,r:112,sway:32,phase:3},{x:2635,y:100,r:105,sway:20,phase:4}];
  if(n>0){lights.push({x:730,y:115,r:92,sway:75,phase:1.5},{x:2370,y:100,r:105,sway:70,phase:4.5});}
  if(n===2){lights.push({x:3000,y:90,r:95,sway:70,phase:2});}
  lights.forEach(l=>{l.sway*=1+n*.35;l.speed=.62+n*.22;});
  return {index:n,width:3120,height:360,platforms,gems,lights,spikes:[{x:1165,y:299,w:62,h:7},{x:1860,y:299,w:n?90:50,h:7},{x:2715,y:299,w:55,h:7}],checkpoints:[{x:850,y:306},{x:1745,y:306},{x:2500,y:306}],portal:{x:3038,y:306},spawn:{x:72,y:284}};
}
export const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
export function lampPosition(l,t){return {x:l.x+Math.sin(t*l.speed+l.phase)*l.sway,y:l.y,r:l.r};}
export function inLight(p,level,t) {
  const px=p.x+p.w/2,py=p.y+p.h*.55;
  return level.lights.some(light=>{
    const l=lampPosition(light,t); if(py<l.y||py>330)return false;
    if(Math.abs(px-l.x)>l.r*(py-l.y)/(306-l.y))return false;
    // Platforms interrupt the ray and cast a safe shadow below them.
    return !level.platforms.some(s=>{
      if(s.y>=306||s.y<=l.y||s.y>=py-2)return false;
      const atX=l.x+(px-l.x)*(s.y-l.y)/(py-l.y);
      return atX>s.x-2&&atX<s.x+s.w+2;
    });
  });
}
export function makePlayer(spawn){return {x:spawn.x,y:spawn.y,w:14,h:22,vx:0,vy:0,health:100,facing:1,grounded:false,coyote:0,dash:0,cooldown:0,invulnerable:0,inLight:false,dead:false};}
export function stepPlayer(p,input,dt,level,time){
  if(p.dead)return [];
  const events=[];dt=Math.min(dt,1/30);p.cooldown=Math.max(0,p.cooldown-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);
  p.coyote=p.grounded?.11:Math.max(0,p.coyote-dt);
  const axis=(input.right?1:0)-(input.left?1:0);
  if(axis)p.facing=axis;
  if(input.jump&&p.coyote>0){p.vy=PHYSICS.jump;p.coyote=0;p.grounded=false;events.push('jump');}
  if(input.dash&&p.cooldown===0){p.dash=.18;p.cooldown=1.65;events.push('dash');}
  if(p.dash>0){p.dash-=dt;p.vx=p.facing*PHYSICS.dash;p.vy=0;}
  else{p.vx=axis*PHYSICS.speed;p.vy+=PHYSICS.gravity*dt;if(!input.holdJump&&p.vy<-130)p.vy+=PHYSICS.gravity*dt*.8;}
  p.x=Math.max(0,Math.min(level.width-p.w,p.x+p.vx*dt));
  const prevBottom=p.y+p.h;p.y+=p.vy*dt;p.grounded=false;
  if(p.vy>=0){for(const s of level.platforms){if(p.x+p.w>s.x&&p.x<s.x+s.w&&prevBottom<=s.y+1&&p.y+p.h>=s.y&&p.y<s.y+s.h){p.y=s.y-p.h;p.vy=0;p.grounded=true;break;}}}
  p.inLight=inLight(p,level,time)&&p.dash<=0;
  if(p.invulnerable<=0){p.health=Math.max(0,Math.min(100,p.health+(p.inLight?-PHYSICS.damage*(1+level.index*.12):PHYSICS.heal)*dt));}
  if(level.spikes.some(s=>overlaps(p,s))&&p.invulnerable<=0){p.health=Math.max(0,p.health-32);p.vy=-220;p.invulnerable=1.2;events.push('hurt');}
  if(p.y>390)p.health=0;
  if(p.health<=0){p.dead=true;events.push('death');}
  return events;
}
export function validateState(v){return v&&typeof v==='object'&&Number.isFinite(v.x)&&v.x>=0&&v.x<=3120&&Number.isFinite(v.y)&&v.y>=-200&&v.y<=450&&Number.isFinite(v.health)&&v.health>=0&&v.health<=100;}

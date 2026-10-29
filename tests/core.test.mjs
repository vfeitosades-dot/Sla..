import test from 'node:test';
import assert from 'node:assert/strict';
import {makeLevel,makePlayer,stepPlayer,inLight,lampPosition,validateState} from '../dist/core.js';
const input={left:false,right:false,jump:false,dash:false,holdJump:false};
function run(p,l,seconds,controls=input){for(let i=0;i<seconds*60;i++)stepPlayer(p,controls,1/60,l,0);return p;}
test('A luz tira vida, a sombra recupera e a essência fica entre zero e cem',()=>{
  const l=makeLevel(0);l.lights=[{x:500,y:100,r:100,sway:0,speed:1,phase:0}];l.platforms=[{x:0,y:306,w:1000,h:100}];l.spikes=[];
  const p=makePlayer({x:493,y:284});run(p,l,1);assert.ok(p.health<75&&p.health>70);p.x=50;run(p,l,2);assert.equal(p.health,100);
  p.x=493;run(p,l,5);assert.equal(p.health,0);assert.equal(p.dead,true);
});
test('Uma plataforma bloqueia o feixe e oferece abrigo',()=>{const l=makeLevel();l.lights=[{x:500,y:100,r:100,sway:0,speed:1,phase:0}];l.platforms=[];const p=makePlayer({x:493,y:284});assert.ok(inLight(p,l,0));l.platforms=[{x:470,y:220,w:60,h:12}];assert.equal(inLight(p,l,0),false);});
test('O salto alcança plataformas de 42 pixels acima',()=>{const l=makeLevel();l.lights=[];l.spikes=[];l.platforms=[{x:0,y:306,w:500,h:100},{x:100,y:264,w:200,h:12}];const p=makePlayer({x:80,y:284});run(p,l,.1);stepPlayer(p,{...input,right:true,jump:true,holdJump:true},1/60,l,0);run(p,l,.7,{...input,right:true,holdJump:true});assert.equal(p.y,242);assert.equal(p.grounded,true);});
test('Salto seguido de impulso atravessa um vão de 80 pixels e respeita recarga',()=>{const l=makeLevel();l.lights=[];l.spikes=[];const p=makePlayer({x:670,y:284});run(p,l,.1);stepPlayer(p,{...input,right:true,jump:true,holdJump:true},1/60,l,0);run(p,l,.15,{...input,right:true,holdJump:true});stepPlayer(p,{...input,right:true,dash:true,holdJump:true},1/60,l,0);const first=p.cooldown;stepPlayer(p,{...input,right:true,dash:true,holdJump:true},1/60,l,0);assert.ok(p.cooldown<first);run(p,l,.8,{...input,right:true,holdJump:true});assert.ok(p.x>775);assert.equal(p.dead,false);});
test('Espinhos causam dano sem repetir a cada frame',()=>{const l=makeLevel();l.lights=[];l.platforms=[{x:0,y:306,w:1000,h:100}];l.spikes=[{x:100,y:299,w:50,h:7}];const p=makePlayer({x:110,y:284});const e=stepPlayer(p,input,1/60,l,0);assert.ok(e.includes('hurt'));assert.equal(p.health,68);stepPlayer(p,input,1/60,l,0);assert.equal(p.health,68);});
test('As fases têm seis fragmentos, abrigo e portal acessível',()=>{for(let i=0;i<3;i++){const l=makeLevel(i);assert.equal(l.gems.length,6);assert.ok(l.checkpoints.length>=3);assert.ok(l.platforms.some(s=>s.x<l.portal.x&&s.x+s.w>l.portal.x&&s.y===l.portal.y));for(const g of l.gems)assert.ok(l.platforms.some(s=>g.x>=s.x&&g.x<=s.x+s.w&&Math.abs(s.y-g.y)<=20));}});
test('Pacotes de rede rejeitam números inválidos e posições fora do mapa',()=>{assert.ok(validateState({x:22,y:120,health:45}));assert.ok(!validateState({x:Infinity,y:120,health:45}));assert.ok(!validateState({x:5000,y:120,health:45}));assert.ok(!validateState({x:22,y:120,health:500}));});

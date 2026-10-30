/* Two real native WebRTC peers; helpers are injected in a temporary app only. */
const {_electron:electron}=require('playwright');
const {PeerServer}=require(process.env.UMBRA_PEER_SERVER||'/workspace/work/qa/node_modules/peer');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const project=path.resolve(__dirname,'..');
async function main(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'umbra-coop-'));
  let peerHttp;
  PeerServer({port:0,host:'127.0.0.1',path:'/umbra',allow_discovery:false},server=>{peerHttp=server;});
  while(!peerHttp?.listening)await new Promise(resolve=>setTimeout(resolve,20));
  const port=peerHttp.address().port;
  for(const file of ['main.cjs','package.json','icon.ico'])fs.copyFileSync(path.join(project,'native/electron',file),path.join(root,file));
  fs.cpSync(path.join(project,'dist'),path.join(root,'game'),{recursive:true});
  fs.appendFileSync(path.join(root,'game/assets/peerjs.min.js'),`\nconst OriginalPeer=window.Peer;window.Peer=class extends OriginalPeer{constructor(id,options){if(typeof id==='object'){options=id;id=undefined;}super(id,{...options,host:'127.0.0.1',port:${port},path:'/umbra',secure:false,config:{iceServers:[]}});}};`);
  fs.appendFileSync(path.join(root,'game/game.js'),`\nwindow.__umbraQA={
    state:()=>({mode,netReady,isHost,epoch:netEpoch,player:{...player},level:JSON.parse(JSON.stringify(level)),gems:[...gems]}),
    place:values=>Object.assign(player,values),
    next:index=>{netEpoch++;send({type:'start',level:index,epoch:netEpoch});resetLevel(index);mode='playing';showGame();},
    useSwitch:index=>{const s=level.switches[index];Object.assign(player,{x:s.x-7,y:s.y-22,vx:0,vy:0,health:100,dead:false,invulnerable:10});},
    prepareBoss:()=>{const b=level.boss;b.active=true;b.state='recover';b.timer=8;Object.assign(player,{x:b.x-24,y:b.y+b.h-22,facing:1,health:100,dead:false,invulnerable:10});},
    attack:()=>{input.attack=true;},
    interact:()=>{input.interact=true;},
    disconnect:()=>disconnect()
  };\n`);
  const app=await electron.launch({executablePath:process.env.UMBRA_ELECTRON||'/workspace/work/toolchain/electron-linux/electron',env:{...process.env,XDG_CACHE_HOME:path.join(root,'cache'),XDG_CONFIG_HOME:path.join(root,'config')},args:['--user-data-dir='+path.join(root,'profile'),'--no-sandbox','--headless','--ozone-platform=headless','--disable-dev-shm-usage','--allow-loopback-in-peer-connection',root],timeout:20000});
  const errors=[];
  try{
    const host=await app.firstWindow();await host.waitForFunction(()=>!!window.__umbraQA);
    const guestPromise=app.waitForEvent('window');
    await app.evaluate(({BrowserWindow})=>{const w=new BrowserWindow({width:1280,height:800,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});w.loadURL('umbra://app/index.html');});
    const guest=await guestPromise;await guest.waitForFunction(()=>!!window.__umbraQA);
    await app.evaluate(({BrowserWindow})=>{for(const w of BrowserWindow.getAllWindows())w.webContents.setBackgroundThrottling(false);});
    for(const page of [host,guest])page.on('pageerror',e=>errors.push(e.message));
    await host.locator('#online').evaluate(e=>e.click());await host.locator('#create-room').evaluate(e=>e.click());
    const code=await host.locator('.code').textContent();
    await guest.locator('#online').evaluate(e=>e.click());await guest.locator('#room-input').fill(code);await guest.locator('#join-room').evaluate(e=>e.click());
    await host.waitForFunction(()=>!document.getElementById('start-duo').disabled,null,{timeout:20000});
    await host.locator('#start-duo').evaluate(e=>e.click());
    await guest.waitForFunction(()=>window.__umbraQA.state().mode==='playing');
    assert.ok((await host.evaluate(()=>window.__umbraQA.state())).netReady);
    // A guest collects a fragment; the host receives the shared result.
    await guest.evaluate(()=>{const s=window.__umbraQA.state();window.__umbraQA.place({x:s.level.gems[0].x-7,y:s.level.gems[0].y-11});});
    await host.waitForFunction(()=>window.__umbraQA.state().gems.includes(0));
    // Stage zero's introductory mechanism is also usable by the guest.
    const stage0=await host.evaluate(()=>window.__umbraQA.state());
    assert.ok(stage0.level.switches.length>0,'Introductory stage has a mechanism');
    await guest.evaluate(()=>window.__umbraQA.useSwitch(0));await guest.waitForTimeout(180);
    await guest.evaluate(()=>window.__umbraQA.interact());
    await host.waitForFunction(()=>window.__umbraQA.state().level.switches[0].active,null,{timeout:4000});
    await guest.waitForFunction(()=>window.__umbraQA.state().level.switches[0].active,null,{timeout:4000});
    const hostPuzzle=await host.evaluate(()=>window.__umbraQA.state().level.puzzle);
    await guest.waitForFunction(p=>window.__umbraQA.state().level.puzzle.solved===p.solved,hostPuzzle);
    // Host changes phase: both peers must use the same world epoch and arena.
    await host.evaluate(()=>window.__umbraQA.next(2));
    await guest.waitForFunction(()=>window.__umbraQA.state().level.index===2);
    await host.evaluate(()=>window.__umbraQA.prepareBoss());
    await guest.waitForFunction(()=>window.__umbraQA.state().level.boss.active);
    const initialHealth=(await host.evaluate(()=>window.__umbraQA.state())).level.boss.health;
    await guest.evaluate(()=>{const b=window.__umbraQA.state().level.boss;window.__umbraQA.place({x:b.x-24,y:b.y+b.h-22,facing:1,health:100,dead:false,invulnerable:10});});
    await guest.waitForTimeout(200);await guest.evaluate(()=>window.__umbraQA.attack());
    await host.waitForFunction(h=>window.__umbraQA.state().level.boss.health<h,initialHealth,{timeout:4000});
    const bossHealth=(await host.evaluate(()=>window.__umbraQA.state())).level.boss.health;
    await guest.waitForFunction(h=>window.__umbraQA.state().level.boss.health===h,bossHealth,{timeout:4000});
    // Opening an online pause dialog leaves simulation running but blocks movement.
    await guest.locator('#pause').evaluate(e=>e.click());
    const pausedX=(await guest.evaluate(()=>window.__umbraQA.state())).player.x;
    await guest.keyboard.down('KeyD');await guest.waitForTimeout(250);await guest.keyboard.up('KeyD');
    assert.equal((await guest.evaluate(()=>window.__umbraQA.state())).player.x,pausedX,'Dialog blocks gameplay input');
    await guest.keyboard.press('Escape');
    // The remaining player can continue alone after disconnect.
    await guest.evaluate(()=>window.__umbraQA.disconnect());
    await host.waitForFunction(()=>!window.__umbraQA.state().netReady);
    assert.equal((await host.evaluate(()=>window.__umbraQA.state())).mode,'playing');
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({nativeWebRTC:'passed',sharedCrystal:'passed',guestPuzzleInteraction:'passed',bossDamageSync:'passed',stageEpochSync:'passed',pauseInput:'passed',disconnectSolo:'passed',errors}));
  }finally{await app.close();await new Promise(resolve=>peerHttp.close(resolve));fs.rmSync(root,{recursive:true,force:true});}
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});

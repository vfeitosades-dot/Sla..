/* UI integration tests. Debug controls are appended to a temporary copy only. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const project=path.resolve(__dirname,'..');
const screenshotDir=process.env.UMBRA_QA_SCREENSHOTS||path.join(os.tmpdir(),'umbra-upgrade-screenshots');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main(){
  const appDir=fs.mkdtempSync(path.join(os.tmpdir(),'umbra-ui-'));
  fs.cpSync(path.join(project,'dist'),appDir,{recursive:true});
  fs.mkdirSync(screenshotDir,{recursive:true});
  fs.appendFileSync(path.join(appDir,'game.js'),`\nwindow.__umbraQA={
    start:index=>startSolo(index),
    state:()=>({mode,player:{...player},level:JSON.parse(JSON.stringify(level)),gems:[...gems]}),
    place:(values)=>Object.assign(player,values),
    finish:()=>{gems=new Set(level.gems.map((_,i)=>i));if(level.puzzle)level.puzzle.solved=true;if(level.boss){level.boss.health=0;level.boss.state='defeated';}complete();},
    unlock:()=>{stored.unlocked=8;save();},
    home:()=>home()
  };\n`);
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml'};
  const server=http.createServer((req,res)=>{
    const filename=path.resolve(appDir,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));
    if(!filename.startsWith(appDir+path.sep)){res.writeHead(403);res.end();return;}
    fs.readFile(filename,(err,data)=>{if(err){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',types[path.extname(filename)]||'application/octet-stream');res.end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({executablePath:process.env.UMBRA_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const errors=[];
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);await page.waitForFunction(()=>!!window.__umbraQA);
    await page.evaluate(()=>document.fonts.ready);await sleep(800);
    await page.screenshot({path:path.join(screenshotDir,'menu-desktop.png')});
    assert.equal(await page.locator('#btn-chapters').count(),1,'Campaign button exists');
    await page.locator('#btn-chapters').click();
    assert.equal(await page.locator('.chapter-card').count(),9,'Nine campaign cards');
    assert.ok(await page.locator('.chapter-card:disabled').count()>=7,'Future chapters start locked');
    await page.locator('#close-modal').click();
    await page.locator('#play').click();await page.locator('#hud').waitFor({state:'visible'});
    await page.keyboard.down('KeyD');await sleep(300);await page.keyboard.up('KeyD');
    assert.ok((await page.evaluate(()=>window.__umbraQA.state())).player.x>72,'Keyboard movement');
    await page.keyboard.press('Escape');await page.locator('#resume').waitFor();
    const beforePause=(await page.evaluate(()=>window.__umbraQA.state())).player.x;
    await page.keyboard.press('KeyD');await sleep(200);
    assert.equal((await page.evaluate(()=>window.__umbraQA.state())).player.x,beforePause,'Paused character stays still');
    await page.keyboard.press('Escape');assert.equal(await page.locator('#modal').evaluate(e=>e.open),false,'Escape resumes pause');
    await page.evaluate(()=>window.__umbraQA.place({x:72,y:284,vx:0,vy:0}));
    await page.keyboard.press('KeyJ');
    await page.waitForFunction(()=>window.__umbraQA.state().player.attackId>0,null,{timeout:1500});
    for(let index=0;index<9;index++){
      await page.evaluate(i=>window.__umbraQA.start(i),index);await sleep(100);
      const state=await page.evaluate(()=>window.__umbraQA.state());
      assert.equal(state.level.index,index,'Stage selectable '+index);
      assert.ok(Number.isFinite(state.player.x)&&Number.isFinite(state.player.y),'Finite position');
      assert.match(await page.locator('#stage-label').textContent(),new RegExp('0'+(index+1)));
      if(state.level.boss){
        await page.evaluate(()=>{const s=window.__umbraQA.state();window.__umbraQA.place({x:s.level.boss.x-100,y:284});});
        await sleep(500);await page.screenshot({path:path.join(screenshotDir,'boss-'+index+'.png')});
      }
      if(index===0)await page.screenshot({path:path.join(screenshotDir,'game-desktop.png')});
    }
    await page.evaluate(()=>window.__umbraQA.start(7));
    await page.evaluate(()=>window.__umbraQA.finish());
    await page.locator('#next-stage').click();
    assert.equal((await page.evaluate(()=>window.__umbraQA.state())).level.index,8,'Eighth stage leads to ninth');
    await page.evaluate(()=>window.__umbraQA.finish());
    await page.keyboard.press('Escape');
    assert.equal((await page.evaluate(()=>window.__umbraQA.state())).mode,'menu','Escape from completion returns to menu');
    await page.evaluate(()=>window.__umbraQA.unlock());
    await page.locator('#btn-chapters').click();
    assert.equal(await page.locator('.chapter-card:disabled').count(),0,'Saved campaign progress unlocks chapters');
    await page.screenshot({path:path.join(screenshotDir,'chapters-desktop.png')});
    await page.locator('#close-modal').click();
    await page.locator('#online').click();await page.locator('#room-input').fill('111111');await page.locator('#join-room').click();
    assert.match(await page.locator('#net-status').textContent(),/Digite/);
    await page.locator('#close-modal').click();
    for(const [label,width,height] of [['landscape',844,390],['small-landscape',667,375],['portrait',390,844]]){
      const phone=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});
      phone.on('pageerror',e=>errors.push(label+': '+e.message));
      await phone.goto(url);await phone.waitForFunction(()=>!!window.__umbraQA);await sleep(650);
      await phone.screenshot({path:path.join(screenshotDir,'menu-'+label+'.png')});
      const play=await phone.locator('#play').boundingBox();assert.ok(play&&play.y>=0&&play.y+play.height<=height,'Play visible '+label);
      await phone.locator('#play').click();await phone.locator('#hud').waitFor({state:'visible'});
      for(const control of ['left','right','jump','dash','attack','interact']){
        const node=phone.locator('[data-control="'+control+'"]');
        assert.ok(await node.isVisible(),control+' visible '+label);
        const box=await node.boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width&&box.y>=0&&box.y+box.height<=height,control+' on screen '+label);
      }
      await phone.screenshot({path:path.join(screenshotDir,'game-'+label+'.png')});
      await phone.locator('[data-control="attack"]').tap();
      await phone.waitForFunction(()=>window.__umbraQA.state().player.attackId>0,null,{timeout:1500});
      await phone.locator('#pause').tap();await phone.locator('#exit').tap();
      await phone.locator('#btn-chapters').tap();
      const dialog=await phone.locator('#modal').boundingBox();assert.ok(dialog.y>=0&&dialog.y+dialog.height<=height+1,'Dialog in viewport '+label);
      await phone.close();
    }
    assert.deepEqual(errors,[],'No browser errors');
    console.log(JSON.stringify({ui:'passed',stages:9,bossViews:3,mobileViewports:3,consoleErrors:errors,screenshots:screenshotDir}));
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(appDir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});

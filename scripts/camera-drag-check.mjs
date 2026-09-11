import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const url=process.env.GAME_URL||'http://127.0.0.1:4191/';
const report={status:'NOT_RUN',url,checkedAt:new Date().toISOString(),devices:[],errors:[],limitation:'Linux Chrome mouse input at emulated display densities; not physical Mac/Safari testing.'};
let browser,page;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 for(const dpr of [2,1,3]){
  page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:dpr});page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(url);await page.getByRole('button',{name:'入 山',exact:true}).click();await page.getByRole('button',{name:'去回石驿',exact:true}).click();await page.waitForFunction(()=>window.__XIAN_NI__?.inspect().scene==='home');
  const point=()=>page.evaluate(()=>window.__XIAN_NI__.screenPoint(1000,750));
  const before=await point(),end={x:120,y:150};assert.notEqual(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,end),'CANVAS','Release must be over the actual observation UI');
  await page.keyboard.down('Shift');await page.mouse.move(720,440);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:10});await page.mouse.up();await page.keyboard.up('Shift');await page.waitForTimeout(250);
  const released=await point();assert.ok(Math.hypot(released.x-before.x,released.y-before.y)>50,'The gesture must really pan the camera');
  assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,released),'CANVAS');
  await page.mouse.move(released.x,released.y);await page.waitForTimeout(250);const after=await point();
  assert.ok(Math.hypot(after.x-released.x,after.y-released.y)<2,'After releasing over UI, moving back onto the canvas must not keep dragging the camera');
  await page.mouse.click(after.x,after.y);await page.waitForFunction(()=>{const s=window.__XIAN_NI__.inspect();return Math.hypot(s.player.x-1000,s.player.y-750)<18&&s.player.path.length===0;},null,{timeout:30000});
  const s=await page.evaluate(()=>window.__XIAN_NI__.inspect());assert.equal(s.dialogue,null);assert.equal(s.paused,false);
  const path=`qa/evidence/camera-drag-dpr${dpr}.png`;await page.screenshot({path});report.devices.push({dpr,before,released,after,player:s.player,screenshot:path});console.log('CAMERA RELEASE PASS',dpr);await page.close();page=null;
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=String(e);console.error(e);if(page)await page.screenshot({path:'qa/evidence/camera-drag-failure.png'}).catch(()=>{});process.exitCode=1;}
finally{await browser?.close();await writeFile('qa/evidence/camera-drag.json',JSON.stringify(report,null,2));}

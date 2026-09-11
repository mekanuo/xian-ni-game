import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const url=process.env.GAME_URL||'http://127.0.0.1:4189/';
const report={status:'NOT_RUN',url,checks:[],errors:[],limitation:'Linux Chrome; mobile uses touch/DPR emulation.'};
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
try{
 for(const mobile of [false,true]){
  const width=mobile?390:1440,height=mobile?844:900;
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  const tap=async locator=>mobile?locator.tap():locator.click();
  const state=()=>page.evaluate(()=>window.__XIAN_NI__.inspect());
  const visual=()=>page.evaluate(()=>window.__XIAN_NI__.presentation());
  async function load(path){await tap(page.locator('[data-ui="settings"]'));await page.locator('#import-save').setInputFiles(path);await page.waitForTimeout(500);const ending=page.getByRole('button',{name:'在驿中再坐一会儿',exact:true});if(await ending.isVisible())await tap(ending);}
  async function world(x,y){for(let i=0;i<6;i++){const p=await page.evaluate(({x,y})=>window.__XIAN_NI__.screenPoint(x,y),{x,y});if(p.x>30&&p.x<width-30&&p.y>210&&p.y<height-190){if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);return;}
   const dx=Math.max(-width*.35,Math.min(width*.35,width*.5-p.x)),dy=Math.max(-220,Math.min(220,height*.48-p.y));await page.keyboard.down('Shift');await page.mouse.move(width*.5,height*.48);await page.mouse.down();await page.mouse.move(width*.5+dx,height*.48+dy,{steps:8});await page.mouse.up();await page.keyboard.up('Shift');await page.waitForTimeout(100);}throw Error('Cannot frame action target');}
  await page.goto(url);await tap(page.getByRole('button',{name:'入 山',exact:true}));await tap(page.getByRole('button',{name:'去回石驿',exact:true}));
  await load('qa/evidence/life-shade-ready-input.json');if((await state()).paused)await tap(page.locator('.action-dock [data-ui="pause"]'));
  await world(1380,680);await page.waitForFunction(()=>window.__XIAN_NI__.inspect().life.harvest.picking?.elapsed>.3);
  await tap(page.locator('.action-dock [data-ui="pause"]'));await page.waitForTimeout(120);const frozen=await visual();if(mobile){const a=await page.locator('.observation').boundingBox(),b=await page.locator('.pause-state.shown').boundingBox();assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,'Phone pause and observation must not overlap');}assert.ok(frozen.player.angle< -5);assert.equal(frozen.player.flipX,true);
  await page.waitForTimeout(700);assert.deepEqual((await visual()).player,frozen.player);await page.screenshot({path:`qa/evidence/presentation-${mobile?'phone':'desktop'}-gather.png`});
  await tap(page.locator('[data-ui="settings"]'));await page.locator('[data-setting="reduced"]').check();await tap(page.locator('[data-ui="close"]'));await page.waitForTimeout(100);assert.equal((await visual()).player.angle,0);
  await load('qa/evidence/life-hold-paused-input.json');const heldBefore=await state();assert.equal(heldBefore.paused,true,'Import must remain paused');await page.waitForTimeout(700);const heldAfter=await state();assert.equal(heldAfter.player.hold,heldBefore.player.hold,'Loading must not consume held time');assert.deepEqual(heldAfter.pending,heldBefore.pending);assert.equal(await page.getByRole('button',{name:'在驿中再坐一会儿',exact:true}).isVisible(),false,'Completed chapter must not reopen after load');if(!(await state()).paused)await tap(page.locator('.action-dock [data-ui="pause"]'));await page.waitForTimeout(200);
  const labels=(await visual()).labels.filter(l=>!l.id.startsWith('to_'));assert.ok(labels.length>=2);
  for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const a=labels[i].bounds,b=labels[j].bounds;assert.ok(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),`Overlapping labels: ${labels[i].id}/${labels[j].id}`);}
  await page.screenshot({path:`qa/evidence/presentation-${mobile?'phone':'desktop'}-labels.png`});report.checks.push({mobile,pose:frozen.player,pauseFrozen:true,reducedMotion:true,labels:labels.map(l=>l.id)});await context.close();
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.failure=String(e);console.error(e);process.exitCode=1;}finally{await browser.close();await writeFile('qa/evidence/presentation.json',JSON.stringify(report,null,2));}
console.log(JSON.stringify(report));

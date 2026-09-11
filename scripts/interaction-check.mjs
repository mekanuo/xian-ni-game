import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const evidence={checkedAt:new Date().toISOString(),input:[],errors:[],devices:[]};
try{
 for(const touch of [false,true]){
  const context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:720},...(touch?{deviceScaleFactor:3,isMobile:true,hasTouch:true}:{})});
  const page=await context.newPage();page.on('pageerror',e=>evidence.errors.push(e.message));
  const press=async selector=>{const l=page.locator(selector);if(touch)await l.tap();else await l.click();};
  const world=async(x,y)=>{const p=await page.evaluate(p=>window.__XIAN_NI__.screenPoint(p.x,p.y),{x,y});if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);};
  const state=()=>page.evaluate(()=>window.__XIAN_NI__.inspect());
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:4191/');await press('[data-ui="create"]');await page.getByRole('button',{name:'去回石驿',exact:true}).click();await page.waitForTimeout(450);
  await press('[data-ui="spell:pull"]');await world(320,650);await page.waitForTimeout(200);
  assert.equal((await state()).player.mana,6,'Invalid cast must not spend mana');
  await page.locator('[data-ui="cancel"]').waitFor({state:'visible',timeout:1500});
  await world(430,760);await page.waitForFunction(()=>window.__XIAN_NI__.inspect().player.pullId==='lamp');
  await world(573,677);await page.waitForFunction(()=>window.__XIAN_NI__.inspect().flags.lampFixed===true);
  await press('[data-ui="release"]');assert.equal((await state()).player.pullId,null);
  evidence.input.push({device:touch?'touch':'mouse',actions:'invalid pull remains aiming; tap lamp; near-anchor drop snaps to stand; release',mana:(await state()).player.mana});
  await press('[data-ui="observe"]');await page.locator('#observation-content').waitFor({state:'visible'});
  assert.match(await page.locator('#observation-content').textContent(),/灯|引环|溪道/);
  assert.equal((await state()).paused,false,'Optional observation must not change play/pause state');
  const panel=await page.locator('.observation').boundingBox(),dock=await page.locator('.action-dock').boundingBox();
  assert.ok(panel.y+panel.height<dock.y,'Observation must leave spell controls accessible');
  await page.screenshot({path:`qa/evidence/interaction-${touch?'phone':'desktop'}.png`});await press('[data-ui="observe"]');
  await press('.action-dock [data-ui="pause"]');await press('[data-ui="spell:flame"]');await world(420,710);
  assert.equal((await state()).pending?.type,'cast');const mana=(await state()).player.mana;
  await press('[data-ui="cancel"]');assert.equal((await state()).pending,null);
  await press('.action-dock [data-ui="pause"]');await page.waitForTimeout(700);assert.equal((await state()).player.mana,mana);assert.equal((await state()).projectiles.length,0);
  evidence.input.push({device:touch?'touch':'mouse',actions:'open/close observation; pause, queue flame, cancel, resume without casting'});
  await press('.action-dock [data-ui="pause"]');await press('[data-ui="spell:ward"]');await world(420,710);
  await press('.action-dock [data-ui="pause"]');await page.waitForFunction(()=>window.__XIAN_NI__.inspect().player.ward>0);
  assert.equal(await page.locator('[data-ui="cancel"]').count(),0,'Successful queued spell must finish aiming on resume');
  const beforeMove=(await state()).player;await world(300,710);await page.waitForFunction(p=>Math.hypot(window.__XIAN_NI__.inspect().player.x-p.x,window.__XIAN_NI__.inspect().player.y-p.y)>30,beforeMove);
  evidence.input.push({device:touch?'touch':'mouse',actions:'resume queued ward once, next world click moves normally'});
  if(!touch){
   await world(760,410);await page.waitForFunction(()=>window.__XIAN_NI__.inspect().dialogue?.id==='table',null,{timeout:30000});
   evidence.input.push({device:'mouse',actions:'click distant table; walk around stone obstruction; interact once',player:(await state()).player});
  }else{
   await page.setViewportSize({width:844,height:390});await page.waitForTimeout(400);await press('[data-ui="observe"]');
   const box=await page.locator('.observation').boundingBox(),bar=await page.locator('.action-dock').boundingBox();assert.ok(box.y+box.height<bar.y,'Landscape panel must not cover spell controls');await page.screenshot({path:'qa/evidence/interaction-landscape.png'});
   await press('[data-ui="settings"]');await press('[data-ui="restart"]');await page.getByRole('button',{name:'重新选择出身',exact:true}).click();await page.getByRole('button',{name:'去回石驿',exact:true}).click();
   assert.equal(await page.locator('[data-ui="observe"]').getAttribute('aria-expanded'),'false','Same-scene restart must reset observation to collapsed');
  }
  evidence.devices.push(touch?'Chrome DPR3 touch emulation, portrait and landscape':'Linux Chrome mouse, 1280×720');await context.close();
 }
 assert.deepEqual(evidence.errors,[]);await writeFile('qa/evidence/interaction.json',JSON.stringify(evidence,null,2));console.log('Interaction targeting, reachable approach, observation and touch cancellation PASS');
}finally{await browser.close();}

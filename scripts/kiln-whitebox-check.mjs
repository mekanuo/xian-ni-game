import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const url=process.env.GAME_URL||'http://127.0.0.1:4192/whitebox.html';
const report={status:'NOT_RUN',url,checkedAt:new Date().toISOString(),input:[],cases:[],errors:[],limitations:['Isolated target-engine geometry whitebox, not production art, save migration, NPC borrowing or a real inter-map connection.','Linux Chrome desktop input; physical Mac/Safari/phone untested.']};
let browser,page;
await mkdir('qa/whitebox',{recursive:true});
const log=(action,detail)=>{report.input.push({action,detail,wall:Date.now()});console.log(action,JSON.stringify(detail));};
const state=()=>page.evaluate(()=>window.__KILN__.inspect());
const screenPoint=point=>page.evaluate(p=>window.__KILN__.screenPoint(p.x,p.y),point);
async function clickWorld(point){const p=await screenPoint(point);assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,p),'CANVAS',`World input ${JSON.stringify(point)} must land on canvas`);await page.mouse.click(p.x,p.y);}
async function reset(preset){log('new-scenario',preset);await page.locator(`[data-preset="${preset}"]`).click();await page.locator('[data-action="overview"]').click();await page.waitForTimeout(100);const r=await state();assert.equal(r.preset,preset);assert.equal(r.state.player.hp,4);assert.equal(r.state.player.mana,preset==='zero'?0:6);assert.equal(r.eastReached,false);assert.equal(r.returned,false);}
async function walk(point){log('click-walk',point);await page.locator('[data-action="walk"]').click();await clickWorld(point);await page.waitForFunction(p=>{const r=window.__KILN__.inspect();return r.state.defeated||(Math.hypot(r.state.player.x-p.x,r.state.player.y-p.y)<18&&r.state.player.path.length===0);},point,{timeout:20000});const r=await state();assert.equal(r.state.defeated,false);}
async function keyboardWalk(point){
  log('keyboard-walk',point);const end=Date.now()+20000,held=new Set();
  try{while(Date.now()<end){const r=await state(),p=r.state.player;assert.equal(r.state.defeated,false,'Actual zero-resource walk must stay alive');const dx=point.x-p.x,dy=point.y-p.y;if(Math.hypot(dx,dy)<18)return;
    const next=new Set();if(Math.abs(dx)>9)next.add(dx>0?'d':'a');if(Math.abs(dy)>9)next.add(dy>0?'s':'w');
    for(const key of held)if(!next.has(key)){await page.keyboard.up(key);held.delete(key);}for(const key of next)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}await page.waitForTimeout(65);
  }throw Error(`Keyboard did not reach ${JSON.stringify(point)}`);}finally{for(const key of held)await page.keyboard.up(key);}
}
async function pause(){const r=await state();if(!r.state.paused)await page.locator('[data-action="pause"]').click();}
async function capture(name){await pause();const path=`qa/whitebox/${name}.png`;await page.screenshot({path});return path;}
async function cast(spell,point){log('cast',{spell,point});await page.locator(`[data-spell="${spell}"]`).click();await clickWorld(point);}
const screen=r=>r.state.worlds.home.find(e=>e.id==='shield_board');
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});page.on('pageerror',error=>report.errors.push(error.message));report.browser=await browser.version();
  await page.goto(url);await page.waitForFunction(()=>window.__KILN__);report.geometry=await page.evaluate(()=>window.__KILN__.geometry());
  await reset('ordinary');await walk({x:420,y:640});await page.waitForTimeout(1300);
  const covered=await state();assert.equal(covered.state.player.hp,4);assert.equal(covered.state.worlds.home.find(e=>e.id==='kiln_raider_a').state,'idle');
  const overview=await capture('retained-screen');
  const frozen=await state();await page.waitForTimeout(500);assert.deepEqual(await state(),frozen,'Pause freezes actual state');
  // A pointer-clicked button must not receive a second native Space activation.
  await page.keyboard.press('Space');await page.waitForTimeout(200);assert.equal((await state()).state.paused,false);assert.ok((await state()).state.time>frozen.state.time);
  report.cases.push({id:'retained-cover-and-pause',covered,visual:overview});

  await reset('ordinary');await walk({x:350,y:640});await cast('pull',{x:500,y:640});await page.waitForFunction(()=>window.__KILN__.inspect().state.player.pullId==='shield_board');
  log('reject-screen-corner-overlap',{x:580,y:610});await clickWorld({x:580,y:610});await page.waitForTimeout(120);
  const cornerRejected=await state();assert.ok(Math.hypot(screen(cornerRejected).x-500,screen(cornerRejected).y-640)<1);assert.equal(cornerRejected.state.player.pullId,'shield_board');
  log('move-screen',{x:620,y:700});await clickWorld({x:620,y:700});await page.waitForFunction(()=>{const e=window.__KILN__.inspect().state.worlds.home.find(e=>e.id==='shield_board');return Math.hypot(e.x-620,e.y-700)<3;});
  await page.locator('[data-action="release"]').click();const moved=await state();assert.equal(screen(moved).state,'idle');assert.equal(screen(moved).data.noiseUsed,true);assert.ok(moved.state.events.some(e=>e.type==='drop'));assert.equal(moved.state.player.mana,5);
  const movedVisual=await capture('moved-screen');report.cases.push({id:'real-pull-drop',cornerRejected,state:moved,visual:movedVisual});

  await reset('ordinary');await walk({x:350,y:640});await cast('flame',{x:500,y:640});await page.waitForFunction(()=>window.__KILN__.inspect().state.worlds.home.find(e=>e.id==='shield_board').state==='burning');
  const burning=await state();assert.equal(burning.state.player.mana,5);assert.ok(burning.state.events.some(e=>e.type==='fire'&&e.targetId==='shield_board'));
  await page.waitForFunction(()=>window.__KILN__.inspect().state.worlds.home.find(e=>e.id==='shield_board').state==='burned',null,{timeout:25000});
  await cast('pull',{x:500,y:640});await page.waitForTimeout(200);const burned=await state();assert.equal(screen(burned).state,'burned');assert.equal(burned.state.player.pullId,null);assert.equal(burned.state.player.mana,5);
  const burnedVisual=await capture('burned-screen');report.cases.push({id:'burn-permanent-after-pull-attempt',burning,state:burned,visual:burnedVisual});

  await reset('zero');const lower=[{x:360,y:700},{x:360,y:820},{x:800,y:820},{x:1030,y:820},{x:1220,y:820},{x:1220,y:540}];
  await keyboardWalk({x:200,y:500});
  for(const p of lower)await walk(p);const east=await state();assert.equal(east.eastReached,true);assert.equal(east.returned,false);assert.equal(east.state.player.mana,0);
  // The moved enemy changes the southern return; use the actual northern wall
  // route instead of forcing click navigation through its threat exclusion.
  for(const p of [{x:1290,y:540},{x:1290,y:140},{x:800,y:140},{x:360,y:170},{x:180,y:480}])await walk(p);
  const returned=await state();assert.equal(returned.returned,true);assert.equal(returned.state.player.mana,0);assert.ok(returned.state.player.hp>0);assert.equal(screen(returned).state,'idle');
  report.cases.push({id:'zero-resource-keyboard-and-click-round-trip',east,returned,visual:await capture('zero-return')});
  await page.locator('[data-action="restart"]').click();const restarted=await state();assert.equal(restarted.state.player.mana,0);assert.equal(restarted.state.player.hp,4);assert.equal(restarted.returned,false);assert.equal(restarted.eastReached,false);assert.ok(restarted.state.worlds.home.filter(e=>e.kind==='enemy').every(e=>e.hp===3&&e.state==='idle'));
  report.cases.push({id:'restart-preserves-zero-preset',state:restarted});
  assert.deepEqual(report.errors,[]);report.status='PASS';console.log('KILN WHITEBOX PASS');
}catch(error){report.status='FAIL';report.failure=String(error);console.error(error);if(page){report.failureState=await state().catch(()=>null);await page.screenshot({path:'qa/whitebox/failure.png'}).catch(()=>{});}process.exitCode=1;}
finally{await browser?.close();await writeFile('qa/whitebox/kiln.json',JSON.stringify(report,null,2));}

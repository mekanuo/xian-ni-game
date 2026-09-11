import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// All changes use production DOM, mouse or touch inputs. The debug surface is
// read-only: inspect() observes facts and screenPoint() converts coordinates.
// Camera framing uses the game's Shift-drag gesture, including on touch emulation.
// The phone's timed hold segment contains no pause, export or screenshot.
const url=process.env.GAME_URL||'http://127.0.0.1:4191/';
const fixturePath=process.env.CANAL_FIXTURE||'qa/fixtures/return-main-v0.3.0.json';
const output='qa/evidence/canal-revisit-check.json';
const evidence={schemaVersion:1,status:'NOT_RUN',startedAt:new Date().toISOString(),runId:'canal-revisit-041',environment:{url,platform:process.platform,limitation:'Linux Chrome desktop and 390×844 DPR3 touch emulation. Camera uses real Shift-mouse drag. No physical phone, Mac or Safari claim.'},routes:[],errors:[]};
const started=Date.now();
let browser,page,route,mobile=false;
await mkdir('qa/evidence',{recursive:true});
const persist=()=>writeFile(output,JSON.stringify(evidence,null,2));
const log=(action,detail={})=>{route.inputTrace.push({action,detail,wallMs:Date.now()-started});console.log(route.id,action,JSON.stringify(detail));};
const state=()=>page.evaluate(()=>window.__XIAN_NI__.inspect());
const wait=(predicate,arg,timeout=15000)=>page.waitForFunction(predicate,arg,{timeout,polling:'raf'});
const brief=s=>({scene:s.scene,time:s.time,player:s.player,canal:s.canal,life:s.life,flags:s.flags,paused:s.paused,dialogue:s.dialogue,ended:s.ended,defeated:s.defeated,events:s.events.slice(-8)});
async function button(selector){const locator=page.locator(selector);if(mobile)await locator.tap();else await locator.click();}
async function named(name){const locator=page.getByRole('button',{name,exact:true});if(mobile)await locator.tap();else await locator.click();}
async function dismissEnding(){const b=page.getByRole('button',{name:'在驿中再坐一会儿',exact:true});if(await b.isVisible()){log('close-original-ending');if(mobile)await b.tap();else await b.click();}}
async function resume(){
 await dismissEnding();let s=await state();assert.equal(s.defeated,false,'A route must succeed without rollback or injected recovery');
 if(s.dialogue){
  for(let n=0;n<12&&!s.dialogue.choices.some(c=>c.id==='leave');n++){assert.ok(s.dialogue.choices.some(c=>c.id==='more'),'No leave option in dialogue');await button('[data-ui="choice:more"]');s=await state();}
  await button('[data-ui="choice:leave"]');
 }
 if((await state()).paused)await button('.action-dock [data-ui="pause"]');
 await wait(()=>!window.__XIAN_NI__.inspect().paused);
}
async function pause(){if(!(await state()).paused)await button('.action-dock [data-ui="pause"]');await wait(()=>window.__XIAN_NI__.inspect().paused);}
async function frame(x,y){
 const view=mobile?{w:390,h:844,left:28,right:362,top:190,bottom:635,cx:195,cy:410}:{w:1440,h:900,left:60,right:1380,top:160,bottom:735,cx:720,cy:440};
 for(let attempt=0;attempt<10;attempt++){
  const p=await page.evaluate(({x,y})=>window.__XIAN_NI__.screenPoint(x,y),{x,y});
  // The bounded camera cannot lift every map-edge exit above the centre dock.
  // Side ground remains clickable lower down; verify actual DOM occlusion.
  if(p.x>=view.left&&p.x<=view.right&&p.y>=view.top&&p.y<view.h-30&&await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS',p))return p;
  const dx=Math.max(-view.w*.42,Math.min(view.w*.42,view.cx-p.x));
  const dy=Math.max(-250,Math.min(250,view.cy-p.y));
  await page.keyboard.down('Shift');
  try{await page.mouse.move(view.cx,view.cy);await page.mouse.down();await page.mouse.move(view.cx+dx,view.cy+dy,{steps:6});await page.mouse.up();}finally{await page.keyboard.up('Shift');}
  await page.waitForTimeout(110);log('camera-pan',{dx,dy});
 }
 throw Error(`Cannot frame world target ${x},${y} inside the input-safe viewport`);
}
async function tapWorld(x,y){const p=await frame(x,y);if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
async function object(id){const s=await state(),e=s.worlds[s.scene].find(e=>e.id===id);assert.ok(e,`Missing entity ${s.scene}/${id}`);return e;}
async function walk(x,y){
 await resume();log('walk',{x,y});await tapWorld(x,y);
 await wait(({x,y})=>{const s=window.__XIAN_NI__.inspect();return Math.hypot(s.player.x-x,s.player.y-y)<18&&s.player.path.length===0;},{x,y},60000);
 assert.equal((await state()).defeated,false);
}
async function interact(id){
 await resume();const e=await object(id),scene=(await state()).scene;log('interact',{scene,id,x:e.x,y:e.y});await tapWorld(e.x,e.y);
 await wait(({id,scene})=>{const s=window.__XIAN_NI__.inspect();if(s.scene!==scene||s.dialogue)return true;const e=s.worlds[s.scene].find(e=>e.id===id);return e&&Math.hypot(s.player.x-e.x,s.player.y-e.y)<100&&s.player.path.length===0;},{id,scene},60000);
}
async function choose(id){
 for(let i=0;i<12&&!(await state()).dialogue?.choices.some(c=>c.id===id);i++){
  assert.ok((await state()).dialogue?.choices.some(c=>c.id==='more'),`Missing choice ${id}`);await button('[data-ui="choice:more"]');
 }
 assert.ok((await state()).dialogue?.choices.some(c=>c.id===id&&!c.disabled),`Unavailable choice ${id}`);
 log('choose',id);await button(`[data-ui="choice:${id}"]`);await resume();
}
async function capture(id){
 await pause();if(!mobile)await page.mouse.move(1430,890);
 const visual=`qa/evidence/canal-${route.id}-${id}.png`;await page.screenshot({path:visual});route.observations[id]={visual,state:brief(await state())};log('capture',id);await persist();
}
async function exportSave(name){
 await pause();await button('[data-ui="settings"]');const promise=page.waitForEvent('download');await button('[data-ui="export"]');const download=await promise;
 const file=`qa/evidence/${name}`;await download.saveAs(file);await button('[data-ui="close"]');const bytes=await readFile(file);route.exports.push({path:file,sha256:createHash('sha256').update(bytes).digest('hex')});log('export-through-settings',file);
 return bytes;
}

try{
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 for(mobile of [false,true]){
  route={id:mobile?'revisit-phone':'revisit-desktop',inputTrace:[],observations:{},exports:[]};evidence.routes.push(route);
  page=await browser.newPage({viewport:{width:mobile?390:1440,height:mobile?844:900},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile});
  page.on('pageerror',e=>evidence.errors.push(e.message));
  await page.goto(url);await named('入 山');await named('去回石驿');
  await button('[data-ui="settings"]');await page.locator('#import-save').setInputFiles('qa/evidence/canal-desktop-diversion-complete-export.json');
  await wait(()=>window.__XIAN_NI__?.inspect().canal.stage==='complete');await resume();
  await interact('table');assert.ok(!(await state()).dialogue.choices.some(c=>c.id==='canal:record'));await resume();
  await button('[data-ui="observe"]');
  assert.match(await page.locator('.observation').innerText(),/旧渠小图/);
  assert.doesNotMatch(await page.locator('.observation').innerText(),/接信|亲手添图/);await capture('recorded-table');await button('[data-ui="observe"]');
  await interact('to_creek');await choose('canal:depart:canal');await wait(()=>window.__XIAN_NI__.inspect().scene==='canal');
  await walk(500,700);await walk(600,430);await interact('canal_diverter');
  await wait(()=>window.__XIAN_NI__.inspect().worlds.canal.find(e=>e.id==='canal_diverter').x===680&&!window.__XIAN_NI__.inspect().canal.work);
  await capture('water-diverted');assert.equal((await state()).canal.stage,'complete');
  assert.match(await page.locator('.location p').innerText(),/复位/);
  await interact('canal_diverter');await wait(()=>window.__XIAN_NI__.inspect().canal.flow===3);
  await page.waitForFunction(()=>document.querySelector('.location p')?.textContent.includes('桌边'));assert.match(await page.locator('.location p').innerText(),/桌边/);await capture('water-restored');
  await walk(500,700);await interact('canal_tub');assert.equal((await state()).canal.stage,'complete');
  await interact('canal_to_home');await wait(()=>window.__XIAN_NI__.inspect().scene==='home');await interact('table');
  assert.ok(!(await state()).dialogue.choices.some(c=>c.id==='canal:record'));route.status='PASS';await persist();await page.close();page=null;
 }
 assert.deepEqual(evidence.errors,[]);evidence.status='PASS';
}catch(e){evidence.status='FAIL';evidence.failure=String(e);console.error(e);process.exitCode=1;if(page)evidence.failureState=await state().catch(()=>null);if(page)await page.screenshot({path:'qa/evidence/revisit-failure.png'}).catch(()=>{});}
finally{await browser?.close();await persist();}

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
const output='qa/evidence/canal-check.json';
const evidence={schemaVersion:1,status:'NOT_RUN',startedAt:new Date().toISOString(),runId:'canal-two-methods-real-input',environment:{url,platform:process.platform,limitation:'Linux Chrome desktop and 390×844 DPR3 touch emulation. Camera uses real Shift-mouse drag. No physical phone, Mac or Safari claim.'},routes:[],errors:[]};
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
async function importFixture(bytes){
 await page.goto(url);await named('入 山');await named('去回石驿');await wait(()=>window.__XIAN_NI__?.inspect().scene==='home');
 await button('[data-ui="settings"]');await page.locator('#import-save').setInputFiles({name:'return-main-v0.3.0.json',mimeType:'application/json',buffer:bytes});
 await wait(()=>window.__XIAN_NI__.inspect().flags.endingWish==='travel');await dismissEnding();await resume();
 const s=await state();assert.equal(s.contentVersion,7);assert.deepEqual(Object.keys(s.worlds).sort(),['canal','creek','crossing','home','kiln','market','spar','workshop']);assert.equal(s.scene,'home');assert.equal(s.canal.stage,'unaccepted');assert.equal(s.life.clamp,'unowned');assert.equal(s.life.sachets,0);assert.equal(JSON.parse(s.checkpoint).contentVersion,7);route.observations.import=brief(s);
}
async function enterCanal(){
 await interact('table');await choose('canal:accept');assert.equal((await state()).canal.stage,'active');
 await interact('to_creek');await choose('canal:depart:canal');await wait(()=>window.__XIAN_NI__.inspect().scene==='canal');
 await wait(()=>{const a=window.__XIAN_NI__.audio();return a.scene==='canal'&&a.musicRms>.002;});
 route.observations.canalAudio=await page.evaluate(()=>window.__XIAN_NI__.audio());assert.equal(route.observations.canalAudio.error,'');
 await capture('entry');await walk(500,700);await interact('canal_inspect');assert.equal((await state()).canal.inspected,true);await capture('inspection');await resume();
}
async function verifyAndReturn(method){
 await wait(()=>window.__XIAN_NI__.inspect().canal.flow>=3);await walk(900,780);await interact('canal_tub');
 await wait(()=>window.__XIAN_NI__.inspect().canal.stage==='verified');assert.equal((await object('canal_rest_mid')).state,'idle');await capture('water-restored');
 await interact('canal_keeper');await choose('canal:report');assert.equal((await state()).canal.stage,'ready');
 await exportSave(`canal-${route.id}-verified-input.json`);await interact('canal_to_home');await wait(()=>window.__XIAN_NI__.inspect().scene==='home');
 await interact('table');await choose('canal:record');const done=await state();assert.equal(done.canal.stage,'complete');assert.equal(done.canal.method,method);assert.equal(done.ended,true);assert.equal(done.life.clamp,'unowned');assert.equal(done.life.sachets,0);assert.equal(done.player.hp,route.initialHp);
 await capture('home-map');await exportSave(`canal-${route.id}-complete-export.json`);
 // A second real table visit must show history without offering a duplicate reward.
 await interact('table');assert.ok(!(await state()).dialogue.choices.some(c=>c.id==='canal:record'));await resume();
 route.final=brief(await state());route.status='PASS';await persist();
}
async function restartProof(){
 await button('[data-ui="settings"]');await button('[data-ui="restart"]');await button('[data-ui="create"]');await named('去回石驿');
 await wait(()=>{const s=window.__XIAN_NI__.inspect();return s.scene==='home'&&!s.ended&&s.canal.stage==='unaccepted';});
 const fresh=await state();assert.equal(fresh.canal.cleared,false);assert.equal(fresh.life.clamp,'unowned');assert.equal(fresh.life.sachets,0);assert.equal(fresh.worlds.canal.find(e=>e.id==='canal_diverter').x,600);assert.equal(fresh.worlds.canal.find(e=>e.id==='canal_stop').x,1280);
 route.restart={input:'settings → restart confirmation → new profile',state:brief(fresh)};await persist();
}
async function emptyMana(){
 await walk(980,720);
 while((await state()).player.mana>0){
  await wait(()=>{const s=window.__XIAN_NI__.inspect();return !s.flags.casting&&s.player.cooldown<=0;});
  const before=(await state()).player.mana;log('spend-mana-with-real-fireball',{before,target:{x:1110,y:900}});
  await button('[data-ui="spell:flame"]');await tapWorld(1110,900);await wait(before=>window.__XIAN_NI__.inspect().player.mana===before-1,before);
 }
 await wait(()=>!window.__XIAN_NI__.inspect().flags.casting);assert.equal((await state()).player.mana,0);
}
async function diversionRoute(bytes){
 mobile=false;route={id:'desktop-diversion',status:'RUNNING',viewport:{width:1440,height:900,deviceScaleFactor:1},inputTrace:[],observations:{},exports:[]};evidence.routes.push(route);
 page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});page.on('pageerror',e=>evidence.errors.push({route:route.id,message:e.message}));
 await importFixture(bytes);route.initialHp=(await state()).player.hp;await emptyMana();await enterCanal();await exportSave('canal-ready-input.json');
 await walk(560,430);await interact('canal_diverter');await wait(()=>window.__XIAN_NI__.inspect().canal.work?.kind==='divert');await capture('diverter-work');await resume();
 await wait(()=>{const s=window.__XIAN_NI__.inspect();return !s.canal.work&&s.worlds.canal.find(e=>e.id==='canal_diverter').x===680&&s.canal.drain===1;});
 await capture('diverter-set');
 // The side stepping path is wet now; use the permanent west bank, then approach the dry screen.
 await walk(880,430);await walk(990,540);await interact('canal_screen');await wait(()=>window.__XIAN_NI__.inspect().canal.work?.kind==='clear');
 await capture('screen-work');await resume();await wait(()=>window.__XIAN_NI__.inspect().canal.cleared);assert.equal((await state()).canal.method,'diversion');
 // Xu waits at the west bank (990,540); use clear north-bank ground on return.
 await walk(1130,420);await walk(880,430);await interact('canal_diverter');await wait(()=>window.__XIAN_NI__.inspect().canal.work?.kind==='restore');
 await wait(()=>!window.__XIAN_NI__.inspect().canal.work&&window.__XIAN_NI__.inspect().worlds.canal.find(e=>e.id==='canal_diverter').x===600);
 await verifyAndReturn('diversion');assert.equal((await state()).player.mana,0);route.zeroResourceCompletion=true;await persist();await restartProof();await page.close();page=null;
}
async function holdRoute(bytes){
 mobile=true;route={id:'phone-hold',status:'RUNNING',viewport:{width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true},inputTrace:[],observations:{},exports:[]};evidence.routes.push(route);
 page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,acceptDownloads:true});page.on('pageerror',e=>evidence.errors.push({route:route.id,message:e.message}));
 await importFixture(bytes);route.initialHp=(await state()).player.hp;
 await interact('workbench');await choose('hold');assert.equal((await state()).ringStyle,'hold');await interact('rest_home');assert.equal((await state()).player.mana,6);
 await enterCanal();await walk(1000,380);
 // 1230,410 is the interactive fixed eye, so it cannot be a ground-tap target.
 // This nearby clear bank point is reached by a genuine ground touch.
 await walk(1270,420);await capture('stop-bank');await exportSave('canal-hold-ready-input.json');await resume();
 // Restore normal player-centred framing before the uninterrupted timed attempt.
 await button('[data-ui="center"]');await page.waitForTimeout(250);
 const stop=await object('canal_stop');await button('[data-ui="spell:pull"]');await tapWorld(stop.x,stop.y);await wait(()=>window.__XIAN_NI__.inspect().player.pullId==='canal_stop');
 await tapWorld(1200,350);await wait(()=>Math.abs(window.__XIAN_NI__.inspect().worlds.canal.find(e=>e.id==='canal_stop').x-1200)<3);
 await button('[data-ui="hold"]');await wait(()=>window.__XIAN_NI__.inspect().player.hold>0);
 const began=await state(),wallStart=Date.now(),traceStart=route.inputTrace.length;log('timed-hold-start',{time:began.time,hold:began.player.hold,player:{x:began.player.x,y:began.player.y}});
 await wait(()=>window.__XIAN_NI__.inspect().canal.drain===1);
 const screen=await object('canal_screen');await tapWorld(screen.x,screen.y);await wait(()=>window.__XIAN_NI__.inspect().canal.work?.kind==='clear');
 const working=await state();route.observations.uninterruptedWork={time:working.time,hold:working.player.hold,work:working.canal.work,player:{x:working.player.x,y:working.player.y}};
 await wait(()=>window.__XIAN_NI__.inspect().canal.cleared);await tapWorld(1130,420);
 await wait(()=>{const s=window.__XIAN_NI__.inspect();return Math.hypot(s.player.x-1130,s.player.y-420)<18&&s.player.path.length===0;});
 const safe=await state();assert.equal(safe.canal.method,'hold');assert.equal(safe.canal.surge,null);assert.equal(safe.player.hp,route.initialHp);assert.ok(safe.player.hold>=1.5,`Phone safe-bank hold margin ${safe.player.hold.toFixed(3)}s is below 1.5s`);
 route.observations.holdWindow={startModelTime:began.time,safeModelTime:safe.time,activeModelSeconds:safe.time-began.time,wallMs:Date.now()-wallStart,remainingSeconds:safe.player.hold,start:brief(began),safe:brief(safe),pausedDuringTimedSegment:false,inputTrace:route.inputTrace.slice(traceStart)};
 log('timed-hold-safe-bank',{remaining:safe.player.hold,activeSeconds:safe.time-began.time});
 await button('[data-ui="release"]');await wait(()=>window.__XIAN_NI__.inspect().player.pullId===null);assert.equal((await object('canal_stop')).x,1280);
 await capture('screen-cleared');await resume();await verifyAndReturn('hold');await restartProof();await page.close();page=null;
}

try{
 let bytes,source='working tree';
 try{bytes=await readFile(fixturePath);}catch(error){
  if(process.env.CANAL_FIXTURE||error.code!=='ENOENT')throw error;
  bytes=(await promisify(execFile)('git',['show',`HEAD:${fixturePath}`],{encoding:'buffer',maxBuffer:2500000})).stdout;source='tracked HEAD sparse-checkout fallback';
 }
 const legacy=JSON.parse(bytes.toString('utf8'));assert.equal(legacy.scene,'home');assert.equal(legacy.ended,true);assert.equal(legacy.flags.route,'main');assert.equal(legacy.ringStyle,'long');assert.equal(legacy.contentVersion,2);
 evidence.fixture={path:fixturePath,source,sha256:createHash('sha256').update(bytes).digest('hex'),origin:'Unmodified real main-route 0.3.0 UI export'};
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});evidence.environment.browser=await browser.version();
 const selected=process.env.CANAL_ROUTE||'all';assert.ok(['all','desktop','phone'].includes(selected));evidence.routeSelection=selected;
 if(selected!=='phone')await diversionRoute(bytes);if(selected!=='desktop')await holdRoute(bytes);assert.deepEqual(evidence.errors,[]);evidence.status='PASS';evidence.completedAt=new Date().toISOString();await persist();console.log(`CANAL REAL INPUT PASS (${selected})`);
}catch(error){
 evidence.status='FAIL';evidence.failure=String(error);if(route)route.status='FAIL';console.error(error);
 if(page){evidence.failureState=brief(await state().catch(()=>({events:[]})));await page.screenshot({path:'qa/evidence/canal-failure.png'}).catch(()=>{});}
 await persist();process.exitCode=1;
}finally{await browser?.close();}

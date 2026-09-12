import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Only real production UI/canvas inputs mutate the game. inspect/screenPoint
// observe it. No act(), injected progress, fake passage, or hidden teleports.
// Main leadership runs never pause, export, screenshot or open dialogue.
// Pause/save coverage uses a separate page and a real preparatory UI export.
const url=process.env.GAME_URL||'http://127.0.0.1:4191/';
const selection=process.env.JOURNEY_ROUTE||'all';assert.ok(['desktop','phone','all'].includes(selection));
const fixturePath=process.env.JOURNEY_FIXTURE||'qa/fixtures/return-canal-v0.4.0.json';
const pauseOnly=process.env.JOURNEY_PHASE==='pause',entryOnly=process.env.JOURNEY_PHASE==='entry';
const output=entryOnly?'qa/evidence/journey-entry-check.json':pauseOnly?'qa/evidence/journey-pause-check.json':'qa/evidence/journey-check.json';
const evidence={schemaVersion:1,status:'NOT_RUN',startedAt:new Date().toISOString(),selection,phase:entryOnly?'entry-only':pauseOnly?'pause-only':'complete',environment:{url,platform:process.platform,limitation:'Linux Chrome desktop and 390×844 DPR3 touch emulation; real Shift-mouse camera dragging on both. No physical phone/Mac/Safari claim.'},routes:[],errors:[]};
let browser,page,route,mobile=false;
const started=Date.now();
await mkdir('qa/evidence',{recursive:true});
const persist=()=>writeFile(output,JSON.stringify(evidence,null,2));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const log=(action,detail={})=>{route.inputTrace.push({action,detail,wallMs:Date.now()-started});console.log(route.id,action,JSON.stringify(detail));};
const state=()=>page.evaluate(()=>window.__XIAN_NI__.inspect());
const wait=(fn,arg,timeout=15000)=>page.waitForFunction(fn,arg,{timeout,polling:'raf'});
const brief=s=>({scene:s.scene,time:s.time,player:s.player,journey:s.journey,canal:s.canal,life:s.life,companion:s.flags.companion,ended:s.ended,paused:s.paused,dialogue:s.dialogue,defeated:s.defeated,events:s.events.slice(-6)});
async function button(selector){const b=page.locator(selector);await b.waitFor({state:'visible'});if(mobile)await b.tap();else await b.click();}
async function named(name){const b=page.getByRole('button',{name,exact:true});if(mobile)await b.tap();else await b.click();}
async function dismissEnding(){const b=page.getByRole('button',{name:'在驿中再坐一会儿',exact:true});if(await b.isVisible()){if(mobile)await b.tap();else await b.click();log('dismiss-original-ending');}}
async function collapseObservation(){
 const b=page.locator('[data-ui="observe"]');
 if(await b.count()&&await b.getAttribute('aria-expanded')==='true'){
  await button('[data-ui="observe"]');await page.waitForFunction(()=>document.querySelector('[data-ui="observe"]')?.getAttribute('aria-expanded')==='false');await page.waitForTimeout(140);log('collapse-observation-before-world-input');
 }
}
async function resume(){
 await dismissEnding();let s=await state();assert.equal(s.defeated,false);
 if(s.dialogue){
  for(let n=0;n<12&&!s.dialogue.choices.some(c=>c.id==='leave');n++){assert.ok(s.dialogue.choices.some(c=>c.id==='more'),'Dialogue must expose a leave path');await button('[data-ui="choice:more"]');s=await state();}
  await button('[data-ui="choice:leave"]');await wait(()=>!window.__XIAN_NI__.inspect().dialogue);
 }
 if((await state()).paused)await button('.action-dock [data-ui="pause"]');
 await wait(()=>!window.__XIAN_NI__.inspect().paused);await collapseObservation();
}
async function pause(){if(!(await state()).paused)await button('.action-dock [data-ui="pause"]');await wait(()=>window.__XIAN_NI__.inspect().paused);}
async function frame(x,y){
 await collapseObservation();const view=mobile?{w:390,h:844,cx:195,cy:430}:{w:1440,h:900,cx:720,cy:440};
 for(let attempt=0;attempt<9;attempt++){
  const p=await page.evaluate(({x,y})=>window.__XIAN_NI__.screenPoint(x,y),{x,y});
  if(p.x>18&&p.x<view.w-18&&p.y>135&&p.y<view.h-25&&await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS',p))return p;
  const origin=await page.evaluate(({cx,cy})=>[{x:cx,y:cy},{x:cx,y:cy-90},{x:cx,y:cy+90},{x:cx-65,y:cy},{x:cx+65,y:cy}].find(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS'),view);
  assert.ok(origin,'A real canvas pan origin must be unobstructed by DOM');
  const dx=Math.max(-view.w*.4,Math.min(view.w*.4,view.cx-p.x)),dy=Math.max(-240,Math.min(240,view.cy-p.y));
  await page.keyboard.down('Shift');
  try{await page.mouse.move(origin.x,origin.y);await page.mouse.down();await page.mouse.move(Math.max(8,Math.min(view.w-8,origin.x+dx)),Math.max(140,Math.min(view.h-80,origin.y+dy)),{steps:6});await page.mouse.up();}finally{await page.keyboard.up('Shift');}
  await page.waitForTimeout(120);log('camera-shift-drag',{origin,dx,dy});
 }
 throw Error(`World target ${x},${y} cannot be framed on unobstructed canvas`);
}
async function worldTap(x,y){
 const p=await frame(x,y);
 const before=await page.evaluate(()=>({state:window.__XIAN_NI__.inspect(),camera:window.__XIAN_NI__.camera(),audioScene:window.__XIAN_NI__.audio().scene,actors:window.__XIAN_NI__.presentation().actors.map(a=>a.id)}));
 log('world-input-projection',{intended:{x,y},screen:p,scene:before.state.scene,player:before.state.player,camera:before.camera,audioScene:before.audioScene,actors:before.actors});
 if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
 const observed=await page.evaluate(()=>window.__journeyPointerTrace.splice(0));log('actual-pointer-events',observed);
}
async function entity(id){const s=await state(),e=s.worlds[s.scene].find(e=>e.id===id);assert.ok(e,`Missing ${s.scene}/${id}`);return e;}
async function walk(x,y){await resume();log('walk',{x,y});await worldTap(x,y);await wait(({x,y})=>{const s=window.__XIAN_NI__.inspect();return Math.hypot(s.player.x-x,s.player.y-y)<18&&s.player.path.length===0;},{x,y},60000);assert.equal((await state()).defeated,false);}
async function interact(id){
 await resume();const e=await entity(id),scene=(await state()).scene;log('interact',{id,scene,world:{x:e.x,y:e.y}});await worldTap(e.x,e.y);
 await wait(({id,scene})=>{const s=window.__XIAN_NI__.inspect();if(s.scene!==scene||s.dialogue)return true;const e=s.worlds[s.scene].find(e=>e.id===id);return e&&Math.hypot(s.player.x-e.x,s.player.y-e.y)<100&&s.player.path.length===0;},{id,scene},60000);
}
async function choose(id){
 for(let n=0;n<12&&!(await state()).dialogue?.choices.some(c=>c.id===id);n++){assert.ok((await state()).dialogue?.choices.some(c=>c.id==='more'),`Missing choice ${id}`);await button('[data-ui="choice:more"]');}
 assert.ok((await state()).dialogue?.choices.some(c=>c.id===id&&!c.disabled),`Unavailable choice ${id}`);
 log('choose',id);await button(`[data-ui="choice:${id}"]`);await wait(()=>!window.__XIAN_NI__.inspect().dialogue);await resume();
}
async function exportSave(name){
 await pause();await button('[data-ui="settings"]');const promise=page.waitForEvent('download');await button('[data-ui="export"]');const download=await promise,path=`qa/evidence/${name}`;await download.saveAs(path);await button('[data-ui="close"]');
 const bytes=await readFile(path);route.exports.push({path,sha256:hash(bytes)});log('settings-export',path);return bytes;
}
async function importSave(bytes,name,{fresh=false,continuation=false}={}){
 if(fresh){await page.goto(url);await named('入 山');await named('去回石驿');await wait(()=>window.__XIAN_NI__?.inspect().scene==='home');}
 await button('[data-ui="settings"]');await page.locator('#import-save').setInputFiles({name,mimeType:'application/json',buffer:bytes});
 await wait(continuation=>{const s=window.__XIAN_NI__.inspect();return s.contentVersion===7&&s.canal.stage==='complete'&&(!continuation||s.scene==='workshop'&&s.journey.stage==='active');},continuation);
 assert.deepEqual(Object.keys((await state()).worlds).sort(),['canal','creek','crossing','home','kiln','market','spar','workshop']);
 await page.waitForTimeout(160);await dismissEnding();log('settings-import',{name,contentVersion:(await state()).contentVersion});
}
async function capture(id){await pause();if(!mobile)await page.mouse.move(1430,890);const path=`qa/evidence/journey-${route.id}-${id}.png`;await page.screenshot({path});route.observations[id]={visual:path,state:brief(await state())};await persist();}
async function newPage(){
 const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?3:1,isMobile:mobile,hasTouch:mobile,acceptDownloads:true});
 await p.addInitScript(()=>{
  window.__journeyPointerTrace=[];window.__journeyRenderGaps=[];
  window.addEventListener('click',()=>{
   const api=window.__XIAN_NI__;if(!api)return;const s=api.inspect(),audioScene=api.audio().scene;
   if(s.scene!==audioScene)window.__journeyRenderGaps.push({scene:s.scene,audioScene,camera:api.camera(),actors:api.presentation().actors.map(a=>a.id),point:api.screenPoint(1640,370),time:s.time});
  });
  for(const type of ['pointerdown','pointerup'])window.addEventListener(type,event=>{
   if(!window.__XIAN_NI__)return;
   const api=window.__XIAN_NI__,s=api.inspect(),o=api.screenPoint(0,0),unit=api.screenPoint(1,0),zoom=unit.x-o.x;
   window.__journeyPointerTrace.push({type,screen:{x:event.clientX,y:event.clientY},world:{x:(event.clientX-o.x)/zoom,y:(event.clientY-o.y)/zoom},scene:s.scene,player:s.player,time:s.time,camera:api.camera(),audioScene:api.audio().scene});
  },true);
 });
 const routeId=route.id;p.on('pageerror' ,e=>evidence.errors.push({route:routeId,message:e.message}));return p;
}
async function prepare(bytes){
 await importSave(bytes,'return-canal-v0.4.0.json',{fresh:true});await resume();let s=await state();assert.equal(s.journey.stage,'unaccepted');assert.equal(JSON.parse(s.checkpoint).contentVersion,7);route.initial={hp:s.player.hp,mana:s.player.mana,clamp:s.life.clamp,sachets:s.life.sachets,companion:s.flags.companion};
 await interact('table');await choose('journey:agree:together');assert.equal((await state()).journey.run,null);
 // The agreement itself never recruits or wipes previous refusal.
 if((await state()).flags.companion!=='following'){await interact('xu');await choose('invite');}
 await interact('to_creek');await choose('canal:depart:creek');await wait(()=>window.__XIAN_NI__.inspect().scene==='creek');
 await interact('to_workshop');await wait(()=>window.__XIAN_NI__.inspect().scene==='workshop');
 if(entryOnly){route.renderGaps=await page.evaluate(()=>window.__journeyRenderGaps);route.entry=brief(await state());return null;}
 // Avoid the north-mark hitbox at (320,285) and the rest at (1450,700).
 await walk(300,340);await walk(1600,330);await walk(1600,720);await walk(1440,780);
 await wait(()=>{const s=window.__XIAN_NI__.inspect(),n=s.worlds.workshop.find(e=>e.id==='xu_work');return Math.hypot(n.x-1440,n.y-720)<=90;},undefined,60000);
 await capture('departure');const ready=await exportSave(mobile?'journey-phone-ready-input.json':'journey-ready-input.json');await resume();await collapseObservation();
 return ready;
}
function entityHit(s,p){
 // Leave room for camera tracking between observing coordinates and delivering touch input.
 const margin=28;
 return s.worlds[s.scene].filter(e=>!['taken','gone','hidden'].includes(e.state)&&e.kind!=='scenery'&&!(e.id==='lamp'&&s.flags.lampFixed)).some(e=>Math.hypot(e.x-p.x,(e.y-p.y)*.9)<Math.max(34,Math.max(e.w,e.h)*.65)+margin||Math.abs(e.x-p.x)<e.w*.6+margin&&p.y<e.y+margin&&p.y>e.y-e.h-margin);
}
function followGround(s,n){
 // Clicking Xu herself is a dialogue action, so click real ground behind her.
 // >62 units also avoids the tall sprite's above-foot hit area on southbound legs.
 const facing=n.state==='leading'?n.facing:Math.atan2(n.y-s.player.y,n.x-s.player.x);
 for(const back of [80,95,65])for(const side of [0,35,-35,55,-55]){
  const p={x:n.x-Math.cos(facing)*back-Math.sin(facing)*side,y:n.y-Math.sin(facing)*back+Math.cos(facing)*side};
  if(p.x>25&&p.x<1775&&p.y>25&&p.y<1075&&!entityHit(s,p))return p;
 }
 throw Error('No clear near-leader ground tap; do not click NPC and hide the resulting pause');
}
async function followLeader(){
 await interact('xu_work');await choose('journey:start:together:north');
 const began=await state(),beginNpc=began.worlds.workshop.find(e=>e.id==='xu_work'),wallStart=Date.now();
 assert.ok(began.journey.run);assert.equal(began.journey.run.playerGate,false);assert.equal(began.journey.run.companionGate,false);
 const samples=[];let last={x:beginNpc.x,y:beginNpc.y,time:began.time},moved=0,waitSamples=0;
 log('continuous-leadership-start',{player:began.player,npc:beginNpc,run:began.journey.run});
 while(true){
  const loopStart=Date.now(),s=await state(),n=s.worlds.workshop.find(e=>e.id==='xu_work');
  assert.equal(s.scene,'workshop');assert.equal(s.paused,false,'Continuous leadership must not be paused');assert.equal(s.dialogue,null,'A following ground tap must not open NPC dialogue');assert.equal(s.defeated,false);
  const step=Math.hypot(n.x-last.x,n.y-last.y),elapsed=s.time-last.time;assert.ok(step<=145*elapsed+1,`NPC jumped ${step} over ${elapsed}s`);moved+=step;last={x:n.x,y:n.y,time:s.time};
  if(s.journey.run.waiting)waitSamples++;
  samples.push({wallMs:Date.now()-wallStart,time:s.time,player:{x:s.player.x,y:s.player.y,path:s.player.path.length},npc:{x:n.x,y:n.y,state:n.state},run:{...s.journey.run},gap:Math.hypot(s.player.x-n.x,s.player.y-n.y)});
  if(Math.hypot(n.x-220,n.y-780)<30&&s.journey.run.companionGate)break;
  assert.ok(Date.now()-wallStart<60000,'Northern leadership must finish within the 60s real-input budget');
  if(Math.hypot(s.player.x-n.x,s.player.y-n.y)>95){const target=followGround(s,n);log('follow-with-ground-input',{target,npc:{x:n.x,y:n.y},player:{x:s.player.x,y:s.player.y}});await worldTap(target.x,target.y);}
  await page.waitForTimeout(Math.max(20,400-(Date.now()-loopStart)));
 }
 // Xu stands near (220,780); touching that point would open a conversation.
 // This empty ground is within the actual exit-meeting radius and outside her hitbox.
 await worldTap(270,805);const tapped=await state();log('meeting-ground-tap',{intended:{x:270,y:805},actualPathEnd:tapped.player.path.at(-1)??null,player:{x:tapped.player.x,y:tapped.player.y}});
 // Continuous camera tracking can shift a delivered touch from the sampled
 // screen coordinate. The designed outcome is the actual 75-unit meeting,
 // not sub-pixel accuracy at one arbitrary ground point inside that area.
 await wait(()=>{const s=window.__XIAN_NI__.inspect();return Math.hypot(s.player.x-220,s.player.y-780)<=75&&s.player.path.length===0&&s.journey.run?.playerGate&&s.journey.run?.companionGate&&!s.paused&&!s.dialogue;},undefined,60000);
 const safe=await state(),endNpc=safe.worlds.workshop.find(e=>e.id==='xu_work');assert.equal(safe.paused,false);assert.equal(safe.dialogue,null);assert.equal(safe.journey.run.playerGate,true);assert.equal(safe.journey.run.companionGate,true);assert.ok(moved>1800,`Only ${moved} actual NPC travel was observed`);assert.ok(Math.hypot(safe.player.x-220,safe.player.y-780)<=75);assert.ok(Math.hypot(endNpc.x-220,endNpc.y-780)<=75);
 route.observations.leadership={paused:false,exportedDuring:false,screenshotsDuring:false,wallMs:Date.now()-wallStart,modelSeconds:safe.time-began.time,npcObservedDistance:moved,distanceWaitingSamples:waitSamples,start:brief(began),finalMeeting:{player:{x:safe.player.x,y:safe.player.y},npc:{x:endNpc.x,y:endNpc.y},run:safe.journey.run},samples};
 // Leave using a real target click without resume() masking a surprise pause.
 const exit=await entity('to_creek');await worldTap(exit.x,exit.y);await wait(()=>window.__XIAN_NI__.inspect().scene==='creek',undefined,60000);assert.equal((await state()).journey.sharedRoute,'north');assert.equal((await state()).journey.restOpened,false);log('continuous-leadership-complete',{moved,seconds:safe.time-began.time});await persist();
}
async function finishReturn(){
 await capture('creek-arrival');await interact('shelter');await choose('journey:rest');let s=await state();assert.equal(s.journey.stage,'ready');assert.equal(s.worlds.creek.find(e=>e.id==='journey_rest_shelter').state,'idle');await capture('shelter-rest');
 await interact('to_home');await wait(()=>window.__XIAN_NI__.inspect().scene==='home');await interact('table');await choose('journey:record');
 s=await state();assert.equal(s.journey.stage,'complete');assert.equal(s.journey.sharedRoute,'north');assert.equal(s.journey.recordedShared,true);assert.equal(s.canal.stage,'complete');assert.equal(s.player.mana,route.initial.mana);assert.equal(s.player.hp,route.initial.hp);assert.equal(s.life.clamp,route.initial.clamp);assert.equal(s.life.sachets,route.initial.sachets);
 await capture('home-map');await exportSave(mobile?'journey-phone-complete-export.json':'journey-complete-export.json');
 await interact('table');const table=await state();assert.ok(!table.dialogue.choices.some(c=>c.id==='journey:record'));
 for(let n=0;n<12&&(await state()).dialogue.choices.some(c=>c.id==='more');n++){await button('[data-ui="choice:more"]');assert.ok(!(await state()).dialogue.choices.some(c=>c.id==='journey:record'));}
 await resume();assert.equal((await state()).journey.recordedShared,true);route.completed=brief(await state());
 await button('[data-ui="settings"]');await button('[data-ui="restart"]');await button('[data-ui="create"]');await named('去回石驿');
 await wait(()=>{const s=window.__XIAN_NI__.inspect();return s.scene==='home'&&!s.ended&&s.journey.stage==='unaccepted';});
 const fresh=await state();assert.equal(fresh.journey.run,null);assert.equal(fresh.journey.sharedRoute,null);assert.equal(fresh.journey.restOpened,false);assert.equal(fresh.worlds.creek.find(e=>e.id==='journey_rest_shelter').state,'hidden');assert.equal(fresh.canal.stage,'unaccepted');route.restart=brief(fresh);await persist();
}
async function separatePauseSave(ready){
 await page.close();page=await newPage();await importSave(ready,'journey-ready-input.json',{fresh:true,continuation:true});await resume();await interact('xu_work');await choose('journey:start:together:north');
 const startNpc=await entity('xu_work'),starting=await state(),pauseRect=await page.locator('.action-dock [data-ui="pause"]').boundingBox();assert.ok(pauseRect);
 // Real UI latency can let Xu reach her distance wait before choose() returns.
 // Follow with a ground input before sampling a moving pose for the pause export.
 const nearLeader=followGround(starting,startNpc);await worldTap(nearLeader.x,nearLeader.y);
 await wait(({x,y})=>{const n=window.__XIAN_NI__.inspect().worlds.workshop.find(e=>e.id==='xu_work');return n.state==='leading'&&Math.hypot(n.x-x,n.y-y)>10;},{x:startNpc.x,y:startNpc.y});
 // Tap the already measured real pause button without auto-wait delaying it until the next distance stop.
 if(mobile)await page.touchscreen.tap(pauseRect.x+pauseRect.width/2,pauseRect.y+pauseRect.height/2);else await page.mouse.click(pauseRect.x+pauseRect.width/2,pauseRect.y+pauseRect.height/2);
 await wait(()=>window.__XIAN_NI__.inspect().paused);const frozen=await state();assert.equal(frozen.worlds.workshop.find(e=>e.id==='xu_work').state,'leading');await page.waitForTimeout(800);const after=await state();assert.deepEqual(after.journey,frozen.journey);assert.deepEqual(after.worlds.workshop.find(e=>e.id==='xu_work'),frozen.worlds.workshop.find(e=>e.id==='xu_work'));assert.equal(after.time,frozen.time);
 const bytes=await exportSave(`journey-${route.id}-paused-input.json`),saved=JSON.parse(bytes.toString('utf8'));
 // Restore into a clean page so an ignored import cannot pass by comparing the unchanged source state.
 await page.close();page=await newPage();await importSave(bytes,'journey-paused-input.json',{fresh:true,continuation:true});const restored=await state();
 assert.equal(restored.paused,true);assert.equal(restored.time,saved.time);assert.deepEqual(restored.player,saved.player);assert.deepEqual(restored.journey,saved.journey);assert.deepEqual(restored.worlds.workshop.find(e=>e.id==='xu_work'),saved.worlds.workshop.find(e=>e.id==='xu_work'));
 route.observations.separatePauseSave={separatePage:true,restoredIntoCleanPage:true,source:'real pre-start settings export from this route',freezeWallMs:800,modelTime:frozen.time,journey:restored.journey,npc:restored.worlds.workshop.find(e=>e.id==='xu_work')};await capture('paused-restored');
}
async function run(bytes,isPhone){
 mobile=isPhone;route={id:mobile?'phone':'desktop',status:'RUNNING',viewport:{width:mobile?390:1440,height:mobile?844:900,dpr:mobile?3:1,touch:mobile},inputTrace:[],observations:{},exports:[]};evidence.routes.push(route);page=await newPage();
 const ready=pauseOnly?await readFile(mobile?'qa/evidence/journey-phone-ready-input.json':'qa/evidence/journey-ready-input.json'):await prepare(bytes);if(entryOnly){route.status='PASS';await persist();await page.close();page=null;return;}if(!pauseOnly){await followLeader();await finishReturn();}await separatePauseSave(ready);route.status='PASS';await persist();await page.close();page=null;
}
try{
 const bytes=await readFile(fixturePath),fixture=JSON.parse(bytes.toString('utf8'));assert.equal(fixture.contentVersion,3);assert.equal(fixture.canal.stage,'complete');assert.equal(fixture.scene,'home');assert.equal(fixture.ended,true);evidence.fixture={path:fixturePath,sha256:hash(bytes),source:'Unmodified real 0.4 desktop diversion completion exported through settings'};
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});evidence.environment.browser=await browser.version();
 if(selection!=='phone')await run(bytes,false);if(selection!=='desktop')await run(bytes,true);
 assert.deepEqual(evidence.errors,[]);evidence.status='PASS';evidence.completedAt=new Date().toISOString();await persist();console.log(`JOURNEY REAL INPUT PASS (${selection}, ${evidence.phase})`);
}catch(error){
 evidence.status='FAIL';evidence.failure=String(error);if(route)route.status='FAIL';console.error(error);
 if(page){const s=await state().catch(()=>null);evidence.failureState=s?brief(s):null;await page.screenshot({path:'qa/evidence/journey-failure.png'}).catch(()=>{});}
 await persist();process.exitCode=1;
}finally{await browser?.close();}

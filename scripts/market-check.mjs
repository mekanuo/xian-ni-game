import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const url=process.env.GAME_URL||'http://127.0.0.1:4194/';
const runId=new Date().toISOString().replaceAll(':','-').replaceAll('.','-');
const folder=`qa/evidence/market-${runId}`;
const output=process.env.MARKET_OUTPUT||'qa/evidence/market-check.json';
const device=process.env.MARKET_DEVICE||'desktop';
const onlyView=process.env.MARKET_CASE==='view';
const fixturePath=process.env.MARKET_START||'qa/fixtures/return-kiln-through-v0.6.0.json';
const resumed=Boolean(process.env.MARKET_START);
const evidence={schemaVersion:1,runId,status:'RUNNING',startedAt:new Date().toISOString(),environment:{url,platform:process.platform,limitation:'Linux Chrome with desktop or touch/DPR emulation, not physical Mac/Safari/phone. Captures use ordinary pause for visual inspection. On phone, each target is framed while paused and movement resumes only after a visible point is chosen; this is not uninterrupted combat evidence.'},routes:[],errors:[]};
let browser,page,cdp,mobile=device==='phone';
const responses=new Map();
const route={id:device,status:'RUNNING',inputTrace:[],exports:[],observations:{}};evidence.routes.push(route);
const started=Date.now();await mkdir(folder,{recursive:true});
const persist=()=>writeFile(output,JSON.stringify(evidence,null,2));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const log=(action,detail={})=>{route.inputTrace.push({action,detail,wallMs:Date.now()-started});console.log(route.id,action,JSON.stringify(detail));};
const state=()=>page.evaluate(()=>window.__XIAN_NI__.inspect());
const wait=(fn,arg,timeout=15000)=>page.waitForFunction(fn,arg,{timeout,polling:'raf'});
const brief=s=>({scene:s.scene,time:s.time,player:s.player,market:s.market,kiln:s.kiln,companion:s.flags.companion,paused:s.paused,dialogue:s.dialogue,defeated:s.defeated,events:s.events.slice(-12)});
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
  const end={x:Math.max(8,Math.min(view.w-8,origin.x+dx)),y:Math.max(140,Math.min(view.h-80,origin.y+dy))};
  if(mobile){await button('[data-ui="pan"]');try{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...origin,id:1}]});for(let n=1;n<=6;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:origin.x+(end.x-origin.x)*n/6,y:origin.y+(end.y-origin.y)*n/6,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}finally{await button('[data-ui="pan"]');}}
  else {await page.keyboard.down('Shift');try{await page.mouse.move(origin.x,origin.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:6});await page.mouse.up();}finally{await page.keyboard.up('Shift');}}
  await page.waitForTimeout(120);log(mobile?'camera-single-finger-drag':'camera-shift-drag',{origin,dx,dy});
 }
 throw Error(`World target ${x},${y} cannot be framed on unobstructed canvas`);
}
async function worldTap(x,y){const p=await frame(x,y);if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
async function entity(id){const s=await state(),e=s.worlds[s.scene].find(e=>e.id===id);assert.ok(e,`Missing ${s.scene}/${id}`);return e;}
async function preparedTap(x,y){
 if(!mobile){await resume();await worldTap(x,y);return;}
 await pause();const before=await state();assert.equal(before.dialogue,null,'Phone framing requires the current conversation to be completed');assert.equal(before.defeated,false);const p=await frame(x,y);assert.deepEqual(await state(),before,'Phone camera framing must freeze the actual world');log('paused-phone-framing',{x,y});await resume();await page.touchscreen.tap(p.x,p.y);
}
async function walk(x,y){log('walk',{x,y});await preparedTap(x,y);await wait(({x,y})=>{const s=window.__XIAN_NI__.inspect();if(s.defeated)throw Error('Player defeated before arrival');if(s.dialogue)throw Error('Ground click unexpectedly opened dialogue: '+s.dialogue.id);return Math.hypot(s.player.x-x,s.player.y-y)<18&&s.player.path.length===0;},{x,y},120000);if(mobile)await pause();const arrived=await state();assert.equal(arrived.defeated,false);log('arrived',{scene:arrived.scene,x:arrived.player.x,y:arrived.player.y,time:arrived.time,hp:arrived.player.hp});}
async function interact(id){
 const e=await entity(id),scene=(await state()).scene;log('interact',{id,scene,world:{x:e.x,y:e.y}});await preparedTap(e.x,e.y);
 await wait(({id,scene})=>{const s=window.__XIAN_NI__.inspect();if(s.scene!==scene||s.dialogue)return true;const e=s.worlds[s.scene].find(e=>e.id===id);return e&&Math.hypot(s.player.x-e.x,s.player.y-e.y)<100&&s.player.path.length===0;},{id,scene},120000);if(mobile)await pause();
}
async function choose(id){
 for(let n=0;n<12&&!(await state()).dialogue?.choices.some(c=>c.id===id);n++){assert.ok((await state()).dialogue?.choices.some(c=>c.id==='more'),`Missing choice ${id}`);await button('[data-ui="choice:more"]');}
 assert.ok((await state()).dialogue?.choices.some(c=>c.id===id&&!c.disabled),`Unavailable choice ${id}`);
 log('choose',id);await button(`[data-ui="choice:${id}"]`);await wait(()=>!window.__XIAN_NI__.inspect().dialogue);await resume();
}
async function exportSave(name){
 await pause();await button('[data-ui="settings"]');const promise=page.waitForEvent('download');await button('[data-ui="export"]');const download=await promise,path=`${folder}/${name}`;await download.saveAs(path);await button('[data-ui="close"]');
 const bytes=await readFile(path);route.exports.push({path,sha256:hash(bytes)});log('settings-export',path);return bytes;
}
async function importSave(bytes,name,{fresh=false,continuation=false}={}){
 if(fresh){await page.goto(url);await named('入 山');await named('去回石驿');await wait(()=>window.__XIAN_NI__?.inspect().scene==='home');route.runtimeScripts=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.src));route.runtimeHashes=[];for(const url of route.runtimeScripts){const response=responses.get(url);assert.ok(response,`Missing actual loaded response: ${url}`);assert.equal(response.status(),200);route.runtimeHashes.push({url,sha256:hash(await response.body())});}}
 await button('[data-ui="settings"]');await page.locator('#import-save').setInputFiles({name,mimeType:'application/json',buffer:bytes});
 await wait(continuation=>{const s=window.__XIAN_NI__.inspect();return s.contentVersion===6&&s.journey.stage==='complete'&&(!continuation||s.scene==='market');},continuation);
 assert.deepEqual(Object.keys((await state()).worlds).sort(),['canal','creek','crossing','home','kiln','market','workshop']);
 await page.waitForTimeout(160);await dismissEnding();log('settings-import',{name,contentVersion:(await state()).contentVersion});
}
async function capture(id){await pause();if(!mobile)await page.mouse.move(1430,890);const path=`${folder}/${route.id}-${id}.png`;await page.screenshot({path});route.observations[id]={visual:path,state:brief(await state())};await persist();}

try{
 evidence.sourceFiles=[];for(const path of ['src/game/model.ts','src/game/market.ts','src/game/market-art.ts','src/game/scene.ts','src/game/ui.ts','scripts/market-check.mjs'])evidence.sourceFiles.push({path,sha256:hash(await readFile(path))});
 const bytes=await readFile(fixturePath),old=JSON.parse(bytes);assert.equal(old.contentVersion,resumed?6:5);if(resumed){assert.equal(old.scene,'market');assert.equal(old.market.visit.entry,'crossing');}assert.equal(old.kiln.crossed.east,true);assert.equal(old.kiln.crossed.west,true);
 evidence.fixture={path:fixturePath,sha256:hash(bytes),source:resumed?'Actual earlier market UI entry export; this run resumes there through settings, without synthetic edits.':'Actual 0.6 two-ended kiln settings export, unchanged; every new scene transition and outcome below uses normal UI input.'};
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});evidence.environment.browser=await browser.version();
 page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?3:2,isMobile:mobile,hasTouch:mobile,acceptDownloads:true});cdp=await page.context().newCDPSession(page);
 page.on('pageerror',e=>evidence.errors.push(e.message));page.on('response',r=>{responses.set(r.url(),r);if(r.status()>=400)evidence.errors.push(`${r.status()} ${r.url()}`);});
 await importSave(bytes,'actual-kiln-zero-complete.json',{fresh:true});await resume();if(!resumed){assert.equal((await state()).scene,'creek');
 for(const p of [[300,340],[300,740]])await walk(...p);await interact('rest_creek');assert.equal((await state()).player.hp,4);
 await walk(1500,820);await interact('to_crossing');await wait(()=>window.__XIAN_NI__.inspect().scene==='crossing');
 for(const p of [[600,830],[1000,830],[1370,830],[1640,610]])await walk(...p);
 await interact('crossing_to_market');await wait(()=>window.__XIAN_NI__.inspect().scene==='market');
 }
 assert.equal((await state()).market.visit.entry,'crossing');await capture('west-entry');await exportSave('market-west-entry.json');
 await walk(420,460);await interact('market_merchant');assert.equal((await state()).market.exchanged,false);await capture('merchant-dialogue');
 if(!onlyView){
  await choose('market:exchange');await wait(()=>window.__XIAN_NI__.inspect().worlds.market.find(e=>e.id==='market_door').state==='open',undefined,20000);
  await wait(()=>window.__XIAN_NI__.audio().effectCounts['market-gate']>=1,undefined,10000);
  await capture('physical-door-open');
  for(const p of [[665,410],[820,405],[1000,440]])await walk(...p);
  await interact('market_exit');await wait(()=>window.__XIAN_NI__.inspect().scene==='canal');assert.equal((await state()).market.through.private.westToEast,true);await capture('north-connected');
  await walk(990,700);await interact('canal_rest_mid');await walk(990,350);await interact('canal_to_market');await wait(()=>window.__XIAN_NI__.inspect().scene==='market');assert.equal((await state()).market.visit.entry,'canal');
  for(const p of (mobile?[[1220,340],[1220,860],[880,860],[420,860]]:[[1220,220],[1220,880],[880,880],[420,880]]))await walk(...p);
  await interact('market_entry');await wait(()=>window.__XIAN_NI__.inspect().scene==='crossing');assert.equal((await state()).market.through.public.eastToWest,true);await capture('west-connected');
  for(const p of [[1370,830],[1000,830],[600,830]])await walk(...p);await interact('to_creek');await wait(()=>window.__XIAN_NI__.inspect().scene==='creek');await walk(300,740);await interact('to_home');await wait(()=>window.__XIAN_NI__.inspect().scene==='home');
  await walk(900,700);await interact('table');await choose('market:report');
  const done=await state();assert.equal(done.market.reported.private.westToEast,true);assert.equal(done.market.reported.public.eastToWest,true);assert.equal(done.market.reported.private.eastToWest,false);assert.equal(done.market.reported.public.westToEast,false);
  await capture('reported-at-home');await exportSave('market-complete.json');
 }
 route.audio=await page.evaluate(()=>window.__XIAN_NI__.audio());assert.equal(route.audio.error,'');assert.deepEqual(evidence.errors,[]);route.status='PASS';evidence.status='PASS';
}catch(e){route.status='FAIL';evidence.status='FAIL';evidence.failure=String(e);console.error(e);if(page){try{evidence.failureState=brief(await state());await page.screenshot({path:`${folder}/failure.png`});}catch{}}process.exitCode=1;}
finally{evidence.completedAt=new Date().toISOString();await persist();if(browser)await browser.close();}

import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Production-only, ordinary UI route adapted from the passed whitebox lure case.
// This script has no model setters, preset creation, fixture edits or damage calls.
const url=process.env.GAME_URL||'http://127.0.0.1:4194/';
const fixturePath=process.env.MARKET_START||'qa/evidence/market-2026-09-11T15-48-58-773Z/market-west-entry.json';
const runId=new Date().toISOString().replaceAll(':','-').replaceAll('.','-');
const folder=`qa/evidence/market-threat-view-${runId}`;
const output=process.env.MARKET_THREAT_OUTPUT||`${folder}/report.json`;
const report={schemaVersion:1,runId,status:'RUNNING',startedAt:new Date().toISOString(),environment:{url,viewport:{width:1440,height:900},dpr:1,platform:process.platform,limitation:'Desktop Linux Chrome at DPR1; higher density artwork has separate DPR2/DPR3 view evidence; not a physical Mac. The threat stop is captured using ordinary pause, not presented as uninterrupted combat footage.'},inputTrace:[],motion:[],observations:{},errors:[]};
const started=Date.now(),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
let browser,page,lastMotion=-Infinity;
const responses=new Map();
await mkdir(folder,{recursive:true});
const persist=async()=>{const bytes=JSON.stringify(report,null,2);await writeFile(`${folder}/report.json`,bytes);if(output!==`${folder}/report.json`)await writeFile(output,bytes);};
const log=(action,detail={})=>{report.inputTrace.push({action,detail,wallMs:Date.now()-started});console.log(action,JSON.stringify(detail));};
const get=(s,id)=>s.worlds.market.find(e=>e.id===id);
const facts=s=>({scene:s.scene,time:s.time,paused:s.paused,dialogue:s.dialogue,defeated:s.defeated,player:s.player,market:s.market,npc:get(s,'market_merchant'),door:get(s,'market_door'),enemy:get(s,'market_raider'),decoy:get(s,'decoy'),events:s.events.slice(-12)});
async function read(){return page.evaluate(()=>({s:window.__XIAN_NI__.inspect(),visual:window.__XIAN_NI__.presentation()}));}
function alive(s){assert.equal(s.scene,'market','Stay within this bounded market check');assert.equal(s.defeated,false,'No defeated recovery may hide route failure');assert.ok(s.player.hp>0,'Player must remain alive');assert.ok(get(s,'market_raider').hp>0,'The original enemy must remain alive');}
async function until(label,test,timeout=60000){
 const end=Date.now()+timeout;let current;
 while(Date.now()<end){
  current=await read();alive(current.s);
  if(Date.now()-lastMotion>180){report.motion.push({wallMs:Date.now()-started,state:facts(current.s),actor:current.visual.actors.find(a=>a.id==='market_merchant')});lastMotion=Date.now();}
  if(test(current.s,current.visual))return current;
  await page.waitForTimeout(30);
 }
 throw Error(`${label}: timed out with ${JSON.stringify(current?facts(current.s):null)}`);
}
async function button(selector){const b=page.locator(selector);await b.waitFor({state:'visible'});log('ui-click',{selector});await b.click();}
async function collapse(){const b=page.locator('[data-ui="observe"]');if(await b.count()&&await b.getAttribute('aria-expanded')==='true')await button('[data-ui="observe"]');}
async function resume(){const {s}=await read();alive(s);assert.equal(s.dialogue,null,'Do not silently dismiss an unexpected conversation');if(s.paused)await button('.action-dock [data-ui="pause"]');await until('normal resume',s=>!s.paused&&!s.dialogue);await collapse();}
async function pause(){if(!(await read()).s.paused)await button('.action-dock [data-ui="pause"]');return until('normal pause',s=>s.paused);}
async function screen(x,y){return page.evaluate(({x,y})=>window.__XIAN_NI__.screenPoint(x,y),{x,y});}
async function drag(dx,dy){
 const origin=await page.evaluate(()=>[{x:1120,y:470},{x:1040,y:600},{x:360,y:470},{x:900,y:700}].find(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS'));
 assert.ok(origin,'Need an uncovered canvas origin for real Shift drag');
 const end={x:Math.max(25,Math.min(1415,origin.x+Math.max(-430,Math.min(430,dx)))),y:Math.max(160,Math.min(745,origin.y+Math.max(-260,Math.min(260,dy))))};
 log('camera-shift-drag',{origin,end});await page.keyboard.down('Shift');
 try{await page.mouse.move(origin.x,origin.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:6});await page.mouse.up();}finally{await page.keyboard.up('Shift');}
 await page.waitForTimeout(80);
}
async function framePoint(x,y){
 await collapse();
 for(let n=0;n<8;n++){
  const p=await screen(x,y);
  if(p.x>35&&p.x<1405&&p.y>155&&p.y<750&&await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS',p))return p;
  await drag(720-p.x,460-p.y);
 }
 throw Error(`Cannot frame real world input ${x},${y}`);
}
async function tap(x,y){const p=await framePoint(x,y);log('world-click',{world:{x,y},screen:p});await page.mouse.click(p.x,p.y);}
async function walk(x,y){await resume();await tap(x,y);const r=await until(`walk ${x},${y}`,s=>!s.dialogue&&s.player.path.length===0&&Math.hypot(s.player.x-x,s.player.y-y)<18,120000);log('arrived',{x:r.s.player.x,y:r.s.player.y,hp:r.s.player.hp,time:r.s.time});return r;}
async function activeGap(seconds=.8){const time=(await read()).s.time;return until('ordinary decision time',s=>!s.paused&&!s.dialogue&&s.time>=time+seconds);}
async function dialogueChoice(id){
 for(let n=0;n<12;n++){
  const {s}=await read();assert.ok(s.dialogue,'Expected real nearby dialogue');
  if(s.dialogue.choices.some(c=>c.id===id&&!c.disabled)){await button(`[data-ui="choice:${id}"]`);return;}
  assert.ok(s.dialogue.choices.some(c=>c.id==='more'),'Required choice is not available');await button('[data-ui="choice:more"]');
 }
 throw Error(`Dialogue choice ${id} not reached`);
}
async function groupVisibility(){
 return page.evaluate(()=>{
  const s=window.__XIAN_NI__.inspect(),ids=['market_merchant','market_door','market_raider'];
  const points=ids.flatMap(id=>{const e=s.worlds.market.find(e=>e.id===id);return(id==='market_door'?[[e.x-e.w/2,e.y-e.h/2],[e.x+e.w/2,e.y+e.h/2]]:[[e.x-26,e.y-86],[e.x+26,e.y+7]]).map(([x,y])=>({id,world:{x,y},...window.__XIAN_NI__.screenPoint(x,y)}));});
  return{points,bounds:{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))},uncovered:points.every(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS')};
 });
}
async function framePausedGroup(){
 assert.equal((await read()).s.paused,true);await collapse();
 for(let n=0;n<8;n++){
  const result=await groupVisibility(),b=result.bounds;
  if(b.left>45&&b.right<1395&&b.top>230&&b.bottom<735&&result.uncovered)return result;
  assert.ok(b.right-b.left<1320&&b.bottom-b.top<500,'Actual actor/door/enemy group must fit one scene view; do not crop away the cause');
  await drag(720-(b.left+b.right)/2,475-(b.top+b.bottom)/2);
 }
 throw Error('Could not show actual waiting actor, closed door and enemy together without DOM cover');
}
async function screenshot(name,extra={}){const path=`${folder}/${name}.png`;await page.mouse.move(1430,890);await page.screenshot({path});report.observations[name]={path,sha256:hash(await readFile(path)),...(await read()),...extra};await persist();}

try{
 report.sourceFiles=[];
 for(const path of ['src/game/market-art.ts','src/game/market.ts','src/game/market-content.ts','src/game/model.ts','src/game/contracts.ts','src/game/scene.ts','src/game/ui.ts','scripts/market-threat-view-check.mjs','public/assets/market-ground.png','public/assets/market-environment.png','public/assets/market-props.png','public/assets/market-shenyan.png'])report.sourceFiles.push({path,sha256:hash(await readFile(path))});
 const bytes=await readFile(fixturePath),fixture=JSON.parse(bytes);
 if(process.env.MARKET_START)assert.ok([6,7].includes(fixture.contentVersion),'Continuation must be a real v6/v7 market export');else assert.equal(fixture.contentVersion,6);assert.equal(fixture.scene,'market');assert.equal(fixture.journey.stage,'complete');assert.equal(fixture.market.visit.entry,'crossing');assert.equal(fixture.market.exchanged,false);
 assert.equal(get(fixture,'market_door').state,'closed');assert.equal(get(fixture,'market_merchant').state,'idle');assert.equal(get(fixture,'decoy').state,'idle');assert.equal(get(fixture,'market_raider').hp,3);assert.equal(fixture.player.hp,4);assert.equal(fixture.player.mana,6);
 report.fixture={path:fixturePath,sha256:hash(bytes),contentVersion:fixture.contentVersion,provenance:process.env.MARKET_START?'Caller-supplied actual market entry UI export, imported unchanged.':'Unchanged settings export from the real production R4 west entry; no synthetic preset or field edits.',initial:facts(fixture)};
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});report.environment.browser=await browser.version();
 page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,acceptDownloads:true});
 page.on('pageerror',e=>report.errors.push({type:'pageerror',message:e.message}));page.on('requestfailed',r=>report.errors.push({type:'requestfailed',url:r.url(),failure:r.failure()}));page.on('response',r=>{responses.set(r.url(),r);if(r.status()>=400)report.errors.push({type:'http',url:r.url(),status:r.status()});});
 await page.goto(url);await page.getByRole('button',{name:'入 山',exact:true}).click();await page.getByRole('button',{name:'去回石驿',exact:true}).click();
 await page.waitForFunction(()=>window.__XIAN_NI__?.inspect().scene==='home');
 report.runtimeScripts=[];for(const scriptUrl of await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.src))){const response=responses.get(scriptUrl);assert.ok(response,`Missing actual loaded response: ${scriptUrl}`);assert.equal(response.status(),200);report.runtimeScripts.push({url:scriptUrl,sha256:hash(await response.body())});}
 await button('[data-ui="settings"]');log('settings-import',{path:fixturePath,sha256:hash(bytes)});await page.locator('#import-save').setInputFiles({name:'actual-r4-market-entry.json',mimeType:'application/json',buffer:bytes});
 await page.waitForFunction(()=>window.__XIAN_NI__?.inspect().scene==='market');
 const imported=await read();alive(imported.s);assert.equal(imported.s.contentVersion,7);assert.deepEqual(Object.keys(imported.s.worlds).sort(),['canal','creek','crossing','home','kiln','market','spar','workshop']);assert.equal(imported.s.paused,true);assert.deepEqual(imported.s.market,fixture.market);assert.equal(imported.s.player.hp,4);assert.equal(imported.s.player.mana,6);
 assert.equal(await page.getByRole('button',{name:'在驿中再坐一会儿',exact:true}).isVisible(),false,'Imported chapter entry must not reopen the original ending');
 report.canvas=await page.locator('canvas').first().evaluate(c=>({width:c.width,height:c.height,css:{width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height}}));
 const actualDensity=Math.max(1,Math.min(1,3,Math.sqrt(5_000_000/(1440*900))));report.canvas.actualDensity=actualDensity;assert.equal(report.canvas.width,Math.round(1440*actualDensity));assert.equal(report.canvas.height,Math.round(900*actualDensity));
 await walk(380,720);await activeGap();
 await button('[data-ui="spell:pull"]');await tap(460,720);await until('real pull acquired',s=>s.player.pullId==='decoy');
 await tap(490,840);await until('actual empty crate displacement',s=>Math.hypot(get(s,'decoy').x-490,get(s,'decoy').y-840)<=12);await activeGap();await button('[data-ui="release"]');
 const dropped=await until('actual drop event',s=>s.player.pullId===null&&get(s,'decoy').data?.noiseUsed===true&&s.events.some(e=>e.type==='drop'));
 assert.equal(dropped.s.player.mana,5);report.observations.drop={state:facts(dropped.s)};
 await until('enemy actually follows the drop toward the western approach',s=>get(s,'market_raider').x<=610,120000);
 await walk(480,460);await activeGap();
 // The old fixed decision delay could start the merchant before the enemy had
 // rounded the south wall. Observe the real approach instead of assuming timing.
 const approach=await until('enemy has actually rounded into the western approach',s=>get(s,'market_raider').x<540&&get(s,'market_raider').y<=725,60000);
 assert.equal(get(approach.s,'market_door').state,'closed');assert.equal(approach.s.market.exchanged,false);
 report.observations.approach={state:facts(approach.s)};log('actual-threat-approach-ready',{enemy:get(approach.s,'market_raider'),player:approach.s.player,time:approach.s.time});
 const merchant=get((await read()).s,'market_merchant');await tap(merchant.x,merchant.y);
 const meeting=await until('actual nearby merchant dialogue',s=>s.dialogue?.id==='market_talk');assert.equal(meeting.s.market.exchanged,false);assert.equal(get(meeting.s,'market_door').state,'closed');assert.ok(Math.hypot(meeting.s.player.x-get(meeting.s,'market_merchant').x,meeting.s.player.y-get(meeting.s,'market_merchant').y)<96);
 report.observations.meeting={state:facts(meeting.s)};await dialogueChoice('market:exchange');await until('dialogue ends after accepted exchange',s=>!s.dialogue&&s.market.exchanged);await resume();
 const stopped=await until('real interruption has rendered the waiting pose', (s,v)=>{
  if(get(s,'market_door').state==='open')throw Error('The merchant opened the door before interception; this run did not establish a closed-door interruption');
  return get(s,'market_merchant').state==='waiting'&&v.actors.some(a=>a.id==='market_merchant'&&a.frame==='waiting');
 });
 assert.ok(get(stopped.s,'market_merchant').x>470&&get(stopped.s,'market_merchant').x<620,'Observe interruption after real movement, not a starting idle actor');report.observations.interruption={state:facts(stopped.s),visual:stopped.visual};
 await pause();const visibility=await framePausedGroup(),frozen=await read();assert.equal(get(frozen.s,'market_merchant').state,'waiting');assert.equal(get(frozen.s,'market_door').state,'closed');assert.equal(frozen.visual.actors.find(a=>a.id==='market_merchant').frame,'waiting');
 await screenshot('waiting-closed-door',{visibility});await page.waitForTimeout(500);const after=await read();assert.deepEqual(after.s,frozen.s,'Ordinary pause freezes world state');assert.deepEqual(after.visual.actors,frozen.visual.actors,'Actual render frame/angle/flip/position freeze');report.observations.freeze={before:facts(frozen.s),after:facts(after.s),actors:after.visual.actors,wallMilliseconds:500};
 const stoppedPosition={x:get(after.s,'market_merchant').x,y:get(after.s,'market_merchant').y};
 // Plan a normal ground retreat during pause, so resume does not spend active
 // combat time dragging a camera or serializing a screenshot. This is the same
 // player-facing pending move available in the production UI.
 const retreat=await framePoint(180,780);log('paused-ground-retreat',{world:{x:180,y:780},screen:retreat});await page.mouse.click(retreat.x,retreat.y);await until('normal paused move is queued',s=>s.paused&&s.pending?.type==='move');await resume();
 const continued=await until('threat leaves and merchant really continues',s=>get(s,'market_door').state==='open'||get(s,'market_merchant').state==='leading'&&Math.hypot(get(s,'market_merchant').x-stoppedPosition.x,get(s,'market_merchant').y-stoppedPosition.y)>8,60000);report.observations.continued={state:facts(continued.s),visual:continued.visual};
 await until('player reaches the actual retreat',s=>s.player.path.length===0&&Math.hypot(s.player.x-180,s.player.y-780)<18,120000);await pause();await screenshot('after-actual-retreat');
 const done=(await read()).s;alive(done);assert.equal(get(done,'market_raider').hp,3,'No damaging spell or manufactured enemy removal');assert.equal(done.player.mana,5);assert.deepEqual(done.market.through,fixture.market.through,'This local pose check cannot invent a cross-map journey');assert.deepEqual(done.market.reported,fixture.market.reported);assert.deepEqual(report.errors,[]);
 report.outcome={state:facts(done),enemyUnharmed:true,playerAlive:true,waitingRendered:true,pauseFrozen:true,realContinuation:true};for(const entry of report.sourceFiles)assert.equal(hash(await readFile(entry.path)),entry.sha256,`Source changed during run: ${entry.path}`);report.status='PASS';
}catch(error){
 report.status='FAIL';report.failure=String(error.stack||error);process.exitCode=1;console.error(error);
 if(page){try{report.failureState=await read();await page.screenshot({path:`${folder}/failure.png`});report.failureScreenshot=`${folder}/failure.png`;}catch(captureError){report.failureCaptureError=String(captureError);}}
}finally{report.completedAt=new Date().toISOString();await persist();if(browser)await browser.close();}

import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Production consequences only. This historical, actual UI export is immutable.
// All progress below comes from DOM, mouse and keyboard input, never model calls.
const url=process.env.GAME_URL||'http://127.0.0.1:4194/';
const fixturePath='qa/evidence/market-2026-09-11T15-13-29-584Z/market-west-entry.json';
const runId=new Date().toISOString().replaceAll(':','-').replaceAll('.','-');
const folder=`qa/evidence/market-consequences-${runId}`;
const output=process.env.MARKET_CONSEQUENCES_OUTPUT||'qa/evidence/market-consequences.json';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourcePaths=['src/game/contracts.ts','src/game/content.ts','src/game/model.ts','src/game/save.ts','src/game/companion.ts','src/game/market.ts','src/game/market-content.ts','src/game/scene.ts','src/game/ui.ts','scripts/market-consequences-check.mjs'];
const evidence={schemaVersion:1,runId,status:'NOT_RUN',startedAt:new Date().toISOString(),url,viewport:{width:1440,height:900,dpr:2},scope:'Actual wait/depart/reunite and settings round trips, merchant opening, two real enemy defeats, defeat-screen retry and retreat.',limitations:[
 'Linux Chrome desktop emulation, not a physical Mac, Safari or phone.',
 'Ordinary pause is used to inspect, frame and export; this is not an uninterrupted combat or complete chapter route.',
 'The deliberate enemy exposure is an unverified production input candidate until this script passes. Companion injury selects the actual absence branch; it never injects following to obtain an arrival claim.',
 'Source hashes identify this checkout; loaded response hashes identify the served runtime. This local report is not the complete verification/deployment fingerprint contract.',
],inputs:[],checks:[],captures:[],exports:[],errors:[],deaths:[]};
let browser,page;
const responses=new Map(),started=Date.now();
await mkdir(folder,{recursive:true});
const persist=async()=>{const json=JSON.stringify(evidence,null,2);await writeFile(`${folder}/report.json`,json);await writeFile(output,json);};
const state=()=>page.evaluate(()=>window.__XIAN_NI__.inspect());
const visual=()=>page.evaluate(()=>window.__XIAN_NI__.presentation());
const wait=(fn,arg,timeout=20000)=>page.waitForFunction(fn,arg,{timeout,polling:'raf'});
const actor=(s,id,scene=s.scene)=>s.worlds[scene].find(e=>e.id===id);
const point=e=>({x:e.x,y:e.y});
const log=async(action,detail={})=>{const s=await state();evidence.inputs.push({action,detail,wallMs:Date.now()-started,time:s.time,scene:s.scene,hp:s.player.hp,companion:s.flags.companion});console.log(action,JSON.stringify(detail),s.time,s.player.hp);};
async function button(selector){await log('DOM click',{selector});const b=page.locator(selector);await b.waitFor({state:'visible',timeout:20000});await b.click();}
async function pause(){if(!(await state()).paused)await button('.action-dock [data-ui="pause"]');await wait(()=>window.__XIAN_NI__.inspect().paused);}
async function resume(){const s=await state();assert.equal(s.defeated,false);assert.equal(s.dialogue,null);if(s.paused)await button('.action-dock [data-ui="pause"]');await wait(()=>!window.__XIAN_NI__.inspect().paused);}
async function collapse(){if((await state()).defeated)return;const b=page.locator('[data-ui="observe"]');if(await b.count()&&await b.getAttribute('aria-expanded')==='true'){await button('[data-ui="observe"]');await wait(()=>document.querySelector('[data-ui="observe"]')?.getAttribute('aria-expanded')==='false');await page.waitForTimeout(140);}}
const screen=p=>page.evaluate(p=>window.__XIAN_NI__.screenPoint(p.x,p.y),p);
const canvas=p=>page.evaluate(p=>p.x>10&&p.x<innerWidth-10&&p.y>120&&p.y<innerHeight-20&&document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS',p);
async function frame(target){
 await collapse();
 for(let attempt=0;attempt<16;attempt++){
  const p=await screen(target);if(await canvas(p))return p;
  const origin=await page.evaluate(()=>[{x:720,y:440},{x:500,y:440},{x:900,y:440},{x:720,y:600},{x:720,y:300}].find(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS'));
  assert.ok(origin,'Camera drag needs an unobstructed canvas origin');
  const dx=Math.max(-400,Math.min(400,origin.x-p.x)),dy=Math.max(-220,Math.min(220,origin.y-p.y));
  let end;for(const scale of [1,.75,.5,.25]){const q={x:origin.x+dx*scale,y:origin.y+dy*scale};if(await canvas(q)){end=q;break;}}
  assert.ok(end&&Math.hypot(end.x-origin.x,end.y-origin.y)>2,'Camera cannot legally frame this world input');
  await log('Shift camera drag',{origin,end,target});await page.keyboard.down('Shift');
  try{await page.mouse.move(origin.x,origin.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:6});}finally{await page.mouse.up();await page.keyboard.up('Shift');}
  await page.waitForTimeout(140);
 }
 throw Error(`Could not frame ${JSON.stringify(target)}`);
}
async function worldClick(target){const p=await screen(target);assert.ok(await canvas(p));await log('world click',{world:target,screen:p});await page.mouse.click(p.x,p.y);}
async function walk(x,y,{allowDefeat=false}={}){
 await pause();assert.equal((await state()).dialogue,null);await frame({x,y});await resume();await worldClick({x,y});
 await wait(({x,y})=>{const s=window.__XIAN_NI__.inspect();return s.defeated||(!s.dialogue&&s.player.path.length===0&&Math.hypot(s.player.x-x,s.player.y-y)<18);},{x,y},120000);
 const s=await state();if(s.defeated&&allowDefeat){await log('actual defeat during intended movement',{target:{x,y},actual:point(s.player)});return s;}assert.equal(s.defeated,false,`Defeated before reaching ${x},${y}`);assert.ok(s.player.hp>0);await pause();await log('arrived',{target:{x,y},actual:point((await state()).player)});return state();
}
async function interact(id,{scene:targetScene}={}){
 await pause();const before=await state(),e=actor(before,id);assert.ok(e);assert.notEqual(e.state,'hidden');await frame(point(e));await resume();await worldClick(point(e));
 await wait(({targetScene})=>{const s=window.__XIAN_NI__.inspect();return s.defeated||(targetScene?s.scene===targetScene:!!s.dialogue);},{targetScene},120000);
 assert.equal((await state()).defeated,false);if(targetScene)await pause();await log('interaction completed',{id,targetScene});
}
async function choose(id){
 for(let n=0;n<12&&!(await state()).dialogue?.choices.some(c=>c.id===id);n++){assert.ok((await state()).dialogue?.choices.some(c=>c.id==='more'),`No offered ${id}`);await button('[data-ui="choice:more"]');}
 assert.ok((await state()).dialogue?.choices.some(c=>c.id===id&&!c.disabled),`Unavailable ${id}`);await button(`[data-ui="choice:${id}"]`);await wait(()=>!window.__XIAN_NI__.inspect().dialogue);await pause();
}
async function capture(id){
 await pause();await collapse();await page.mouse.move(1430,890);const s=await state(),presentation=await visual(),path=`${folder}/${id}.png`;
 const bytes=await page.screenshot({path});evidence.captures.push({id,path,sha256:hash(bytes),state:s,presentation,pausedForCapture:true});await persist();return s;
}
async function exportSave(name){
 await pause();await button('[data-ui="settings"]');await button('[data-ui="save"]');
 const pending=page.waitForEvent('download');await button('[data-ui="export"]');const download=await pending,path=`${folder}/${name}`;await download.saveAs(path);await button('[data-ui="close"]');
 const bytes=await readFile(path);evidence.exports.push({path,sha256:hash(bytes),origin:'Actual settings save/export in this run'});await log('export complete',{path});return bytes;
}
async function importSave(bytes,name){
 await button('[data-ui="settings"]');await log('settings file input',{name,sha256:hash(bytes)});await page.locator('#import-save').setInputFiles({name,mimeType:'application/json',buffer:bytes});
 await page.locator('#import-save').waitFor({state:'hidden',timeout:30000});await wait(()=>window.__XIAN_NI__?.inspect().contentVersion===6&&window.__XIAN_NI__.inspect().paused);
 const end=page.getByRole('button',{name:'在驿中再坐一会儿',exact:true});if(await end.isVisible()){await log('dismiss original ending');await end.click();}
 await pause();await log('settings import complete',{name});
}
function savedCompanion(s){return {scene:s.scene,companion:s.flags.companion,xu:actor(s,'xu_market','market'),market:s.market,player:point(s.player),checkpoint:s.checkpoint};}
async function saveRoundTrip(name){const before=await state(),bytes=await exportSave(name);await importSave(bytes,name);const after=await state();assert.deepEqual(savedCompanion(after),savedCompanion(before),'Settings import must retain actual waiting/following feet and checkpoint');evidence.checks.push({id:name,assertion:'Exact companion/location/visit/checkpoint round trip',before:savedCompanion(before),after:savedCompanion(after)});await capture(name.replace('.json',''));}
async function dieFromActualEnemy(label,checkpoint){
 // Establish causality before entering the danger area, not after reaching the
 // final candidate. Real defeat after the complete passage may happen en route.
 const baseline=await state();assert.equal(baseline.defeated,false);assert.ok(baseline.player.hp>0);assert.equal(baseline.checkpoint,checkpoint);assert.equal(baseline.market.visit.passed.private.westToEast,false);
 const enemy=actor(baseline,'market_raider');assert.equal(enemy.kind,'enemy');assert.equal(enemy.type,'raider');assert.ok(enemy.hp>0&&!['retreated','peaceful'].includes(enemy.state));
 const record={label,status:'RUNNING',startedWall:new Date().toISOString(),start:baseline,samples:[]};evidence.deaths.push(record);
 function observe(s,phase){record.samples.push({phase,wallMs:Date.now()-started,time:s.time,player:s.player,enemy:actor(s,'market_raider'),xu:actor(s,'xu_market'),companion:s.flags.companion,projectiles:s.projectiles,events:s.events.slice(-10),defeated:s.defeated});}
 async function actualDefeat(s,phase){
  assert.equal(s.scene,'market');assert.equal(s.defeated,true);assert.ok(s.player.hp<=0);assert.equal(s.paused,true);assert.ok(s.time>baseline.time);
  assert.ok(s.events.some(e=>e.type==='defeat'&&e.seq>Number(baseline.flags.eventSeq)),'A new actual defeat event after the pre-walk baseline is required');
  assert.equal(s.checkpoint,checkpoint,'No new checkpoint may replace the physical-opening source');
  assert.equal(s.market.visit.passed.private.westToEast,true,'Death before actually completing the private passage does not satisfy this consequence case');
  assert.deepEqual(s.market.through,baseline.market.through,'Local movement and death must not submit permanent through history');
  assert.ok(actor(s,'market_raider').hp>0&&!['peaceful','retreated'].includes(actor(s,'market_raider').state));
  record.status='PASS';record.defeatPhase=phase;record.end=s;await page.locator('.defeat [data-ui="retry"]').waitFor({state:'visible'});await capture(`${label}-actual-defeat`);return s;
 }
 observe(baseline,'before-danger-walk');
 // No dialogue, save, rest or spells. Ordinary framing pauses are permitted on
 // approach, then the deliberate standing exposure runs without manual pause.
 for(const p of [[665,410],[820,405],[1000,440]]){
  const s=await walk(...p,{allowDefeat:true});observe(s,`move-${p.join(',')}`);
  if(s.defeated)return actualDefeat(s,'during-movement');
  assert.equal(s.checkpoint,checkpoint);
 }
 const beforeExposure=await state();assert.equal(beforeExposure.market.visit.passed.private.westToEast,true);assert.ok(beforeExposure.player.hp>0);
 await resume();await log('deliberate active exposure begins',{label,point:point(beforeExposure.player),maxWallSeconds:240});
 const limit=Date.now()+240000;
 while(Date.now()<limit){
  const s=await state();observe(s,'standing-exposure');
  if(s.defeated)return actualDefeat(s,'standing-exposure');
  assert.equal(s.paused,false,'No pause during deliberate active exposure');assert.equal(s.dialogue,null);assert.ok(actor(s,'market_raider').hp>0);await page.waitForTimeout(1000);
 }
 record.status='FAIL';throw Error(`${label}: actual enemy failed to defeat player within 240 wall seconds of standing exposure; no damage or enemy state injected`);
}
function assertLegalArrival(s,map,p){
 assert.ok(p.x>=25&&p.x<=map.width-25&&p.y>=25&&p.y<=map.height-25);
 const overlap=r=>p.x>r.x-17&&p.x<r.x+r.w+17&&p.y>r.y-17&&p.y<r.y+r.h+17;
 assert.ok(!map.obstacles.some(r=>(!r.flag||!s.flags[r.flag])&&overlap(r)),'Arrival body cannot overlap fixed wall/water geometry');
 assert.ok(!s.worlds[s.scene].some(e=>e.solid&&!['held','burned'].includes(e.state)&&overlap({x:e.x-e.w/2,y:e.y-e.h/2,w:e.w,h:e.h})),'Arrival cannot overlap a solid object');
 assert.ok(!s.worlds[s.scene].some(e=>e.type!=='xu'&&!['hidden','gone','taken','burned','retreated'].includes(e.state)&&(e.movable||e.kind==='npc'||e.kind==='enemy')&&Math.abs(p.x-e.x)<e.w/2+17&&Math.abs(p.y-e.y)<e.h/2+17),'Arrival must also avoid prop/actor envelopes');
}

try{
 const bytes=await readFile(fixturePath),original=JSON.parse(bytes);assert.equal(original.contentVersion,6);assert.equal(original.scene,'market');assert.equal(original.market.visit.entry,'crossing');assert.equal(original.market.exchanged,false);assert.equal(original.flags.companion,'following');assert.equal(actor(original,'market_door').state,'closed');assert.equal(actor(original,'xu_market').state,'following');
 evidence.fixture={path:fixturePath,sha256:hash(bytes),sourceRuntime:'index-BfRm4y9K.js',origin:'Unchanged committed actual west-entry settings export from run 2026-09-11T15-13-29-584Z; no fixture mutation'};
 evidence.sourceFiles=await Promise.all(sourcePaths.map(async path=>({path,sha256:hash(await readFile(path))})));evidence.status='RUNNING';await persist();
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});evidence.browser=await browser.version();
 page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2,acceptDownloads:true});
 page.on('response',r=>{responses.set(r.url(),r);if(r.status()>=400)evidence.errors.push({kind:'http',url:r.url(),status:r.status()});});page.on('pageerror',e=>evidence.errors.push({kind:'pageerror',message:e.message}));page.on('requestfailed',r=>evidence.errors.push({kind:'requestfailed',url:r.url(),error:r.failure()?.errorText}));
 await page.goto(url);await page.getByRole('button',{name:'入 山',exact:true}).click();await page.getByRole('button',{name:'去回石驿',exact:true}).click();await wait(()=>window.__XIAN_NI__?.inspect().scene==='home');await log('new game title buttons',{buttons:['入 山','去回石驿']});
 evidence.runtimeScripts=[];for(const src of await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.src))){const response=responses.get(src);assert.ok(response?.ok(),`Loaded script response missing: ${src}`);evidence.runtimeScripts.push({url:src,status:response.status(),sha256:hash(await response.body())});}assert.ok(evidence.runtimeScripts.length);
 await importSave(bytes,'actual-market-west-entry.json');const through=(await state()).market.through;
 await interact('xu_market');await choose('wait');const waiting=await state(),waitingFeet=point(actor(waiting,'xu_market'));assert.equal(waiting.flags.companion,'waiting');assert.equal(actor(waiting,'xu_market').state,'waiting');await saveRoundTrip('market-waiting-export.json');
 await interact('market_entry',{scene:'crossing'});let s=await state();assert.equal(s.market.visit,null);assert.deepEqual(s.market.through,through);assert.deepEqual(point(actor(s,'xu_market','market')),waitingFeet);assert.equal(s.flags.companion,'waiting');
 await wait(()=>!window.__XIAN_NI__.presentation().actors.some(e=>e.id==='xu_crossing'));await capture('old-map-xu-absent');
 await interact('crossing_to_market',{scene:'market'});s=await state();assert.equal(s.market.visit.entry,'crossing');assert.deepEqual(point(actor(s,'xu_market')),waitingFeet);assert.equal(s.flags.companion,'waiting');await capture('waiting-reentry-same-feet');
 await interact('xu_market');await choose('invite');assert.equal((await state()).flags.companion,'following');await saveRoundTrip('market-following-export.json');
 await walk(420,460);await interact('market_merchant');await choose('market:exchange');await resume();await wait(()=>window.__XIAN_NI__.inspect().worlds.market.find(e=>e.id==='market_door').state==='open',undefined,60000);await pause();
 const open=await capture('physical-open-checkpoint'),checkpoint=open.checkpoint,cp=JSON.parse(checkpoint);assert.equal(open.market.exchanged,true);assert.equal(cp.market.exchanged,true);assert.equal(actor(cp,'market_door').state,'open');assert.equal(cp.market.visit.passed.private.westToEast,false);assert.equal(cp.flags.companion,'following');await exportSave('market-open-export.json');
 const firstDeath=await dieFromActualEnemy('retry',checkpoint);assert.deepEqual(firstDeath.market.through,through);await button('.defeat [data-ui="retry"]');await wait(()=>!window.__XIAN_NI__.inspect().defeated);await pause();
 const retried=await capture('retry-open-restored');assert.equal(retried.scene,'market');assert.equal(retried.market.exchanged,true);assert.equal(actor(retried,'market_door').state,'open');assert.deepEqual(retried.market.visit,cp.market.visit,'Retry cannot merge the later actual passage into the earlier checkpoint');assert.deepEqual(retried.market.through,through);assert.equal(retried.checkpoint,checkpoint);assert.equal(retried.flags.companion,'following');assert.ok(retried.player.hp>0);evidence.checks.push({id:'defeat-retry',checkpointSha256:hash(checkpoint),laterPass:firstDeath.market.visit,restored:retried.market});
 const secondDeath=await dieFromActualEnemy('retreat',checkpoint),safe=secondDeath.lastSafe,wasFollowing=secondDeath.flags.companion==='following',waitingXu=actor(secondDeath,'xu_market');assert.ok(['following','waiting','refused','sheltered'].includes(secondDeath.flags.companion));
 await button('.defeat [data-ui="retreat"]');await wait(()=>!window.__XIAN_NI__.inspect().defeated&&window.__XIAN_NI__.inspect().scene!=='market');await pause();
 const retreated=await capture('retreat-preserved-open'),map=await page.evaluate(()=>window.__XIAN_NI__.scene());assert.equal(retreated.scene,safe.scene);assert.equal(retreated.scene,'crossing');assert.equal(retreated.market.visit,null);assert.equal(retreated.market.exchanged,true);assert.equal(actor(retreated,'market_door','market').state,'open');assert.deepEqual(retreated.market.through,through);assert.equal(retreated.checkpoint,checkpoint);assert.equal(retreated.flags.companion,secondDeath.flags.companion);assert.ok(retreated.player.hp>0);assert.deepEqual(actor(retreated,'market_merchant','market'),actor(secondDeath,'market_merchant'),'Retreat cannot reset the merchant with enemies');
 const xu=actor(retreated,'xu_crossing');assertLegalArrival(retreated,map,retreated.player);
 if(wasFollowing){
  assert.equal(actor(retreated,'xu_market','market').state,'hidden');assert.equal(xu.state,'following');assertLegalArrival(retreated,map,xu);assert.ok(Math.hypot(xu.x-retreated.player.x,xu.y-retreated.player.y)>=34);assert.ok(Math.hypot(xu.x-retreated.player.x,xu.y-retreated.player.y)<100);await wait(()=>window.__XIAN_NI__.presentation().actors.some(e=>e.id==='xu_crossing'));
  evidence.checks.push({id:'following-retreat',status:'PASS',player:point(retreated.player),xu:point(xu)});evidence.checks.push({id:'absent-retreat',status:'NOT_RUN',reason:'Actual defeat retained following; no absent branch was manufactured'});
 }else{
  assert.deepEqual(actor(retreated,'xu_market','market'),waitingXu,'Waiting/refused/sheltered Xu remains at her actual market feet');await wait(()=>!window.__XIAN_NI__.presentation().actors.some(e=>e.id==='xu_crossing'));
  evidence.checks.push({id:'absent-retreat',status:'PASS',actualRelationship:secondDeath.flags.companion,retainedXu:waitingXu});evidence.checks.push({id:'following-retreat',status:'NOT_RUN',reason:'Actual enemy exposure stopped cooperation; following arrival is covered by model tests, not this UI branch'});
 }
 const retained=JSON.parse(retreated.checkpoint);assert.equal(retained.scene,'market');assert.notEqual(retained.market.visit,null);assert.deepEqual(retained.market.visit,cp.market.visit);assert.equal(retained.market.visit.passed.private.westToEast,false);assert.equal(actor(retained,'market_door').state,'open');
 evidence.checks.push({id:'defeat-retreat',actualCompletedPass:secondDeath.market.visit,outer:retreated.market,sourceCheckpoint:{scene:retained.scene,market:retained.market,sha256:hash(retreated.checkpoint)},target:{player:point(retreated.player),xu:wasFollowing?point(xu):null,map:map.id}});await exportSave('market-retreated-export.json');
 for(const entry of evidence.sourceFiles)assert.equal(hash(await readFile(entry.path)),entry.sha256,`Source changed during run: ${entry.path}`);assert.deepEqual(evidence.errors,[]);evidence.status='PASS';
}catch(error){evidence.status='FAIL';evidence.failure=String(error);console.error(error);process.exitCode=1;if(page){evidence.failureState=await state().catch(()=>null);evidence.failurePresentation=await visual().catch(()=>null);await page.screenshot({path:`${folder}/failure.png`}).catch(()=>{});}}
finally{evidence.completedAt=new Date().toISOString();await persist();if(browser)await browser.close();}

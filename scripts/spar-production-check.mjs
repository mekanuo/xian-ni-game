import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Production input only. __XIAN_NI__ is the actual read-only scene contract;
// no game setters, localStorage fabrication, synthetic save edits or debug act.
const url=process.env.GAME_URL||'http://127.0.0.1:4194/';
const devices=(process.env.SPAR_DEVICE||'desktop,phone').split(',');
const scenarios=(process.env.SPAR_CASE||'hit,ward').split(',');
const stance=process.env.SPAR_STANCE||'front';
assert(devices.length&&devices.every(x=>['desktop','phone'].includes(x))&&new Set(devices).size===devices.length,'SPAR_DEVICE: desktop,phone');
assert(scenarios.length&&scenarios.every(x=>['hit','ward'].includes(x))&&new Set(scenarios).size===scenarios.length,'SPAR_CASE: hit,ward');
assert(['front','left','right'].includes(stance),'SPAR_STANCE: front,left,right');
const station={front:{x:900,y:720},left:{x:680,y:940},right:{x:1120,y:940}}[stance];
const fixturePath='qa/fixtures/return-main-v0.7.0.json';
const runId=new Date().toISOString().replaceAll(/[:.]/g,'-');
const folder=`qa/spar-production-${runId}`;
const output=process.env.SPAR_OUTPUT||`${folder}/report.json`;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={schemaVersion:1,runId,status:'NOT_RUN',startedAt:new Date().toISOString(),url,selection:{devices,scenarios,stance},scope:'Selected serial production cases: unchanged v6 UI import, real home doorway and companion wait agreement, spar positioning export/import in a fresh context, one actual hand, return home and table report, final v7 export/import.',cases:devices.flatMap(device=>scenarios.map(scenario=>({device,scenario,stance,status:'NOT_RUN',inputs:[],captures:[],checks:[],exports:[],consoleErrors:[]}))),errors:[],limitations:[
 'Linux Chromium with viewport/DPR/touch emulation, not physical Mac, Safari or phone.',
 'Only selected device/case/stance combinations are covered. This is not the full old-chapter regression or a complete three-stance matrix.',
 'Approach/framing, positioning export and result captures use ordinary pause. There is no pause or camera pan from begin through settlement of the tested hand.',
 'Ward input uses read-only detection of the emitted projectile to time one real click/tap. It proves input and rules, not human reaction comfort or subjective fun.',
 'No zero-mana start, residual-stop case, defeated recovery, waiting elsewhere, repeated rounds or save in mid-flight is claimed here; those require separate evidence.',
 'Screenshots need human visual review. Runtime hashes identify the loaded bytes; source hashes are observations, not a claim that a full release verification passed.',
]};
let browser,context,page,cdp,active;
await mkdir(folder,{recursive:true});
const persist=async()=>{const bytes=JSON.stringify(report,null,2);await writeFile(`${folder}/report.json`,bytes);if(output!==`${folder}/report.json`)await writeFile(output,bytes);};
await persist();
try{
 const bytes=await readFile(fixturePath),original=JSON.parse(bytes);
 assert.equal(original.contentVersion,6);assert.equal(original.scene,'home');assert.equal(original.flags.companion,'following');assert.ok(['stay','travel'].includes(original.flags.endingWish));assert.equal(original.dialogue,null);
 report.fixture={path:fixturePath,sha256:sha(bytes),origin:'Fixed original delivered 0.7 UI export; read unchanged. Every new arrival, agreement, shot and report uses real UI input.'};
 report.sourceFiles=[];
 for(const path of ['src/game/spar.ts','src/game/spar-content.ts','src/game/spar-state.ts','src/game/spar-save.ts','src/game/model.ts','src/game/save.ts','src/game/scene.ts','src/game/ui.ts','scripts/spar-production-check.mjs'])report.sourceFiles.push({path,sha256:sha(await readFile(path))});
 report.status='RUNNING';await persist();
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});report.environment={platform:process.platform,browser:browser.version(),executable:process.env.CHROME_PATH||'/usr/bin/google-chrome'};browser.on('disconnected',()=>console.log('BROWSER DISCONNECTED',new Date().toISOString()));
 for(const item of report.cases){
  active=item;item.status='RUNNING';await persist();
  const mobile=item.device==='phone',viewport=mobile?{width:390,height:844}:{width:1440,height:900};
  item.viewport={...viewport,dpr:mobile?3:2,touch:mobile};let responses=new Map();
  const state=()=>page.evaluate(()=>window.__XIAN_NI__.inspect());
  const wait=(fn,arg,timeout=60000)=>page.waitForFunction(fn,arg,{timeout,polling:'raf'});
  const screen=p=>page.evaluate(p=>window.__XIAN_NI__.screenPoint(p.x,p.y),p);
  const canvasAt=p=>page.evaluate(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>2&&p.y>2&&p.x<innerWidth-2&&p.y<innerHeight-2&&document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS',p);
  const log=(action,details={})=>item.inputs.push({action,...details,wall:new Date().toISOString()});
  const peer=s=>s.worlds.spar.find(e=>e.id==='spar_peer');
  async function press(locator,label){
   await locator.waitFor({state:'visible',timeout:60000});const box=await locator.boundingBox();assert.ok(box&&box.width>0&&box.height>0,`Visible control: ${label}`);
   log(mobile?'touch-control':'mouse-control',{label,box});if(mobile)await locator.tap();else await locator.click();
  }
  const button=selector=>press(page.locator(selector),selector);
  async function pause(){const s=await state();assert.equal(s.defeated,false);if(!s.paused)await button('.action-dock [data-ui="pause"]');await wait(()=>window.__XIAN_NI__.inspect().paused);}
  async function resume(){const s=await state();assert.equal(s.defeated,false);assert.equal(s.dialogue,null);if(s.paused)await button('.action-dock [data-ui="pause"]');await wait(()=>!window.__XIAN_NI__.inspect().paused);}
  async function collapse(){const b=page.locator('[data-ui="observe"]');if(await b.count()&&await b.getAttribute('aria-expanded')==='true'){await press(b,'collapse observation');await wait(()=>document.querySelector('[data-ui="observe"]')?.getAttribute('aria-expanded')==='false');}}
  async function tap(p,details={}){assert.ok(await canvasAt(p),'World input must land on visible canvas, outside HUD');log(mobile?'touch-world':'mouse-world',{screen:p,...details});if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
  async function drag(origin,end){
   assert.ok(await canvasAt(origin));assert.ok(await canvasAt(end));log(mobile?'single-finger-pan':'shift-mouse-pan',{origin,end,units:'CSS viewport pixels; no DPR multiplication'});
   if(mobile){
    const b=page.locator('[data-ui="pan"]');assert.notEqual(await b.getAttribute('aria-pressed'),'true');await press(b,'enable pan');assert.equal(await b.getAttribute('aria-pressed'),'true');
    try{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...origin,id:1}]});for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:origin.x+(end.x-origin.x)*i/6,y:origin.y+(end.y-origin.y)*i/6,id:1}]});}
    finally{try{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}finally{await press(b,'disable pan');assert.equal(await b.getAttribute('aria-pressed'),'false');}}
   }else{await page.keyboard.down('Shift');try{await page.mouse.move(origin.x,origin.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:6});}finally{await page.mouse.up();await page.keyboard.up('Shift');}}
   await page.waitForTimeout(120);
  }
  async function frame(world){
   const before=await state();assert.equal(before.paused,true,'Framing only occurs during explicit noncombat pause');assert.ok(!before.spar.run||before.spar.run.phase==='positioning','Never pan an active or settling hand');await collapse();
   for(let i=0;i<16;i++){
    const p=await screen(world);if(await canvasAt(p)){assert.deepEqual(await state(),before,'Framing cannot advance or alter the world');return p;}
    const origin=await page.evaluate(()=>{for(const y of [.46,.36,.56,.66])for(const x of [.5,.3,.7]){const p={x:innerWidth*x,y:innerHeight*y};if(document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS')return p;}});assert.ok(origin,'No unobstructed camera-drag origin');
    const dx=Math.max(-viewport.width*.35,Math.min(viewport.width*.35,origin.x-p.x)),dy=Math.max(-viewport.height*.25,Math.min(viewport.height*.25,origin.y-p.y));
    let end;for(const k of [1,.75,.5,.25,.125]){const q={x:origin.x+dx*k,y:origin.y+dy*k};if(await canvasAt(q)){end=q;break;}}
    assert.ok(end&&Math.hypot(end.x-origin.x,end.y-origin.y)>2,'Camera is at a bound or the target is obscured');await drag(origin,end);
   }
   throw Error(`Cannot frame actual world point ${JSON.stringify(world)}`);
  }
  async function prepared(world){await pause();await frame(world);await resume();await tap(await screen(world),{world,simulationTime:(await state()).time});const received=await state();log('pointer-observation',{observation:await page.evaluate(()=>window.__sparPointerEvidence??null)});log('input-received',{scene:received.scene,player:received.player,paused:received.paused,dialogue:received.dialogue?.id,lastEvent:received.events.at(-1)});console.log('world input',JSON.stringify(world),JSON.stringify({scene:received.scene,x:received.player.x,y:received.player.y,path:received.player.path,paused:received.paused}));await persist();}
  async function walk(x,y){
   const originScene=(await state()).scene;
   await prepared({x,y});await wait(({x,y,originScene})=>{const s=window.__XIAN_NI__.inspect();if(s.scene!==originScene)throw Error(`Ground walk selected a scene transition: ${originScene} to ${s.scene}`);if(s.defeated)throw Error('Defeated while walking');if(s.dialogue)throw Error(`Unexpected dialogue during ground walk: ${s.dialogue.id}`);return s.player.path.length===0&&Math.hypot(s.player.x-x,s.player.y-y)<18;},{x,y,originScene},120000);
   await pause();const s=await state();log('arrived',{target:{x,y},scene:s.scene,time:s.time,player:s.player,run:s.spar.run});
  }
  async function interact(id){const s=await state(),e=s.worlds[s.scene].find(e=>e.id===id);assert.ok(e,`Missing ${s.scene}/${id}`);await prepared({x:e.x,y:e.y});await wait(from=>{const s=window.__XIAN_NI__.inspect();if(s.defeated)throw Error('Defeated before interaction');return s.scene!==from||s.dialogue!==null;},s.scene,120000);log('interaction-response',{id,state:await state()});}
  async function choice(id){
   for(let i=0;i<12&&!(await state()).dialogue?.choices.some(c=>c.id===id);i++){assert.ok((await state()).dialogue?.choices.some(c=>c.id==='more'),`Unavailable choice ${id}`);await button('[data-ui="choice:more"]');}
   assert.ok((await state()).dialogue?.choices.some(c=>c.id===id&&!c.disabled),`Disabled or missing ${id}`);await button(`[data-ui="choice:${id}"]`);await wait(()=>!window.__XIAN_NI__.inspect().dialogue);log('choice-complete',{id,state:await state()});
  }
  async function capture(name){
   const before=await state();assert.ok(!before.spar.run||before.spar.run.phase==='positioning','No automatic combat pause for capture');await pause();
   const s=await state(),path=`${folder}/${item.device}-${item.scenario}-${name}.png`;const png=await page.screenshot({path});item.captures.push({name,path,sha256:sha(png),state:s,presentation:await page.evaluate(()=>window.__XIAN_NI__.presentation()),pausedForCapture:true});await persist();
  }
  async function freshPage(){
   // A new browser context eliminates both in-memory and stored prior states.
   // The application itself creates its normal new game through visible UI.
   await context?.close();context=await browser.newContext({viewport,deviceScaleFactor:mobile?3:2,isMobile:mobile,hasTouch:mobile,acceptDownloads:true});page=await context.newPage();cdp=mobile?await context.newCDPSession(page):null;responses=new Map();
   page.on('crash',()=>{report.errors.push({type:'page-crash',device:item.device,scenario:item.scenario});console.error('PAGE CRASH',item.device,item.scenario);});
   page.on('pageerror',e=>{const error={type:'pageerror',message:e.message};item.consoleErrors.push(error);report.errors.push({...error,device:item.device,scenario:item.scenario});});
   page.on('console',m=>{if(m.type()==='warning')console.log('browser warning',m.text());if(m.type()==='error'){const error={type:'console',message:m.text(),location:m.location()};item.consoleErrors.push(error);report.errors.push({...error,device:item.device,scenario:item.scenario});}});
   page.on('response',r=>{responses.set(r.url(),r);if(r.status()>=400)report.errors.push({type:'http',device:item.device,scenario:item.scenario,url:r.url(),status:r.status()});});
   await page.goto(url,{waitUntil:'load'});await press(page.getByRole('button',{name:'入 山',exact:true}),'title enter');await press(page.getByRole('button',{name:'去回石驿',exact:true}),'create ordinary game');await wait(()=>window.__XIAN_NI__?.inspect().scene==='home');
   // Capture only read-only state at the actual DOM input boundary. This is
   // diagnostic evidence, never a model/camera mutation or a synthetic click.
   await page.evaluate(()=>window.addEventListener('pointerdown',event=>{
    const api=window.__XIAN_NI__,s=api?.inspect();if(!s||s.scene!=='spar'||event.target?.tagName!=='CANVAS')return;
    const a=api.screenPoint(0,0),b=api.screenPoint(1,1);
    window.__sparPointerEvidence={time:s.time,paused:s.paused,run:s.spar.run,peer:s.worlds.spar.find(e=>e.id==='spar_peer'),point:{x:(event.clientX-a.x)/(b.x-a.x),y:(event.clientY-a.y)/(b.y-a.y)},screen:{x:event.clientX,y:event.clientY}};
   },true));
   const scripts=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.src)),hashes=[];for(const src of scripts){const response=responses.get(src);assert.ok(response,`Missing actual loaded script response ${src}`);assert.equal(response.status(),200);hashes.push({url:src,sha256:sha(await response.body())});}
   assert.ok(hashes.length,'Actual runtime scripts must be recorded');(item.runtimeLoads??=[]).push({at:new Date().toISOString(),scripts:hashes});log('fresh-context-created');
  }
  async function importUI(buffer,name,expected){
   await button('[data-ui="settings"]');log('settings-file-import',{name,sha256:sha(buffer)});await page.locator('#import-save').setInputFiles({name,mimeType:'application/json',buffer});
   await wait(({scene,time})=>{const s=window.__XIAN_NI__.inspect();return s.contentVersion===7&&s.scene===scene&&s.time===time&&!document.querySelector('#import-save');},{scene:expected.scene,time:expected.time});
   const s=await state();assert.equal(s.paused,true);assert.equal(s.defeated,false);assert.deepEqual(Object.keys(s.worlds).sort(),['canal','creek','crossing','home','kiln','market','spar','workshop']);
   if(expected.contentVersion===7)assert.deepEqual(s,expected,'A fresh-context import must restore the actual full v7 export');
   else{
    for(const key of ['player','profile','flags','herbs','time','pending','dialogue','projectiles','lastSafe','life','canal','journey','kiln','market'])assert.deepEqual(s[key],expected[key],`Migration changed ${key}`);
    for(const [scene,entities] of Object.entries(expected.worlds))for(const e of entities)assert.deepEqual(s.worlds[scene].find(x=>x.id===e.id),e,`Migration changed ${scene}/${e.id}`);
    assert.deepEqual(s.spar,{run:null,last:null,facts:[],reported:[]});
   }
   const frozen=await state();await page.waitForTimeout(350);assert.deepEqual(await state(),frozen,'Imported pause must preserve time, NPCs and pending input');
   item.checks.push({id:`import-${name}`,fullV7Equality:expected.contentVersion===7,pauseFrozenWallMs:350,state:s});
  }
  async function exportUI(name){
   await pause();await button('[data-ui="settings"]');const expected=await state();const promise=page.waitForEvent('download',{timeout:30000});await button('[data-ui="export"]');const download=await promise,path=`${folder}/${item.device}-${item.scenario}-${name}.json`;await download.saveAs(path);await button('[data-ui="close"]');
   const buffer=await readFile(path),saved=JSON.parse(buffer);assert.deepEqual(saved,expected,'Downloaded JSON must be the real paused world');assert.equal(saved.contentVersion,7);assert.equal(saved.paused,true);
   item.exports.push({path,sha256:sha(buffer),scene:saved.scene,time:saved.time,player:saved.player,spar:saved.spar});log('settings-export',{path});return {buffer,saved};
  }

  await freshPage();await capture('fresh-game');await importUI(bytes,'fixed-return-main-v0.7.0.json',original);await capture('imported-home');
  // Real pathfinding handles the old courtyard; no scene/position injection.
  await walk(1500,480);await interact('home_to_spar');let s=await state();assert.equal(s.scene,'home');assert.equal(s.dialogue.id,'spar_wait');assert.equal(s.flags.companion,'following');
  const waitingXu=structuredClone(s.worlds.home.find(e=>e.id==='xu'));await choice('spar:wait-enter');await wait(()=>window.__XIAN_NI__.inspect().scene==='spar');await pause();s=await state();
  assert.equal(s.flags.companion,'waiting');assert.equal(s.worlds.spar.some(e=>e.type==='xu'),false);assert.equal(s.worlds.home.find(e=>e.id==='xu').x,waitingXu.x);assert.equal(s.worlds.home.find(e=>e.id==='xu').y,waitingXu.y);
  assert.equal(s.player.hp,original.player.hp);assert.equal(s.player.mana,original.player.mana);await capture('entry');
  await walk(900,1060);await interact('spar_peer');assert.equal((await state()).dialogue.id,'spar_peer');await capture('agreement');await choice(`spar:agree:${stance}`);
  // At agreement the peer stands only 40 units from the circle. Clicking the
  // circle while his real body crosses it correctly selects him, not ground.
  // Let his actual walking clear that target before issuing a ground click.
  await wait(()=>{const s=window.__XIAN_NI__.inspect(),e=s.worlds.spar.find(e=>e.id==='spar_peer');if(s.paused||s.dialogue||s.defeated)throw Error('Interrupted before peer cleared circle');return s.spar.run?.phase==='positioning'&&Math.hypot(e.x-900,e.y-940)>90;},undefined,60000);
  log('peer-cleared-ground-target',{state:await state()});
  await walk(900,940);s=await state();assert.equal(s.spar.run.phase,'positioning');assert.equal(s.spar.run.stance,stance);await capture('positioning');
  const staged=await exportUI('positioning-paused');await freshPage();await importUI(staged.buffer,'actual-positioning-v7.json',staged.saved);
  await resume();await wait(target=>{const s=window.__XIAN_NI__.inspect(),e=s.worlds.spar.find(e=>e.id==='spar_peer');if(s.defeated||s.dialogue)throw Error('Interrupted before readiness');return s.spar.run?.phase==='positioning'&&s.spar.run.positionPath.length===0&&Math.hypot(e.x-target.x,e.y-target.y)<=3&&s.player.path.length===0&&Math.hypot(s.player.x-900,s.player.y-940)<=53;},station,120000);
  await capture('ready');const before=await state();assert.equal(before.projectiles.length,0);assert.equal(before.spar.last,null);assert.ok(before.player.hp>=2);assert.ok(before.player.mana>=1);
  const musicHandle=await wait(()=>{const a=window.__XIAN_NI__.audio();return a.scene==='spar'&&a.state==='running'&&!a.muted&&a.musicRms>.0001?a:false;},undefined,10000);
  item.practiceAudioBefore=await musicHandle.jsonValue();await musicHandle.dispose();
  if(item.scenario==='ward')await button('[data-ui="spell:ward"]');
  // No preparation, screenshot, camera gesture or pause after this begin.
  await resume();await button('[data-ui="spar-begin"]');
  const shotHandle=await wait(()=>{
   const api=window.__XIAN_NI__,s=api.inspect(),r=s.spar.run;if(s.paused||s.dialogue||s.defeated)throw Error('Hand was interrupted');if(!r)throw Error('Hand settled before emission evidence was sampled');
   if(r.shots!==1||s.projectiles.length!==1)return false;
   const e=s.worlds.spar.find(e=>e.id==='spar_peer'),p=api.screenPoint(e.x,e.y);
   return {scene:s.scene,time:s.time,player:s.player,run:r,peer:e,projectile:s.projectiles[0],aim:p,aimIsCanvas:p.x>2&&p.y>2&&p.x<innerWidth-2&&p.y<innerHeight-2&&document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS',paused:s.paused};
  },undefined,90000);
  const shot=await shotHandle.jsonValue();await shotHandle.dispose();item.emission=shot;assert.equal(shot.scene,'spar');assert.equal(shot.run.stance,stance);assert.equal(shot.projectile.id,Number(before.flags.projectileSeq??0)+1);
  if(item.scenario==='ward'){
   assert.equal(shot.aimIsCanvas,true,'The actual firing peer must be aimable without a combat pan');
   log(mobile?'touch-ward-on-emission':'mouse-ward-on-emission',{world:{x:shot.peer.x,y:shot.peer.y},screen:shot.aim,simulationTime:shot.time,projectile:shot.projectile});
   // Use the just-observed real CSS coordinate directly; no model command.
   if(mobile)await page.touchscreen.tap(shot.aim.x,shot.aim.y);else await page.mouse.click(shot.aim.x,shot.aim.y);
  }
  await wait(()=>{const s=window.__XIAN_NI__.inspect();if(s.paused||s.dialogue||s.defeated)throw Error('Hand unexpectedly paused or defeated');return s.spar.run===null&&s.spar.last!==null;},undefined,90000);
  const result=await state(),wanted=item.scenario==='ward'?'blocked':'hit';assert.deepEqual(result.spar.last,{stance,outcome:wanted,hurt:wanted==='hit'});assert.equal(result.player.hp,before.player.hp-(wanted==='hit'?1:0));assert.equal(result.player.mana,before.player.mana-(wanted==='blocked'?1:0));assert.equal(result.flags.projectileSeq,Number(before.flags.projectileSeq??0)+1);assert.equal(result.projectiles.length,0);assert.equal(peer(result).state,'peaceful');assert.deepEqual(result.spar.facts,[`${stance}:${wanted}`]);assert.deepEqual(result.spar.reported,[]);
  item.practiceAudioAfter=await page.evaluate(()=>window.__XIAN_NI__.audio());
  const effect=wanted==='blocked'?'block':'hurt';
  assert.ok((item.practiceAudioAfter.effectCounts[effect]??0)>(item.practiceAudioBefore.effectCounts[effect]??0),'The actual result must produce a new matching audio effect');
  assert.equal(item.practiceAudioAfter.scene,'spar');assert.equal(item.practiceAudioAfter.error,'');
  item.result=result;await capture('settled');
  await walk(900,1160);await interact('spar_to_home');await wait(()=>window.__XIAN_NI__.inspect().scene==='home');await pause();s=await state();
  assert.equal(s.flags.companion,'waiting');assert.equal(s.worlds.home.find(e=>e.id==='xu').x,waitingXu.x);assert.equal(s.worlds.home.find(e=>e.id==='xu').y,waitingXu.y);assert.equal(s.player.hp,result.player.hp);assert.equal(s.player.mana,result.player.mana);await capture('returned-home');
  // Click the actual table, rather than a coordinate that may select a workbench.
  await interact('table');assert.ok((await state()).dialogue);await choice('spar:report');await pause();s=await state();assert.deepEqual(s.spar.reported,s.spar.facts);assert.deepEqual(s.spar.facts,[`${stance}:${wanted}`]);assert.equal(s.player.hp,result.player.hp);assert.equal(s.player.mana,result.player.mana);
  assert.deepEqual(s.life,original.life);assert.deepEqual(s.canal,original.canal);assert.deepEqual(s.journey,original.journey);assert.deepEqual(s.kiln,original.kiln);assert.deepEqual(s.market,original.market);assert.equal(s.herbs,original.herbs);await capture('table-reported');
  const final=await exportUI('reported-paused');await freshPage();await importUI(final.buffer,'actual-reported-v7.json',final.saved);await capture('reimported-report');
  item.audio=await page.evaluate(()=>window.__XIAN_NI__.audio());assert.equal(item.consoleErrors.length,0);item.status='PASS';await persist();console.log(`${item.device} ${item.scenario} ${stance} PASS ${folder}`);await context.close();context=null;page=null;
 }
 assert.equal(report.errors.length,0,'Browser/runtime errors must be reviewed rather than hidden');report.status='PASS';
}catch(error){
 report.status='FAIL';if(active)active.status='FAIL';report.errors.push({type:'failure',message:String(error.stack||error)});console.error(error);process.exitCode=1;
 if(page){try{active.failureState=await page.evaluate(()=>window.__XIAN_NI__?.inspect());}catch(e){active.failureStateError=String(e);}try{const path=`${folder}/${active.device}-${active.scenario}-failure.png`;await page.screenshot({path});active.failureScreenshot=path;}catch(e){active.failureScreenshotError=String(e);}}
}finally{await context?.close();await browser?.close();report.finishedAt=new Date().toISOString();await persist();console.log(`${folder}/report.json ${report.status}`);}

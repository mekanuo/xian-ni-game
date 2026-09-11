import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// SPAR_START is an unchanged, actual positioning-paused v7 UI export.
// All mutations below are ordinary DOM/mouse/keyboard input, never model calls.
const url=process.env.GAME_URL||'http://127.0.0.1:4194/';
const input=process.env.SPAR_START;
const runId=new Date().toISOString().replaceAll(/[:.]/g,'-');
const folder=`qa/spar-facing-${runId}`;
const output=process.env.SPAR_FACING_OUTPUT||`${folder}/report.json`;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={schemaVersion:1,runId,url,status:'NOT_RUN',startedAt:new Date().toISOString(),sourceRevision:process.env.SOURCE_SHA||null,
 scope:'One actual eastward ward, short westward keyboard movement, release and ordinary pause; checks the stationary front-frame facing regression only.',
 device:{width:1440,height:900,dpr:2,mobile:false},inputs:[],checks:[],captures:[],errors:[],limitations:[
  'Desktop emulated Chromium, not physical Mac/Safari or phone verification.',
  'Does not verify a complete hand, enemy attack, block, damage, report, or full activity loop.',
  'Frame/flip assertions prove the selected display transform; the screenshot still needs human review of the actual hand and body.',
  'Source and loaded runtime hashes are separate observations; optional SOURCE_SHA is caller-provided, not a verified release binding.',
 ]};
let browser,context,page;
await mkdir(folder,{recursive:true});
const persist=async()=>{const data=JSON.stringify(report,null,2);await writeFile(`${folder}/report.json`,data);if(output!==`${folder}/report.json`)await writeFile(output,data);};
const log=(action,details={})=>report.inputs.push({action,...details,wall:new Date().toISOString()});
await persist();
try{
 assert.ok(input,'SPAR_START must be an actual positioning-paused v7 UI export');
 const bytes=await readFile(input),original=JSON.parse(bytes);
 assert.equal(original.contentVersion,7);assert.equal(original.scene,'spar');assert.equal(original.paused,true);
 assert.equal(original.dialogue,null);assert.equal(original.defeated,false);assert.equal(original.pending,null);
 assert.equal(original.spar.run?.phase,'positioning');assert.equal(original.projectiles.length,0);
 assert.equal(original.player.path.length,0);assert.equal(original.player.pullId,null);
 assert.ok(!original.flags.casting);assert.ok(original.player.mana>=1);assert.ok(original.player.hp>=2);
 assert.equal(original.player.ward,0);assert.equal(Number(original.flags.wardCooldown??0),0);
 assert.ok(Math.hypot(original.player.x-900,original.player.y-940)<=53);
 report.input={path:input,sha256:sha(bytes),origin:'Actual caller-provided v7 UI export, imported byte-for-byte; no editing or derived fixture.'};
 report.sourceFiles=[];
 for(const path of ['src/game/scene.ts','src/game/ui.ts','src/game/model.ts','src/game/spar.ts','src/game/spar-art.ts','src/game/presentation.ts','src/game/display.ts','scripts/spar-facing-check.mjs']){
  report.sourceFiles.push({path,sha256:sha(await readFile(path))});
 }
 report.status='RUNNING';await persist();
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 report.environment={platform:process.platform,browser:browser.version(),executable:process.env.CHROME_PATH||'/usr/bin/google-chrome'};
 context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:2,acceptDownloads:true});
 page=await context.newPage();const responses=new Map();
 page.on('pageerror',e=>report.errors.push({type:'pageerror',message:e.message}));
 page.on('console',m=>{if(m.type()==='error')report.errors.push({type:'console',message:m.text(),location:m.location()});});
 page.on('response',r=>{responses.set(r.url(),r);if(r.status()>=400)report.errors.push({type:'http',url:r.url(),status:r.status()});});
 page.on('crash',()=>report.errors.push({type:'crash'}));
 const state=()=>page.evaluate(()=>window.__XIAN_NI__.inspect());
 const evidence=()=>page.evaluate(()=>({state:window.__XIAN_NI__.inspect(),camera:window.__XIAN_NI__.camera(),presentation:window.__XIAN_NI__.presentation()}));
 const wait=(fn,arg,timeout=60000)=>page.waitForFunction(fn,arg,{timeout,polling:'raf'});
 const rendered=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true)))));
 async function press(locator,label){
  await locator.waitFor({state:'visible',timeout:60000});assert.equal(await locator.isEnabled(),true,label);
  log('mouse-control',{label,box:await locator.boundingBox()});await locator.click();
 }
 const button=selector=>press(page.locator(selector),selector);
 async function pause(value){
  const s=await state();assert.equal(s.defeated,false);assert.equal(s.dialogue,null);
  if(s.paused!==value){
   log('keyboard-Space-down',{pause:value,simulationTime:s.time});await page.keyboard.down('Space');
   try{await wait(v=>window.__XIAN_NI__.inspect().paused===v,value,5000);}
   finally{await page.keyboard.up('Space');log('keyboard-Space-up');}
  }
  await wait(v=>window.__XIAN_NI__.inspect().paused===v,value,5000);await rendered();
 }
 await page.goto(url,{waitUntil:'load'});
 await press(page.getByRole('button',{name:'入 山',exact:true}),'title enter');
 await press(page.getByRole('button',{name:'去回石驿',exact:true}),'ordinary new game');
 await wait(()=>window.__XIAN_NI__?.inspect().scene==='home');
 const scriptUrls=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.src));assert.ok(scriptUrls.length);
 report.runtimeScripts=[];
 for(const src of scriptUrls){const response=responses.get(src);assert.ok(response,`Missing actual script response ${src}`);assert.equal(response.status(),200);report.runtimeScripts.push({url:src,sha256:sha(await response.body())});}
 await button('[data-ui="settings"]');log('settings-file-import',{path:input,sha256:sha(bytes)});
 await page.locator('#import-save').setInputFiles({name:'actual-positioning-paused-v7.json',mimeType:'application/json',buffer:bytes});
 await wait(time=>{const s=window.__XIAN_NI__.inspect();return s.scene==='spar'&&s.time===time&&!document.querySelector('#import-save');},original.time);
 assert.deepEqual(await state(),original,'UI import must preserve the complete real export');await rendered();
 report.imported=await evidence();
 report.canvas=await page.evaluate(()=>{const c=document.querySelector('canvas');return{width:c.width,height:c.height,css:c.getBoundingClientRect().toJSON(),devicePixelRatio,density:window.__XIAN_NI__.camera().density};});
 const density=Math.max(1,Math.min(2,3,Math.sqrt(5_000_000/(1440*900))));
 assert.equal(report.canvas.devicePixelRatio,2);assert.equal(report.canvas.density,density);
 assert.equal(report.canvas.width,Math.round(1440*density));assert.equal(report.canvas.height,Math.round(900*density));

 // End positioning normally. No begin is needed: idle spar permits ward,
 // and the peaceful peer cannot add a hostile timing dependency to this case.
 await pause(false);await button('[data-ui="spar-stop"]');
 await wait(()=>{const s=window.__XIAN_NI__.inspect();return s.spar.run===null&&s.spar.last?.outcome==='stopped';},undefined,5000);
 const stopped=await state();report.checks.push({id:'real-positioning-stop',state:stopped});
 assert.equal(stopped.projectiles.length,0);assert.equal(stopped.flags.projectileSeq,original.flags.projectileSeq);
 assert.equal(stopped.player.hp,original.player.hp);assert.equal(stopped.player.mana,original.player.mana);
 assert.deepEqual(stopped.spar.facts,original.spar.facts);assert.deepEqual(stopped.spar.reported,original.spar.reported);
 assert.equal(stopped.worlds.spar.find(e=>e.id==='spar_peer').state,'peaceful');
 // Camera settling occurs BEFORE the six-second ward budget starts.
 log('pre-ward-camera-settle',{wallMs:1200});await page.waitForTimeout(1200);
 await pause(true);await button('[data-ui="spell:ward"]');
 const before=await state();assert.equal(before.pending,null);assert.equal(before.player.ward,0);
 await pause(false);
 const aim=await page.evaluate(()=>{
  const s=window.__XIAN_NI__.inspect(),world={x:s.player.x+145,y:s.player.y};
  const screen=window.__XIAN_NI__.screenPoint(world.x,world.y);
  return{world,screen,canvas:document.elementFromPoint(screen.x,screen.y)?.tagName==='CANVAS',state:s};
 });
 assert.equal(aim.canvas,true,'Eastward aim must be actual exposed canvas, without blind fixed coordinates');
 log('mouse-world-cast',{world:aim.world,screen:aim.screen,simulationTime:aim.state.time});
 await page.mouse.click(aim.screen.x,aim.screen.y);
 await wait(()=>window.__XIAN_NI__.inspect().player.ward>0,undefined,4000);
 const cast=await state();report.checks.push({id:'actual-eastward-ward',state:cast});
 assert.equal(cast.player.mana,before.player.mana-1);assert.equal(cast.player.path.length,0);
 assert.ok(Math.cos(cast.player.wardFacing)>.999&&Math.abs(Math.sin(cast.player.wardFacing))<.03,'Actual ward direction must be east');

 // No screenshot, file write, camera pan or long sleep within the live ward.
 // Release as soon as real movement reaches 12 world units, then allow only
 // rendered frames to observe the stationary pose before ordinary Space pause.
 log('keyboard-down',{key:'a',simulationTime:cast.time,x:cast.player.x});
 await page.keyboard.down('a');
 try{
  await wait(start=>{const s=window.__XIAN_NI__.inspect();if(s.player.ward<=0||s.paused||s.defeated)throw Error('Live ward observation budget expired/interrupted');return s.player.x<=start-12;},cast.player.x,2500);
 }finally{log('keyboard-up',{key:'a'});await page.keyboard.up('a');}
 await rendered();await rendered();
 const stationary=await state();assert.ok(stationary.player.ward>0,'Must stop moving before the actual ward expires');
 await rendered();const still=await state();
 assert.equal(still.player.x,stationary.player.x);assert.equal(still.player.y,stationary.player.y);
 assert.equal(still.player.path.length,0);
 await pause(true);
 const final=await evidence();report.checks.push({id:'stationary-east-ward-west-facing-paused',stationary,still,...final,
  wardObservationSimulationSeconds:final.state.time-cast.time});
 const pngPath=`${folder}/east-ward-after-west-step-paused.png`;
 const png=await page.screenshot({path:pngPath});
 report.captures.push({path:pngPath,sha256:sha(png),requiresHumanReview:true,state:final.state,presentation:final.presentation,camera:final.camera});
 await persist(); // Preserve the actual regression screenshot before assertions.
 assert.deepEqual(await state(),final.state,'Paused screenshot must not advance the world');
 assert.equal(final.state.paused,true);assert.equal(final.state.spar.run,null);
 assert.ok(final.state.player.ward>0,'Facing evidence must retain a live ward');
 assert.ok(Math.cos(final.state.player.wardFacing)>.999&&Math.abs(Math.sin(final.state.player.wardFacing))<.03);
 assert.ok(Math.cos(final.state.player.facing)<-.999,'Actual last movement must face west');
 assert.ok(final.state.player.x<cast.player.x-8,'Must have real westward displacement');
 assert.equal(final.state.player.hp,before.player.hp);assert.equal(final.state.player.mana,before.player.mana-1);
 assert.equal(final.state.projectiles.length,0);assert.equal(final.state.worlds.spar.find(e=>e.id==='spar_peer').state,'peaceful');
 assert.equal(final.presentation.player.texture,'characters','East is the existing front-facing texture');
 assert.equal(String(final.presentation.player.frame),String(final.state.profile.appearance));
 assert.equal(final.presentation.player.flipX,false,'Stationary front ward must face east despite the last westward movement; old code incorrectly flips it');
 assert.equal(report.errors.length,0,'Runtime errors cannot be hidden');
 report.status='PASS';
}catch(error){
 report.status='FAIL';report.errors.push({type:'failure',message:String(error.stack||error)});process.exitCode=1;
 if(page){
  try{report.failureEvidence=await page.evaluate(()=>({state:window.__XIAN_NI__?.inspect(),camera:window.__XIAN_NI__?.camera(),presentation:window.__XIAN_NI__?.presentation()}));}catch(e){report.failureEvidenceError=String(e);}
  try{const path=`${folder}/failure.png`,png=await page.screenshot({path,timeout:10000});report.failureScreenshot={path,sha256:sha(png),note:'Failure capture may be live; do not reinterpret it as the paused regression sample.'};}catch(e){report.failureScreenshotError=String(e);}
 }
}finally{
 try{await context?.close();await browser?.close();}catch(error){report.errors.push({type:'cleanup',message:String(error)});report.status='FAIL';process.exitCode=1;}
 report.finishedAt=new Date().toISOString();await persist();console.log(`${folder}/report.json ${report.status}`);
}

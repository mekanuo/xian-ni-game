import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Read-only evidence plus real UI input. SPAR_START is an unchanged, actual
// positioning-paused v7 export from spar-production-check, never a fabricated save.
const url=process.env.GAME_URL||'http://127.0.0.1:4194/';
const input=process.env.SPAR_START;
const runId=new Date().toISOString().replaceAll(/[:.]/g,'-');
const folder=`qa/spar-presentation-${runId}`;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const devices=[
 {name:'desktop',width:1440,height:900,dpr:2,mobile:false},
 {name:'phone',width:390,height:844,dpr:3,mobile:true},
 {name:'short',width:1280,height:500,dpr:2,mobile:false},
];
const report={schemaVersion:1,runId,url,status:'NOT_RUN',startedAt:new Date().toISOString(),sourceRevision:process.env.SOURCE_SHA||null,
 scope:'Serial positioning import, real manual pan and C / 回到身边, ready pause freeze, immediate begin/stop, settled pause camera freeze. No full-hand repeat.',
 cases:devices.map(device=>({device,status:'NOT_RUN',inputs:[],checks:[],captures:[],errors:[]})),errors:[],limitations:[
  'Emulated Chromium viewports and touch, not physical devices or Safari.',
  'Frame names and coordinates are recorded only as evidence; screenshots require human review for facing, composition, lettering and material quality.',
  'This deliberately stops before emission; it does not verify a live residual projectile, damage, ward, report or full activity completion.',
  'Source file hashes and loaded runtime JS hashes are separate observations; SOURCE_SHA is an optional caller-provided revision, not inferred release verification.',
 ]};
let browser,context,page,cdp,active;
await mkdir(folder,{recursive:true});
const persist=()=>writeFile(`${folder}/report.json`,JSON.stringify(report,null,2));
await persist();
try{
 assert.ok(input,'SPAR_START must point to an actual positioning-paused v7 UI export');
 const bytes=await readFile(input),original=JSON.parse(bytes);
 assert.equal(original.contentVersion,7);assert.equal(original.scene,'spar');assert.equal(original.paused,true);
 assert.equal(original.dialogue,null);assert.equal(original.defeated,false);assert.equal(original.spar.run?.phase,'positioning');
 assert.equal(original.projectiles.length,0);assert.equal(original.player.path.length,0);
 assert.ok(Math.hypot(original.player.x-900,original.player.y-940)<=53,'Input must be the actual in-circle positioning export');
 assert.ok(original.player.hp>=2);assert.equal(original.pending,null);
 const station={front:{x:900,y:720},left:{x:680,y:940},right:{x:1120,y:940}}[original.spar.run.stance];
 assert.ok(station);report.input={path:input,sha256:sha(bytes),contentVersion:7,stance:original.spar.run.stance,origin:'Caller-supplied actual production UI export, imported byte-for-byte without editing.'};
 report.sourceFiles=[];
 for(const path of ['src/game/scene.ts','src/game/ui.ts','src/game/spar.ts','src/game/spar-art.ts','src/game/display.ts','scripts/spar-presentation-check.mjs'])report.sourceFiles.push({path,sha256:sha(await readFile(path))});
 report.status='RUNNING';await persist();
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 report.environment={platform:process.platform,browser:browser.version()};
 for(const item of report.cases){
  active=item;item.status='RUNNING';const d=item.device;
  context=await browser.newContext({viewport:{width:d.width,height:d.height},deviceScaleFactor:d.dpr,isMobile:d.mobile,hasTouch:d.mobile,acceptDownloads:true});
  page=await context.newPage();cdp=d.mobile?await context.newCDPSession(page):null;const responses=new Map();
  page.on('pageerror',e=>item.errors.push({type:'pageerror',message:e.message}));
  page.on('console',m=>{if(m.type()==='error')item.errors.push({type:'console',message:m.text(),location:m.location()});});
  page.on('response',r=>{responses.set(r.url(),r);if(r.status()>=400)item.errors.push({type:'http',url:r.url(),status:r.status()});});
  page.on('crash',()=>item.errors.push({type:'crash'}));
  const state=()=>page.evaluate(()=>window.__XIAN_NI__.inspect());
  const camera=()=>page.evaluate(()=>window.__XIAN_NI__.camera());
  const presentation=()=>page.evaluate(()=>window.__XIAN_NI__.presentation());
  const wait=(fn,arg,timeout=60000)=>page.waitForFunction(fn,arg,{timeout,polling:'raf'});
  const log=(action,details={})=>item.inputs.push({action,...details,wall:new Date().toISOString()});
  const rendered=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true)))));
  async function press(locator,label){
   await locator.waitFor({state:'visible',timeout:60000});assert.equal(await locator.isEnabled(),true,label);
   log(d.mobile?'touch-control':'mouse-control',{label,box:await locator.boundingBox()});
   if(d.mobile)await locator.tap();else await locator.click();
  }
  const button=selector=>press(page.locator(selector),selector);
  async function pause(value){
   const s=await state();assert.equal(s.defeated,false);assert.equal(s.dialogue,null);
   if(s.paused!==value)await button('.action-dock [data-ui="pause"]');
   await wait(value=>window.__XIAN_NI__.inspect().paused===value,value);await rendered();
  }
  async function capture(name){
   assert.equal((await state()).paused,true);const path=`${folder}/${d.name}-${name}.png`;
   const before=await state(),png=await page.screenshot({path});assert.deepEqual(await state(),before,'Screenshot cannot advance paused simulation');
   item.captures.push({name,path,sha256:sha(png),state:before,camera:await camera(),presentation:await presentation(),requiresHumanReview:true});await persist();
  }
  async function frozen(name){
   await pause(true);const before={state:await state(),camera:await camera(),presentation:await presentation()};
   await page.waitForTimeout(600);
   const after={state:await state(),camera:await camera(),presentation:await presentation()};
   // Persist both samples before asserting, so drift remains diagnosable on FAIL.
   item.checks.push({id:name,wallMs:600,before,after});await persist();
   assert.deepEqual(after.state,before.state,`${name}: complete inspect unchanged`);
   assert.deepEqual(after.camera,before.camera,`${name}: camera zoom/view/density frozen`);
   assert.deepEqual(after.presentation.actors,before.presentation.actors,`${name}: rendered actor transforms frozen`);
   assert.deepEqual(after.presentation.player,before.presentation.player,`${name}: rendered player transform frozen`);
   await capture(name);
  }
  async function pan(){
   const points=await page.evaluate(()=>{
    const onCanvas=p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS';
    for(const y of [.45,.52,.6,.36])for(const x of [.4,.5,.3]){
     const a={x:innerWidth*x,y:innerHeight*y},b={x:a.x+Math.min(85,innerWidth*.18),y:a.y+18};
     if(onCanvas(a)&&onCanvas(b))return{a,b};
    }
   });assert.ok(points,'Need exposed canvas for actual camera drag');const {a,b}=points;
   log(d.mobile?'single-finger-pan':'shift-mouse-pan',{a,b,units:'CSS pixels'});
   if(d.mobile){
    const toggle=page.locator('[data-ui="pan"]');assert.notEqual(await toggle.getAttribute('aria-pressed'),'true');await press(toggle,'enable camera pan');
    try{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]});
     for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/8,y:a.y+(b.y-a.y)*i/8,id:1}]});
    }finally{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
   }else{
    await page.keyboard.down('Shift');try{await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});}finally{await page.mouse.up();await page.keyboard.up('Shift');}
   }
   await rendered();
  }
  await page.goto(url,{waitUntil:'load'});
  await press(page.getByRole('button',{name:'入 山',exact:true}),'title enter');
  await press(page.getByRole('button',{name:'去回石驿',exact:true}),'ordinary new game');
  await wait(()=>window.__XIAN_NI__?.inspect().scene==='home');
  const scriptUrls=await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.src));assert.ok(scriptUrls.length);
  item.runtimeScripts=[];for(const src of scriptUrls){const response=responses.get(src);assert.ok(response,`Loaded script response missing: ${src}`);assert.equal(response.status(),200);item.runtimeScripts.push({url:src,sha256:sha(await response.body())});}
  await button('[data-ui="settings"]');log('settings-file-import',{path:input,sha256:sha(bytes)});
  await page.locator('#import-save').setInputFiles({name:'actual-positioning-paused-v7.json',mimeType:'application/json',buffer:bytes});
  await wait(time=>{const s=window.__XIAN_NI__.inspect();return s.scene==='spar'&&s.time===time&&!document.querySelector('#import-save');},original.time);
  assert.deepEqual(await state(),original,'Fresh-context v7 UI import must preserve the complete actual export');await rendered();
  item.canvas=await page.evaluate(()=>{const c=document.querySelector('canvas');return{width:c.width,height:c.height,css:c.getBoundingClientRect().toJSON(),devicePixelRatio,view:window.__XIAN_NI__.camera()};});
  const density=Math.max(1,Math.min(d.dpr,3,Math.sqrt(5_000_000/(d.width*d.height))));
  assert.equal(item.canvas.width,Math.round(d.width*density));assert.equal(item.canvas.height,Math.round(d.height*density));
  assert.equal(item.canvas.view.density,density);
  const panBefore={state:await state(),camera:await camera()};await pan();const panned=await camera();
  assert.notDeepEqual(panned.view,panBefore.camera.view,'Actual drag must move the camera');assert.deepEqual(await state(),panBefore.state);
  if(d.mobile)await button('[data-ui="center"]');else{log('keyboard-C');await page.keyboard.press('c');}
  await rendered();const centered=await camera();assert.notDeepEqual(centered.view,panned.view,'Real C / center must undo manual framing');
  if(d.mobile)assert.equal(await page.locator('[data-ui="pan"]').getAttribute('aria-pressed'),'false','Center disables touch pan');
  assert.deepEqual(await state(),panBefore.state,'Manual pan and center cannot mutate the paused world');
  item.checks.push({id:'real-pan-and-center',before:panBefore.camera,panned,centered});
  await pause(false);
  await wait(target=>{const s=window.__XIAN_NI__.inspect(),e=s.worlds.spar.find(e=>e.id==='spar_peer');if(s.defeated||s.dialogue)throw Error('Unexpected interruption during positioning');return s.spar.run?.phase==='positioning'&&!s.spar.run.positionWaiting&&s.spar.run.positionPath.length===0&&Math.hypot(e.x-target.x,e.y-target.y)<=3&&s.player.path.length===0;},station,120000);
  // Permit the live camera to establish its automatic activity framing after C.
  await page.waitForTimeout(1000);
  const readyCamera=await camera();const hud=await page.evaluate(()=>({top:Math.max(110,...['.top-left','.location','.top-right'].map(s=>document.querySelector(s)?.getBoundingClientRect().bottom??0))+12,dock:document.querySelector('.action-dock').getBoundingClientRect().top}));
  const expectedZoom=Math.min(1,(d.width-28)/600,(Math.max(hud.top+120,hud.dock-18)-hud.top)/600);
  assert.ok(Math.abs(readyCamera.zoom-expectedZoom)<.003,'C restores automatic 600-world activity camera scaling');
  const expectedCenter={x:900,y:880+(d.height/2-(hud.top+Math.max(hud.top+120,hud.dock-18))/2)/readyCamera.zoom};
  const actualCenter={x:readyCamera.view.x+readyCamera.view.width/2,y:readyCamera.view.y+readyCamera.view.height/2};
  assert.ok(Math.hypot(actualCenter.x-expectedCenter.x,actualCenter.y-expectedCenter.y)<3,'After C the automatic activity target must replace the manual/player center');
  item.checks.push({id:'automatic-framing-restored',readyCamera,expectedZoom,expectedCenter,actualCenter,hud});
  await frozen('positioning-ready-paused');
  const beforeHand=await state();assert.equal(beforeHand.projectiles.length,0);
  await pause(false);await button('[data-ui="spar-begin"]');
  const activeState=await state();assert.equal(activeState.spar.run?.phase,'active','Real begin must enter active before stop');
  // No screenshot, deliberate delay or camera gesture between begin and stop.
  await button('[data-ui="spar-stop"]');
  await wait(()=>{const s=window.__XIAN_NI__.inspect();if(s.paused||s.dialogue||s.defeated)throw Error('Unexpected interruption after stop');return s.spar.run===null&&s.spar.last?.outcome==='stopped';},undefined,10000);
  await pause(true);const settled=await state();
  item.checks.push({id:'immediate-real-begin-stop',activeState,settled});await persist();
  assert.equal(settled.projectiles.length,0);assert.equal(settled.flags.projectileSeq,beforeHand.flags.projectileSeq,'This bounded case must stop before emission');
  assert.equal(settled.player.hp,beforeHand.player.hp);assert.equal(settled.player.mana,beforeHand.player.mana);
  assert.deepEqual(settled.spar.facts,beforeHand.spar.facts);assert.deepEqual(settled.spar.reported,beforeHand.spar.reported);
  await frozen('settled-paused');assert.equal(item.errors.length,0,'Do not hide runtime errors');
  item.status='PASS';await persist();await context.close();context=null;page=null;
 }
 report.status='PASS';
}catch(error){
 report.status='FAIL';if(active)active.status='FAIL';report.errors.push({type:'failure',message:String(error.stack||error)});process.exitCode=1;
 if(page&&active){
  try{active.failureEvidence=await page.evaluate(()=>({state:window.__XIAN_NI__?.inspect(),camera:window.__XIAN_NI__?.camera(),presentation:window.__XIAN_NI__?.presentation()}));}catch(e){active.failureEvidenceError=String(e);}
  try{const path=`${folder}/${active.device.name}-failure.png`;const png=await page.screenshot({path,timeout:10000});active.failureScreenshot={path,sha256:sha(png)};}catch(e){active.failureScreenshotError=String(e);}
 }
}finally{
 try{await context?.close();await browser?.close();}catch(error){report.errors.push({type:'cleanup',message:String(error)});report.status='FAIL';process.exitCode=1;}
 report.finishedAt=new Date().toISOString();await persist();console.log(`${folder}/report.json ${report.status}`);
}

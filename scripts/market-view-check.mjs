import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Bounded production art/input follow-up. This actual earlier UI export is read
// unchanged; every new action uses settings, mouse or real single-finger touch.
const url=process.env.GAME_URL||'http://127.0.0.1:4194/';
const fixturePath='qa/evidence/market-2026-09-11T15-13-29-584Z/market-west-entry.json';
const runId=new Date().toISOString().replaceAll(':','-').replaceAll('.','-');
const folder=`qa/evidence/market-view-${runId}`,output='qa/evidence/market-view.json';
const selection=process.env.MARKET_VIEW_DEVICE||'all';
const devices=[{id:'desktop-1440-dpr2',width:1440,height:900,dpr:2},{id:'short-1280-dpr1',width:1280,height:500,dpr:1},{id:'phone-390-dpr3',width:390,height:844,dpr:3,touch:true}].filter(d=>selection==='all'||d.id.startsWith(selection));
assert.ok(devices.length,'Unknown MARKET_VIEW_DEVICE');
const assetNames=['market-ground.png','market-environment.png','market-props.png','market-shenyan.png'];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={schemaVersion:1,runId,selection,status:'NOT_RUN',startedAt:new Date().toISOString(),url,scope:'Three serial production viewports: actual entry import, sign and merchant framing, conversation, physical opening, idle/walking presentation and pause freezing. No complete crossing/report route.',devices:[],errors:[],limitations:[
 'Linux Chrome viewport/DPR/touch emulation; not physical Mac, Safari or phone.',
 'World movement and NPC opening are real input-driven actions. Framing and captures intentionally pause the world; this is not uninterrupted combat evidence.',
 'Merchant waiting pose is NOT_RUN in this bounded production visual check. No artificial threat or state is injected to force it; prior model/whitebox evidence does not prove this production pose was seen.',
 'Canvas hit checks prove the sampled body/sign positions are clear of DOM. Screenshots still require visual assessment of artwork, world occlusion and overall quality.',
]};
let browser,activePage,activeItem;
await mkdir(folder,{recursive:true});
const persist=async()=>{const json=JSON.stringify(report,null,2);await writeFile(`${folder}/report.json`,json);await writeFile(output,json);};
await persist();
try{
 const bytes=await readFile(fixturePath),original=JSON.parse(bytes);
 assert.equal(original.contentVersion,6);assert.equal(original.scene,'market');assert.equal(original.paused,true);assert.equal(original.dialogue,null);assert.equal(original.market.visit.entry,'crossing');assert.equal(original.market.exchanged,false);assert.equal(original.journey.stage,'complete');assert.ok(original.kiln.crossed.west||original.kiln.crossed.east);
 assert.equal(original.worlds.market.find(e=>e.id==='market_merchant').state,'idle');assert.equal(original.worlds.market.find(e=>e.id==='market_door').state,'closed');
 report.fixture={path:fixturePath,sha256:hash(bytes),contentVersion:6,sourceRuntime:'index-BfRm4y9K.js',origin:'Committed actual settings export from the earlier input-driven market west entry, run 2026-09-11T15-13-29-584Z; not a synthetic state and not evidence that the current runtime was already tested.'};
 report.sourceFiles=[];
 for(const path of ['src/game/market-art.ts','src/game/market-content.ts','src/game/market.ts','src/game/model.ts','src/game/scene.ts','src/game/ui.ts','scripts/market-view-check.mjs'])report.sourceFiles.push({path,sha256:hash(await readFile(path))});
 const expectedAssets=new Map();for(const name of assetNames)expectedAssets.set(name,hash(await readFile(`public/assets/${name}`)));
 report.status='RUNNING';await persist();
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});report.browser=await browser.version();
 for(const device of devices){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},deviceScaleFactor:device.dpr,isMobile:!!device.touch,hasTouch:!!device.touch});
  const page=activePage=await context.newPage(),cdp=device.touch?await context.newCDPSession(page):null;
  const item=activeItem={...device,status:'RUNNING',inputs:[],captures:[],checks:[],assets:[],poses:{idle:'NOT_RUN',walking:'NOT_RUN',waiting:'NOT_RUN'}};report.devices.push(item);await persist();
  const responses=new Map();
  page.on('response',r=>{responses.set(r.url(),r);if(r.status()>=400)report.errors.push({device:device.id,kind:'http',url:r.url(),status:r.status()});});
  page.on('pageerror',e=>report.errors.push({device:device.id,kind:'pageerror',message:e.message}));
  page.on('requestfailed',r=>report.errors.push({device:device.id,kind:'requestfailed',url:r.url(),failure:r.failure()?.errorText}));
  const state=()=>page.evaluate(()=>window.__XIAN_NI__.inspect());
  const visual=()=>page.evaluate(()=>window.__XIAN_NI__.presentation());
  const wait=(fn,arg,timeout=20000)=>page.waitForFunction(fn,arg,{timeout,polling:'raf'});
  const entity=(s,id)=>s.worlds.market.find(e=>e.id===id);
  const log=(action,details={})=>item.inputs.push({action,...details,wall:new Date().toISOString()});
  const screenPoint=p=>page.evaluate(p=>window.__XIAN_NI__.screenPoint(p.x,p.y),p);
  const canvasAt=p=>page.evaluate(p=>p.x>=2&&p.y>=2&&p.x<innerWidth-2&&p.y<innerHeight-2&&document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS',p);
  async function press(locator){await locator.waitFor({state:'visible'});if(device.touch)await locator.tap();else await locator.click();}
  const button=selector=>press(page.locator(selector));
  async function collapse(){const b=page.locator('[data-ui="observe"]');if(await b.count()&&await b.getAttribute('aria-expanded')==='true'){await press(b);await wait(()=>document.querySelector('[data-ui="observe"]')?.getAttribute('aria-expanded')==='false');await page.waitForTimeout(140);}}
  async function pause(){if(!(await state()).paused)await button('.action-dock [data-ui="pause"]');await wait(()=>window.__XIAN_NI__.inspect().paused);}
  async function resume(){const s=await state();assert.equal(s.defeated,false);assert.equal(s.dialogue,null);if(s.paused)await button('.action-dock [data-ui="pause"]');await wait(()=>!window.__XIAN_NI__.inspect().paused);}
  async function tap(p){assert.ok(await canvasAt(p),'Actual world input must land on unobstructed canvas');log(device.touch?'single-finger world tap':'mouse world click',{screen:p,time:(await state()).time});if(device.touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
  async function pan(origin,end){
   assert.ok(await canvasAt(origin));assert.ok(await canvasAt(end));
   log(device.touch?'single-finger camera drag':'Shift mouse camera drag',{origin,end,coordinateSpace:'CSS viewport pixels; no DPR multiplier',time:(await state()).time});
   if(device.touch){
    const control=page.locator('[data-ui="pan"]');await control.waitFor({state:'visible'});assert.notEqual(await control.getAttribute('aria-pressed'),'true');await press(control);assert.equal(await control.getAttribute('aria-pressed'),'true');
    try{
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...origin,id:1}]});
     for(let n=1;n<=6;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:origin.x+(end.x-origin.x)*n/6,y:origin.y+(end.y-origin.y)*n/6,id:1}]});
    }finally{
     try{await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
     finally{await press(control);assert.equal(await control.getAttribute('aria-pressed'),'false');}
    }
   }else{
    await page.keyboard.down('Shift');try{await page.mouse.move(origin.x,origin.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:6});}finally{await page.mouse.up();await page.keyboard.up('Shift');}
   }
   await page.waitForTimeout(100);
  }
  async function frame(points){
   await collapse();
   for(let attempt=0;attempt<18;attempt++){
    const projected=[];for(const point of points)projected.push(await screenPoint(point));
    if((await Promise.all(projected.map(canvasAt))).every(Boolean))return projected;
    const focus=projected[0],offsets=projected.map(p=>({x:p.x-focus.x,y:p.y-focus.y}));
    const origin=await page.evaluate(({offsets})=>{
     const candidates=[];for(const y of [.42,.32,.52,.22,.62,.72])for(const x of [.5,.3,.7,.15,.85]){
      const p={x:innerWidth*x,y:innerHeight*y};if(offsets.every(o=>{const q={x:p.x+o.x,y:p.y+o.y};return q.x>12&&q.y>12&&q.x<innerWidth-12&&q.y<innerHeight-12&&document.elementFromPoint(q.x,q.y)?.tagName==='CANVAS';}))candidates.push(p);
     }return candidates[0];
    },{offsets});
    assert.ok(origin,'A real canvas area must fit the requested body/sign samples without a DOM overlay');
    const dx=Math.max(-device.width*.35,Math.min(device.width*.35,origin.x-focus.x)),dy=Math.max(-device.height*.28,Math.min(device.height*.28,origin.y-focus.y));
    let end;for(const factor of [1,.75,.5,.25,.125]){const candidate={x:origin.x+dx*factor,y:origin.y+dy*factor};if(await canvasAt(candidate)){end=candidate;break;}}
    assert.ok(end&&Math.hypot(end.x-origin.x,end.y-origin.y)>2,'Camera gesture needs an actual unobstructed canvas segment');await pan(origin,end);
   }
   throw Error(`Cannot frame requested world samples on ${device.id}: ${JSON.stringify(points)}`);
  }
  const bodyPoints=e=>[{x:e.x,y:e.y-40},{x:e.x-22,y:e.y-80},{x:e.x+22,y:e.y-80},{x:e.x-22,y:e.y+5},{x:e.x+22,y:e.y+5}];
  const signPoints=e=>[{x:e.x,y:e.y-44},{x:e.x-53,y:e.y-61},{x:e.x+53,y:e.y-61},{x:e.x-53,y:e.y-27},{x:e.x+53,y:e.y-27}];
  async function walk(x,y){
   await pause();assert.equal((await state()).dialogue,null);await frame([{x,y}]);await resume();await tap(await screenPoint({x,y}));
   await wait(({x,y})=>{const s=window.__XIAN_NI__.inspect();return !s.defeated&&!s.dialogue&&s.player.path.length===0&&Math.hypot(s.player.x-x,s.player.y-y)<18;},{x,y},60000);
   await pause();const s=await state();log('actual arrived',{target:{x,y},player:s.player,time:s.time});
  }
  async function capture(id,{sign=false,merchant=false,dialogue=false,door=false,pose}={}){
   await pause();await collapse();const before=await state();assert.equal(before.defeated,false);assert.ok(before.player.hp>0);assert.equal(Boolean(before.dialogue),dialogue);
   const target=entity(before,sign?'market_entry':door?'market_door':'market_merchant');
   const points=sign?signPoints(target):door?[{x:target.x,y:target.y-60},{x:target.x-15,y:target.y-110},{x:target.x+85,y:target.y-110},{x:target.x-15,y:target.y-60},{x:target.x+85,y:target.y-60},{x:target.x,y:target.y}]:bodyPoints(target);
   await frame(points);await page.waitForTimeout(100);const s=await state(),v=await visual();assert.deepEqual(s,before,'Paused framing must not change the simulation or pending input');
   const sampleScreens=[];for(const point of points){const p=await screenPoint(point);assert.ok(await canvasAt(p));sampleScreens.push(p);}
   if(sign){
    const e=entity(s,'market_entry'),label=v.labels.find(l=>l.id===e.id);assert.ok(label,'Actual entry sign lettering must render');const b=label.bounds;
    assert.equal(label.text,'石渡');assert.doesNotMatch(label.text,/\uFFFD/);assert.ok(b.w>0&&b.h>0);assert.ok(Math.abs(b.x+b.w/2-(e.x+6))<2);assert.ok(Math.abs(b.y+b.h/2-(e.y-44))<2);assert.ok(b.x>=e.x-52&&b.x+b.w<=e.x+52);assert.ok(b.y>=e.y-63&&b.y+b.h<=e.y-25);
   }
   if(merchant){const actor=v.actors.find(a=>a.id==='market_merchant');assert.ok(actor,'Actual merchant sprite must be exposed by presentation');assert.equal(actor.x,target.x);assert.equal(actor.y,target.y);if(pose)assert.equal(actor.frame,pose);}
   if(door){const actor=v.actors.find(a=>a.id==='market_door');assert.ok(actor);assert.equal(actor.frame,'open');assert.equal(target.state,'open');assert.equal(target.solid,false);}
   const hud=await page.evaluate(()=>{
    const goal=document.querySelector('.location p')?.getBoundingClientRect();
    const controls=[...document.querySelectorAll('.top-right button')].filter(e=>getComputedStyle(e).visibility==='visible').map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,text:e.textContent};});
    return{goal:goal?{x:goal.x,y:goal.y,w:goal.width,h:goal.height}:null,controls};
   });
   assert.ok(hud.goal);for(const b of hud.controls){const a=hud.goal;assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,`Objective must not overlap visible control ${b.text}`);}
   item.checks.push({id:`${id}-objective-clear`,hud});
   const path=`${folder}/${device.id}-${id}.png`;const png=await page.screenshot({path});item.captures.push({id,path,sha256:hash(png),pausedForVisualEvidence:true,samples:{world:points,screen:sampleScreens},state:s,presentation:v});
   if(pose)item.poses[pose]='PASS';console.log('Market visual capture',device.id,id);await persist();
  }
  async function frozen(id){
   const before=await state(),v=await visual();assert.equal(before.paused,true);await page.waitForTimeout(700);assert.deepEqual(await state(),before,'Paused time, actors, projectiles and pending input must not advance');
   const after=await visual();assert.deepEqual(after.actors,v.actors,'Rendered actual poses and facing must stay frozen');assert.deepEqual(after.player,v.player);item.checks.push({id,wallMs:700,time:before.time,merchant:entity(before,'market_merchant'),presentation:v});await persist();
  }
  async function choice(id){
   for(let n=0;n<12&&!(await state()).dialogue?.choices.some(c=>c.id===id);n++){assert.ok((await state()).dialogue?.choices.some(c=>c.id==='more'));await button('[data-ui="choice:more"]');}
   assert.ok((await state()).dialogue?.choices.some(c=>c.id===id&&!c.disabled));log('real dialogue choice',{id});await button(`[data-ui="choice:${id}"]`);await wait(()=>!window.__XIAN_NI__.inspect().dialogue);
  }
  await page.goto(url);await press(page.getByRole('button',{name:'入 山',exact:true}));await press(page.getByRole('button',{name:'去回石驿',exact:true}));await wait(()=>window.__XIAN_NI__?.inspect().scene==='home');
  item.runtimeScripts=[];for(const src of await page.locator('script[src]').evaluateAll(nodes=>nodes.map(n=>n.src))){const response=responses.get(src);assert.ok(response,`Actual loaded script response missing: ${src}`);assert.ok(response.ok());item.runtimeScripts.push({url:src,status:response.status(),sha256:hash(await response.body())});}assert.ok(item.runtimeScripts.length);
  const canvas=await page.locator('canvas').evaluate(e=>({width:e.width,height:e.height,cssWidth:e.getBoundingClientRect().width,cssHeight:e.getBoundingClientRect().height})),density=Math.max(1,Math.min(device.dpr,3,Math.sqrt(5_000_000/(device.width*device.height))));
  assert.equal(await page.evaluate(()=>devicePixelRatio),device.dpr);assert.equal(canvas.width,Math.round(device.width*density));assert.equal(canvas.height,Math.round(device.height*density));assert.ok(Math.abs(canvas.cssWidth-device.width)<=1&&Math.abs(canvas.cssHeight-device.height)<=1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.evaluate(()=>document.body.dataset.assetError??null),null);item.canvas={...canvas,expectedDensity:density};
  for(const name of assetNames){const response=[...responses.values()].find(r=>new URL(r.url()).pathname.endsWith(`/assets/${name}`));assert.ok(response,`Missing production asset ${name}`);assert.ok(response.ok());const image=await response.body(),dimensions=[image.readUInt32BE(16),image.readUInt32BE(20)];assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.ok(dimensions.every(n=>n>=512));assert.equal(hash(image),expectedAssets.get(name),`Served ${name} must match this working tree`);item.assets.push({name,url:response.url(),status:response.status(),dimensions,bytes:image.length,sha256:hash(image)});}
  await button('[data-ui="settings"]');await page.locator('#import-save').setInputFiles({name:'market-west-entry.json',mimeType:'application/json',buffer:bytes});
  await wait(time=>{const s=window.__XIAN_NI__.inspect();return s.contentVersion===7&&s.scene==='market'&&s.paused&&s.time===time;},original.time);await page.waitForTimeout(160);
  const restored=await state();for(const key of ['player','market','kiln','journey','pending','dialogue','time'])assert.deepEqual(restored[key],original[key],`Import must preserve actual fixture ${key}`);assert.equal(await page.locator('.modal-paper').isVisible(),false);assert.equal(await page.getByRole('button',{name:'在驿中再坐一会儿',exact:true}).isVisible(),false);
  const legacyWorlds=structuredClone(restored.worlds);assert.deepEqual(Object.keys(legacyWorlds).sort(),['canal','creek','crossing','home','kiln','market','spar','workshop']);
  assert.ok(legacyWorlds.spar.some(e=>e.id==='spar_peer'));delete legacyWorlds.spar;
  assert.equal(legacyWorlds.home.filter(e=>e.id==='home_to_spar').length,1);legacyWorlds.home=legacyWorlds.home.filter(e=>e.id!=='home_to_spar');
  assert.deepEqual(legacyWorlds,original.worlds,'Migration preserves every original world and entity; only the new scene and entry are added');
  item.import={time:restored.time,player:restored.player,market:restored.market};await capture('west-sign',{sign:true});
  await walk(420,460);await capture('merchant-idle',{merchant:true,pose:'idle'});await frozen('idle-paused');
  // Cache the real dock control before dialogue covers it. It is tapped only
  // after the exchange closes and actual NPC movement has been observed.
  const pauseBox=await page.locator('.action-dock [data-ui="pause"]').boundingBox();assert.ok(pauseBox);const pausePoint={x:pauseBox.x+pauseBox.width/2,y:pauseBox.y+pauseBox.height/2};
  assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.getAttribute('data-ui'),pausePoint),'pause');
  await resume();const npc=entity(await state(),'market_merchant');await tap(await screenPoint(npc));await wait(()=>window.__XIAN_NI__.inspect().dialogue?.id==='market_talk');
  assert.equal((await state()).dialogue.speaker,'沈砚');await capture('merchant-dialogue',{merchant:true,dialogue:true,pose:'idle'});await frozen('dialogue-reading');
  await choice('market:exchange');await resume();
  await wait(()=>{const s=window.__XIAN_NI__.inspect(),a=window.__XIAN_NI__.presentation().actors.find(a=>a.id==='market_merchant');return s.worlds.market.find(e=>e.id==='market_merchant').state==='leading'&&a?.frame==='walking';});
  log('pause after actual merchant motion',{screen:pausePoint});if(device.touch)await page.touchscreen.tap(pausePoint.x,pausePoint.y);else await page.mouse.click(pausePoint.x,pausePoint.y);await wait(()=>window.__XIAN_NI__.inspect().paused);
  assert.equal(entity(await state(),'market_merchant').state,'leading');await capture('merchant-walking',{merchant:true,pose:'walking'});await frozen('walking-paused');
  await resume();const doorWaitStart=await state();log('physical-door-wait-start',{time:doorWaitStart.time,merchant:entity(doorWaitStart,'market_merchant'),door:entity(doorWaitStart,'market_door')});
  // Software rendering may advance much less simulation time than wall time.
  // Keep the actual open-door requirement with a bounded 90s observation window.
  await wait(()=>{const s=window.__XIAN_NI__.inspect();if(s.defeated)throw Error('Defeated before the merchant opened the door');return s.worlds.market.find(e=>e.id==='market_door').state==='open';},undefined,90000);
  const doorWaitEnd=await state();log('physical-door-wait-complete',{time:doorWaitEnd.time,simulationElapsed:doorWaitEnd.time-doorWaitStart.time,merchant:entity(doorWaitEnd,'market_merchant'),door:entity(doorWaitEnd,'market_door')});await pause();
  assert.equal((await state()).market.exchanged,true);await capture('physical-door-open',{door:true});await frozen('open-door-paused');
  const final=await state();assert.equal(final.scene,'market');assert.deepEqual(final.market.through,original.market.through);assert.deepEqual(final.market.reported,original.market.reported);assert.equal(final.player.mana,original.player.mana);item.final={time:final.time,player:final.player,market:final.market,merchant:entity(final,'market_merchant'),enemy:entity(final,'market_raider'),door:entity(final,'market_door')};
  item.status='PASS';await persist();await context.close();activePage=null;activeItem=null;
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=String(error);if(activeItem)activeItem.status='FAIL';console.error(error);process.exitCode=1;if(activePage){report.failureState=await activePage.evaluate(()=>window.__XIAN_NI__?.inspect()).catch(()=>null);report.failurePresentation=await activePage.evaluate(()=>window.__XIAN_NI__?.presentation()).catch(()=>null);await activePage.screenshot({path:`${folder}/failure.png`}).catch(()=>{});}}
finally{report.completedAt=new Date().toISOString();await browser?.close();await persist();}
console.log(JSON.stringify({status:report.status,runId,output,folder,devices:report.devices.map(d=>({id:d.id,status:d.status,poses:d.poses})),failure:report.failure}));

import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Serial visual/input follow-up. Only the fixed actual v0.5 export is imported.
// Camera framing and captures use ordinary pause; this is not continuous combat proof.
const url=process.env.GAME_URL||'http://127.0.0.1:4191/';
const fixturePath='qa/fixtures/return-journey-v0.5.0.json';
const output='qa/evidence/kiln-view.json';
const devices=[{id:'desktop-1440-dpr2',width:1440,height:900,dpr:2},{id:'short-1280-dpr1',width:1280,height:500,dpr:1},{id:'phone-390-dpr3',width:390,height:844,dpr:3,touch:true}];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={schemaVersion:1,status:'NOT_RUN',startedAt:new Date().toISOString(),url,devices:[],errors:[],limitation:'Linux Chrome with viewport/DPR/touch emulation, not physical Mac/Safari/phone. Movement uses real clicks/taps; camera uses real Shift-mouse drags, including emulated phone. Paused framing is intentional visual QA, not uninterrupted combat evidence. Label geometry, actual rendered Duqin presence and loaded assets are checked; screenshots still require visual review for overall quality and occlusion.'};
let browser,activePage,activeItem;
await mkdir('qa/evidence',{recursive:true});
const persist=()=>writeFile(output,JSON.stringify(report,null,2));
await persist();
try{
 const bytes=await readFile(fixturePath),original=JSON.parse(bytes.toString('utf8'));
 assert.equal(original.contentVersion,4);assert.equal(original.scene,'home');assert.equal(original.journey.stage,'complete');assert.equal(original.player.mana,0);
 report.fixture={path:fixturePath,sha256:hash(bytes),contentVersion:4,origin:'Fixed actual v0.5 settings completion export; migrated by the production UI on every viewport. No generated v0.6 save is represented as this historical fixture.'};
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});report.browser=await browser.version();
 for(const device of devices){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},deviceScaleFactor:device.dpr,isMobile:!!device.touch,hasTouch:!!device.touch});
  const page=activePage=await context.newPage(),item=activeItem={...device,status:'RUNNING',captures:[],inputs:[],assets:[]};report.devices.push(item);
  const resources=new Map();
  page.on('pageerror',e=>report.errors.push({device:device.id,kind:'pageerror',message:e.message}));
  page.on('response',response=>{const match=response.url().match(/\/assets\/(kiln-(?:ground|environment|props|duqin)\.png)(?:\?|$)/);if(match)resources.set(match[1],response);if(response.status()>=400)report.errors.push({device:device.id,kind:'http',status:response.status(),url:response.url()});});
  page.on('requestfailed',request=>report.errors.push({device:device.id,kind:'requestfailed',url:request.url(),failure:request.failure()?.errorText}));
  const state=()=>page.evaluate(()=>window.__XIAN_NI__.inspect());
  const presentation=()=>page.evaluate(()=>window.__XIAN_NI__.presentation());
  const wait=(fn,arg,timeout=15000)=>page.waitForFunction(fn,arg,{timeout,polling:'raf'});
  const press=async locator=>{await locator.waitFor({state:'visible'});if(device.touch)await locator.tap();else await locator.click();};
  const button=selector=>press(page.locator(selector));
  const screenPoint=(x,y)=>page.evaluate(p=>window.__XIAN_NI__.screenPoint(p.x,p.y),{x,y});
  const canvasAt=p=>page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS',p);
  async function collapse(){const b=page.locator('[data-ui="observe"]');if(await b.count()&&await b.getAttribute('aria-expanded')==='true'){await press(b);await wait(()=>document.querySelector('[data-ui="observe"]')?.getAttribute('aria-expanded')==='false');await page.waitForTimeout(140);}}
  async function pause(){if(!(await state()).paused)await button('.action-dock [data-ui="pause"]');await wait(()=>window.__XIAN_NI__.inspect().paused);}
  async function resume(){const s=await state();assert.equal(s.defeated,false);assert.equal(s.dialogue,null,'Close actual dialogue before world input');if(s.paused)await button('.action-dock [data-ui="pause"]');await wait(()=>!window.__XIAN_NI__.inspect().paused);}
  async function center(){if(device.touch)await button('[data-ui="center"]');else await page.keyboard.press('c');await page.waitForTimeout(180);item.inputs.push({action:'real center'});}
  async function pan(dx,dy){
   const cx=device.width*.5,cy=device.touch?420:device.height*.5;
   const origin=await page.evaluate(({cx,cy})=>[{x:cx,y:cy},{x:cx,y:cy-65},{x:cx,y:cy+65},{x:cx-85,y:cy},{x:cx+85,y:cy}].find(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS'),{cx,cy});
   assert.ok(origin,'Pan must start on canvas, not expanded observation or another DOM control');
   const end={x:Math.max(8,Math.min(device.width-8,origin.x+dx)),y:Math.max(140,Math.min(device.height-95,origin.y+dy))};
   await page.keyboard.down('Shift');try{await page.mouse.move(origin.x,origin.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:6});await page.mouse.up();}finally{await page.keyboard.up('Shift');}
   await page.waitForTimeout(120);item.inputs.push({action:'real Shift camera drag',origin,end});
  }
  async function frame(x,y){
   await collapse();const cx=device.width*.5,cy=device.touch?420:device.height*.5;
   for(let n=0;n<14;n++){const p=await screenPoint(x,y);if(p.x>25&&p.x<device.width-25&&p.y>140&&p.y<device.height-105&&await canvasAt(p))return p;
    await pan(Math.max(-device.width*.38,Math.min(device.width*.38,cx-p.x)),Math.max(-200,Math.min(200,cy-p.y)));
   }throw Error(`Cannot frame ${x},${y} on ${device.id}`);
  }
  async function tap(p){assert.ok(await canvasAt(p),'World input must hit the canvas');if(device.touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
  async function walk(x,y){
   await pause();const start=await state();assert.equal(start.dialogue,null);const p=await frame(x,y);await resume();await tap(p);
   await wait(({x,y})=>{const s=window.__XIAN_NI__.inspect();return !s.defeated&&Math.hypot(s.player.x-x,s.player.y-y)<18&&s.player.path.length===0;},{x,y},60000);
   await pause();const end=await state();assert.equal(end.defeated,false);assert.equal(end.dialogue,null,'Ground input must not accidentally interact');
   item.inputs.push({action:device.touch?'actual touch walk':'actual mouse walk',scene:end.scene,from:{x:start.player.x,y:start.player.y},target:{x,y},to:{x:end.player.x,y:end.player.y},elapsedModelSeconds:end.time-start.time});
  }
  async function interact(id){
   await pause();const before=await state(),e=before.worlds[before.scene].find(e=>e.id===id);assert.ok(e);assert.notEqual(e.state,'hidden');
   const p=await frame(e.x,e.y);await resume();await tap(p);
   await wait(({id,scene})=>{const s=window.__XIAN_NI__.inspect();return s.scene!==scene||!!s.dialogue;},{id,scene:before.scene},60000);
   item.inputs.push({action:'actual entity tap',id,scene:before.scene,world:{x:e.x,y:e.y},resultScene:(await state()).scene});
  }
  async function choose(id){
   for(let n=0;n<12&&!(await state()).dialogue?.choices.some(c=>c.id===id);n++){assert.ok((await state()).dialogue?.choices.some(c=>c.id==='more'));await button('[data-ui="choice:more"]');}
   assert.ok((await state()).dialogue?.choices.some(c=>c.id===id&&!c.disabled));await button(`[data-ui="choice:${id}"]`);await wait(()=>!window.__XIAN_NI__.inspect().dialogue);await pause();item.inputs.push({action:'actual dialogue choice',id});
  }
  async function labelEvidence(s,v){
   const labels=[];
   for(const label of v.labels){
    const e=s.worlds[s.scene].find(e=>e.id===label.id);assert.ok(e);const b=label.bounds;assert.ok(b.w>0&&b.h>0);assert.doesNotMatch(label.text,/\uFFFD/);
    if(e.kind==='exit'){
     const text=e.name.replace(/[←→]/g,'').trim(),direction=e.name.includes('←')?-1:1,width=Math.min(156,Math.max(104,Array.from(text).length*18+44));
     // Match the existing painted board's shared local coordinates, not a screen-fixed guess.
     assert.equal(label.text,text);assert.ok(Math.abs(b.x+b.w/2-(e.x-direction*6))<2,`${e.id}: text horizontal anchor`);
     assert.ok(Math.abs(b.y+b.h/2-(e.y-44))<2,`${e.id}: text must sit on board face`);
     assert.ok(b.x>=e.x-width/2&&b.x+b.w<=e.x+width/2,`${e.id}: text must fit the board width`);
     assert.ok(b.y>=e.y-63&&b.y+b.h<=e.y-25,`${e.id}: text must fit the board height`);
    }else{assert.equal(label.text,e.name);assert.ok(Math.abs(b.x+b.w/2-e.x)<2);assert.ok(Math.abs(b.y-e.y-15)<2);}
    labels.push(label);
   }
   return labels;
  }
  async function capture(id,focus,{signId,duqin=false}={}){
   await pause();await collapse();await center();await frame(focus.x,focus.y);await page.mouse.move(device.width-4,device.height-4);await page.waitForTimeout(150);
   const s=await state(),v=await presentation();assert.equal(s.dialogue,null);assert.equal(await page.locator('.modal-paper').isVisible(),false);
   const labels=await labelEvidence(s,v),focusScreen=await screenPoint(focus.x,focus.y);assert.ok(await canvasAt(focusScreen),'Primary artwork must be clear of DOM');
   if(signId){assert.ok(labels.some(l=>l.id===signId),`Rendered sign lettering missing: ${signId}`);const e=s.worlds[s.scene].find(e=>e.id===signId);assert.ok(await canvasAt(await screenPoint(e.x,e.y-44)),'Sign face must be visible, not hidden under UI');}
   if(duqin){const actor=v.actors.find(a=>a.id==='duqin'),e=s.worlds.kiln.find(e=>e.id==='duqin');assert.ok(actor,'Presentation must expose actual Duqin image, not fallback-only scenery');assert.equal(actor.x,e.x);assert.equal(actor.y,e.y);assert.ok(await canvasAt(await screenPoint(e.x,e.y-35)),'Duqin body must be visible on canvas');}
   const path=`qa/evidence/kiln-view-${device.id}-${id}.png`;await page.screenshot({path});
   item.captures.push({id,path,scene:s.scene,paused:s.paused,time:s.time,player:s.player,kiln:s.kiln,focus:{world:focus,screen:focusScreen},labels,presentation:v,screen:s.worlds.kiln.find(e=>e.id==='shield_board'),enemies:s.worlds.kiln.filter(e=>e.kind==='enemy')});
   console.log('Kiln visual capture',device.id,id);await persist();
  }
  await page.goto(url);await press(page.getByRole('button',{name:'入 山',exact:true}));await press(page.getByRole('button',{name:'去回石驿',exact:true}));await wait(()=>window.__XIAN_NI__?.inspect().scene==='home');
  const canvas=await page.locator('canvas').evaluate(el=>({width:el.width,height:el.height,cssWidth:el.getBoundingClientRect().width,cssHeight:el.getBoundingClientRect().height})),density=Math.max(1,Math.min(device.dpr,3,Math.sqrt(5_000_000/(device.width*device.height))));
  assert.equal(await page.evaluate(()=>devicePixelRatio),device.dpr);assert.equal(canvas.width,Math.round(device.width*density));assert.equal(canvas.height,Math.round(device.height*density));assert.ok(Math.abs(canvas.cssWidth-device.width)<=1&&Math.abs(canvas.cssHeight-device.height)<=1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.evaluate(()=>document.body.dataset.assetError??null),null);item.canvas={...canvas,expectedDensity:density};
  for(const name of ['kiln-ground.png','kiln-environment.png','kiln-props.png','kiln-duqin.png']){const response=resources.get(name);assert.ok(response,`Missing production asset ${name}`);assert.ok(response.ok());const image=await response.body();assert.equal(image.subarray(1,4).toString(),'PNG');const dimensions=[image.readUInt32BE(16),image.readUInt32BE(20)];assert.ok(dimensions.every(n=>n>=512));item.assets.push({name,url:response.url(),status:response.status(),dimensions,bytes:image.length,sha256:hash(image)});}
  await button('[data-ui="settings"]');await page.locator('#import-save').setInputFiles({name:'return-journey-v0.5.0.json',mimeType:'application/json',buffer:bytes});
  await wait(time=>{const s=window.__XIAN_NI__.inspect();return s.contentVersion===5&&s.scene==='home'&&s.time===time&&s.paused;},original.time);await page.waitForTimeout(160);
  assert.equal(await page.getByRole('button',{name:'在驿中再坐一会儿',exact:true}).isVisible(),false);let s=await state();assert.deepEqual(s.journey,original.journey);assert.equal(s.player.mana,0);assert.deepEqual(s.kiln,{visited:false,entry:null,crossed:{west:false,east:false},loan:'none',shelterOpened:false});item.migration={sourceVersion:4,resultVersion:5,time:s.time,journeyPreserved:true,kiln:s.kiln};
  await interact('to_creek');await choose('canal:depart:creek');await wait(()=>window.__XIAN_NI__.inspect().scene==='creek');
  for(const p of [[300,740],[300,340],[700,315]])await walk(...p);
  await capture('creek-entry-sign',{x:620,y:271},{signId:'creek_to_kiln'});
  await interact('creek_to_kiln');await wait(()=>window.__XIAN_NI__.inspect().scene==='kiln');s=await state();assert.equal(s.kiln.entry,'west');assert.equal(s.kiln.visited,true);
  await capture('west-exit-sign',{x:180,y:436},{signId:'kiln_to_creek'});
  await interact('duqin');s=await state();assert.equal(s.dialogue.speaker,'杜芹');assert.ok(s.dialogue.choices.length<=3);item.duqinDialogue=s.dialogue;await choose('kiln:route');
  await capture('west-court-duqin',{x:260,y:525},{duqin:true});
  await walk(350,640);await capture('intact-screen',{x:500,y:620});
  for(const p of [[360,700],[360,820],[800,820],[1030,820],[1220,820],[1220,650]])await walk(...p);
  await capture('east-exit-sign',{x:1220,y:496},{signId:'kiln_to_canal'});assert.equal((await state()).kiln.crossed.east,false,'Looking at the sign cannot award crossing');
  await interact('kiln_to_canal');await wait(()=>window.__XIAN_NI__.inspect().scene==='canal');s=await state();assert.equal(s.kiln.crossed.east,true);assert.equal(s.kiln.entry,null);assert.equal(s.kiln.loan,'none');assert.equal(s.kiln.shelterOpened,false);assert.equal(s.player.mana,0);assert.ok(s.player.hp>0);
  assert.equal(s.worlds.kiln.filter(e=>e.kind==='enemy').length,2);assert.ok(s.worlds.kiln.filter(e=>e.kind==='enemy').every(e=>e.hp===3&&!['peaceful','retreated'].includes(e.state)));assert.equal(s.worlds.kiln.find(e=>e.id==='shield_board').state,'idle');
  await capture('canal-connection',{x:460,y:406},{signId:'canal_to_kiln'});item.final={scene:s.scene,player:s.player,kiln:s.kiln};item.status='PASS';await persist();await context.close();activePage=null;activeItem=null;
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';report.completedAt=new Date().toISOString();
}catch(error){report.status='FAIL';report.failure=String(error);if(activeItem)activeItem.status='FAIL';console.error(error);process.exitCode=1;if(activePage){report.failureState=await activePage.evaluate(()=>window.__XIAN_NI__?.inspect()).catch(()=>null);await activePage.screenshot({path:'qa/evidence/kiln-view-failure.png'}).catch(()=>{});}}
finally{await browser?.close();await persist();}
console.log(JSON.stringify(report));

import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Serial follow-up to journey-check.mjs. Only its unmodified real UI exports
// are used; this script neither injects state nor repeats the leadership route.
const url=process.env.GAME_URL||'http://127.0.0.1:4191/';
const paths={ready:'qa/evidence/journey-ready-input.json',complete:'qa/evidence/journey-complete-export.json',paused:'qa/evidence/journey-desktop-paused-input.json'};
const output='qa/evidence/journey-view.json';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={schemaVersion:1,status:'NOT_RUN',checkedAt:new Date().toISOString(),url,fixtures:[],devices:[],errors:[],limitation:'Linux Chrome desktop and touch/DPR emulation, not physical Mac/Safari/phone testing. Camera uses real Shift-mouse drag on all viewports. Automated checks cover objective state, anchors, pixels and pause freezing; scene screenshots still need visual review.'};
const devices=[{id:'desktop-1440-dpr2',width:1440,height:900,dpr:2},{id:'short-1280-dpr1',width:1280,height:500,dpr:1},{id:'phone-390-dpr3',width:390,height:844,dpr:3,touch:true}];
let browser,activePage;
await mkdir('qa/evidence',{recursive:true});await writeFile(output,JSON.stringify(report,null,2));
try{
 const fixtures={};
 for(const [id,path]of Object.entries(paths)){
  const bytes=await readFile(path),s=JSON.parse(bytes.toString('utf8'));assert.equal(s.contentVersion,4);assert.equal(s.canal.stage,'complete');assert.equal(s.ended,true);
  if(id==='complete'){assert.equal(s.scene,'home');assert.equal(s.journey.stage,'complete');assert.equal(s.journey.restOpened,true);assert.equal(s.journey.recordedShared,true);}
  else{assert.equal(s.scene,'workshop');assert.equal(s.journey.stage,'active');if(id==='ready')assert.equal(s.journey.run,null);else{assert.ok(s.journey.run);assert.equal(s.paused,true);assert.equal(s.worlds.workshop.find(e=>e.id==='xu_work').state,'leading');}}
  fixtures[id]={bytes,state:s};report.fixtures.push({id,path,sha256:hash(bytes),origin:'Unmodified real settings export from scripts/journey-check.mjs'});
 }
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});report.browser=await browser.version();
 for(const device of devices){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},deviceScaleFactor:device.dpr,isMobile:!!device.touch,hasTouch:!!device.touch});
  const page=activePage=await context.newPage(),item={...device,captures:[],loads:[],inputs:[],checks:[]};report.devices.push(item);page.on('pageerror',e=>report.errors.push({device:device.id,message:e.message}));
  const state=()=>page.evaluate(()=>window.__XIAN_NI__.inspect()),visual=()=>page.evaluate(()=>window.__XIAN_NI__.presentation());
  const wait=(fn,arg,timeout=15000)=>page.waitForFunction(fn,arg,{timeout});
  const press=async locator=>device.touch?locator.tap():locator.click();
  const button=selector=>press(page.locator(selector));
  const screenPoint=(x,y)=>page.evaluate(p=>window.__XIAN_NI__.screenPoint(p.x,p.y),{x,y});
  async function collapse(){const b=page.locator('[data-ui="observe"]');if(await b.count()&&await b.getAttribute('aria-expanded')==='true'){await press(b);await page.waitForTimeout(140);}}
  async function pause(){if(!(await state()).paused)await button('.action-dock [data-ui="pause"]');await wait(()=>window.__XIAN_NI__.inspect().paused);}
  async function resume(){
   let s=await state();assert.equal(s.defeated,false);if(s.dialogue){for(let n=0;n<12&&!s.dialogue.choices.some(c=>c.id==='leave');n++){assert.ok(s.dialogue.choices.some(c=>c.id==='more'));await button('[data-ui="choice:more"]');s=await state();}await button('[data-ui="choice:leave"]');await wait(()=>!window.__XIAN_NI__.inspect().dialogue);}
   if((await state()).paused)await button('.action-dock [data-ui="pause"]');await wait(()=>!window.__XIAN_NI__.inspect().paused);await collapse();
  }
  async function center(){if(device.touch)await button('[data-ui="center"]');else await page.keyboard.press('c');await page.waitForTimeout(220);item.inputs.push({action:'real center control'});}
  async function pan(dx,dy){
   const cx=device.width*.5,cy=device.touch?420:Math.min(device.height*.5,360);
   const origin=await page.evaluate(({cx,cy})=>[{x:cx,y:cy},{x:cx,y:cy+65},{x:cx,y:cy-65},{x:cx-85,y:cy},{x:cx+85,y:cy}].find(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS'),{cx,cy});assert.ok(origin,'A real camera drag must start on unobstructed canvas');
   const end={x:Math.max(8,Math.min(device.width-8,origin.x+dx)),y:Math.max(140,Math.min(device.height-100,origin.y+dy))};
   await page.keyboard.down('Shift');try{await page.mouse.move(origin.x,origin.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:6});await page.mouse.up();}finally{await page.keyboard.up('Shift');}
   await page.waitForTimeout(110);item.inputs.push({action:'real Shift camera drag',origin,end});
  }
  async function frame(x,y){
   await collapse();const cx=device.width*.5,cy=device.touch?420:Math.min(device.height*.5,360);
   for(let n=0;n<12;n++){const p=await screenPoint(x,y);if(p.x>25&&p.x<device.width-25&&p.y>140&&p.y<device.height-110&&await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS',p))return p;
    await pan(Math.max(-device.width*.38,Math.min(device.width*.38,cx-p.x)),Math.max(-210,Math.min(210,cy-p.y)));
   }throw Error(`Cannot frame world point ${x},${y} on ${device.id}`);
  }
  async function worldTap(x,y){const p=await frame(x,y);if(device.touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
  async function load(id){
   await button('[data-ui="settings"]');const f=fixtures[id];await page.locator('#import-save').setInputFiles({name:paths[id].split('/').at(-1),mimeType:'application/json',buffer:f.bytes});
   await wait(({scene,time})=>{const s=window.__XIAN_NI__.inspect();return s.scene===scene&&s.time===time&&s.paused;},{scene:f.state.scene,time:f.state.time});await page.waitForTimeout(160);
   assert.equal(await page.getByRole('button',{name:'在驿中再坐一会儿',exact:true}).isVisible(),false,'Completed first-chapter import must not reopen ending');const s=await state();assert.deepEqual(s.journey,f.state.journey);assert.equal(s.player.hold,f.state.player.hold);
   item.loads.push({id,time:s.time,paused:s.paused,hold:s.player.hold,journey:s.journey});await collapse();await center();
  }
  async function walk(x,y){
   await resume();const start=await state();await worldTap(x,y);await wait(({x,y})=>{const s=window.__XIAN_NI__.inspect();return Math.hypot(s.player.x-x,s.player.y-y)<18&&s.player.path.length===0;},{x,y},60000);
   const end=await state();assert.equal(end.defeated,false);assert.equal(end.dialogue,null,'Empty ground target must not interact with a person/object');item.inputs.push({action:'walk',scene:end.scene,start:{x:start.player.x,y:start.player.y},target:{x,y},end:{x:end.player.x,y:end.player.y}});
  }
  async function interact(id){await resume();const s=await state(),e=s.worlds[s.scene].find(e=>e.id===id);assert.ok(e);await worldTap(e.x,e.y);await wait(({id,scene})=>{const s=window.__XIAN_NI__.inspect();if(s.scene!==scene||s.dialogue)return true;const e=s.worlds[s.scene].find(e=>e.id===id);return e&&Math.hypot(s.player.x-e.x,s.player.y-e.y)<100&&s.player.path.length===0;},{id,scene:s.scene},60000);item.inputs.push({action:'interact',id,scene:s.scene});}
  async function choose(id){for(let i=0;i<12&&!(await state()).dialogue?.choices.some(c=>c.id===id);i++){assert.ok((await state()).dialogue?.choices.some(c=>c.id==='more'));await button('[data-ui="choice:more"]');}assert.ok((await state()).dialogue?.choices.some(c=>c.id===id&&!c.disabled));await button(`[data-ui="choice:${id}"]`);await wait(()=>!window.__XIAN_NI__.inspect().dialogue);await resume();}
  async function checkLabels(required){
   const s=await state(),v=await visual(),labels=v.labels.filter(l=>s.worlds[s.scene].find(e=>e.id===l.id)?.kind!=='exit');
   if(required)assert.ok(labels.some(l=>l.id===required),`Nearby landmark label must be visible: ${required}`);
   for(const l of labels){const e=s.worlds[s.scene].find(e=>e.id===l.id),b=l.bounds;assert.equal(l.text,e.name);assert.doesNotMatch(l.text,/\uFFFD/);assert.ok(b.w>0&&b.h>0);assert.ok(Math.abs(b.x+b.w/2-e.x)<2,`${l.id} horizontal anchor`);assert.ok(Math.abs(b.y-e.y-15)<2,`${l.id} foot anchor`);}
   for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){const a=labels[i].bounds,b=labels[j].bounds;assert.ok(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),`Overlapping labels: ${labels[i].id}/${labels[j].id}`);}
   return labels;
  }
  async function capture(id,focus,landmarks,required){
   await pause();await center();await frame(focus.x,focus.y);await pan(1,0);await page.mouse.move(device.width-4,device.height-4);await page.waitForTimeout(140);
   const s=await state();assert.equal(s.dialogue,null,'A scene capture must not be covered by dialogue');assert.equal(await page.locator('.modal-paper').isVisible(),false,'A scene capture must not be a menu card');const labels=await checkLabels(required),projected={};
   for(const [key,p]of Object.entries(landmarks))projected[key]={world:p,screen:await screenPoint(p.x,p.y)};
   const p=await screenPoint(focus.x,focus.y);assert.ok(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName==='CANVAS',p),'Primary artwork must be visible on canvas, not under UI');
   const path=`qa/evidence/journey-view-${device.id}-${id}.png`;await page.screenshot({path});item.captures.push({id,path,scene:s.scene,paused:s.paused,player:s.player,journey:s.journey,labels,landmarks:projected,presentation:await visual()});console.log('Journey visual capture',device.id,id);
  }
  await page.goto(url);await press(page.getByRole('button',{name:'入 山',exact:true}));await press(page.getByRole('button',{name:'去回石驿',exact:true}));await wait(()=>window.__XIAN_NI__?.inspect().scene==='home');
  const canvas=await page.locator('canvas').evaluate(el=>({width:el.width,height:el.height,cssWidth:el.getBoundingClientRect().width,cssHeight:el.getBoundingClientRect().height})),density=Math.max(1,Math.min(device.dpr,3,Math.sqrt(5_000_000/(device.width*device.height))));
  assert.equal(canvas.width,Math.round(device.width*density));assert.equal(canvas.height,Math.round(device.height*density));assert.ok(Math.abs(canvas.cssWidth-device.width)<=1&&Math.abs(canvas.cssHeight-device.height)<=1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);item.canvas={...canvas,expectedDensity:density};

  await load('ready');await walk(1300,950);await pause();await center();await frame(1250,875);await page.mouse.move(device.width-4,device.height-4);await page.waitForTimeout(140);item.checks.push({id:'south-landmark',labels:await checkLabels('journey_south_mark')});
  await walk(1600,330);await walk(400,340);assert.equal((await state()).journey.run,null);await capture('north-mark',{x:320,y:265},{mark:{x:320,y:285},bend:{x:320,y:250}},'journey_north_mark');

  await load('paused');let frozen=await state();const n=frozen.worlds.workshop.find(e=>e.id==='xu_work');assert.equal(n.state,'leading');await capture('paused-leading',{x:n.x,y:n.y-38},{leader:{x:n.x,y:n.y},player:{x:frozen.player.x,y:frozen.player.y}});
  const a=await screenPoint(n.x-23,n.y-80),b=await screenPoint(n.x+23,n.y+8),clip={x:Math.max(0,Math.floor(a.x)),y:Math.max(0,Math.floor(a.y)),width:Math.ceil(b.x-a.x),height:Math.ceil(b.y-a.y)};assert.ok(clip.x+clip.width<=device.width&&clip.y+clip.height<=device.height,'Leader body must fit the pixel-freeze crop');
  frozen=await state();const beforeVisual=await visual(),beforeActor=beforeVisual.actors?.find(e=>e.id==='xu_work');assert.ok(beforeActor,'Read-only presentation must expose the actual rendered leader');const beforePixels=await page.screenshot({clip});await page.waitForTimeout(600);const after=await state(),afterVisual=await visual(),afterPixels=await page.screenshot({clip});assert.equal(after.time,frozen.time);assert.equal(after.player.hold,frozen.player.hold);assert.deepEqual(after.journey,frozen.journey);assert.deepEqual(after.worlds.workshop.find(e=>e.id==='xu_work'),frozen.worlds.workshop.find(e=>e.id==='xu_work'));assert.deepEqual(afterVisual.player,beforeVisual.player);assert.deepEqual(afterVisual.actors.find(e=>e.id==='xu_work'),beforeActor,'Paused actual render pose and facing must remain frozen');item.checks.push({id:'paused-leader-freeze',wallMs:600,clip,pngSha256Before:hash(beforePixels),pngSha256After:hash(afterPixels),pixelHashIsInformational:true,renderedActor:beforeActor,modelTime:after.time,leader:frozen.worlds.workshop.find(e=>e.id==='xu_work')});

  await load('complete');const home=(await state()).worlds.home.find(e=>e.id==='table');assert.ok(home);await capture('home-paper',{x:home.x-52,y:home.y-49},{table:{x:home.x,y:home.y},paper:{x:home.x-52,y:home.y-49}});
  await interact('to_creek');await choose('canal:depart:creek');await wait(()=>window.__XIAN_NI__.inspect().scene==='creek');await interact('shelter');await resume();await pause();const rest=(await state()).worlds.creek.find(e=>e.id==='journey_rest_shelter');assert.equal(rest.state,'idle');assert.equal((await state()).journey.restOpened,true);assert.equal((await state()).journey.recordedShared,true);
  await capture('shelter-rest',{x:rest.x,y:rest.y-18},{rest:{x:rest.x,y:rest.y},shelter:{x:1200,y:500}});assert.ok((await visual()).labels.some(l=>l.id==='journey_rest_shelter'||l.id==='shelter'),'Shelter proximity must expose an actual interaction name');
  assert.equal((await state()).journey.run,null,'Visual revisit must not begin a new guided run');await context.close();activePage=null;
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=String(error);console.error(error);process.exitCode=1;if(activePage)report.failureState=await activePage.evaluate(()=>window.__XIAN_NI__.inspect()).catch(()=>null);if(activePage)await activePage.screenshot({path:'qa/evidence/journey-view-failure.png'}).catch(()=>{});}
finally{await browser?.close();await writeFile(output,JSON.stringify(report,null,2));}
console.log(JSON.stringify(report));

import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const url=process.env.GAME_URL||'http://127.0.0.1:4191/';
const selection=process.env.KILN_ROUTE||'all';assert.ok(['desktop','phone','all'].includes(selection));
const fixturePath='qa/fixtures/return-journey-v0.5.0.json';
const output='qa/evidence/kiln-check.json';
const evidence={schemaVersion:1,status:'NOT_RUN',startedAt:new Date().toISOString(),selection,environment:{url,platform:process.platform,limitation:'Linux Chrome desktop and emulated phone, not physical Mac/Safari/phone.'},routes:[],errors:[]};
let browser,page,route,mobile=false;
const started=Date.now();await mkdir('qa/evidence',{recursive:true});
const persist=()=>writeFile(output,JSON.stringify(evidence,null,2));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const log=(action,detail={})=>{route.inputTrace.push({action,detail,wallMs:Date.now()-started});console.log(route.id,action,JSON.stringify(detail));};
const state=()=>page.evaluate(()=>window.__XIAN_NI__.inspect());
const wait=(fn,arg,timeout=15000)=>page.waitForFunction(fn,arg,{timeout,polling:'raf'});
const brief=s=>({scene:s.scene,time:s.time,player:s.player,kiln:s.kiln,journey:s.journey,canal:s.canal,paused:s.paused,dialogue:s.dialogue,defeated:s.defeated,events:s.events.slice(-12)});
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
async function worldTap(x,y){const p=await frame(x,y);if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);}
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
 await wait(continuation=>{const s=window.__XIAN_NI__.inspect();return s.contentVersion===5&&s.journey.stage==='complete'&&(!continuation||s.scene==='kiln');},continuation);
 await page.waitForTimeout(160);await dismissEnding();log('settings-import',{name,contentVersion:(await state()).contentVersion});
}
async function capture(id){await pause();if(!mobile)await page.mouse.move(1430,890);const path=`qa/evidence/kiln-${route.id}-${id}.png`;await page.screenshot({path});route.observations[id]={visual:path,state:brief(await state())};await persist();}
async function newPage(){
 const p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?3:2,isMobile:mobile,hasTouch:mobile,acceptDownloads:true});
 const routeId=route.id;p.on('pageerror',e=>evidence.errors.push({route:routeId,message:e.message}));return p;
}
async function prepare(bytes,{rest=false}={}){
 await importSave(bytes,'return-journey-v0.5.0.json',{fresh:true});await resume();const s=await state();assert.equal(s.kiln.visited,false);assert.equal(s.kiln.loan,'none');assert.equal(s.kiln.shelterOpened,false);
 await interact('to_creek');await choose('canal:depart:creek');await wait(()=>window.__XIAN_NI__.inspect().scene==='creek');
 if(rest){await interact('rest_creek');assert.equal((await state()).player.mana,6);}
 for(const p of [[300,740],[300,340],[700,315]])await walk(...p);
 await interact('creek_to_kiln');await wait(()=>window.__XIAN_NI__.inspect().scene==='kiln');
 const entered=await state();assert.equal(entered.kiln.entry,'west');assert.deepEqual(entered.kiln.crossed,{west:false,east:false});assert.notEqual(entered.lastSafe.scene,'kiln');route.initial=brief(entered);
 await capture('west-entry');await resume();
}
async function zeroRoundTrip(){
 assert.equal((await state()).player.mana,0);
 for(const p of [[360,700],[360,820],[800,820],[1030,820],[1220,820],[1220,650]])await walk(...p);
 await interact('kiln_to_canal');await wait(()=>window.__XIAN_NI__.inspect().scene==='canal');
 let s=await state();assert.deepEqual(s.kiln.crossed,{west:false,east:true});assert.equal(s.kiln.entry,null);assert.equal(s.player.mana,0);route.east=brief(s);
 await walk(460,520);await interact('canal_to_kiln');await wait(()=>window.__XIAN_NI__.inspect().scene==='kiln');assert.equal((await state()).kiln.entry,'east');
 for(const p of [[1290,540],[1290,140],[800,140],[360,170],[270,420]])await walk(...p);
 await interact('kiln_to_creek');await wait(()=>window.__XIAN_NI__.inspect().scene==='creek');s=await state();assert.deepEqual(s.kiln.crossed,{west:true,east:true});assert.equal(s.kiln.loan,'none');assert.equal(s.kiln.shelterOpened,false);assert.equal(s.player.mana,0);assert.ok(s.player.hp>0);route.returned=brief(s);
 await capture('zero-return-creek');await exportSave('kiln-zero-complete-export.json');
}
async function cast(spell,x,y){await resume();log('cast',{spell,x,y});await button(`[data-ui="spell:${spell}"]`);await worldTap(x,y);}
async function borrowReturn(){
 await interact('duqin');await choose('kiln:borrow');assert.equal((await state()).kiln.loan,'agreed');
 await walk(350,640);await cast('pull',500,640);await wait(()=>window.__XIAN_NI__.inspect().player.pullId==='shield_board');
 await worldTap(620,700);await wait(()=>{const s=window.__XIAN_NI__.inspect(),e=s.worlds.kiln.find(e=>e.id==='shield_board');return Math.hypot(e.x-620,e.y-700)<3;});
 await button('[data-ui="release"]');await wait(()=>window.__XIAN_NI__.inspect().kiln.loan==='borrowed');
 await cast('pull',620,700);await wait(()=>window.__XIAN_NI__.inspect().player.pullId==='shield_board');await worldTap(500,640);
 await wait(()=>{const e=window.__XIAN_NI__.inspect().worlds.kiln.find(e=>e.id==='shield_board');return Math.hypot(e.x-500,e.y-640)<3;});await button('[data-ui="release"]');
 await interact('duqin');await choose('kiln:return');let s=await state();assert.equal(s.kiln.loan,'returned');assert.equal(s.kiln.shelterOpened,true);assert.equal(s.player.mana,4);assert.deepEqual(s.kiln.crossed,{west:false,east:false});
 await capture('intact-return');const bytes=await exportSave('kiln-phone-returned-export.json');await page.close();page=await newPage();await importSave(bytes,'kiln-returned.json',{fresh:true,continuation:true});s=await state();assert.equal(s.paused,true);assert.equal(s.kiln.loan,'returned');assert.equal(s.kiln.shelterOpened,true);assert.equal(s.player.mana,4);route.restored=brief(s);
 await resume();await interact('kiln_rest');s=await state();assert.equal(s.player.mana,6);assert.equal(s.lastSafe.scene,'kiln');await capture('permitted-shelter');
}
async function run(bytes,isPhone){mobile=isPhone;route={id:mobile?'phone':'desktop',status:'RUNNING',inputTrace:[],observations:{},exports:[]};evidence.routes.push(route);page=await newPage();await prepare(bytes,{rest:mobile});if(mobile)await borrowReturn();else await zeroRoundTrip();route.status='PASS';await persist();await page.close();page=null;}
try{
 const bytes=await readFile(fixturePath),original=JSON.parse(bytes);assert.equal(original.contentVersion,4);assert.equal(original.journey.stage,'complete');evidence.fixture={path:fixturePath,sha256:hash(bytes),source:'Unmodified actual 0.5 completion exported through settings, preserved from 7fea179'};
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});evidence.environment.browser=await browser.version();
 if(selection!=='phone')await run(bytes,false);if(selection!=='desktop')await run(bytes,true);assert.deepEqual(evidence.errors,[]);evidence.status='PASS';evidence.completedAt=new Date().toISOString();await persist();
}catch(error){evidence.status='FAIL';evidence.failure=String(error);if(route)route.status='FAIL';console.error(error);if(page){evidence.failureState=await state().catch(()=>null);await page.screenshot({path:'qa/evidence/kiln-failure.png'}).catch(()=>{});}await persist();process.exitCode=1;}finally{await browser?.close();}

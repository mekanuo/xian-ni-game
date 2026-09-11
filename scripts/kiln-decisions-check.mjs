import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const url=process.env.GAME_URL||'http://127.0.0.1:4192/whitebox.html';
const report={scope:'supplementary screen consequences',status:'NOT_RUN',url,checkedAt:new Date().toISOString(),input:[],cases:[],errors:[],limitations:['Isolated target-engine geometry whitebox, not production art, save migration, NPC borrowing or a real inter-map connection.','Linux Chrome desktop input; physical Mac/Safari/phone untested.']};
let browser,page;
await mkdir('qa/whitebox',{recursive:true});
const log=(action,detail)=>{report.input.push({action,detail,wall:Date.now()});console.log(action,JSON.stringify(detail));};
const state=()=>page.evaluate(()=>window.__KILN__.inspect());
const screenPoint=point=>page.evaluate(p=>window.__KILN__.screenPoint(p.x,p.y),point);
async function clickWorld(point){const p=await screenPoint(point);assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,p),'CANVAS',`World input ${JSON.stringify(point)} must land on canvas`);await page.mouse.click(p.x,p.y);}
async function reset(preset){log('new-scenario',preset);await page.locator(`[data-preset="${preset}"]`).click();await page.locator('[data-action="overview"]').click();await page.waitForTimeout(100);const r=await state();assert.equal(r.preset,preset);assert.equal(r.state.player.hp,4);assert.equal(r.state.player.mana,preset==='zero'?0:6);assert.equal(r.eastReached,false);assert.equal(r.returned,false);}
async function walk(point){log('click-walk',point);await page.locator('[data-action="walk"]').click();await clickWorld(point);await page.waitForFunction(p=>{const r=window.__KILN__.inspect();return r.state.defeated||(Math.hypot(r.state.player.x-p.x,r.state.player.y-p.y)<18&&r.state.player.path.length===0);},point,{timeout:20000});const r=await state();assert.equal(r.state.defeated,false);}
async function keyboardWalk(point){
  log('keyboard-walk',point);const end=Date.now()+20000,held=new Set();
  try{while(Date.now()<end){const r=await state(),p=r.state.player;assert.equal(r.state.defeated,false,'Actual zero-resource walk must stay alive');const dx=point.x-p.x,dy=point.y-p.y;if(Math.hypot(dx,dy)<18)return;
    const next=new Set();if(Math.abs(dx)>9)next.add(dx>0?'d':'a');if(Math.abs(dy)>9)next.add(dy>0?'s':'w');
    for(const key of held)if(!next.has(key)){await page.keyboard.up(key);held.delete(key);}for(const key of next)if(!held.has(key)){await page.keyboard.down(key);held.add(key);}await page.waitForTimeout(65);
  }throw Error(`Keyboard did not reach ${JSON.stringify(point)}`);}finally{for(const key of held)await page.keyboard.up(key);}
}
async function pause(){const r=await state();if(!r.state.paused)await page.locator('[data-action="pause"]').click();}
async function capture(name){await pause();const path=`qa/whitebox/${name}.png`;await page.screenshot({path});return path;}
async function cast(spell,point){log('cast',{spell,point});await page.locator(`[data-spell="${spell}"]`).click();await clickWorld(point);}
const screen=r=>r.state.worlds.home.find(e=>e.id==='shield_board');
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
  page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});page.on('pageerror',error=>report.errors.push(error.message));report.browser=await browser.version();
  await page.goto(url);await page.waitForFunction(()=>window.__KILN__);report.geometry=await page.evaluate(()=>window.__KILN__.geometry());
  await reset('ordinary');await walk({x:350,y:640});await cast('pull',{x:500,y:640});
  await page.waitForFunction(()=>window.__KILN__.inspect().state.player.pullId==='shield_board');
  log('move-screen-out',{x:620,y:700});await clickWorld({x:620,y:700});
  await page.waitForFunction(()=>{const e=window.__KILN__.inspect().state.worlds.home.find(e=>e.id==='shield_board');return Math.hypot(e.x-620,e.y-700)<3;});
  await page.locator('[data-action="release"]').click();const borrowed=await state();assert.equal(screen(borrowed).state,'idle');assert.equal(screen(borrowed).data.noiseUsed,true);
  await cast('pull',{x:620,y:700});await page.waitForFunction(()=>window.__KILN__.inspect().state.player.pullId==='shield_board');
  log('return-screen-home',{x:500,y:640});await clickWorld({x:500,y:640});
  await page.waitForFunction(()=>{const e=window.__KILN__.inspect().state.worlds.home.find(e=>e.id==='shield_board');return Math.hypot(e.x-500,e.y-640)<3;});
  await page.locator('[data-action="release"]').click();const returned=await state();assert.equal(screen(returned).state,'idle');assert.equal(returned.state.player.mana,4);assert.ok(returned.state.player.hp>0);
  report.cases.push({id:'intact-screen-actual-return',borrowed,returned,visual:await capture('returned-screen')});

  await reset('ordinary');await walk({x:350,y:640});const before=await state();
  log('reject-standing-in-intact-screen',{x:500,y:640});await clickWorld({x:500,y:640});await page.waitForTimeout(150);
  const blocked=await state();assert.ok(Math.hypot(blocked.state.player.x-before.state.player.x,blocked.state.player.y-before.state.player.y)<2);assert.equal(blocked.state.player.path.length,0);
  await cast('flame',{x:500,y:640});await page.waitForFunction(()=>window.__KILN__.inspect().state.worlds.home.find(e=>e.id==='shield_board').state==='burning');
  const burning=await state();await page.waitForFunction(()=>window.__KILN__.inspect().state.worlds.home.find(e=>e.id==='shield_board').state==='burned',null,{timeout:25000});
  await walk({x:500,y:640});const inOldFootprint=await state();assert.equal(screen(inOldFootprint).state,'burned');
  await walk({x:560,y:660});await walk({x:350,y:640});const reapproached=await state();
  assert.equal(reapproached.state.player.mana,5);assert.ok(reapproached.state.player.hp>0);assert.equal(screen(reapproached).state,'burned');assert.ok(reapproached.state.events.some(e=>e.type==='alert'));
  assert.ok(reapproached.state.worlds.home.filter(e=>e.kind==='enemy').every(e=>e.hp===3&&!['peaceful','retreated'].includes(e.state)));
  report.cases.push({id:'burn-opens-real-footprint-and-loses-cover',blocked,burning,inOldFootprint,reapproached,visual:await capture('burned-reapproach')});
  assert.deepEqual(report.errors,[]);report.status='PASS';console.log('KILN DECISIONS PASS');
}catch(error){report.status='FAIL';report.failure=String(error);console.error(error);if(page){report.failureState=await state().catch(()=>null);await page.screenshot({path:'qa/whitebox/decisions-failure.png'}).catch(()=>{});}process.exitCode=1;}
finally{await browser?.close();await writeFile('qa/whitebox/kiln-decisions.json',JSON.stringify(report,null,2));}

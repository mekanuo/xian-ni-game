import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
await mkdir('qa/evidence',{recursive:true});
await writeFile('qa/evidence/region-art.json',JSON.stringify({schemaVersion:1,status:'NOT_RUN',runId:'region-art'},null,2));
const gameUrl=process.env.GAME_URL||'http://127.0.0.1:4191/';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
const inputTrace=[],errors=[],observations={},started=Date.now();page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.__XIAN_NI__.inspect());
const brief=s=>({scene:s.scene,time:s.time,player:s.player,flags:s.flags,ended:s.ended,dialogue:s.dialogue,events:s.events.slice(-4)});
const log=(action,detail)=>{inputTrace.push({action,detail,wall:Date.now()-started});console.log(action,JSON.stringify(detail));};
async function point(x,y){
 for(let i=0;i<3;i++){
  const p=await page.evaluate(p=>window.__XIAN_NI__.screenPoint(p.x,p.y),{x,y});
  if(p.x>=60&&p.x<=1370&&p.y>=150&&p.y<=735)return p;
  const dx=Math.max(-500,Math.min(500,720-p.x)),dy=Math.max(-300,Math.min(300,450-p.y));
  await page.keyboard.down('Shift');await page.mouse.move(720,450);await page.mouse.down();await page.mouse.move(720+dx,450+dy,{steps:8});await page.mouse.up();await page.keyboard.up('Shift');await page.waitForTimeout(150);
 }
 return page.evaluate(p=>window.__XIAN_NI__.screenPoint(p.x,p.y),{x,y});
}
async function click(x,y){const p=await point(x,y);await page.mouse.click(p.x,p.y);}
async function resume(){const s=await state();if(s.ended)return;if(s.dialogue){while(!(await state()).dialogue.choices.some(c=>c.id==='leave'))await page.locator('[data-ui="choice:more"]').click();await page.locator('[data-ui="choice:leave"]').click();}if((await state()).paused)await page.locator('.action-dock [data-ui="pause"]').click();}
async function walk(x,y){await resume();log('walk',{x,y});await click(x,y);await page.waitForFunction(({x,y})=>Math.hypot(window.__XIAN_NI__.inspect().player.x-x,window.__XIAN_NI__.inspect().player.y-y)<18,{x,y},{timeout:45000});}
async function obj(id){const s=await state();const e=s.worlds[s.scene].find(e=>e.id===id);assert.ok(e,`Object ${id}`);return e;}
async function interact(id){await resume();const e=await obj(id),scene=(await state()).scene;log('interact',id);await click(e.x,e.y);await page.waitForFunction(({id,scene})=>{const s=window.__XIAN_NI__.inspect();if(s.scene!==scene||s.dialogue)return true;const e=s.worlds[s.scene].find(e=>e.id===id);return Math.hypot(s.player.x-e.x,s.player.y-e.y)<100&&s.player.path.length===0;},{id,scene},{timeout:45000});await page.waitForTimeout(300);}
async function choose(id){for(let i=0;i<8&&!(await state()).dialogue?.choices.some(c=>c.id===id);i++)await page.locator('[data-ui="choice:more"]').click();log('choice',id);await page.locator(`[data-ui="choice:${id}"]`).click();await resume();}
async function exit(id,scene){await interact(id);await page.waitForFunction(scene=>window.__XIAN_NI__.inspect().scene===scene,scene,{timeout:5000});log('scene',scene);}
async function pull(id,x,y){await resume();const e=await obj(id);log('pull',{id,x,y});await page.locator('[data-ui="spell:pull"]').click();await click(e.x,e.y);await page.waitForFunction(id=>window.__XIAN_NI__.inspect().player.pullId===id,id,{timeout:5000});await click(x,y);await page.waitForFunction(({id,x,y})=>{const s=window.__XIAN_NI__.inspect();const e=s.worlds[s.scene].find(e=>e.id===id);return Math.hypot(e.x-x,e.y-y)<12;},{id,x,y},{timeout:10000});await page.locator('[data-ui="release"]').click();}
async function pause(){if(!(await state()).paused)await page.locator('.action-dock [data-ui="pause"]').click();}
async function frame(x,y){
 await pause();
 for(let i=0;i<3;i++){
  const p=await page.evaluate(p=>window.__XIAN_NI__.screenPoint(p.x,p.y),{x,y});
  const dx=Math.max(-550,Math.min(550,720-p.x)),dy=Math.max(-300,Math.min(300,450-p.y));
  if(Math.abs(dx)+Math.abs(dy)<4)break;
  await page.keyboard.down('Shift');await page.mouse.move(720,450);await page.mouse.down();await page.mouse.move(720+dx,450+dy,{steps:8});await page.mouse.up();await page.keyboard.up('Shift');await page.waitForTimeout(150);
 }
 await page.mouse.move(1430,890);await page.waitForTimeout(200);
}
async function capture(id,x,y,signId){
 await frame(x,y);const path=`qa/evidence/region-${id}.png`;await page.screenshot({path});
 const item={scene:(await state()).scene,player:(await state()).player,visual:path};
 if(signId){const sign=await obj(signId);const p=await page.evaluate(p=>window.__XIAN_NI__.screenPoint(p.x,p.y),sign);const q=await page.evaluate(p=>window.__XIAN_NI__.screenPoint(p.x+70,p.y-85),sign);const scale=(q.x-p.x)/70;item.sign={id:signId,name:sign.name,foot:p,scale,visual:`qa/evidence/region-${id}-sign.png`};await page.screenshot({path:item.sign.visual,clip:{x:Math.max(0,p.x-70*scale),y:Math.max(0,p.y-85*scale),width:140*scale,height:115*scale}});}
 observations[id]=item;log('capture',{id,scene:item.scene});
}
try{
 await page.goto(gameUrl);await page.getByRole('button',{name:'入 山',exact:true}).click();await page.locator('input[value="tinker"]').check();await page.getByRole('button',{name:'去回石驿',exact:true}).click();await page.waitForTimeout(800);
 log('new-game',brief(await state()));
 await walk(1510,710);await capture('home-road',1470,650,'to_creek');
 await exit('to_creek','creek');await capture('creek-return',420,650,'to_home');
 await interact('rope');await choose('fix');await interact('bag');assert.equal((await state()).flags.tools,true);
 await walk(885,555);await pull('basket',1180,520);await pull('board',1120,648);await walk(1120,735);await walk(1120,555);await capture('creek-shelter',1180,490);
 await walk(1500,430);await capture('creek-workshop-road',1380,395,'to_workshop');
 await exit('to_workshop','workshop');await capture('workshop-entry',500,580,'to_creek');
 await walk(320,220);await walk(1450,220);await walk(1410,560);await capture('workshop-shed',1310,470);
 await interact('ring');await interact('tao_work');await choose('long');await walk(1210,600);await pull('trial',1310,600);assert.equal((await state()).flags.ringTrained,true);
 await walk(1450,220);await walk(320,220);await exit('to_creek','creek');await walk(1510,745);await capture('creek-crossing-road',1420,755,'to_crossing');
 await exit('to_crossing','crossing');await capture('crossing-entry',450,720,'to_creek');await walk(650,900);await capture('crossing-bank',1100,600);
 assert.equal(errors.length,0);
 await page.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));
 await mobile.goto(gameUrl);await mobile.getByRole('button',{name:'入 山',exact:true}).tap();await mobile.getByRole('button',{name:'去回石驿',exact:true}).tap();await mobile.waitForTimeout(800);
 // Physical keyboard input is accepted on the emulated touch viewport; no state writes.
 await mobile.keyboard.down('d');await mobile.waitForFunction(()=>window.__XIAN_NI__.inspect().player.x>1490,null,{timeout:45000});await mobile.keyboard.up('d');await mobile.waitForTimeout(500);
 await mobile.locator('.action-dock [data-ui="pause"]').tap();await mobile.screenshot({path:'qa/evidence/region-phone-road.png'});
 const ms=await mobile.evaluate(()=>window.__XIAN_NI__.inspect());const msign=ms.worlds.home.find(e=>e.id==='to_creek');const mp=await mobile.evaluate(p=>window.__XIAN_NI__.screenPoint(p.x,p.y),msign);
 observations.mobile={visual:'qa/evidence/region-phone-road.png',viewport:'390x844 DPR3',player:ms.player,sign:{name:msign.name,foot:mp},inputs:['new profile using touch','hold D on emulated touch viewport','tap pause']};log('mobile-sign',observations.mobile.sign);
 await mobile.close();assert.equal(errors.length,0);
 await writeFile('qa/evidence/region-art.json',JSON.stringify({schemaVersion:1,status:'PASS',runId:'region-art',environment:{browser:await browser.version(),platform:process.platform,viewport:'1440x900 DPR2 + 390x844 DPR3',url:gameUrl,limitation:'Chrome emulation; not physical Mac or mobile. Visual capture is not a subjective quality verdict.'},inputTrace,observations,errors},null,2));console.log('REGION ART CAPTURE COMPLETE');
}catch(e){console.error('FAIL',e);await writeFile('qa/evidence/region-art.json',JSON.stringify({schemaVersion:1,status:'FAIL',runId:'region-art',error:String(e),inputTrace,observations,errors},null,2));if(!page.isClosed())await page.screenshot({path:'qa/evidence/region-failure.png'}).catch(()=>{});process.exitCode=1;}finally{await browser.close();}

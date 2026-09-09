import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
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
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:4191/');
 await page.getByRole('button',{name:'入 山',exact:true}).click();
 await page.locator('input[value="tinker"]').check();await page.getByRole('button',{name:'去回石驿',exact:true}).click();
 await page.waitForFunction(()=>window.__XIAN_NI__.audio().musicRms>.002);
 const music=await page.evaluate(()=>window.__XIAN_NI__.audio());
 await exit('to_creek','creek');await interact('rope');await choose('fix');await interact('bag');await exit('to_workshop','workshop');
 await walk(430,730);
 const enemy=await obj('beast_a');
 await page.locator('[data-ui="spell:flame"]').click();await click(enemy.x,enemy.y);
 await page.waitForFunction(()=>window.__XIAN_NI__.feedback().active.some(f=>f.kind==='hit'),null,{polling:'raf',timeout:10000});
 const hit=await page.evaluate(()=>({audio:window.__XIAN_NI__.audio(),feedback:window.__XIAN_NI__.feedback(),state:window.__XIAN_NI__.inspect()}));
 await page.screenshot({path:'qa/evidence/combat-hit.png'});
 assert.ok(hit.audio.effectCounts.hit>=1,'Every actual hit plays a hit sound');
 await page.locator('[data-ui="spell:ward"]').click();const e=await obj('beast_a');await click(e.x,e.y);
 await page.waitForFunction(()=>window.__XIAN_NI__.feedback().recent.some(f=>f.kind==='block'),null,{timeout:15000});
 const block=await page.evaluate(()=>({audio:window.__XIAN_NI__.audio(),feedback:window.__XIAN_NI__.feedback()}));
 assert.ok(block.audio.effectCounts.block>=1);
 await page.waitForFunction(()=>window.__XIAN_NI__.feedback().active.some(f=>f.kind==='hurt'),null,{polling:'raf',timeout:10000});
 const hurt=await page.evaluate(()=>({audio:window.__XIAN_NI__.audio(),feedback:window.__XIAN_NI__.feedback()}));
 await page.screenshot({path:'qa/evidence/combat-hurt.png'});
 assert.ok(hurt.audio.effectCounts.hurt>=1);assert.deepEqual(errors,[]);
 await writeFile('qa/evidence/combat.json',JSON.stringify({environment:{browser:await browser.version(),device:'Linux Chrome real input, not a phone speaker test'},inputTrace,music,hit:{audio:hit.audio,feedback:hit.feedback,hp:hit.state.player.hp},block,hurt,errors},null,2));
 console.log('Combat feedback and live soundtrack PASS');
}catch(e){console.error(e);await page.screenshot({path:'qa/evidence/combat-failure.png'});console.log(JSON.stringify(brief(await state())));process.exitCode=1;}finally{await browser.close();}

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
async function resume(){const s=await state();if(s.dialogue){while(!(await state()).dialogue.choices.some(c=>c.id==='leave'))await page.locator('[data-ui="choice:more"]').click();await page.locator('[data-ui="choice:leave"]').click();}if((await state()).paused)await page.locator('.action-dock [data-ui="pause"]').click();}
async function walk(x,y){await resume();log('walk',{x,y});await click(x,y);await page.waitForFunction(({x,y})=>Math.hypot(window.__XIAN_NI__.inspect().player.x-x,window.__XIAN_NI__.inspect().player.y-y)<18,{x,y},{timeout:45000});}
async function obj(id){const s=await state();const e=s.worlds[s.scene].find(e=>e.id===id);assert.ok(e,`Object ${id}`);return e;}
async function interact(id){await resume();const e=await obj(id),scene=(await state()).scene;log('interact',id);await click(e.x,e.y);await page.waitForFunction(({id,scene})=>{const s=window.__XIAN_NI__.inspect();if(s.scene!==scene||s.dialogue)return true;const e=s.worlds[s.scene].find(e=>e.id===id);return Math.hypot(s.player.x-e.x,s.player.y-e.y)<100&&s.player.path.length===0;},{id,scene},{timeout:45000});await page.waitForTimeout(300);}
async function choose(id){for(let i=0;i<8&&!(await state()).dialogue?.choices.some(c=>c.id===id);i++)await page.locator('[data-ui="choice:more"]').click();log('choice',id);await page.locator(`[data-ui="choice:${id}"]`).click();await resume();}
async function exit(id,scene){await interact(id);await page.waitForFunction(scene=>window.__XIAN_NI__.inspect().scene===scene,scene,{timeout:5000});log('scene',scene);}
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:4191/');
 await page.getByRole('button',{name:'入 山',exact:true}).click();await page.getByRole('button',{name:'去回石驿',exact:true}).click();
 await page.locator('[data-ui="settings"]').click();await page.locator('#import-save').setInputFiles('qa/fixtures/return-ridge-v0.4.1.json');
 await page.waitForFunction(()=>window.__XIAN_NI__.inspect().contentVersion===5&&window.__XIAN_NI__.inspect().ended);
 const ending=page.getByRole('button',{name:'在驿中再坐一会儿',exact:true});if(await ending.isVisible())await ending.click();await resume();
 await exit('to_creek','creek');await exit('to_crossing','crossing');await walk(600,740);
 const before=await state(),board=await obj('shield_board'),seq=before.events.at(-1)?.seq??0;
 assert.equal(board.solid,true);assert.equal(board.state,'idle');
 await page.locator('[data-ui="spell:flame"]').click();await click(board.x,board.y);
 await page.waitForFunction(seq=>window.__XIAN_NI__.inspect().events.some(e=>e.seq>seq&&e.type==='impact'),seq,{polling:'raf',timeout:10000});
 const after=await state(),impact=after.events.find(e=>e.seq>seq&&e.type==='impact');
 assert.ok(Math.abs(impact.x-(board.x-board.w/2))<.1,'Fire must stop on the first left face, not tunnel into/through the board');
 assert.ok(impact.y>=board.y-board.h/2&&impact.y<=board.y+board.h/2);assert.equal(after.player.mana,before.player.mana-1);assert.equal(after.player.hp,before.player.hp);assert.equal(after.worlds.crossing.find(e=>e.id==='shield_board').state,'idle');
 await page.locator('.action-dock [data-ui="pause"]').click();await page.screenshot({path:'qa/evidence/projectile-cover.png'});
 assert.deepEqual(errors,[]);await writeFile('qa/evidence/projectile-cover.json',JSON.stringify({status:'PASS',url:process.env.GAME_URL||'http://127.0.0.1:4191/',browser:await browser.version(),fixture:'Genuine 0.4.1 ridge completion imported via settings',inputTrace,board,impact,before:{player:before.player},after:{player:after.player},errors,limitation:'Real desktop input proves visible fire collision with the first board face. Enemy short-step, wall, ward and flammable-solid boundaries have model tests; no physical-device claim.'},null,2));
 console.log('PROJECTILE FIRST FACE REAL INPUT PASS',JSON.stringify(impact));
}catch(e){console.error(e);await page.screenshot({path:'qa/evidence/projectile-cover-failure.png'}).catch(()=>{});await writeFile('qa/evidence/projectile-cover.json',JSON.stringify({status:'FAIL',failure:String(e),inputTrace,state:brief(await state()),errors},null,2));process.exitCode=1;}finally{await browser.close();}

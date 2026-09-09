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
async function pull(id,x,y){await resume();const e=await obj(id);log('pull',{id,x,y});await page.locator('[data-ui="spell:pull"]').click();await click(e.x,e.y);await page.waitForFunction(id=>window.__XIAN_NI__.inspect().player.pullId===id,id,{timeout:5000});await click(x,y);await page.waitForFunction(({id,x,y})=>{const s=window.__XIAN_NI__.inspect();const e=s.worlds[s.scene].find(e=>e.id===id);return Math.hypot(e.x-x,e.y-y)<12;},{id,x,y},{timeout:10000});await page.locator('[data-ui="release"]').click();}
try{
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:4173/');observations.launch={id:'static-entry',inputs:['navigate to game URL'],state:{title:await page.title(),url:page.url()}};await page.getByRole('button',{name:'入 山',exact:true}).click();
 await page.locator('input[value="tinker"]').check();await page.getByRole('button',{name:'去回石驿',exact:true}).click();await page.waitForTimeout(500);
 log('new-game',brief(await state()));await page.screenshot({path:'qa/evidence/game-render.png'});observations.render={id:'new-game-world',inputs:['create tinker profile'],state:brief(await state()),visual:'qa/evidence/game-render.png'};await pull('lamp',560,665);assert.equal((await state()).flags.lampFixed,true);observations.input={id:'physical-lamp',inputs:['select pull','click lamp','click stand','release'],state:brief(await state())};
 await exit('to_creek','creek');await interact('rope');await choose('fix');await interact('bag');assert.equal((await state()).flags.tools,true);
 await exit('to_workshop','workshop');await walk(320,220);await walk(1450,220);await interact('ring');await interact('tao_work');await choose('long');await walk(1210,600);await pull('trial',1310,600);assert.equal((await state()).flags.ringTrained,true);
 observations.coreLoop={id:'retrieve-and-learn',inputs:inputTrace.slice(-8),state:brief(await state())};await page.screenshot({path:'qa/evidence/ring-trial.png'});await interact('rest_workshop');await resume();await walk(1450,220);await walk(320,220);await exit('to_creek','creek');
 await exit('to_crossing','crossing');await walk(320,170);await walk(680,170);await pull('ridge_rope',800,180);assert.equal((await state()).flags.ridgeOpen,true);await walk(1430,280);await interact('ridge_marker');assert.equal((await state()).flags.route,'ridge');
 await page.screenshot({path:'qa/evidence/ridge-outcome.png'});await walk(1050,220);await walk(680,170);await walk(320,170);await walk(400,900);await exit('to_creek','creek');await exit('to_home','home');await interact('table');await choose('travel');assert.equal((await state()).ended,true);const ending=brief(await state());observations.outcome={id:'return-to-table',inputs:['traverse ridge','return through creek','table travel choice'],state:{terminal:'designed-outcome',...ending}};
 await page.screenshot({path:'qa/evidence/return-home.png'});await page.locator('[data-ui="settings"]').click();await page.locator('[data-ui="restart"]').click();await page.getByRole('button',{name:'重新选择出身',exact:true}).click();await page.getByRole('button',{name:'去回石驿',exact:true}).click();const restart=brief(await state());assert.equal(restart.scene,'home');assert.equal(restart.ended,false);assert.equal(restart.flags.ringOwned,undefined);assert.equal(errors.length,0);observations.restart={id:'new-journey',inputs:['settings','restart','new profile'],state:{terminal:'initial-state',...restart}};
 await writeFile('qa/evidence/playthrough-draft.json',JSON.stringify({schemaVersion:1,runId:'ridge-return',environment:{browser:await browser.version(),platform:process.platform,viewport:'1440x900',url:process.env.GAME_URL||'http://127.0.0.1:4173/'},inputTrace,observations},null,2));console.log('COMPLETE',JSON.stringify(ending));
}catch(e){console.error('FAIL',e);const s=await state().catch(()=>null);await page.screenshot({path:'qa/evidence/playthrough-failure.png'});await writeFile('qa/evidence/playthrough-failure.json',JSON.stringify({error:String(e),inputTrace,state:s?brief(s):null,errors},null,2));process.exitCode=1;}finally{await browser.close();}

import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

// Only UI inputs change the game. inspect/screenPoint are read-only evidence.
// The legacy fixture was exported after a real 0.2.2 ridge-route playthrough.
const gameUrl=process.env.GAME_URL||'http://127.0.0.1:4191/';
const fixturePath=process.env.LIFE_FIXTURE||'qa/fixtures/return-ridge-v0.2.2.json';
const output='qa/evidence/life-hold-check.json';
const evidence={schemaVersion:1,status:'NOT_RUN',runId:'life-hold-repair',startedAt:new Date().toISOString(),environment:{url:gameUrl,platform:process.platform,viewport:{width:1440,height:900,deviceScaleFactor:1},limitation:'Linux Chrome desktop; no physical Mac, mobile or Safari claim.'},inputTrace:[],observations:{},errors:[]};
const started=Date.now();
let browser,page;
await mkdir('qa/evidence',{recursive:true});
const persist=()=>writeFile(output,JSON.stringify(evidence,null,2));
await persist();
const log=(action,detail={})=>{evidence.inputTrace.push({action,detail,wallMs:Date.now()-started});console.log(action,JSON.stringify(detail));};
const state=()=>page.evaluate(()=>window.__XIAN_NI__.inspect());
const brief=s=>({scene:s.scene,time:s.time,player:s.player,life:s.life,flags:s.flags,ended:s.ended,paused:s.paused,pending:s.pending,dialogue:s.dialogue,events:s.events.slice(-6)});
const wait=async(predicate,arg,timeout=15000)=>page.waitForFunction(predicate,arg,{timeout});
async function press(key){await page.keyboard.down(key);await page.waitForTimeout(140);await page.keyboard.up(key);}
async function point(x,y){
 for(let attempt=0;attempt<5;attempt++){
  const p=await page.evaluate(p=>window.__XIAN_NI__.screenPoint(p.x,p.y),{x,y});
  if(p.x>=60&&p.x<=1370&&p.y>=155&&p.y<=735)return p;
  const dx=Math.max(-500,Math.min(500,720-p.x)),dy=Math.max(-300,Math.min(300,440-p.y));
  await page.keyboard.down('Shift');await page.mouse.move(720,440);await page.mouse.down();await page.mouse.move(720+dx,440+dy,{steps:8});await page.mouse.up();await page.keyboard.up('Shift');await page.waitForTimeout(160);
  log('camera-pan',{dx,dy});
 }
 throw Error(`World target ${x},${y} could not be framed inside the usable viewport`);
}
async function click(x,y){const p=await point(x,y);await page.mouse.click(p.x,p.y);}
async function dismissEnding(){
 const button=page.getByRole('button',{name:'在驿中再坐一会儿',exact:true});
 if(await button.isVisible()) {log('close-first-chapter-ending');await button.click();}
}
async function resume(){
 await dismissEnding();
 const s=await state();
 if(s.defeated)throw Error('Unexpected defeat; this run must complete without fixture rollback');
 if(s.dialogue){
  for(let i=0;i<12&&!(await state()).dialogue?.choices.some(c=>c.id==='leave');i++)await page.locator('[data-ui="choice:more"]').click();
  if((await state()).dialogue)await page.locator('[data-ui="choice:leave"]').click();
 }
 if((await state()).paused)await page.locator('.action-dock [data-ui="pause"]').click();
 await wait(()=>!window.__XIAN_NI__.inspect().paused);
}
async function pause(){if(!(await state()).paused)await page.locator('.action-dock [data-ui="pause"]').click();}
async function object(id){const s=await state(),e=s.worlds[s.scene].find(e=>e.id===id);assert.ok(e,`Missing ${s.scene}/${id}`);return e;}
async function walk(x,y){
 await resume();log('walk',{x,y});await click(x,y);
 await wait(({x,y})=>{const s=window.__XIAN_NI__.inspect();return Math.hypot(s.player.x-x,s.player.y-y)<18&&s.player.path.length===0;},{x,y},60000);
 assert.equal((await state()).defeated,false);
}
async function interact(id){
 await resume();const e=await object(id),scene=(await state()).scene;
 log('interact',{scene,id,x:e.x,y:e.y});await click(e.x,e.y);
 await wait(({id,scene})=>{const s=window.__XIAN_NI__.inspect();if(s.scene!==scene||s.dialogue)return true;const e=s.worlds[s.scene].find(e=>e.id===id);return e&&Math.hypot(s.player.x-e.x,s.player.y-e.y)<100&&s.player.path.length===0;},{id,scene},60000);
 await page.waitForTimeout(180);
}
async function choose(id){
 for(let i=0;i<12&&!(await state()).dialogue?.choices.some(c=>c.id===id);i++){
  assert.ok((await state()).dialogue?.choices.some(c=>c.id==='more'),`Choice ${id} is unavailable`);
  await page.locator('[data-ui="choice:more"]').click();
 }
 assert.ok((await state()).dialogue?.choices.some(c=>c.id===id&&!c.disabled),`Choice ${id} is disabled or absent`);
 log('choose',id);await page.locator(`[data-ui="choice:${id}"]`).click();await resume();
}
async function exit(id,scene){await interact(id);await wait(scene=>window.__XIAN_NI__.inspect().scene===scene,scene,10000);log('scene',scene);}
async function pull(id,x,y){
 await resume();const e=await object(id);log('pull',{id,from:{x:e.x,y:e.y},to:{x,y}});
 await page.locator('[data-ui="spell:pull"]').click();await click(e.x,e.y);
 await wait(id=>window.__XIAN_NI__.inspect().player.pullId===id,id);
 await click(x,y);
 await wait(({id,x,y})=>{const s=window.__XIAN_NI__.inspect(),e=s.worlds[s.scene].find(e=>e.id===id);return e&&Math.hypot(e.x-x,e.y-y)<3;},{id,x,y});
 await page.locator('[data-ui="release"]').click();await wait(()=>window.__XIAN_NI__.inspect().player.pullId===null);
}
async function capture(id){
 await pause();await page.mouse.move(1430,890);await page.waitForTimeout(120);
 const visual=`qa/evidence/life-${id}.png`;await page.screenshot({path:visual});
 evidence.observations[id]={state:brief(await state()),visual};await persist();log('capture',id);
}
async function toWorkshop(){
 if((await state()).scene==='home')await exit('to_creek','creek');
 assert.equal((await state()).scene,'creek');await exit('to_workshop','workshop');
 await walk(320,220);await walk(1450,220);
}
async function homeFromWorkshop(){await walk(1450,220);await walk(320,220);await exit('to_creek','creek');await exit('to_home','home');}
async function importFile(buffer,name){
 await page.locator('[data-ui="settings"]').click();
 await page.locator('#import-save').setInputFiles({name,mimeType:'application/json',buffer});
 await page.waitForTimeout(500);await dismissEnding();
}
async function exportSave(name){
 await page.locator('[data-ui="settings"]').click();
 const downloadPromise=page.waitForEvent('download');
 await page.locator('[data-ui="export"]').click();
 const download=await downloadPromise;await download.saveAs(`qa/evidence/${name}`);
 await page.locator('[data-ui="close"]').click().catch(()=>{});
 log('export-save',{path:`qa/evidence/${name}`,life:(await state()).life});
}

try{
 const fixtureBytes=await readFile(fixturePath),legacy=JSON.parse(fixtureBytes.toString('utf8'));
 assert.equal(legacy.ended,true);assert.equal(legacy.flags.route,'ridge');
 evidence.fixture={path:fixturePath,sha256:createHash('sha256').update(fixtureBytes).digest('hex'),origin:'Real 0.2.2 ridge-ending UI export'};
 browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});page.on('pageerror',e=>evidence.errors.push(e.message));
 await page.goto(gameUrl);await page.getByRole('button',{name:'入 山',exact:true}).click();await page.getByRole('button',{name:'去回石驿',exact:true}).click();
 await importFile(fixtureBytes,'return-ridge-v0.2.2.json');await resume();
 await interact('workbench');await choose('life:repair:accept');await toWorkshop();
 // Relearn through the original physical trial: the exported ending uses long.
 await interact('tao_work');await choose('hold');await walk(1390,610);
 await page.locator('[data-ui="spell:pull"]').click();const trial=await object('trial');await click(trial.x,trial.y);
 await wait(()=>window.__XIAN_NI__.inspect().player.pullId==='trial');await click(1440,580);await page.waitForTimeout(650);
 await page.locator('[data-ui="hold"]').click();await wait(()=>window.__XIAN_NI__.inspect().ringStyle==='hold');
 await page.locator('[data-ui="release"]').click();log('physical-hold-training');await interact('rest_workshop');assert.equal((await state()).player.mana,6);
 await interact('life_hearth');await walk(1410,460);const hearth=await object('life_hearth');
 await page.locator('[data-ui="spell:flame"]').click();await click(hearth.x,hearth.y);await wait(()=>window.__XIAN_NI__.inspect().life.repair.softened);
 await walk(1510,640);const jaw=await object('life_jaw');
 await page.locator('[data-ui="spell:pull"]').click();await click(jaw.x,jaw.y);await wait(()=>window.__XIAN_NI__.inspect().player.pullId==='life_jaw');await click(1420,570);
 await wait(()=>Math.abs(window.__XIAN_NI__.inspect().worlds.workshop.find(e=>e.id==='life_jaw').x-1420)<3);
 await page.locator('[data-ui="hold"]').click();await wait(()=>window.__XIAN_NI__.inspect().player.hold>0);await pause();const held=(await state()).player.hold;
 await page.waitForTimeout(1100);assert.equal((await state()).player.hold,held);evidence.observations.pause={held,after:(await state()).player.hold,wallMs:1100};
 await exportSave('life-hold-paused-input.json');const heldBytes=await readFile('qa/evidence/life-hold-paused-input.json');await importFile(heldBytes,'life-hold-paused-input.json');assert.equal((await state()).player.hold,held);assert.equal((await state()).player.pullId,'life_jaw');assert.equal((await state()).player.pullPoint,null);evidence.observations.heldRoundtrip={export:'qa/evidence/life-hold-paused-input.json',hold:held};
 await resume();await interact('life_press');await wait(()=>window.__XIAN_NI__.inspect().life.repair.latched);
 await interact('life_press');await wait(()=>window.__XIAN_NI__.inspect().life.repair.stage==='ready');
 const done=await state();assert.equal(done.life.repair.method,'hold');assert.equal(done.life.repair.stopSet,false);await capture('hold-repair');
 assert.deepEqual(evidence.errors,[]);evidence.status='PASS';await persist();console.log('LIFE HOLD PASS');
}catch(error){evidence.status='FAIL';evidence.failure=String(error);console.error(error);if(page){evidence.failureState=brief(await state());await page.screenshot({path:'qa/evidence/life-hold-failure.png'});}await persist();process.exitCode=1;}finally{await browser?.close();}

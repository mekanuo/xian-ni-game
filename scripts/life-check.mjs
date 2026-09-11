import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

// Only UI inputs change the game. inspect/screenPoint are read-only evidence.
// The legacy fixture was exported after a real 0.2.2 main-route playthrough.
const gameUrl=process.env.GAME_URL||'http://127.0.0.1:4191/';
const fixturePath=process.env.LIFE_FIXTURE||'qa/fixtures/return-main-v0.2.2.json';
const output='qa/evidence/life-check.json';
const evidence={schemaVersion:1,status:'NOT_RUN',runId:'life-mechanical-stop-return',startedAt:new Date().toISOString(),environment:{url:gameUrl,platform:process.platform,viewport:{width:1440,height:900,deviceScaleFactor:1},limitation:'Linux Chrome desktop; no physical Mac, mobile or Safari claim.'},inputTrace:[],observations:{},errors:[]};
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
 let fixtureBytes,fixtureSource='working-tree';
 try{fixtureBytes=await readFile(fixturePath);}catch(error){
  if(process.env.LIFE_FIXTURE||error.code!=='ENOENT')throw error;
  // Sparse checkout may omit the fixture. Read the tracked bytes unchanged.
  const result=await promisify(execFile)('git',['show',`HEAD:${fixturePath}`],{encoding:'buffer',maxBuffer:2_500_000});
  fixtureBytes=result.stdout;fixtureSource='tracked HEAD (sparse-checkout fallback)';
 }
 const legacy=JSON.parse(fixtureBytes.toString('utf8'));
 assert.equal(legacy.scene,'home');assert.equal(legacy.ended,true);assert.equal(legacy.flags.route,'main');assert.equal(legacy.ringStyle,'long');
 evidence.fixture={path:fixturePath,source:fixtureSource,sha256:createHash('sha256').update(fixtureBytes).digest('hex'),origin:'Real 0.2.2 UI export after main-route return',lifePresent:Boolean(legacy.life)};
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
 evidence.environment.browser=await browser.version();page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
 page.on('pageerror',e=>evidence.errors.push(e.message));
 await page.goto(gameUrl);await page.getByRole('button',{name:'入 山',exact:true}).click();await page.getByRole('button',{name:'去回石驿',exact:true}).click();
 await wait(()=>window.__XIAN_NI__?.inspect().scene==='home');
 log('new-profile-for-import-ui');await importFile(fixtureBytes,'return-main-v0.2.2.json');
 await wait(()=>window.__XIAN_NI__.inspect().flags.endingWish==='travel');
 const loaded=await state();assert.equal(loaded.contentVersion,6);assert.equal(loaded.life.repair.stage,'unaccepted');assert.equal(loaded.life.harvest.stage,'unaccepted');assert.equal(loaded.life.clamp,'unowned');assert.equal(loaded.life.sachets,0);
 assert.equal(JSON.parse(loaded.checkpoint).contentVersion,6);evidence.observations.migration={state:brief(loaded),checkpointContentVersion:JSON.parse(loaded.checkpoint).contentVersion};log('legacy-import',brief(loaded));

 await interact('workbench');await choose('life:repair:accept');
 await interact('herb_rack');await choose('life:harvest:accept');
 assert.equal((await state()).life.repair.stage,'active');assert.equal((await state()).life.harvest.stage,'active');
 await toWorkshop();await interact('life_hearth');assert.equal((await object('life_hearth')).state,'loaded');
 await walk(1410,460);const hearth=await object('life_hearth');log('fire-loaded-hearth',{x:hearth.x,y:hearth.y});
 await page.locator('[data-ui="spell:flame"]').click();await click(hearth.x,hearth.y);await wait(()=>window.__XIAN_NI__.inspect().life.repair.softened===true);
 await exportSave('life-repair-ready-input.json');
 await interact('life_press');await choose('life:repair:stop');assert.equal((await state()).life.repair.stopSet,true);
 await pull('life_jaw',1420,570);assert.equal((await state()).life.repair.latched,false);
 await interact('life_press');await wait(()=>window.__XIAN_NI__.inspect().life.repair.latched===true);assert.equal((await state()).life.repair.tested,false);
 await interact('life_press');await wait(()=>window.__XIAN_NI__.inspect().life.repair.stage==='ready');
 assert.equal((await state()).life.repair.method,'stop');await capture('repair-tested');
 await homeFromWorkshop();await interact('workbench');await choose('life:repair:deliver');
 assert.equal((await state()).life.repair.stage,'complete');assert.equal((await state()).life.clamp,'bag');
 // Exercise the reward physically at its harmless demonstration fixture.
 await pull('life_practice',1030,500);await interact('life_home_eye');await choose('life:clamp:install');assert.equal((await state()).life.clamp,'home');
 await interact('life_home_eye');await choose('life:clamp:remove');assert.equal((await state()).life.clamp,'bag');
 await capture('repair-reward');

 await exit('to_creek','creek');await walk(320,300);await walk(890,290);await pull('platform_ladder',1010,290);
 assert.equal((await state()).flags.platformLong,true);await walk(1170,230);await interact('return_ladder');assert.equal((await state()).flags.platformReturn,true);
 await interact('life_sun_leaf');await wait(()=>window.__XIAN_NI__.inspect().life.harvest.sun==='bag');await capture('sun-leaf');
 await walk(890,290);await walk(1000,390);await walk(1550,390);await walk(1455,680);
 const shadeBefore=await state();assert.ok(shadeBefore.player.x>=1430,'Player must remain outside the rock-trigger strip on the dry east side');
 await exportSave('life-shade-ready-input.json');
 await interact('life_shade_leaf');await wait(()=>window.__XIAN_NI__.inspect().life.harvest.shade==='bag');
 const shade=await state();assert.equal(shade.player.hp,shadeBefore.player.hp);assert.equal(shade.life.harvest.stage,'ready');await capture('shade-safe-side');
 await walk(1455,760);await exit('to_home','home');
 // Deliberate wrong placement must allow recovery without losing unique leaves.
 await interact('herb_rack');await choose('life:leaf:sun:lower');assert.equal((await state()).life.harvest.sun,'lower');
 await interact('herb_rack');await choose('life:leaf:sun:bag');assert.equal((await state()).life.harvest.sun,'bag');
 await interact('herb_rack');await choose('life:leaf:sun:upper');
 await interact('herb_rack');await choose('life:leaf:shade:lower');
 await interact('herb_rack');await choose('life:harvest:deliver');
 const reward=await state();assert.equal(reward.life.harvest.stage,'complete');assert.equal(reward.life.sachets,2);assert.equal(reward.life.harvest.sun,'upper');assert.equal(reward.life.harvest.shade,'lower');
 await interact('herb_rack');const choices=(await state()).dialogue?.choices||[];assert.ok(!choices.some(c=>c.id==='life:harvest:deliver'));await resume();await capture('both-errands-home');

 await exit('to_creek','creek');await exit('to_workshop','workshop');await walk(420,820);
 // Keyboard steering can approach a live beast; safe pathfinding intentionally
 // refuses destinations inside its threat radius. This is real movement.
 await resume();log('keyboard-approach-live-beast');await page.keyboard.down('d');
 try{await wait(()=>{const s=window.__XIAN_NI__.inspect();return s.worlds.workshop.some(e=>e.type==='beast'&&!['retreated','peaceful'].includes(e.state)&&Math.hypot(e.x-s.player.x,e.y-s.player.y)<130);},undefined,15000);}finally{await page.keyboard.up('d');}
 await press('i');const before=await state();assert.equal(before.paused,true);assert.equal(before.life.sachets,2);
 const targets=before.worlds.workshop.filter(e=>e.type==='beast'&&!['retreated','peaceful'].includes(e.state)&&Math.hypot(e.x-before.player.x,e.y-before.player.y)<150).map(e=>({id:e.id,hp:e.hp,distance:Math.hypot(e.x-before.player.x,e.y-before.player.y)}));assert.ok(targets.length>0);
 log('use-sachet-near-live-beast',{player:before.player,targets});await page.locator('[data-ui="use-sachet"]').click();
 await wait(()=>window.__XIAN_NI__.inspect().life.sachets===1&&window.__XIAN_NI__.inspect().life.scent!==null);
 await wait(targets=>{const s=window.__XIAN_NI__.inspect(),bag=s.worlds.workshop.find(e=>e.id==='life_scent');return s.life.scent&&targets.some(t=>{const e=s.worlds.workshop.find(e=>e.id===t.id);return Math.hypot(e.x-bag.x,e.y-bag.y)>t.distance+12;});},targets,10000);
 await pause();const repelled=await state();for(const t of targets)assert.equal(repelled.worlds.workshop.find(e=>e.id===t.id).hp,t.hp,'Scent must not damage a beast');
 evidence.observations.sachetMovement={before:brief(before),after:brief(repelled),targets};
 // A second request while the first remains active must fail without consumption.
 await press('i');await page.locator('[data-ui="use-sachet"]').click();assert.equal((await state()).pending?.type,'use-sachet');
 await resume();assert.equal((await state()).life.sachets,1);await capture('sachet-repels');

 await page.locator('[data-ui="settings"]').click();const downloadPromise=page.waitForEvent('download');await page.locator('[data-ui="export"]').click();
 const download=await downloadPromise;await download.saveAs('qa/evidence/life-current-export.json');
 const currentBytes=await readFile('qa/evidence/life-current-export.json'),saved=JSON.parse(currentBytes.toString('utf8'));log('export-current-life',{life:saved.life,scene:saved.scene});
 await page.locator('#import-save').setInputFiles({name:'life-current-export.json',mimeType:'application/json',buffer:currentBytes});
 await wait(()=>window.__XIAN_NI__.inspect().life.repair.stage==='complete'&&window.__XIAN_NI__.inspect().life.harvest.stage==='complete');await page.waitForTimeout(250);
 const restored=await state();assert.deepEqual(restored.life,saved.life);assert.equal(restored.life.clamp,'bag');assert.equal(restored.life.sachets,1);
 evidence.observations.currentSaveRoundtrip={export:'qa/evidence/life-current-export.json',lifeBefore:saved.life,lifeAfter:restored.life,scene:restored.scene};
 assert.deepEqual(evidence.errors,[]);evidence.status='PASS';evidence.completedAt=new Date().toISOString();
 await Promise.all(['qa/evidence/life-failure.png','qa/evidence/life-failure.json'].map(path=>rm(path,{force:true})));await persist();console.log('LIFE MECHANICAL ROUTE COMPLETE');
}catch(error){
 evidence.status='FAIL';evidence.failure=String(error);console.error(error);
 if(page){const s=await state().catch(()=>null);evidence.failureState=s?brief(s):null;await page.screenshot({path:'qa/evidence/life-failure.png'}).catch(()=>{});await writeFile('qa/evidence/life-failure.json',JSON.stringify({error:String(error),state:s,inputTrace:evidence.inputTrace,errors:evidence.errors},null,2));}
 await persist();process.exitCode=1;
}finally{if(browser)await browser.close();}

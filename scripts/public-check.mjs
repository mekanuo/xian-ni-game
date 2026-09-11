import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='https://mekanuo.github.io/xian-ni-game/';
const evidence={checkedAt:new Date().toISOString(),url:base,release:null,resources:[],browser:null,input:[],errors:[]};
const releaseResponse=await fetch(new URL('release.json',base));assert.equal(releaseResponse.status,200);evidence.release=await releaseResponse.json();
assert.equal(evidence.release.version,JSON.parse(await readFile('package.json','utf8')).version,'Public release must be the current version');
async function files(dir){const list=[];for(const e of await readdir(dir,{withFileTypes:true})){const path=`${dir}/${e.name}`;if(e.isDirectory())list.push(...await files(path));else list.push(path);}return list;}
const hash=b=>createHash('sha256').update(b).digest('hex');
evidence.resources=await Promise.all((await files('dist')).map(async path=>{const relative=path.slice(5),response=await fetch(new URL(relative,base));assert.equal(response.status,200,relative);const bytes=Buffer.from(await response.arrayBuffer()),local=await readFile(path);assert.equal(hash(bytes),hash(local),`${relative} must match the tested production build`);return {path:relative,status:response.status,bytes:bytes.length,sha256:hash(bytes)};}));
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
try{
const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>evidence.errors.push(e.message));evidence.browser=await browser.version();
await page.goto(base);await page.getByRole('button',{name:'入 山',exact:true}).click();await page.getByRole('button',{name:'去回石驿',exact:true}).click();
await page.waitForFunction(()=>window.__XIAN_NI__.audio().musicRms>.002);
evidence.audio=await page.evaluate(()=>window.__XIAN_NI__.audio());
const state=()=>page.evaluate(()=>{const s=window.__XIAN_NI__.inspect();return {scene:s.scene,player:s.player,flags:s.flags,ended:s.ended};});
evidence.input.push({action:'create profile on public site',state:await state()});
await page.locator('[data-ui="spell:pull"]').click();let point=await page.evaluate(()=>window.__XIAN_NI__.screenPoint(430,760));await page.mouse.click(point.x,point.y);await page.waitForFunction(()=>window.__XIAN_NI__.inspect().player.pullId==='lamp');
point=await page.evaluate(()=>window.__XIAN_NI__.screenPoint(560,665));await page.mouse.click(point.x,point.y);await page.waitForFunction(()=>{const s=window.__XIAN_NI__.inspect(),e=s.worlds.home.find(e=>e.id==='lamp');return Math.hypot(e.x-560,e.y-665)<10;});await page.locator('[data-ui="release"]').click();assert.equal((await state()).flags.lampFixed,true);
evidence.input.push({action:'click pull, lamp, stand and release',state:await state()});
const before=(await state()).player.x;await page.keyboard.down('d');await page.waitForTimeout(750);await page.keyboard.up('d');assert.ok((await state()).player.x>before+20);
evidence.input.push({action:'keyboard D movement',state:await state()});
await page.locator('[data-ui="observe"]').click();assert.equal(await page.locator('[data-ui="observe"]').getAttribute('aria-expanded'),'true');evidence.input.push({action:'open current encounter observation',text:await page.locator('#observation-content').textContent()});
await page.screenshot({path:'qa/evidence/public-start.png'});evidence.visual='qa/evidence/public-start.png';assert.equal(evidence.errors.length,0);
// Verify the new public continuation through the same real old-save import UI.
await page.locator('[data-ui="settings"]').click();
await page.locator('#import-save').setInputFiles('qa/fixtures/return-main-v0.2.2.json');
await page.waitForFunction(()=>window.__XIAN_NI__.inspect().ended&&window.__XIAN_NI__.inspect().contentVersion===3);
const oldEnding=page.getByRole('button',{name:'在驿中再坐一会儿',exact:true});if(await oldEnding.isVisible())await oldEnding.click();
if(await page.evaluate(()=>window.__XIAN_NI__.inspect().paused))await page.locator('.action-dock [data-ui="pause"]').click();
point=await page.evaluate(()=>window.__XIAN_NI__.screenPoint(1060,430));await page.mouse.click(point.x,point.y);
await page.waitForFunction(()=>window.__XIAN_NI__.inspect().dialogue!==null,null,{timeout:30000});
for(let i=0;i<12&&!await page.evaluate(()=>window.__XIAN_NI__.inspect().dialogue?.choices.some(c=>c.id==='life:repair:accept'));i++)await page.locator('[data-ui="choice:more"]').click();
await page.locator('[data-ui="choice:life:repair:accept"]').click();
await page.waitForFunction(()=>window.__XIAN_NI__.inspect().life.repair.stage==='active');
evidence.continuation=await page.evaluate(()=>{const s=window.__XIAN_NI__.inspect();return {contentVersion:s.contentVersion,checkpointVersion:JSON.parse(s.checkpoint).contentVersion,life:s.life,fixture:'Real 0.2.2 main ending imported via settings',input:'Click workbench, accept repair'};});
await page.screenshot({path:'qa/evidence/public-life.png'});
// Smoke-test the published fifth scene from an unchanged real 0.3.0 export.
// Screen conversion observes the camera; the only mutations remain real UI input.
const adventureInput=[];
const fullState=()=>page.evaluate(()=>window.__XIAN_NI__.inspect());
async function adventureResume(){
 const ending=page.getByRole('button',{name:'在驿中再坐一会儿',exact:true});if(await ending.isVisible())await ending.click();
 const s=await fullState();assert.equal(s.defeated,false);
 if(s.paused&&!s.dialogue)await page.locator('.action-dock [data-ui="pause"]').click();
}
async function adventurePoint(x,y){
 for(let attempt=0;attempt<8;attempt++){
  const p=await page.evaluate(({x,y})=>window.__XIAN_NI__.screenPoint(x,y),{x,y});
  if(p.x>=70&&p.x<=1370&&p.y>=170&&p.y<=730)return p;
  const dx=Math.max(-500,Math.min(500,720-p.x)),dy=Math.max(-280,Math.min(280,440-p.y));
  await page.keyboard.down('Shift');
  try{await page.mouse.move(720,440);await page.mouse.down();await page.mouse.move(720+dx,440+dy,{steps:8});await page.mouse.up();}finally{await page.keyboard.up('Shift');}
  await page.waitForTimeout(150);adventureInput.push({action:'camera Shift-drag',dx,dy});
 }
 throw Error(`Public adventure target ${x},${y} could not be framed`);
}
async function adventureInteract(id){
 await adventureResume();const s=await fullState(),e=s.worlds[s.scene].find(e=>e.id===id);assert.ok(e,`Missing public entity ${id}`);
 const p=await adventurePoint(e.x,e.y);await page.mouse.click(p.x,p.y);adventureInput.push({action:'click world entity',id,world:{x:e.x,y:e.y},screen:p});
 await page.waitForFunction(()=>window.__XIAN_NI__.inspect().dialogue!==null,null,{timeout:60000});
}
async function adventureChoose(id){
 for(let attempt=0;attempt<12&&!(await fullState()).dialogue?.choices.some(c=>c.id===id);attempt++){
  assert.ok((await fullState()).dialogue?.choices.some(c=>c.id==='more'),`Missing public choice ${id}`);await page.locator('[data-ui="choice:more"]').click();
 }
 assert.ok((await fullState()).dialogue?.choices.some(c=>c.id===id&&!c.disabled),`Public choice ${id} must be enabled`);
 await page.locator(`[data-ui="choice:${id}"]`).click();adventureInput.push({action:'click dialogue choice',id});await adventureResume();
}
const adventureFixture='qa/fixtures/return-main-v0.3.0.json';
const adventureFixtureBytes=await readFile(adventureFixture);
await page.locator('[data-ui="settings"]').click();await page.locator('#import-save').setInputFiles(adventureFixture);
await page.waitForFunction(()=>{const s=window.__XIAN_NI__.inspect();return s.contentVersion===3&&s.scene==='home'&&s.ended&&s.canal.stage==='unaccepted'&&s.life.repair.stage==='unaccepted';});
adventureInput.push({action:'settings import unchanged real 0.3.0 main-route fixture'});await adventureResume();
await adventureInteract('table');await adventureChoose('canal:accept');assert.equal((await fullState()).canal.stage,'active');
await adventureInteract('to_creek');await adventureChoose('canal:depart:canal');
await page.waitForFunction(()=>{const s=window.__XIAN_NI__.inspect();return s.scene==='canal'&&s.canal.stage==='active';});
// The published resource check above verifies these actual HTTP bytes against dist.
const adventureResources=['art/canal-ground.png','art/canal-architecture.png','art/canal-props.png'].map(path=>{
 const resource=evidence.resources.find(r=>r.path===path);assert.ok(resource,`New public art missing: ${path}`);assert.equal(resource.status,200);assert.ok(resource.bytes>0);return resource;
});
await page.keyboard.press('c');await page.waitForTimeout(350);
await page.locator('.action-dock [data-ui="pause"]').click();assert.equal((await fullState()).paused,true);
const adventureState=await fullState();assert.ok(adventureState.worlds.canal.some(e=>e.id==='canal_keeper'));assert.ok(adventureState.worlds.canal.some(e=>e.id==='canal_screen'));assert.equal(evidence.errors.length,0);
evidence.adventure={fixture:adventureFixture,fixtureSha256:hash(adventureFixtureBytes),input:adventureInput,scene:adventureState.scene,contentVersion:adventureState.contentVersion,stage:adventureState.canal.stage,inspected:adventureState.canal.inspected,cleared:adventureState.canal.cleared,player:adventureState.player,resources:adventureResources,visual:'qa/evidence/public-canal.png',scope:'Published old-save import, accepted invitation and physical fifth-scene entry; full two-method playthrough is verified separately.'};
await page.screenshot({path:evidence.adventure.visual});
await page.close();
const phoneContext=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
const phone=await phoneContext.newPage();phone.on('pageerror',e=>evidence.errors.push(e.message));
await phone.goto(base);await phone.getByRole('button',{name:'入 山',exact:true}).tap();await phone.getByRole('button',{name:'去回石驿',exact:true}).tap();
await phone.waitForFunction(()=>window.__XIAN_NI__.audio().musicRms>.002);
const phoneDimensions=await phone.evaluate(()=>{const c=document.querySelector('canvas');return {pixels:[c.width,c.height],css:[c.clientWidth,c.clientHeight],dpr:devicePixelRatio};});
assert.deepEqual(phoneDimensions.pixels,[1170,2532]);
await phone.locator('[data-ui="spell:ward"]').tap();
const wardPoint=await phone.evaluate(()=>{const p=window.__XIAN_NI__.inspect().player;return window.__XIAN_NI__.screenPoint(p.x+85,p.y-10);});
await phone.touchscreen.tap(wardPoint.x,wardPoint.y);await phone.waitForFunction(()=>window.__XIAN_NI__.inspect().player.ward>0&&window.__XIAN_NI__.audio().effectCounts.ward>=1);
evidence.mobile={device:'Chrome touch / DPR3 emulation, not a physical phone',dimensions:phoneDimensions,audio:await phone.evaluate(()=>window.__XIAN_NI__.audio()),input:'tap create, select ward, tap cast direction',visual:'qa/evidence/public-mobile.png'};
await phone.locator('[data-ui="observe"]').tap();assert.equal(await phone.locator('[data-ui="observe"]').getAttribute('aria-expanded'),'true');evidence.mobile.observation=await phone.locator('#observation-content').textContent();
await phone.screenshot({path:evidence.mobile.visual});await phoneContext.close();assert.equal(evidence.errors.length,0);
await writeFile('qa/evidence/publication.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({url:base,sourceCommit:evidence.release.sourceCommit,resources:evidence.resources.length,browser:evidence.browser,input:'create, physical lamp repair, keyboard movement',errors:evidence.errors}));
}finally{await browser.close();}

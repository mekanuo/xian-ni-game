import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const fixedBuild=process.env.DISCOVERY_BUILD||'/home/zhangjingzhou/.cache/xian-ni-qa/outbound-discovery-r2';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const url=process.env.GAME_URL||'http://127.0.0.1:4205/outbound-discovery.html';
const stamp=new Date().toISOString().replaceAll(':','-').replaceAll('.','-'),dir=`qa/whitebox/outbound-discovery/browser-${stamp}`;
const report={status:'NOT_RUN',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),url,startedAt:new Date().toISOString(),devices:[],errors:[],limitations:['Independent synthetic initial state, not production save or real chapter travel.','Linux Chrome with touch/DPR emulation, not physical devices.','Real spatial screenshots and ambient signal still require visual/listening judgment; model visits do not prove an enjoyable discovery.','Sitting artwork is not implemented; only actual relocation and facing are represented.','Long routes use real overview clicks; a normal-view short move is checked, not unaided navigation or continuously witnessed NPC relocation.']};
await mkdir(dir,{recursive:true});await writeFile('qa/whitebox/outbound-discovery/browser-check.json',JSON.stringify(report,null,2));let browser,page;
try{
 const html=await readFile(resolve(fixedBuild,'outbound-discovery.html'),'utf8');
 const paths=['outbound-discovery.html',...Array.from(html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+)"/g),m=>m[1]),'art/characters.png','art/enemies.png','art/water-surface.png'];
 report.build={directory:fixedBuild,resources:[],sourceHashes:{},provenance:'Fixed r2 build prepared before browser review, unchanged runtime since fb8dd79; resource matching identifies served bytes, not a reproducible-build proof.'};
 for(const path of paths){const local=await readFile(resolve(fixedBuild,path));const response=await fetch(new URL(path,url));assert.equal(response.status,200);const actual=Buffer.from(await response.arrayBuffer());assert.equal(sha(actual),sha(local),`Fixed build resource: ${path}`);report.build.resources.push({path,sha256:sha(actual)});}
 for(const path of ['src/whitebox/outbound-discovery-main.ts','src/whitebox/outbound-discovery-model.ts','src/whitebox/outbound-discovery.css','outbound-discovery.html','scripts/outbound-discovery-check.mjs'])report.build.sourceHashes[path]=sha(await readFile(path));
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});report.browser=await browser.version();
 for(const mobile of [false,true]){
  const item={id:mobile?'phone':'desktop',inputs:[],captures:[]};report.devices.push(item);
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?3:2,isMobile:mobile,hasTouch:mobile});page=await context.newPage();page.on('pageerror',e=>report.errors.push({device:item.id,message:e.message}));
  const state=()=>page.evaluate(()=>window.__DISCOVERY__.inspect());
  const wait=(fn,arg,timeout=120000)=>page.waitForFunction(fn,arg,{timeout});
  const press=async id=>{const button=page.locator(`#${id}`);if(mobile)await button.tap();else await button.click();item.inputs.push({action:'button',id});};
  const render=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  async function map(value){if(await page.evaluate(()=>window.__DISCOVERY__.view().overview)!==value)await press('map');await render();}
  async function walk(x,y,overview=true){await map(overview);const p=await page.evaluate(({x,y})=>window.__DISCOVERY__.screenPoint(x,y),{x,y});assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,p),'CANVAS');if(mobile)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);item.inputs.push({action:'world-input',intended:{x,y},screen:p});await wait(({x,y})=>{const r=window.__DISCOVERY__.inspect();return Math.hypot(r.s.player.x-x,r.s.player.y-y)<15&&r.s.player.path.length===0;},{x,y});await map(false);}
  async function visible(point,label,bodyHeight=0){const view=await page.evaluate(()=>window.__DISCOVERY__.view()),u=view.usable;const p=await page.evaluate(p=>window.__DISCOVERY__.screenPoint(p.x,p.y),point);assert.ok(p.x>u.x&&p.x<u.x+u.width&&p.y-bodyHeight*view.zoom>u.y&&p.y<u.y+u.height,`${label} inside actual camera`);assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.tagName,p),'CANVAS',`${label} not covered by DOM`);return {label,point,screen:p,view};}
  async function ambience(){await wait(()=>{const a=window.__DISCOVERY__.audio();return a.state==='running'&&a.error===null&&a.rms>.0001;});return page.evaluate(()=>window.__DISCOVERY__.audio());}
  async function capture(name){await press('pause');assert.equal((await state()).s.paused,true);const before=await state();await page.waitForTimeout(400);assert.deepEqual(await state(),before);const path=`${dir}/${item.id}-${name}.png`;await page.screenshot({path});const audio=await ambience();item.captures.push({name,path,state:before,view:await page.evaluate(()=>window.__DISCOVERY__.view()),audio});
   // Hide only descriptive DOM text for the discovery comparison; no game mutation.
   const style=await page.addStyleTag({content:'#topbar,#notice,#conversation{visibility:hidden!important}'});await page.screenshot({path:`${dir}/${item.id}-${name}-without-description.png`});await style.evaluate(e=>e.remove());await press('pause');}
  await page.goto(url);await wait(()=>!!window.__DISCOVERY__);assert.equal((await state()).s.player.mana,6);
  if(!mobile){const x=(await state()).s.player.x;await page.keyboard.down('d');try{await wait(x=>window.__DISCOVERY__.inspect().s.player.x>x+35,x);}finally{await page.keyboard.up('d');}item.inputs.push({action:'actual-keyboard-D'});}
  const initial=(await state()).s.player;await walk(initial.x+55,initial.y,false);item.normalViewInput=await state();
  await walk(1550,500);await wait(()=>window.__DISCOVERY__.inspect().visits.upper);await wait(()=>window.__DISCOVERY__.audio().rms>0.0001);await capture('upper');
  const upperAudio=await ambience();item.upperVisibility=[await visible({x:1920,y:500},'upper river'),await visible((await state()).s.player,'upper player',82)];
  await walk(1530,1190);await wait(()=>window.__DISCOVERY__.inspect().visits.lower);await capture('lower');const lowerAudio=await ambience();item.lowerVisibility=[await visible({x:1860,y:1180},'lower whirlpool'),await visible({x:1770,y:1180},'lower cavity'),await visible((await state()).s.player,'lower player',82)];assert.ok(lowerAudio.water>upperAudio.water+.35);assert.ok(upperAudio.wind>lowerAudio.wind+.35);assert.equal((await state()).met,false);
  await walk(250,1300);assert.equal((await state()).returned,true);item.solo=await state();
  await press('restart');assert.deepEqual((await state()).visits,{upper:false,lower:false});assert.equal((await state()).returned,false);
  await walk(670,1100);await wait(()=>window.__DISCOVERY__.inspect().npcPhase==='quiet');let npc=(await state()).npc;await walk(npc.x-55,npc.y);await press('talk');assert.equal((await state()).met,true);assert.equal(await page.locator('#suggest').isVisible(),false);const conversation=await state();await page.waitForTimeout(400);assert.deepEqual(await state(),conversation);await press('leave');
  await walk(1550,500);await wait(()=>window.__DISCOVERY__.inspect().visits.upper);npc=(await state()).npc;await walk(npc.x-55,npc.y);await press('talk');await press('suggest');assert.equal((await state()).npcPhase,'walking-upper');assert.ok(Math.hypot((await state()).npc.x-1550,(await state()).npc.y-500)>100);await walk(1550,500);await wait(()=>window.__DISCOVERY__.inspect().npcPhase==='upper');await walk(1550,600,false);item.travelerVisibility=[await visible((await state()).npc,'arrived traveler',82),await visible((await state()).s.player,'nearby player',82)];assert.ok(Math.hypot((await state()).s.player.x-(await state()).npc.x,(await state()).s.player.y-(await state()).npc.y)>85);await capture('traveler-arrived');item.shared=await state();await press('restart');assert.equal((await state()).npcPhase,'waiting');assert.equal((await state()).met,false);item.restart=await state();await context.close();page=null;
 }
 assert.deepEqual(report.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=String(error);process.exitCode=1;console.error(error);if(page){report.failureState=await page.evaluate(()=>window.__DISCOVERY__?.inspect()).catch(()=>null);await page.screenshot({path:`${dir}/failure.png`}).catch(()=>{});}}
finally{await browser?.close();await writeFile(`${dir}/report.json`,JSON.stringify(report,null,2));await writeFile('qa/whitebox/outbound-discovery/browser-check.json',JSON.stringify(report,null,2));}
console.log(JSON.stringify({status:report.status,directory:dir,failure:report.failure}));

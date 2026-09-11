import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const dir=`qa/whitebox/spar-reposition-${new Date().toISOString().replaceAll(/[:.]/g,'-')}`;await mkdir(dir,{recursive:true});
const report={status:'RUNNING',url:process.env.GAME_URL||'http://127.0.0.1:4195/spar-whitebox.html',cases:[],limitations:['Synthetic start, actual UI-only input.','Linux Chrome viewport/DPR/touch emulation, not physical hardware.','No production save or story claim.']};let browser;
try{
 browser=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});report.browser=browser.version();
 for(const device of (process.env.SPAR_DEVICE?[process.env.SPAR_DEVICE]:['desktop','phone'])){
  const phone=device==='phone',context=await browser.newContext({viewport:phone?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:phone?3:2,hasTouch:phone,isMobile:phone});const page=await context.newPage();
  const c={device,status:'RUNNING',input:[]};report.cases.push(c);await page.goto(report.url);await page.waitForFunction(()=>window.__SPAR__);
  const inspect=()=>page.evaluate(()=>window.__SPAR__.inspect());
  const tap=async(point)=>{if(phone)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);};
  const click=async(selector)=>{const b=await page.locator(selector).boundingBox();assert(b);await tap({x:b.x+b.width/2,y:b.y+b.height/2});c.input.push({action:phone?'touch-control':'mouse-control',selector});};
  const ground=async(point)=>{const q=await page.evaluate(p=>window.__SPAR__.screenPoint(p.x,p.y),point);await tap(q);c.input.push({action:phone?'touch-ground':'mouse-ground',point,screen:q});};
  const wait=(fn,arg)=>page.waitForFunction(fn,arg,{timeout:45000,polling:'raf'});
  await page.selectOption('#mana','6');await page.selectOption('#stance','right');await click('#restart');await click('#round');await ground({x:900,y:940});
  await wait(()=>{const r=window.__SPAR__.inspect();return Math.hypot(r.peer.x-1120,r.peer.y-940)<3&&Math.hypot(r.s.player.x-900,r.s.player.y-940)<3;});
  await click('#round');await click('#ward');await ground({x:1120,y:940});await wait(()=>window.__SPAR__.inspect().phase==='result');
  let r=await inspect();assert.equal(r.outcome,'blocked');assert.equal(r.s.player.mana,5);assert.equal(r.s.player.hp,4);c.first={peer:r.peer,player:r.s.player,time:r.s.time};
  await page.screenshot({path:`${dir}/${device}-first-result.png`});
  const near={x:r.s.player.x+(r.peer.x-r.s.player.x)*.68,y:r.s.player.y+(r.peer.y-r.s.player.y)*.68};await ground(near);
  await wait(()=>{const r=window.__SPAR__.inspect();return !r.s.player.path.length;});await page.selectOption('#stance','left');await click('#round');
  r=await inspect();assert.equal(r.phase,'positioning');assert.equal(r.s.player.mana,5);await ground({x:900,y:940});
  c.walk=await page.evaluate(()=>new Promise((resolve,reject)=>{const frames=[],deadline=performance.now()+45000;function sample(){const r=window.__SPAR__.inspect(),view=window.__SPAR__.view();frames.push({time:r.s.time,phase:r.phase,world:{peer:{x:r.peer.x,y:r.peer.y},player:{x:r.s.player.x,y:r.s.player.y}},...view});if(Math.hypot(r.peer.x-680,r.peer.y-940)<3&&Math.hypot(r.s.player.x-900,r.s.player.y-940)<3)resolve(frames);else if(performance.now()>deadline)reject(Error('Reposition did not complete'));else requestAnimationFrame(sample);}sample();}));
  for(const f of c.walk){const u=f.usable,z=f.zoom;for(const name of ['peer','player']){const p=f[name];assert(p.x-26*z>=u.x&&p.x+26*z<=u.x+u.width&&p.y-82*z>=u.y&&p.y+5*z<=u.y+u.height,`${device}: ${name} clipped while walking between positions`);}}
  c.closest=Math.min(...c.walk.map(f=>Math.hypot(f.world.peer.x-f.world.player.x,f.world.peer.y-f.world.player.y)));assert(c.closest>=40,'NPC must not initiate walking through stationary player');
  await click('#round');await wait(()=>window.__SPAR__.inspect().phase==='result');r=await inspect();assert.equal(r.outcome,'hit');assert.equal(r.s.player.hp,3);assert.equal(r.s.player.mana,5);assert.equal(r.shots,1);assert.equal(r.s.paused,false);
  c.second={peer:r.peer,player:r.s.player,time:r.s.time,outcome:r.outcome,shots:r.shots};await page.screenshot({path:`${dir}/${device}-second-result.png`});c.status='PASS';console.log(`${device} actual second agreement PASS`);await context.close();
 }
 report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack||e);console.error(e);process.exitCode=1;}
finally{await browser?.close();await writeFile(`${dir}/report.json`,JSON.stringify(report,null,2));console.log(`${dir}/report.json ${report.status}`);}

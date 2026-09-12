import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const results=[];
const report={status:'RUNNING',device:'Chrome emulated touch/DPR3, not a physical phone',results};
await mkdir('qa/evidence',{recursive:true});
const snapshot=()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect();return {time:performance.now(),window:[innerWidth,innerHeight],pixels:[c.width,c.height],css:[r.width,r.height],dpr:devicePixelRatio,overflow:document.documentElement.scrollWidth>innerWidth,resizeEvents:window.__rotationEvents||[]};};
let activePage;
try {
 for(const viewport of [{width:390,height:844},{width:844,height:390}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:3,isMobile:true,hasTouch:true});
  const page=await context.newPage();activePage=page;const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:4191/');
  await page.getByRole('button',{name:'入 山',exact:true}).tap();
  await page.getByRole('button',{name:'去回石驿',exact:true}).tap();
  await page.waitForTimeout(400);
  const dimensions=await page.evaluate(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect();return {pixels:[c.width,c.height],css:[r.width,r.height],dpr:devicePixelRatio,overflow:document.documentElement.scrollWidth>innerWidth};});
  assert.ok(dimensions.pixels[0]>=viewport.width*2.9,'Retina phone needs native backing pixels, not a 1x enlarged canvas');
  assert.ok(Math.abs(dimensions.css[0]-viewport.width)<2,'Canvas CSS size must remain viewport width');
  assert.equal(dimensions.overflow,false,'Phone layout must not overflow horizontally');
  const before=await page.evaluate(()=>window.__XIAN_NI__.inspect().player);
  const target=await page.evaluate(p=>window.__XIAN_NI__.screenPoint(p.x,p.y),{x:before.x-85,y:before.y-10});
  await page.touchscreen.tap(target.x,target.y);
  await page.waitForFunction(p=>Math.hypot(window.__XIAN_NI__.inspect().player.x-p.x,window.__XIAN_NI__.inspect().player.y-p.y)>45,before);
  await mkdir('qa/evidence',{recursive:true});
  await page.screenshot({path:`qa/evidence/mobile-${viewport.width}.png`});
  assert.deepEqual(errors,[]);
  results.push({viewport,dimensions,input:'real touch move >45 world units',errors});
  if(viewport.width===390){
    await page.evaluate(()=>{window.__rotationEvents=[];window.addEventListener('resize',()=>{const c=document.querySelector('canvas');window.__rotationEvents.push({time:performance.now(),window:[innerWidth,innerHeight],pixels:[c.width,c.height]});});});
    report.rotation={before:await page.evaluate(snapshot)};
    await page.setViewportSize({width:844,height:390});await page.waitForTimeout(350);
    report.rotation.original350ms=await page.evaluate(snapshot);
    console.log('Rotation original observation',JSON.stringify(report.rotation));
    await page.waitForFunction(()=>{const c=document.querySelector('canvas');return innerWidth===844&&innerHeight===390&&c.width===2532&&c.height===1170&&c.getBoundingClientRect().width===844;},null,{timeout:15000});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    report.rotation.settled=await page.evaluate(snapshot);
    const rotated=await page.evaluate(()=>{const c=document.querySelector('canvas');return [c.width,c.height,c.getBoundingClientRect().width];});
    assert.deepEqual(rotated,[2532,1170,844],'Rotation recalculates canvas backing size and CSS dimensions');
    const old=await page.evaluate(()=>window.__XIAN_NI__.inspect().player);
    const next=await page.evaluate(p=>window.__XIAN_NI__.screenPoint(p.x-55,p.y),old);
    await page.touchscreen.tap(next.x,next.y);
    await page.waitForFunction(p=>window.__XIAN_NI__.inspect().player.x<p.x-30,old);
    report.rotation.input={before:old,after:await page.evaluate(()=>window.__XIAN_NI__.inspect().player)};
    assert.equal(report.rotation.settled.overflow,false);
    assert.deepEqual(errors,[]);
    await page.screenshot({path:'qa/evidence/mobile-rotated.png'});
  }
  await context.close();
 }
 report.status='PASS';
 console.log('Mobile high density rendering and touch PASS',JSON.stringify(results));
} catch(error){report.status='FAIL';report.error=String(error.stack||error);if(activePage&&!activePage.isClosed()){report.failure=await activePage.evaluate(snapshot).catch(()=>null);await activePage.screenshot({path:'qa/evidence/mobile-render-failure.png'}).catch(()=>{});}throw error;
} finally {await writeFile('qa/evidence/mobile-render.json',JSON.stringify(report,null,2));await browser.close();}

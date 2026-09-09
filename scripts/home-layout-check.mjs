import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,rm} from 'node:fs/promises';

// Supplementary visual/input evidence. The complete game contract remains npm run verify.
const url=process.env.GAME_URL||'http://127.0.0.1:4191/';
const screenshotsOnly=process.env.HOME_LAYOUT_SCREENSHOTS_ONLY==='1';
const output='qa/evidence/home-layout.json';
const evidence={schemaVersion:1,status:'NOT_RUN',checkedAt:new Date().toISOString(),url,mode:screenshotsOnly?'visual-capture':'visual-and-home-input',environment:{platform:process.platform,limitation:'Linux Chrome viewport/DPR emulation; not physical Mac, Safari, or phone testing.'},devices:[],input:[],errors:[]};
await mkdir('qa/evidence',{recursive:true});
await writeFile(output,JSON.stringify(evidence,null,2));
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
evidence.environment.browser=await browser.version();
let activePage;
try{
 for(const device of [
  {id:'desktop-1440-dpr2',width:1440,height:900,dpr:2},
  {id:'desktop-1920-dpr1',width:1920,height:1080,dpr:1},
  {id:'desktop-1280-dpr1',width:1280,height:720,dpr:1},
  {id:'desktop-short-1920',width:1920,height:500,dpr:1},
  {id:'phone-390-dpr3',width:390,height:844,dpr:3,touch:true},
 ]){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},deviceScaleFactor:device.dpr,isMobile:!!device.touch,hasTouch:!!device.touch});
  const page=activePage=await context.newPage();
  page.on('pageerror',error=>evidence.errors.push({device:device.id,message:error.message}));
  const press=async selector=>device.touch?page.locator(selector).tap():page.locator(selector).click();
  const state=()=>page.evaluate(()=>window.__XIAN_NI__.inspect());
  const screenPoint=(x,y)=>page.evaluate(p=>window.__XIAN_NI__.screenPoint(p.x,p.y),{x,y});
  async function worldClick(x,y){
   for(let attempt=0;attempt<5;attempt++){
    const point=await screenPoint(x,y);
    if(point.x>=60&&point.x<=device.width-60&&point.y>=150&&point.y<=device.height-165){await page.mouse.click(point.x,point.y);return;}
    const center={x:device.width/2,y:device.height/2};
    const dx=Math.max(-550,Math.min(550,center.x-point.x)),dy=Math.max(-300,Math.min(300,center.y-point.y));
    await page.keyboard.down('Shift');await page.mouse.move(center.x,center.y);await page.mouse.down();
    await page.mouse.move(center.x+dx,center.y+dy,{steps:8});await page.mouse.up();await page.keyboard.up('Shift');await page.waitForTimeout(180);
    evidence.input.push({device:device.id,action:'pan camera with Shift and mouse',delta:{x:dx,y:dy}});
   }
   throw new Error(`Unable to bring world point ${x},${y} into the usable viewport`);
  }
  await page.goto(url);await press('[data-ui="create"]');await press('button:has-text("去回石驿")');
  await page.waitForFunction(()=>window.__XIAN_NI__?.inspect().scene==='home');await page.waitForTimeout(900);
  assert.equal((await state()).paused,false,'Fresh home scene must accept input');
  const canvas=await page.locator('canvas').evaluate(element=>({width:element.width,height:element.height,cssWidth:element.getBoundingClientRect().width,cssHeight:element.getBoundingClientRect().height}));
  assert.ok(canvas.width>=device.width&&canvas.height>=device.height,'Canvas must cover the viewport without upscaling a smaller raster');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal page overflow');
  const screenshot=`qa/evidence/home-layout-${device.id}.png`;
  await page.mouse.move(device.width-12,device.height-12);await page.screenshot({path:screenshot});
  const item={...device,canvas,screenshot,player:(await state()).player,landmarks:{}};
  for(const id of ['tao','lamp','lamp_stand','table','workbench','herb_rack','room']){
   const entity=(await state()).worlds.home.find(entity=>entity.id===id);
   item.landmarks[id]={world:{x:entity.x,y:entity.y},screen:await screenPoint(entity.x,entity.y)};
  }
  evidence.devices.push(item);console.log('Home first frame',device.id,screenshot);
  if(device.id==='desktop-short-1920'&&!screenshotsOnly){
   await page.keyboard.down('d');
   try{await page.waitForFunction(()=>window.__XIAN_NI__.inspect().player.x>890,null,{timeout:10000});}
   finally{await page.keyboard.up('d');}
   await page.waitForTimeout(400);
   const player=(await state()).player,feet=await screenPoint(player.x,player.y),dock=await page.locator('.action-dock').boundingBox();
   assert.ok(feet.x>dock.x&&feet.x<dock.x+dock.width,'Probe must reach the center above the toolbar');
   assert.ok(feet.y<dock.y-20,'Short wide windows must keep the player above the toolbar');
   evidence.input.push({device:device.id,action:'Hold D to walk into the center; verify following camera keeps the feet clear of the toolbar',feet,dock});
   await page.screenshot({path:'qa/evidence/home-layout-short-center.png'});
  }
  if(device.id==='desktop-1440-dpr2'&&!screenshotsOnly){
   await press('[data-ui="spell:pull"]');await worldClick(430,760);
   await page.waitForFunction(()=>window.__XIAN_NI__.inspect().player.pullId==='lamp',null,{timeout:5000});
   await worldClick(573,677);await page.waitForFunction(()=>window.__XIAN_NI__.inspect().flags.lampFixed===true,null,{timeout:5000});
   await press('[data-ui="release"]');assert.equal((await state()).player.pullId,null);
   evidence.input.push({device:device.id,action:'Select pull, click lamp, move near stand anchor, release',result:{lampFixed:(await state()).flags.lampFixed,lamp:(await state()).worlds.home.find(entity=>entity.id==='lamp')}});
   const before=(await state()).player;
   await worldClick(760,410);await page.waitForTimeout(150);
   const approach=(await state()).player;
   await page.waitForFunction(()=>window.__XIAN_NI__.inspect().dialogue?.id==='table',null,{timeout:30000});
   const arrival=await state();
   assert.ok(Math.hypot(arrival.player.x-760,arrival.player.y-410)<100,'Table dialogue must occur at a reachable position near the table');
   assert.ok(Math.hypot(arrival.player.x-before.x,arrival.player.y-before.y)>100,'Table interaction must include actual walking');
   evidence.input.push({device:device.id,action:'Click distant table and walk to reachable interaction point around courtyard stone',before,approach,arrival:arrival.player,dialogue:arrival.dialogue.id});
   await page.screenshot({path:'qa/evidence/home-layout-table-interaction.png'});
   console.log('Home DPR2 lamp placement and table approach PASS');
  }
  await context.close();activePage=null;
 }
 assert.deepEqual(evidence.errors,[]);evidence.status='PASS';
 await rm('qa/evidence/home-layout-failure.png',{force:true});
 console.log(`Home layout ${screenshotsOnly?'five-viewport capture':'five-viewport, short-window camera and DPR2 real-input checks'} PASS`);
}catch(error){
 evidence.status='FAIL';evidence.failure=String(error);console.error(error);process.exitCode=1;
 if(activePage)await activePage.screenshot({path:'qa/evidence/home-layout-failure.png'}).catch(()=>{});
}finally{
 await writeFile(output,JSON.stringify(evidence,null,2));await browser.close();
}

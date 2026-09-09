import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
const inspect=()=>p.evaluate(()=>{const s=window.__XIAN_NI__.inspect();return {scene:s.scene,time:s.time,player:s.player,flags:s.flags,paused:s.paused,pending:s.pending,dialogue:s.dialogue,events:s.events.slice(-3)}});
async function clickWorld(x,y){const pt=await p.evaluate(({x,y})=>window.__XIAN_NI__.screenPoint(x,y),{x,y});await p.mouse.click(pt.x,pt.y);}
async function key(key){await p.keyboard.down(key);await p.waitForTimeout(200);await p.keyboard.up(key);}
try{
await p.goto('http://127.0.0.1:5173/');await p.getByRole('button',{name:'入 山',exact:true}).click();await p.getByRole('button',{name:'去回石驿',exact:true}).click();await p.waitForTimeout(1000);
await key('1');await clickWorld(430,760);await p.waitForTimeout(500);assert.equal((await inspect()).player.pullId,'lamp');
await clickWorld(560,665);await p.waitForFunction(()=>{const s=window.__XIAN_NI__.inspect();const e=s.worlds.home.find(e=>e.id==='lamp');return Math.hypot(e.x-560,e.y-665)<8;},{timeout:10000});
await p.locator('[data-ui="release"]').click();await p.waitForTimeout(300);assert.equal((await inspect()).flags.lampFixed,true);
await key(' ');assert.equal((await inspect()).paused,true);await clickWorld(510,760);assert.equal((await inspect()).pending.type,'move');
const paused=await inspect();await p.waitForTimeout(700);assert.equal((await inspect()).time,paused.time);await key(' ');
await p.waitForFunction(()=>Math.abs(window.__XIAN_NI__.inspect().player.x-510)<12,{timeout:10000});
await p.screenshot({path:'qa/evidence/m1-input.png'});const result=await inspect();
assert.equal(errors.length,0);await writeFile('qa/evidence/m1-input.json',JSON.stringify({environment:{browser:await b.version(),os:process.platform,viewport:'1440x900'},inputs:['create profile','1, click lamp','click lamp stand','release','space pause','click destination while paused','space resume'],result,errors},null,2));
console.log('M1 actual input PASS',JSON.stringify(result));
}finally{await b.close();}

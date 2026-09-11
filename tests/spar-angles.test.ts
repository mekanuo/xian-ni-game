import {beforeEach,afterEach,expect,it} from 'vitest';
import {createSpar,installSparMap,sparAct,sparTick,type SparRound} from '../src/whitebox/spar-model';
let undo:()=>void;beforeEach(()=>{undo=installSparMap();});afterEach(()=>undo());
const wait=(r:SparRound,seconds:number)=>{for(let t=0;t<seconds-1e-8;t+=.025)sparTick(r,.025,{x:0,y:0});};
function ready(stance:'left'|'right',mana=0){const r=createSpar(mana);expect(sparAct(r,{type:'agree',stance}).ok).toBe(true);
 const original={x:r.peer.x,y:r.peer.y};expect(original).toEqual({x:900,y:980});expect(sparAct(r,{type:'begin'}).ok).toBe(false);
 sparAct(r,{type:'move',point:{x:900,y:940}});wait(r,4);expect(r.peer.x).toBeCloseTo(stance==='left'?680:1120,0);expect(r.peer.y).toBeCloseTo(940,0);
 expect(sparAct(r,{type:'begin'}).ok).toBe(true);return r;}
function shot(r:SparRound){for(let i=0;i<120&&!r.shots;i++)sparTick(r,.025,{x:0,y:0});expect(r.shots).toBe(1);}
for(const stance of ['left','right'] as const){
 it(`${stance}: zero-mana perpendicular ground movement avoids the actual side shot`,()=>{
  const r=ready(stance);shot(r);expect(sparAct(r,{type:'move',point:{x:900,y:892}}).ok).toBe(true);wait(r,3);
  expect(r.outcome).toBe('dodged');expect(r.s.player.hp).toBe(4);expect(r.s.player.mana).toBe(0);
 });
 it(`${stance}: moving along the projectile line is still hit rather than a free dodge`,()=>{
  const r=ready(stance);shot(r);sparAct(r,{type:'move',point:{x:stance==='left'?948:852,y:940}});wait(r,3);
  expect(r.outcome).toBe('hit');expect(r.s.player.hp).toBe(3);
 });
 it(`${stance}: a ward must face the actual side, not the old front position`,()=>{
  const wrong=ready(stance,1);shot(wrong);sparAct(wrong,{type:'cast',spell:'ward',point:{x:900,y:720}});wait(wrong,3);
  expect(wrong.outcome).toBe('hit');expect(wrong.s.player.hp).toBe(3);expect(wrong.s.player.mana).toBe(0);
  const right=ready(stance,1);shot(right);sparAct(right,{type:'cast',spell:'ward',point:{x:right.peer.x,y:right.peer.y}});wait(right,3);
  expect(right.outcome).toBe('blocked');expect(right.s.player.hp).toBe(4);expect(right.s.player.mana).toBe(0);
 });
}
it('a second agreement changes position by real walking while preserving actual damage and mana',()=>{
 const r=ready('left',2);wait(r,4);expect(r.s.player.hp).toBe(3);expect(r.outcome).toBe('hit');
 sparAct(r,{type:'move',point:{x:750,y:940}});wait(r,2);const prior={x:r.peer.x,y:r.peer.y};
 expect(sparAct(r,{type:'agree',stance:'right'}).ok).toBe(true);expect({x:r.peer.x,y:r.peer.y}).toEqual(prior);expect(r.shots).toBe(0);
 sparAct(r,{type:'move',point:{x:900,y:940}});let closest=Infinity;for(let i=0;i<320;i++){sparTick(r,.025,{x:0,y:0});closest=Math.min(closest,Math.hypot(r.peer.x-r.s.player.x,r.peer.y-r.s.player.y));}expect(closest).toBeGreaterThan(60);expect(r.peer.x).toBeCloseTo(1120,0);
 expect(r.s.player.hp).toBe(3);expect(r.s.player.mana).toBe(2);expect(sparAct(r,{type:'begin'}).ok).toBe(true);
 shot(r);sparAct(r,{type:'cast',spell:'ward',point:{x:1120,y:940}});wait(r,3);
 expect(r.outcome).toBe('blocked');expect(r.s.player.hp).toBe(3);expect(r.s.player.mana).toBe(1);expect(r.shots).toBe(1);
});

it('a positioning peer yields to a stationary person on the agreed northern walking route',()=>{
 const r=ready('left',2);wait(r,4);sparAct(r,{type:'move',point:{x:750,y:940}});wait(r,2);
 expect(sparAct(r,{type:'agree',stance:'right'}).ok).toBe(true);
 sparAct(r,{type:'move',point:{x:810,y:810}});wait(r,6);
 const gap=Math.hypot(r.peer.x-r.s.player.x,r.peer.y-r.s.player.y);expect(gap).toBeGreaterThanOrEqual(40);expect(gap).toBeLessThan(45);
 const stopped={x:r.peer.x,y:r.peer.y};wait(r,1);expect({x:r.peer.x,y:r.peer.y}).toEqual(stopped);
 sparAct(r,{type:'move',point:{x:900,y:940}});wait(r,8);expect(r.peer.x).toBeCloseTo(1120,0);expect(sparAct(r,{type:'begin'}).ok).toBe(true);
});

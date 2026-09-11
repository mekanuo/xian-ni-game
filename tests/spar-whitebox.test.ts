import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {createSpar,installSparMap,sparAct,sparTick,type SparRound} from '../src/whitebox/spar-model';
let restore:()=>void;
beforeEach(()=>{restore=installSparMap();});afterEach(()=>restore());
const wait=(r:SparRound,seconds:number)=>{for(let t=0;t<seconds-1e-8;t+=.025)sparTick(r,.025,{x:0,y:0});};
function ready(mana=0){const r=createSpar(mana);expect(sparAct(r,{type:'agree'}).ok).toBe(true);
 expect(sparAct(r,{type:'move',point:{x:900,y:940}}).ok).toBe(true);wait(r,4);
 expect(sparAct(r,{type:'begin'}).ok).toBe(true);return r;}
function untilShot(r:SparRound){for(let i=0;i<200&&!r.shots;i++)sparTick(r,.025,{x:0,y:0});expect(r.shots).toBe(1);}
describe('voluntary one-shot guard round using real movement and projectiles',()=>{
 it('cannot attack before agreement or teleport either body into position',()=>{
  const r=createSpar();wait(r,10);expect(r.s.player.hp).toBe(4);expect(r.shots).toBe(0);
  expect(sparAct(r,{type:'begin'}).ok).toBe(false);const y=r.peer.y;
  expect(sparAct(r,{type:'agree'}).ok).toBe(true);expect(r.peer.y).toBe(y);
  expect(sparAct(r,{type:'begin'}).ok).toBe(false);wait(r,.5);expect(r.peer.y).toBeLessThan(y);expect(r.peer.y).toBeGreaterThan(720);
 });
 it('standing still takes exactly one hit and never earns success or heals',()=>{
  const r=ready();wait(r,12);expect(r.phase).toBe('result');expect(r.outcome).toBe('hit');
  expect(r.s.player.hp).toBe(3);expect(r.s.player.mana).toBe(0);expect(r.shots).toBe(1);expect(r.s.projectiles).toHaveLength(0);
 });
 it('a legal zero-mana ground click dodges a real emitted shot inside the line',()=>{
  const r=ready();untilShot(r);expect(r.s.projectiles).toHaveLength(1);
  expect(sparAct(r,{type:'move',point:{x:948,y:940}}).ok).toBe(true);wait(r,3);
  expect(r.outcome).toBe('dodged');expect(r.s.player.hp).toBe(4);expect(r.s.player.mana).toBe(0);expect(r.s.player.x).toBeGreaterThan(945);
 });
 it('stopping preserves the live projectile and its later hit, without another shot',()=>{
  const r=ready();untilShot(r);const id=r.s.projectiles[0].id;
  expect(sparAct(r,{type:'stop'}).ok).toBe(true);expect(r.phase).toBe('settling');expect(r.s.projectiles[0].id).toBe(id);
  wait(r,10);expect(r.outcome).toBe('stopped');expect(r.s.player.hp).toBe(3);expect(r.shots).toBe(1);expect(r.phase).toBe('result');
 });
 it('crossing the real body line stops instead of awarding an unopposed success',()=>{
  const r=ready();expect(sparAct(r,{type:'move',point:{x:1020,y:940}}).ok).toBe(true);wait(r,5);
  expect(r.outcome).toBe('outside');expect(r.shots).toBe(0);expect(r.s.player.x).toBeGreaterThan(1000);
 });
 it('pause freezes a real in-flight round and queued movement resumes normally',()=>{
  const r=ready();untilShot(r);sparAct(r,{type:'pause',value:true});const before=JSON.stringify(r);
  wait(r,3);expect(JSON.stringify(r)).toBe(before);sparAct(r,{type:'move',point:{x:948,y:940}});
  sparAct(r,{type:'pause',value:false});wait(r,3);expect(r.outcome).toBe('dodged');
 });
 it('a correctly facing late ward blocks; a backward ward does not',()=>{
  const front=ready(1);untilShot(front);expect(sparAct(front,{type:'cast',spell:'ward',point:{x:900,y:720}}).ok).toBe(true);wait(front,3);
  expect(front.outcome).toBe('blocked');expect(front.s.player.hp).toBe(4);expect(front.s.player.mana).toBe(0);
  const back=ready(1);untilShot(back);sparAct(back,{type:'cast',spell:'ward',point:{x:900,y:1200}});wait(back,3);
  expect(back.outcome).toBe('hit');expect(back.s.player.hp).toBe(3);
 });
 it('refuses offensive casts and resource recovery, including while paused',()=>{
  const r=ready(2);sparAct(r,{type:'pause',value:true});
  expect(sparAct(r,{type:'cast',spell:'flame',point:{x:900,y:720}}).ok).toBe(false);
  expect(sparAct(r,{type:'heal'}).ok).toBe(false);expect(r.s.pending).toBeNull();expect(r.s.player.mana).toBe(2);
 });
 it('refuses a low-health or contaminated starting round',()=>{
  const r=createSpar();r.s.player.hp=1;expect(sparAct(r,{type:'agree'}).ok).toBe(false);
  r.s.player.hp=2;r.s.flags.casting=true;expect(sparAct(r,{type:'agree'}).ok).toBe(false);
 });
 it('does not release a new shot after movement crosses the line in the firing substep',()=>{
  const r=ready();sparAct(r,{type:'move',point:{x:952,y:940}});wait(r,.35);
  expect(r.s.player.x).toBe(952);r.peer.data!.attack=1.99; // Explicit timing-boundary fixture, not a browser input claim.
  sparTick(r,.025,{x:1,y:0});expect(r.s.player.x).toBe(956);
  expect(r.outcome).toBe('outside');expect(r.shots).toBe(0);expect(r.s.projectiles).toHaveLength(0);
 });
 it('keeps the first outside reason when stop is pressed while the old shot settles',()=>{
  const r=ready();untilShot(r);sparAct(r,{type:'move',point:{x:1020,y:940}});wait(r,.35);
  expect(r.phase).toBe('settling');expect(r.stopReason).toBe('outside');
  sparAct(r,{type:'stop'});wait(r,3);expect(r.outcome).toBe('outside');
 });

});

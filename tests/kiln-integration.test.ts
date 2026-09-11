/// <reference types="vite/client" />
import {describe,it,expect} from 'vitest';
import completed from '../qa/fixtures/return-journey-v0.5.0.json?raw';
import {act,tick,restore,snapshot} from '../src/game/model';
import type {GameState,Vec} from '../src/game/contracts';
const idle={x:0,y:0};
function walk(s:GameState,p:Vec){expect(act(s,{type:'move',point:p}).ok).toBe(true);for(let t=0;t<40&&s.player.path.length&&!s.defeated;t+=1/60)tick(s,1/60,idle);expect(s.defeated).toBe(false);expect(Math.hypot(s.player.x-p.x,s.player.y-p.y)).toBeLessThan(4);}
function interact(s:GameState,id:string){expect(act(s,{type:'interact',targetId:id})).toMatchObject({ok:true});}
function reachWest(){
 const s=restore(completed);s.paused=false;
 walk(s,{x:1580,y:690});interact(s,'to_creek');expect(act(s,{type:'choose',choiceId:'canal:depart:creek'}).ok).toBe(true);
 for(const p of [{x:300,y:740},{x:300,y:340},{x:700,y:315}])walk(s,p);
 const safe=structuredClone(s.lastSafe);interact(s,'creek_to_kiln');expect(s.scene).toBe('kiln');expect(s.kiln.entry).toBe('west');expect(s.lastSafe).toEqual(safe);return s;
}
const eastRoute=[{x:360,y:700},{x:360,y:820},{x:800,y:820},{x:1030,y:820},{x:1220,y:820},{x:1220,y:540}];
describe('production kiln joined to real maps and current save',()=>{
 it('walks the real four-way connection with zero mana, no loan and no old chapter credit changes',()=>{
  const s=reachWest(),canal=structuredClone(s.canal),journey=structuredClone(s.journey);
  expect(s.player.mana).toBe(0);expect(s.kiln.crossed).toEqual({west:false,east:false});
  for(const p of eastRoute)walk(s,p);expect(s.kiln.crossed.east).toBe(false);
  interact(s,'kiln_to_canal');expect(s.scene).toBe('canal');expect(s.kiln.entry).toBe(null);expect(s.kiln.crossed).toEqual({west:false,east:true});
  const loaded=restore(snapshot(s));expect(loaded.kiln).toEqual(s.kiln);expect(loaded.worlds.kiln).toEqual(s.worlds.kiln);
  walk(s,{x:460,y:520});interact(s,'canal_to_kiln');expect(s.kiln.entry).toBe('east');
  for(const p of [{x:1290,y:540},{x:1290,y:140},{x:800,y:140},{x:360,y:170},{x:180,y:480}])walk(s,p);
  interact(s,'kiln_to_creek');expect(s.scene).toBe('creek');expect(s.kiln.crossed).toEqual({west:true,east:true});expect(s.kiln.entry).toBe(null);
  expect(s.kiln.loan).toBe('none');expect(s.kiln.shelterOpened).toBe(false);expect(s.player.mana).toBe(0);expect(s.canal).toEqual(canal);expect(s.journey).toEqual(journey);expect(restore(snapshot(s)).kiln).toEqual(s.kiln);
 });
 it('same-side exit and retreat preserve facts without awarding a crossing or hidden rest',()=>{
  const s=reachWest();interact(s,'kiln_to_creek');expect(s.kiln.crossed).toEqual({west:false,east:false});
  walk(s,{x:700,y:315});interact(s,'creek_to_kiln');walk(s,{x:260,y:400});expect(act(s,{type:'rest'}).ok).toBe(false);
  const safe=structuredClone(s.lastSafe);expect(act(s,{type:'retreat'}).ok).toBe(true);expect(s.scene).toBe(safe.scene);expect(s.player.x).toBe(safe.point.x);expect(s.player.y).toBe(safe.point.y);
  expect(s.kiln.entry).toBe(null);expect(s.kiln.crossed).toEqual({west:false,east:false});expect(s.kiln.shelterOpened).toBe(false);expect(restore(snapshot(s)).kiln).toEqual(s.kiln);
 });
});

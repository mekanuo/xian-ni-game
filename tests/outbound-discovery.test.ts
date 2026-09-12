import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { simulationPorts } from '../src/game/model';
import type { Vec } from '../src/game/contracts';
import { createDiscovery, discoveryAct, discoveryTick, installDiscoveryMap } from '../src/whitebox/outbound-discovery-model';
const {mkdirSync,writeFileSync}=await import('node:fs' as string);
let uninstall:()=>void;
const traces:unknown[]=[];
beforeAll(()=>{uninstall=installDiscoveryMap();});
afterAll(()=>{uninstall();mkdirSync('qa/whitebox/outbound-discovery',{recursive:true});writeFileSync('qa/whitebox/outbound-discovery/model-traces.json',JSON.stringify({scope:'Public synthetic model initial state and real act/tick only; no browser, art acceptance or persistent save.',traces},null,2));});
function driver(){
 const r=createDiscovery(),inputs:unknown[]=[],samples:unknown[]=[];
 traces.push({initial:structuredClone(r),inputs,samples});
 const step=()=>{discoveryTick(r,.025);samples.push({t:r.s.time,p:{x:r.s.player.x,y:r.s.player.y},npc:{x:r.npc.x,y:r.npc.y},phase:r.npcPhase,visits:{...r.visits}});};
 const wait=(seconds:number)=>{inputs.push({t:r.s.time,wait:seconds});for(let i=0;i<Math.ceil(seconds/.025);i++)step();};
 const walk=(point:Vec)=>{const action={type:'move' as const,point};const result=discoveryAct(r,action);inputs.push({t:r.s.time,action,result});expect(result.ok).toBe(true);for(let i=0;i<2400&&Math.hypot(r.s.player.x-point.x,r.s.player.y-point.y)>3;i++)step();expect(Math.hypot(r.s.player.x-point.x,r.s.player.y-point.y)).toBeLessThanOrEqual(3);};
 const action=(a:Parameters<typeof discoveryAct>[1])=>{const result=discoveryAct(r,a);inputs.push({t:r.s.time,action:a,result});return result;};
 return {r,walk,wait,action};
}
describe('outbound discovery physical observations and autonomous purpose',()=>{
 it('does not award remote discoveries, a return at spawn, or a remote conversation',()=>{
  const d=driver();d.wait(10);expect(d.r.visits).toEqual({upper:false,lower:false});expect(d.r.returned).toBe(false);expect(d.r.npcPhase).toBe('waiting');expect(d.action({type:'talk'}).ok).toBe(false);expect(d.r.met).toBe(false);
  expect(d.action({type:'move',point:{x:1550,y:500}}).ok).toBe(true);expect(d.r.visits.upper).toBe(false);
 });
 it('physically reaches both viewing faces and returns without meeting the traveler',()=>{
  const d=driver();d.walk({x:250,y:500});d.walk({x:1550,y:500});expect(d.r.visits.upper).toBe(false);d.wait(.8);expect(d.r.visits.upper).toBe(true);
  d.walk({x:650,y:500});d.walk({x:650,y:1190});d.walk({x:1530,y:1190});d.wait(.8);expect(d.r.visits.lower).toBe(true);d.walk({x:250,y:1300});expect(d.r.returned).toBe(true);expect(d.r.met).toBe(false);expect(d.r.s.player.hp).toBe(4);expect(d.r.s.player.mana).toBe(6);
 });
 it('keeps the rock and water physically impassable',()=>{
  const d=driver();expect(simulationPorts.free(d.r.s,{x:1200,y:800},17)).toBe(false);expect(simulationPorts.free(d.r.s,{x:1900,y:1190},17)).toBe(false);
  expect(d.action({type:'move',point:{x:1900,y:1190}}).ok).toBe(false);
 });
 it('walks and listens at the lower bay then moves to quiet ground without requiring talk',()=>{
  const d=driver();d.walk({x:650,y:1100});d.wait(25);expect(d.r.npc.kind).toBe('npc');expect(d.r.npcPhase).toBe('quiet');expect(Math.hypot(d.r.npc.x-1170,d.r.npc.y-1450)).toBeLessThan(4);expect(d.r.met).toBe(false);
 });
 it('rejects an upper suggestion before firsthand observation and resumes after dialogue',()=>{
  const d=driver();d.walk({x:650,y:1100});d.wait(25);d.walk({x:1110,y:1450});expect(d.action({type:'talk'}).ok).toBe(true);expect(d.r.met).toBe(true);expect(d.action({type:'suggest-upper'}).ok).toBe(false);expect(d.r.npcPhase).toBe('quiet');expect(d.action({type:'leave'}).ok).toBe(true);expect(d.r.s.paused).toBe(false);
 });
 it('uses firsthand upper observation to change the real destination without teleporting',()=>{
  const d=driver();d.walk({x:250,y:500});d.walk({x:1550,y:500});d.wait(.8);d.walk({x:650,y:500});d.walk({x:650,y:1100});d.wait(25);d.walk({x:1110,y:1450});expect(d.action({type:'talk'}).ok).toBe(true);
  const before={x:d.r.npc.x,y:d.r.npc.y};expect(d.action({type:'suggest-upper'}).ok).toBe(true);expect({x:d.r.npc.x,y:d.r.npc.y}).toEqual(before);expect(d.r.npcPhase).toBe('walking-upper');expect(d.r.s.dialogue).toBeNull();d.wait(35);expect(d.r.npcPhase).toBe('upper');expect(Math.hypot(d.r.npc.x-1550,d.r.npc.y-500)).toBeLessThan(4);expect(d.r.visits.lower).toBe(false);
 });
 it('freezes observations and movement during ordinary pause and talking',()=>{
  const d=driver();d.walk({x:650,y:1100});d.action({type:'pause',value:true});const paused=structuredClone(d.r);d.wait(2);expect(d.r).toEqual(paused);d.action({type:'pause',value:false});d.wait(25);d.walk({x:1110,y:1450});d.action({type:'talk'});const talking=structuredClone(d.r);d.wait(2);expect(d.r).toEqual(talking);d.action({type:'leave'});expect(d.r.s.paused).toBe(false);
 });
 it('requires a continuous stationary look and does not combine interrupted glances',()=>{
  const d=driver();d.walk({x:250,y:500});d.walk({x:1550,y:500});d.wait(.3);expect(d.r.visits.upper).toBe(false);d.walk({x:1550,y:620});expect(d.r.observation.upper).toBe(0);d.walk({x:1550,y:500});d.wait(.3);expect(d.r.visits.upper).toBe(false);d.wait(.5);expect(d.r.visits.upper).toBe(true);
 });
 it('preserves pre-existing manual pause after leaving a conversation',()=>{
  const d=driver();d.walk({x:650,y:1100});d.wait(25);d.walk({x:1110,y:1450});d.action({type:'pause',value:true});expect(d.action({type:'talk'}).ok).toBe(true);d.action({type:'leave'});expect(d.r.s.paused).toBe(true);const before=structuredClone(d.r);d.wait(2);expect(d.r).toEqual(before);
 });

});

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
const { mkdirSync, writeFileSync } = await import('node:fs' as string);
import { act, simulationPorts, tick } from '../src/game/model';
import type { GameState, Vec } from '../src/game/contracts';
import { createOutboundLayout, installOutboundLayout, OUTBOUND_LAYOUT } from '../src/whitebox/outbound-layout';

const traces:unknown[]=[];
let uninstall:()=>void;
const guard=(s:GameState)=>s.worlds.home.find(e=>e.id==='outbound_guard')!;
const summary=(s:GameState)=>({time:s.time,player:structuredClone(s.player),enemy:structuredClone(guard(s)),defeated:s.defeated,projectiles:structuredClone(s.projectiles),eventSeq:s.flags.eventSeq});
beforeAll(()=>{uninstall=installOutboundLayout();});
afterAll(()=>{
 uninstall();mkdirSync('qa/whitebox/outbound-layout',{recursive:true});
 writeFileSync('qa/whitebox/outbound-layout/r2.json',JSON.stringify({revision:'outbound-layout-r2',scope:'Synthetic model layout only; no ally implementation, actual browser, production save or gameplay-quality PASS.',map:OUTBOUND_LAYOUT,traces},null,2));
});

function run(mana:0|6,disturbed:boolean){
 const s=createOutboundLayout(mana),samples:unknown[]=[],inputs:unknown[]=[];
 const initial=summary(s);let last=-1;
 function step(){tick(s,.025,{x:0,y:0});if(s.time-last>=.1){samples.push(summary(s));last=s.time;}}
 function walk(point:Vec){
  const result=act(s,{type:'move',point});inputs.push({time:s.time,type:'move',point,result});expect(result.ok,JSON.stringify({point,result})).toBe(true);
  const limit=s.time+60;while(!s.defeated&&Math.hypot(s.player.x-point.x,s.player.y-point.y)>4&&s.time<limit)step();
  return Math.hypot(s.player.x-point.x,s.player.y-point.y)<=4;
 }
 let castingObserved=false;
 if(disturbed){
  walk({x:630,y:580});const limit=s.time+10;
  while(!s.defeated&&guard(s).state!=='casting'&&s.time<limit)step();
  castingObserved=guard(s).state==='casting';expect(castingObserved).toBe(true);
  inputs.push({time:s.time,type:'ordinary observation gap',seconds:1});const end=s.time+1;while(!s.defeated&&s.time<end)step();
 }
 const departed=summary(s),arrived=walk({x:1100,y:700}),arrival=summary(s);
 const returned=!s.defeated&&walk({x:260,y:760}),end=summary(s);
 const record={mana,disturbed,castingObserved,initial,departed,arrived,arrival,returned,end,inputs,samples,events:structuredClone(s.events)};
 traces.push(record);return record;
}

describe('outbound layout measurement, not a design acceptance',()=>{
 it('uses the proposed two solid rocks and legal full-body starting/standing points',()=>{
  expect(OUTBOUND_LAYOUT.obstacles.slice(4)).toEqual([{x:360,y:300,w:220,h:300},{x:760,y:300,w:220,h:300}]);
  const s=createOutboundLayout(6);
  for(const point of [{x:480,y:660},{x:520,y:660},{x:670,y:380},{x:550,y:640},{x:790,y:640},{x:610,y:640},{x:730,y:640},{x:260,y:760},{x:1100,y:700}])expect(simulationPorts.free(s,point,17),JSON.stringify(point)).toBe(true);
  expect(simulationPorts.free(s,{x:470,y:450},17)).toBe(false);
 });
 it('preserves normal click safety near an already visible enemy',()=>{
  const s=createOutboundLayout(0);const action={type:'move' as const,point:{x:630,y:480}};
  const result=act(s,action);traces.push({case:'near-enemy-refusal',action,result,state:summary(s)});expect(result.ok).toBe(false);
 });
 for(const mana of [6,0] as const)for(const disturbed of [false,true])it(`records real direct travel and return; MP=${mana}, disturbed=${disturbed}`,()=>{
  const r=run(mana,disturbed);
  expect(r.initial.player.hp).toBe(4);expect(r.initial.player.mana).toBe(mana);
  expect(r.end.time).toBeGreaterThan(r.initial.time);
  expect(r.end.player.mana).toBe(mana);expect(r.end.enemy.hp).toBe(3);
  expect(r.inputs.some(i=>(i as {type:string}).type==='move')).toBe(true);
 });
});

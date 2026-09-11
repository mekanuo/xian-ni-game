/// <reference types="vite/client" />
import oldReturn from '../qa/fixtures/return-main-v0.3.0.json?raw';
import {describe,it,expect} from 'vitest';
import {act,tick,restore,snapshot,interactionPoint} from '../src/game/model';
import type {GameAction,GameState,Vec} from '../src/game/contracts';
const run=(s:GameState,n:number)=>{for(let t=0;t<n-1e-8;t+=.025)tick(s,Math.min(.025,n-t),{x:0,y:0});};
const action=(s:GameState,a:GameAction)=>{const r=act(s,a);expect(r.ok,`${a.type}: ${r.message}`).toBe(true);};
function walk(s:GameState,p:Vec){action(s,{type:'move',point:p});let steps=0;while(s.player.path.length&&steps++<4000)run(s,.025);expect(steps).toBeLessThan(4000);}
function stand(s:GameState,id:string){const p=interactionPoint(s,id);expect(p,id).toBeDefined();walk(s,p!);}
function touch(s:GameState,id:string){stand(s,id);action(s,{type:'interact',targetId:id});}
const choose=(s:GameState,id:string)=>action(s,{type:'choose',choiceId:id});
function setup(){const s=restore(oldReturn);action(s,{type:'pause',value:false});touch(s,'table');choose(s,'canal:accept');touch(s,'to_creek');choose(s,'canal:depart:canal');touch(s,'canal_inspect');choose(s,'leave');stand(s,'canal_diverter');return s;}
const flame=(s:GameState):GameAction=>({type:'cast',spell:'flame',point:{x:s.player.x,y:s.player.y-130}});
function clearPosition(){const s=setup();touch(s,'canal_diverter');run(s,3.1);stand(s,'canal_screen');return s;}
function roundPaused(s:GameState){action(s,{type:'pause',value:true});const loaded=restore(snapshot(s));expect(loaded.player).toEqual(s.player);expect(loaded.canal).toEqual(s.canal);return loaded;}
describe('旧渠施术与徒手工序互斥：实际旧档、行走及动作',()=>{
 for(const operation of ['divert','restore'] as const)it(`火球起手期间不能开始 ${operation}，立即暂停保存仍可恢复`,()=>{
  const s=setup();if(operation==='restore'){touch(s,'canal_diverter');run(s,2.1);stand(s,'canal_diverter');}
  action(s,flame(s));expect(s.flags.casting).toBe(true);const started=act(s,{type:'interact',targetId:'canal_diverter'});
  expect(started.ok).toBe(false);expect(s.canal.work).toBeNull();roundPaused(s);
 });
 it('火球起手期间不能开始清框，保持渠底支撑和可恢复存档',()=>{
  const s=clearPosition();action(s,flame(s));expect(act(s,{type:'interact',targetId:'canal_screen'}).ok).toBe(false);expect(s.canal.work).toBeNull();roundPaused(s);
 });
 for(const operation of ['divert','clear'] as const)it(`在 ${operation} 中开始施术，会立即打断徒手工序`,()=>{
  const s=operation==='clear'?clearPosition():setup();action(s,{type:'interact',targetId:operation==='clear'?'canal_screen':'canal_diverter'});run(s,.3);expect(s.canal.work?.kind).toBe(operation);
  action(s,flame(s));expect(s.flags.casting).toBe(true);expect(s.canal.work).toBeNull();roundPaused(s);
 });
 it('暂停中的清框可排队施术并读档；直到明确恢复才打断工序',()=>{
  const s=clearPosition();action(s,{type:'interact',targetId:'canal_screen'});run(s,.3);action(s,{type:'pause',value:true});action(s,flame(s));const loaded=roundPaused(s);run(loaded,1);expect(loaded.canal.work?.elapsed).toBeCloseTo(.3);expect(loaded.flags.casting).toBe(false);
  action(loaded,{type:'pause',value:false});expect(loaded.canal.work).toBeNull();expect(loaded.flags.casting).toBe(true);expect(loaded.pending).toBeNull();
 });
});

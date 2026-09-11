/// <reference types="vite/client" />
import old from '../qa/fixtures/return-main-v0.3.0.json?raw';
import {describe,it,expect} from 'vitest';
import {act,tick,restore,interactionPoint} from '../src/game/model';
import type {GameState,Vec} from '../src/game/contracts';
const run=(s:GameState,n:number)=>{for(let t=0;t<n;t+=.025)tick(s,.025,{x:0,y:0});};
function walk(s:GameState,p:Vec){expect(act(s,{type:'move',point:p}).ok,`walk ${JSON.stringify(p)}`).toBe(true);let n=0;while(s.player.path.length&&n++<4000)run(s,.025);expect(n,'path must finish').toBeLessThan(4000);}
function touch(s:GameState,id:string){const p=interactionPoint(s,id);expect(p,`reachable ${id}`).toBeDefined();walk(s,p!);const r=act(s,{type:'interact',targetId:id});expect(r.ok,`${id}: ${r.message}`).toBe(true);}
function choose(s:GameState,id:string){const r=act(s,{type:'choose',choiceId:id});expect(r.ok,`${id}: ${r.message}`).toBe(true);}
function ready(){const s=restore(old);s.paused=false;s.dialogue=null;s.flags.companion='waiting';touch(s,'table');choose(s,'canal:accept');touch(s,'to_creek');choose(s,'canal:depart:canal');touch(s,'canal_inspect');choose(s,'leave');return s;}
function finish(s:GameState){touch(s,'canal_tub');expect(s.canal.stage).toBe('verified');touch(s,'canal_keeper');choose(s,'canal:report');touch(s,'canal_to_home');expect(s.scene).toBe('home');touch(s,'table');choose(s,'canal:record');expect(s.canal.stage).toBe('complete');expect(s.flags.endingWish).toBe('travel');expect(restore(JSON.stringify(s)).canal.stage).toBe('complete');}
describe('旧渠真实模型动作路线（不代替浏览器实跑）',()=>{
 it('零灵力/无扣无药，从接信到分水清理、验水与实际归家',()=>{
  const s=ready();s.player.mana=0;expect(s.life.clamp).toBe('unowned');
  touch(s,'canal_diverter');run(s,2.1);run(s,1.1);touch(s,'canal_screen');run(s,2.1);expect(s.canal.cleared).toBe(true);expect(s.canal.method).toBe('diversion');
  touch(s,'canal_diverter');run(s,2.1);finish(s);expect(s.player.mana).toBe(0);expect(s.player.hp).toBe(4);
 });
 it('留势8秒内实际去程、清理、回岸都有操作余量',()=>{
  const s=ready();s.ringStyle='hold';s.player.mana=6;
  walk(s,{x:1230,y:410});expect(act(s,{type:'cast',spell:'pull',targetId:'canal_stop',point:{x:1200,y:350}}).ok).toBe(true);run(s,.5);expect(act(s,{type:'hold'}).ok).toBe(true);
  run(s,1.1);touch(s,'canal_screen');run(s,2.1);expect(s.canal.cleared).toBe(true);expect(s.canal.method).toBe('hold');walk(s,{x:1230,y:410});expect(s.player.hold,'at least two seconds reserve').toBeGreaterThan(2);
  act(s,{type:'release'});finish(s);expect(s.player.hp).toBe(4);
 });
});

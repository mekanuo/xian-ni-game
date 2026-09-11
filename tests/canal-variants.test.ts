/// <reference types="vite/client" />
import {describe,it,expect} from 'vitest';
import lifeExport from '../qa/evidence/life-current-export.json?raw';
import firstReturn from '../qa/fixtures/return-main-v0.3.0.json?raw';
import {act,tick,restore,snapshot,interactionPoint,objective} from '../src/game/model';
import {canalInsideChannel,canalWaterState} from '../src/game/canal';
import type {GameAction,GameState,Vec} from '../src/game/contracts';

const run=(s:GameState,seconds:number)=>{for(let t=0;t<seconds-1e-8;t+=.025)tick(s,Math.min(.025,seconds-t),{x:0,y:0});};
const action=(s:GameState,a:GameAction)=>{const r=act(s,a);expect(r.ok,`${JSON.stringify(a)}: ${r.message}`).toBe(true);};
const entity=(s:GameState,id:string)=>Object.values(s.worlds).flat().find(e=>e.id===id)!;
function walk(s:GameState,p:Vec){action(s,{type:'move',point:p});let frames=0;while(s.player.path.length&&frames++<4000)run(s,.025);expect(frames,`arrive ${JSON.stringify(p)}`).toBeLessThan(4000);}
function touch(s:GameState,id:string){const p=interactionPoint(s,id);expect(p,`reachable ${id}`).toBeDefined();walk(s,p!);action(s,{type:'interact',targetId:id});}
function choose(s:GameState,id:string){let pages=0;while(!s.dialogue?.choices.some(c=>c.id===id)&&s.dialogue?.choices.some(c=>c.id==='more')&&pages++<8)action(s,{type:'choose',choiceId:'more'});action(s,{type:'choose',choiceId:id});}
function imported(raw=firstReturn){const s=restore(raw);if(s.dialogue)choose(s,'leave');action(s,{type:'pause',value:false});return s;}
function lifeHome(){const s=imported(lifeExport);expect(s.life.clamp).toBe('bag');touch(s,'to_creek');touch(s,'to_home');return s;}
function prepareHold(s:GameState){touch(s,'workbench');choose(s,'hold');touch(s,'rest_home');expect(s.ringStyle).toBe('hold');}
function enter(s:GameState){touch(s,'table');choose(s,'canal:accept');touch(s,'to_creek');choose(s,'canal:depart:canal');touch(s,'canal_inspect');choose(s,'leave');}
function stopHeld(s:GameState){walk(s,{x:1230,y:410});action(s,{type:'cast',spell:'pull',targetId:'canal_stop',point:{x:1200,y:350}});run(s,.5);action(s,{type:'hold'});}
function finish(s:GameState){touch(s,'canal_tub');expect(s.canal.stage).toBe('verified');touch(s,'canal_keeper');choose(s,'canal:report');touch(s,'canal_to_home');touch(s,'table');choose(s,'canal:record');expect(s.canal.stage).toBe('complete');expect(restore(snapshot(s)).canal).toEqual(s.canal);}
function diversion(s:GameState){touch(s,'canal_diverter');run(s,3.1);touch(s,'canal_screen');run(s,2.1);expect(s.canal.method).toBe('diversion');touch(s,'canal_diverter');run(s,2.1);finish(s);}
function pausedRound(s:GameState){action(s,{type:'pause',value:true});const raw=snapshot(s),loaded=restore(raw);run(loaded,4);expect(snapshot(loaded)).toBe(raw);action(loaded,{type:'pause',value:false});return loaded;}

describe('旧渠变式：真实旧版导出起步，以模型行走和动作完成工序（非浏览器证据）',()=>{
 it('把真实生活奖励压扣带到旧渠，留势扣稳、清理、上岸取回并归家',()=>{
  let s=lifeHome();prepareHold(s);enter(s);stopHeld(s);touch(s,'canal_eye');choose(s,'canal:clamp:install');
  expect(s.life.clamp).toBe('canal');expect(s.player.pullId).toBeNull();expect(Object.values(s.worlds).flat().filter(e=>e.state==='clamped')).toHaveLength(1);
  s=pausedRound(s);expect(entity(s,'canal_stop').state).toBe('clamped');run(s,1.1);touch(s,'canal_screen');run(s,2.1);expect(s.canal.method).toBe('clamp');
  walk(s,{x:1200,y:500});touch(s,'canal_eye');expect(act(s,{type:'choose',choiceId:'canal:clamp:remove'}).ok).toBe(false);expect(s.life.clamp).toBe('canal');choose(s,'leave');
  walk(s,{x:1230,y:410});touch(s,'canal_eye');choose(s,'canal:clamp:remove');expect(s.life.clamp).toBe('bag');expect(Object.values(s.worlds).flat().filter(e=>e.state==='clamped')).toHaveLength(0);
  finish(s);expect(s.canal.usedClamp).toBe(true);expect(s.life.clamp).toBe('bag');expect(s.player.hp).toBe(4);
 });
 it('徒手推板和清框半途均可暂停导出载入，计时不偷跑，槽口继续承托',()=>{
  let s=imported();enter(s);touch(s,'canal_diverter');run(s,.65);expect(s.canal.work?.kind).toBe('divert');s=pausedRound(s);expect(s.canal.work?.elapsed).toBeCloseTo(.65);
  run(s,2.5);expect(canalWaterState(s)).toBe('diverted');touch(s,'canal_screen');run(s,.8);s=pausedRound(s);expect(s.canal.work?.kind).toBe('clear');expect(s.canal.work?.elapsed).toBeCloseTo(.8);expect(entity(s,'canal_diverter').x).toBe(680);
  run(s,1.3);expect(s.canal.cleared).toBe(true);touch(s,'canal_diverter');run(s,2.1);finish(s);
 });
 it('清框时过早放开截水会先预告，再一次受伤上岸；之后仍能改用分水完成',()=>{
  let s=imported();prepareHold(s);enter(s);stopHeld(s);run(s,1.1);touch(s,'canal_screen');run(s,.3);expect(canalInsideChannel(s.player)).toBe(true);const hp=s.player.hp,hold=s.player.hold;s=pausedRound(s);expect(s.player.hold).toBe(hold);expect(s.canal.work?.kind).toBe('clear');
  action(s,{type:'release'});expect(s.canal.work).toBeNull();run(s,.025);expect(s.canal.surge).toBe(0);expect(s.player.hp).toBe(hp);run(s,1.1);expect(s.player.hp).toBe(hp);run(s,.2);
  expect(s.player.hp).toBe(hp-1);expect(canalInsideChannel(s.player)).toBe(false);expect(s.canal.cleared).toBe(false);run(s,3);expect(s.player.hp).toBe(hp-1);diversion(s);expect(s.player.hp).toBe(hp-1);
 });
 it('实际把唯一压扣留在旧眺台；空药零灵力仍能完成新渠且不自动收扣',()=>{
  const s=lifeHome();prepareHold(s);touch(s,'to_creek');walk(s,{x:960,y:370});action(s,{type:'cast',spell:'pull',targetId:'platform_beam',point:{x:980,y:285}});run(s,.7);action(s,{type:'hold'});touch(s,'life_lookout_eye');choose(s,'life:clamp:install');expect(s.life.clamp).toBe('lookout');
  touch(s,'to_home');enter(s);
  // Boundary resource fixture only: the installation and all adventure outcomes above/below use real actions.
  s.player.mana=0;s.life.sachets=0;s.life.scent=null;entity(s,'life_scent').state='hidden';const before=restore(snapshot(s));expect(before.life.clamp).toBe('lookout');
  diversion(s);expect(s.player.mana).toBe(0);expect(s.life.sachets).toBe(0);expect(s.life.clamp).toBe('lookout');expect(entity(s,'platform_beam')).toMatchObject({state:'clamped',x:980,y:285});expect(Object.values(s.worlds).flat().filter(e=>e.state==='clamped')).toHaveLength(1);
 });
 it('已接取旧渠时，仍可走原路继续两项生活委托并获得当地任务指引',()=>{
  const s=imported();touch(s,'tao');choose(s,'life:repair:accept');touch(s,'herb_rack');choose(s,'life:harvest:accept');touch(s,'table');choose(s,'canal:accept');touch(s,'to_creek');choose(s,'canal:depart:creek');
  expect(s.life.harvest.stage).toBe('active');expect(s.life.repair.stage).toBe('active');touch(s,'to_workshop');touch(s,'life_hearth');expect(entity(s,'life_hearth').state).toBe('loaded');expect(objective(s)).toMatch(/炉芯|挂扣|旧胶/);
 });
});

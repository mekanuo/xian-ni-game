import {describe,it,expect} from 'vitest';
import {createGame,act,tick,interactionPoint,canInteract} from '../src/game/model';
const make=()=>createGame({name:'行舟',origin:'tinker',wish:'travel',appearance:0});
const run=(s:ReturnType<typeof make>,seconds:number)=>{for(let t=0;t<seconds;t+=.025)tick(s,.025,{x:0,y:0});};
describe('旧渠与原世界整合',()=>{
 it('首章原出口不加目的地选择；接信以后明确选择第五图',()=>{
  const s=make();s.player.x=1580;s.player.y=690;
  expect(act(s,{type:'interact',targetId:'to_creek'}).ok).toBe(true);expect(s.scene).toBe('creek');
  s.scene='home';s.player.x=1580;s.player.y=690;s.flags.endingWish='travel';s.canal.stage='active';
  expect(act(s,{type:'interact',targetId:'to_creek'}).ok).toBe(true);expect(s.scene).toBe('home');
  expect(s.dialogue?.choices.map(c=>c.id)).toContain('canal:depart:canal');
  expect(act(s,{type:'choose',choiceId:'canal:depart:canal'}).ok).toBe(true);expect(s.scene).toBe('canal');
  expect(s.flags.visited_canal).toBe(true);expect(s.lastSafe.scene).toBe('canal');
 });
 it('旧工棚气味留在原地，切图既不能复制也不能偷跑计时',()=>{
  const s=make();s.scene='workshop';s.life.sachets=2;
  expect(act(s,{type:'use-sachet'}).ok).toBe(true);expect(s.life.scent?.scene).toBe('workshop');
  s.scene='canal';const before=s.life.scent!.remaining;run(s,1);
  expect(s.life.scent!.remaining).toBe(before);expect(act(s,{type:'use-sachet'}).ok).toBe(false);expect(s.life.sachets).toBe(1);
  s.scene='workshop';run(s,8);expect(s.life.scent).toBeNull();s.scene='canal';
  expect(act(s,{type:'use-sachet'}).ok).toBe(true);expect(s.life.scent?.scene).toBe('canal');
  expect(s.worlds.canal.find(e=>e.id==='canal_scent')!.state).toBe('idle');
  expect(s.worlds.workshop.find(e=>e.id==='life_scent')!.state).toBe('hidden');
 });
 it('干坡外缘允许空行囊玩家往返，内弯兽不越界追咬',()=>{
  const s=make();s.scene='canal';s.player.x=1580;s.player.y=660;
  const beast=s.worlds.canal.find(e=>e.id==='canal_beast_a')!;run(s,8);
  expect(s.player.hp).toBe(4);expect(beast.state).toBe('idle');expect(beast.x).toBe(beast.homeX);
 });
 it('点击退水后的筛框，会选渠底真实站位而非隔岸空伸手',()=>{
  const s=make();s.scene='canal';s.canal.stage='active';s.canal.inspected=true;s.canal.drain=1;
  s.worlds.canal.find(e=>e.id==='canal_diverter')!.x=680;s.player.x=990;s.player.y=540;
  expect(canInteract(s,'canal_screen')).toBe(false);
  const point=interactionPoint(s,'canal_screen')!;expect(point.x).toBeGreaterThanOrEqual(1030);expect(point.y).toBeGreaterThanOrEqual(460);expect(point.y).toBeLessThanOrEqual(620);
 });

 it('许照从东岸绕行时不会抄近路踏入暂干渠底',()=>{
  const s=make();s.scene='canal';s.canal.stage='active';s.canal.drain=1;
  s.worlds.canal.find(e=>e.id==='canal_diverter')!.x=680;s.player.x=1230;s.player.y=410;s.flags.companion='following';
  const xu=s.worlds.canal.find(e=>e.type==='xu')!;xu.x=1260;xu.y=540;
  for(let i=0;i<240;i++){run(s,.025);expect(xu.x>=1030&&xu.x<=1220&&xu.y>=460&&xu.y<=620).toBe(false);}
  expect(Math.hypot(xu.x-990,xu.y-540)).toBeLessThan(25);
 });

 it('许照沿安全外缘同行时，不被内弯守窝兽隔空困住',()=>{
  const s=make();s.scene='canal';s.canal.stage='active';s.player.x=1580;s.player.y=350;s.flags.companion='following';
  const xu=s.worlds.canal.find(e=>e.type==='xu')!;xu.x=1570;xu.y=660;run(s,10);
  expect(Math.hypot(xu.x-s.player.x,xu.y-s.player.y)).toBeLessThan(100);expect(s.player.hp).toBe(4);
 });

});

import {describe,it,expect} from 'vitest';
import {act,tick,restore,snapshot,interactionPoint,objective} from '../src/game/model';
import type {GameState,GameAction} from '../src/game/contracts';
import {inspectObject} from '../src/game/encounters';
import completed from '../qa/fixtures/return-canal-v0.4.0.json?raw';
const step=(s:GameState,n=1)=>{for(let i=0;i<n;i++)tick(s,.025,{x:0,y:0});};
const action=(s:GameState,a:GameAction)=>expect(act(s,a).ok,JSON.stringify(a)).toBe(true);
function walk(s:GameState,x:number,y:number){action(s,{type:'move',point:{x,y}});for(let i=0;s.player.path.length&&i<8000;i++)step(s);expect(s.player.path).toHaveLength(0);expect(Math.hypot(s.player.x-x,s.player.y-y)).toBeLessThan(4);}
function touch(s:GameState,id:string){const point=interactionPoint(s,id);expect(point,id).toBeDefined();walk(s,point!.x,point!.y);action(s,{type:'interact',targetId:id});}
function choose(s:GameState,id:string){for(let i=0;i<15&&!s.dialogue?.choices.some(c=>c.id===id);i++)action(s,{type:'choose',choiceId:'more'});action(s,{type:'choose',choiceId:id});}
function ready(mode='together',plan='north'){const s=restore(completed);if(s.dialogue)choose(s,'leave');action(s,{type:'pause',value:false});touch(s,'table');choose(s,`journey:agree:${mode}`);touch(s,'to_creek');choose(s,'canal:depart:creek');touch(s,'to_workshop');walk(s,300,300);walk(s,1600,330);walk(s,1600,720);walk(s,1440,720);step(s,80);touch(s,'xu_work');choose(s,`journey:start:${mode}:${plan}`);return s;}
describe('journey through authoritative movement and scene transitions',()=>{
 it('walks the northern return with an actual leading companion, then opens a rest and records it once',()=>{
  const s=ready(),mana=s.player.mana;const xu=()=>s.worlds.workshop.find(e=>e.id==='xu_work')!;
  expect(s.journey.run?.playerGate).toBe(false);let last={x:xu().x,y:xu().y},moved=0;
  for(let i=0;i<5000;i++){
   if(i%20===0&&Math.hypot(s.player.x-xu().x,s.player.y-xu().y)>70)action(s,{type:'move',point:{x:xu().x,y:xu().y}});
   step(s);const d=Math.hypot(xu().x-last.x,xu().y-last.y);expect(d).toBeLessThanOrEqual(145*.025+.001);moved+=d;last={x:xu().x,y:xu().y};
   if(Math.hypot(xu().x-220,xu().y-780)<30)break;
  }
  expect(moved).toBeGreaterThan(1800);expect(Math.hypot(xu().x-220,xu().y-780)).toBeLessThan(30);
  walk(s,220,780);expect(s.journey.run?.playerGate).toBe(true);expect(s.journey.run?.companionGate).toBe(true);
  touch(s,'to_creek');expect(s.scene).toBe('creek');expect(s.journey.sharedRoute).toBe('north');expect(s.journey.restOpened).toBe(false);
  touch(s,'shelter');choose(s,'journey:rest');expect(s.journey.stage).toBe('ready');expect(s.journey.restOpened).toBe(true);
  expect(restore(snapshot(s)).journey).toEqual(s.journey);
  touch(s,'to_home');touch(s,'table');choose(s,'journey:record');expect(s.journey.stage).toBe('complete');expect(s.journey.recordedShared).toBe(true);expect(s.player.mana).toBe(mana);
  touch(s,'table');expect(s.dialogue?.choices.some(c=>c.id==='journey:record')).toBe(false);
 });
 it('stops before the live southern beasts and completes an explicitly changed northern return',()=>{
  const s=ready('together','south'),hp=s.player.hp,n=s.worlds.workshop.find(e=>e.id==='xu_work')!;
  for(let i=0;i<1600;i++){
   if(i%20===0&&Math.hypot(s.player.x-n.x,s.player.y-n.y)>70)action(s,{type:'move',point:{x:n.x,y:n.y}});
   step(s);if(n.state==='waiting'&&!s.journey.run?.waiting&&s.journey.run!.next!>=3)break;
  }
  expect(n.state).toBe('waiting');expect(n.x).toBeGreaterThan(1200);walk(s,1320,860);expect(s.journey.run?.viaSouth).toBe(true);expect(s.journey.run?.companionGate).toBe(false);
  touch(s,'xu_work');choose(s,'journey:change:north');expect(s.journey.run?.plan).toBe('north');
  for(let i=0;i<6000;i++){
   if(i%20===0&&Math.hypot(s.player.x-n.x,s.player.y-n.y)>70)action(s,{type:'move',point:{x:n.x,y:n.y}});
   step(s);if(Math.hypot(n.x-220,n.y-780)<30)break;
  }
  expect(Math.hypot(n.x-220,n.y-780)).toBeLessThan(30);walk(s,220,780);touch(s,'to_creek');
  expect(s.journey.sharedRoute).toBe('mixed');expect(s.player.hp).toBe(hp);expect(s.worlds.workshop.filter(e=>e.kind==='enemy').every(e=>e.hp===3)).toBe(true);
 });
 it('lets the player leave early without teleporting a companion into a shared outcome',()=>{
  const s=ready();touch(s,'xu_work');choose(s,'wait');walk(s,1600,330);walk(s,320,250);walk(s,220,780);
  expect(s.journey.run?.playerGate).toBe(true);expect(s.journey.run?.companionGate).toBe(false);touch(s,'to_creek');expect(s.dialogue?.id).toBe('journey_exit');
  choose(s,'journey:leave-alone');expect(s.scene).toBe('creek');expect(s.journey.sharedRoute).toBeNull();expect(s.journey.soloRoute).toBe('north');expect(s.flags.companion).toBe('waiting');
 });
 it('can start alone at the eastern rest while Xu remains at an earlier waiting point',()=>{
  const s=ready();walk(s,1600,330);walk(s,1000,250);touch(s,'xu_work');choose(s,'wait');touch(s,'xu_work');choose(s,'journey:stop');
  const n=s.worlds.workshop.find(e=>e.id==='xu_work')!,waiting={x:n.x,y:n.y};
  walk(s,1600,330);walk(s,1600,720);walk(s,1440,720);touch(s,'rest_workshop');
  expect(s.dialogue?.choices.some(c=>c.id==='journey:start:solo:north')).toBe(true);choose(s,'journey:start:solo:north');
  expect(s.journey.run?.mode).toBe('solo');expect(s.flags.companion).toBe('waiting');expect({x:n.x,y:n.y}).toEqual(waiting);
 });
 it('keeps an accepted repair visible when the new journey is only an agreement',()=>{
  const s=restore(completed);if(s.dialogue)choose(s,'leave');action(s,{type:'pause',value:false});touch(s,'table');choose(s,'journey:agree:solo');touch(s,'workbench');choose(s,'life:repair:accept');
  expect(s.journey.run).toBeNull();expect(objective(s)).toMatch(/挂扣|炉/);
 });
 it('finishes alone first and only adds Xu’s marks after a later actual shared return',()=>{
  const s=ready('solo');walk(s,1600,330);walk(s,320,250);walk(s,220,780);touch(s,'to_creek');touch(s,'shelter');choose(s,'journey:rest');touch(s,'to_home');touch(s,'table');choose(s,'journey:record');
  expect(s.journey.soloRoute).toBe('north');expect(s.journey.sharedRoute).toBeNull();expect(s.journey.recordedShared).toBe(false);
  const restSeq=s.events.find(e=>e.text.includes('你在棚内干地展开坐垫'))!.seq;
  touch(s,'xu');choose(s,'invite');touch(s,'table');choose(s,'journey:agree:together');touch(s,'to_creek');choose(s,'canal:depart:creek');touch(s,'to_workshop');walk(s,300,300);walk(s,1600,330);walk(s,1600,720);walk(s,1440,720);step(s,80);touch(s,'xu_work');choose(s,'journey:start:together:north');
  const n=s.worlds.workshop.find(e=>e.id==='xu_work')!;
  for(let i=0;i<5000;i++){
   if(i%20===0&&Math.hypot(s.player.x-n.x,s.player.y-n.y)>70)action(s,{type:'move',point:{x:n.x,y:n.y}});
   step(s);if(Math.hypot(n.x-220,n.y-780)<30)break;
  }
  walk(s,220,780);touch(s,'to_creek');expect(s.journey.sharedRoute).toBe('north');expect(s.journey.recordedShared).toBe(false);expect(s.journey.stage).toBe('complete');
  touch(s,'to_home');touch(s,'table');choose(s,'journey:record');expect(s.journey.recordedShared).toBe(true);expect(s.journey.soloRoute).toBe('north');
  expect(s.events.filter(e=>e.text.includes('你在棚内干地展开坐垫')).map(e=>e.seq)).toEqual([restSeq]);expect(restore(snapshot(s)).journey).toEqual(s.journey);
 });
 it('keeps a wet-basket refusal visible instead of replacing it with old canal praise',()=>{
  const s=restore(completed);if(s.dialogue)choose(s,'leave');action(s,{type:'pause',value:false});
  // Boundary fixture: the existing refusal may coexist with completed canal history.
  s.flags.herbsWet=true;s.flags.companion='refused';touch(s,'xu');
  expect(inspectObject(s,s.worlds.home.find(e=>e.id==='xu')!)).toContain('受潮');expect(s.dialogue?.text).toContain('受潮');expect(s.dialogue?.text).toContain('导水板');expect(s.dialogue?.choices.some(c=>c.id==='invite')).toBe(false);
 });
 it('freezes actual leader and individual progress while paused and survives a paused save',()=>{
  const s=ready();step(s,80);action(s,{type:'pause',value:true});const before=snapshot(s);step(s,100);expect(snapshot(s)).toBe(before);
  const loaded=restore(before);expect(loaded.journey).toEqual(s.journey);expect(loaded.worlds.workshop.find(e=>e.id==='xu_work')).toEqual(s.worlds.workshop.find(e=>e.id==='xu_work'));
 });
});

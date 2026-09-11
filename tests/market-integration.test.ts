import complete from '../qa/fixtures/return-journey-v0.5.0.json?raw';
import {restore,snapshot} from '../src/game/save';
import {describe,it,expect} from 'vitest';
import {act,createGame,companionAvailable,tick} from '../src/game/model';

describe('production market chapter integration',()=>{
 it('new characters retain the old opening and cannot enter an unearned market chapter',()=>{
  const s=createGame({name:'行舟',origin:'tinker',wish:'travel',appearance:0});
  expect(s.scene).toBe('home');expect(s.player.mana).toBe(6);expect(s.journey.stage).toBe('unaccepted');
  expect(s.worlds.market?.find(e=>e.id==='xu_market')?.state).toBe('hidden');
  const gate=s.worlds.crossing.find(e=>e.id==='crossing_to_market');
  expect(gate?.state).toBe('hidden');
  // Synthetic boundary: visibility tampering is not chapter authorization.
  s.scene='crossing';Object.assign(s.player,{x:1660,y:600});gate!.state='idle';
  expect(act(s,{type:'interact',targetId:'crossing_to_market'}).ok).toBe(false);
  expect(s.scene).toBe('crossing');expect(s.market.visit).toBeNull();
 });
});

// Each case starts from an explicitly positioned, delivered completed-chapter
// fixture. Entry/reunion/exit are actual actions, not synthetic travel calls.
function party(){const s=restore(complete);s.paused=false;s.dialogue=null;s.scene='crossing';s.flags.companion='following';Object.assign(s.player,{x:1660,y:590,path:[]});return s;}
describe('market companion location integration',()=>{
 it('enters together, waits in place and cannot reappear through old shelter or rope choices',()=>{
  const s=party();expect(act(s,{type:'interact',targetId:'crossing_to_market'}).ok).toBe(true);
  const xu=s.worlds.market.find(e=>e.id==='xu_market')!;expect(xu.state).toBe('following');expect(companionAvailable(s)).toBe(true);
  expect(act(s,{type:'interact',targetId:'xu_market'}).ok).toBe(true);expect(act(s,{type:'choose',choiceId:'wait'}).ok).toBe(true);
  const feet={x:xu.x,y:xu.y};expect(xu.state).toBe('waiting');
  expect(act(s,{type:'move',point:{x:290,y:760}}).ok).toBe(true);for(let i=0;i<30;i++)tick(s,.025,{x:0,y:0});
  expect(act(s,{type:'interact',targetId:'market_entry'}).ok).toBe(true);expect(s.scene).toBe('crossing');expect(companionAvailable(s)).toBe(false);
  expect({x:xu.x,y:xu.y}).toEqual(feet);expect(restore(snapshot(s)).worlds.market.find(e=>e.id===xu.id)).toEqual(xu);
  // Old-scene contact boundaries, no claim of having walked between them.
  s.scene='creek';Object.assign(s.player,{x:1200,y:550});expect(act(s,{type:'interact',targetId:'shelter'}).ok).toBe(true);
  expect(s.dialogue!.speaker).toBe('斜雨棚');expect(s.dialogue!.choices.map(c=>c.id)).not.toContain('regroup');expect(act(s,{type:'choose',choiceId:'leave'}).ok).toBe(true);
  Object.assign(s.player,{x:535,y:700});expect(act(s,{type:'interact',targetId:'rope'}).ok).toBe(true);
  expect(s.dialogue!.choices.map(c=>c.id)).not.toContain('cooperate');expect(s.dialogue!.choices.map(c=>c.id)).toContain('fix');
 });
 it('rejects a blocked arrival before clearing the source visit or companion',()=>{
  const s=party(),door=s.worlds.market.find(e=>e.id==='market_door')!;Object.assign(door,{x:360,y:760});
  const before=snapshot(s);expect(act(s,{type:'interact',targetId:'crossing_to_market'}).ok).toBe(false);expect(snapshot(s)).toBe(before);
 });
 it('a refusal in the market keeps local feet instead of chasing another maps safe point',()=>{
  const s=party();expect(act(s,{type:'interact',targetId:'crossing_to_market'}).ok).toBe(true);
  const xu=s.worlds.market.find(e=>e.id==='xu_market')!;const feet={x:xu.x,y:xu.y};s.flags.companion='refused';
  tick(s,.5,{x:0,y:0});expect({x:xu.x,y:xu.y}).toEqual(feet);expect(xu.state).toBe('refused');
 });
});

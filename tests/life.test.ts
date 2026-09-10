import { describe, it, expect } from 'vitest';
import { createGame, act, tick, snapshot, restore } from '../src/game/model';
import type { GameState } from '../src/game/contracts';
const profile={name:'行舟',origin:'tinker' as const,wish:'travel' as const,appearance:0 as const};
const advance=(s:GameState,t:number)=>{for(let i=0;i<Math.ceil(t/.05);i++)tick(s,.05,{x:0,y:0});};
const get=(s:GameState,id:string)=>s.worlds[s.scene].find(e=>e.id===id)!;
function finished(){const s=createGame(profile);s.ended=true;s.flags.endingWish='travel';s.flags.ringOwned=true;s.flags.ringTrained=true;s.ringStyle='long';return s;}
function choice(s:GameState,id:string){for(let i=0;i<8&&!s.dialogue?.choices.some(c=>c.id===id);i++)act(s,{type:'choose',choiceId:'more'});return act(s,{type:'choose',choiceId:id});}
function acceptRepair(s:GameState){s.scene='home';s.player.x=480;s.player.y=660;expect(act(s,{type:'interact',targetId:'tao'}).ok).toBe(true);expect(choice(s,'life:repair:accept').ok).toBe(true);s.scene='workshop';s.player.x=1380;s.player.y=485;}
function heat(s:GameState){expect(act(s,{type:'interact',targetId:'life_hearth'}).ok).toBe(true);expect(act(s,{type:'cast',spell:'flame',targetId:'life_hearth',point:{x:1320,y:430}}).ok).toBe(true);advance(s,1);expect(s.life.repair.softened).toBe(true);}
function jaw(s:GameState){s.player.x=1410;s.player.y=620;expect(act(s,{type:'cast',spell:'pull',targetId:'life_jaw',point:{x:1420,y:570}}).ok).toBe(true);advance(s,.5);expect(get(s,'life_jaw').x).toBeCloseTo(1420,0);}
function pressure(s:GameState){expect(act(s,{type:'interact',targetId:'life_press'}).ok).toBe(true);expect(s.life.repair.latched).toBe(true);act(s,{type:'release'});expect(act(s,{type:'interact',targetId:'life_press'}).ok).toBe(true);advance(s,1.1);expect(s.life.repair.stage).toBe('ready');}
describe('home-life actual model actions',()=>{
 it('keeps commissions locked before the real table ending',()=>{const s=createGame(profile);s.player.x=480;s.player.y=660;act(s,{type:'interact',targetId:'tao'});expect(choice(s,'life:repair:accept').ok).toBe(false);expect(s.life.repair.stage).toBe('unaccepted');});
 it('repairs with a mechanical stop and rewards once, only after actual pressure test',()=>{const s=finished();acceptRepair(s);expect(act(s,{type:'interact',targetId:'life_press'}).ok).toBe(false);heat(s);s.player.x=1410;s.player.y=620;act(s,{type:'interact',targetId:'life_press'});expect(choice(s,'life:repair:stop').ok).toBe(true);jaw(s);act(s,{type:'release'});advance(s,.5);expect(get(s,'life_jaw').x).toBeCloseTo(1420,0);pressure(s);s.scene='home';s.player.x=480;s.player.y=660;act(s,{type:'interact',targetId:'tao'});expect(choice(s,'life:repair:deliver').ok).toBe(true);expect(s.life.clamp).toBe('bag');expect(choice(s,'life:repair:deliver').ok).toBe(false);expect(restore(snapshot(s)).life.clamp).toBe('bag');});
 it('uses hold without stop; pause freezes support and pressure needs a free hand',()=>{const s=finished();acceptRepair(s);heat(s);s.ringStyle='hold';jaw(s);expect(act(s,{type:'interact',targetId:'life_press'}).ok).toBe(false);act(s,{type:'hold'});act(s,{type:'pause',value:true});advance(s,9);expect(s.player.hold).toBe(8);act(s,{type:'pause',value:false});pressure(s);expect(s.life.repair.method).toBe('hold');});
 it('an unsupported released jaw returns and cannot certify itself',()=>{const s=finished();acceptRepair(s);heat(s);jaw(s);act(s,{type:'release'});advance(s,1);expect(get(s,'life_jaw').x).toBe(1360);expect(s.life.repair.tested).toBe(false);});
 it('collects shade from safe east with no mana, pauses and movement cancel correctly',()=>{const s=finished();s.scene='home';s.player.x=1120;s.player.y=710;act(s,{type:'interact',targetId:'xu'});expect(choice(s,'life:harvest:accept').ok).toBe(true);s.scene='creek';s.player.x=1455;s.player.y=680;s.player.mana=0;expect(act(s,{type:'interact',targetId:'life_shade_leaf'}).ok).toBe(true);act(s,{type:'pause',value:true});advance(s,3);expect(s.life.harvest.shade).toBe('unpicked');act(s,{type:'pause',value:false});advance(s,.5);act(s,{type:'move',point:{x:1480,y:700}});advance(s,2);expect(s.life.harvest.shade).toBe('unpicked');s.player.x=1455;s.player.y=680;s.player.path=[];act(s,{type:'interact',targetId:'life_shade_leaf'});advance(s,2.1);expect(s.life.harvest.shade).toBe('bag');expect(s.player.hp).toBe(4);expect(s.life.sachets).toBe(0);});
});

function harvestStart(){const s=finished();s.player.x=1120;s.player.y=710;act(s,{type:'interact',targetId:'xu'});expect(choice(s,'life:harvest:accept').ok).toBe(true);return s;}
function collectBoth(s:GameState){s.scene='creek';s.player.x=1420;s.player.y=270;expect(act(s,{type:'interact',targetId:'life_sun_leaf'}).ok).toBe(true);advance(s,2.1);s.player.x=1455;s.player.y=680;expect(act(s,{type:'interact',targetId:'life_shade_leaf'}).ok).toBe(true);advance(s,2.1);expect(s.life.harvest.stage).toBe('ready');}
function rackChoice(s:GameState,id:string){s.scene='home';s.player.x=350;s.player.y=435;act(s,{type:'interact',targetId:'herb_rack'});return choice(s,id);}
function herbsReward(){const s=harvestStart();collectBoth(s);expect(rackChoice(s,'life:leaf:sun:upper').ok).toBe(true);expect(rackChoice(s,'life:leaf:shade:lower').ok).toBe(true);expect(rackChoice(s,'life:harvest:deliver').ok).toBe(true);return s;}
function clampReward(){const s=finished();acceptRepair(s);heat(s);s.ringStyle='hold';jaw(s);act(s,{type:'hold'});pressure(s);s.scene='home';s.player.x=480;s.player.y=660;act(s,{type:'interact',targetId:'tao'});expect(choice(s,'life:repair:deliver').ok).toBe(true);return s;}
describe('finite physical rewards and interruption',()=>{
 it('corrects wrong drying layers and issues only two sachets once',()=>{
  const s=harvestStart();collectBoth(s);expect(restore(snapshot(s)).life.harvest.sun).toBe('bag');
  expect(rackChoice(s,'life:leaf:sun:lower').ok).toBe(true);expect(rackChoice(s,'life:leaf:shade:lower').ok).toBe(false);
  act(s,{type:'choose',choiceId:'leave'});expect(rackChoice(s,'life:harvest:deliver').ok).toBe(false);act(s,{type:'choose',choiceId:'leave'});
  expect(rackChoice(s,'life:leaf:sun:bag').ok).toBe(true);expect(rackChoice(s,'life:leaf:sun:upper').ok).toBe(true);expect(rackChoice(s,'life:leaf:shade:lower').ok).toBe(true);expect(rackChoice(s,'life:harvest:deliver').ok).toBe(true);
  expect(s.life.sachets).toBe(2);expect(rackChoice(s,'life:harvest:deliver').ok).toBe(false);expect(s.life.sachets).toBe(2);
 });
 it('a real directional ward intercepts rock while gathering; unprotected impact cancels',()=>{
  const s=harvestStart();s.scene='creek';s.player.x=1380;s.player.y=690;
  act(s,{type:'cast',spell:'ward',point:{x:1380,y:555}});act(s,{type:'interact',targetId:'life_shade_leaf'});advance(s,2.1);
  expect(s.events.some(e=>e.type==='block')).toBe(true);expect(s.player.hp).toBe(4);expect(s.life.harvest.shade).toBe('bag');
  const exposed=harvestStart();exposed.scene='creek';exposed.player.x=1380;exposed.player.y=690;act(exposed,{type:'interact',targetId:'life_shade_leaf'});advance(exposed,2.1);expect(exposed.player.hp).toBe(3);expect(exposed.life.harvest.shade).toBe('unpicked');
 });
 it('never invents shared gathering from a distant or refusing companion',()=>{
  const s=harvestStart();s.flags.companion='refused';collectBoth(s);expect(s.life.harvest.shared).toBe(false);
 });
 it('clamp supports a real moved practice piece and cannot duplicate',()=>{
  const s=clampReward();s.player.x=1030;s.player.y=535;act(s,{type:'cast',spell:'pull',targetId:'life_practice',point:{x:1030,y:500}});advance(s,.3);act(s,{type:'release'});act(s,{type:'interact',targetId:'life_home_eye'});expect(choice(s,'life:clamp:install').ok).toBe(true);expect(s.life.clamp).toBe('home');
  expect(act(s,{type:'cast',spell:'pull',targetId:'life_practice',point:{x:1020,y:500}}).ok).toBe(false);
  act(s,{type:'release'});expect(get(s,'life_practice').state).toBe('clamped');expect(restore(snapshot(s)).life.clamp).toBe('home');
  act(s,{type:'interact',targetId:'life_home_eye'});expect(choice(s,'life:clamp:remove').ok).toBe(true);expect(s.life.clamp).toBe('bag');
 });
 it('clamped beam survives releasing magic and expires safely without closing permanent ladder',()=>{
  const s=clampReward();s.scene='creek';s.player.x=995;s.player.y=385;s.player.mana=6;
  expect(act(s,{type:'cast',spell:'pull',targetId:'platform_beam',point:{x:980,y:285}}).ok).toBe(true);advance(s,.6);act(s,{type:'hold'});s.player.x=985;s.player.y=335;
  act(s,{type:'interact',targetId:'life_lookout_eye'});expect(choice(s,'life:clamp:install').ok).toBe(true);act(s,{type:'release'});advance(s,9);expect(s.flags.platformOpen).toBe(true);expect(get(s,'platform_beam').state).toBe('clamped');
  s.flags.platformReturn=true;act(s,{type:'interact',targetId:'life_lookout_eye'});expect(choice(s,'life:clamp:remove').ok).toBe(true);expect(s.flags.platformOpen).toBe(true);expect(s.life.clamp).toBe('bag');
 });
 it('sachet repels idle beast without damage; active repeat and paused cancel do not consume',()=>{
  const s=herbsReward();s.scene='workshop';s.player.x=700;s.player.y=800;
  act(s,{type:'pause',value:true});expect(act(s,{type:'use-sachet'}).ok).toBe(true);expect(s.life.sachets).toBe(2);act(s,{type:'cancel'});act(s,{type:'pause',value:false});expect(s.life.scent).toBe(null);expect(s.life.sachets).toBe(2);
  const beast=get(s,'beast_a');beast.state='idle';const before=Math.hypot(beast.x-s.player.x,beast.y-s.player.y);
  expect(act(s,{type:'use-sachet'}).ok).toBe(true);expect(act(s,{type:'use-sachet'}).ok).toBe(false);advance(s,.3);
  expect(Math.hypot(beast.x-get(s,'life_scent').x,beast.y-get(s,'life_scent').y)).toBeGreaterThan(before);expect(beast.hp).toBe(3);expect(s.life.sachets).toBe(1);expect(restore(snapshot(s)).life.scent).not.toBeNull();
  act(s,{type:'pause',value:true});advance(s,9);expect(s.life.scent).not.toBeNull();act(s,{type:'pause',value:false});advance(s,8);expect(s.life.scent).toBeNull();
 });
 it('sachet rejects human-only scene and retry restores reward/resource ledger atomically',()=>{
  const s=herbsReward();const source=snapshot(s);s.scene='crossing';expect(act(s,{type:'use-sachet'}).ok).toBe(false);expect(s.life.sachets).toBe(2);
  s.scene='workshop';s.player.x=700;s.player.y=800;act(s,{type:'use-sachet'});expect(s.life.sachets).toBe(1);act(s,{type:'retry'});expect(s.life.harvest.stage).toBe('complete');expect(s.life.sachets).toBe(2);expect(s.life.scent).toBeNull();expect(restore(source).life.sachets).toBe(2);
 });
});

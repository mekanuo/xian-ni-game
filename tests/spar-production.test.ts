import {expect,it} from 'vitest';
import fixture from '../qa/fixtures/return-main-v0.7.0.json?raw';
import {act,tick,restore,canInteract} from '../src/game/model';
import type {GameState} from '../src/game/contracts';
function arrive(){const s=restore(fixture);s.paused=false;s.dialogue=null;s.pending=null;s.scene='home';s.flags.companion='waiting';s.player.x=1500;s.player.y=480;
 expect(act(s,{type:'interact',targetId:'home_to_spar'}).ok).toBe(true);expect(s.scene).toBe('spar');return s;}
function wait(s:GameState,n:number){for(let i=0;i<n/.025;i++)tick(s,.025,{x:0,y:0});}
function agree(s:GameState,stance='front'){act(s,{type:'move',point:{x:900,y:1060}});wait(s,2);expect(canInteract(s,'spar_peer')).toBe(true);
 expect(act(s,{type:'interact',targetId:'spar_peer'}).ok).toBe(true);expect(act(s,{type:'choose',choiceId:`spar:agree:${stance}`}).ok).toBe(true);
 act(s,{type:'move',point:{x:900,y:940}});wait(s,4);expect(act(s,{type:'spar-begin'}).ok).toBe(true);}
it('a real imported return enters and resolves one actual hit without a free resource reset',()=>{
 const s=arrive(),hp=s.player.hp,mana=s.player.mana;agree(s);wait(s,4);
 expect(s.spar.run).toBeNull();expect(s.spar.last).toEqual({stance:'front',outcome:'hit',hurt:true});expect(s.player.hp).toBe(hp-1);expect(s.player.mana).toBe(mana);
 expect(s.spar.facts).toEqual(['front:hit']);expect(act(s,{type:'retry'}).ok).toBe(false);
});
it('after emission stopping keeps the same projectile live and forbids dialogue and healing',()=>{
 const s=arrive();agree(s);for(let i=0;i<100&&!s.projectiles.length;i++)tick(s,.025,{x:0,y:0});expect(s.projectiles).toHaveLength(1);
 const id=s.projectiles[0].id,hp=s.player.hp;expect(act(s,{type:'spar-stop'}).ok).toBe(true);
 expect(s.projectiles[0].id).toBe(id);expect(act(s,{type:'interact',targetId:'spar_peer'}).ok).toBe(false);expect(s.paused).toBe(false);
 expect(act(s,{type:'heal'}).ok).toBe(false);wait(s,2);expect(s.player.hp).toBe(hp-1);expect(s.spar.last?.outcome).toBe('stopped');expect(s.spar.last?.hurt).toBe(true);
});
it('a correctly directed ward resolves a real block and only spends its actual mana',()=>{
 const s=arrive();agree(s,'left');const mana=s.player.mana;
 expect(act(s,{type:'cast',spell:'flame',point:{x:680,y:940}}).ok).toBe(false);
 expect(act(s,{type:'cast',spell:'ward',point:{x:680,y:940}}).ok).toBe(true);wait(s,4);
 expect(s.spar.last?.outcome).toBe('blocked');expect(s.player.mana).toBe(mana-1);
});

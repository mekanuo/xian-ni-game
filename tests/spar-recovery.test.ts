import {expect,it} from 'vitest';
import old from '../qa/fixtures/return-main-v0.7.0.json?raw';
import {act,restore,tick,snapshot} from '../src/game/model';
function ready(){const s=restore(old);s.scene='home';s.paused=false;s.dialogue=null;s.flags.companion='waiting';s.player.x=1500;s.player.y=480;act(s,{type:'interact',targetId:'home_to_spar'});act(s,{type:'move',point:{x:900,y:1060}});for(let i=0;i<80;i++)tick(s,.025,{x:0,y:0});act(s,{type:'interact',targetId:'spar_peer'});act(s,{type:'choose',choiceId:'spar:agree:front'});act(s,{type:'move',point:{x:900,y:940}});for(let i=0;i<160;i++)tick(s,.025,{x:0,y:0});expect(act(s,{type:'spar-begin'}).ok).toBe(true);return s;}
it('an exceptional lethal condition does not replace the prior viable complete checkpoint',()=>{
 const s=ready(),prior=s.checkpoint!,resources=JSON.parse(prior).player;
 // Explicit exceptional boundary injection; legal one-shot HP>=2 play cannot do this.
 for(let i=0;i<100&&!s.projectiles.length;i++)tick(s,.025,{x:0,y:0});expect(s.projectiles.length).toBe(1);
 s.player.hp=1;
 for(let i=0;i<160&&!s.defeated;i++)tick(s,.025,{x:0,y:0});
 expect(s.defeated).toBe(true);expect(s.checkpoint).toBe(prior);
 expect(act(s,{type:'retry'}).ok).toBe(true);expect(s.player.hp).toBe(resources.hp);expect(s.player.mana).toBe(resources.mana);expect(()=>restore(snapshot(s))).not.toThrow();
});

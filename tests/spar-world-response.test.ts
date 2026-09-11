import {expect,it} from 'vitest';
import {act,createGame} from '../src/game/model';
function returned(){const s=createGame({name:'行舟',origin:'tinker',wish:'travel',appearance:0});Object.assign(s.flags,{returned:true,ringOwned:true,ringTrained:true,route:'main'});s.player.x=760;s.player.y=410;return s;}
it('finishing the first return opens the gate immediately in the same running game',()=>{
 const s=returned();expect(act(s,{type:'interact',targetId:'table'}).ok).toBe(true);expect(s.dialogue?.id).toBe('ending');
 expect(act(s,{type:'choose',choiceId:'travel'}).ok).toBe(true);expect(s.worlds.home.find(e=>e.id==='home_to_spar')?.state).toBe('idle');
});
it('reporting a real practice fact remains available without accepting the canal and preserves its offer',()=>{
 const s=returned();s.flags.endingWish='travel';s.spar.facts=['left:hit'];s.spar.last={stance:'left',outcome:'hit',hurt:true};
 expect(act(s,{type:'interact',targetId:'table'}).ok).toBe(true);
 expect(s.dialogue?.choices.some(c=>c.id==='spar:report')).toBe(true);
 expect(act(s,{type:'choose',choiceId:'spar:report'}).ok).toBe(true);expect(s.spar.reported).toEqual(['left:hit']);expect(s.canal.stage).toBe('unaccepted');
 expect(act(s,{type:'interact',targetId:'table'}).ok).toBe(true);expect(s.dialogue?.choices.some(c=>c.id==='canal:accept')).toBe(true);
});

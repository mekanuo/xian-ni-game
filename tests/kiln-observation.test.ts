import {describe,it,expect} from 'vitest';
import {createGame} from '../src/game/model';
import {nearbyEncounter,placementAnchors} from '../src/game/encounters';
function game(){const s=createGame({name:'行舟',origin:'tinker',wish:'travel',appearance:0});s.scene='kiln';s.kiln.visited=true;s.kiln.entry='west';Object.assign(s.player,{x:350,y:640});return s;}
describe('kiln local observation',()=>{
 it('describes actual burned cover loss without declaring the surviving enemies gone or changing the world',()=>{const s=game(),e=s.worlds.kiln.find(e=>e.id==='shield_board')!;e.state='burned';e.timer=0;const before=JSON.stringify(s),v=nearbyEncounter(s);expect(v?.fact).toContain('不再遮挡');expect(JSON.stringify(v)).not.toContain('已经安全');expect(JSON.stringify(s)).toBe(before);});
 it('does not describe a distant screen as immediately visible',()=>{const s=game();Object.assign(s.player,{x:1290,y:140});expect(nearbyEncounter(s)?.id).not.toBe('kiln-screen');});
 it('offers the original workspace only for this map’s held board, without issuing placement permission',()=>{const s=game();s.player.pullId='shield_board';const before=JSON.stringify(s);expect(placementAnchors(s)).toContainEqual({id:'kiln-screen-home',title:'晾坯屏原位',x:500,y:640});expect(JSON.stringify(s)).toBe(before);s.scene='crossing';expect(placementAnchors(s)).not.toContainEqual({id:'kiln-screen-home',title:'晾坯屏原位',x:500,y:640});});
});

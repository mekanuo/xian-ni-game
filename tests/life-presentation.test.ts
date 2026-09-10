import {describe,it,expect} from 'vitest';
import {createGame,snapshot} from '../src/game/model';
import {nearbyEncounter,inspectObject,placementAnchors} from '../src/game/encounters';
import {lifeObjective} from '../src/game/life';
const p={name:'行舟',origin:'tinker' as const,wish:'travel' as const,appearance:0 as const};
describe('life presentation consumes actual facts only',()=>{
 it('describes the nearest repair tool instead of the first tool in the map list',()=>{const s=createGame(p);s.scene='workshop';s.flags.endingWish='travel';s.ended=true;s.life.repair.stage='active';s.life.repair.softened=true;s.player.x=1450;s.player.y=630;for(const e of s.worlds.workshop)if(['life_hearth','life_jaw','life_press'].includes(e.id))e.state='idle';expect(nearbyEncounter(s)?.title).toBe(s.worlds.workshop.find(e=>e.id==='life_press')!.name);});
 it('does not expose hidden leaf tasks in the first chapter',()=>{const s=createGame(p);s.scene='creek';s.player.x=1380;s.player.y=680;const before=snapshot(s);expect(nearbyEncounter(s)?.id).not.toBe('life-leaf');expect(lifeObjective(s)).toBeUndefined();expect(snapshot(s)).toBe(before);});
 it('prioritizes an accepted visible leaf beside the lookout',()=>{const s=createGame(p);s.flags.endingWish='travel';s.ended=true;s.life.harvest.stage='active';s.scene='creek';s.player.x=1420;s.player.y=270;const leaf=s.worlds.creek.find(e=>e.id==='life_sun_leaf')!;leaf.state='idle';const before=snapshot(s);expect(nearbyEncounter(s)?.id).toBe('life-leaf');expect(inspectObject(s,leaf)).toContain('向阳叶');expect(snapshot(s)).toBe(before);});
 it('shows rail only for the prepared jaw while it is actually being pulled',()=>{const s=createGame(p);s.scene='workshop';s.life.repair.stage='active';s.life.repair.softened=true;s.player.pullId='life_jaw';const before=snapshot(s);expect(placementAnchors(s)).toEqual([{id:'life-jaw-rail',title:'钳口右侧刻线',x:1420,y:570}]);expect(snapshot(s)).toBe(before);s.player.hold=8;expect(placementAnchors(s)).toEqual([]);});
});

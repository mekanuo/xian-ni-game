import {describe,it,expect} from 'vitest';
import {createGame,previewCast} from '../src/game/model';
import {castTargetPoint} from '../src/game/presentation';
describe('pointer selection of constrained movable props',()=>{
 it('can select the stopboard face or a round-tripped edge before choosing a landing',()=>{
  const s=createGame({name:'行舟',origin:'herbalist',wish:'travel',appearance:0});s.scene='canal';s.canal.stage='active';s.canal.inspected=true;s.flags.ringOwned=true;s.ringStyle='hold';Object.assign(s.player,{x:1270,y:420});
  const stop=s.worlds.canal.find(e=>e.id==='canal_stop')!;
  for(const point of [{x:1280.00001,y:350},{x:1295,y:325}]){
   const aimed=castTargetPoint('pull',point,stop);expect(previewCast(s,'pull',stop.id,aimed).valid).toBe(true);expect(aimed).toEqual({x:1280,y:350});
  }
 });
 it('preserves free directional aiming and does not turn people into pull targets',()=>{
  const s=createGame({name:'行舟',origin:'herbalist',wish:'travel',appearance:0});const npc=s.worlds.home.find(e=>e.type==='xu')!,point={x:123,y:456};
  expect(castTargetPoint('flame',point,npc)).toEqual(point);expect(castTargetPoint('ward',point,npc)).toEqual(point);expect(castTargetPoint('pull',point,npc)).toEqual(point);expect(castTargetPoint('pull',point)).toEqual(point);
 });
});

import {expect,it} from 'vitest';
import {createGame,act,simulationPorts} from '../src/game/model';
import {SPAR_SCENE,initialSparEntries} from '../src/game/spar-content';
import {SPAR_STANCES,positioningRoute} from '../src/game/spar-geometry';
const profile={name:'行舟',origin:'tinker',wish:'travel',appearance:0} as const;
it('creates a distinct eighth world while the home gate stays closed before real return',()=>{
 const s=createGame(profile);
 expect(s.contentVersion).toBe(7);expect(Object.keys(s.worlds)).toHaveLength(8);
 expect(s.worlds.spar.filter(e=>e.id==='spar_peer')).toHaveLength(1);
 expect(s.worlds.spar.some(e=>e.type==='xu'||e.kind==='rest')).toBe(false);
 expect(s.worlds.home.find(e=>e.id==='home_to_spar')?.state).toBe('hidden');
 expect(s.spar).toEqual({run:null,last:null,facts:[],reported:[]});
});
it('the practice circuit and exit are body-walkable in the actual new map',()=>{
 const s=createGame(profile);s.scene='spar';s.player.x=900;s.player.y=1240;
 expect(act(s,{type:'move',point:{x:900,y:940}}).ok).toBe(true);expect(s.player.path.length).toBeGreaterThan(0);
 for(const from of Object.values(SPAR_STANCES))for(const to of Object.values(SPAR_STANCES)){
  let previous=from;for(const next of positioningRoute(from,to)){
   for(let i=0;i<=20;i++)expect(simulationPorts.free(s,{x:previous.x+(next.x-previous.x)*i/20,y:previous.y+(next.y-previous.y)*i/20})).toBe(true);
   previous=next;
  }
 }
 expect(simulationPorts.free(s,SPAR_SCENE.spawn)).toBe(true);expect(simulationPorts.free(s,{x:900,y:1280})).toBe(true);
});
it('home entrance is a separate historical addition with a reachable, unblocked landing',()=>{
 const s=createGame(profile),gate=initialSparEntries('home')[0];
 expect(gate.id).toBe('home_to_spar');expect(initialSparEntries('creek')).toEqual([]);
 expect(simulationPorts.free(s,gate)).toBe(true);expect(act(s,{type:'move',point:gate}).ok).toBe(true);expect(s.player.path.length).toBeGreaterThan(0);
 expect(s.worlds.home.find(e=>e.id==='room')?.x).toBe(1280);
 expect(s.worlds.home.find(e=>e.id==='to_creek')?.x).toBe(1640);
});

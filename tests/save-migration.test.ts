/// <reference types="vite/client" />
import mainFixture from '../qa/fixtures/return-main-v0.2.2.json?raw';
import ridgeFixture from '../qa/fixtures/return-ridge-v0.2.2.json?raw';
import {describe,it,expect} from 'vitest';
import {act,createGame,snapshot,restore} from '../src/game/model';
import {initialKilnEntries} from '../src/game/kiln-content';
import {initialJourneyEntities} from '../src/game/journey-content';
import {lifeEntityIds} from '../src/game/life-content';
import type {GameState,SceneId} from '../src/game/contracts';
const profile={name:'测',origin:'tinker' as const,wish:'stay' as const,appearance:0 as const};
const scenes=['home','creek','workshop','crossing'] as SceneId[];
const fixture=(route:string)=>JSON.parse(route==='main'?mainFixture:ridgeFixture);
const round=(s:GameState)=>restore(snapshot(s));
const current=()=>createGame(profile);
const finished=()=>restore(JSON.stringify(fixture('main')));
const e=(s:GameState,id:string)=>Object.values(s.worlds).flat().find(e=>e.id===id)!;
function harvest(){const s=finished();s.life.harvest.stage='ready';s.life.harvest.sun='bag';s.life.harvest.shade='bag';e(s,'life_sun_leaf').state='picked';e(s,'life_shade_leaf').state='picked';return s;}
function repaired(){const s=finished();Object.assign(s.life.repair,{stage:'complete',softened:true,stopSet:true,latched:true,tested:true,method:'stop'});s.life.clamp='bag';for(const id of ['life_hearth','life_jaw','life_press','life_home_eye','life_practice','life_lookout_eye'])e(s,id).state='idle';e(s,'life_hearth').state='warm';Object.assign(e(s,'life_jaw'),{x:1420,y:570,state:'latched'});return s;}
function installed(site:'home'|'lookout'){const s=repaired();s.life.clamp=site;Object.assign(e(s,site==='home'?'life_practice':'platform_beam'),{x:site==='home'?1030:980,y:site==='home'?500:285,state:'clamped'});if(site==='lookout')s.flags.platformOpen=true;return s;}
describe('actual model.restore save entry',()=>{
 it('round trips a current game and its checkpoint byte for byte',()=>{const s=current();expect(snapshot(round(s))).toBe(snapshot(s));});
 it('restores the real paused sachet action without consuming anything',()=>{const s=current();act(s,{type:'pause',value:true});act(s,{type:'use-sachet'});const restored=round(s);expect(restored.pending).toEqual({type:'use-sachet'});expect(restored.paused).toBe(true);expect(restored.life.sachets).toBe(0);});
 for(const field of ['pending','dialogue','life'] as const)it(`rejects missing required ${field}`,()=>{const s=current();delete (s as Partial<GameState>)[field];expect(()=>round(s)).toThrow();});
 it('rejects a live pull referring to an absent object',()=>{const s=current();s.player.pullId='unknown';s.player.pullPoint={x:100,y:100};expect(()=>round(s)).toThrow();});
 for(const route of ['main','ridge'])it(`migrates real ${route} return export and its one checkpoint`,()=>{const old=fixture(route),s=restore(JSON.stringify(old));expect(s.contentVersion).toBe(5);expect(s.life.repair.stage).toBe('unaccepted');expect(s.player).toEqual(old.player);expect(s.flags).toEqual(old.flags);expect(s.ended).toBe(old.ended);for(const id of scenes){expect(s.worlds[id].filter(e=>!lifeEntityIds(id).includes(e.id)&&!initialJourneyEntities(id).some(n=>n.id===e.id)&&!initialKilnEntries(id).some(n=>n.id===e.id))).toEqual(old.worlds[id]);expect(s.worlds[id]).toHaveLength(old.worlds[id].length+lifeEntityIds(id).length+initialJourneyEntities(id).length+initialKilnEntries(id).length);}const nested=JSON.parse(s.checkpoint!);expect(nested.contentVersion).toBe(5);expect(nested.life).toEqual(s.life);expect(nested.checkpoint).toBeNull();expect(snapshot(round(s))).toBe(snapshot(s));});
 it('migrates an unfinished legacy save without unlocking or awarding life content',()=>{const old=fixture('main');Object.assign(old,{ended:false,checkpoint:null});old.flags={visited_home:true};const s=restore(JSON.stringify(old));expect(s.flags).toEqual(old.flags);expect(s.life.clamp).toBe('unowned');expect(s.life.sachets).toBe(0);for(const id of scenes)expect(s.worlds[id].filter(e=>lifeEntityIds(id).includes(e.id)).every(e=>e.state==='hidden')).toBe(true);});
 for(const version of [0,1,6,'2',null])it(`rejects unknown version ${String(version)}`,()=>{const s=current();Object.assign(s,{contentVersion:version});expect(()=>round(s)).toThrow();});
 for(const legacy of [true,false])for(const defect of ['missing','duplicate','unknown'])it(`rejects ${legacy?'legacy':'current'} ${defect} entity manifest`,()=>{const s=legacy?fixture('main'):current();if(defect==='missing')s.worlds.home.pop();else if(defect==='duplicate')s.worlds.home[1]=s.worlds.home[0];else s.worlds.home[0].id='unknown';expect(()=>restore(JSON.stringify(s))).toThrow();});
 it('rejects a legacy manifest containing a life entity in place of an old object',()=>{const s=fixture('main');s.worlds.home[0].id='life_home_eye';expect(()=>restore(JSON.stringify(s))).toThrow();});
 it('rejects deleting contentVersion from a current manifest',()=>{const s=current();delete (s as Partial<GameState>).contentVersion;expect(()=>round(s)).toThrow();});
 for(const bad of ['{',JSON.stringify({...fixture('main'),contentVersion:9}),JSON.stringify({...fixture('main'),checkpoint:'{}'}),42])it(`rejects invalid checkpoint ${String(bad).slice(0,15)}`,()=>{const s=current();Object.assign(s,{checkpoint:bad});expect(()=>round(s)).toThrow();});
 it('accepts two independently collected leaves in the bag',()=>{expect(round(harvest()).life.harvest).toEqual(harvest().life.harvest);});
 it('rejects two leaves on the same rack layer',()=>{const s=harvest();s.life.harvest.sun=s.life.harvest.shade='upper';expect(()=>round(s)).toThrow();});
 it('rejects an active harvest that already contains both leaves',()=>{const s=harvest();s.life.harvest.stage='active';expect(()=>round(s)).toThrow();});
 it('rejects a ready harvest missing a leaf',()=>{const s=harvest();s.life.harvest.shade='unpicked';expect(()=>round(s)).toThrow();});
 it('rejects collected leaves still available in the world',()=>{const s=harvest();e(s,'life_sun_leaf').state='idle';expect(()=>round(s)).toThrow();});
 it('accepts an interrupted-time snapshot while legitimately picking',()=>{const s=finished();s.scene='creek';s.life.harvest.stage='active';e(s,'life_sun_leaf').state=e(s,'life_shade_leaf').state='idle';Object.assign(s.player,{x:1450,y:680});s.life.harvest.picking={id:'life_shade_leaf',elapsed:1,start:{x:1450,y:680}};expect(round(s).life.harvest.picking?.elapsed).toBe(1);});
 for(const defect of ['elapsed','scene','collected','distance','missing'])it(`rejects invalid picking ${defect}`,()=>{const s=harvest();s.life.harvest.stage='active';s.life.harvest.shade='unpicked';e(s,'life_shade_leaf').state='idle';s.scene='creek';Object.assign(s.player,{x:1450,y:680});s.life.harvest.picking={id:'life_shade_leaf',elapsed:1,start:{x:1450,y:680}};if(defect==='elapsed')s.life.harvest.picking.elapsed=2.1;if(defect==='scene')s.scene='home';if(defect==='collected')s.life.harvest.picking.id='life_sun_leaf';if(defect==='distance')s.life.harvest.picking.start.x=0;if(defect==='missing')delete (s.life.harvest as Partial<typeof s.life.harvest>).picking;expect(()=>round(s)).toThrow();});
 for(const amount of [-1,1,2,3])it(`rejects unearned or invalid sachet amount ${amount}`,()=>{const s=current();s.life.sachets=amount as 0;expect(()=>round(s)).toThrow();});
 it('rejects an unearned clamp',()=>{const s=current();s.life.clamp='bag';expect(()=>round(s)).toThrow();});
 for(const site of ['home','lookout'] as const){it(`accepts consistent ${site} clamp installation`,()=>{expect(round(installed(site)).life.clamp).toBe(site);});for(const defect of ['position','state','double','held'])it(`rejects ${site} clamp ${defect}`,()=>{const s=installed(site),target=e(s,site==='home'?'life_practice':'platform_beam');if(defect==='position')target.x+=50;if(defect==='state')target.state='idle';if(defect==='double')e(s,site==='home'?'platform_beam':'life_practice').state='clamped';if(defect==='held'){s.scene=site==='home'?'home':'creek';s.player.pullId=target.id;s.player.pullPoint={x:target.x,y:target.y};}expect(()=>round(s)).toThrow();});}
 it('rejects an unsupported open claim for an installed lookout clamp',()=>{const s=installed('lookout');s.flags.platformOpen=false;expect(()=>round(s)).toThrow();});
 it('rejects a clamp still attached while claimed in the bag',()=>{const s=installed('home');s.life.clamp='bag';expect(()=>round(s)).toThrow();});
 it('rejects a ready repair with no completed pressure test',()=>{const s=repaired();s.life.repair.stage='ready';s.life.clamp='unowned';s.life.repair.tested=false;expect(()=>round(s)).toThrow();});
 it('rejects pressure-test timing outside the workshop',()=>{const s=repaired();s.life.repair.stage='active';s.life.clamp='unowned';s.life.repair.tested=false;s.life.repair.testing=.5;expect(()=>round(s)).toThrow();});
 for(const bad of [-1,0,9])it(`rejects impossible scent time ${bad}`,()=>{const s=harvest();Object.assign(s.life.harvest,{stage:'complete',sun:'upper',shade:'lower'});s.life.scent={remaining:bad,scene:'workshop'};e(s,'life_scent').state='idle';expect(()=>round(s)).toThrow();});
 it('rejects scent with no visible source',()=>{const s=harvest();Object.assign(s.life.harvest,{stage:'complete',sun:'upper',shade:'lower'});s.life.scent={remaining:4,scene:'workshop'};expect(()=>round(s)).toThrow();});
});

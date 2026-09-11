import {marketRefresh} from '../src/game/market';
/// <reference types="vite/client" />
import {describe,it,expect} from 'vitest';
import old02 from '../qa/fixtures/return-main-v0.2.2.json?raw';
import old03 from '../qa/fixtures/return-ridge-v0.3.1.json?raw';
import old04 from '../qa/fixtures/return-main-v0.4.0.json?raw';
import canalNorth from '../qa/fixtures/return-canal-v0.4.0.json?raw';
import canalHold from '../qa/fixtures/return-canal-hold-v0.4.0.json?raw';
import {kilnRefresh} from '../src/game/kiln';
import {restore,snapshot} from '../src/game/save';
import {getJourneyRoute} from '../src/game/journey-content';
import type {GameState} from '../src/game/contracts';

const current=()=>restore(canalNorth);
const round=(s:GameState)=>restore(snapshot(s));
const entity=(s:GameState,id:string)=>Object.values(s.worlds).flat().find(e=>e.id===id)!;
const ids=['journey_north_mark','journey_south_mark','journey_rest_shelter'];
function active(){const s=current();s.journey.stage='active';s.journey.agreed='together';entity(s,ids[0]).state=entity(s,ids[1]).state='idle';return s;}
function leading(){const s=active();s.scene='workshop';s.journey.run={mode:'together',plan:'north',next:2,playerGate:false,companionGate:false,viaSouth:false,waiting:true};return s;}
function complete(){const s=active();Object.assign(s.journey,{stage:'complete',soloRoute:'north',restOpened:true});entity(s,ids[2]).state='idle';kilnRefresh(s);marketRefresh(s);return s;}

describe('journey content 4 migration and ledger validation',()=>{
 for(const [name,raw] of [['0.2',old02],['0.3.1',old03],['0.4.0',old04],['canal diversion',canalNorth],['canal hold',canalHold]])it(`migrates real ${name} export and checkpoint without granting journey results`,()=>{
  const prior=JSON.parse(raw),s=restore(raw),nested=JSON.parse(s.checkpoint!);
  for(const [next,old] of [[s,prior],[nested,JSON.parse(prior.checkpoint)]]){
   expect(next.contentVersion).toBe(6);expect(next.player).toEqual(old.player);expect(next.flags).toEqual(old.flags);expect(next.ended).toBe(old.ended);
   if(old.canal)expect(next.canal).toEqual(old.canal);if(old.life)expect(next.life).toEqual(old.life);
   expect(next.journey).toEqual({stage:'unaccepted',agreed:null,run:null,soloRoute:null,sharedRoute:null,restOpened:false,recordedShared:false});
   for(const [scene,list] of Object.entries(old.worlds))for(const e of list as {id:string}[])expect(next.worlds[scene].find((n:{id:string})=>n.id===e.id)).toEqual(e);
   expect(ids.map(id=>entity(next,id).state)).toEqual(['hidden','hidden','hidden']);
  }
  expect(nested.checkpoint).toBeNull();expect(snapshot(round(s))).toBe(snapshot(s));
 });
 for(const version of [0,1,5,'4',null])it(`rejects unknown content version ${version}`,()=>{const old=JSON.parse(old04);old.contentVersion=version;expect(()=>restore(JSON.stringify(old))).toThrow();});
 it('rejects a version 3 world with future journey data instead of replacing it',()=>{const old=JSON.parse(canalNorth);old.journey={stage:'complete'};expect(()=>restore(JSON.stringify(old))).toThrow();});
 it('rejects a version 3 manifest containing a future journey entity',()=>{const old=JSON.parse(canalNorth);old.worlds.workshop.push({id:ids[0]});expect(()=>restore(JSON.stringify(old))).toThrow();});
 for(const defect of ['missing','duplicate','extra','wrong-scene'])it(`rejects ${defect} journey entities`,()=>{const s=current();const list=s.worlds.workshop;if(defect==='missing')list.splice(list.findIndex(e=>e.id===ids[0]),1);if(defect==='duplicate')list.push({...entity(s,ids[0])});if(defect==='extra')list.push({...entity(s,ids[0]),id:'journey_fake'});if(defect==='wrong-scene'){const i=list.findIndex(e=>e.id===ids[0]);s.worlds.creek.push(list.splice(i,1)[0]);}expect(()=>round(s)).toThrow();});
 for(const id of ids)it(`rejects moving the fixed ${id} to a new position`,()=>{const s=current();entity(s,id).x+=100;expect(()=>round(s)).toThrow();});
 it('retains a paused active guide and its distance-wait latch without advancing it',()=>{const s=leading();s.paused=true;expect(round(s).journey).toEqual(s.journey);expect(round(s).player).toEqual(s.player);expect(round(s).paused).toBe(true);});
 it('retains solo completion after leaving the route without inventing shared history',()=>{const s=complete();expect(round(s).journey).toEqual(s.journey);expect(round(s).journey.recordedShared).toBe(false);});
 it('accepts solo route evidence while keeping companion evidence absent',()=>{const s=active();s.scene='workshop';s.journey.agreed='solo';s.journey.run={mode:'solo',plan:'south',next:null,playerGate:true,companionGate:false,viaSouth:true,waiting:false};expect(round(s).journey.run).toEqual(s.journey.run);});
 it('accepts a shared-only result with its actual open rest stop',()=>{const s=active();Object.assign(s.journey,{stage:'ready',sharedRoute:'north',restOpened:true});entity(s,ids[2]).state='idle';expect(round(s).journey.soloRoute).toBeNull();expect(round(s).journey.sharedRoute).toBe('north');});
 for(const viaSouth of [false,true])it(`accepts the completed waypoint index for the ${viaSouth?'rerouted':'original'} north path`,()=>{const s=leading();Object.assign(s.journey.run!,{viaSouth,playerGate:true,companionGate:true,waiting:false});s.journey.run!.next=getJourneyRoute(s.journey.run!).length;expect(round(s).journey.run).toEqual(s.journey.run);});
 it('rejects a waypoint which only exists on the longer reroute',()=>{const s=leading();s.journey.run!.next=getJourneyRoute({...s.journey.run!,viaSouth:true}).length;expect(s.journey.run!.next).toBeGreaterThan(getJourneyRoute(s.journey.run!).length);expect(()=>round(s)).toThrow();});
 it('rejects saved arbitrary guide destinations',()=>{const s=leading();Object.assign(s.journey.run!,{target:{x:0,y:0}});expect(()=>round(s)).toThrow();});
 it('allows a later shared run after a completed solo record without reopening rewards',()=>{const s=complete();s.scene='workshop';s.journey.run={mode:'together',plan:'north',next:0,playerGate:false,companionGate:false,viaSouth:true,waiting:false};expect(round(s).journey).toEqual(s.journey);});
 it('allows shared history recorded at home after the actors have left the exit',()=>{const s=complete();s.journey.sharedRoute='mixed';s.journey.recordedShared=true;expect(round(s).journey.recordedShared).toBe(true);});
 for(const defect of ['missing','pre-canal','unaccepted-history','ready-no-rest','rest-no-route','shared-note-no-history','shared-note-not-complete','hidden-rest','early-rest','hidden-mark'])it(`rejects inconsistent journey ${defect}`,()=>{
  const s=active();if(defect==='missing')delete (s as Partial<GameState>).journey;if(defect==='pre-canal')s.canal.stage='ready';if(defect==='unaccepted-history'){s.journey.stage='unaccepted';s.journey.soloRoute='north';}if(defect==='ready-no-rest'){s.journey.stage='ready';s.journey.soloRoute='north';}if(defect==='rest-no-route'){s.journey.stage='ready';s.journey.restOpened=true;entity(s,ids[2]).state='idle';}if(defect==='shared-note-no-history'){Object.assign(s.journey,{stage:'complete',soloRoute:'north',restOpened:true,recordedShared:true});entity(s,ids[2]).state='idle';}if(defect==='shared-note-not-complete'){Object.assign(s.journey,{stage:'ready',sharedRoute:'north',restOpened:true,recordedShared:true});entity(s,ids[2]).state='idle';}if(defect==='hidden-rest'){Object.assign(s.journey,{stage:'ready',soloRoute:'north',restOpened:true});}if(defect==='early-rest')entity(s,ids[2]).state='idle';if(defect==='hidden-mark')entity(s,ids[0]).state='hidden';expect(()=>round(s)).toThrow();
 });
 for(const defect of ['scene','mode','plan','next-large','next-negative','next-fraction','solo-next','solo-companion','solo-wait','missing-wait','gate-type'])it(`rejects invalid guide ${defect}`,()=>{
  const s=leading(),r=s.journey.run!;if(defect==='scene')s.scene='home';if(defect==='mode')Object.assign(r,{mode:'fake'});if(defect==='plan')Object.assign(r,{plan:'mixed'});if(defect==='next-large')r.next=999;if(defect==='next-negative')r.next=-1;if(defect==='next-fraction')r.next=.5;if(defect.startsWith('solo-')){r.mode='solo';s.journey.agreed='solo';r.next=null;r.waiting=false;if(defect==='solo-next')r.next=1;if(defect==='solo-companion')r.companionGate=true;if(defect==='solo-wait')r.waiting=true;}if(defect==='missing-wait')delete (r as Partial<typeof r>).waiting;if(defect==='gate-type')Object.assign(r,{playerGate:'yes'});expect(()=>round(s)).toThrow();
 });
 it('validates the single nested checkpoint with the same journey rules',()=>{const s=current(),nested=JSON.parse(s.checkpoint!);nested.journey.restOpened=true;s.checkpoint=JSON.stringify(nested);expect(()=>round(s)).toThrow();});
});

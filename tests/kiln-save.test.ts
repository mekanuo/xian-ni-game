/// <reference types="vite/client" />
import {describe,it,expect} from 'vitest';
import journeyComplete from '../qa/fixtures/return-journey-v0.5.0.json?raw';
import journeyPaused from '../qa/fixtures/return-journey-paused-v0.5.0.json?raw';
import {restore,snapshot,migrateSave} from '../src/game/save';
import {act,tick,createGame} from '../src/game/model';
import type {Entity,GameState} from '../src/game/contracts';

const oldFixtures=import.meta.glob('../qa/fixtures/*.json',{eager:true,query:'?raw',import:'default'}) as Record<string,string>;
const initialKiln={visited:false,entry:null,crossed:{west:false,east:false},loan:'none',shelterOpened:false};
const current=()=>restore(journeyComplete);
const round=(s:GameState)=>restore(snapshot(s));
const screen=(s:GameState)=>s.worlds.kiln.find(e=>e.id==='shield_board')!;
const rest=(s:GameState)=>s.worlds.kiln.find(e=>e.id==='kiln_rest')!;

// Synthetic boundary states start from a genuine delivered v4 export. These
// establish decoder contracts, not evidence that a player completed kiln play.
function inside(){const s=current();s.scene='kiln';s.kiln.visited=true;s.kiln.entry='west';Object.assign(s.player,{x:400,y:640,path:[],pullId:null,pullPoint:null,hold:0});return s;}
function returned(){const s=inside();s.kiln.loan='returned';s.kiln.shelterOpened=true;rest(s).state='idle';return s;}

describe('kiln v5 save migration',()=>{
 for(const [path,raw] of [...Object.entries(oldFixtures),['actual v4 complete',journeyComplete],['actual v4 paused guide',journeyPaused]])it(`upgrades ${path} and its checkpoint without changing prior facts`,()=>{
  const prior=JSON.parse(raw),s=restore(raw);
  for(const [next,old] of [[s,prior],[JSON.parse(s.checkpoint!),JSON.parse(prior.checkpoint)]]){
   expect(next.contentVersion).toBe(6);
   expect(Object.keys(next.worlds).sort()).toEqual(['canal','creek','crossing','home','kiln','market','workshop']);
   expect(next.kiln).toEqual(initialKiln);
   for(const key of ['player','flags','profile','time','herbs','paused','pending','projectiles','dialogue','lastSafe'])expect(next[key]).toEqual(old[key]);
   for(const key of ['life','canal','journey'])if(old[key])expect(next[key]).toEqual(old[key]);
   for(const [scene,list] of Object.entries(old.worlds))for(const e of list as Entity[])expect(next.worlds[scene].find((n:Entity)=>n.id===e.id)).toEqual(e);
   for(const scene of ['creek','canal'])expect(next.worlds[scene].find((e:Entity)=>e.id===`${scene}_to_kiln`).state).toBe(next.journey.stage==='complete'?'idle':'hidden');
  }
  expect(JSON.parse(s.checkpoint!).checkpoint).toBeNull();expect(migrateSave(snapshot(s))).toBe(snapshot(s));
 });
 it('keeps old crossing and new kiln boards as independent scene-local objects',()=>{
  const s=current(),old=s.worlds.crossing.find(e=>e.id==='shield_board')!;screen(s).x+=50;
  const restored=round(s);expect(restored.worlds.crossing.find(e=>e.id==='shield_board')).toEqual(old);expect(screen(restored).x).toBe(screen(s).x);
 });
 for(const value of [0,1,7,'5',null])it(`rejects unsupported version ${String(value)}`,()=>{const s=JSON.parse(journeyComplete);s.contentVersion=value;expect(()=>restore(JSON.stringify(s))).toThrow();});
 for(const key of ['kiln','scene','lastSafe','world','entry'])it(`rejects future ${key} data in an old v4 export`,()=>{
  const s=JSON.parse(journeyComplete);
  if(key==='kiln')s.kiln=initialKiln;
  if(key==='scene')s.scene='kiln';
  if(key==='lastSafe')s.lastSafe.scene='kiln';
  if(key==='world')s.worlds.kiln=[];
  if(key==='entry')s.worlds.creek.push({...s.worlds.creek[0],id:'creek_to_kiln'});
  expect(()=>restore(JSON.stringify(s))).toThrow();
 });
 it('migrates a legacy checkpoint independently from its current outer world',()=>{
  const s=returned();s.checkpoint=Object.values(oldFixtures).map(raw=>JSON.parse(raw)).find(old=>old.contentVersion===undefined).checkpoint;
  const decoded=round(s);expect(decoded.kiln).toEqual(s.kiln);expect(JSON.parse(decoded.checkpoint!).kiln).toEqual(initialKiln);
 });
 it('validates an independent current checkpoint inside an older outer world',()=>{
  const old=JSON.parse(journeyComplete),nested=returned();nested.checkpoint=null;old.checkpoint=snapshot(nested);
  const decoded=restore(JSON.stringify(old));expect(decoded.kiln).toEqual(initialKiln);expect(JSON.parse(decoded.checkpoint!).kiln).toEqual(nested.kiln);
 });
 it('rejects an invalid nested kiln ledger instead of resetting its reward',()=>{const s=current(),nested=inside();nested.checkpoint=null;nested.kiln.shelterOpened=true;s.checkpoint=snapshot(nested);expect(()=>round(s)).toThrow();});
 it('rejects recursive checkpoints',()=>{const s=current(),nested=inside();s.checkpoint=snapshot(nested);expect(()=>round(s)).toThrow();});
});

describe('kiln v5 manifest and physical contracts',()=>{
 for(const defect of ['missing-map','extra-map','missing-screen','duplicate-screen','extra-object','wrong-scene','missing-ledger'])it(`rejects ${defect}`,()=>{
  const s=current();
  if(defect==='missing-map')delete (s.worlds as Partial<GameState['worlds']>).kiln;
  if(defect==='extra-map')Object.assign(s.worlds,{fake:[]});
  if(defect==='missing-screen')s.worlds.kiln=s.worlds.kiln.filter(e=>e.id!=='shield_board');
  if(defect==='duplicate-screen')s.worlds.kiln.push({...screen(s)});
  if(defect==='extra-object')s.worlds.kiln.push({...screen(s),id:'extra'});
  if(defect==='wrong-scene'){s.worlds.home.push({...screen(s)});s.worlds.kiln=s.worlds.kiln.filter(e=>e.id!=='shield_board');}
  if(defect==='missing-ledger')delete (s as Partial<GameState>).kiln;
  expect(()=>round(s)).toThrow();
 });
 for(const defect of ['entry-target','entry-spawn','entry-position','early-entry','hidden-entry','npc-position','rest-position','screen-home','screen-width','screen-solid','screen-outside'])it(`rejects invalid ${defect}`,()=>{
  const s=current(),entry=s.worlds.creek.find(e=>e.id==='creek_to_kiln')!;
  if(defect==='entry-target')entry.targetScene='home';
  if(defect==='entry-spawn')entry.targetSpawn={x:1,y:1};
  if(defect==='entry-position')entry.x+=5;
  if(defect==='early-entry'){s.journey.stage='ready';s.journey.recordedShared=false;}
  if(defect==='hidden-entry')entry.state='hidden';
  if(defect==='npc-position')s.worlds.kiln.find(e=>e.id==='duqin')!.x+=5;
  if(defect==='rest-position')rest(s).x+=5;
  if(defect==='screen-home')screen(s).homeX!+=5;
  if(defect==='screen-width')screen(s).w=1;
  if(defect==='screen-solid')screen(s).solid=false;
  if(defect==='screen-outside')screen(s).x=0;
  expect(()=>round(s)).toThrow();
 });
 for(const defect of ['missing-visited','extra-key','bad-entry','entry-outside','entry-missing','before-journey','unvisited-inside','unvisited-loan','unvisited-route','bad-loan','bad-crossed','extra-crossed','rest-before-return','return-no-rest','wrong-rest'])it(`rejects inconsistent ${defect}`,()=>{
  const s=inside();
  if(defect==='missing-visited')delete (s.kiln as Partial<GameState['kiln']>).visited;
  if(defect==='extra-key')Object.assign(s.kiln,{screenState:'burned'});
  if(defect==='bad-entry')Object.assign(s.kiln,{entry:'home'});
  if(defect==='entry-outside')s.scene='creek';
  if(defect==='entry-missing')s.kiln.entry=null;
  if(defect==='before-journey'){s.journey.stage='ready';s.journey.recordedShared=false;}
  if(defect==='unvisited-inside')s.kiln.visited=false;
  if(defect==='unvisited-loan'){s.scene='home';s.kiln.entry=null;s.kiln.visited=false;s.kiln.loan='agreed';}
  if(defect==='unvisited-route'){s.scene='home';s.kiln.entry=null;s.kiln.visited=false;s.kiln.crossed.east=true;}
  if(defect==='bad-loan')Object.assign(s.kiln,{loan:'complete'});
  if(defect==='bad-crossed')Object.assign(s.kiln.crossed,{west:1});
  if(defect==='extra-crossed')Object.assign(s.kiln.crossed,{home:true});
  if(defect==='rest-before-return'){s.kiln.shelterOpened=true;rest(s).state='idle';}
  if(defect==='return-no-rest')s.kiln.loan='returned';
  if(defect==='wrong-rest')rest(s).state='idle';
  expect(()=>round(s)).toThrow();
 });
 it('keeps returned history and granted shelter after later destruction',()=>{const s=returned();Object.assign(screen(s),{state:'burned',timer:0,x:700});expect(round(s).kiln).toEqual(s.kiln);expect(screen(round(s))).toEqual(screen(s));});
 for(const loan of ['none','agreed','borrowed'] as const)it(`keeps ${loan} without granting shelter when the screen burns`,()=>{const s=inside();s.kiln.loan=loan;Object.assign(screen(s),{state:'burning',timer:8.5});expect(round(s).kiln).toEqual(s.kiln);});
 it('retains both historical crossings while currently in an old map',()=>{const s=returned();s.scene='home';s.kiln.entry=null;s.kiln.crossed={west:true,east:true};expect(round(s).kiln).toEqual(s.kiln);});
 it('does not refresh retreated enemies or erase actual AI memory',()=>{const s=inside();Object.assign(s.worlds.kiln.find(e=>e.id==='kiln_raider_a')!,{state:'retreated',hp:0,x:640,y:740});Object.assign(s.worlds.kiln.find(e=>e.id==='kiln_raider_b')!,{state:'casting',timer:0,data:{attack:1.7,seen:2,lastX:1180,lastY:590}});expect(round(s).worlds.kiln).toEqual(s.worlds.kiln);});
 it('allows a granted actual shelf rest as lastSafe while preserving the current entry',()=>{const s=returned();s.lastSafe={scene:'kiln',point:{x:260,y:400}};expect(round(s).lastSafe).toEqual(s.lastSafe);});
 it('rejects using the ungranted shelf as lastSafe',()=>{const s=inside();s.lastSafe={scene:'kiln',point:{x:260,y:400}};expect(()=>round(s)).toThrow();});
 it('rejects a forged lastSafe at the opposite kiln exit',()=>{const s=returned();s.lastSafe={scene:'kiln',point:{x:1220,y:540}};expect(()=>round(s)).toThrow();});
 for(const defect of ['state','hp','home','movable'])it(`rejects a new raider with invalid ${defect}`,()=>{const s=inside(),e=s.worlds.kiln.find(e=>e.id==='kiln_raider_a')!;if(defect==='state')e.state='complete';if(defect==='hp')e.hp=9;if(defect==='home')e.homeX=100;if(defect==='movable')e.movable=true;expect(()=>round(s)).toThrow();});
});

describe('kiln pause and spell save boundaries',()=>{
 it('round-trips a newly created current seven-map world and its original retry point',()=>{const s=createGame({name:'存档校验',origin:'tinker',wish:'travel',appearance:0});expect(round(s)).toEqual(s);expect(JSON.parse(s.checkpoint!).contentVersion).toBe(6);});
 it('resumes an actual held screen only after the saved pending release is confirmed',()=>{
  const s=inside();s.paused=false;s.ringStyle='hold';s.player.mana=6;
  expect(act(s,{type:'cast',spell:'pull',targetId:'shield_board',point:{x:500,y:640}}).ok).toBe(true);
  expect(act(s,{type:'move',point:{x:580,y:700}}).ok).toBe(true);tick(s,.2,{x:0,y:0});
  expect(screen(s).x).toBeGreaterThan(500);expect(act(s,{type:'hold'}).ok).toBe(true);tick(s,.15,{x:0,y:0});
  expect(act(s,{type:'pause',value:true}).ok).toBe(true);expect(act(s,{type:'release'}).ok).toBe(true);
  const decoded=round(s),frozen=snapshot(decoded),point={x:screen(decoded).x,y:screen(decoded).y};
  tick(decoded,1,{x:1,y:0});expect(snapshot(decoded)).toBe(frozen);expect(decoded.player.pullPoint).toBeNull();expect(decoded.player.hold).toBeGreaterThan(0);
  expect(act(decoded,{type:'pause',value:false}).ok).toBe(true);expect(decoded.player.pullId).toBeNull();expect(decoded.pending).toBeNull();expect(screen(decoded)).toMatchObject({...point,state:'idle'});expect(round(decoded)).toEqual(decoded);
 });
 it('preserves a screen actually ignited by a model projectile during paused export',()=>{
  const s=inside();s.paused=false;s.player.mana=6;
  expect(act(s,{type:'cast',spell:'flame',targetId:'shield_board',point:{x:500,y:640}}).ok).toBe(true);tick(s,.7,{x:0,y:0});
  expect(screen(s).state).toBe('burning');expect(screen(s).timer).toBeGreaterThan(11);act(s,{type:'pause',value:true});
  const decoded=round(s),frozen=snapshot(decoded);tick(decoded,1,{x:0,y:0});expect(snapshot(decoded)).toBe(frozen);expect(screen(decoded)).toEqual(screen(s));
  act(decoded,{type:'pause',value:false});tick(decoded,.2,{x:0,y:0});expect(screen(decoded).timer).toBeLessThan(screen(s).timer!);expect(round(decoded)).toEqual(decoded);
 });
 for(const held of [false,true])it(`keeps paused ${held?'held with null landing':'pull with landing'} and its pending release`,()=>{
  const s=inside();s.paused=true;s.pending={type:'release'};s.player.pullId='shield_board';s.player.hold=held?3.7:0;s.player.pullPoint=held?null:{x:580,y:700};screen(s).state=held?'held':'pulled';
  const decoded=round(s);expect(decoded.player).toEqual(s.player);expect(decoded.pending).toEqual(s.pending);expect(decoded.paused).toBe(true);expect(decoded.time).toBe(s.time);expect(screen(decoded)).toEqual(screen(s));
 });
 it('keeps burning timer, projectile and pending input without simulating a frame',()=>{const s=inside();s.paused=true;s.pending={type:'cast',spell:'ward',point:{x:800,y:640}};Object.assign(screen(s),{state:'burning',timer:11.4});s.projectiles=[{id:100,x:700,y:600,vx:-200,vy:0,life:.6,owner:'enemy'}];const decoded=round(s);expect(decoded).toEqual(s);});
 for(const defect of ['unknown-screen','burning-pull','burned-pull','held-no-owner','pulled-no-owner','idle-owned','held-landing','burning-zero','burning-over','burned-timer'])it(`rejects inconsistent ${defect}`,()=>{
  const s=inside(),e=screen(s);
  if(defect==='unknown-screen')e.state='clamped';
  if(defect==='burning-pull'||defect==='burned-pull'){e.state=defect==='burning-pull'?'burning':'burned';e.timer=e.state==='burning'?3:0;s.player.pullId=e.id;s.player.pullPoint={x:600,y:640};}
  if(defect==='held-no-owner')e.state='held';
  if(defect==='pulled-no-owner')e.state='pulled';
  if(defect==='idle-owned'){s.player.pullId=e.id;s.player.pullPoint={x:600,y:640};}
  if(defect==='held-landing'){e.state='held';s.player.pullId=e.id;s.player.hold=2;s.player.pullPoint={x:600,y:640};}
  if(defect==='burning-zero'){e.state='burning';e.timer=0;}
  if(defect==='burning-over'){e.state='burning';e.timer=12.1;}
  if(defect==='burned-timer'){e.state='burned';e.timer=2;}
  expect(()=>round(s)).toThrow();
 });
 it('still rejects a forged kiln clamp and cross-map scent',()=>{
  const clamp=inside();Object.assign(clamp.life,{clamp:'kiln'});screen(clamp).state='clamped';expect(()=>round(clamp)).toThrow();
  const scent=inside();Object.assign(scent.life,{scent:{scene:'kiln',remaining:4}});expect(()=>round(scent)).toThrow();
 });
});

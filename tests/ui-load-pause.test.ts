import {sparRefresh} from '../src/game/spar';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {GameUI} from '../src/game/ui';
import {act,createGame,snapshot,tick} from '../src/game/model';
import type {GameAction,GameState} from '../src/game/contracts';

const make=()=>createGame({name:'试档',origin:'tinker',wish:'stay',appearance:0});
function heldSave(kind:'pending'|'running'|'dialogue'){
 const s=make();s.ringStyle='hold';Object.assign(s.player,{x:470,y:740});
 expect(act(s,{type:'cast',spell:'pull',targetId:'lamp',point:{x:430,y:760}}).ok).toBe(true);
 expect(act(s,{type:'hold'}).ok).toBe(true);tick(s,1,{x:0,y:0});
 if(kind==='pending'){act(s,{type:'pause',value:true});act(s,{type:'release'});}
 if(kind==='dialogue'){expect(act(s,{type:'interact',targetId:'tao'}).ok).toBe(true);expect(s.dialogue).not.toBeNull();}
 return s;
}
function harness(raw:string){
 let state=make();const actions:GameAction[]=[],updateCaches:Array<{lastAuto:unknown;endingShown:unknown}>=[];
 // Exercise the production load/change/close methods without constructing a rendered screen.
 const ui=Object.create(GameUI.prototype) as {load(slot?:string):void;change(e:Event):void;endingShown:boolean};
 Object.assign(ui,{hooks:{get:()=>state,act:(a:GameAction)=>{actions.push(a);const cache=ui as unknown as {lastAuto:unknown;endingShown:unknown};updateCaches.push({lastAuto:cache.lastAuto,endingShown:cache.endingShown});act(state,a);},replace:(next:GameState)=>{state=next;},center:()=>{}},started:true,pauseBeforeMenu:false,screen:'settings',modal:{innerHTML:''},notify:()=>{}});
 vi.stubGlobal('document',{hidden:false});vi.stubGlobal('localStorage',{getItem:(key:string)=>key==='manual'?raw:'0'});
 return {ui,actions,updateCaches,get:()=>state};
}
afterEach(()=>vi.unstubAllGlobals());
describe('loading never resumes a restored world while closing the previous settings menu',()=>{
 for(const route of ['import','manual'] as const)for(const kind of ['pending','running','dialogue'] as const)it(`${route}: retains ${kind} held state until the player explicitly resumes`,async()=>{
  const saved=heldSave(kind),h=harness(snapshot(saved));
  if(route==='manual')h.ui.load('manual');
  else{h.ui.change({target:{id:'import-save',files:[{text:async()=>snapshot(saved)}],dataset:{}}} as unknown as Event);await Promise.resolve();}
  const s=h.get();expect(h.updateCaches.every(cache=>cache.lastAuto===saved.checkpoint&&cache.endingShown===Boolean(saved.flags.endingWish))).toBe(true);expect(s.paused).toBe(true);expect(s.player).toEqual(saved.player);expect(s.pending).toEqual(saved.pending);expect(s.events).toEqual(saved.events);expect(s.dialogue).toEqual(saved.dialogue);
  expect(h.actions.some(a=>a.type==='pause'&&!a.value)).toBe(false);
  tick(s,1,{x:0,y:0});expect(s.player.hold).toBe(saved.player.hold);
  if(kind==='dialogue'){act(s,{type:'choose',choiceId:'leave'});expect(s.paused).toBe(true);}
  act(s,{type:'pause',value:false});
  if(kind==='pending'){expect(s.player.hold).toBe(0);expect(s.pending).toBeNull();}else expect(s.player.hold).toBe(saved.player.hold);
 });
 for(const route of ['import','manual'] as const)for(const finished of [false,true])it(`${route}: ${finished?'does not replay a completed':'preserves the first future'} chapter ending`,async()=>{
  const saved=heldSave('running');if(finished){saved.flags.endingWish='stay';saved.ended=true;sparRefresh(saved);}
  const h=harness(snapshot(saved));h.ui.endingShown=!finished;
  if(route==='manual')h.ui.load('manual');else{h.ui.change({target:{id:'import-save',files:[{text:async()=>snapshot(saved)}],dataset:{}}} as unknown as Event);await Promise.resolve();}
  expect(h.ui.endingShown).toBe(finished);expect(h.get().ended).toBe(saved.ended);expect(h.get().flags.endingWish).toBe(saved.flags.endingWish);
 });
});

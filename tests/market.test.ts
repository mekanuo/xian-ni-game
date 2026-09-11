/// <reference types="vite/client" />
import {describe,expect,it} from 'vitest';
import type {GameState,SceneId,Vec} from '../src/game/contracts';
import {MARKET_SCENE,MARKET_ARRIVALS,initialMarketEntries} from '../src/game/market-content';
import {createMarketState,marketAfterTravel,marketTick,marketChoose,marketInteract,marketRefresh,marketThreat,marketChoices,marketAbandonVisit,marketDescription,type MarketPorts} from '../src/game/market';
import completedJourney from '../qa/fixtures/return-journey-v0.5.0.json?raw';
import {act as gameAct,tick as gameTick,restore as restoreGame} from '../src/game/model';
const point=(x:number,y:number):Vec=>({x,y});
const npc=(s:GameState)=>s.worlds.market.find(e=>e.id==='market_merchant')!;
const door=(s:GameState)=>s.worlds.market.find(e=>e.id==='market_door')!;
// Explicit module boundary fixtures. Ports model safe contact and measured walking;
// these tests do not stand in for production movement/collision integration.
const ports:MarketPorts={free:()=>true,clearLine:()=>true,emit:()=>{},dialogue:(s,id,speaker,text,choices=[])=>{s.dialogue={id,speaker,text,choices};s.paused=true;},moveNpc:(_s,n,to,speed,dt)=>{const d=Math.hypot(to.x-n.x,to.y-n.y),a=Math.min(d,speed*dt);if(d){n.x+=(to.x-n.x)*a/d;n.y+=(to.y-n.y)*a/d;}}};
function fresh(entry:'crossing'|'canal'='crossing'):GameState{
 const s={market:createMarketState(),scene:'market',player:{...point(470,440),mana:0,hp:4},worlds:{market:structuredClone(MARKET_SCENE.entities),home:[{id:'table',kind:'object',type:'table',name:'桌案',x:500,y:500,w:60,h:40,state:'idle'}],crossing:initialMarketEntries('crossing'),canal:initialMarketEntries('canal')},journey:{stage:'complete'},kiln:{crossed:{west:false,east:true}},flags:{},paused:false,dialogue:null,defeated:false} as unknown as GameState;
 // Isolate market decisions from enemy locomotion; threat tests explicitly place a live enemy.
 s.worlds.market.find(e=>e.kind==='enemy')!.state='retreated';marketAfterTravel(s,entry,'market');return s;
}
function advance(s:GameState,seconds:number,p=ports){let opened=0;for(let t=0;t<seconds-1e-9;t+=1/60)if(marketTick(s,Math.min(1/60,seconds-t),{...s.player},p))opened++;return opened;}
function passage(s:GameState,points:Vec[]){Object.assign(s.player,points[0]);for(let i=1;i<points.length;i++){const from={...s.player};Object.assign(s.player,points[i]);marketTick(s,1/60,from,ports);}}
function leave(s:GameState,to:SceneId){s.scene=to;marketAfterTravel(s,'market',to);}
function exchange(s:GameState){marketInteract(s,npc(s),ports);const r=marketChoose(s,'market:exchange',ports);s.dialogue=null;s.paused=false;return r;}

describe('market production module causal boundaries',()=>{
 it('an accepted exchange leaves the door closed until measured NPC motion reaches the latch',()=>{
  const s=fresh();expect(exchange(s)).toMatchObject({ok:true,checkpoint:true});expect(s.market.exchanged).toBe(true);expect(door(s).state).toBe('closed');
  expect(advance(s,.5)).toBe(0);expect(npc(s).x).toBeGreaterThan(470);expect(door(s).state).toBe('closed');
  expect(advance(s,4)).toBe(1);expect(door(s)).toMatchObject({state:'open',solid:false});expect(npc(s)).toMatchObject({x:470,y:380,state:'idle'});
 });
 it('canal entry must observe an actual east-to-west band before crossing departure credits that direction only',()=>{
  const s=fresh('canal');expect(s.market.visit?.entry).toBe('canal');passage(s,[point(820,840),point(700,840),point(500,840)]);
  expect(s.market.through.public.eastToWest).toBe(false);expect(s.market.visit?.passed.public.eastToWest).toBe(true);
  leave(s,'crossing');expect(s.market.visit).toBeNull();expect(s.market.through.public).toEqual({westToEast:false,eastToWest:true});
 });
 it('complete local passage followed by departure through the original side awards no through history',()=>{
  const s=fresh();passage(s,[point(500,840),point(700,840),point(820,840)]);expect(s.market.visit?.passed.public.westToEast).toBe(true);
  leave(s,'crossing');expect(s.market.visit).toBeNull();expect(s.market.through).toEqual(createMarketState().through);
 });
});

it('requires real kiln passage, current contact, and the offered dialogue choice to exchange',()=>{
 const s=fresh();s.kiln.crossed={west:false,east:false};marketInteract(s,npc(s),ports);
 expect(marketChoose(s,'market:exchange',ports)?.ok).toBe(false);expect(s.market.exchanged).toBe(false);
 s.dialogue=null;s.paused=false;s.kiln.crossed.west=true;marketInteract(s,npc(s),ports);
 Object.assign(s.player,point(240,760));expect(marketChoose(s,'market:exchange',ports)?.ok).toBe(false);
});
it('actual visible range stops measured motion and resumes without another exchange; opened door never relocks',()=>{
 const s=fresh();exchange(s);advance(s,.3);const before={...npc(s)};
 const threat=s.worlds.market.find(e=>e.kind==='enemy')!;Object.assign(threat,{...point(490,600),state:'idle'});
 advance(s,.3);expect(npc(s)).toMatchObject({x:before.x,y:before.y,state:'waiting'});expect(door(s).state).toBe('closed');
 const occluded={...ports,clearLine:()=>false};expect(marketThreat(s,occluded)).toBe(false);
 threat.state='retreated';expect(advance(s,4)).toBe(1);threat.state='idle';advance(s,.1);expect(door(s).state).toBe('open');
});
it.each(['paused','dialogue','defeated','away'] as const)('%s does not advance an exchanged promise or passage',(reason)=>{
 const s=fresh();exchange(s);if(reason==='away')s.scene='home';else if(reason==='dialogue')s.dialogue={id:'reading',speaker:'',text:'',choices:[]};else s[reason]=true;
 const before=JSON.stringify(s);expect(marketTick(s,1,point(500,840),ports)).toBe(false);expect(JSON.stringify(s)).toBe(before);
});
it('refresh changes only derived entrance visibility and door collision, never grants a promise',()=>{
 const s=fresh();s.journey.stage='active';marketRefresh(s);expect(s.worlds.crossing[0].state).toBe('hidden');
 s.journey.stage='complete';marketRefresh(s);expect(s.worlds.crossing[0].state).toBe('idle');expect(s.worlds.canal[0].state).toBe('idle');
 expect(s.market.exchanged).toBe(false);expect(door(s).state).toBe('closed');expect(s.worlds.market.find(e=>e.id==='xu_market')?.state).toBe('hidden');
});
it('half visits, middle starts and same-side backtracking cannot invent either complete direction',()=>{
 for(const points of [[point(500,840),point(650,840),point(500,840)],[point(820,840),point(650,840),point(820,840)],[point(650,840),point(820,840)]]){
  const s=fresh();passage(s,points);expect(s.market.visit?.passed).toEqual(createMarketState().through);
 }
});
it('leaving the band invalidates a partial pass and both real directions can coexist without wrong-way departure credit',()=>{
 const s=fresh('canal');passage(s,[point(820,840),point(790,840),point(790,940),point(500,940)]);
 expect(s.market.visit?.passed.public.eastToWest).toBe(false);
 passage(s,[point(500,840),point(820,840),point(500,840)]);
 expect(s.market.visit?.passed.public).toEqual({westToEast:true,eastToWest:true});leave(s,'crossing');
 expect(s.market.through.public).toEqual({westToEast:false,eastToWest:true});
});
it('a later real trip adds a different route without clearing already settled history',()=>{
 const s=fresh();passage(s,[point(500,840),point(820,840)]);leave(s,'canal');
 s.scene='market';marketAfterTravel(s,'canal','market');door(s).state='open';s.market.exchanged=true;
 passage(s,[point(820,440),point(500,440)]);leave(s,'crossing');
 expect(s.market.through.public.westToEast).toBe(true);expect(s.market.through.private.eastToWest).toBe(true);
});
it('abandoning a visit retains exchange and physical door without manufacturing through history',()=>{
 const s=fresh();exchange(s);advance(s,4);passage(s,[point(500,840),point(820,840)]);marketAbandonVisit(s);
 expect(s.market.visit).toBeNull();expect(s.market.exchanged).toBe(true);expect(door(s).state).toBe('open');expect(s.market.through).toEqual(createMarketState().through);
});
it('home report requires the actual table choice and contact, submits only the unreported directional difference once',()=>{
 const s=fresh();passage(s,[point(500,840),point(820,840)]);leave(s,'canal');s.scene='home';Object.assign(s.player,point(500,550));
 const table=s.worlds.home[0];const choices=marketChoices(s,table,ports);expect(choices.map(c=>c.id)).toContain('market:report');
 expect(marketChoose(s,'market:report',ports)?.ok).toBe(false);
 s.dialogue={id:'journey_table',speaker:'',text:'',choices};expect(marketChoose(s,'market:report',ports)).toMatchObject({ok:true,checkpoint:true});
 expect(s.market.reported).toEqual(s.market.through);expect(marketChoose(s,'market:report',ports)?.ok).toBe(false);
 expect(marketChoices(s,table,ports)).toEqual([]);
 s.market.through.public.eastToWest=true;s.dialogue.choices=marketChoices(s,table,ports);Object.assign(s.player,point(900,900));
 expect(marketChoose(s,'market:report',ports)?.ok).toBe(false);expect(s.market.reported.public.eastToWest).toBe(false);
});

it('a reported outbound passage never claims an unwalked return direction',()=>{
 const s=fresh();s.scene='home';s.market.through.public.westToEast=true;s.market.reported.public.westToEast=true;
 const text=marketDescription(s,s.worlds.home[0],ports)!;
 expect(text).toContain('从石渡经公共巷走到旧渠');expect(text).not.toContain('反向走过');expect(text).not.toContain('往返');
});
it('invalid or unrelated travel cannot commit or clear a current visit before the scene actually changes',()=>{
 const s=fresh();passage(s,[point(500,840),point(820,840)]);const before=JSON.stringify(s.market);
 marketAfterTravel(s,'market','canal');expect(JSON.stringify(s.market)).toBe(before);
 marketAfterTravel(s,'market','market');expect(JSON.stringify(s.market)).toBe(before);
});
it('invalid elapsed time never advances a promise or passage',()=>{
 const s=fresh();exchange(s);const before=JSON.stringify(s);
 for(const dt of [0,-1,Infinity,NaN])expect(marketTick(s,dt,point(500,840),ports)).toBe(false);
 expect(JSON.stringify(s)).toBe(before);
});

// Full-world synthetic starting scenarios derived from a real older save. Only
// the initial placement/knowledge premise is supplied here; all movement,
// dialogue, doors, damage and departures below use production act/tick.
function productionStart(entry:'crossing'|'canal',known=false,blockedArrival=false):GameState{
 const s=restoreGame(completedJourney);s.paused=false;s.dialogue=null;s.pending=null;s.scene='market';
 s.player.path=[];Object.assign(s.player,MARKET_ARRIVALS[entry]);s.flags.companion='waiting';s.flags.visited_market=true;
 if(known){s.kiln.visited=true;s.kiln.crossed.east=true;}
 if(blockedArrival)s.worlds.canal.push({id:'synthetic_arrival_block',kind:'object',type:'boundary',name:'到达点遮挡夹具',x:990,y:350,w:100,h:100,state:'idle',solid:true});
 marketAfterTravel(s,entry,'market');return s;
}
function gameWait(s:GameState,seconds:number){for(let t=0;t<seconds-1e-9;t+=1/60)gameTick(s,Math.min(1/60,seconds-t),point(0,0));}
function gameWalk(s:GameState,x:number,y:number){
 expect(gameAct(s,{type:'move',point:point(x,y)}),`actual click ${x},${y}`).toMatchObject({ok:true});
 for(let t=0;t<40&&s.player.path.length&&!s.defeated;t+=1/60)gameTick(s,1/60,point(0,0));
 expect(s.defeated).toBe(false);expect(Math.hypot(s.player.x-x,s.player.y-y)).toBeLessThan(4);
}
const westPublic=[point(420,880),point(880,880),point(1220,880),point(1220,240),point(1140,240)];
const eastPublic=[point(1220,240),point(1220,880),point(880,880),point(420,880),point(310,760)];
describe('production act/tick from explicit full-world starting scenarios',()=>{
 it.each(['crossing','canal'] as const)('zero-resource public traversal from %s commits only when the opposite real exit changes the scene',(entry)=>{
  const s=productionStart(entry),oldCanal=structuredClone(s.canal),oldJourney=structuredClone(s.journey);
  expect(s.player.mana).toBe(0);for(const p of entry==='crossing'?westPublic:eastPublic)gameWalk(s,p.x,p.y);
  const direction=entry==='crossing'?'westToEast':'eastToWest';expect(s.market.visit?.passed.public[direction]).toBe(true);
  expect(s.market.through).toEqual(createMarketState().through);
  expect(gameAct(s,{type:'interact',targetId:entry==='crossing'?'market_exit':'market_entry'}).ok).toBe(true);
  expect(s.scene).toBe(entry==='crossing'?'canal':'crossing');expect(s.market.visit).toBeNull();expect(s.market.through.public[direction]).toBe(true);
  expect(s.market.through.private).toEqual({westToEast:false,eastToWest:false});expect(s.player.mana).toBe(0);
  expect(s.worlds.market.find(e=>e.kind==='enemy')?.hp).toBe(3);expect(s.canal).toEqual(oldCanal);expect(s.journey).toEqual(oldJourney);
 });
 it('measured production NPC motion opens the private lane, followed by real private crossing and departure',()=>{
  const s=productionStart('crossing',true);gameWalk(s,470,760);gameWalk(s,470,450);
  expect(gameAct(s,{type:'interact',targetId:'market_merchant'}).ok).toBe(true);
  expect(gameAct(s,{type:'choose',choiceId:'market:exchange'}).ok).toBe(true);expect(door(s).state).toBe('closed');
  gameWait(s,4);expect(door(s)).toMatchObject({state:'open',solid:false});expect(npc(s)).toMatchObject({x:470,y:380,state:'idle'});
  for(const [x,y] of [[620,440],[620,405],[665,410],[820,405],[1140,240]])gameWalk(s,x,y);
  expect(s.market.visit?.passed.private.westToEast).toBe(true);expect(s.market.through.private.westToEast).toBe(false);
  expect(gameAct(s,{type:'interact',targetId:'market_exit'}).ok).toBe(true);expect(s.scene).toBe('canal');
  expect(s.market.through.private.westToEast).toBe(true);expect(s.market.through.public.westToEast).toBe(false);expect(s.player.mana).toBe(0);
 });
 it('a physically blocked target arrival rejects departure without clearing or committing the completed local passage',()=>{
  const s=productionStart('crossing',false,true);for(const p of westPublic)gameWalk(s,p.x,p.y);
  const before=JSON.stringify(s.market);expect(gameAct(s,{type:'interact',targetId:'market_exit'}).ok).toBe(false);
  expect(s.scene).toBe('market');expect(JSON.stringify(s.market)).toBe(before);
 });
 it.each(['crossing','canal'] as const)('actual same-side departure from %s clears the visit without credit',(entry)=>{
  const s=productionStart(entry),before=structuredClone(s.market.through);
  const target=entry==='crossing'?'market_entry':'market_exit';
  gameWalk(s,...(entry==='crossing'?[310,760]:[1070,240]) as [number,number]);
  expect(gameAct(s,{type:'interact',targetId:target}).ok).toBe(true);expect(s.scene).toBe(entry);
  expect(s.market.visit).toBeNull();expect(s.market.through).toEqual(before);
 });
});

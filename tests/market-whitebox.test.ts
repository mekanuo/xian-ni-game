import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SCENES } from '../src/game/content';
import { interactionPoint, simulationPorts } from '../src/game/model';
import { createMarketRun, installMarketMap, MARKET_MAP, marketAct, marketThreat, marketTick, type MarketRun } from '../src/whitebox/market-model';
const point = (x:number,y:number)=>({x,y});
const obj = (r:MarketRun,id:string)=>r.state.worlds.home.find(e=>e.id===id)!;
const step = (r:MarketRun,seconds:number,input=point(0,0))=>{for(let t=0;t<seconds-1e-9;t+=1/60)marketTick(r,Math.min(1/60,seconds-t),input);};
let undo:()=>void;
beforeEach(()=>{undo=installMarketMap();});afterEach(()=>undo());
const fresh=()=>createMarketRun({mana:'ordinary',informed:true});
// Explicit synthetic boundary fixtures; real replay cases below never mutate a running state.
const atStall=()=>{const r=fresh();Object.assign(r.state.player,point(470,440));return r;};
const talk=(r:MarketRun)=>marketAct(r,{type:'interact',targetId:'market_merchant'});
const exchange=(r:MarketRun)=>{expect(talk(r).ok).toBe(true);return marketAct(r,{type:'choose',choiceId:'market:exchange'});};

describe('market fixed whitebox and synthetic boundary fixtures',()=>{
 it('installs reversibly and publishes only explicit fresh premises',()=>{
  expect(SCENES.home).toBe(MARKET_MAP);
  const r=createMarketRun({mana:'zero',informed:false});expect(r.state.player.mana).toBe(0);expect(r.state.ringStyle).toBe('hold');
  expect(r.state.worlds.home.filter(e=>e.kind==='enemy')).toHaveLength(1);expect(obj(r,'market_raider').hp).toBe(3);
  expect(r.exchanged).toBe(false);expect(r.completed).toEqual({public:false,private:false});expect(r.state.checkpoint).toBeNull();
  expect(()=>createMarketRun({mana:'fake',informed:true} as never)).toThrow();
  const restore=installMarketMap();restore();expect(SCENES.home).toBe(MARKET_MAP);
 });
 it('allows safe first meeting exchange but reading alone cannot move or open',()=>{
  const r=atStall();expect(talk(r).ok).toBe(true);const time=r.state.time;step(r,3);
  expect(r.state.time).toBe(time);expect(obj(r,'market_merchant').x).toBe(470);expect(obj(r,'market_door').state).toBe('closed');
  expect(marketAct(r,{type:'choose',choiceId:'market:exchange'}).ok).toBe(true);expect(r.exchanged).toBe(true);
  expect(obj(r,'market_door').state).toBe('closed');expect(r.state.paused).toBe(false);
  step(r,.5);expect(obj(r,'market_merchant').x).toBeGreaterThan(470);expect(obj(r,'market_door').state).toBe('closed');
  step(r,1);expect(obj(r,'market_door').state).toBe('open');expect(obj(r,'market_door').solid).toBe(false);
  const positions=[];for(let i=0;i<150;i++){step(r,1/60);positions.push({...obj(r,'market_merchant')});}
  expect(positions.some(p=>p.y<=406&&p.x>500)).toBe(true);expect(obj(r,'market_merchant').x).toBeCloseTo(470);expect(obj(r,'market_merchant').y).toBeCloseTo(440);
 });
 it('does not accept fabricated remote choices or a missing information premise',()=>{
  const r=fresh();expect(talk(r).ok).toBe(false);expect(marketAct(r,{type:'choose',choiceId:'market:exchange'}).ok).toBe(false);
  const uninformed=createMarketRun({mana:'zero',informed:false});Object.assign(uninformed.state.player,point(470,440));talk(uninformed);
  expect(marketAct(uninformed,{type:'choose',choiceId:'market:exchange'}).ok).toBe(false);expect(uninformed.exchanged).toBe(false);
 });
 it('uses present range and actual wall visibility, not historical enemy alert',()=>{
  const r=atStall(),e=obj(r,'market_raider');e.state='alert';e.data!.seen=3;
  expect(marketThreat(r)).toBe(false);Object.assign(e,point(710,560));expect(marketThreat(r)).toBe(false);
  Object.assign(e,point(490,700));expect(marketThreat(r)).toBe(true);talk(r);expect(marketAct(r,{type:'choose',choiceId:'market:exchange'}).ok).toBe(false);
  e.state='retreated';expect(marketThreat(r)).toBe(false);
 });
 it('stops at visible threat and autonomously resumes; opened door remains open',()=>{
  const r=atStall();exchange(r);step(r,.4);const npc=obj(r,'market_merchant'),x=npc.x;
  Object.assign(obj(r,'market_raider'),point(490,460));step(r,.1);expect(npc.x).toBe(x);expect(npc.state).toBe('waiting');
  obj(r,'market_raider').state='retreated';step(r,3);expect(obj(r,'market_door').state).toBe('open');
  Object.assign(obj(r,'market_raider'),{...point(490,460),state:'idle'});step(r,.1);expect(obj(r,'market_door').state).toBe('open');
 });
 it('queues paused custom interaction and rechecks it on resume; cancel removes it',()=>{
  const r=atStall();marketAct(r,{type:'pause',value:true});expect(talk(r).ok).toBe(true);expect(r.state.dialogue).toBeNull();
  expect(r.state.pending).toEqual({type:'interact',targetId:'market_merchant'});
  marketAct(r,{type:'cancel'});expect(r.state.pending).toBeNull();talk(r);
  Object.assign(r.state.player,point(240,760));expect(marketAct(r,{type:'pause',value:false}).ok).toBe(false);expect(r.state.dialogue).toBeNull();
  Object.assign(r.state.player,point(470,440));marketAct(r,{type:'pause',value:true});talk(r);marketAct(r,{type:'pause',value:false});
  expect(r.state.dialogue?.id).toBe('market_talk');expect(r.state.pending).toBeNull();
 });
 it('closing dialogue preserves earlier manual pause and never instantly opens',()=>{
  const r=atStall();talk(r);marketAct(r,{type:'pause',value:true});marketAct(r,{type:'choose',choiceId:'market:exchange'});
  expect(r.exchanged).toBe(true);expect(r.state.paused).toBe(true);step(r,2);expect(obj(r,'market_door').state).toBe('closed');
  marketAct(r,{type:'pause',value:false});step(r,.3);const p={...obj(r,'market_merchant')};marketAct(r,{type:'pause',value:true});step(r,2);
  expect(obj(r,'market_merchant').x).toBe(p.x);marketAct(r,{type:'pause',value:false});step(r,3);expect(obj(r,'market_door').state).toBe('open');
 });
 it('closed door blocks bodies and projectiles, open door removes only that obstruction',()=>{
  const r=atStall();expect(simulationPorts.free(r.state,point(665,440))).toBe(false);
  r.state.projectiles.push({id:1,x:620,y:440,vx:260,vy:0,life:2,owner:'enemy'});step(r,.3);expect(r.state.projectiles).toHaveLength(0);expect(r.state.events.some(e=>e.type==='impact')).toBe(true);
  exchange(r);step(r,3);expect(simulationPorts.free(r.state,point(665,440))).toBe(true);
  r.state.projectiles.push({id:2,x:620,y:440,vx:260,vy:0,life:2,owner:'enemy'});step(r,.3);expect(r.state.projectiles[0]?.x).toBeGreaterThan(680);
  expect(simulationPorts.free(r.state,point(600,550))).toBe(false);
 });
});

function walk(r:MarketRun,x:number,y:number,gap=0,mode:'keys'|'click'='keys'){
 const target=point(x,y);if(mode==='click')expect(marketAct(r,{type:'move',point:target}),`click ${x},${y}`).toMatchObject({ok:true});
 let t=0;for(;t<30&&Math.hypot(r.state.player.x-x,r.state.player.y-y)>4;t+=1/60){
  const dx=x-r.state.player.x,dy=y-r.state.player.y,d=Math.hypot(dx,dy);
  marketTick(r,1/60,mode==='keys'?point(dx/d,dy/d):point(0,0));
  if(r.state.defeated)break;
 }
 expect(r.state.defeated,`dead walking to ${x},${y} at ${r.state.player.x},${r.state.player.y}`).toBe(false);
 expect(Math.hypot(r.state.player.x-x,r.state.player.y-y),`stuck walking to ${x},${y}`).toBeLessThanOrEqual(4);step(r,gap);
}
const openBoundary=()=>{const r=fresh();obj(r,'market_door').state='open';obj(r,'market_raider').state='retreated';return r;};
const publicAcross=(r:MarketRun)=>{walk(r,420,840);walk(r,880,840);};
const privateAcross=(r:MarketRun)=>{walk(r,470,840);walk(r,470,440);walk(r,830,440);};
const confirmNorth=(r:MarketRun)=>{walk(r,1140,840);walk(r,1140,240,0,'click');return marketAct(r,{type:'interact',targetId:'market_exit'});};
const returnWest=(r:MarketRun)=>{walk(r,1220,240);walk(r,1220,840);walk(r,420,840);walk(r,240,760);return marketAct(r,{type:'interact',targetId:'market_entry'});};

describe('synthetic safe fixtures isolate continuous corridor attribution',()=>{
 it('door open and public crossing records public only; north point needs an interaction',()=>{
  const r=openBoundary();publicAcross(r);expect(r.trip.traversed).toEqual({public:true,private:false});
  walk(r,1140,840);walk(r,1140,240,0,'click');expect(r.completed.public).toBe(false);
  expect(marketAct(r,{type:'interact',targetId:'market_exit'}).ok).toBe(true);expect(r.completed).toEqual({public:true,private:false});
  expect(returnWest(r).ok).toBe(true);expect(r.returned).toEqual({public:true,private:false});
 });
 it('private half entry and same-side retreat cannot hitchhike on the public result',()=>{
  const r=openBoundary();walk(r,470,440);walk(r,610,440);walk(r,470,440);walk(r,470,840);publicAcross(r);
  expect(confirmNorth(r).ok).toBe(true);expect(r.completed).toEqual({public:true,private:false});
 });
 it('keeps both actually traversed routes through backtracking instead of guessing from the door',()=>{
  const r=openBoundary();publicAcross(r);walk(r,420,840);privateAcross(r);
  walk(r,1000,440);walk(r,1140,240,0,'click');expect(marketAct(r,{type:'interact',targetId:'market_exit'}).ok).toBe(true);
  expect(r.completed).toEqual({public:true,private:true});returnWest(r);expect(r.returned).toEqual({public:true,private:true});
 });
 it('east-side partial visit cannot invent a complete private crossing',()=>{
  const r=openBoundary();publicAcross(r);walk(r,850,440);walk(r,720,440);walk(r,850,440);
  walk(r,1000,440);walk(r,1140,240,0,'click');marketAct(r,{type:'interact',targetId:'market_exit'});
  expect(r.completed).toEqual({public:true,private:false});
 });
 it('sideways escape invalidates incomplete traversal; original endpoint resets only the trip',()=>{
  const r=openBoundary();r.exchanged=true;walk(r,500,440);walk(r,510,600);walk(r,470,840);walk(r,240,760);
  marketAct(r,{type:'interact',targetId:'market_entry'});expect(r.trip.traversed).toEqual({public:false,private:false});expect(r.exchanged).toBe(true);
  expect(obj(r,'market_door').state).toBe('open');expect(r.completed).toEqual({public:false,private:false});
 });
 it('north initial fixture proves near endpoint alone and remote calls cannot finish',()=>{
  const r=openBoundary();Object.assign(r.state.player,point(1140,240));
  expect(marketAct(r,{type:'interact',targetId:'market_exit'}).ok).toBe(false);
  expect(marketAct(r,{type:'interact',targetId:'market_entry'}).ok).toBe(false);
 });
});

describe('fixed initial state actual act/tick replay without state injection',()=>{
 it.each(['private','public'] as const)('quiet exchange takes private outbound, returns via %s with active input gaps',(returnRoute)=>{
  const r=fresh();walk(r,470,760,.8,'click');
  const approach=returnRoute==='public'?interactionPoint(r.state,'market_merchant'):point(470,440);expect(approach).toBeDefined();walk(r,approach!.x,approach!.y,.8,'click');
  expect(r.state.events.some(e=>e.type==='alert')).toBe(false);expect(exchange(r).ok).toBe(true);step(r,4);
  expect(obj(r,'market_door').state).toBe('open');expect(obj(r,'market_merchant').x).toBeCloseTo(470);
  walk(r,620,440,.8,'click');expect(marketAct(r,{type:'move',point:point(820,440)}).ok).toBe(false);walk(r,620,405,.8,'click');walk(r,665,410,.8,'click');walk(r,820,405,.8,'click');walk(r,1140,240,.8,'click');
  expect(marketAct(r,{type:'interact',targetId:'market_exit'}).ok).toBe(true);
  if(returnRoute==='private'){walk(r,1000,240,.8);walk(r,1000,405,.8);walk(r,820,405,.8);walk(r,470,405,.8);walk(r,470,440,.8);walk(r,470,760,.8);walk(r,240,760,.8);}
  else for(const [x,y] of [[1220,240],[1220,840],[880,840],[420,840],[240,760]])walk(r,x,y,.8,'click');
  expect(marketAct(r,{type:'interact',targetId:'market_entry'}).ok).toBe(true);
  expect(r.returned).toEqual({public:false,private:true});expect(r.state.player.mana).toBe(6);
  console.log('MARKET_QUIET',JSON.stringify({returnRoute,time:r.state.time,hp:r.state.player.hp,mana:r.state.player.mana,enemy:obj(r,'market_raider')}));
 });
 it.each(['keys','click'] as const)('zero mana public out-and-back survives gaps using %s',(mode)=>{
  const r=createMarketRun({mana:'zero',informed:false});
  for(const [x,y] of (mode==='keys'?[[420,840],[880,840],[1140,840],[1220,840],[1220,240],[1140,240]]:[[420,840],[880,840],[1140,840],[1140,240]]))walk(r,x,y,.8,mode);
  expect(marketAct(r,{type:'interact',targetId:'market_exit'}).ok).toBe(true);
  for(const [x,y] of [[1220,240],[1220,840],[880,840],[420,840],[240,760]])walk(r,x,y,.8,mode);
  expect(marketAct(r,{type:'interact',targetId:'market_entry'}).ok).toBe(true);
  expect(r.returned).toEqual({public:true,private:false});expect(r.state.player.mana).toBe(0);expect(r.exchanged).toBe(false);expect(obj(r,'market_door').state).toBe('closed');
  expect(obj(r,'market_raider').state).not.toBe('retreated');expect(r.state.events.some(e=>e.type==='alert')).toBe(true);
  console.log('MARKET_PUBLIC_ZERO',JSON.stringify({time:r.state.time,hp:r.state.player.hp,mana:r.state.player.mana,enemy:obj(r,'market_raider')}));
 });
});

it.each(['keys','click'] as const)('actual decoy lure interrupts and resumes without another request using %s',(mode)=>{
 const r=fresh();walk(r,380,720,.8,mode);marketAct(r,{type:'cast',spell:'pull',targetId:'decoy',point:point(460,720)});marketAct(r,{type:'move',point:point(490,840)});step(r,.8);marketAct(r,{type:'release'});
 for(let i=0;i<1500&&obj(r,'market_raider').x>610;i++)step(r,1/60);
 walk(r,430,500,.8,mode);expect(exchange(r).ok).toBe(true);step(r,2);
 expect(obj(r,'market_merchant').state).toBe('waiting');expect(obj(r,'market_door').state).toBe('closed');
 const stopped={...obj(r,'market_merchant')};
 walk(r,180,500,.8,mode);walk(r,180,850,.8,mode);walk(r,mode==='click'?180:240,mode==='click'?780:760,.8,mode);step(r,2);
 expect(r.state.player.mana).toBe(5);expect(r.state.player.hp).toBeGreaterThan(0);expect(obj(r,'market_raider').hp).toBe(3);
 console.log('AUTO_RESUME',JSON.stringify({t:r.state.time,hp:r.state.player.hp,mana:r.state.player.mana,stopped,npc:obj(r,'market_merchant'),door:obj(r,'market_door'),e:obj(r,'market_raider')}));
 expect(obj(r,'market_door').state).toBe('open');expect(r.exchanged).toBe(true);
 expect(marketThreat(r)).toBe(true);expect(obj(r,'market_merchant').state).toBe('waiting');
 expect(marketAct(r,{type:'interact',targetId:'market_entry'}).ok).toBe(true);expect(r.completed).toEqual({public:false,private:false});
});

it.each(['keys','click'] as const)('zero-resource eastern loop and withdrawal using %s',(mode)=>{
 const r=createMarketRun({mana:'zero',informed:true});
 for(const [x,y] of [[420,840],[880,840],[1220,900],[880,900],[680,900],[430,900],[430,500]])walk(r,x,y,.8,mode);
 for(let i=0;i<600&&!marketThreat(r);i++)step(r,1/60);
 expect(marketThreat(r)).toBe(true);expect(talk(r).ok).toBe(true);
 expect(marketAct(r,{type:'choose',choiceId:'market:exchange'}).ok).toBe(false);marketAct(r,{type:'choose',choiceId:'leave'});
 for(const [x,y] of [[180,500],[180,850],mode==='click'?[180,780]:[240,760]])walk(r,x,y,.8,mode);
 expect(marketAct(r,{type:'interact',targetId:'market_entry'}).ok).toBe(true);
 expect(r.state.player.mana).toBe(0);expect(r.state.player.hp).toBeGreaterThan(0);expect(obj(r,'market_raider').hp).toBe(3);
 expect(r.exchanged).toBe(false);expect(obj(r,'market_door').state).toBe('closed');expect(r.completed).toEqual({public:false,private:false});
 console.log('ZERO_THREAT_WITHDRAWAL',JSON.stringify({time:r.state.time,hp:r.state.player.hp,mana:r.state.player.mana,enemy:obj(r,'market_raider')}));
});

it('synthetic open fixture counts west entry via the actual free western margin, not a virtual wider gate',()=>{
 const r=openBoundary();walk(r,510,490);expect(simulationPorts.free(r.state,r.state.player)).toBe(true);
 walk(r,510,440);walk(r,830,440);expect(r.trip.traversed.private).toBe(true);
});
it('synthetic open fixture accepts turning after the body clears the eastern wall edge',()=>{
 const r=openBoundary();walk(r,470,440);walk(r,800,440);walk(r,800,490);
 expect(simulationPorts.free(r.state,r.state.player)).toBe(true);expect(r.trip.traversed.private).toBe(true);
});
it('cancel clears a paused movement intention without moving the body after resume',()=>{
 const r=fresh();marketAct(r,{type:'pause',value:true});marketAct(r,{type:'move',point:point(400,760)});
 expect(r.state.pending?.type).toBe('move');marketAct(r,{type:'cancel'});expect(r.state.pending).toBeNull();
 marketAct(r,{type:'pause',value:false});step(r,1);expect(r.state.player.x).toBe(240);
});

it('synthetic middle-of-corridor fixture cannot claim a western entrance that never happened',()=>{
 const r=openBoundary();Object.assign(r.state.player,point(700,440));walk(r,830,440);
 expect(r.trip.traversed.private).toBe(false);walk(r,1000,440);walk(r,1140,240,0,'click');
 expect(marketAct(r,{type:'interact',targetId:'market_exit'}).ok).toBe(false);
});
it('synthetic safe fixture can add the other route on a later trip without erasing settled facts',()=>{
 const r=openBoundary();publicAcross(r);confirmNorth(r);returnWest(r);
 privateAcross(r);walk(r,1000,440);walk(r,1140,240,0,'click');marketAct(r,{type:'interact',targetId:'market_exit'});
 expect(r.trip.exitRoutes).toEqual(['private']);expect(r.completed).toEqual({public:true,private:true});
 expect(r.returned).toEqual({public:true,private:false});returnWest(r);expect(r.returned).toEqual({public:true,private:true});
});
it('paused endpoint confirmation waits for resume and cancel does not manufacture completion',()=>{
 const r=openBoundary();publicAcross(r);walk(r,1140,840);walk(r,1140,240,0,'click');
 marketAct(r,{type:'pause',value:true});marketAct(r,{type:'interact',targetId:'market_exit'});step(r,1);
 expect(r.completed.public).toBe(false);marketAct(r,{type:'cancel'});marketAct(r,{type:'pause',value:false});expect(r.completed.public).toBe(false);
 marketAct(r,{type:'pause',value:true});marketAct(r,{type:'interact',targetId:'market_exit'});marketAct(r,{type:'pause',value:false});expect(r.completed.public).toBe(true);
});
it('rejects production actions and invalid time; a fresh run loses no existing run facts',()=>{
 const r=atStall();exchange(r);step(r,3);const before=JSON.stringify(r);
 for(const type of ['retry','retreat','rest','heal','use-sachet'] as const)expect(marketAct(r,{type}).ok).toBe(false);
 for(const dt of [0,-1,NaN,Infinity])marketTick(r,dt,point(1,0));expect(JSON.stringify(r)).toBe(before);
 const restarted=fresh();expect(restarted.exchanged).toBe(false);expect(obj(restarted,'market_door').state).toBe('closed');expect(obj(restarted,'market_raider').state).toBe('idle');
 expect(restarted.state.player.hp).toBe(4);expect(restarted.state.player.mana).toBe(6);expect(JSON.stringify(r)).toBe(before);
});
it('synthetic enemy projectile fixture remains stopped by a closed door even at 120Hz',()=>{
 const r=atStall();r.state.projectiles.push({id:1,x:632,y:440,vx:260,vy:0,life:2,owner:'enemy'});
 for(let i=0;i<40;i++)marketTick(r,1/120,point(0,0));expect(r.state.projectiles).toHaveLength(0);expect(r.state.player.hp).toBe(4);
});
it('actual fire spends mana and impacts the closed door without burning it or unlocking it',()=>{
 const r=atStall();expect(marketAct(r,{type:'cast',spell:'flame',targetId:'market_door',point:point(665,440)}).ok).toBe(true);step(r,1.5);
 expect(r.state.player.mana).toBe(5);expect(obj(r,'market_door').state).toBe('closed');expect(r.state.events.some(e=>e.type==='impact')).toBe(true);expect(obj(r,'market_raider').hp).toBe(3);
});
it('the actual body cannot cross the closed door, then can cross once the NPC physically opens it',()=>{
 const r=atStall();step(r,2,point(1,0));expect(r.state.player.x).toBeLessThanOrEqual(633);expect(r.state.player.x).toBeGreaterThan(620);
 walk(r,470,440);exchange(r);step(r,3);walk(r,720,440);expect(r.state.player.x).toBeGreaterThan(700);
});
it('synthetic opened-door threat dialogue acknowledges the fulfilled promise instead of postponing the door again',()=>{
 const r=atStall();r.exchanged=true;obj(r,'market_door').state='open';Object.assign(obj(r,'market_raider'),point(490,700));
 expect(marketThreat(r)).toBe(true);expect(talk(r).ok).toBe(true);
 expect(r.state.dialogue?.text).toContain('门已开');expect(r.state.dialogue?.text).not.toContain('等他离远');
 expect(r.state.dialogue?.choices.some(c=>c.id==='market:exchange')).toBe(false);expect(obj(r,'market_door').state).toBe('open');
});

describe('actual click routes with time to read and pan the camera',()=>{
 it.each(['private','public','outer-public'] as const)('survives slower %s outbound and a five-second northern return decision',(route)=>{
  const r=createMarketRun({mana:route==='private'?'ordinary':'zero',informed:route==='private'});
  if(route==='private'){
   walk(r,470,760,2.8,'click');const near=interactionPoint(r.state,'market_merchant')!;walk(r,near.x,near.y,2.8,'click');expect(exchange(r).ok).toBe(true);step(r,4);
   for(const [x,y] of [[620,440],[620,405],[665,410],[820,405],[1140,240]])walk(r,x,y,2.8,'click');
  }else for(const [x,y] of (route==='outer-public'?[[420,880],[880,880],[1220,880],[1220,240],[1140,240]]:[[420,840],[880,840],[1140,840],[1140,240]]))walk(r,x,y,2.8,'click');
  expect(marketAct(r,{type:'interact',targetId:'market_exit'}).ok).toBe(true);
  walk(r,1220,240,5,'click');
  console.log('MARKET_SLOW_NORTH',JSON.stringify({route,time:r.state.time,hp:r.state.player.hp,enemy:obj(r,'market_raider')}));
  expect(r.state.defeated,'five seconds of active map reading should leave a usable return route').toBe(false);
  for(const [x,y] of (route==='outer-public'?[[1220,880],[880,880],[420,880],[240,760]]:[[1220,840],[880,840],[420,840],[240,760]]))walk(r,x,y,2.8,'click');
  expect(marketAct(r,{type:'interact',targetId:'market_entry'}).ok).toBe(true);expect(r.returned[route==='private'?'private':'public']).toBe(true);
  expect(r.state.player.mana).toBe(route==='private'?6:0);expect(obj(r,'market_raider').hp).toBe(3);expect(obj(r,'market_raider').state).not.toMatch(/peaceful|retreated/);
  const cornerImpacts=r.state.events.filter(e=>e.type==='impact'&&e.x!>=1030&&e.x!<=1180&&e.y!>=300&&e.y!<=480);
  if(route==='private')expect(cornerImpacts.length,'actual enemy shots must hit the added masonry').toBeGreaterThan(0);
  console.log('MARKET_SLOW_RETURN',JSON.stringify({route,time:r.state.time,hp:r.state.player.hp,mana:r.state.player.mana,enemy:obj(r,'market_raider'),cornerImpacts}));
 });
});

it('synthetic northern corner fixture blocks real sightlines while leaving an exposed eastern approach dangerous',()=>{
 const r=fresh();expect(simulationPorts.clearLine(r.state,point(1020,371),point(1220,240))).toBe(false);
 expect(simulationPorts.clearLine(r.state,point(1100,450),point(1220,240))).toBe(false);
 for(const p of [point(1140,240),point(1220,240),point(1220,400),point(1220,600)])expect(simulationPorts.free(r.state,p)).toBe(true);
 expect(simulationPorts.free(r.state,point(1160,400))).toBe(false);
 Object.assign(r.state.player,point(1220,240));Object.assign(obj(r,'market_raider'),point(1220,440));
 expect(simulationPorts.clearLine(r.state,obj(r,'market_raider'),r.state.player)).toBe(true);step(r,5.5);
 expect(r.state.player.hp).toBeLessThan(4);expect(obj(r,'market_raider').hp).toBe(3);
});

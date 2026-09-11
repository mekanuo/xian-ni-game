import type {ActionResult,DialogueChoice,Entity,GameState,MarketDirection,MarketPassages,MarketRoute,MarketState,SceneId,Vec} from './contracts';
import type {LifePorts} from './life';
import {MARKET_POINTS,MARKET_PASSAGE_BOUNDS as bounds} from './market-content';

export interface MarketPorts extends LifePorts {moveNpc(s:GameState,npc:Entity,to:Vec,speed:number,dt:number):void}
export type MarketActionResult=ActionResult&{checkpoint?:boolean};
const routes:MarketRoute[]=['public','private'];
const directions:MarketDirection[]=['westToEast','eastToWest'];
const blank=():MarketPassages=>({public:{westToEast:false,eastToWest:false},private:{westToEast:false,eastToWest:false}});
export function createMarketState():MarketState{return{exchanged:false,visit:null,through:blank(),reported:blank()};}
const object=(s:GameState,id:string)=>s.worlds.market.find(e=>e.id===id);
const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
const near=(s:GameState,e:Entity|undefined,p:MarketPorts):e is Entity=>!!e&&e.state!=='hidden'&&distance(s.player,e)<96&&p.free(s,s.player)&&p.clearLine(s,s.player,e,e.id);
const informed=(s:GameState)=>s.kiln.crossed.west||s.kiln.crossed.east;
const pendingReports=(s:GameState)=>routes.flatMap(route=>directions.filter(direction=>s.market.through[route][direction]&&!s.market.reported[route][direction]).map(direction=>({route,direction})));
const routeName=(route:MarketRoute)=>route==='public'?'公共巷':'私巷';
const journeyName=(route:MarketRoute,direction:MarketDirection)=>`${direction==='westToEast'?'从石渡经':'从旧渠经'}${routeName(route)}${direction==='westToEast'?'走到旧渠':'走到石渡'}`;
const no=(message:string):MarketActionResult=>({ok:false,message});

/** Derived state only: no knowledge, motion, visitation or rewards. */
export function marketRefresh(s:GameState):void {
 for(const scene of ['crossing','canal'] as const){const e=s.worlds[scene].find(e=>e.id===`${scene}_to_market`);if(e)e.state=s.journey.stage==='complete'?'idle':'hidden';}
 const door=object(s,'market_door');if(door)door.solid=door.state!=='open';
}
export function marketThreat(s:GameState,p:MarketPorts):boolean {
 if(s.scene!=='market')return false;
 const npc=object(s,'market_merchant');return !!npc&&s.worlds.market.some(e=>e.kind==='enemy'&&(e.hp??0)>0&&!['peaceful','retreated'].includes(e.state)&&distance(e,npc)<=300&&p.clearLine(s,npc,e,e.id));
}
export function marketChoices(s:GameState,e:Entity,p:MarketPorts):DialogueChoice[]{
 if(s.scene==='home'&&e.id==='table')return pendingReports(s).length?[{id:'market:report',label:'把亲自穿过小集的走法添在图上'}]:[];
 if(s.scene!=='market'||e.id!=='market_merchant')return[];
 return [...(!s.market.exchanged&&informed(s)&&!marketThreat(s,p)?[{id:'market:exchange',label:'说清旧窑通路，请她开门'}]:[]),{id:'market:public',label:'问清公共巷的走法'}];
}
export function marketChoose(s:GameState,id:string,p:MarketPorts):MarketActionResult|undefined {
 if(!id.startsWith('market:'))return undefined;
 const choice=s.dialogue?.choices.find(c=>c.id===id);
 if(s.defeated||!choice||choice.disabled)return no('眼前没有这个可以答应的话题');
 if(id==='market:report'){
  const table=s.worlds.home.find(e=>e.id==='table'),pending=pendingReports(s);
  if(s.scene!=='home'||!near(s,table,p))return no('回自己的桌边，再说明亲自走过的小集路线');
  if(!pending.length)return no('已经说明的走法留在图上，这次还没有新的穿行');
  for(const {route,direction}of pending)s.market.reported[route][direction]=true;
  p.emit(s,'note',`你在桌边说清${pending.map(({route,direction})=>journeyName(route,direction)).join('、')}的经过。对应巷道的笔迹留在纸图上，这一程的方向也记清了。`,table);
  return{ok:true,checkpoint:true};
 }
 const npc=object(s,'market_merchant');
 if(s.scene!=='market'||s.dialogue?.id!=='market_talk'||!near(s,npc,p))return no('走到沈砚身旁，再说眼前这条路');
 if(id==='market:exchange'){
  if(!informed(s))return no('还没有亲自穿过旧窑，不能拿不清楚的路况来交换');
  if(s.market.exchanged)return no('这条消息已经当面交代，不必再交换一遍');
  if(marketThreat(s,p))return no('他已转到近巷，先等来向离开');
  s.market.exchanged=true;
  const known=s.kiln.crossed.west&&s.kiln.crossed.east?'旧窑两端亲自穿行的经过':s.kiln.crossed.east?'从旧窑西院走上东口高岸的经过':'从旧渠穿过旧窑、走回西院的经过';
  p.emit(s,'change',`你说清${known}。沈砚答应亲自去开闩，门还要等她走到近处。`,npc);
  return{ok:true,checkpoint:true};
 }
 if(id==='market:public'){p.emit(s,'hint','沿货屋南侧的公共巷到东边，再向北口走；不必等私门打开。',npc);return{ok:true};}
 return no('眼前没有这个可以答应的话题');
}
export function marketInteract(s:GameState,e:Entity,p:MarketPorts):ActionResult|undefined {
 if(s.scene!=='market'||e.id!=='market_merchant')return undefined;
 if(!near(s,e,p))return no('走到沈砚身旁再说');
 p.dialogue(s,'market_talk',e.name,marketDescription(s,e,p)!,marketChoices(s,e,p));return{ok:true};
}
function npcTick(s:GameState,dt:number,p:MarketPorts):boolean {
 const npc=object(s,'market_merchant'),door=object(s,'market_door');if(!npc||!door)return false;
 if(!s.market.exchanged){npc.state='idle';return false;}
 const home=MARKET_POINTS.merchant;
 if(door.state==='open'&&distance(npc,home)<.01){npc.state='idle';return false;}
 if(marketThreat(s,p)){if(npc.state!=='waiting')p.emit(s,'hint','沈砚看见近巷的来人，停在原处等来向离开。',npc);npc.state='waiting';return false;}
 let target:Vec=MARKET_POINTS.latch;
 if(door.state==='open')target=npc.x>home.x+.01?(npc.y>405.01?{x:npc.x,y:405}:{x:home.x,y:405}):home;
 const before={x:npc.x,y:npc.y};p.moveNpc(s,npc,target,120,dt);npc.state=distance(npc,before)>.001?'leading':'idle';
 if(npc.state==='leading')npc.facing=Math.atan2(npc.y-before.y,npc.x-before.x);
 if(door.state!=='open'&&distance(npc,MARKET_POINTS.latch)<=8&&p.free(s,npc,17,npc.id)&&!marketThreat(s,p)){
  door.state='open';door.solid=false;p.emit(s,'change','沈砚到闩边解开木门，随即侧身让出巷道。',door);return true;
 }
 return false;
}
/** Both directions use the same physical band. A partial entry is lost on a
 * same-side retreat or a side exit; only a full continuous passage is retained. */
function observePassage(s:GameState,from:Vec,to:Vec):void {
 const visit=s.market.visit;if(!visit)return;
 const dx=to.x-from.x,dy=to.y-from.y,yAt=(x:number)=>from.y+dy*(x-from.x)/dx;
 const inside=(route:MarketRoute,y:number)=>y>=bounds[route].low&&y<=bounds[route].high;
 if(!visit.transit){
  const side=dx>0&&from.x<=bounds.west&&to.x>bounds.west?'west':dx<0&&from.x>=bounds.east&&to.x<bounds.east?'east':null;
  if(side)for(const route of routes)if(inside(route,yAt(side==='west'?bounds.west:bounds.east))){visit.transit={route,from:side};break;}
 }
 const transit=visit.transit;if(!transit)return;
 const {route}=transit,sign=transit.from==='west'?1:-1,entry=transit.from==='west'?bounds.west:bounds.east,exit=transit.from==='west'?bounds.east:bounds.west;
 const startY=sign*(from.x-entry)<0&&sign*dx>0?yAt(entry):from.y;
 const endY=sign*(to.x-exit)>=0&&sign*dx>0?yAt(exit):to.y;
 if(!inside(route,startY)||!inside(route,endY)||sign*(to.x-entry)<0){visit.transit=null;return;}
 if(sign*(to.x-exit)>=0&&sign*dx>0){visit.passed[route][transit.from==='west'?'westToEast':'eastToWest']=true;visit.transit=null;}
}
/** Called once after each actual engine step, never calls the total tick itself.
 * true requests one checkpoint after both NPC motion and passage observation. */
export function marketTick(s:GameState,dt:number,fromPlayer:Vec,p:MarketPorts):boolean {
 if(s.scene!=='market'||s.paused||s.dialogue||s.defeated||!Number.isFinite(dt)||dt<=0)return false;
 marketRefresh(s);const opened=npcTick(s,dt,p);observePassage(s,fromPlayer,s.player);return opened;
}
/** Caller has already validated and assigned the destination scene and feet.
 * No result is committed for a failed exit or an in-place endpoint interaction. */
export function marketAfterTravel(s:GameState,from:SceneId,to:SceneId):void {
 if(from===to||s.scene!==to)return;
 if(from==='market'){
  const visit=s.market.visit;
  if(visit&&(visit.entry==='crossing'&&to==='canal'||visit.entry==='canal'&&to==='crossing')){
   const direction=visit.entry==='crossing'?'westToEast':'eastToWest';
   for(const route of routes)if(visit.passed[route][direction])s.market.through[route][direction]=true;
  }
  marketAbandonVisit(s);
 }
 if(to==='market'&&(from==='crossing'||from==='canal')&&s.journey.stage==='complete')s.market.visit={entry:from,transit:null,passed:blank()};
}
export function marketAbandonVisit(s:GameState):void{s.market.visit=null;}
export function marketObjective(s:GameState):string|undefined {
 if(s.scene==='home'&&pendingReports(s).length)return '到自己的桌边，说清亲自穿过小集的路线';
 if(s.scene!=='market')return undefined;
 const destination=s.market.visit?.entry==='canal'?'西口回石渡':'北口去旧渠';
 const door=object(s,'market_door');
 return `${door?.state==='open'?'私门已开，公共巷也可走':s.market.exchanged?'等沈砚到闩边，公共巷仍可走':'公共巷可走，也可问沈砚'}；${destination}。`;
}
export function marketDescription(s:GameState,e:Entity,p:MarketPorts):string|undefined {
 if(s.scene==='home'&&e.id==='table'){
  if(pendingReports(s).length)return '旧渠小图与工棚回程记号仍在桌边。你又亲自穿过了小集，可以把这次走法接到图上。';
  const reported=routes.flatMap(route=>directions.filter(direction=>s.market.reported[route][direction]).map(direction=>journeyName(route,direction)));
  if(reported.length)return `纸图记着你${reported.join('、')}的经过。旧渠小图与工棚回程记号仍在旁边。`;
  return undefined;
 }
 if(s.scene!=='market')return undefined;
 if(e.id==='market_door')return e.state==='open'?'沈砚解开的木门，巷道已可亲自穿过。':'私巷木门还关着；公共巷在货屋南侧。';
 if(e.id!=='market_merchant')return undefined;
 const open=object(s,'market_door')?.state==='open';
 if(marketThreat(s,p))return open?'门已开；他转到近巷，留心来向。':'他转到近巷了。后门的事，等他离远些。';
 if(s.market.exchanged)return open?'门已经打开；走哪条巷，还得你自己认。':'路我已说了，我去开闩。';
 return informed(s)?'旧窑那边，你走过没有？说清那边的通路，我替你开后巷门。':'旧窑的路况还说不清也无妨，公共巷在货屋南边。';
}

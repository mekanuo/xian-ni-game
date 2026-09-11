import { SCENES } from '../game/content';
import { act, createGame, simulationPorts as ports, tick } from '../game/model';
import type { ActionResult, Entity, GameAction, GameState, SceneDefinition, Vec } from '../game/contracts';
export type MarketRoute = 'public' | 'private';
export interface MarketPreset { mana:'ordinary'|'zero'; informed:boolean }
export interface MarketTransit { route:MarketRoute; from:'west'|'east' }
export interface MarketRun {
 state:GameState; preset:MarketPreset; exchanged:boolean;
 trip:{transit:MarketTransit|null;traversed:Record<MarketRoute,boolean>;exitRoutes:MarketRoute[]|null};
 completed:Record<MarketRoute,boolean>; returned:Record<MarketRoute,boolean>;
}
export const MARKET_POINTS:Record<'entry'|'exit'|'merchant'|'latch'|'decoy'|'enemy',Vec>={
 entry:{x:240,y:760},exit:{x:1140,y:240},merchant:{x:470,y:380},latch:{x:620,y:440},decoy:{x:460,y:720},enemy:{x:850,y:560},
};
export const MARKET_MAP:SceneDefinition={
 id:'home',title:'集口问路 · 空间与交涉白盒',subtitle:'问路、亲自穿巷，到北口确认后步行折返。',width:1400,height:1000,spawn:{...MARKET_POINTS.entry},
 palette:{ground:0xb6aa91,path:0xcbbda0,foliage:0x777d64,water:0x789eac},ground:[{type:'floor',points:[120,80,1280,80,1280,920,120,920]}],
 obstacles:[{x:80,y:40,w:1240,h:40},{x:80,y:920,w:1240,h:40},{x:80,y:80,w:40,h:840},{x:1280,y:80,w:40,h:840},{x:540,y:80,w:240,h:300},{x:540,y:500,w:240,h:280},
  // Real northern masonry gives a turn to read behind; the eastern lane remains
  // 100 wide (66 for a body), and enemies can still approach or shoot around it.
  {x:1030,y:300,w:150,h:40},{x:1150,y:300,w:30,h:180}],
 entities:[
  {id:'market_merchant',name:'沈砚',kind:'npc',type:'market-merchant',...MARKET_POINTS.merchant,w:40,h:60,state:'idle'},
  {id:'market_door',name:'私巷木门',kind:'object',type:'market-door',x:665,y:440,w:30,h:120,state:'closed',solid:true},
  {id:'market_entry',name:'原口',kind:'exit',type:'market-endpoint',...MARKET_POINTS.entry,w:60,h:70,state:'idle'},
  {id:'market_exit',name:'北口',kind:'exit',type:'market-endpoint',...MARKET_POINTS.exit,w:60,h:70,state:'idle'},
  {id:'decoy',name:'无主空筐',kind:'object',type:'decoy',...MARKET_POINTS.decoy,homeX:460,homeY:720,w:50,h:40,state:'idle',movable:true,flammable:true},
  {id:'market_raider',name:'占道散修',kind:'enemy',type:'raider',...MARKET_POINTS.enemy,homeX:850,homeY:560,w:40,h:60,hp:3,state:'idle',data:{lastX:850,lastY:560,seen:0,attack:0}},
 ],
};
export function installMarketMap():()=>void {const previous=SCENES.home;SCENES.home=MARKET_MAP;return()=>{SCENES.home=previous;};}
const blankRoutes=():Record<MarketRoute,boolean>=>({public:false,private:false});
export function createMarketRun(preset:MarketPreset):MarketRun {
 if(SCENES.home!==MARKET_MAP)throw Error('先在独立白盒入口安装候选地图');
 if(!preset||!['ordinary','zero'].includes(preset.mana)||typeof preset.informed!=='boolean')throw Error('未知白盒初态');
 const state=createGame({name:'行舟',origin:'tinker',wish:'travel',appearance:0});
 state.worlds.home=structuredClone(MARKET_MAP.entities);state.player.mana=preset.mana==='zero'?0:6;state.ringStyle='hold';
 state.lastSafe={scene:'home',point:{...MARKET_POINTS.entry}};state.checkpoint=null;state.events=[];state.flags.eventSeq=0;
 return{state,preset:{...preset},exchanged:false,trip:{transit:null,traversed:blankRoutes(),exitRoutes:null},completed:blankRoutes(),returned:blankRoutes()};
}
const entity=(run:MarketRun,id:string)=>run.state.worlds.home.find(e=>e.id===id)!;
const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
const ok=(message?:string):ActionResult=>message?{ok:true,message}:{ok:true};
const no=(message:string):ActionResult=>({ok:false,message});
function refreshDoor(run:MarketRun){entity(run,'market_door').solid=entity(run,'market_door').state!=='open';}
function near(run:MarketRun,e:Entity,radius:number){const s=run.state;return distance(s.player,e)<=radius&&ports.free(s,s.player)&&ports.clearLine(s,s.player,e,e.id);}
export function marketThreat(run:MarketRun):boolean {
 const s=run.state,npc=entity(run,'market_merchant');
 return s.scene==='home'&&s.worlds.home.some(e=>e.kind==='enemy'&&(e.hp??0)>0&&!['peaceful','retreated'].includes(e.state)&&distance(e,npc)<=300&&ports.clearLine(s,npc,e,e.id));
}
const allowed=new Set<GameAction['type']>(['move','cast','select','pause','release','hold','cancel']);
const custom=(a:GameAction)=>a.type==='interact'&&['market_merchant','market_entry','market_exit'].includes(a.targetId);
export function marketAct(run:MarketRun,action:GameAction):ActionResult {
 const s=run.state;refreshDoor(run);
 if(s.scene!=='home')return no('白盒只在当前小集内运行');
 if(action.type==='cancel'){s.pending=null;return act(s,action);}
 if(action.type==='pause'&&!action.value&&s.pending&&custom(s.pending)){
  if(s.dialogue||s.defeated)return act(s,action);
  const pending=s.pending;s.pending=null;const resumed=act(s,action);if(!resumed.ok){s.pending=pending;return resumed;}
  const answer=marketAct(run,pending);if(!answer.ok)ports.emit(s,'invalid',answer.message??'待办已经不成立');return answer;
 }
 if(action.type==='choose'){
  if(action.choiceId==='leave'||action.choiceId==='more')return act(s,action);
  const d=s.dialogue,choice=d?.choices.find(c=>c.id===action.choiceId);
  if(d?.id!=='market_talk'||!choice||choice.disabled||s.defeated)return no(choice?.disabled??'当前没有这个话题');
  if(!near(run,entity(run,'market_merchant'),95.999))return no('走到沈砚身旁再说');
  if(action.choiceId==='market:exchange'){
   if(!run.preset.informed||run.exchanged)return no('这条消息不能重复交换');
   if(marketThreat(run))return no('他已转到近巷，先等来向离开');
   run.exchanged=true;ports.closeDialogue(s);ports.emit(s,'change','路况已经当面交代；沈砚答应亲自去开闩。',entity(run,'market_merchant'));return ok();
  }
  if(action.choiceId==='market:public'){ports.closeDialogue(s);ports.emit(s,'hint','沿货屋南侧的公共巷走到东边，再向北口走。');return ok();}
  return no('没有这个话题');
 }
 if(!custom(action))return allowed.has(action.type)?act(s,action):no('白盒只开放行走、三术法与本处交谈；需从初态按钮重新开始。');
 if(s.defeated)return no('体力耗尽，请从白盒初态重新开始');
 if(s.dialogue)return no('先完成眼前交谈');
 if(s.paused){s.pending=structuredClone(action);return ok('已指定待执行动作；恢复时重新检查');}
 if(action.type!=='interact')return no('无效互动');
 const target=entity(run,action.targetId);
 if(!near(run,target,target.id==='market_merchant'?95.999:65))return no('沿可走地面走到近处再确认');
 if(target.id==='market_merchant'){
  const threat=marketThreat(run),door=entity(run,'market_door');
  const text=threat?(door.state==='open'?'门已开；他转到近巷，留心来向。':'他转到近巷了。后门的事，等他离远些。'):run.exchanged?(door.state==='open'?'门已经打开；走哪条巷，还得你自己认。':'路我已说了，我去开闩。'):run.preset.informed?'旧窑那边，你走过没有？说清那边的通路，我替你开后巷门。':'旧窑的路况还说不清也无妨，公共巷在货屋南边。';
  ports.dialogue(s,'market_talk','沈砚',text,[...(!run.exchanged&&run.preset.informed&&!threat?[{id:'market:exchange',label:'说清旧窑通路，请她开门'}]:[]),{id:'market:public',label:'问清公共巷的走法'}]);return ok();
 }
 if(target.id==='market_exit'){
  if(run.trip.exitRoutes)return no('北口已经确认；亲自返回原口结束这趟行走');
  const routes=(['public','private'] as MarketRoute[]).filter(route=>run.trip.traversed[route]);
  if(!routes.length)return no('尚未从货屋西侧完整走过一条巷道');
  run.trip.exitRoutes=routes;for(const route of routes)run.completed[route]=true;
  ports.emit(s,'change',`已亲自走到北口，记下${routes.map(r=>r==='public'?'公共巷':'私巷').join('与')}；还可步行折返。`,target);return ok();
 }
 if(run.trip.exitRoutes){for(const route of run.trip.exitRoutes)run.returned[route]=true;ports.emit(s,'change','已从北口亲自走回原口。',target);}
 else ports.emit(s,'hint','在原口结束这趟试走；先前交代的话与已开的门仍在。',target);
 run.trip={transit:null,traversed:blankRoutes(),exitRoutes:null};return ok();
}
function npcTick(run:MarketRun,dt:number){
 const s=run.state,npc=entity(run,'market_merchant'),door=entity(run,'market_door');
 if(!run.exchanged){npc.state='idle';return;}
 const home=MARKET_POINTS.merchant;
 if(door.state==='open'&&distance(npc,home)<.01){npc.state='idle';return;}
 if(marketThreat(run)){if(npc.state!=='waiting')ports.emit(s,'hint','沈砚看见近巷的来人，停在原处等来向离开。',npc);npc.state='waiting';return;}
 let target:Vec=MARKET_POINTS.latch;
 if(door.state==='open')target=npc.x>home.x+.01?(npc.y>405.01?{x:npc.x,y:405}:{x:home.x,y:405}):home;
 const before={x:npc.x,y:npc.y};ports.moveNpc(s,npc,target,120,dt);
 npc.state=distance(npc,before)>.001?'leading':'idle';
 if(npc.state==='leading')npc.facing=Math.atan2(npc.y-before.y,npc.x-before.x);
 if(door.state!=='open'&&distance(npc,MARKET_POINTS.latch)<=8&&ports.free(s,npc,17,npc.id)&&!marketThreat(run)){
  door.state='open';refreshDoor(run);ports.emit(s,'change','沈砚到闩边解开木门，随即侧身让出巷道。',door);
 }
}
// The actual store footprint is x540..780; bodies have radius17.
const WEST_EDGE=523,EAST_EDGE=797;
const bands:Record<MarketRoute,{low:number;high:number}>={private:{low:397,high:483},public:{low:797,high:903}};
/** A segment can only arm at the west boundary, never from an eastern probe.
 * Each band is convex: its clipped segment endpoints prove the whole interior. */
function observePassage(run:MarketRun,from:Vec,to:Vec){
 if(run.trip.exitRoutes)return;
 const dx=to.x-from.x,dy=to.y-from.y;
 const yAt=(x:number)=>from.y+dy*(x-from.x)/dx;
 const inside=(route:MarketRoute,y:number)=>y>=bands[route].low&&y<=bands[route].high;
 if(!run.trip.transit&&dx>0&&from.x<=WEST_EDGE&&to.x>WEST_EDGE){
  for(const route of ['public','private'] as MarketRoute[])if(inside(route,yAt(WEST_EDGE))){run.trip.transit={route,from:'west'};break;}
 }
 const transit=run.trip.transit;if(!transit)return;
 const route=transit.route;
 const startY=from.x<WEST_EDGE&&dx>0?yAt(WEST_EDGE):from.y;
 const endY=to.x>=EAST_EDGE&&dx>0?yAt(EAST_EDGE):to.y;
 if(!inside(route,startY)||!inside(route,endY)||to.x<WEST_EDGE){run.trip.transit=null;return;}
 if(to.x>=EAST_EDGE&&dx>0){run.trip.traversed[route]=true;run.trip.transit=null;}
}
export function marketTick(run:MarketRun,dt:number,input:Vec):void {
 const s=run.state;if(s.scene!=='home'||!Number.isFinite(dt)||dt<=0||s.paused||s.dialogue||s.defeated)return;
 let remaining=Math.min(dt,1);
 while(remaining>1e-9){const delta=Math.min(.025,remaining);remaining-=delta;refreshDoor(run);const before=s.time,position={x:s.player.x,y:s.player.y};tick(s,delta,input);
  if(s.time<=before||s.paused||s.dialogue||s.defeated)break;
  npcTick(run,delta);observePassage(run,position,s.player);
 }
}

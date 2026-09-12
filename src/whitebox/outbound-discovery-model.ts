import { SCENES } from '../game/content';
import { act, createGame, simulationPorts, tick } from '../game/model';
import type { ActionResult, Entity, GameState, SceneDefinition, Vec } from '../game/contracts';

export const DISCOVERY_POINTS = {
 start:{x:250,y:1300}, upper:{x:1550,y:500}, lower:{x:1530,y:1190},
 quiet:{x:1170,y:1450}, npcStart:{x:670,y:1100},
};
export const DISCOVERY_MAP:SceneDefinition = {
 id:'home', title:'回声水口 · 空间发现小样', subtitle:'走到山外，看看水从哪里来。', width:2200,height:1700,
 spawn:{...DISCOVERY_POINTS.start},palette:{ground:0x879487,path:0xb7b49c,foliage:0x566f5c,water:0x679798},
 ground:[{type:'water',points:[1800,40,2160,40,2160,1660,1800,1660]}],
 obstacles:[{x:0,y:0,w:2200,h:40},{x:0,y:1660,w:2200,h:40},{x:0,y:40,w:40,h:1620},{x:2160,y:40,w:40,h:1620},{x:850,y:650,w:800,h:300},{x:1800,y:40,w:360,h:1620}],
 entities:[{id:'discovery_cenzhou',name:'岑舟',kind:'npc',type:'discovery-traveler',...DISCOVERY_POINTS.npcStart,w:40,h:60,state:'idle',hp:3}],
};
export type DiscoveryPhase='waiting'|'walking-lower'|'listening-lower'|'walking-quiet'|'quiet'|'walking-upper'|'listening-upper'|'upper';
export interface DiscoveryRound {
 s:GameState; npc:Entity; npcPhase:DiscoveryPhase; npcPath:Vec[];
 visits:{upper:boolean;lower:boolean}; observation:{upper:number;lower:number;npc:number};
 met:boolean; returned:boolean;
}
export type DiscoveryAction={type:'move';point:Vec}|{type:'pause';value:boolean}|{type:'talk'}|{type:'leave'}|{type:'suggest-upper'};
const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
export function installDiscoveryMap():()=>void {
 const previous=SCENES.home;SCENES.home=DISCOVERY_MAP;return()=>{SCENES.home=previous;};
}
export function createDiscovery():DiscoveryRound {
 if(SCENES.home!==DISCOVERY_MAP)throw Error('Install the isolated discovery map first');
 const s=createGame({name:'行舟',origin:'tinker',wish:'travel',appearance:0});
 s.worlds.home=structuredClone(DISCOVERY_MAP.entities);s.events=[];s.flags={eventSeq:0,companion:'waiting'};
 s.checkpoint=null;s.lastSafe={scene:'home',point:{...DISCOVERY_POINTS.start}};s.herbs=0;
 return {s,npc:s.worlds.home[0],npcPhase:'waiting',npcPath:[],visits:{upper:false,lower:false},observation:{upper:0,lower:0,npc:0},met:false,returned:false};
}
function journey(r:DiscoveryRound,phase:DiscoveryPhase,points:Vec[]):void {
 r.npcPhase=phase;r.npcPath=points.map(p=>({...p}));r.observation.npc=0;r.npc.state='walking';
}
export function discoveryAct(r:DiscoveryRound,a:DiscoveryAction):ActionResult {
 const s=r.s;
 if(a.type==='move'||a.type==='pause')return act(s,a);
 if(a.type==='leave'){
  if(!s.dialogue)return {ok:false,message:'当前没有交谈'};
  simulationPorts.closeDialogue(s);return {ok:true};
 }
 if(a.type==='talk'){
  if(distance(s.player,r.npc)>100)return {ok:false,message:'走近岑舟再说话'};
  r.met=true;
  const text=r.npcPhase==='waiting'||r.npcPhase==='walking-lower'?'我想下去听听水，找块能静坐的地方。你随意，不必等我。':r.npcPhase==='upper'||r.npcPhase==='listening-upper'?'这里风大，倒听不见岩下那阵回声。我先坐一会儿。':r.npcPhase==='walking-upper'?'去上面亲自试试，你说的风声或许更合适。':'近水这边反而响。我换到背水的岩边试试。';
  const canSuggest=r.visits.upper&&!['walking-upper','listening-upper','upper'].includes(r.npcPhase);
  simulationPorts.dialogue(s,'discovery-talk','岑舟',text,canSuggest?[{id:'suggest-upper',label:'上面听不到回声，不过风大。'}]:[]);
  return {ok:true};
 }
 if(!s.dialogue||s.dialogue.id!=='discovery-talk'||distance(s.player,r.npc)>100)return {ok:false,message:'先走近交谈'};
 if(!r.visits.upper)return {ok:false,message:'还没有亲自看过上层'};
 if(['walking-upper','listening-upper','upper'].includes(r.npcPhase))return {ok:false,message:'他已经决定去上层亲试'};
 journey(r,'walking-upper',[DISCOVERY_POINTS.lower,{x:650,y:1150},{x:650,y:500},DISCOVERY_POINTS.upper]);
 simulationPorts.closeDialogue(s);return {ok:true};
}
function step(r:DiscoveryRound,dt:number,input:Vec):void {
 const s=r.s,from={x:s.player.x,y:s.player.y};tick(s,dt,input);
 const still=distance(from,s.player)<.001;
 for(const site of ['upper','lower'] as const){
  if(!r.visits[site]){
   r.observation[site]=still&&distance(s.player,DISCOVERY_POINTS[site])<=80?r.observation[site]+dt:0;
   if(r.observation[site]>=.7){r.visits[site]=true;simulationPorts.emit(s,'discovery',site==='upper'?'河道绕出山口，风声盖过了水声。':'水在岩下折回，轰鸣就来自近处的空腔。',s.player);}
  }
 }
 if(distance(s.player,DISCOVERY_POINTS.start)>120)s.flags.discoveryDeparted=true;
 if(s.flags.discoveryDeparted&&distance(s.player,DISCOVERY_POINTS.start)<=80)r.returned=true;
 if(r.npcPhase==='waiting'&&distance(s.player,r.npc)<=220)journey(r,'walking-lower',[{x:900,y:1250},DISCOVERY_POINTS.lower]);
 if(r.npcPath.length){
  const target=r.npcPath[0];r.npc.facing=Math.atan2(target.y-r.npc.y,target.x-r.npc.x);
  simulationPorts.moveNpc(s,r.npc,target,125,dt);
  if(distance(r.npc,target)<3)r.npcPath.shift();
  if(!r.npcPath.length){
   r.npc.state='idle';r.observation.npc=0;
   r.npcPhase=r.npcPhase==='walking-lower'?'listening-lower':r.npcPhase==='walking-upper'?'listening-upper':'quiet';
  }
 }else if(r.npcPhase==='listening-lower'||r.npcPhase==='listening-upper'){
  r.observation.npc+=dt;
  if(r.observation.npc>=2){
   if(r.npcPhase==='listening-lower')journey(r,'walking-quiet',[DISCOVERY_POINTS.quiet]);
   else {r.npcPhase='upper';r.npc.state='sitting';}
  }
 }
}
export function discoveryTick(r:DiscoveryRound,dt:number,input:Vec={x:0,y:0}):void {
 if(r.s.paused||r.s.dialogue||r.s.defeated||!Number.isFinite(dt)||dt<=0)return;
 let remaining=Math.min(dt,1);
 while(remaining>1e-8){const slice=Math.min(.025,remaining);step(r,slice,input);remaining-=slice;}
}

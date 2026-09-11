import {SCENES} from '../game/content';
import {act,createGame,tick,simulationPorts} from '../game/model';
import type {ActionResult,Entity,GameAction,GameState,SceneDefinition,Vec} from '../game/contracts';
export const SPAR_CENTER={x:900,y:940};
export const SPAR_PEER_READY={x:900,y:720};
export const SPAR_STANCES={front:SPAR_PEER_READY,left:{x:680,y:940},right:{x:1120,y:940}};
export type SparStance=keyof typeof SPAR_STANCES;
export const SPAR_MAP:SceneDefinition={id:'home',title:'划线切磋 · 灰盒',subtitle:'一手守线',width:1800,height:1800,spawn:{x:900,y:1060},palette:{ground:0x343e36,path:0x7c7864,foliage:0x596952,water:0x50686c},ground:[{type:'floor',points:[0,0,1800,0,1800,1800,0,1800]}],obstacles:[],entities:[]};
export function installSparMap(){const previous=SCENES.home;SCENES.home=SPAR_MAP;return()=>{SCENES.home=previous;};}
export type SparOutcome='hit'|'dodged'|'blocked'|'stopped'|'outside';
export interface SparRound {positionPath:Vec[];positionWaiting:boolean;stance:SparStance;s:GameState;peer:Entity;phase:'idle'|'positioning'|'active'|'settling'|'result';outcome:SparOutcome|null;shots:number;startHp:number;startSeq:number;blocked:boolean;stopReason:'stopped'|'outside'|null;}
export type SparAction=GameAction|{type:'agree';stance?:SparStance}|{type:'begin'|'stop'};
export function createSpar(mana=6):SparRound {
 if(SCENES.home!==SPAR_MAP)throw Error('Install the isolated spar map first');
 const s=createGame({name:'行舟',origin:'tinker',wish:'travel',appearance:0});
 const peer:Entity={id:'spar_peer',kind:'enemy',type:'raider',name:'闻朔',x:900,y:980,w:40,h:40,hp:3,state:'peaceful',data:{attack:0}};
 s.worlds.home=[peer];s.flags={eventSeq:0,companion:'waiting'};s.events=[];s.checkpoint=null;s.herbs=0;s.player.mana=mana;s.ringStyle='hold';
 return {positionPath:[],positionWaiting:false,stance:'front',s,peer,phase:'idle',outcome:null,shots:0,startHp:4,startSeq:0,blocked:false,stopReason:null};
}
const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
const inside=(r:SparRound)=>distance(r.s.player,SPAR_CENTER)<=53;
function segmentDistance(a:Vec,b:Vec,p:Vec){const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;const t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;return Math.hypot(a.x+t*dx-p.x,a.y+t*dy-p.y);}
function positioningRoute(from:Vec,to:Vec):Vec[]{
 // These four agreed stations form the local walking circuit. No global AI or
 // collision changes: choose a short sequence whose segments stay outside the line.
 if(distance(from,SPAR_CENTER)<110||segmentDistance(from,to,SPAR_CENTER)>=110)return [{...to}];
 const points=[{...from},{...to},SPAR_STANCES.front,SPAR_STANCES.left,SPAR_STANCES.right,{x:900,y:1160}];
 const costs=points.map(()=>Infinity),previous=points.map(()=>-1),done=new Set<number>();costs[0]=0;
 for(let pass=0;pass<points.length;pass++){
  let best=-1;for(let i=0;i<points.length;i++)if(!done.has(i)&&(best<0||costs[i]<costs[best]))best=i;
  if(best<0||!Number.isFinite(costs[best]))break;if(best===1)break;done.add(best);
  for(let i=0;i<points.length;i++)if(i!==best&&!done.has(i)&&segmentDistance(points[best],points[i],SPAR_CENTER)>=110){
   const cost=costs[best]+distance(points[best],points[i]);if(cost<costs[i]){costs[i]=cost;previous[i]=best;}
  }
 }
 const route:Vec[]=[];for(let i=1;i!==0;i=previous[i]){if(i<0)return [];route.unshift({...points[i]});}return route;
}
function positionStep(r:SparRound,dt:number){
 const target=r.positionPath[0];r.positionWaiting=false;if(!target)return;
 const d=distance(r.peer,target),amount=Math.min(d,90*dt);if(d<.01){r.positionPath.shift();return;}
 const next={x:r.peer.x+(target.x-r.peer.x)*amount/d,y:r.peer.y+(target.y-r.peer.y)*amount/d};
 // Yield when our own next step would crowd the player. A player walking into
 // a peaceful actor still follows the existing game's non-solid actor rule.
 if(segmentDistance(r.peer,next,r.s.player)<40&&distance(next,r.s.player)<distance(r.peer,r.s.player)){r.positionWaiting=true;return;}
 simulationPorts.moveNpc(r.s,r.peer,target,90,dt);if(distance(r.peer,target)<.01)r.positionPath.shift();
}

const fail=(message:string):ActionResult=>({ok:false,message});
function cleanStart(r:SparRound){const s=r.s;return s.player.hp>=2&&(r.peer.hp??0)>=2&&!s.projectiles.length&&!s.flags.casting&&!s.pending&&!s.player.pullId;}
function stop(r:SparRound,reason:'stopped'|'outside'){
 r.stopReason??=reason;r.phase='settling';r.peer.state='peaceful';r.peer.data!.attack=0;
}
export function sparAct(r:SparRound,a:SparAction):ActionResult {
 const s=r.s;
 if(a.type==='pause'||a.type==='move'||a.type==='cancel')return act(s,a);
 if(a.type==='cast')return a.spell==='ward'&&(r.phase==='active'||r.phase==='settling')?act(s,a):fail('这一手只练步法与护符，不抢攻。');
 if(s.paused)return fail('先恢复，再约定或收手。');
 if(a.type==='agree'){
  if(!['idle','result'].includes(r.phase)||!cleanStart(r))return fail('体力至少两格，且先前出手已经结清，才可约下一手。');
  if(distance(s.player,r.peer)>96)return fail('先走近闻朔，约好再开始。');
  if(a.stance!==undefined&&!Object.hasOwn(SPAR_STANCES,a.stance))return fail('请选择正面、左侧或右侧。');
  r.stance=a.stance??'front';r.positionPath=positioningRoute(r.peer,SPAR_STANCES[r.stance]);r.positionWaiting=false;r.startHp=s.player.hp;r.startSeq=Number(s.flags.projectileSeq??0);r.phase='positioning';r.outcome=null;r.stopReason=null;r.shots=0;r.blocked=false;r.peer.state='peaceful';r.peer.data!.attack=0;return {ok:true};
 }
 if(a.type==='begin'){
  if(r.phase!=='positioning'||!inside(r)||distance(r.peer,SPAR_STANCES[r.stance])>3||!cleanStart(r))return fail('双方先走到位置，你站稳在线内。');
  r.phase='active';r.startHp=s.player.hp;r.startSeq=Number(s.flags.projectileSeq??0);r.peer.state='chasing';r.peer.data!.attack=0;return {ok:true};
 }
 if(a.type==='stop'&&['positioning','active','settling'].includes(r.phase)){stop(r,'stopped');return {ok:true};}
 return fail('这次灰盒只验证守线；没有治疗、奖励或正式存档。');
}
export function sparTick(r:SparRound,dt:number,input:Vec):void {
 const s=r.s;if(!Number.isFinite(dt)||dt<=0||s.paused||s.dialogue||s.defeated)return;
 let remaining=Math.min(dt,1);
 while(remaining>1e-8){
  const step=Math.min(.025,remaining);remaining-=step;
  if(r.phase!=='active'||r.shots>0)r.peer.state='peaceful';
  if(r.phase==='active'&&!inside(r))stop(r,'outside');
  const seq=Number(s.flags.eventSeq??0);
  tick(s,step,input,{beforeEnemies:()=>{if(r.phase==='active'&&!inside(r))stop(r,'outside');}});
  if(r.phase==='positioning')positionStep(r,step);
  if(r.phase==='active'||r.phase==='settling'){
   r.shots=Number(s.flags.projectileSeq??0)-r.startSeq;
   if(s.events.some(e=>e.seq>seq&&e.type==='block'))r.blocked=true;
   if(r.phase==='active'&&!inside(r))stop(r,'outside');
   if(s.player.hp<r.startHp){r.phase='settling';r.peer.state='peaceful';}
   if((r.phase==='settling'||r.shots>0)&&s.projectiles.length===0){
    r.outcome=r.stopReason??(s.player.hp<r.startHp?'hit':r.blocked?'blocked':'dodged');
    r.phase='result';r.peer.state='peaceful';r.peer.data!.attack=0;
   }
  }
 }
}

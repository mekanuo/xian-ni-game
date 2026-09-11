import type {ActionResult,DialogueChoice,Entity,GameState,Vec} from './contracts';
import type {LifePorts} from './life';
import {SPAR_CENTER,SPAR_STANCES,positioningRoute,positionWouldCrowd,type SparStance} from './spar-geometry';
import {recordSparResult,pendingSparFacts,reportSparFacts} from './spar-state';
export interface SparPorts extends LifePorts {moveNpc(s:GameState,npc:Entity,to:Vec,speed:number,dt:number):void}
const dist=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
const peer=(s:GameState)=>s.worlds.spar.find(e=>e.id==='spar_peer')!;
const ok=():ActionResult=>({ok:true});
const no=(message:string):ActionResult=>({ok:false,message});
const stanceName=(stance:SparStance)=>({front:'正面',left:'左侧',right:'右侧'})[stance];
export const sparUnlocked=(s:GameState)=>s.flags.endingWish==='stay'||s.flags.endingWish==='travel';
export function sparRefresh(s:GameState):void {const gate=s.worlds.home.find(e=>e.id==='home_to_spar');if(gate)gate.state=sparUnlocked(s)?'idle':'hidden';}
export function sparClean(s:GameState):boolean{return !s.projectiles.length&&!s.flags.casting&&!s.player.pullId;}
export function sparCanTalk(s:GameState,e:Entity):boolean{return s.scene==='spar'&&e.id==='spar_peer'&&!s.spar.run&&sparClean(s);}
const near=(s:GameState,e:Entity,p:SparPorts)=>dist(s.player,e)<96&&p.free(s,s.player)&&p.clearLine(s,s.player,e,e.id);
function peaceful(s:GameState){const e=peer(s);e.state='peaceful';(e.data??={}).attack=0;}
export function sparStop(s:GameState,reason:'stopped'|'outside'='stopped'):ActionResult {
 const r=s.spar.run;if(s.scene!=='spar'||!r)return no('眼下没有尚未结清的一手。');
 r.stopReason??=reason;r.phase='settling';r.positionPath=[];r.positionWaiting=false;peaceful(s);return ok();
}
export function sparBegin(s:GameState):ActionResult {
 const r=s.spar.run,e=peer(s);
 if(s.scene!=='spar'||!r||r.phase!=='positioning'||dist(s.player,SPAR_CENTER)>53||dist(e,SPAR_STANCES[r.stance])>3||!sparClean(s)||s.player.hp<2||(e.hp??0)<2)return no('双方先到位，你在线内站稳，体力至少两格。');
 r.positionPath=[];r.positionWaiting=false;r.startHp=s.player.hp;r.startSeq=Number(s.flags.projectileSeq??0);r.phase='active';e.state='chasing';(e.data??={}).attack=0;return ok();
}
export function sparChoices(s:GameState,e:Entity):DialogueChoice[]{return s.scene==='home'&&e.id==='table'&&pendingSparFacts(s.spar).length?[{id:'spar:report',label:'记下练场里亲自试过的一手'}]:[];}
export function sparInteract(s:GameState,e:Entity,p:SparPorts):ActionResult|undefined {
 if(!sparCanTalk(s,e))return undefined;
 const last=s.spar.last;
 const result=last?`${stanceName(last.stance)}这一手，${last.outcome==='blocked'?'护符实际承住了来弹':last.outcome==='dodged'?'你侧身避过了来弹':last.outcome==='hit'?'来弹碰到了你':last.outcome==='outside'?'你先退出了边线':'你先收了手'}${last.hurt&&last.outcome!=='hit'?'，飞出的一发仍碰到了你':''}。`:'“山路窄，出手前得知道往哪边让。”';
 p.dialogue(s,'spar_peer','闻朔',`${result}我们先约来向，你站进线内，我只出一手。步法或护符都行；不必打空谁的体力。`,Object.keys(SPAR_STANCES).map(stance=>({id:`spar:agree:${stance}`,label:`约从${stanceName(stance as SparStance)}来一手`,...(s.player.hp<2?{disabled:'体力不足两格，先回驿歇脚'}:{})})));
 return ok();
}
export function sparChoose(s:GameState,id:string,p:SparPorts):(ActionResult&{checkpoint?:boolean})|undefined {
 if(!id.startsWith('spar:'))return undefined;
 if(id==='spar:report'){
  const table=s.worlds.home.find(e=>e.id==='table')!;
  if(s.scene!=='home'||!near(s,table,p)||!pendingSparFacts(s.spar).length)return no('回自己的桌边，记下尚未记过的真实经历。');
  const facts=reportSparFacts(s.spar);p.emit(s,'note',`你在纸边记下${facts.map(f=>{const [stance,outcome]=f.split(':');return `${stanceName(stance as SparStance)}来弹时${outcome==='hit'?'被碰到':outcome==='blocked'?'以护符承住':'侧身避过'}`;}).join('、')}，给下次行路留个提醒。`,table);return{ok:true,checkpoint:true};
 }
 const stance=id.slice('spar:agree:'.length) as SparStance;
 if(!id.startsWith('spar:agree:')||!Object.hasOwn(SPAR_STANCES,stance))return no('先约定清楚来向。');
 const e=peer(s);
 if(!sparCanTalk(s,e)||!near(s,e,p)||s.player.hp<2||(e.hp??0)<2||s.pending)return no('走近闻朔，等先前出手结清，体力至少两格再约。');
 s.spar.run={phase:'positioning',stance,positionPath:positioningRoute(e,SPAR_STANCES[stance]),positionWaiting:false,startHp:s.player.hp,startSeq:Number(s.flags.projectileSeq??0),shots:0,blocked:false,stopReason:null};
 peaceful(s);p.emit(s,'note',`约好从${stanceName(stance)}来一手。闻朔正在换位；你走进边线，站稳再示意。`,e);return ok();
}
/** Called after real player motion and before enemy progression in the same step. */
export function sparBeforeEnemies(s:GameState,dt:number,p:SparPorts):void {
 if(s.scene!=='spar')return;const r=s.spar.run,e=peer(s);
 if(!r||r.phase!=='active'||r.shots>0)peaceful(s);
 if(r?.phase==='active'&&dist(s.player,SPAR_CENTER)>53)sparStop(s,'outside');
 if(r?.phase!=='positioning')return;
 r.positionWaiting=false;const target=r.positionPath[0];if(!target)return;
 const d=dist(e,target),amount=Math.min(d,90*dt);if(d<.01){r.positionPath.shift();return;}
 const next={x:e.x+(target.x-e.x)*amount/d,y:e.y+(target.y-e.y)*amount/d};
 if(positionWouldCrowd(e,next,s.player)){r.positionWaiting=true;return;}
 p.moveNpc(s,e,target,90,dt);if(dist(e,target)<.01)r.positionPath.shift();
}
/** Settlement follows actual projectile collision; returns a clean checkpoint signal. */
export function sparAfterProjectiles(s:GameState,eventSeq:number,p:SparPorts):boolean {
 if(s.scene!=='spar')return false;const r=s.spar.run;if(!r||r.phase==='positioning')return false;
 r.shots=(Number(s.flags.projectileSeq??0)-r.startSeq) as 0|1;
 if(s.events.some(e=>e.seq>eventSeq&&e.type==='block'))r.blocked=true;
 if(r.shots>0)peaceful(s);
 const hurt=s.player.hp<r.startHp;if(hurt){r.phase='settling';peaceful(s);}
 if((r.phase==='settling'||r.shots>0)&&s.projectiles.length===0){
  const outcome=r.stopReason??(hurt?'hit':r.blocked?'blocked':'dodged');
  recordSparResult(s.spar,{stance:r.stance,outcome,hurt},r.shots);peaceful(s);
  p.emit(s,'spar-result',outcome==='blocked'?'护符承住了。这一手收稳，走近再说。':outcome==='dodged'?'来弹已过，你留出了退步。这一手收稳。':hurt?'这一手碰到了你，先收势；带着实际伤势回驿也无妨。':'这次先收手。余势已经散尽，可以走近交谈或回驿。',peer(s));return true;
 }
 return false;
}
export function sparObjective(s:GameState):string|undefined {
 if(s.scene!=='spar')return undefined;const r=s.spar.run;
 if(!r)return '走近闻朔，自愿约一手；也可沿南侧小门回驿';
 if(r.phase==='positioning')return r.positionWaiting?'闻朔在等你让路；错开一步，再到线内站稳':'走进线内，等闻朔就位后示意开始';
 return r.phase==='settling'?'已经收手，留意还在飞来的余势':'观察真实来向：侧身退步，或朝来弹方向撑起护符';
}

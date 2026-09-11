import type {Entity,GameState,Vec} from './contracts';
import {SPAR_SCENE,initialSparEntries} from './spar-content';
import {SPAR_CENTER,SPAR_STANCES} from './spar-geometry';
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const point=(v:unknown):v is Vec=>record(v)&&finite(v.x)&&finite(v.y);
const keys=(v:unknown,allowed:string[])=>record(v)&&Object.keys(v).length===allowed.length&&Object.keys(v).every(k=>allowed.includes(k));
const check=(ok:unknown,message:string):void=>{if(!ok)throw Error(message);};
const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
const epsilon=.001;
const stances=['front','left','right'];
const facts=stances.flatMap(s=>['dodged','blocked','hit'].map(r=>`${s}:${r}`));
function free(p:Vec){return point(p)&&p.x>=25&&p.x<=SPAR_SCENE.width-25&&p.y>=25&&p.y<=SPAR_SCENE.height-25&&!SPAR_SCENE.obstacles.some(r=>p.x>r.x-17&&p.x<r.x+r.w+17&&p.y>r.y-17&&p.y<r.y+r.h+17);}
function segmentDistance(a:Vec,b:Vec,p:Vec){const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/d)):0;return distance(p,{x:a.x+dx*t,y:a.y+dy*t});}
// Open rectangle interiors match the ordinary 17-unit actor clearance.
// Check the complete remaining segment, including an exterior initial foot.
function clearSegment(a:Vec,b:Vec):boolean {
 return free(a)&&free(b)&&!SPAR_SCENE.obstacles.some(r=>{
  let enter=0,leave=1;
  for(const [start,delta,low,high] of [[a.x,b.x-a.x,r.x-17,r.x+r.w+17],[a.y,b.y-a.y,r.y-17,r.y+r.h+17]]){
   if(delta===0){if(start<=low||start>=high)return false;continue;}
   const one=(low-start)/delta,two=(high-start)/delta;enter=Math.max(enter,Math.min(one,two));leave=Math.min(leave,Math.max(one,two));
   if(enter>=leave)return false;
  }
  return enter<leave;
 });
}
function structure(e:Entity,t:Entity){
 check(e.w===t.w&&e.h===t.h&&e.homeX===(t.homeX??t.x)&&e.homeY===(t.homeY??t.y)&&e.solid===t.solid&&e.movable===t.movable&&e.flammable===t.flammable,'练场实体结构无效');
 check(e.targetScene===t.targetScene&&(t.targetSpawn?point(e.targetSpawn)&&distance(e.targetSpawn,t.targetSpawn)<epsilon:e.targetSpawn===undefined),'练场出口目的地无效');
}
/** Validate physical continuity, not provenance of arbitrary serialized facts. */
export function validateSpar(s:GameState):void {
 const state=s.spar;
 check(keys(state,['run','last','facts','reported']),'练场状态格式无效');
 for(const list of [state.facts,state.reported])check(Array.isArray(list)&&list.length<=9&&new Set(list).size===list.length&&list.every(f=>facts.includes(f)),'练场经历清单无效');
 check(state.reported.every(f=>state.facts.includes(f)),'练场报告缺少实际经历');
 check(state.last===null||keys(state.last,['stance','outcome','hurt'])&&stances.includes(state.last.stance)&&['hit','dodged','blocked','stopped','outside'].includes(state.last.outcome)&&typeof state.last.hurt==='boolean','练场最近结果无效');
 if(state.last){
  const l=state.last;
  check(l.outcome!=='hit'||l.hurt,'被碰到的结果缺少受伤事实');
  check(!['dodged','blocked'].includes(l.outcome)||!l.hurt,'受伤不能记录为无伤成功');
  const fact=l.hurt?`${l.stance}:hit`:['dodged','blocked'].includes(l.outcome)?`${l.stance}:${l.outcome}`:null;
  check(fact===null||state.facts.some(f=>f===fact),'最近一手缺少对应实际经历');
 }
 check(state.facts.length===0||state.last!==null,'已有练场经历却没有最近结果');
 const visited=s.flags.visited_spar===true,opened=['stay','travel'].includes(String(s.flags.endingWish));
 check(s.flags.visited_spar===undefined||typeof s.flags.visited_spar==='boolean','练场到访标记无效');
 check(!visited||opened,'首章归驿前不能已有练场到访');
 check(visited||s.scene!=='spar'&&state.run===null&&state.last===null&&state.facts.length===0&&state.reported.length===0,'未到访练场不能已有练习经历');
 check(s.lastSafe.scene!=='spar','练场不是静息安全点');
 for(const t of initialSparEntries('home')){const e=s.worlds.home.find(e=>e.id===t.id)!;structure(e,t);check(distance(e,t)<epsilon&&e.state===(opened?'idle':'hidden'),'练场入口位置或开放状态无效');}
 for(const t of SPAR_SCENE.entities){const e=s.worlds.spar.find(e=>e.id===t.id)!;structure(e,t);if(e.id==='spar_peer')check(e.hp===3&&['peaceful','chasing','casting'].includes(e.state)&&free(e),'闻朔状态或位置无效');else check(distance(e,t)<epsilon&&e.state===t.state,'练场固定设施无效');}
 const peer=s.worlds.spar.find(e=>e.id==='spar_peer')!,attack=Number(peer.data?.attack);
 check(finite(peer.data?.attack)&&attack>=0&&attack<2,'闻朔起手计时无效');
 if(s.scene==='spar'){
  check(s.flags.companion!=='following'&&free(s.player),'练场独行状态或人物脚点无效');
  check(!s.player.pullId&&!s.flags.casting,'练场不能牵物或待发火球');
 }
 if(state.run===null){check(peer.state==='peaceful'&&attack===0,'无约定不能保留攻击起手');check(s.scene!=='spar'||s.projectiles.length===0,'余弹未清不能结束这一手');return;}
 const r=state.run;
 check(keys(r,['phase','stance','positionPath','positionWaiting','startHp','startSeq','shots','blocked','stopReason'])&&s.scene==='spar','当前练习格式或地点无效');
 check(['positioning','active','settling'].includes(r.phase)&&stances.includes(r.stance),'当前练习阶段或来向无效');
 check(Array.isArray(r.positionPath)&&r.positionPath.length<=4&&r.positionPath.every(point)&&typeof r.positionWaiting==='boolean','闻朔换位路线无效');
 check(Number.isInteger(r.startHp)&&r.startHp>=2&&r.startHp<=4&&Number.isSafeInteger(r.startSeq)&&r.startSeq>=0&&(r.shots===0||r.shots===1)&&typeof r.blocked==='boolean'&&[null,'stopped','outside'].includes(r.stopReason),'当前练习计数或停止原因无效');
 check(!s.dialogue,'当前一手未结清不能交谈');
 check(s.player.hp<=r.startHp,'练习期间不能补回体力');
 const seq=s.flags.projectileSeq??0;
 check(Number.isSafeInteger(seq)&&Number(seq)>=0&&Number(seq)-r.startSeq===r.shots,'当前一手发射编号不一致');
 check(!r.blocked||r.shots===1,'未发射不能记录格挡');
 check(r.shots!==0||s.player.hp===r.startHp,'未发射不能已经受伤');
 check(!r.blocked||s.projectiles.length===0,'格挡已经截住本轮唯一来弹');
 check(s.projectiles.length<=r.shots,'练场只能保留本轮一发');
 for(const p of s.projectiles)check(p.owner==='enemy'&&p.id===Number(seq)&&Number.isSafeInteger(p.id)&&p.life>0&&p.life<=1.6&&Math.abs(Math.hypot(p.vx,p.vy)-260)<epsilon,'练场余弹编号或运动状态无效');
 if(r.phase==='positioning'){
  check(peer.state==='peaceful'&&attack===0&&r.shots===0&&!r.blocked&&r.stopReason===null&&s.player.hp===r.startHp,'定位阶段不能已经交手');
  const stations=[...Object.values(SPAR_STANCES),{x:900,y:1160}];
  check(r.positionPath.every(p=>stations.some(t=>distance(p,t)<epsilon))&&new Set(r.positionPath.map(p=>`${p.x},${p.y}`)).size===r.positionPath.length,'换位路线含任意点或重复绕行');
  if(r.positionPath.length){
   check(distance(r.positionPath.at(-1)!,SPAR_STANCES[r.stance])<epsilon,'换位路线没有通向约定来向');
   let from:Vec=peer;
   for(let i=0;i<r.positionPath.length;i++){const to=r.positionPath[i];check(clearSegment(from,to),'换位路线穿过场地围墙');check(i===0&&distance(from,SPAR_CENTER)<110||segmentDistance(from,to,SPAR_CENTER)>=110-epsilon,'换位路线穿过守线区域');from=to;}
  }else check(distance(peer,SPAR_STANCES[r.stance])<=3&&!r.positionWaiting,'闻朔未就位却没有剩余路径');
 }else{
  check(r.positionPath.length===0&&!r.positionWaiting,'交手或收手后不能继续换位');
  if(r.phase==='active'){
   check(r.stopReason===null&&s.player.hp===r.startHp&&distance(s.player,SPAR_CENTER)<=53+1e-8,'仍在交手却已经受伤或越线');
   check(r.shots!==0||peer.state!=='casting'||attack>1,'起手计时未到聚光阶段');
   check(r.shots!==0||peer.state!=='chasing'||attack<=1,'聚光阶段不能仍未起手');
   check(r.shots===0?['chasing','casting'].includes(peer.state):peer.state==='peaceful'&&attack===0,'当前发射与闻朔起手状态不一致');
  }else check(peer.state==='peaceful'&&attack===0&&(r.stopReason!==null||s.player.hp<r.startHp),'收手缺少真实原因');
  // A completed substep settles a spent/blocked/hit projectile immediately.
  // Stopping before a shot can exist briefly between act(stop) and next tick.
  check(r.shots===0||s.projectiles.length===1,'已经结清的弹不能仍留在活动阶段');
 }
}

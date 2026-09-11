import { SCENES } from './content';
import { initialLifeEntities } from './life-content';
import { createLifeState } from './life';
import { createCanalState, canalWaterState } from './canal';
import { CANAL_SCENE, CANAL_CHANNEL } from './canal-content';
import { createJourneyState } from './journey';
import { initialJourneyEntities, getJourneyRoute } from './journey-content';
import { createKilnState } from './kiln';
import { KILN_SCENE, KILN_POINTS, initialKilnEntries } from './kiln-content';
import { createMarketState } from './market';
import { MARKET_SCENE, MARKET_POINTS, initialMarketEntries } from './market-content';
import type { CanalState, ClampSite, Entity, GameAction, GameState, LifeState, SceneId, Vec, MarketPassages } from './contracts';

export const MAX_SAVE_BYTES = 2_000_000;
const oldScenes: SceneId[] = ['home','creek','workshop','crossing'];
const fiveScenes: SceneId[] = [...oldScenes,'canal'];
const sixScenes: SceneId[] = [...fiveScenes,'kiln'];
const scenes: SceneId[] = [...sixScenes,'market'];
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const finitePoint = (p: Vec): boolean => !!p && finite(p.x) && finite(p.y);
const distance = (a: Vec, b: Vec) => Math.hypot(a.x-b.x,a.y-b.y);
const check = (valid: unknown, message: string): void => { if (!valid) throw Error(message); };

/** Validate the life ledger first, then its physical representation below. */
export function validateLife(l: LifeState, legacy = false): void {
  check(record(l) && record(l.repair) && record(l.harvest), '生活状态格式无效');
  const r=l.repair, h=l.harvest;
  check(['unaccepted','active','ready','complete'].includes(r.stage) && ['unaccepted','active','ready','complete'].includes(h.stage), '生活状态阶段无效');
  check([r.softened,r.stopSet,r.latched,r.tested,h.shared].every(v=>typeof v==='boolean') && ['hold','stop',null].includes(r.method), '生活工序格式无效');
  check(r.testing===null || finite(r.testing) && r.testing>=0 && r.testing<1, '试压计时无效');
  check(!(r.stopSet&&!r.softened) && !(r.latched&&!r.softened) && !(r.tested&&!r.latched) && r.latched===(r.method!==null) && !(r.method==='stop'&&!r.stopSet), '修器工序不一致');
  check(r.stage!=='unaccepted' || !r.softened&&!r.stopSet&&!r.latched&&!r.tested&&r.method===null&&r.testing===null, '未接取修器不能已有工序');
  check((r.stage==='ready'||r.stage==='complete')===r.tested, '试压结果与修器阶段不一致');
  check(r.testing===null || r.stage==='active'&&r.latched&&!r.tested, '当前工序不能试压');
  check(['unpicked','bag','upper','lower'].includes(h.sun) && ['unpicked','bag','upper','lower'].includes(h.shade), '叶片位置无效');
  check(!(h.sun===h.shade && (h.sun==='upper'||h.sun==='lower')), '两束叶不能占同一层');
  const bothPicked=h.sun!=='unpicked'&&h.shade!=='unpicked';
  check((h.stage==='ready'||h.stage==='complete')===bothPicked, '采叶结果与委托阶段不一致');
  check(h.stage!=='unaccepted' || h.sun==='unpicked'&&h.shade==='unpicked'&&h.picking===null&&!h.shared, '未接取采叶不能已有进度');
  check(h.stage!=='complete' || h.sun==='upper'&&h.shade==='lower', '叶片未正确分拣');
  check(h.picking===null || record(h.picking)&&['life_sun_leaf','life_shade_leaf'].includes(h.picking.id)&&finitePoint(h.picking.start)&&finite(h.picking.elapsed)&&h.picking.elapsed>=0&&h.picking.elapsed<2, '采叶计时无效');
  if(h.picking) check(h.stage==='active'&&h[h.picking.id==='life_sun_leaf'?'sun':'shade']==='unpicked', '当前叶片不能采摘');
  check(['unowned','bag','home','lookout',...(legacy?[]:['canal'])].includes(l.clamp) && Number.isInteger(l.sachets)&&l.sachets>=0&&l.sachets<=2, '奖励状态无效');
  check((r.stage==='complete')===(l.clamp!=='unowned'), '压扣与交付结果不一致');
  check(l.scent===null || record(l.scent)&&finite(l.scent.remaining)&&l.scent.remaining>0&&l.scent.remaining<=8, '药囊计时无效');
  check(l.scent===null || (legacy?l.scent.scene===undefined:['workshop','canal'].includes(l.scent.scene)), '药囊所属场景无效');
  check(h.stage==='complete' || l.sachets===0&&l.scent===null, '未交付采叶不能持有药囊');
  check(l.scent===null || l.sachets<2, '药囊已拆开但份数未扣除');
}

function validateEntities(s: GameState, version: 1|2|3|4|5|6): void {
  const manifest=version===6?scenes:version===5?sixScenes:version>=3?fiveScenes:oldScenes;
  check(record(s.worlds) && Object.keys(s.worlds).length===manifest.length && Object.keys(s.worlds).every(id=>manifest.includes(id as SceneId)), '存档场景清单无效');
  for(const id of manifest) {
    const templates=[...(id==='market'?MARKET_SCENE:id==='kiln'?KILN_SCENE:id==='canal'?CANAL_SCENE:SCENES[id]).entities,...(version===1||!fiveScenes.includes(id)?[]:initialLifeEntities(id)),...(version>=4&&fiveScenes.includes(id)?initialJourneyEntities(id):[]),...(version>=5?initialKilnEntries(id):[]),...(version>=6?initialMarketEntries(id):[])];
    const list=s.worlds[id];
    check(Array.isArray(list)&&list.length===templates.length, '存档缺少场景器物');
    const seen=new Set<string>();
    for(const e of list) {
      const original=templates.find(t=>t.id===e?.id);
      check(record(e)&&!!original&&!seen.has(e.id)&&finitePoint(e)&&typeof e.state==='string', '存档器物数据无效');
      check(e.kind===original!.kind&&e.type===original!.type&&typeof e.name==='string'&&finite(e.w)&&e.w>0&&finite(e.h)&&e.h>0&&finite(e.homeX)&&finite(e.homeY), '存档器物结构无效');
      for(const key of ['hp','facing','timer'] as const)check(e[key]===undefined||finite(e[key]), '存档器物数值无效');
      check(e.data===undefined||record(e.data)&&Object.values(e.data).every(v=>typeof v==='string'||typeof v==='boolean'||finite(v)), '存档器物附加数据无效');
      seen.add(e.id);
    }
  }
}

function validateLifeWorld(s: GameState, legacy = false): void {
  const l=s.life, r=l.repair, h=l.harvest;
  const all=Object.values(s.worlds).flat();
  const entity=(id:string)=>all.find(e=>e.id===id)!;
  check(r.stage==='unaccepted'&&h.stage==='unaccepted'||['stay','travel'].includes(String(s.flags.endingWish)), '首章结束前不能开始回驿委托');
  for(const [key,id] of [['sun','life_sun_leaf'],['shade','life_shade_leaf']] as const) {
    const expected=h[key]!=='unpicked'?'picked':h.stage==='unaccepted'?'hidden':'idle';
    check(entity(id).state===expected, '叶片行囊与现场状态不一致');
  }
  if(h.picking) {
    const leaf=entity(h.picking.id);
    check(s.scene==='creek'&&distance(s.player,h.picking.start)<=4&&distance(s.player,leaf)<96&&(!s.player.pullId||s.player.hold>0)&&!s.flags.casting, '采叶计时与人物位置或动作不一致');
  }
  const jaw=entity('life_jaw');
  check((jaw.state==='latched')===r.latched, '钳口固定状态与工序不一致');
  if(r.latched)check(distance(jaw,{x:1420,y:570})<.001&&s.player.pullId!==jaw.id, '固定钳口位置无效');
  if(r.testing!==null)check(s.scene==='workshop'&&distance(s.player,entity('life_press'))<96&&(!s.player.pullId||s.player.hold>0), '试压计时与人物位置不一致');
  const targets: Array<{site:ClampSite;entity:Entity;point:Vec}>=[{site:'home',entity:entity('life_practice'),point:{x:1030,y:500}},{site:'lookout',entity:entity('platform_beam'),point:{x:980,y:285}}];
  if(!legacy)targets.push({site:'canal',entity:entity('canal_stop'),point:{x:1200,y:350}});
  for(const target of targets) {
    const installed=l.clamp===target.site;
    check((target.entity.state==='clamped')===installed, '压扣与承托物状态不一致');
    if(installed)check(distance(target.entity,target.point)<.001&&s.player.pullId!==target.entity.id, '压扣与承托物位置不一致');
  }
  check(all.filter(e=>e.state==='clamped').length===(['home','lookout','canal'].includes(l.clamp)?1:0), '压扣被重复安装');
  check(l.clamp!=='lookout'||s.flags.platformOpen===true, '眺台支撑与通路状态不一致');
  const scent=entity('life_scent');
  check(scent.state===(l.scent&&(legacy||l.scent.scene==='workshop')?'idle':'hidden'), '药囊计时与现场状态不一致');
  if(!legacy)check(entity('canal_scent').state===(l.scent?.scene==='canal'?'idle':'hidden'), '旧渠药囊计时与现场状态不一致');
}

export function validateManifest(s:GameState):void {
  check(s.contentVersion===6,'存档内容版本不匹配');
  validateEntities(s,6);validateLife(s.life);validateLifeWorld(s);validateCanal(s);validateJourney(s);validateKiln(s);validateMarket(s);
}

/** Market facts are checked against their physical state, never inferred from
 * coordinates. A valid serialized ledger is not proof of real player input. */
function validateMarket(s:GameState):void {
  const m=s.market, epsilon=.001;
  const keys=(value:unknown,allowed:string[])=>record(value)&&Object.keys(value).length===allowed.length&&Object.keys(value).every(key=>allowed.includes(key));
  const passages=(value:MarketPassages)=>{
    check(keys(value,['public','private']),'小集路线清单无效');
    for(const route of ['public','private'] as const)check(keys(value[route],['westToEast','eastToWest'])&&Object.values(value[route]).every(v=>typeof v==='boolean'),'小集方向记录无效');
  };
  const any=(value:MarketPassages)=>Object.values(value).some(d=>Object.values(d).some(Boolean));
  check(keys(m,['exchanged','visit','through','reported'])&&typeof m.exchanged==='boolean','小集账本格式无效');
  passages(m.through);passages(m.reported);
  for(const route of ['public','private'] as const)for(const direction of ['westToEast','eastToWest'] as const)check(!m.reported[route][direction]||m.through[route][direction],'小集报告缺少实际穿出记录');
  check((s.scene==='market')===(m.visit!==null),'小集当前行程与地点不一致');
  check(s.lastSafe.scene!=='market','小集没有静息安全点');
  if(m.visit){
    const v=m.visit;
    check(keys(v,['entry','transit','passed'])&&['crossing','canal'].includes(v.entry),'小集行程入口无效');
    passages(v.passed);
    check(v.transit===null||keys(v.transit,['route','from'])&&['public','private'].includes(v.transit.route)&&['west','east'].includes(v.transit.from),'小集当前通道片段无效');
  }
  const visited=s.flags.visited_market===true;
  check(s.flags.visited_market===undefined||typeof s.flags.visited_market==='boolean','小集到访标记无效');
  check(!visited||s.journey.stage==='complete','回程落笔前不能进入小集');
  check(visited||m.visit===null&&!m.exchanged&&!any(m.through)&&!any(m.reported),'未到访小集不能已有经历');
  check(!m.exchanged||s.kiln.crossed.west||s.kiln.crossed.east,'小集交换缺少亲自走过旧窑的消息');
  const door=s.worlds.market.find(e=>e.id==='market_door')!;
  check(['closed','open'].includes(door.state)&&door.solid===(door.state==='closed')&&(door.state!=='open'||m.exchanged),'小集门闩状态与实际交换不一致');
  check(!(Object.values(m.through.private).some(Boolean)||m.visit&&Object.values(m.visit.passed.private).some(Boolean))||door.state==='open','私巷经过记录缺少已开的门');

  const structure=(e:Entity,t:Entity)=>{
    check(e.w===t.w&&e.h===t.h&&e.homeX===(t.homeX??t.x)&&e.homeY===(t.homeY??t.y)&&e.movable===t.movable&&e.flammable===t.flammable&&(e.id==='market_door'||e.solid===t.solid),'小集器物结构或原位无效');
    check(e.targetScene===t.targetScene&&(t.targetSpawn?finitePoint(e.targetSpawn!)&&distance(e.targetSpawn!,t.targetSpawn)<epsilon:e.targetSpawn===undefined),'小集出口目的地无效');
  };
  for(const scene of sixScenes)for(const t of initialMarketEntries(scene)){
    const e=s.worlds[scene].find(e=>e.id===t.id)!;structure(e,t);
    check(distance(e,t)<epsilon&&e.state===(s.journey.stage==='complete'?'idle':'hidden'),'小集入口位置或开放状态无效');
  }
  const inBounds=(e:Entity)=>e.x>=25&&e.x<=MARKET_SCENE.width-25&&e.y>=25&&e.y<=MARKET_SCENE.height-25;
  // Actor feet use the same 17-unit static-wall clearance as model movement.
  // The door is the only solid movable-state collider in this new map.
  const freeActor=(e:Entity)=>inBounds(e)&&![...MARKET_SCENE.obstacles,...(door.solid?[{x:door.x-door.w/2,y:door.y-door.h/2,w:door.w,h:door.h}]:[])].some(r=>e.x>r.x-17&&e.x<r.x+r.w+17&&e.y>r.y-17&&e.y<r.y+r.h+17);
  const home=MARKET_POINTS.merchant,latch=MARKET_POINTS.latch;
  const onSegment=(e:Vec,a:Vec,b:Vec)=>{
    const dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
    const fraction=Math.max(0,Math.min(1,((e.x-a.x)*dx+(e.y-a.y)*dy)/len));
    return distance(e,{x:a.x+fraction*dx,y:a.y+fraction*dy})<epsilon;
  };
  for(const t of MARKET_SCENE.entities){
    const e=s.worlds.market.find(e=>e.id===t.id)!;structure(e,t);
    if(e.id==='market_merchant'){
      check(['idle','leading','waiting'].includes(e.state)&&freeActor(e),'小集办事人物状态或站位无效');
      if(!m.exchanged)check(distance(e,home)<epsilon&&e.state==='idle','尚未交换不能提前离摊');
      else if(door.state==='closed')check(onSegment(e,home,latch),'沈砚未沿实际移步路线开闩');
      else{
        // Opening stops within eight units, not necessarily at the exact latch.
        // Preserve that actual x during the first vertical return segment.
        const minX=latch.x-8*(latch.x-home.x)/distance(home,latch);
        const diagonalY=home.y+(e.x-home.x)*(latch.y-home.y)/(latch.x-home.x);
        check(e.x>=minX-epsilon&&e.x<=latch.x+epsilon&&e.y>=405-epsilon&&e.y<=diagonalY+epsilon||onSegment(e,{x:470,y:405},{x:latch.x,y:405})||onSegment(e,home,{x:470,y:405}),'沈砚回摊位置不在真实路线');
      }
    }else if(e.id==='xu_market'){
      check(['hidden','following','waiting','refused'].includes(e.state)&&freeActor(e),'小集许照状态或站位无效');
      check(e.state==='hidden'||visited,'许照不能出现在从未到访的小集');
      check(s.scene!=='market'||s.flags.companion!=='following'||e.state!=='hidden','小集内同行不能缺少实际在场人物');
      check(s.scene==='market'||e.state==='hidden'||s.flags.companion!=='following','许照留在小集时不能在图外跟随');
      check(e.state!=='following'||s.scene==='market'&&s.flags.companion==='following','小集跟随状态与全局约定不一致');
    }else if(e.id==='decoy'){
      check(inBounds(e)&&['idle','pulled','held','burning','burned'].includes(e.state),'小集空筐状态或位置无效');
      if(e.state==='burning')check(finite(e.timer)&&e.timer>0&&e.timer<=12,'小集空筐燃烧计时无效');
      if(e.state==='burned')check(e.timer===0,'小集空筐残骸计时无效');
      const owned=s.scene==='market'&&s.player.pullId===e.id;
      check(owned?e.state===(s.player.hold>0?'held':'pulled'):e.state!=='held'&&e.state!=='pulled','小集空筐与牵引状态不一致');
    }else if(e.kind==='enemy')check(inBounds(e)&&['idle','alert','chasing','searching','casting','retreated','peaceful'].includes(e.state)&&Number.isInteger(e.hp)&&e.hp!>=0&&e.hp!<=3,'小集散修状态无效');
    else check(distance(e,t)<epsilon&&(e.id==='market_door'||e.state===t.state),'小集固定设施状态或位置无效');
  }
}

function validateKiln(s:GameState):void {
  const k=s.kiln;
  check(record(k)&&Object.keys(k).every(key=>['visited','entry','crossed','loan','shelterOpened'].includes(key))&&record(k.crossed),'旧窑状态格式无效');
  check(Object.keys(k.crossed).every(key=>['west','east'].includes(key))&&[k.visited,k.crossed.west,k.crossed.east,k.shelterOpened].every(v=>typeof v==='boolean'),'旧窑到访或穿行记录无效');
  check([null,'west','east'].includes(k.entry)&&['none','agreed','borrowed','returned'].includes(k.loan),'旧窑入口或借还阶段无效');
  check((s.scene==='kiln')===(k.entry!==null),'旧窑入口与当前地点不一致');
  check(k.visited||s.scene!=='kiln'&&s.lastSafe.scene!=='kiln'&&k.entry===null&&!k.crossed.west&&!k.crossed.east&&k.loan==='none'&&!k.shelterOpened,'未到访旧窑不能已有经历');
  check(!k.visited||s.journey.stage==='complete','回程落笔前不能进入旧窑');
  check(k.shelterOpened===(k.loan==='returned'),'棚角许可与实际归还不一致');
  if(s.lastSafe.scene==='kiln')check(k.shelterOpened&&distance(s.lastSafe.point,KILN_POINTS.rest)<.001,'旧窑安全点未获许可或位置无效');

  // Restrict only new v5 objects. Old scenes retain their historical validation,
  // including valid screen corners which need gradual outward recovery.
  const structure=(e:Entity,template:Entity)=>{
    check(e.w===template.w&&e.h===template.h&&e.homeX===(template.homeX??template.x)&&e.homeY===(template.homeY??template.y)&&e.solid===template.solid&&e.movable===template.movable&&e.flammable===template.flammable,'旧窑器物结构或原位无效');
    check(e.targetScene===template.targetScene&&(template.targetSpawn?finitePoint(e.targetSpawn!)&&distance(e.targetSpawn!,template.targetSpawn)<.001:e.targetSpawn===undefined),'旧窑出口目的地无效');
  };
  for(const id of fiveScenes)for(const template of initialKilnEntries(id)){
    const e=s.worlds[id].find(e=>e.id===template.id)!;structure(e,template);
    check(distance(e,template)<.001&&e.state===(s.journey.stage==='complete'?'idle':'hidden'),'旧窑入口位置或开放状态无效');
  }
  for(const template of KILN_SCENE.entities){
    const e=s.worlds.kiln.find(e=>e.id===template.id)!;structure(e,template);
    if(e.id==='shield_board'){
      check(['idle','pulled','held','burning','burned'].includes(e.state),'旧窑挡屏状态无效');
      check(e.x>=25+e.w/2&&e.x<=KILN_SCENE.width-25-e.w/2&&e.y>=25+e.h/2&&e.y<=KILN_SCENE.height-25-e.h/2,'旧窑挡屏越出地图');
      if(e.state==='burning')check(finite(e.timer)&&e.timer>0&&e.timer<=12,'旧窑燃烧计时无效');
      if(e.state==='burned')check(e.timer===0,'旧窑残屏不能恢复燃烧时间');
      const owned=s.scene==='kiln'&&s.player.pullId===e.id;
      check(owned?e.state===(s.player.hold>0?'held':'pulled'):e.state!=='held'&&e.state!=='pulled','旧窑挡屏与牵引状态不一致');
    }else if(e.kind==='enemy'){
      check(['idle','alert','chasing','searching','casting','retreated','peaceful'].includes(e.state)&&Number.isInteger(e.hp)&&e.hp!>=0&&e.hp!<=3,'旧窑散修状态无效');
    }else{
      check(distance(e,template)<.001&&e.state===(e.id==='kiln_rest'?(k.shelterOpened?'idle':'hidden'):template.state),'旧窑固定人物或设施状态无效');
    }
  }
}

function validateJourney(s:GameState):void {
  const j=s.journey;
  check(record(j)&&['unaccepted','active','ready','complete'].includes(j.stage),'同行回程阶段无效');
  check([null,'solo','together'].includes(j.agreed)&&[null,'north','south','mixed'].includes(j.soloRoute)&&[null,'north','south','mixed'].includes(j.sharedRoute),'同行约定或历史路线无效');
  check(typeof j.restOpened==='boolean'&&typeof j.recordedShared==='boolean','同行结果格式无效');
  check(j.stage==='unaccepted'||s.canal.stage==='complete','旧渠落笔前不能开始同行回程');
  check(j.stage!=='unaccepted'||j.agreed===null&&j.run===null&&j.soloRoute===null&&j.sharedRoute===null&&!j.restOpened&&!j.recordedShared,'未接取同行回程不能已有结果');
  check(j.stage==='unaccepted'||j.agreed!==null,'同行回程缺少约定');
  check(j.restOpened===(j.stage==='ready'||j.stage==='complete')&&(!j.restOpened||j.soloRoute!==null||j.sharedRoute!==null),'雨棚坐垫与回程结果不一致');
  check(!j.recordedShared||j.stage==='complete'&&j.sharedRoute!==null,'共同补笔缺少真实共同回程');
  check(j.run===null||record(j.run),'当前领路格式无效');
  if(j.run){
    const r=j.run;
    check(Object.keys(r).every(key=>['mode','plan','next','playerGate','companionGate','viaSouth','waiting'].includes(key)),'领路不能指定任意目标');
    check(s.scene==='workshop'&&j.stage!=='unaccepted'&&['solo','together'].includes(r.mode)&&j.agreed===r.mode&&['north','south'].includes(r.plan),'当前领路与地点或约定不一致');
    check([r.playerGate,r.companionGate,r.viaSouth,r.waiting].every(v=>typeof v==='boolean'),'实际经过或等待状态无效');
    if(r.mode==='solo')check(r.next===null&&!r.companionGate&&!r.waiting,'独行不能记录同伴领路');
    else check(Number.isInteger(r.next)&&r.next!==null&&r.next>=0&&r.next<=getJourneyRoute(r).length,'领路路点索引无效');
  }
  const markState=j.stage==='unaccepted'?'hidden':'idle';
  for(const scene of fiveScenes)for(const template of initialJourneyEntities(scene)){
    const e=s.worlds[scene].find(e=>e.id===template.id)!;
    check(distance(e,template)<.001&&e.homeX===template.homeX&&e.homeY===template.homeY,'回程地标或坐垫不能离开固定位置');
  }
  for(const id of ['journey_north_mark','journey_south_mark'])check(s.worlds.workshop.find(e=>e.id===id)!.state===markState,'回程地标与接取阶段不一致');
  check(s.worlds.creek.find(e=>e.id==='journey_rest_shelter')!.state===(j.restOpened?'idle':'hidden'),'雨棚坐垫现场与开放记录不一致');
}

function validateCanal(s:GameState):void {
  const c:CanalState=s.canal;
  check(record(c)&&['unaccepted','active','verified','ready','complete'].includes(c.stage),'旧渠阶段无效');
  check([c.inspected,c.cleared,c.sharedInspect,c.sharedVerify,c.usedClamp].every(v=>typeof v==='boolean')&&[null,'diversion','hold','clamp'].includes(c.method),'旧渠工序格式无效');
  check(finite(c.drain)&&c.drain>=0&&c.drain<=1&&finite(c.flow)&&c.flow>=0&&c.flow<=3&&(c.surge===null||finite(c.surge)&&c.surge>=0&&c.surge<=1.2),'旧渠水位计时无效');
  const verified=['verified','ready','complete'].includes(c.stage);
  check(c.stage==='unaccepted'||['stay','travel'].includes(String(s.flags.endingWish)),'首章结束前不能接取旧渠');
  check(c.cleared===(c.method!==null)&&(!c.cleared||c.inspected)&&(!verified||c.cleared),'清渠结果与工序不一致');
  check((!c.sharedInspect||c.inspected)&&(!c.sharedVerify||verified)&&(!(c.method==='clamp')||c.usedClamp),'旧渠见证或用扣记录不一致');
  check(c.stage!=='unaccepted'||!c.inspected&&!c.cleared&&!c.sharedInspect&&!c.sharedVerify&&!c.usedClamp&&c.work===null&&c.drain===0&&c.flow===0&&c.surge===null,'未接取旧渠不能已有工序');
  check(c.stage!=='unaccepted'||s.scene!=='canal'&&s.lastSafe.scene!=='canal','未接取旧渠不能已在旧渠');
  check(c.work===null||record(c.work)&&['divert','restore','clear'].includes(c.work.kind)&&finite(c.work.elapsed)&&c.work.elapsed>=0&&c.work.elapsed<2&&finitePoint(c.work.start),'旧渠操作计时无效');
  const entity=(id:string)=>s.worlds.canal.find(e=>e.id===id)!;
  for(const [id,min,max] of [['canal_diverter',600,680],['canal_stop',1200,1280]] as const){const e=entity(id);check(e.x>=min&&e.x<=max&&Math.abs(e.y-350)<=10,'旧渠水板脱离导轨');}
  check(entity('canal_screen').state===(c.cleared?'cleared':'idle'),'筛框现场与清理记录不一致');
  check(entity('canal_rest_mid').state===(verified?'idle':'hidden'),'旧渠歇脚点与验水记录不一致');
  check(s.life.clamp!=='canal'||c.stage!=='unaccepted'&&c.usedClamp,'旧渠压扣缺少安装记录');
  check(s.life.scent?.scene!=='canal'||c.stage!=='unaccepted','未开放旧渠不能放置药囊');
  if(c.work){
    const target=entity(c.work.kind==='clear'?'canal_screen':'canal_diverter');
    check(s.scene==='canal'&&c.stage!=='unaccepted'&&distance(s.player,c.work.start)<=4&&distance(s.player,target)<96&&(!s.player.pullId||s.player.hold>0)&&!s.flags.casting,'旧渠操作与人物位置或动作不一致');
    if(c.work.kind==='clear')check(c.inspected&&!c.cleared&&c.drain===1&&['diverted','stopped'].includes(canalWaterState(s))&&s.player.x>=CANAL_CHANNEL.x&&s.player.x<=CANAL_CHANNEL.x+CANAL_CHANNEL.w&&s.player.y>=CANAL_CHANNEL.y&&s.player.y<=CANAL_CHANNEL.y+CANAL_CHANNEL.h,'当前渠底不能清理');
  }
}

export function snapshot(s:GameState):string { return JSON.stringify(s); }

function parseSave(json:string):GameState {
  check(typeof json==='string'&&new TextEncoder().encode(json).length<=MAX_SAVE_BYTES,'存档过大或格式无效');
  try { return JSON.parse(json); } catch { throw Error('存档不是有效的 JSON'); }
}

/** Decode only the outer world and its single checkpoint; never recursively
 * traverse attacker-controlled checkpoint strings. Both pass this same path. */
export function restore(json:string):GameState {
  const s=restoreWorld(parseSave(json));
  if(s.checkpoint!==null) {
    check(typeof s.checkpoint==='string','存档恢复点无效');
    const nested=parseSave(s.checkpoint);
    check(record(nested)&&nested.checkpoint===null,'存档恢复点层级无效');
    s.checkpoint=snapshot(restoreWorld(nested));
  }
  return s;
}

export function migrateSave(json:string):string { return snapshot(restore(json)); }

function restoreWorld(s:GameState):GameState {
  check(record(s),'存档世界格式无效');
  const version:unknown=s.contentVersion;
  check(version===undefined||version===2||version===3||version===4||version===5||version===6,'存档内容版本不匹配');
  const beforeMarket=version!==6;
  if(beforeMarket)check(!Object.hasOwn(s,'market')&&sixScenes.includes(s.scene)&&sixScenes.includes(s.lastSafe?.scene)&&record(s.flags)&&!Object.keys(s.flags).some(key=>key==='visited_market'||key.startsWith('market_')),'旧存档不能混入小集数据');
  const legacy=version===undefined;
  const beforeCanal=legacy||version===2;
  if(beforeCanal)check(!Object.hasOwn(s,'canal')&&oldScenes.includes(s.scene)&&oldScenes.includes(s.lastSafe?.scene),'旧存档不能混入旧渠数据');
  const beforeJourney=beforeCanal||version===3;
  if(beforeJourney)check(!Object.hasOwn(s,'journey'),'旧存档不能混入同行回程数据');
  if(version!==5&&version!==6)check(!Object.hasOwn(s,'kiln')&&fiveScenes.includes(s.scene)&&fiveScenes.includes(s.lastSafe?.scene),'旧存档不能混入旧窑数据');
  if(legacy) {
    check(!('life' in s),'旧存档不能混入新版生活状态');
    validateEntities(s,1);
    for(const id of oldScenes)s.worlds[id].push(...initialLifeEntities(id));
    s.life=createLifeState();
  }
  if(beforeCanal) {
    validateEntities(s,2);validateLife(s.life,true);validateLifeWorld(s,true);
    if(s.life.scent)s.life.scent.scene='workshop';
    s.worlds.canal=CANAL_SCENE.entities.map(e=>structuredClone({...e,homeX:e.x,homeY:e.y}));
    s.canal=createCanalState();
  }
  if(beforeJourney){
    // Validate the exact old five-world manifest before appending any new objects.
    validateEntities(s,3);validateLife(s.life);validateLifeWorld(s);validateCanal(s);
    for(const id of fiveScenes)s.worlds[id].push(...initialJourneyEntities(id));
    s.journey=createJourneyState();
  }
  if(version!==5&&version!==6){
    // Keep the v4 five-scene manifest immutable before adding the sixth map.
    validateEntities(s,4);validateLife(s.life);validateLifeWorld(s);validateCanal(s);validateJourney(s);
    s.worlds.kiln=KILN_SCENE.entities.map(e=>structuredClone({...e,homeX:e.x,homeY:e.y}));
    s.kiln=createKilnState();
    for(const id of fiveScenes)s.worlds[id].push(...initialKilnEntries(id).map(e=>structuredClone({...e,homeX:e.x,homeY:e.y,state:s.journey.stage==='complete'?'idle':'hidden'})));

  }
  if(beforeMarket){
    // Validate the complete source v5 world before adding any market objects.
    validateEntities(s,5);validateLife(s.life);validateLifeWorld(s);validateCanal(s);validateJourney(s);validateKiln(s);
    s.worlds.market=MARKET_SCENE.entities.map(e=>structuredClone({...e,homeX:e.homeX??e.x,homeY:e.homeY??e.y}));
    s.market=createMarketState();
    for(const id of sixScenes)s.worlds[id].push(...initialMarketEntries(id).map(e=>structuredClone({...e,homeX:e.x,homeY:e.y,state:s.journey.stage==='complete'?'idle':'hidden'})));
    s.contentVersion=6;
  }
  if(!s||s.schema!==1||s.revision!=='return-stone-v1'||!scenes.includes(s.scene)||!s.profile||!['herbalist','tinker'].includes(s.profile.origin)||!['stay','travel'].includes(s.profile.wish)||typeof s.profile.name!=='string'||![0,1].includes(s.profile.appearance)||!s.player||!finitePoint(s.player)||!Number.isFinite(s.time)||s.time<0||!Number.isInteger(s.player.hp)||s.player.hp<0||s.player.hp>4||!Number.isInteger(s.player.mana)||s.player.mana<0||s.player.mana>6||!Array.isArray(s.player.path)||!s.player.path.every(finitePoint)||!s.worlds||!s.flags||Array.isArray(s.flags)||!Array.isArray(s.events)||!Array.isArray(s.projectiles)||!s.lastSafe||!scenes.includes(s.lastSafe.scene)||!finitePoint(s.lastSafe.point)||!['long','hold',null].includes(s.ringStyle)||!Number.isInteger(s.herbs)||s.herbs<0||s.herbs>2||typeof s.paused!=='boolean'||typeof s.ended!=='boolean'||typeof s.defeated!=='boolean')throw Error('存档版本或世界数据不匹配');
  if(!['pull','flame','ward'].includes(s.selected)||Object.values(s.flags).some(v=>!['boolean','string','number'].includes(typeof v)||(typeof v==='number'&&!Number.isFinite(v))))throw Error('存档标记数据无效');
  check(s.pending===null||validAction(s.pending),'存档待执行动作无效');
  if(s.events.some(e=>!e||!Number.isFinite(e.seq)||!Number.isFinite(e.time)||typeof e.text!=='string'||typeof e.type!=='string'))throw Error('存档事件数据无效');
  if(s.projectiles.some(p=>!finitePoint(p)||!Number.isFinite(p.vx)||!Number.isFinite(p.vy)||!Number.isFinite(p.life)||!['player','enemy'].includes(p.owner)))throw Error('存档投射物数据无效');
  check(s.dialogue===null||record(s.dialogue)&&typeof s.dialogue.id==='string'&&typeof s.dialogue.speaker==='string'&&typeof s.dialogue.text==='string'&&Array.isArray(s.dialogue.choices)&&s.dialogue.choices.every(c=>record(c)&&typeof c.id==='string'&&typeof c.label==='string'&&(c.disabled===undefined||typeof c.disabled==='string')),'存档对话无效');
  check(s.checkpoint===null||typeof s.checkpoint==='string','存档恢复点无效');
  for(const key of ['facing','invulnerable','cooldown','ward','wardFacing','hold'] as const)check(finite(s.player[key]),'存档术法状态无效');
  check(s.player.pullId===null||typeof s.player.pullId==='string','存档牵引目标无效');
  check(s.player.pullPoint===null||finitePoint(s.player.pullPoint),'存档牵引落点无效');
  check(s.player.hold>=0&&s.player.hold<=8&&s.player.ward>=0&&s.player.ward<=6,'存档术法时限无效');
  if(s.player.pullId!==null)check(s.worlds[s.scene]?.some(e=>e.id===s.player.pullId&&e.movable)&&(s.player.hold>0?s.player.pullPoint===null:s.player.pullPoint!==null),'存档牵引器物不存在');
  else check(s.player.pullPoint===null&&s.player.hold===0,'存档牵引状态不一致');
  validateManifest(s);
  return s;
}

function validAction(a:GameAction):boolean {
  if(!a||typeof a!=='object')return false;
  switch(a.type){
    case 'move':return !!finitePoint(a.point);
    case 'cast':return ['pull','flame','ward'].includes(a.spell)&&!!finitePoint(a.point)&&(a.targetId===undefined||typeof a.targetId==='string');
    case 'select':return ['pull','flame','ward'].includes(a.spell);
    case 'interact':return typeof a.targetId==='string';
    case 'choose':return typeof a.choiceId==='string';
    case 'pause':return typeof a.value==='boolean';
    default:return ['cancel','release','hold','rest','heal','retry','retreat','use-sachet'].includes(a.type);
  }
}

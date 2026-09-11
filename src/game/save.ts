import { SCENES } from './content';
import { initialLifeEntities } from './life-content';
import { createLifeState } from './life';
import { createCanalState, canalWaterState } from './canal';
import { CANAL_SCENE, CANAL_CHANNEL } from './canal-content';
import type { CanalState, ClampSite, Entity, GameAction, GameState, LifeState, SceneId, Vec } from './contracts';

export const MAX_SAVE_BYTES = 2_000_000;
const oldScenes: SceneId[] = ['home','creek','workshop','crossing'];
const scenes: SceneId[] = [...oldScenes,'canal'];
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

function validateEntities(s: GameState, version: 1|2|3): void {
  const manifest=version===3?scenes:oldScenes;
  check(record(s.worlds) && Object.keys(s.worlds).length===manifest.length && Object.keys(s.worlds).every(id=>manifest.includes(id as SceneId)), '存档场景清单无效');
  for(const id of manifest) {
    const templates=[...(id==='canal'?CANAL_SCENE:SCENES[id]).entities,...(version===1?[]:initialLifeEntities(id))];
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
  check(s.contentVersion===3,'存档内容版本不匹配');
  validateEntities(s,3);validateLife(s.life);validateLifeWorld(s);validateCanal(s);
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
  check(version===undefined||version===2||version===3,'存档内容版本不匹配');
  const legacy=version===undefined;
  if(version!==3)check(!Object.hasOwn(s,'canal')&&oldScenes.includes(s.scene)&&oldScenes.includes(s.lastSafe?.scene),'旧存档不能混入旧渠数据');
  if(legacy) {
    check(!('life' in s),'旧存档不能混入新版生活状态');
    validateEntities(s,1);
    for(const id of oldScenes)s.worlds[id].push(...initialLifeEntities(id));
    s.life=createLifeState();
  }
  if(version!==3) {
    validateEntities(s,2);validateLife(s.life,true);validateLifeWorld(s,true);
    if(s.life.scent)s.life.scent.scene='workshop';
    s.worlds.canal=CANAL_SCENE.entities.map(e=>structuredClone({...e,homeX:e.x,homeY:e.y}));
    s.canal=createCanalState();s.contentVersion=3;
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

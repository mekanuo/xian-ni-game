import { SCENES } from './content';
import { lifeEntityIds } from './life-content';
import type { GameState, LifeState, SceneId } from './contracts';
export const MAX_SAVE_BYTES=2_000_000;
const scenes=['home','creek','workshop','crossing'] as SceneId[];
const finite=(n:unknown)=>typeof n==='number'&&Number.isFinite(n);
export function validateLife(l:LifeState):void {
 if(!l||!['unaccepted','active','ready','complete'].includes(l.repair.stage)||!['unaccepted','active','ready','complete'].includes(l.harvest.stage))throw Error('生活状态阶段无效');
 const r=l.repair;if(typeof r.softened!=='boolean'||typeof r.stopSet!=='boolean'||typeof r.latched!=='boolean'||typeof r.tested!=='boolean'||!['hold','stop',null].includes(r.method)||(r.testing!==null&&(!finite(r.testing)||r.testing<0||r.testing>1)))throw Error('修器状态无效');
 if(r.tested&&!r.latched||r.latched&&!r.softened||r.stage==='complete'&&(!r.tested||l.clamp==='unowned'))throw Error('修器状态不一致');
 if(!['unpicked','bag','upper','lower'].includes(l.harvest.sun)||!['unpicked','bag','upper','lower'].includes(l.harvest.shade)||(l.harvest.sun===l.harvest.shade&&(l.harvest.sun==='upper'||l.harvest.sun==='lower')))throw Error('叶片层级无效');
 if(typeof l.harvest.shared!=='boolean')throw Error('同行状态无效');
 if(l.harvest.picking&&(!l.harvest.picking.start||!finite(l.harvest.picking.start.x)||!finite(l.harvest.picking.start.y)||!['life_sun_leaf','life_shade_leaf'].includes(l.harvest.picking.id)||!finite(l.harvest.picking.elapsed)||l.harvest.picking.elapsed<0||l.harvest.picking.elapsed>2))throw Error('采叶计时无效');
 if(l.harvest.stage==='complete'&&(l.harvest.sun!=='upper'||l.harvest.shade!=='lower'))throw Error('叶片未正确分拣');
 if(!['unowned','bag','home','lookout'].includes(l.clamp)||!Number.isInteger(l.sachets)||l.sachets<0||l.sachets>2||(l.scent!==null&&(!finite(l.scent.remaining)||l.scent.remaining<0||l.scent.remaining>8)))throw Error('奖励状态无效');
 if(l.repair.stage!=='complete'&&l.clamp!=='unowned')throw Error('未完成修器不可安装压扣');
 if(l.harvest.stage!=='complete'&&l.scent!==null)throw Error('未完成采叶不可有药囊气味');
 if(l.harvest.stage!=='complete'&&l.sachets!==0)throw Error('未完成采叶不可持有药囊');
}
export function validateManifest(s:GameState):void{for(const id of scenes){const list=s.worlds[id];const ids=[...SCENES[id].entities.map(e=>e.id),...lifeEntityIds(id)];if(!Array.isArray(list)||list.length!==ids.length)throw Error('存档缺少场景器物');const seen=new Set<string>();for(const e of list){if(!e||typeof e.id!=='string'||seen.has(e.id)||!ids.includes(e.id)||typeof e.state!=='string')throw Error('存档器物数据无效');seen.add(e.id);}}validateLife(s.life);}
export function migrateSave(json:string):string{if(typeof json!=='string'||json.length>MAX_SAVE_BYTES)throw Error('存档过大');const s=JSON.parse(json) as GameState;if(s.contentVersion!==2)throw Error('需要通过模型入口迁移旧存档');validateManifest(s);if(s.checkpoint!==null){const n=JSON.parse(s.checkpoint) as GameState;if(n.checkpoint!==null)throw Error('存档恢复点层级无效');validateManifest(n);}return JSON.stringify(s);}

import type { ActionResult, DialogueChoice, Entity, GameState, LeafId, LifeState, Vec } from './contracts';
export interface LifePorts {
 free(s:GameState,p:Vec,pad?:number,ignoreId?:string):boolean;
 clearLine(s:GameState,a:Vec,b:Vec,ignoreId?:string):boolean;
 emit(s:GameState,type:string,text:string,e?:Vec&{id?:string|number}):void;
 dialogue(s:GameState,id:string,speaker:string,text:string,choices?:DialogueChoice[]):void;
}
export function createLifeState():LifeState{return {repair:{stage:'unaccepted',softened:false,stopSet:false,latched:false,tested:false,method:null,testing:null},harvest:{stage:'unaccepted',sun:'unpicked',shade:'unpicked',picking:null,shared:false},clamp:'unowned',sachets:0,scent:null};}
const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
const object=(s:GameState,id:string)=>s.worlds[s.scene].find(e=>e.id===id);
const ok=(message?:string):ActionResult=>({ok:true,...(message?{message}:{})});
const no=(message:string):ActionResult=>({ok:false,message});
const freeHand=(s:GameState)=>!s.player.pullId||s.player.hold>0;
const closeTo=(s:GameState,e:Entity|undefined,p:LifePorts):e is Entity=>!!e&&e.state!=='hidden'&&distance(s.player,e)<96&&p.free(s,s.player)&&p.clearLine(s,s.player,e,e.id);
const leafKey=(id:LeafId)=>id==='life_sun_leaf'?'sun':'shade';
export function lifeUnlocked(s:GameState):boolean{return s.flags.endingWish==='stay'||s.flags.endingWish==='travel';}
function reveal(s:GameState,ids:string[]){for(const group of Object.values(s.worlds))for(const e of group)if(ids.includes(e.id)&&e.state==='hidden')e.state='idle';}
export function lifeChoices(s:GameState,e:Entity):DialogueChoice[]{
 if(!lifeUnlocked(s)||s.scene!=='home')return [];
 const r=s.life.repair,h=s.life.harvest,choices:DialogueChoice[]=[];
 if(e.type==='tao'||e.id==='workbench'){
  if(r.stage==='unaccepted')choices.push({id:'life:repair:accept',label:'帮陶七修一枚承重挂扣'});
  if(r.stage==='ready')choices.push({id:'life:repair:deliver',label:'交还已经试压的挂扣'});
 }
 if(e.type==='xu'||e.id==='herb_rack'){
  if(h.stage==='unaccepted')choices.push({id:'life:harvest:accept',label:'看叶图，接下这次采叶'});
  if(e.id==='herb_rack'&&h.stage!=='complete'&&h.stage!=='unaccepted'){
   for(const key of ['sun','shade'] as const){const name=key==='sun'?'向阳叶':'背阴叶';if(h[key]==='bag')for(const place of ['upper','lower'] as const){const occupied=h[key==='sun'?'shade':'sun']===place;choices.push({id:`life:leaf:${key}:${place}`,label:`把${name}放到${place==='upper'?'上':'下'}层`,...(occupied?{disabled:'这一层已有另一束叶，先取回再换'}:{})});}else if(h[key]==='upper'||h[key]==='lower')choices.push({id:`life:leaf:${key}:bag`,label:`取回${name}，重新分层`});}
   if(h.sun==='upper'&&h.shade==='lower')choices.unshift({id:'life:harvest:deliver',label:'按叶图分好，收下两份避兽药囊'});
  }
 }
 return choices;
}
function clampTarget(s:GameState,site:'home'|'lookout'){return {e:object(s,site==='home'?'life_practice':'platform_beam'),point:site==='home'?{x:1030,y:500}:{x:980,y:285},eye:object(s,site==='home'?'life_home_eye':'life_lookout_eye')};}
export function lifeChoose(s:GameState,id:string,p:LifePorts):ActionResult|undefined{
 if(!id.startsWith('life:'))return undefined;
 if(!lifeUnlocked(s))return no('先走完眼前这一程，回到自己的桌边');
 const r=s.life.repair,h=s.life.harvest;
 const homeTalk=(type:'repair'|'harvest')=>s.scene==='home'&&s.worlds.home.some(e=>(type==='repair'?(e.type==='tao'||e.id==='workbench'):(e.type==='xu'||e.id==='herb_rack'))&&closeTo(s,e,p));
 if(id==='life:repair:accept'){
  if(!homeTalk('repair')||r.stage!=='unaccepted')return no('这件挂扣已经接过了');
  r.stage='active';reveal(s,['life_hearth','life_jaw','life_press']);p.emit(s,'note','陶七托你修备用挂扣：去旧工棚装进炉座，点炉芯松开旧胶，再校直、固定并试压。压柄边有机械止挡，没练留势也能动手。');return ok();
 }
 if(id==='life:repair:stop'){
  if(s.scene!=='workshop'||!closeTo(s,object(s,'life_press'),p)||!r.softened||r.latched||!freeHand(s))return no('先松开旧胶，再腾手拨止挡');
  r.stopSet=true;p.emit(s,'change','止挡扣到右侧刻线处。把钳口牵到刻线，再放下、压紧。',object(s,'life_press'));return ok();
 }
 if(id==='life:repair:deliver'){
  if(!homeTalk('repair')||r.stage!=='ready'||!r.tested)return no('先让挂扣亲自受过试架的重量');
  r.stage='complete';s.life.clamp='bag';reveal(s,['life_home_eye','life_practice','life_lookout_eye']);p.emit(s,'growth',`陶七接过修稳的挂扣：${r.method==='hold'?'“你留势腾手压得稳。”':'“止挡用得明白，松手也不偏。”'}他给你一枚可回收压扣；在工位把试件牵到固定眼，扣稳后就能腾手。`);return ok();
 }
 if(id==='life:harvest:accept'){
  if(!homeTalk('harvest')||h.stage!=='unaccepted')return no('这次采叶已经接过了');
  h.stage='active';reveal(s,['life_sun_leaf','life_shade_leaf']);p.emit(s,'note','许照摊开叶图：眺台的向阳叶细长，晒架放上层；溪道窄段的背阴叶宽圆，放下层。剪叶留根；窄段可以向上护符，也能从东侧干路伸手采。');return ok();
 }
 if(id.startsWith('life:leaf:')){
  const [, ,key,place]=id.split(':');
  if(s.scene!=='home'||!closeTo(s,object(s,'herb_rack'),p)||!['active','ready'].includes(h.stage)||!['sun','shade'].includes(key)||!['upper','lower','bag'].includes(place))return no('先把采到的叶带到晒架旁');
  const k=key as 'sun'|'shade',other=k==='sun'?'shade':'sun';
  if(place==='bag'){if(!['upper','lower'].includes(h[k]))return no('这束叶不在晒架上');h[k]='bag';}
  else{if(h[k]!=='bag'||h[other]===place)return no('先取回原来的叶，空出这一层');h[k]=place as 'upper'|'lower';}
  p.emit(s,'change',`${k==='sun'?'细长向阳叶':'宽圆背阴叶'}${place==='bag'?'已取回，可重新放置':`放在${place==='upper'?'上':'下'}层`}。`);return ok();
 }
 if(id==='life:harvest:deliver'){
  if(s.scene!=='home'||!closeTo(s,object(s,'herb_rack'),p)||h.stage!=='ready'||h.sun!=='upper'||h.shade!=='lower')return no('细长向阳叶在上，宽圆背阴叶在下；放错可以取回');
  h.stage='complete';s.life.sachets=2;p.emit(s,'growth',`晒架添了两层新叶。${h.shared?'许照提起这次在身旁一起辨过的干路。':'许照听你说完独自辨路的经过。'}她把两份避兽药囊交给你：只在林路脚边拆开，山兽绕行片刻；不伤兽，对人和落石无效。`);return ok();
 }
 if(id==='life:clamp:install'||id==='life:clamp:remove'){
  const site=s.dialogue?.id==='life_home_eye'?'home':s.dialogue?.id==='life_lookout_eye'?'lookout':undefined;
  if(!site||s.scene!==(site==='home'?'home':'creek'))return no('先到有固定眼的位置');
  const {e,point,eye}=clampTarget(s,site);if(!e||!closeTo(s,eye,p)||!freeHand(s))return no('近身腾手后，才能操作压扣');
  if(id.endsWith('install')){
   if(s.life.clamp!=='bag')return no('只有一枚压扣，先到原处取回');
   if(distance(e,point)>(site==='home'?16:24))return no('先牵物件到固定眼旁的承托位置');
   s.life.clamp=site;e.x=point.x;e.y=point.y;e.state='clamped';if(s.player.pullId===e.id){s.player.pullId=null;s.player.pullPoint=null;s.player.hold=0;}if(site==='lookout')s.flags.platformOpen=true;
   p.emit(s,'change','压扣咬进固定眼，物件由木托承住，松开术法也能腾手。',eye);return ok();
  }
  if(s.life.clamp!==site)return no('这里没有装着你的压扣');
  if(site==='lookout'&&[s.player,...s.worlds.creek.filter(e=>e.type==='xu')].some(v=>Math.abs(v.x-1080)<43&&Math.abs(v.y-290)<75))return no('先让自己与同行者离开倾梁下方，再取回压扣');
  e.state='idle';if(site==='lookout'){e.x=e.homeX!;e.y=e.homeY!;s.flags.platformOpen=Boolean(s.flags.platformReturn||s.flags.platformLong);}s.life.clamp='bag';p.emit(s,'change','物件落回安全承托处，压扣已经收回；已有回程梯仍可通行。',eye);return ok();
 }
 return no('这个工序当前不能进行');
}
export function lifeInteract(s:GameState,e:Entity,p:LifePorts):ActionResult|undefined{
 if(!e.id.startsWith('life_'))return undefined;
 if(!lifeUnlocked(s)||!closeTo(s,e,p))return no('先近身站稳，才能动手');
 const r=s.life.repair;
 if(e.id==='life_hearth'){
  if(r.stage!=='active')return no('这件挂扣已经修过了');
  if(!freeHand(s))return no('先腾出手装挂扣');
  if(!r.softened){e.state='loaded';p.emit(s,'change','歪口挂扣已装在炉座；朝炉芯施一次火焰球，松开旧胶。',e);}return ok(r.softened?'旧胶已松，可去校直钳口':undefined);
 }
 if(e.id==='life_press'){
  if(!r.softened)return no('先把挂扣装在炉座，用火球松开旧胶');
  if(r.tested)return ok('挂扣已经承过重，可以回驿交还');
  if(!freeHand(s))return no('正牵着钳口，先留势，或借机械止挡后放下');
  const jaw=object(s,'life_jaw')!;
  if(r.latched){r.testing=0;s.player.path=[];p.emit(s,'note','压柄落下，静止一息，看挂扣能否承稳。',e);return ok();}
  if(distance(jaw,{x:1420,y:570})<=12&&((s.player.pullId===jaw.id&&s.player.hold>0)||(r.stopSet&&!s.player.pullId))){
   r.latched=true;r.method=s.player.pullId===jaw.id?'hold':'stop';jaw.x=1420;jaw.y=570;jaw.state='latched';if(s.player.pullId===jaw.id){s.player.pullId=null;s.player.pullPoint=null;s.player.hold=0;}p.emit(s,'change','钳口压紧，挂扣已经校直。再拉一次压柄，实际检验承重。',e);return ok();
  }
  p.dialogue(s,'life_press','试架压柄','钳口要移到右侧刻线并固定。可先拨机械止挡，再牵到位放下；也可用留势腾手压紧。',[{id:'life:repair:stop',label:'拨好右侧机械止挡',...(r.stopSet?{disabled:'止挡已经拨到刻线处'}:{})}]);return ok();
 }
 if(e.id==='life_jaw')return ok(lifeDescription(s,e));
 if(e.id==='life_sun_leaf'||e.id==='life_shade_leaf'){
  const h=s.life.harvest,key=leafKey(e.id);if(h.stage!=='active'||h[key]!=='unpicked')return no('这束叶已剪过，留着根等它再长');
  if(!freeHand(s)||s.flags.casting)return no('先腾出手，收好正在施的术');
  s.player.path=[];h.picking={id:e.id,elapsed:0,start:{x:s.player.x,y:s.player.y}};p.emit(s,'note','俯身剪取上部叶片；移动或受击会中断，根仍留在原处。',e);return ok();
 }
 if(e.id==='life_home_eye'||e.id==='life_lookout_eye'){
  const site=e.id==='life_home_eye'?'home':'lookout';p.dialogue(s,e.id,e.name,'先把试件或倾梁牵到侧托旁，再近身扣稳。压扣只有一枚，用完可回这里取走。',[s.life.clamp===site?{id:'life:clamp:remove',label:'让物件落稳，取回压扣'}:{id:'life:clamp:install',label:'在固定眼扣稳物件',...(s.life.clamp!=='bag'?{disabled:'压扣还未取得，或已装在另一处'}:{})}]);return ok();
 }
 return ok(lifeDescription(s,e));
}
export function lifeFlameHit(s:GameState,e:Entity,p:LifePorts):boolean{
 if(e.id!=='life_hearth'||e.state==='hidden')return false;
 if(e.state==='loaded'&&s.life.repair.stage==='active'){s.life.repair.softened=true;e.state='warm';p.emit(s,'fire','炉芯燃起，挂扣上的旧胶松开了；现在可以校直活动钳口。',e);}else p.emit(s,'steam','炉座没有待软胶的器件，不必再耗灵力。',e);
 return true;
}
export function lifePullReason(s:GameState,e:Entity,point:Vec):string|undefined{
 if(e.state==='clamped'||(e.id==='life_jaw'&&s.life.repair.latched))return '器具已经固定，先取下压扣或完成当前工序';
 if(e.id==='life_jaw'){
  if(!s.life.repair.softened)return '先装好挂扣，点燃炉芯软化旧胶';
  if(Math.abs(point.y-570)>12||point.x<1359||point.x>1421)return '钳口沿短导轨移动，右侧刻线是校直位置';
 }
 return undefined;
}
export function lifeInterrupt(s:GameState):void{s.life.harvest.picking=null;s.life.repair.testing=null;}
export function lifeBeforeExit(s:GameState):void{
 lifeInterrupt(s);const jaw=object(s,'life_jaw');if(jaw&&!s.life.repair.latched){jaw.x=jaw.homeX!;jaw.y=jaw.homeY!;jaw.state=s.life.repair.stage==='unaccepted'?'hidden':'idle';}
}
export function lifeMaintainSupport(s:GameState,e:Entity):void{
 if(e.id==='life_jaw'&&s.life.repair.latched)e.state='latched';
 if((e.id==='life_practice'&&s.life.clamp==='home')||(e.id==='platform_beam'&&s.life.clamp==='lookout')){e.state='clamped';if(e.id==='platform_beam')s.flags.platformOpen=true;}
}
export function lifeTick(s:GameState,dt:number,p:LifePorts):void{
 if(s.paused||s.dialogue||s.defeated)return;
 const r=s.life.repair,jaw=object(s,'life_jaw');
 if(jaw&&r.stage==='active'&&!r.latched&&s.player.pullId!==jaw.id&&!(r.stopSet&&Math.abs(jaw.x-1420)<=12)){jaw.x=Math.max(1360,jaw.x-100*dt);jaw.y=570;}
 if(r.testing!==null){const press=object(s,'life_press');if(!closeTo(s,press,p)||!freeHand(s)){r.testing=null;}else{r.testing+=dt;if(r.testing>=1){r.testing=null;r.tested=true;r.stage='ready';p.emit(s,'change','挂扣承住试重，没有回歪；可以回石驿交还陶七。',press);}}}
 const h=s.life.harvest,picking=h.picking;
 if(picking){const e=object(s,picking.id);if(s.scene!=='creek'||distance(s.player,picking.start)>4||!closeTo(s,e,p)||!freeHand(s)){h.picking=null;}else{picking.elapsed+=dt;if(picking.elapsed>=2){h[leafKey(picking.id)]='bag';h.picking=null;e.state='picked';if(s.flags.companion==='following'&&!s.flags.herbsWet&&s.worlds.creek.some(n=>n.type==='xu'&&distance(n,s.player)<150))h.shared=true;if(h.sun!=='unpicked'&&h.shade!=='unpicked')h.stage='ready';p.emit(s,'item',`剪下${e.name}，根与嫩叶留在石边。`,e);}}}
 if(s.scene==='workshop'&&s.life.scent){s.life.scent.remaining=Math.max(0,s.life.scent.remaining-dt);if(!s.life.scent.remaining){s.life.scent=null;object(s,'life_scent')!.state='hidden';p.emit(s,'change','药囊气味散了，山兽会重新留意附近动静。');}}
}
export function lifeUseSachet(s:GameState,p:LifePorts):ActionResult{
 if(s.scene!=='workshop')return no('这份药囊用于旧工棚林路的山兽，对人和落石无效');
 if(s.life.sachets===0||s.life.scent)return no(s.life.scent?'已有药囊起效，不必重复拆开':'两份药囊已用完');
 if(!freeHand(s)||!p.free(s,s.player))return no('先腾手站到干地，再拆开药囊');
 if(!s.worlds.workshop.some(e=>e.type==='beast'&&!['retreated','peaceful','gone'].includes(e.state)))return no('这里山兽已经退走，留着药囊不必耗用');
 const e=object(s,'life_scent')!;e.x=s.player.x;e.y=s.player.y;e.state='idle';s.life.scent={remaining:8};s.life.sachets=(s.life.sachets-1) as 0|1;p.emit(s,'drop','药囊放在脚边，附近山兽会绕开这处气味八秒；仍要亲自行路。',e);return ok();
}
export function lifeScentSource(s:GameState,beast:Entity):Vec|undefined{const e=object(s,'life_scent');return s.scene==='workshop'&&s.life.scent&&e&&beast.type==='beast'&&distance(beast,e)<150?e:undefined;}
export function lifeObjective(s:GameState):string|undefined{
 if(!lifeUnlocked(s))return undefined;const r=s.life.repair,h=s.life.harvest;
 if(r.stage==='complete'&&h.stage==='complete')return '手艺和行囊都已备好；可继续试术，或回桌边歇一歇';
 if(r.stage==='ready')return '挂扣已经试压；回石驿交还陶七，领一枚可回收压扣';
 if(r.stage==='active')return !r.softened?'去旧工棚装好挂扣，点炉芯松开旧胶':!r.latched?'牵钳口到右侧刻线，用止挡或留势腾手压紧':'挂扣已校直，再拉一次压柄，实际试压';
 if(h.stage==='active')return h.sun==='unpicked'?'去溪道眺台采细长向阳叶；窄段还有一簇宽圆背阴叶':'去溪道窄段采背阴叶；可用护符，也可走东侧干路';
 if(h.stage==='ready')return '带叶回晒架：细长向阳叶在上，宽圆背阴叶在下';
 return '灯下已安顿好；问陶七修挂扣，或问许照这次采叶';
}
export function lifeDescription(s:GameState,e:Entity):string|undefined{
 if(!lifeUnlocked(s))return undefined;
 if(e.id==='life_hearth')return s.life.repair.softened?'旧胶已松，去旁边校直钳口':e.state==='loaded'?'挂扣已经装好，向炉芯施一次火焰球':'先近身装挂扣，再用火焰球点炉芯';
 if(e.id==='life_jaw')return s.life.repair.latched?'钳口已固定，可以实际试压':'沿短导轨牵到右侧刻线；留势或机械止挡都能腾手';
 if(e.id==='life_press')return s.life.repair.tested?'挂扣已经试压，回驿交还':s.life.repair.latched?'近身拉下压柄，静止一息完成承重检验':'近身拨止挡，或让到位钳口留势后压紧';
 if(e.id==='life_sun_leaf'||e.id==='life_shade_leaf')return e.state==='picked'?'叶片已经剪过，根仍留着':e.id==='life_sun_leaf'?'细长向阳叶；近身停稳剪取，回驿放上层':'宽圆背阴叶；向上护符或从东侧干路采，回驿放下层';
 if(e.id==='life_home_eye'||e.id==='life_lookout_eye')return '物件先到固定眼旁，再近身扣稳；一枚压扣可原地取回';
 if(e.id==='life_practice')return '牵到右侧工位固定眼，试用不用灵力的机械压扣';
 if(e.id==='life_scent')return '气味只令附近山兽绕行，对人和落石无效';
 return undefined;
}
export function lifeRenderKey(s:GameState,e:Entity):string{return `${e.state}:${s.life.repair.softened}:${s.life.repair.latched}:${s.life.repair.tested}:${s.life.repair.stage}:${s.life.harvest.sun}:${s.life.harvest.shade}:${s.life.clamp}`;}

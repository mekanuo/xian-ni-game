import type {ActionResult,CanalState,DialogueChoice,Entity,GameState,Vec} from './contracts';
import type {LifePorts} from './life';
import {CANAL_CHANNEL,CANAL_SIDE,CANAL_POINTS as P,type CanalRect} from './canal-content';
export interface CanalPorts extends LifePorts {hurt(s:GameState,source:Vec,reason:string):void}
export function createCanalState():CanalState{return {stage:'unaccepted',inspected:false,cleared:false,method:null,sharedInspect:false,sharedVerify:false,usedClamp:false,work:null,drain:0,flow:0,surge:null};}
const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
const object=(s:GameState,id:string)=>s.worlds.canal.find(e=>e.id===id);
const ok=(message?:string):ActionResult=>({ok:true,...(message?{message}:{})});
const no=(message:string):ActionResult=>({ok:false,message});
const handFree=(s:GameState)=>!s.player.pullId||s.player.hold>0;
const unlocked=(s:GameState)=>s.flags.endingWish==='stay'||s.flags.endingWish==='travel';
const inside=(v:Vec,r:CanalRect,pad=0)=>v.x>=r.x-pad&&v.x<=r.x+r.w+pad&&v.y>=r.y-pad&&v.y<=r.y+r.h+pad;
export const canalInsideChannel=(v:Vec)=>inside(v,CANAL_CHANNEL);
const near=(s:GameState,e:Entity|undefined,p:LifePorts):e is Entity=>!!e&&e.state!=='hidden'&&distance(s.player,e)<96&&p.free(s,s.player)&&p.clearLine(s,s.player,e,e.id);
const shared=(s:GameState)=>s.flags.companion==='following'&&s.worlds.canal.some(e=>e.type==='xu'&&distance(e,s.player)<165);
const diverted=(s:GameState)=>{const e=object(s,'canal_diverter');return !!e&&distance(e,P.diverterSide)<=8;};
const stopped=(s:GameState)=>{const e=object(s,'canal_stop');return !!e&&distance(e,P.stopSlot)<=8&&(s.life.clamp==='canal'||s.player.pullId===e.id);};
export function canalWaterState(s:GameState):'blocked'|'diverted'|'stopped'|'flowing'{return stopped(s)?'stopped':diverted(s)?'diverted':s.canal.cleared?'flowing':'blocked';}
/** During a surge warning the channel remains traversable so the player can leave voluntarily. */
export function canalObstacles(s:GameState):CanalRect[]{
 if(s.scene!=='canal')return [];
 const mode=canalWaterState(s),result:CanalRect[]=[];
 if(s.canal.drain<1&&s.canal.surge===null)result.push(CANAL_CHANNEL);
 if(mode==='diverted'&&!(s.canal.surge!==null&&inside(s.player,CANAL_SIDE,17)))result.push(CANAL_SIDE);
 return result;
}
export function canalChoices(s:GameState,e:Entity):DialogueChoice[]{
 if(s.scene!=='home'||!unlocked(s))return [];
 if(e.id==='to_creek'&&s.canal.stage!=='unaccepted')return [{id:'canal:depart:creek',label:'走雨后溪道，去原来的地方'},{id:'canal:depart:canal',label:'去雾岭旧渠取水处'}];
 if(e.id==='table'||e.type==='xu'){
  if(s.canal.stage==='unaccepted')return [{id:'canal:accept',label:'读邵禾口信，接下察看雾岭旧渠'}];
  if(s.canal.stage==='ready'&&e.id==='table')return [{id:'canal:record',label:'把亲自走通的旧渠路线添在桌边'}];
 }
 return [];
}
export function canalChoose(s:GameState,id:string,p:CanalPorts):ActionResult|undefined{
 if(!id.startsWith('canal:'))return undefined;
 if(!unlocked(s))return no('先走完这一程，回到自己的桌边');
 if(id==='canal:accept'){
  if(s.scene!=='home'||s.canal.stage!=='unaccepted'||!s.worlds.home.some(e=>(e.id==='table'||e.type==='xu')&&near(s,e,p)))return no('在桌边或许照身旁读完口信，再接下这一程');
  s.canal.stage='active';p.emit(s,'note','邵禾留在下游照看取水的人，请你沿水声察看停流的旧渠。出发路牌现在可选择雾岭旧渠；没有压扣、药囊也能徒手分水。');return ok();
 }
 if(id==='canal:record'){
  if(s.scene!=='home'||s.canal.stage!=='ready'||!s.worlds.home.some(e=>e.id==='table'&&near(s,e,p)))return no('先亲眼验水，和邵禾说明结果，再回自己的桌边落笔');
  s.canal.stage='complete';p.emit(s,'growth',`旧渠小图添在已有地图旁。${s.canal.sharedInspect&&s.canal.sharedVerify?'许照补上你们一起核对的干坡记号。':'图上留下你亲自辨过的水路和台阶。'}${s.life.clamp==='canal'?'图角记着：压扣仍在旧渠截水架。':''}`);return ok();
 }
 if(id==='canal:report'){
  if(s.scene!=='canal'||!near(s,object(s,'canal_keeper'),p))return no('到邵禾身边再说');
  if(s.canal.stage!=='verified')return no('先去石槽亲眼确认水位，不能只凭上游枝叶清了就说修通');
  if(canalWaterState(s)!=='flowing'||s.canal.flow<3)return no('水路又停了，先把分水板和截水架复位');
  s.canal.stage='ready';p.emit(s,'relationship',`你向邵禾说明${methodText(s)}的经过。她看过石槽的水位，挪开取水处空桶：这回水和干路都通了，回驿把路线记下来吧。`);return ok();
 }
 if(id==='canal:clamp:install'||id==='canal:clamp:remove'){
  const eye=object(s,'canal_eye'),stop=object(s,'canal_stop');
  if(s.scene!=='canal'||s.dialogue?.id!=='canal_eye'||!near(s,eye,p)||!stop||!handFree(s))return no('站到截水架安全侧，腾手后再操作固定眼');
  if(id.endsWith('install')){
   if(s.life.clamp!=='bag')return no('只有一枚压扣，先从原处取回');
   if(distance(stop,P.stopSlot)>8||s.player.pullId!==stop.id||s.player.hold<=0)return no('先把截水板牵进左侧止水槽，追加留势，才能腾手扣紧');
   s.life.clamp='canal';s.canal.usedClamp=true;Object.assign(stop,P.stopSlot,{state:'clamped'});s.player.pullId=null;s.player.pullPoint=null;s.player.hold=0;p.emit(s,'change','压扣承住截水板。渠底退水后可从台阶下去，时间不再受留势限制。',eye);return ok();
  }
  if(s.life.clamp!=='canal')return no('这里没有装着你的压扣');
  if([s.player,...s.worlds.canal.filter(e=>e.type==='xu'&&s.flags.companion==='following')].some(v=>inside(v,CANAL_CHANNEL,17)))return no('先让自己和同行者离开渠底，再取回压扣');
  s.life.clamp='bag';Object.assign(stop,P.stopHome,{state:'idle'});p.emit(s,'change','压扣收回袋中，截水板退到原槽；注意来水，留在高岸。',eye);return ok();
 }
 return no('这一工序现在不能进行');
}
function methodText(s:GameState){return s.canal.method==='clamp'?'用压扣承住截水板清渠':s.canal.method==='hold'?'留势截水、沿台阶进出清渠':'把水分入旁路、沿干渠清理';}
export function canalInteract(s:GameState,e:Entity,p:CanalPorts):ActionResult|undefined{
 if(s.scene==='home'&&e.id==='table'&&unlocked(s)){
  if(!near(s,e,p))return no('走到自己的桌边再落笔');
  const c=s.canal,text=c.stage==='unaccepted'?'已有的地图和灯都在。邵禾托人捎来口信：雾岭旧渠上游还有水声，下游石槽却停流；她守着取水处，请你代为察看。':c.stage==='ready'?'邵禾已确认恢复取水。把你实际走通的台阶与水路添在旧图旁，留给下一次出门。':c.stage==='complete'?`旧渠小图已经摊在桌边。${c.sharedInspect&&c.sharedVerify?'许照现场画下的干坡记号也在。':'这里记着你亲自看过的水尺和石槽。'}${s.life.clamp==='canal'?'图角提醒：压扣仍在旧渠截水架。':''}`:'旧渠口信留在地图旁。从驿前出发路牌选雾岭旧渠，可以继续察看、清渠和验水；旧溪道也仍通行。';
  p.dialogue(s,'canal_table','你的桌边',text,canalChoices(s,e));return ok();
 }
 if(s.scene!=='canal'||!e.id.startsWith('canal_')||e.kind==='exit'||e.kind==='rest')return undefined;
 if(s.canal.stage==='unaccepted'||!near(s,e,p))return no('先接下口信，再到器物近旁站稳');
 const c=s.canal;
 if(e.id==='canal_inspect'){
  c.inspected=true;if(shared(s))c.sharedInspect=true;
  p.dialogue(s,e.id,'检修水尺',c.cleared?'筛框已扶正。水尺和旁路的湿线仍会随着两块水板改变。':'木尺上游水痕很高，下游却干着：筛框卡斜，枝叶聚在框上。西侧分水板可徒手推入旁槽，东侧截水板可牵住留势；都要等渠底退水，再沿台阶下去。');return ok();
 }
 if(e.id==='canal_diverter'){
  if(s.flags.casting)return no('先等火焰出手，再腾手推分水板');
  if(!handFree(s))return no('先放下正在牵的东西，才能徒手推分水板');
  if(s.player.pullId===e.id)return no('先放下分水板，再用手推入槽口');
  c.work={kind:diverted(s)?'restore':'divert',elapsed:0,start:{x:s.player.x,y:s.player.y}};s.player.path=[];p.emit(s,'note',diverted(s)?'双手把板推回原槽，停稳两息。':'把轻板推入右侧旁槽，停稳两息；旁路会淹过低踏道，西岸仍可走。',e);return ok();
 }
 if(e.id==='canal_screen'){
  if(c.cleared)return ok('筛框已扶正、枝叶已清；复位水板后，还要走回下游亲眼验水');
  if(!c.inspected)return no('先在西侧检修水尺旁，辨清堵塞和水路');
  if(c.drain<1||!['stopped','diverted'].includes(canalWaterState(s)))return no('渠底仍有来水。先分水或截水，等水尺降到底');
  if(!canalInsideChannel(s.player))return no('要沿台阶亲自下到干渠底，才能伸手扶正筛框');
  if(!handFree(s)||s.flags.casting)return no('先留势腾手或借稳固槽口承托，再动手清理');
  c.work={kind:'clear',elapsed:0,start:{x:s.player.x,y:s.player.y}};s.player.path=[];p.emit(s,'note','俯身扶正筛框，清走枝叶；连续两息，走动、施术或受击会中断。',e);return ok();
 }
 if(e.id==='canal_eye'){
  p.dialogue(s,e.id,e.name,'截水板牵入左侧止水槽并留势后，才有手扣紧；压扣只有一枚，可回来取。取扣前先确认渠底无人。',[s.life.clamp==='canal'?{id:'canal:clamp:remove',label:'确认渠底无人，取回压扣'}:{id:'canal:clamp:install',label:'把压扣装进固定眼',...(s.life.clamp!=='bag'?{disabled:'压扣尚未取得，或还装在别处'}:{})}]);return ok();
 }
 if(e.id==='canal_tub'){
  if(canalWaterState(s)!=='flowing'||c.flow<3)return no(c.cleared?'筛框已清，但取水槽还未稳定进水；把两块水板复位，再沿渠回来':'石槽干着。要先在上游找出堵塞，再改水路下渠清理');
  if(c.stage==='active'){c.stage='verified';object(s,'canal_rest_mid')!.state='idle';if(shared(s))c.sharedVerify=true;p.emit(s,'change',`你亲手试过槽内水位，小水轮稳定转起来。${c.sharedVerify?'许照就在身旁，也记下这条干路。':''}去告诉檐下邵禾；检修台坐垫已经可以静息。`,e);}
  return ok('水位已经亲自确认，水轮仍按眼前水路转动');
 }
 if(e.id==='canal_keeper'){
  const text=c.stage==='unaccepted'?'口信在回石驿桌边。':c.stage==='verified'?'石槽有水了。说说你怎样清的，我把检修牌的水痕补全。':c.stage==='ready'||c.stage==='complete'?`你说的${methodText(s)}已经记在检修牌上。${canalWaterState(s)==='flowing'?'这会儿取水槽也通着。':'水板又改过位置了；回头记得复位，别让取水的人空等。'}`:c.inspected?'原来是筛框卡斜、枝叶聚堵。西边分水板有承托槽，徒手也推得动；我守着下游取水处，等你亲眼把水路走通。':'上游还有水声，下游的石槽却停了。我先拦住来取水的人；你去高岸水尺旁看清，再来告诉我。';
  p.dialogue(s,e.id,'邵禾',text,c.stage==='verified'?[{id:'canal:report',label:'说明亲自清渠、验水的经过'}]:[]);return ok();
 }
 return ok(canalDescription(s,e));
}
export function canalInterrupt(s:GameState):void{s.canal.work=null;}
export function canalMaintainSupport(s:GameState,e:Entity):void{
 if(e.id==='canal_stop'){
  if(s.life.clamp==='canal')Object.assign(e,P.stopSlot,{state:'clamped'});
  else if(s.player.pullId!==e.id)Object.assign(e,P.stopHome,{state:'idle'});
 }
 if(e.id==='canal_diverter'&&s.player.pullId!==e.id)Object.assign(e,distance(e,P.diverterSide)<=8?P.diverterSide:P.diverterHome,{state:'idle'});
}
export function canalObjectChanged(s:GameState,e:Entity,_p?:CanalPorts):void{
 if(e.id==='canal_diverter'||e.id==='canal_stop')e.y=350;
 if(e.id==='canal_stop'&&s.life.clamp==='canal')Object.assign(e,P.stopSlot,{state:'clamped'});
}
export function canalBeforeExit(s:GameState):void{
 canalInterrupt(s);if(s.scene!=='canal')return;
 for(const id of ['canal_stop','canal_diverter']){const e=object(s,id);if(e)canalMaintainSupport(s,e);}
 // No time is advanced off-map; an already-cleared screen and installed clamp stay in place.
 s.canal.surge=null;
}
export function canalPullReason(s:GameState,e:Entity,point:Vec):string|undefined{
 if(e.id==='canal_stop'){
  if(s.life.clamp==='canal')return '截水板已经扣稳，先在安全侧取回压扣';
  if(point.x<1200||point.x>1280||Math.abs(point.y-350)>10)return '截水板只能沿横轨移动；左端是止水槽，右端是原槽';
 }
 if(e.id==='canal_diverter'&&(point.x<600||point.x>680||Math.abs(point.y-350)>10))return '分水板沿短导槽移动；右端旁槽分水，左端原槽复水';
 return undefined;
}
function evacuate(s:GameState,r:CanalRect,p:CanalPorts):void{
 const banks=r===CANAL_CHANNEL?[P.northBank,P.westBank,P.eastBank]:[{x:660,y:540},{x:850,y:540}];
 const target=banks.filter(v=>p.free(s,v)).sort((a,b)=>distance(s.player,a)-distance(s.player,b))[0]??P.northBank;
 const source={x:s.player.x,y:s.player.y-70};p.hurt(s,source,'来水冲上渠底，损失一格体力；你扶住台阶退回高岸。');
 s.player.x=target.x;s.player.y=target.y;s.player.path=[];canalInterrupt(s);
}
export function canalTick(s:GameState,dt:number,p:CanalPorts):void{
 if(s.paused||s.dialogue||s.defeated||s.scene!=='canal'||!Number.isFinite(dt)||dt<=0)return;
 const c=s.canal;for(const id of ['canal_stop','canal_diverter']){const e=object(s,id);if(e)canalMaintainSupport(s,e);}
 const mode=canalWaterState(s),dry=mode==='diverted'||mode==='stopped';
 const wetPlayer=!dry&&inside(s.player,CANAL_CHANNEL,17);
 // Both incoming main water and an occupied side stepping path receive the same visible warning.
 const wetSide=mode==='diverted'&&inside(s.player,CANAL_SIDE,17);
 if(wetPlayer||wetSide){
  if(c.surge===null){c.surge=0;canalInterrupt(s);p.emit(s,'hint','来水将至！沿最近台阶退到高岸；还有一息撤离。',s.player);}
  else{c.surge=Math.min(1.2,c.surge+dt);if(c.surge>=1.2){evacuate(s,wetSide?CANAL_SIDE:CANAL_CHANNEL,p);c.surge=null;}}
 }else c.surge=null;
 c.drain=dry?Math.min(1,c.drain+dt):0;
 c.flow=mode==='flowing'?Math.min(3,c.flow+dt):0;
 const work=c.work;
 if(work){
  const e=object(s,work.kind==='clear'?'canal_screen':'canal_diverter');
  if(!near(s,e,p)||distance(s.player,work.start)>4||!handFree(s)||s.flags.casting||(work.kind==='clear'&&(!dry||c.drain<1||!canalInsideChannel(s.player)))){c.work=null;return;}
  work.elapsed+=dt;
  if(work.elapsed>=2){
   c.work=null;
   if(work.kind==='clear'){
    c.cleared=true;c.method=stopped(s)?s.life.clamp==='canal'?'clamp':'hold':'diversion';e.state='cleared';p.emit(s,'change','歪框扶正，枝叶已清。先回高岸把水板复位，再走到下游亲眼验水。',e);
   }else{Object.assign(e,work.kind==='divert'?P.diverterSide:P.diverterHome,{state:'idle'});p.emit(s,'change',work.kind==='divert'?'分水板落入旁槽。原渠开始退水，低踏道过水；沿西岸和台阶下去。':'分水板退回原槽。来水回到原渠，低踏道重新露出。',e);}
  }
 }
}
/** Root companion movement follows this safe destination through ordinary pathfinding. */
export function canalCompanionTarget(s:GameState):Vec|undefined{
 if(s.scene!=='canal'||s.flags.companion!=='following')return undefined;
 if(canalInsideChannel(s.player)||distance(s.player,P.screen)<250)return P.westBank;
 if(distance(s.player,P.inspect)<180)return P.companionInspect;
 if(distance(s.player,P.tub)<200)return P.companionVerify;
 // Prevent normal "behind player" targeting from leading a companion into a temporarily dry channel.
 if(s.player.x>1010&&s.player.x<1280&&s.player.y>400&&s.player.y<650)return P.westBank;
 return undefined;
}
export function canalObjective(s:GameState):string|undefined{
 if(!unlocked(s))return undefined;const c=s.canal;
 if(c.stage==='unaccepted')return s.scene==='home'?'桌边有邵禾的口信；可接下察看雾岭旧渠':undefined;
 if(s.scene!=='canal')return c.stage==='ready'?'回自己的桌边，把亲自走通的旧渠路线添在图上':c.stage==='active'||c.stage==='verified'?'回石驿出发路牌可选雾岭旧渠，继续这一程':undefined;
 if(c.work)return c.work.kind==='clear'?'正在清理筛框；两息内站稳，留意水位和留势余时':'正在推分水板；站稳两息让板落入槽口';
 if(c.surge!==null)return '来水将至，立即沿最近台阶退到高岸';
 if(c.stage==='complete'||c.stage==='ready')return c.stage==='ready'?'邵禾已确认通路；回驿桌边落笔':'旧渠小图已留在桌边；可重访试术，取扣后记得复水';
 if(c.stage==='verified')return '已亲眼验水；到邵禾身边说明清渠经过';
 if(!c.inspected)return '沿西侧高岸去检修水尺，辨清上游和筛框';
 if(!c.cleared)return c.drain>=1?'渠底已退水；沿台阶下去，腾手清理筛框两息':'徒手推旁路分水板，或牵截水板留势，让渠底退水';
 return canalWaterState(s)==='flowing'?'水路已复原；回下游取水石槽亲眼确认水位':'筛框已清；先回高岸，复位分水板和截水架';
}
export function canalDescription(s:GameState,e:Entity):string|undefined{
 if(!unlocked(s))return undefined;
 if(e.type==='tao'&&s.canal.stage==='complete')return s.canal.usedClamp?'陶七听你说压扣在旧渠承住过截水板，提醒你用完到原处取回。':`陶七听你讲${methodText(s)}，说手艺也在于认清何时不必用扣。`;
 if(e.type==='xu'&&s.canal.stage==='complete')return s.canal.sharedInspect&&s.canal.sharedVerify?'许照提起你们一同看过的水尺和石槽，干坡记号已添在图上。':'许照看着你添的旧渠小图，听你讲这次亲自辨水的经过。';
 if(e.id==='canal_diverter')return diverted(s)?'板在旁槽，低踏道过水；西岸永久通行。徒手推两息可复原。':'可徒手推两息，或牵到右槽分水；槽口自行承托，不耗灵力。';
 if(e.id==='canal_stop')return stopped(s)?s.life.clamp==='canal'?'压扣正承住板；取扣前自己和同行者都要先上岸。':'板正截水；留势只有八秒，沿眼前台阶进出。':'沿横轨向左牵入止水槽，再留势腾手；西边分水板也能零资源清渠。';
 if(e.id==='canal_screen')return s.canal.cleared?'筛框已扶正；水路复原并稳定后，仍需亲自回石槽验水。':'先在西侧水尺察看，再等退水，亲自下渠腾手清理两息。';
 if(e.id==='canal_eye')return s.life.clamp==='canal'?'唯一压扣装在这里；先让渠底无人，再近身取回。':'留势板到左槽后可安装随身压扣；不是清渠的必需品。';
 if(e.id==='canal_inspect')return '看水痕、筛框和两条水路；高岸始终安全。';
 if(e.id==='canal_tub')return s.canal.flow>=3?'槽内有稳定来水；亲身确认后再告诉邵禾。':'水轮停着；清框、复位两块水板后还要沿渠回来验水。';
 if(e.id==='canal_scent')return '药囊气味只驱开附近山兽，不改变水路；外缘干路不用药也能走。';
 return undefined;
}

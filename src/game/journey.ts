import type {ActionResult,DialogueChoice,Entity,GameState,JourneyMode,JourneyRoute,JourneyState,SceneId,Vec} from './contracts';
import type {LifePorts} from './life';
import {getJourneyRoute,JOURNEY_GATES,JOURNEY_POINTS as P,JOURNEY_SOUTH} from './journey-content';
export {getJourneyRoute} from './journey-content';
export interface JourneyPorts extends LifePorts {
 route(s:GameState,actor:Vec,to:Vec,actorId:string,allowed:(point:Vec)=>boolean):Vec[];
 moveNpc(s:GameState,npc:Entity,to:Vec,speed:number,dt:number):void;
 safe(s:GameState,point:Vec,margin:number):boolean;
}
export type JourneyChoiceResult=ActionResult&{checkpoint?:boolean;travel?:{scene:SceneId;point:Vec}};
export function createJourneyState():JourneyState{return {stage:'unaccepted',agreed:null,run:null,soloRoute:null,sharedRoute:null,restOpened:false,recordedShared:false};}
const distance=(a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y);
const object=(s:GameState,id:string)=>s.worlds[s.scene].find(e=>e.id===id);
const companion=(s:GameState)=>s.worlds.workshop.find(e=>e.id==='xu_work');
const unlocked=(s:GameState)=>s.canal.stage==='complete';
const ok=(checkpoint=false,message?:string):JourneyChoiceResult=>({ok:true,...(checkpoint?{checkpoint:true}:{}),...(message?{message}:{})});
const no=(message:string):JourneyChoiceResult=>({ok:false,message});
const freeHand=(s:GameState)=>!s.player.pullId||s.player.hold>0;
const near=(s:GameState,e:Entity|undefined,p:LifePorts):e is Entity=>!!e&&e.state!=='hidden'&&distance(s.player,e)<96&&p.free(s,s.player)&&p.clearLine(s,s.player,e,e.id);
const inGate=(v:Vec,plan:'north'|'south')=>{const r=JOURNEY_GATES[plan];return v.x>=r.x&&v.x<=r.x+r.w&&v.y>=r.y&&v.y<=r.y+r.h;};
const atProbe=(v:Vec)=>v.x>=1100&&v.x<=1380&&v.y>=800&&v.y<=930;
const actualRoute=(run:NonNullable<JourneyState['run']>):JourneyRoute=>run.plan==='north'&&run.viaSouth?'mixed':run.plan;
const routeName=(route:JourneyRoute|null)=>route==='south'?'南林近路':route==='mixed'?'先探南林、再折回北侧高路':'北侧高路';
const atExit=(s:GameState)=>distance(s.player,P.exit)<=75;
const jointExit=(s:GameState)=>{const r=s.journey.run,n=companion(s);return !!r&&r.mode==='together'&&r.playerGate&&r.companionGate&&s.flags.companion==='following'&&!s.flags.herbsWet&&!!n&&distance(n,P.exit)<=75&&atExit(s);};
function reveal(s:GameState){for(const e of s.worlds.workshop)if(e.id==='journey_north_mark'||e.id==='journey_south_mark')e.state='idle';}
export function journeyChoices(s:GameState,e:Entity):DialogueChoice[]{
 if(!unlocked(s))return [];const j=s.journey,choices:DialogueChoice[]=[];
 if(s.scene==='home'&&(e.id==='table'||e.type==='xu')){
  if(j.stage==='unaccepted')return [{id:'journey:agree:together',label:'约许照自己带一段工棚回程'},{id:'journey:agree:solo',label:'先独自摸清工棚回程'}];
  if(e.id==='table'&&(j.stage==='ready'||j.stage==='complete'&&!!j.sharedRoute&&!j.recordedShared))choices.push({id:'journey:record',label:j.stage==='ready'?'把实际走过的回程记在桌边':'补上这次真正共同走过的回程'});
  if(!j.run){choices.push({id:'journey:agree:together',label:'下次请许照带回程，我自行跟上'},{id:'journey:agree:solo',label:'下次我先独自认回程'});}
 }
 if(j.stage==='unaccepted')return choices;
 if(s.scene==='workshop'&&(e.type==='xu'||e.id==='rest_workshop'||e.id.startsWith('journey_'))){
  if(j.run){if(j.run.plan==='south')choices.push({id:'journey:change:north',label:'不抢这段近路，沿干地折回北路'});choices.push({id:'journey:stop',label:'暂停这次认路，保留已经走过的记录'});}
  else if(distance(s.player,P.start)<=90){
   const n=companion(s),ready=s.flags.companion==='following'&&!s.flags.herbsWet&&!!n&&distance(n,P.start)<=90&&distance(n,s.player)<96,disabled=ready?{}:{disabled:'先按原来的条件邀请或在安全处重新集合；也可独行'};
   choices.push({id:'journey:start:together:north',label:'在此约定：许照带北路，我跟上',...disabled},{id:'journey:start:solo:north',label:'从这里独自走北路'});
   choices.push({id:'journey:start:together:south',label:'一起先看南林，走不通就改约',...disabled},{id:'journey:start:solo:south',label:'独自察看南侧回程'});
  }
 }
 if(s.scene==='creek'&&e.id==='shelter'&&!j.restOpened&&(j.soloRoute||j.sharedRoute))choices.push({id:'journey:rest',label:'在棚内干地展开现成坐垫，留下歇脚处'});
 return choices;
}
function contact(s:GameState,p:JourneyPorts):boolean{return s.worlds[s.scene].some(e=>(e.type==='xu'||e.id==='journey_north_mark'||e.id==='journey_south_mark')&&near(s,e,p));}
export function journeyChoose(s:GameState,id:string,p:JourneyPorts):JourneyChoiceResult|undefined{
 if(!id.startsWith('journey:'))return undefined;
 if(!unlocked(s))return no('先完成旧渠这一程，回到自己的桌边落笔');
 const j=s.journey;
 if(id==='journey:agree:solo'||id==='journey:agree:together'){
  if(s.scene!=='home'||j.run||!s.worlds.home.some(e=>(e.id==='table'||e.type==='xu')&&near(s,e,p)))return no('回桌边或许照身旁，先说好这次怎样走');
  j.agreed=id.endsWith('solo')?'solo':'together';if(j.stage==='unaccepted')j.stage='active';reveal(s);
  p.emit(s,'note',j.agreed==='together'?'约定记下了，还不算一起走过。按原来的条件邀请许照，实际到旧工棚东侧歇脚处，再让她带回程。':'你先独自认工棚回程；从工棚东侧歇脚处出发，走到西侧出口，再到溪道雨棚布置歇脚处。许照的见证不会凭约定补上。');return ok(true);
 }
 if(id.startsWith('journey:start:')){
  const [, ,mode,plan]=id.split(':');
  if(j.stage==='unaccepted'||j.run||s.scene!=='workshop'||!['solo','together'].includes(mode)||!['north','south'].includes(plan)||distance(s.player,P.start)>90||!(contact(s,p)||near(s,object(s,'rest_workshop'),p)))return no('先亲自到工棚东侧歇脚处，近身说好从哪条路出发');
  const n=companion(s);
  if(mode==='together'&&(!n||distance(n,P.start)>90||!near(s,n,p)||s.flags.companion!=='following'||s.flags.herbsWet))return no('许照尚未在出发处答应同行；先处理旧事并集合，也可以选择独行');
  j.agreed=mode as JourneyMode;j.run={mode:mode as JourneyMode,plan:plan as 'north'|'south',next:mode==='together'?1:null,playerGate:false,companionGate:false,viaSouth:false,waiting:false};
  if(mode==='solo'&&s.flags.companion==='following')s.flags.companion='waiting';
  p.emit(s,'route',mode==='together'?`许照从工棚东侧动身，自己带${plan==='north'?'北侧高路':'南林回程'}。你仍要亲自行走；前路不稳或你落后时，她会停下。`:`你从工棚东侧开始独自认${plan==='north'?'北侧高路':'南林回程'}。走过实际分岔后，到西侧出口离开。`);return ok(true);
 }
 if(id==='journey:change:north'){
  const r=j.run;if(s.scene!=='workshop'||!r||r.plan!=='south'||!(r.mode==='together'?near(s,companion(s),p):contact(s,p)))return no('在这一段的安全处，与许照或路标近身确认改路');
  r.plan='north';r.next=r.mode==='together'?0:null;r.playerGate=false;r.companionGate=false;r.waiting=false;
  p.emit(s,'route',r.viaSouth?'你们先探过南林，现在沿南侧干地折回工棚东侧，再走北路。记事会如实留下这段折返。':'这次改走北侧高路；先回到工棚东侧出发处，再沿高路认回程。');return ok(true);
 }
 if(id==='journey:stop'){
  if(!j.run||s.scene!=='workshop'||!contact(s,p))return no('到身旁或路标处，再停下这一段');
  journeyAbandonRun(s);p.emit(s,'note','本次领路暂停了，过去已经完成的记录仍在。要共同认路，之后到工棚东侧重新动身。');return ok(true);
 }
 if(id==='journey:leave-alone'){
  const e=object(s,'to_creek');if(s.scene!=='workshop'||s.dialogue?.id!=='journey_exit'||!j.run||!near(s,e,p))return no('先在实际出口说好是否先走');
  if(j.run.playerGate&&atExit(s)&&!j.soloRoute)j.soloRoute=actualRoute(j.run);
  journeyAbandonRun(s);if(s.flags.companion==='following')s.flags.companion='waiting';
  p.emit(s,'note','你先离开，许照留在原处；这次不会记作共同领路。');return {...ok(true),travel:{scene:'creek',point:{x:1570,y:420}}};
 }
 if(id==='journey:rest'){
  if(s.scene!=='creek'||j.restOpened||!j.soloRoute&&!j.sharedRoute||!near(s,object(s,'shelter'),p)||!freeHand(s)||!p.safe(s,s.player,260))return no('实际走过回程后，到雨棚干地腾手展开坐垫');
  const rest=object(s,'journey_rest_shelter');if(!rest)return no('这里还没有可展开的坐垫');
  j.restOpened=true;j.stage='ready';rest.state='idle';p.emit(s,'change','你在棚内干地展开坐垫。这里以后可以静息；回驿把亲自走过的回程记下来。',rest);return ok(true);
 }
 if(id==='journey:record'){
  if(s.scene!=='home'||!near(s,object(s,'table'),p)||!(j.stage==='ready'||j.stage==='complete'&&j.sharedRoute&&!j.recordedShared))return no('先实际走回程、在雨棚落好坐垫，再回自己的桌边记事');
  j.stage='complete';if(j.sharedRoute)j.recordedShared=true;
  p.emit(s,'growth',j.sharedRoute?`许照在桌边补了一笔：这回由她领着走过${routeName(j.sharedRoute)}。雨棚的坐垫已经留好，往来途中有地方歇脚。`:`你把独自走过的${routeName(j.soloRoute)}添在桌边；雨棚坐垫已经可用。许照听你说经过，没有把这次当成她的现场领路。`);return ok(true);
 }
 return no('这一步当前不能进行');
}
export function journeyInteract(s:GameState,e:Entity,p:JourneyPorts):ActionResult|undefined{
 if(e.id!=='journey_north_mark'&&e.id!=='journey_south_mark')return undefined;
 if(!unlocked(s)||s.journey.stage==='unaccepted'||!near(s,e,p))return no('先近身看清路边记号');
 p.dialogue(s,e.id,e.name,journeyDescription(s,e)??'看清转弯后再走。',journeyChoices(s,e));return ok();
}
function segmentDistance(v:Vec,a:Vec,b:Vec):number{const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((v.x-a.x)*dx+(v.y-a.y)*dy)/d)):0;return distance(v,{x:a.x+dx*t,y:a.y+dy*t});}
function along(v:Vec,points:ReadonlyArray<Vec>,radius=90):boolean{return points.some((b,i)=>i>0&&segmentDistance(v,points[i-1],b)<=radius);}
function corridor(s:GameState,n:Entity,point:Vec,p:JourneyPorts):boolean{
 const r=s.journey.run!;const points=getJourneyRoute(r),index=r.next!;
 // An explicit return starts along the already-authored south dry corridor.
 const permitted=index===0?along(point,JOURNEY_SOUTH):segmentDistance(point,points[index-1],points[index])<=90;
 return permitted&&p.free(s,point,17,n.id)&&p.safe(s,point,220);
}
export function journeyCompanionStep(s:GameState,n:Entity,dt:number,p:JourneyPorts):boolean{
 const r=s.journey.run;if(s.scene!=='workshop'||n.id!=='xu_work'||!r||r.mode!=='together')return false;
 if(s.paused||s.dialogue||s.defeated||!Number.isFinite(dt)||dt<=0)return true;
 const points=getJourneyRoute(r);
 if(s.flags.companion!=='following'||s.flags.herbsWet){n.state='waiting';return true;}
 const gap=distance(n,s.player);if(gap>180)r.waiting=true;else if(gap<=120)r.waiting=false;
 if(r.waiting){n.state='waiting';n.facing=Math.atan2(s.player.y-n.y,s.player.x-n.x);return true;}
 if(r.next===null||r.next>=points.length){n.state='waiting';n.facing=Math.atan2(s.player.y-n.y,s.player.x-n.x);return true;}
 while(r.next<points.length&&distance(n,points[r.next])<=18)r.next++;
 if(r.next>=points.length){n.state='waiting';return true;}
 const target=points[r.next];
 const allowed=(v:Vec)=>corridor(s,n,v,p),path=p.route(s,n,target,n.id,allowed);
 if(!path.length){n.state='waiting';return true;}
 const next=path[0];
 // Validate the complete short step, even if a host path port returns an unsafe shortcut.
 const amount=Math.min(distance(n,next),145*dt),d=distance(n,next);
 const landing=d?{x:n.x+(next.x-n.x)/d*amount,y:n.y+(next.y-n.y)/d*amount}:next;
 if(!allowed(landing)){n.state='waiting';return true;}
 n.facing=Math.atan2(next.y-n.y,next.x-n.x);n.state='leading';p.moveNpc(s,n,next,145,dt);return true;
}
export function journeyTick(s:GameState,dt:number,_p:JourneyPorts):void{
 if(s.paused||s.dialogue||s.defeated||s.scene!=='workshop'||!Number.isFinite(dt)||dt<=0)return;
 const r=s.journey.run;if(!r)return;
 if(inGate(s.player,r.plan))r.playerGate=true;
 const n=companion(s);
 if(r.mode==='together'&&n&&s.flags.companion==='following'&&!s.flags.herbsWet&&inGate(n,r.plan))r.companionGate=true;
 if(r.plan==='south'&&atProbe(s.player)&&(r.mode==='solo'||n&&atProbe(n)))r.viaSouth=true;
}
export function journeyExitIntent(s:GameState,e:Entity,p:JourneyPorts):ActionResult|undefined{
 const r=s.journey.run;if(s.scene!=='workshop'||e.id!=='to_creek'||!r||r.mode!=='together')return undefined;
 if(!near(s,e,p))return no('到实际出口近旁，再说是否先走');
 if(jointExit(s))return undefined;
 p.dialogue(s,'journey_exit','工棚西侧出口','许照还没有与你完整走过这段回程并在出口会合。可以回去等她，也可以先走；先走只保留你自己确实走过的记录。',[{id:'journey:leave-alone',label:'我先去溪道，暂停这次共同领路'}]);return ok();
}
export function journeyBeforeExit(s:GameState,destination:SceneId,p:JourneyPorts):void{
 const r=s.journey.run;if(!r)return;
 if(s.scene==='workshop'&&destination==='creek'&&r.playerGate&&atExit(s)){
  const route=actualRoute(r);
  if(r.mode==='together'&&jointExit(s)){if(!s.journey.sharedRoute)s.journey.sharedRoute=route;p.emit(s,'relationship',`许照与你在工棚西口会合。${routeName(route)}是这次双方亲自走过的回程；继续去溪道雨棚，留好歇脚处。`);}
  else if(r.mode==='solo'){if(!s.journey.soloRoute)s.journey.soloRoute=route;p.emit(s,'route',`你独自走过${routeName(route)}，从实际西口离开；下一步去溪道雨棚展开坐垫。`);}
 }
 journeyAbandonRun(s);
}
export function journeyAbandonRun(s:GameState):void{s.journey.run=null;}
export function journeyGuideView(s:GameState):{phase:'leading'|'waiting'|'exitReady';reason:string}|null{
 const r=s.journey.run;if(!r||r.mode!=='together'||s.scene!=='workshop')return null;
 if(s.flags.companion!=='following'||s.flags.herbsWet)return {phase:'waiting',reason:'许照尚未重新同意同行；先在安全处按原条件集合。'};
 if(r.waiting)return {phase:'waiting',reason:'许照停在干地等你；走近一些，她再继续。'};
 if(r.next!==null&&r.next>=getJourneyRoute(r).length)return {phase:'exitReady',reason:'许照已到出口候点；你仍要走过实际分岔，在出口会合。'};
 if(companion(s)?.state==='waiting')return {phase:'waiting',reason:'前面暂时没有放心通过的路；看清实际兽情与障碍，也可近身改走北路。'};
 return {phase:'leading',reason:r.plan==='north'&&r.viaSouth?'沿干地折回工棚东侧，再绕北路；这段折返会如实记下。':`许照正带${r.plan==='north'?'北侧高路':'南林回程'}，你仍需自行跟上。`};
}
export function journeyObjective(s:GameState):string|undefined{
 if(!unlocked(s)||!['home','workshop','creek'].includes(s.scene))return undefined;const j=s.journey;
 if(j.stage==='unaccepted')return s.scene==='home'?'许照想自己认工棚回程；可在桌边约她领路，或先独自走一趟':undefined;
 if(s.scene==='workshop'&&j.run)return journeyGuideView(s)?.reason??`独自从${j.run.plan==='north'?'北侧高路':'南林'}认回程，实际走过分岔再到西侧出口`;
 if(j.stage==='ready')return '雨棚坐垫已经留好；亲自回驿，在桌边记录回程';
 if(j.stage==='complete')return j.sharedRoute&&!j.recordedShared&&s.scene==='home'?'这次已真正共同走过回程；在桌边补上许照的笔迹':undefined;
 if(j.soloRoute||j.sharedRoute)return s.scene==='creek'?'已实际走过工棚回程；到雨棚干地展开坐垫':'实际回程已经记下，去溪道雨棚留好歇脚处';
 return s.scene==='workshop'?'到工棚东侧歇脚处，与许照近身确认本次路线':'从原溪道去旧工棚，在东侧歇脚处开始这次认路';
}
export function journeyDescription(s:GameState,e:Entity):string|undefined{
 if(!unlocked(s))return undefined;
 if(e.type==='xu'&&(s.flags.herbsWet||s.flags.companion==='refused'||s.flags.companion==='sheltered'))return undefined;
 const j=s.journey;
 if(e.id==='table'){
  const oldMap='旧渠小图已经摊在桌边。';
  if(j.stage==='unaccepted')return oldMap+'许照想自己认工棚的回程，下次独自往来也知道哪里能走、哪里该等。可以约她带一段，或先自己探路。';
  if(j.stage==='ready')return oldMap+`雨棚坐垫已留好，桌边还没记下这次${j.sharedRoute?'由许照带着走过':'你独自走过'}的回程。亲手添完这一笔，下次出门有路可认。`;
  if(j.stage==='complete')return oldMap+(j.sharedRoute&&!j.recordedShared?'这次已经真正让许照带完回程；旧的个人记录还在，可以把她的笔迹补到旁边。':j.recordedShared?`回程图旁有许照亲手添的记号，记着${routeName(j.sharedRoute)}；雨棚干地的坐垫仍可歇脚。`:`你独自认过的${routeName(j.soloRoute)}已记在旁边，雨棚坐垫也留好了。许照没有把听来的路算作自己的经历，仍可另约一次实际领路。`);
  if(j.soloRoute||j.sharedRoute)return oldMap+'工棚回程已经实际走过；还要亲自去溪道雨棚展开坐垫，再回来记在图上。';
  return oldMap+(j.agreed==='together'?'你们约过让许照带工棚回程，还没有真正走完。按原来的条件邀请她，实际到工棚东侧歇脚处，再说好走法。':'你打算先独自认工棚回程。到工棚东侧歇脚处近身确认路线，再亲自走到西侧出口。');
 }
 if(e.id==='journey_north_mark')return '石刻指向北侧高路，西北转弯后沿干地去出口。要自己走过，读这块石刻不算完成回程。';
 if(e.id==='journey_south_mark')return '绳结旁是南林候点。兽仍在时先看动静；走不稳可以近身改北路，不必拿许照冒险。';
 if(e.id==='journey_rest_shelter')return j.restOpened?'坐垫留在棚内干地，往来时可以在这里静息。':undefined;
 if(e.type==='xu'&&s.scene==='workshop'&&j.run)return journeyGuideView(s)?.reason??'这次你先独自认路；我不会把没走过的一段写成共同经历。';
 if(e.type==='xu'&&s.scene==='home'&&j.sharedRoute)return `许照记得由她领着走过的${routeName(j.sharedRoute)}。${j.recordedShared?'桌边有她亲自添的回程记号。':'到桌边再补上这次真正一起走过的路。'}`;
 if(e.type==='xu'&&s.scene==='home'&&j.soloRoute)return '许照听你讲独自认过的回程；她愿意另约一次自己带路，不把听说当成已经走过。';
 if(e.id==='shelter'&&(j.soloRoute||j.sharedRoute))return j.restOpened?'这次留下的坐垫仍在棚内干地，可以歇脚。':'回程已经亲自走通，腾手把棚内现成坐垫展开；也仍可处理原来的药筐与包扎事务。';
 return undefined;
}

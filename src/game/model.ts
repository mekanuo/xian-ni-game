import { SCENES } from './content';
import type { ActionResult, CastPreview, DialogueChoice, Entity, GameAction, GameState, Profile, SceneId, Spell, Vec } from './contracts';

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const dist = (a: Vec, b: Vec) => Math.hypot(a.x-b.x,a.y-b.y);
const finitePoint = (p: Vec) => p && Number.isFinite(p.x) && Number.isFinite(p.y);
const result = (ok: boolean, message?: string): ActionResult => message ? {ok,message} : {ok};
const entities = (s: GameState) => s.worlds[s.scene];
const entity = (s: GameState, id: string) => entities(s).find(e=>e.id===id);
const data = (e: Entity) => e.data ?? (e.data={});
const num = (e: Entity, key: string) => Number(e.data?.[key] ?? 0);
function emit(s: GameState, type: string, text: string, e?: Vec & {id?:string|number}) {
  s.events.push({seq:Number(s.flags.eventSeq ?? 0)+1,time:s.time,type,text,...(e?{x:e.x,y:e.y,...(e.id?{targetId:String(e.id)}:{})}:{})});
  s.flags.eventSeq=Number(s.flags.eventSeq ?? 0)+1;
  if(s.events.length>180)s.events.shift();
}
function checkpoint(s: GameState) { const saved=clone(s); saved.checkpoint=null; saved.pending=null; saved.dialogue=null; saved.paused=false; s.checkpoint=JSON.stringify(saved); }
export function createGame(profile: Profile): GameState {
  if(!profile || !['herbalist','tinker'].includes(profile.origin) || !['stay','travel'].includes(profile.wish))throw Error('人物经历无效');
  const s:GameState={schema:1,revision:'return-stone-v1',profile:{...profile,name:profile.name.trim().slice(0,12)||'行舟'},scene:'home',time:0,
    player:{...SCENES.home.spawn,hp:4,mana:6,facing:0,invulnerable:0,cooldown:0,ward:0,wardFacing:0,pullId:null,pullPoint:null,hold:0,path:[]},
    worlds:{home:clone(SCENES.home.entities),creek:clone(SCENES.creek.entities),workshop:clone(SCENES.workshop.entities),crossing:clone(SCENES.crossing.entities)},
    flags:{eventSeq:0,companion:'waiting',visited_home:true},ringStyle:null,herbs:2,selected:'pull',paused:false,dialogue:null,events:[],projectiles:[],pending:null,ended:false,defeated:false,checkpoint:null,lastSafe:{scene:'home',point:{x:340,y:850}}};
  for(const group of Object.values(s.worlds))for(const e of group){e.homeX=e.x;e.homeY=e.y;}
  emit(s,'note',`${s.profile.name}，凝气三层。先前攒钱修的引环，今日该去取了。`);
  emit(s,'hint','陶七扶着歪灯架。选「牵引」，点灯盏，再点灯架旁的落点，最后放下。');
  checkpoint(s);return s;
}

type Rect={x:number;y:number;w:number;h:number;flag?:string};
function rectangles(s: GameState, ignoreId?: string): Rect[] {
  // The entrance collider represents this movable beam: ignore it only for the beam itself.
  // Actor movement supplies no beam ID, so the entrance stays blocked until hold opens it.
  const fixed=SCENES[s.scene].obstacles.filter(r=>(!r.flag||!s.flags[r.flag])&&!(ignoreId==='platform_beam'&&r.flag==='platformOpen'));
  const moving=entities(s).filter(e=>e.solid&&e.id!==ignoreId&&e.state!=='held'&&e.state!=='burned').map(e=>({x:e.x-e.w/2,y:e.y-e.h/2,w:e.w,h:e.h}));
  return [...fixed,...moving];
}
function contains(r: Rect,p: Vec,pad=0){return p.x>r.x-pad&&p.x<r.x+r.w+pad&&p.y>r.y-pad&&p.y<r.y+r.h+pad;}
function free(s:GameState,p:Vec,pad=17,ignoreId?:string){const map=SCENES[s.scene];return finitePoint(p)&&p.x>=25&&p.x<=map.width-25&&p.y>=25&&p.y<=map.height-25&&!rectangles(s,ignoreId).some(r=>contains(r,p,pad));}
function isWaterRect(s:GameState,r:Rect){return SCENES[s.scene].ground.some(g=>g.type==='water'&&r.x>=g.points[0]&&r.y>=g.points[1]&&r.x+r.w<=g.points[2]&&r.y+r.h<=g.points[5]);}
function clearLine(s:GameState,a:Vec,b:Vec,ignoreId?:string){
  const blocks=rectangles(s,ignoreId).filter(r=>!isWaterRect(s,r)&&r.flag!=='platformOpen');
  const steps=Math.max(1,Math.ceil(dist(a,b)/10));
  for(let i=1;i<steps;i++){const p={x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps};if(blocks.some(r=>contains(r,p)))return false;}
  return true;
}
function safeFromThreat(s:GameState,p:Vec,margin=260){return !entities(s).some(e=>e.kind==='enemy'&&e.state!=='retreated'&&e.state!=='peaceful'&&dist(e,p)<margin&&clearLine(s,e,p));}
function pathfind(s:GameState,destination:Vec):Vec[]{
  if(!free(s,destination))return [];
  const start={x:s.player.x,y:s.player.y};
  const straight=(a:Vec,b:Vec)=>{const n=Math.ceil(dist(a,b)/18);for(let i=1;i<=n;i++){const p={x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n};if(!free(s,p)||(!safeFromThreat(s,p,145)&&safeFromThreat(s,start,145)))return false;}return true;};
  if(straight(start,destination))return [destination];
  const step=40,cols=45,rows=28,key=(x:number,y:number)=>y*cols+x;
  const sx=Math.round(start.x/step),sy=Math.round(start.y/step),tx=Math.round(destination.x/step),ty=Math.round(destination.y/step);
  const queue=[key(sx,sy)],parents=new Map<number,number>([[queue[0],-1]]);let found=-1;
  for(let qi=0;qi<queue.length;qi++){
    const cur=queue[qi],x=cur%cols,y=Math.floor(cur/cols);
    if(Math.abs(x-tx)<=1&&Math.abs(y-ty)<=1&&straight({x:x*step,y:y*step},destination)){found=cur;break;}
    for(const [dx,dy]of[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){
      const nx=x+dx,ny=y+dy,k=key(nx,ny),p={x:nx*step,y:ny*step};
      if(nx<1||ny<1||nx>=cols||ny>=rows||parents.has(k)||!free(s,p)||!straight({x:x*step,y:y*step},p))continue;
      parents.set(k,cur);queue.push(k);
    }
  }
  if(found<0)return [];
  const raw:Vec[]=[destination];for(let k=found;parents.get(k)!>=0;k=parents.get(k)!)raw.push({x:(k%cols)*step,y:Math.floor(k/cols)*step});raw.reverse();
  const smooth:Vec[]=[];let from=start;for(let i=0;i<raw.length;){let j=i;while(j+1<raw.length&&straight(from,raw[j+1]))j++;smooth.push(raw[j]);from=raw[j];i=j+1;}return smooth;
}
export function nearbyEntity(s:GameState):Entity|undefined{return entities(s).filter(e=>e.kind!=='enemy'&&e.kind!=='scenery'&&e.state!=='taken'&&dist(e,s.player)<=100&&clearLine(s,s.player,e,e.id)).sort((a,b)=>dist(a,s.player)-dist(b,s.player))[0];}
export function previewCast(s:GameState,spell:Spell,targetId:string|undefined,point:Vec):CastPreview {
  const target=targetId?entity(s,targetId):undefined;
  const range=spell==='pull'&&(s.ringStyle==='long'||s.flags.trialStyle==='long')?500:spell==='pull'?300:spell==='flame'?400:100;
  const fail=(reason:string):CastPreview=>({valid:false,reason,cost:1,range,target});
  if(!finitePoint(point))return fail('落点无效');
  if(s.defeated)return fail('先重试或撤回安全处');
  if(s.dialogue)return fail('先结束交谈');
  if(s.player.mana<1)return fail('灵力不足，可步行回静息落点');
  if(s.player.pullId&&spell!=='pull'&&s.player.hold<=0)return fail('正牵着物件，先放下或留势');
  if(spell==='pull'){
    if(s.player.pullId)return fail('一次只能牵一件，先放下原物');
    if(!target||!target.movable||target.state==='taken')return fail('只能牵带有提耳的轻物，不能牵人');
    if(dist(s.player,target)>range+1)return fail(`目标超过${range/50}步牵引范围`);
    if(!clearLine(s,s.player,target,target.id))return fail('目标被实物遮住');
    if(dist(s.player,point)>range+1)return fail('落点超出牵引范围');
    if(!free(s,point,12,target.id)&&!(target.id==='board'&&dist(point,{x:1120,y:648})<45))return fail('落点被挡住，请选可站立的地面');
    if(!clearLine(s,target,point,target.id))return fail('搬动路径有实物阻挡');
  }
  if(spell==='flame'){
    if(s.player.cooldown>0||s.flags.casting)return fail('火球正在准备或间隔中');
    if(dist(s.player,point)>range+1)return fail('目标超过8步火球范围');
    if(dist(s.player,point)<5)return fail('请指定身前的方向');
    // The first obstacle receives the projectile; previews explain this without firing through it.
    if(!clearLine(s,s.player,point,target?.id))return fail('射线被实物挡住，需先移动位置');
  }
  if(spell==='ward'&&Number(s.flags.wardCooldown??0)>0)return fail('符具尚未收稳，需间隔3秒');
  return {valid:true,reason:spell==='pull'?'牵住后点击落点，按放下落稳':spell==='flame'?'准备半秒后直线飞出':'挡住前方一次来袭，持续6秒',cost:1,range,target};
}
function dialogue(s:GameState,id:string,speaker:string,text:string,choices:DialogueChoice[]=[]){
  s.flags.dialogueRemainder=choices.length>2?JSON.stringify(choices.slice(2)):'';
  s.dialogue={id,speaker,text,choices:[...choices.slice(0,2),choices.length>2?{id:'more',label:'还有些话想说…'}:{id:'leave',label:'先继续走走'}]};s.paused=true;s.player.path=[];s.pending=null;
}
function follow(s:GameState){s.flags.companion='following';emit(s,'relationship','许照收紧药篓背带，走到你身后。');}
function choose(s:GameState,id:string):ActionResult {
  const d=s.dialogue;if(!d)return result(false,'当前没有交谈');if(id==='leave'){s.dialogue=null;return result(true);}if(id==='more'){const choices:DialogueChoice[]=JSON.parse(String(s.flags.dialogueRemainder||'[]'));dialogue(s,d.id,d.speaker,d.text,choices);return result(true);}const option=d.choices.find(c=>c.id===id);if(!option||option.disabled)return result(false,option?.disabled??'没有这个话题');
  if(id==='leave'){s.dialogue=null;return result(true);}
  if(id==='invite'){follow(s);s.flags.invited=true;}
  else if(id==='wait'){s.flags.companion='waiting';emit(s,'relationship','你们约在溪道会合。许照会按自己的路程走。');}
  else if(id==='fix'){s.flags.boatSecured=true;entity(s,'boat')!.state='secured';emit(s,'change','你认出旧绳扣的受力处，徒手固定了小舟。');}
  else if(id==='cooperate'){s.flags.boatCooperating=true;follow(s);emit(s,'hint','你稳住绳扣，许照正沿你指的干燥踏点走向船舷。留在绳扣附近，等她压稳舟身。');}
  else if(id==='bandage'){
    if(s.profile.origin!=='herbalist')s.herbs--;
    s.flags.bandaged=true;emit(s,'relationship','你替许照理好药包，包扎了她先前划伤的手；她把干燥踏点指给你。');
  }
  else if(id==='learn_bandage'){s.flags.bandaged=true;s.flags.learnedHerbs=true;emit(s,'relationship','许照指给你止血草的叶脉。你照着她的步骤包好布条，她重新背好药筐。');}
  else if(id==='dry'){
    s.flags.herbsWet=false;s.flags.herbsRepaired=true;const basket=entity(s,'basket');if(basket){basket.state='dry';basket.name='晾好的药筐';}
    follow(s);emit(s,'relationship','导水板归位，你们把受潮的草药摊开，收好可用的部分。许照愿意重新协作。');
  }
  else if(id==='long'||id==='hold'){
    s.flags.trialStyle=id;const trial=entity(s,'trial');if(trial){trial.x=trial.homeX!;trial.y=trial.homeY!;trial.state='idle';}
    if(s.scene==='home'){s.ringStyle=id as 'long'|'hold';s.flags.trialStyle='';emit(s,'growth',`你在熟悉的工位把引环改练为${id==='long'?'长牵':'留势'}。`);}
    else emit(s,'hint',id==='long'?'陶七演示将灵线放长，又以短停展示留势。轮到你：站在试环站位，把远处木块牵近。':'陶七演示延长灵线和短暂停物。轮到你：走近木块，牵住后按「留势」，让物件自己停住。');
  }
  else if(id==='room'){s.flags.roomTalk=true;emit(s,'relationship','陶七说驿后空屋可整理。你约好归来自己定下练功角的位置。');}
  else if(id==='route_talk'){s.flags.routeTalk=true;emit(s,'relationship','许照把山外两段短路画给你看，约好先试走石渡这一段。');}
  else if(id==='refuse'){s.flags.refusedDemand=true;emit(s,'note','你没有交出自己的法器。干地仍被看守，低滩与山脊都可另找办法。');}
  else if(id==='offer'){s.flags.deal=true;for(const e of entities(s).filter(e=>e.kind==='enemy'))e.state='peaceful';emit(s,'note','你让散修回想刚才亲眼看见的排水。他们答应让出施术位置，通路仍要等你实际修成。');}
  else if(id==='demonstrate'){s.flags.deal=true;for(const e of entities(s).filter(e=>e.kind==='enemy'))e.state='peaceful';emit(s,'note','你让他们看已露出的低滩。卡住入口已经失去意义，散修让开路。');}
  else if(id==='danger'){s.flags.companion='refused';emit(s,'relationship','许照摇头：“我可以接物、指路，不替你迎着术法冲。”她退到雨棚边候着。');}
  else if(id==='regroup'){follow(s);emit(s,'relationship','你等来袭散去，再招呼许照靠近。');}
  else if(id==='stay'||id==='travel'){
    if(d.id==='ending'){
      s.profile.wish=id;s.flags.endingWish=id;s.ended=true;if(id==='travel'&&s.flags.sharedJourney&&!s.flags.herbsWet&&s.flags.companion==='following'){s.flags.travelInvited=true;}
      const shared=s.flags.platformShared?'风铃响过你们一起看路的眺台。':s.flags.chime?'窗边风铃记着你独自登台的那阵风。':'山路的风从窗外经过。';
      emit(s,'ending',id==='stay'?`你在桌边放下引环，亲手定好练功角的挂钩。${shared}明日有地方继续练。`:`你在桌上展开亲自走过的${s.flags.route==='main'?'低滩渡路':'山脊绕路'}。${shared}${s.flags.travelInvited?'许照在旁添了一笔，约好下次短途。':'你给自己的下一段行路留出空白。'}`);
    }else{s.profile.wish=id;emit(s,'note',id==='stay'?'你想先有个能安心练术的地方。':'你想练到能独自走远，也能照应同行。');}
  }
  s.dialogue=null;return result(true);
}
function interact(s:GameState,id:string):ActionResult {
  const e=entity(s,id);if(!e||dist(e,s.player)>105||!clearLine(s,s.player,e,e.id))return result(false,'先走近这个人或器物再互动');
  if(e.state==='taken')return result(false,'已经收好了');
  if(e.kind==='exit'){
    if(id==='to_workshop'&&!s.flags.tools)return result(false,'先取回小舟上的器具袋，修闸和试环会用到');
    if(id==='to_crossing'&&!s.flags.ringTrained)return result(false,'先取回自己的引环，亲手试稳一种用法再去石渡');
    release(s);s.scene=e.targetScene!;s.player.x=e.targetSpawn!.x;s.player.y=e.targetSpawn!.y;s.player.path=[];s.player.ward=0;s.projectiles=[];s.flags.casting=false;s.pending=null;
    s.flags[`visited_${s.scene}`]=true;const r=entities(s).find(e=>e.kind==='rest')!;s.lastSafe={scene:s.scene,point:{x:r.x,y:r.y}};
    for(const n of entities(s).filter(e=>e.type==='xu'))if(s.flags.companion==='following'){n.x=s.player.x+45;n.y=s.player.y+40;}
    if(s.scene==='home'&&s.flags.route){s.flags.returned=true;const cart=entity(s,'return_cart')!;cart.state=s.flags.route==='main'?'arrived':'ridge';cart.x=s.flags.route==='main'?1230:1380;emit(s,'return',s.flags.route==='main'?'木车已进了院，路上的人正沿你修开的低滩来。':'门后添了一块山脊路标，背架靠在熟悉的墙边。');}
    emit(s,'scene',SCENES[s.scene].title);checkpoint(s);return result(true);
  }
  if(e.kind==='rest')return rest(s);
  if(e.type==='tao'){
    if(s.scene==='workshop'){
      if(!s.flags.ringOwned){dialogue(s,'tao','陶七','你的旧系绳还在台上的引环上。取回来，我扶好试架，让你把两种用法都看清。');return result(true);}
      dialogue(s,'trial','陶七',s.flags.ringTrained?'刚试过的手感还记得吧？第一次取舍可以马上重试另一种；往后回驿工位也能换。':'我先让灵线伸远，再让木块停住片刻。长牵省站位；留势多费一格却能腾手。选一种，亲手把木块试稳。',[{id:'long',label:'试长牵：站远一点，把木块牵近'},{id:'hold',label:'试留势：牵住木块后让它悬停'},{id:'room',label:'谈谈驿后的空屋'}]);
    }else dialogue(s,'tao','陶七',s.flags.returned?`引环回到你手里了。${s.flags.lampFixed?'你安好的灯还亮着。':'灯架我已扶稳，桌边仍留着你的碗。'}${s.profile.origin==='tinker'?'你修过的灯架我放回工位了。':'你分好的药草在晒架上。'}`:'灯盏松了，帮我把它牵回架旁吧。你的引环已经修好，在旧工棚；溪道上先拿自己的器具袋。',[{id:'room',label:'我想看看驿后那间空屋'},{id:'stay',label:'眼下想有自己的修行处'},{id:'travel',label:'眼下想练出走远路的本领'}]);
    return result(true);
  }
  if(e.type==='xu'){
    let text=s.flags.herbsWet?'许照抱着受潮药筐：“板一拿走，水全落到这里。先把导水板放回，再把药理好吧。”':s.flags.returned?`“你真走过那条${s.flags.route==='main'?'低滩':'山脊'}了。”${s.flags.platformShared?'她指着你们共同添过的眺台记号。':s.flags.platformVisited?'你提起独自看见的眺台，她点头说那里风大。':'她把自己的采药图摊在桌旁。'}`:'“我也要看看雨后的采药路。你要去取环，咱们可以顺路。”';
    const options:DialogueChoice[]=[];
    if(!s.flags.herbsWet)options.push({id:'invite',label:'一起走，我会留意你的候点'});
    options.push({id:'wait',label:'各自走，到溪道再会合'},{id:'route_talk',label:'问问山外的路'});
    if(s.scene==='crossing'&&s.flags.companion==='following'&&entities(s).some(n=>n.kind==='enemy'&&n.state!=='peaceful'&&n.state!=='retreated'))options.push({id:'danger',label:'请她到前方引开散修'});
    dialogue(s,'xu','许照',text,options);return result(true);
  }
  switch(id){
    case 'rope': dialogue(s,'boat','许照',s.profile.origin==='tinker'?'绳扣的旧修痕你认得：顺着受力绕回去，就能徒手系住舟。':'西侧两块踏石是干的。你能辨出湿滑苔色；让许照压住船舷，一起把舟稳好。',[...(s.profile.origin==='tinker'?[{id:'fix',label:'照旧修痕徒手固定绳扣'}]:[]),{id:'cooperate',label:'指出踏点，和许照共同稳舟'}]);break;
    case 'bag':if(!s.flags.boatSecured)return result(false,'小舟还在晃，先牵回西岸或固定绳扣');s.flags.tools=true;e.state='taken';emit(s,'item','你取回了自己的器具袋。扳钳与绳束齐全，可以去旧工棚了。');break;
    case 'shelter':{
      const options:DialogueChoice[]=[];
      if(!s.flags.bandaged)options.push({id:'bandage',label:s.profile.origin==='herbalist'?'用认识的止血草包扎，不耗伤药':'用一份伤药替她包扎',...(s.profile.origin!=='herbalist'&&s.herbs<1?{disabled:'没有伤药了，可请她教你辨认草药'}:{})},{id:'learn_bandage',label:'跟她辨认止血草，共同处理轻伤'});
      if(s.flags.herbsWet)options.push({id:'dry',label:'把受潮药草摊开整理',...(!s.flags.boardReturned?{disabled:'先把导水板牵回原来的位置'}:{})});
      if(!s.flags.herbsWet)options.push({id:'regroup',label:'招呼许照继续同行'});
      options.push({id:'route_talk',label:'请她画一小段山外路线'});
      dialogue(s,'shelter','许照',s.flags.herbsWet?'水落进药筐，她先收起受潮的叶片。放回板、共同理好草药，还来得及。':'雨歇了。许照摊开药包，手背有一道先前割的伤。溪道的长路始终可走，不必拿药筐换近路。',options);break;
    }
    case 'ring':s.flags.ringOwned=true;if(entities(s).some(n=>n.type==='xu'&&dist(n,s.player)<250))s.flags.xuRingKnown=true;e.state='taken';emit(s,'item','你解下熟悉的旧绳，把付钱修整的普通引环收回腰间。熟悉的重量落回手心，旧绳的结还在。');checkpoint(s);break;
    case 'workbench':if(!s.flags.ringTrained)return result(false,'取回引环并在工棚亲试一次后，才知道怎样在这里换法');dialogue(s,'respec','修器工位','自己的引环，自己的手感。在驿中可以重新收束灵线。',[{id:'long',label:'改练长牵：10步，仍只牵一件'},{id:'hold',label:'改练留势：6步，追加一格停物8秒'}]);break;
    case 'return_ladder':if(!inPlatform(s.player))return result(false,'先实际登上眺台');s.flags.platformReturn=true;s.flags.platformOpen=true;platformVisit(s);e.state='lowered';emit(s,'change','你徒手放下回程梯，入口已有稳固退路。灵力用尽也能走回。');break;
    case 'chime':if(!inPlatform(s.player))return result(false,'先走上眺台');platformVisit(s);s.flags.chime=true;e.state='taken';emit(s,'item','你收起旧檐风铃，想把它挂到驿中自己的窗边。');break;
    case 'marks':if(!inPlatform(s.player))return result(false,'先走上眺台');platformVisit(s);dialogue(s,'marks','采药记号',s.flags.platformShared?'许照蹲在石边，添上一道你们今日共同辨过的干路：“风朝这边时，下坡要看苔色。”':'石边刻着许照早先的采药记号。你独自辨认了方向，这还不是你们一起走过的路。');break;
    case 'gate':s.flags.gateObserved=true;dialogue(s,'gate_inspect','闸口牵扣','闸槽尚好。小幅牵开能示范排水；无楔松手就会回弹。可以先在下方固定桩安楔再牵，也可以留势时腾手安楔。');break;
    case 'negotiator':dialogue(s,'negotiation','拦路散修','“水一涨，人人都要挤这条干地。留下法器，才好说话。”你看见闸槽还在，旁边也有高处旧绳梯。',[{id:'refuse',label:'法器是我自己攒钱买的，不交'},{id:'offer',label:'以刚才的排水示范，提出疏水换通行',...(!s.flags.gateDemonstrated?{disabled:'先让他们亲眼看见牵闸的小幅排水'}:{})},{id:'demonstrate',label:'让他们看已经露出的低滩',...(!s.flags.gateOpen?{disabled:'水路还未实际修通'}:{})}]);break;
    case 'gate_slot':if(!s.flags.tools)return result(false,'需要自己的器具袋');if(s.player.pullId==='gate'&&s.player.hold<=0)return result(false,'正牵着闸扣，手腾不出来；先留势，或松手后预先安楔');s.flags.gateWedge=true;e.state='wedged';emit(s,'change','你用自己的扳钳把木楔安进闸槽。牵开闸扣时，它会卡住回弹。');if(s.flags.gatePulled)fixGate(s);break;
    case 'far_bank':if(!s.flags.gateOpen||s.player.x<1320)return result(false,'先实际修通并走过主渡');s.flags.route='main';s.flags.mainTraversed=true;if(companionPresent(s))s.flags.sharedJourney=true;emit(s,'route','你站到低滩彼岸，辨明了通向外界的路。现在可以沿原路亲自返驿。');break;
    case 'ridge_marker':if(!s.flags.ridgeOpen||s.player.x<1320)return result(false,'先放下绳梯并沿山脊走过来');s.flags.route=s.flags.gateOpen?'main':'ridge';s.flags.ridgeUsed=true;if(companionPresent(s))s.flags.sharedJourney=true;emit(s,'route','你在山脊彼端记下绕行路：人能过，木车仍得另找低滩。现在亲自返驿。');break;
    case 'table':if(s.flags.returned&&s.flags.ringOwned&&s.flags.ringTrained&&s.flags.route)dialogue(s,'ending','你的桌边',`你带回自己的引环，也亲脚走过了${s.flags.route==='main'?'修通的主渡':'山脊绕行路'}。灯下的碗仍在，这次想怎样放下行囊？`,[{id:'stay',label:'放下引环，亲手定好练功角的挂钩'},{id:'travel',label:'摊开地图，定下下一次短途'}]);else dialogue(s,'table','你的桌边','碗旁压着半年前记下的工钱。引环是你慢慢攒来的，今日想把它拿回来。',[{id:'stay',label:'想有个自己的修行处'},{id:'travel',label:'想有本领走出去'}]);break;
    case 'room':dialogue(s,'room','驿后空屋',s.flags.roomTalk?'你和陶七说好的空屋，窗边正好挂环，角落能摆一块练习木。':'屋中空着一角。可以先和陶七谈谈，归来再定眼下的心愿。');break;
    case 'herb_rack':dialogue(s,'rack','晒药架',s.profile.origin==='herbalist'?'你此前分过的药草，已经按叶与根晾在不同层。熟悉的活计让这里有一点自己的样子。':'晾架上是你在药铺见过的草药。许照可以教你认出这次路上用得到的一种。');break;
    default:dialogue(s,'inspect',e.name,e.hint??'这是路边熟悉的物件。可以继续走动察看。');
  }
  return result(true);
}
function companionPresent(s:GameState){return s.flags.companion==='following'&&entities(s).some(e=>e.type==='xu'&&dist(e,s.player)<150);}
function fixGate(s:GameState){s.flags.gateOpen=true;s.flags.gateFixed=true;entity(s,'gate_slot')!.state='fixed';emitOnce(s,'gateFixedNote','木楔卡稳闸扣，水沿泄槽转向，主渡低滩露出连续白石。');for(const enemy of entities(s).filter(e=>e.kind==='enemy'))enemy.state='peaceful';}
function inPlatform(p:Vec){return p.x>1110&&p.x<1500&&p.y>100&&p.y<315;}
function platformVisit(s:GameState){
  if(!s.flags.platformVisited){s.flags.platformVisited=true;emit(s,'place','你实际走上旧眺台，凹台里风轻了。');}
  const xu=entities(s).find(e=>e.type==='xu');
  if(xu&&s.flags.companion==='following'&&inPlatform(xu)&&!s.flags.platformShared){s.flags.platformShared=true;emit(s,'relationship','许照和你一起登上眺台，在旧采药记号旁添了今日共同认出的路。');}
}
function rest(s:GameState):ActionResult {
  const r=entities(s).find(e=>e.kind==='rest'&&dist(e,s.player)<115);if(!r)return result(false,'先走到静息落点');
  if(!safeFromThreat(s,s.player)||s.projectiles.some(p=>p.owner==='enemy'&&dist(p,s.player)<350))return result(false,'仍在来袭范围，先离开视线');
  release(s);s.player.hp=4;s.player.mana=6;s.player.cooldown=0;s.player.invulnerable=0;s.lastSafe={scene:s.scene,point:{x:r.x,y:r.y}};emit(s,'rest','坐稳一息，体力与灵力已恢复。伤药没有增加。');checkpoint(s);return result(true);
}
function trained(s:GameState,style:'long'|'hold'){
  s.ringStyle=style;s.flags.ringTrained=true;s.flags.trialStyle='';emit(s,'growth',style==='long'?'远处木块稳稳到了手边。你亲手试成了长牵，灵线可达十步。':'陶七松开试架，木块仍停在半空。你亲手试成了留势，能腾出手来。');
}
function release(s:GameState){
  if(!s.player.pullId)return;const e=entity(s,s.player.pullId);
  if(e){e.state='idle';objectChanged(s,e);if(e.id==='gate'&&!s.flags.gateWedge){e.x=e.homeX!;e.y=e.homeY!;s.flags.gatePulled=false;emit(s,'change','无楔的闸扣回弹，短暂排出的水重新漫上低滩。散修已看见这次示范。');}if(['decoy','shield_board','boat','board'].includes(e.id)&&!e.data?.noiseUsed&&dist(e,{x:e.homeX!,y:e.homeY!})>70){data(e).noiseUsed=true;for(const enemy of entities(s).filter(n=>n.kind==='enemy'&&n.state!=='retreated'&&n.state!=='peaceful'&&dist(n,e)<550)){data(enemy).lastX=e.x;data(enemy).lastY=e.y;data(enemy).seen=3;enemy.state='searching';}emit(s,'drop',`${e.name}落稳，声响留在实际落点。`,e);}}
  s.player.pullId=null;s.player.pullPoint=null;s.player.hold=0;
  if(!s.flags.platformReturn&&!s.flags.platformLong)s.flags.platformOpen=false;
}
function objectChanged(s:GameState,e:Entity){
  const moved=dist(e,{x:e.homeX!,y:e.homeY!});
  if(e.id==='lamp'&&dist(e,{x:560,y:665})<110&&!s.flags.lampFixed){s.flags.lampFixed=true;e.state='lit';e.x=560;e.y=620;entity(s,'lamp_stand')!.state='lit';emit(s,'change','灯盏落回架上。陶七终于松开手，暖光照见留给你的碗。',e);}
  if(e.id==='boat'&&e.x<610){s.flags.boatSecured=true;e.state='secured';emitOnce(s,'boatMoved','小舟靠到西岸，器具袋可以稳稳取下。');}
  if(e.id==='basket'){s.flags.basketSafe=e.x>1110&&e.y<565;if(s.flags.basketSafe)emitOnce(s,'basketProtected','药筐已经在棚内，借导水板也不会淋湿它。');}
  if(e.id==='board'){
    s.flags.boardReturned=moved<55;s.flags.shelterBridge=dist(e,{x:1120,y:648})<50;e.h=s.flags.shelterBridge?70:35;
    if(moved>95&&!s.flags.basketSafe&&!s.flags.herbsWet){s.flags.herbsWet=true;s.flags.herbsRepaired=false;s.flags.companion='refused';const b=entity(s,'basket')!;b.state='wet';b.name='受潮的药筐';emit(s,'relationship','导水板移开，水落进许照的药筐。她先去收药，暂停这一段同行。');}
    if(moved>95&&s.flags.basketSafe)emitOnce(s,'shelterShared','你先安置好药筐再借板，许照伸手接住板端，近路留下了一段干燥落脚处。');
  }
  if(e.id==='platform_ladder'&&e.x<1090){s.flags.platformOpen=true;s.flags.platformLong=true;emitOnce(s,'ladderLowered','远处绳梯搭到入口，旧眺台的路打开了。');}
  if(e.id==='gate'&&moved>75){s.flags.gatePulled=true;s.flags.gateDemonstrated=true;emitOnce(s,'gateHint','闸扣拉开，水短暂流向泄槽。没有木楔，松手就会回弹；散修已经看见排水的用处。');if(s.flags.gateWedge)fixGate(s);}
  if(e.id==='ridge_rope'&&e.x<1030&&moved>75){s.flags.ridgeOpen=true;emitOnce(s,'ridgeLadder','旧绳梯落在西岸。高处山脊出现连续可走的路。');}
  if(e.id==='trial'&&s.flags.trialStyle==='long'&&Number(e.data?.startDistance)>300&&moved>70)trained(s,'long');
}
function emitOnce(s:GameState,key:string,message:string){if(!s.flags[key]){s.flags[key]=true;emit(s,'change',message);}}
export function act(s:GameState,a:GameAction):ActionResult {
  if(a.type==='select'){s.selected=a.spell;return result(true);}
  if(a.type==='pause'){
    if(!a.value&&(s.dialogue||s.defeated))return result(false,s.dialogue?'先结束交谈':'先选择重试或撤回');
    s.paused=a.value;if(!a.value&&s.pending){const next=s.pending;s.pending=null;const r=act(s,next);if(!r.ok)emit(s,'invalid',r.message??'待执行动作已不成立');return r;}return result(true);
  }
  if(a.type==='choose')return choose(s,a.choiceId);
  if(a.type==='retry'||a.type==='retreat'){
    if(!s.checkpoint)return result(false,'没有可恢复的落点');const prior=restore(s.checkpoint);const source=s.checkpoint;
    if(a.type==='retreat'){
      const last=clone(s.lastSafe),current=clone(s);current.checkpoint=null;
      // Retreat preserves every settled object, resource and relationship fact, including false values.
      for(const enemy of current.worlds[current.scene].filter(e=>e.kind==='enemy'&&e.state!=='retreated'&&e.state!=='peaceful')){
        const initial=prior.worlds[current.scene].find(e=>e.id===enemy.id);if(initial)Object.assign(enemy,clone(initial));
      }
      Object.assign(prior,current);prior.scene=last.scene;prior.player.x=last.point.x;prior.player.y=last.point.y;prior.lastSafe=last;
      prior.player.pullId=null;prior.player.pullPoint=null;prior.player.hold=0;prior.flags.casting=false;
    }
    Object.assign(s,prior);s.checkpoint=source;s.player.hp=4;s.player.mana=6;s.defeated=false;s.paused=false;s.dialogue=null;s.pending=null;s.projectiles=[];s.player.path=[];emit(s,'restore',a.type==='retry'?'恢复到这处境进入前的完整局面。':'撤回安全落点，已经完成的行路与交谈仍在。');return result(true);
  }
  if(s.defeated)return result(false,'体力耗尽，先重试或撤回安全处');
  if(s.dialogue)return result(false,'先完成眼前的交谈');
  if(s.paused){s.pending=clone(a);return result(true,'已指定待执行动作；恢复时重新检查');}
  if(a.type==='move'){
    if(!finitePoint(a.point))return result(false,'目的地无效');
    if(s.player.pullId&&s.player.hold<=0){if(dist(s.player,a.point)>(s.ringStyle==='long'?500:300)||(!free(s,a.point,12,s.player.pullId)&&!(s.player.pullId==='board'&&dist(a.point,{x:1120,y:648})<45)))return result(false,'牵物落点超出范围或被挡住');s.player.pullPoint={...a.point};return result(true);}
    const path=pathfind(s,a.point);if(!path.length)return result(false,'这里不能安全直达，请沿可见道路分段移动');s.player.path=path;return result(true);
  }
  if(a.type==='interact')return interact(s,a.targetId);
  if(a.type==='rest')return rest(s);
  if(a.type==='heal'){if(s.herbs<1||s.player.hp===4)return result(false,s.herbs<1?'伤药已用完':'体力充足，无须耗药');s.herbs--;s.player.hp=Math.min(4,s.player.hp+2);emit(s,'heal','用了一份伤药，恢复两格体力。');return result(true);}
  if(a.type==='release'){release(s);return result(true);}
  if(a.type==='hold'){
    if(!s.player.pullId)return result(false,'先牵住一件轻物');
    if(s.player.hold>0)return result(false,'这件物已经留势，不能反复续时');
    if(s.ringStyle!=='hold'&&s.flags.trialStyle!=='hold')return result(false,'需要先在工棚选试留势');
    if(s.player.mana<1)return result(false,'留势还需一格灵力');
    const e=entity(s,s.player.pullId)!;s.player.mana--;s.player.hold=8;s.player.pullPoint=null;e.state='held';s.player.path=[];
    if(e.id==='trial'&&s.flags.trialStyle==='hold')trained(s,'hold');
    if(e.id==='platform_beam'&&dist(e,{x:e.homeX!,y:e.homeY!})>45){s.flags.platformOpen=true;emit(s,'change','倾梁停在入口旁。还有八秒，穿过去后可徒手放回程梯。');}
    emit(s,'hold',`${e.name}停住八秒，现在可以另施一术。`,e);return result(true);
  }
  if(a.type==='cast'){
    const p=previewCast(s,a.spell,a.targetId,a.point);if(!p.valid)return result(false,p.reason);
    s.player.mana--;s.player.facing=Math.atan2(a.point.y-s.player.y,a.point.x-s.player.x);s.player.path=[];
    if(a.spell==='pull'){const e=p.target!;s.player.pullId=e.id;s.player.pullPoint={...a.point};s.player.hold=0;e.state='pulled';data(e).startDistance=dist(e,s.player);emit(s,'pull',`灵线牵住${e.name}。点空地改变落点，按「放下」结束。`,e);}
    else if(a.spell==='ward'){s.player.ward=6;s.player.wardFacing=s.player.facing;s.flags.wardCooldown=3;emit(s,'ward','护符在身前张开，侧后仍需留意。',s.player);}
    else{s.flags.casting=true;s.flags.castTime=.5;s.flags.castX=a.point.x;s.flags.castY=a.point.y;s.player.cooldown=1.5;emit(s,'cast','火焰在指前聚拢，半秒后飞出。',s.player);}
    return result(true);
  }
  return result(false,'不能执行这个动作');
}
function moveBody(s:GameState,body:Vec,destination:Vec,speed:number,dt:number,ignoreId?:string){
  const d=dist(body,destination);if(d<.01)return;const amount=Math.min(d,speed*dt),dx=(destination.x-body.x)/d*amount,dy=(destination.y-body.y)/d*amount;
  const next={x:body.x+dx,y:body.y+dy};if(free(s,next,17,ignoreId)){body.x=next.x;body.y=next.y;}else{if(free(s,{x:body.x+dx,y:body.y},17,ignoreId))body.x+=dx;if(free(s,{x:body.x,y:body.y+dy},17,ignoreId))body.y+=dy;}
}
function hurt(s:GameState,source:Vec,reason:string){
  if(s.player.invulnerable>0)return;
  const angle=Math.atan2(source.y-s.player.y,source.x-s.player.x),diff=Math.atan2(Math.sin(angle-s.player.wardFacing),Math.cos(angle-s.player.wardFacing));
  if(s.player.ward>0&&Math.abs(diff)<Math.PI*.42){s.player.ward=0;emit(s,'block','正面的护符承住一次来袭，缺口随光弧散去。',s.player);return;}
  s.player.hp--;s.player.invulnerable=1;emit(s,'hurt',reason,s.player);
  if(s.player.hp<=0){s.defeated=true;s.paused=true;s.player.path=[];s.flags.defeatReason=reason;emit(s,'defeat',`${reason} 可以重试这一处境，或撤回最近安全落点。`);}
}
function enemyTick(s:GameState,e:Entity,dt:number){
  if(e.state==='retreated'||e.state==='peaceful')return;
  const d=data(e),distance=dist(e,s.player),protectedWorkshop=s.scene==='workshop'&&s.player.x>1200,visible=!protectedWorkshop&&distance<300&&clearLine(s,e,s.player);
  if(protectedWorkshop&&e.type==='beast'){e.state='searching';d.lastX=e.homeX!;d.lastY=e.homeY!;d.attack=0;}
  if(visible){d.lastX=s.player.x;d.lastY=s.player.y;d.seen=3;if(e.state==='idle'||e.state==='searching'){e.state='alert';e.timer=1;emit(s,'alert',`${e.name}看见了你的动静。`,e);}}
  else d.seen=Math.max(0,num(e,'seen')-dt);
  if(e.state==='alert'){e.timer=Math.max(0,(e.timer??1)-dt);if(e.timer===0)e.state=visible?'chasing':'searching';return;}
  if(e.state==='idle')return;
  if(!visible&&num(e,'seen')===0){e.state='searching';d.attack=0;}
  const destination={x:num(e,'lastX'),y:num(e,'lastY')};
  if(e.state==='searching'){moveBody(s,e,destination,65,dt,e.id);if(dist(e,destination)<25){e.state='idle';d.seen=0;}return;}
  if(e.type==='beast'){
    const fire=entities(s).find(o=>o.state==='burning'&&dist(o,e)<190);
    if(fire){const away={x:e.x+(e.x-fire.x)*2,y:e.y+(e.y-fire.y)*2};moveBody(s,e,away,125,dt,e.id);d.attack=0;return;}
    if(distance>60)moveBody(s,e,destination,90,dt,e.id);
    else if(visible){d.attack=num(e,'attack')+dt;if(num(e,'attack')>=1.05){d.attack=0;hurt(s,e,'山兽正面扑近，体力少了一格。');}}
  }else{
    if(s.player.ward>0&&distance<240){const angle=Math.atan2(e.y-s.player.y,e.x-s.player.x)+.65;moveBody(s,e,{x:s.player.x+Math.cos(angle)*210,y:s.player.y+Math.sin(angle)*210},90,dt,e.id);}
    else if(distance>240)moveBody(s,e,destination,75,dt,e.id);
    if(visible&&distance<310){d.attack=num(e,'attack')+dt;if(num(e,'attack')>1&&e.state!=='casting'){e.state='casting';emit(s,'warning',`${e.name}抬手聚光；火球命中可以打断。`,e);}if(num(e,'attack')>=2){d.attack=0;e.state='chasing';spawnProjectile(s,e,s.player,'enemy',260);}}
    else d.attack=0;
  }
}
function spawnProjectile(s:GameState,from:Vec,to:Vec,owner:'player'|'enemy',speed:number){const angle=Math.atan2(to.y-from.y,to.x-from.x);const id=Number(s.flags.projectileSeq??0)+1;s.flags.projectileSeq=id;s.projectiles.push({id,x:from.x+Math.cos(angle)*24,y:from.y+Math.sin(angle)*24,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:owner==='player'?.92:1.6,owner});}
function projectileTick(s:GameState,dt:number){
  for(const p of s.projectiles){
    const before={x:p.x,y:p.y};p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
    if(!clearLine(s,before,p)){p.life=0;emit(s,'impact','术法撞在遮挡上，光屑散开。',p);continue;}
    if(p.owner==='player'){
      for(const e of entities(s)){
        if(e.state==='taken'||e.state==='retreated'||dist(p,e)>Math.max(22,Math.min(e.w,e.h)*.6))continue;
        if(e.kind==='enemy'){
          e.hp=Math.max(0,(e.hp??3)-1);data(e).attack=0;data(e).seen=3;data(e).lastX=before.x;data(e).lastY=before.y;e.state=e.hp===0?'retreated':'alert';e.timer=.6;
          // Only a visible caster supplies their location, otherwise search the observed incoming ray.
          if(clearLine(s,e,s.player)){data(e).lastX=s.player.x;data(e).lastY=s.player.y;}
          emit(s,'hit',e.hp===0?`${e.name}退出这场争夺，不再追来。`:`火球命中${e.name}，打断起手，抵抗少一格。`,e);p.life=0;break;
        }
        if(e.flammable&&e.state!=='burned'){e.state='burning';e.timer=12;emit(s,'fire',`${e.name}燃起一小片火，山兽避开这处。`,e);p.life=0;break;}
        if(['board','basket','boat'].includes(e.id)){emit(s,'steam',`${e.name}带着雨水，火球熄成一团白汽。`,e);p.life=0;break;}
      }
      for(const e of entities(s).filter(e=>e.kind==='enemy'&&e.state==='idle'))if(dist(e,p)<260&&clearLine(s,e,p)){e.state='alert';e.timer=1;data(e).seen=3;data(e).lastX=before.x;data(e).lastY=before.y;}
    }else{
      if(dist(p,s.player)<24){hurt(s,{x:p.x-p.vx*.1,y:p.y-p.vy*.1},'飞石从护持未遮住的一侧击中，体力少了一格。');p.life=0;}
      const xu=entities(s).find(e=>e.type==='xu');if(xu&&s.flags.companion==='following'&&dist(p,xu)<24){s.flags.companion='sheltered';data(xu).sheltered=true;emit(s,'relationship','许照被来袭逼退，转到遮蔽处，暂时停下协作。');p.life=0;}
    }
  }
  s.projectiles=s.projectiles.filter(p=>p.life>0);
}
function companionTick(s:GameState,dt:number){
  const xu=entities(s).find(e=>e.type==='xu');if(!xu)return;
  if(s.scene==='creek'&&s.flags.boatCooperating){
    const brace={x:585,y:675};xu.state='helping';moveBody(s,xu,brace,160,dt,xu.id);
    if(dist(xu,brace)<30&&dist(s.player,{x:535,y:640})<145){s.flags.boatCooperating=false;s.flags.boatSecured=true;s.flags.boatShared=true;entity(s,'boat')!.state='secured';emit(s,'relationship',s.profile.origin==='herbalist'?'你指出干燥踏点并稳住绳扣，许照压住船舷，小舟终于稳了。':'许照照着松扣的位置压住船舷，你把绳索绕回去，一起稳住小舟。');}return;
  }
  if(s.flags.companion==='following'){
    if(!safeFromThreat(s,xu,140)||s.projectiles.some(p=>p.owner==='enemy'&&dist(p,xu)<150)){xu.state='waiting';return;}
    const behind={x:s.player.x-Math.cos(s.player.facing)*65,y:s.player.y-Math.sin(s.player.facing)*65};
    if(dist(xu,s.player)>85){
      if(clearLine(s,xu,behind)&&free(s,behind)){moveBody(s,xu,behind,145,dt,xu.id);}
      else {const saved=s.player; s.player={...saved,x:xu.x,y:xu.y};const route=pathfind(s,behind);s.player=saved;if(route.length)moveBody(s,xu,route[0],145,dt,xu.id);}
    }
    xu.state='following';xu.facing=Math.atan2(s.player.y-xu.y,s.player.x-xu.x);
  }else if(s.flags.companion==='refused'||s.flags.companion==='sheltered'){
    xu.state='refused';const wait=s.scene==='creek'?{x:1200,y:590}:s.lastSafe.point;moveBody(s,xu,wait,120,dt,xu.id);
  }else xu.state='waiting';
}
export function tick(s:GameState,dt:number,input:Vec):void {
  if(s.paused||s.dialogue||s.defeated||!Number.isFinite(dt)||dt<=0)return;
  // Small fixed upper steps prevent tunnelling for slow rendering frames.
  let remaining=Math.min(dt,1);while(remaining>1e-8){const step=Math.min(.025,remaining);stepTick(s,step,input);remaining-=step;if(s.paused)break;}
}
function stepTick(s:GameState,dt:number,input:Vec){
  s.time+=dt;const p=s.player;p.invulnerable=Math.max(0,p.invulnerable-dt);p.cooldown=Math.max(0,p.cooldown-dt);p.ward=Math.max(0,p.ward-dt);s.flags.wardCooldown=Math.max(0,Number(s.flags.wardCooldown??0)-dt);
  if(s.flags.casting){s.flags.castTime=Number(s.flags.castTime)-dt;if(Number(s.flags.castTime)<=0){s.flags.casting=false;spawnProjectile(s,p,{x:Number(s.flags.castX),y:Number(s.flags.castY)},'player',420);}}
  if(finitePoint(input)&&(input.x||input.y)){p.path=[];const length=Math.hypot(input.x,input.y);const dest={x:p.x+input.x/length*100,y:p.y+input.y/length*100};p.facing=Math.atan2(input.y,input.x);moveBody(s,p,dest,p.pullId&&p.hold===0?85:160,dt);}
  else if(p.path.length){const target=p.path[0];p.facing=Math.atan2(target.y-p.y,target.x-p.x);moveBody(s,p,target,p.pullId&&p.hold===0?85:160,dt);if(dist(p,target)<3)p.path.shift();}
  if(p.pullId){
    const e=entity(s,p.pullId);
    if(!e){p.pullId=null;p.pullPoint=null;p.hold=0;}
    else if(p.hold>0){p.hold=Math.max(0,p.hold-dt);if(p.hold===0){const beam=e.id==='platform_beam';release(s);if(beam&&!s.flags.platformReturn&&!s.flags.platformLong){if(p.x>1040&&p.x<1120&&p.y>210&&p.y<350){p.x=p.x<1080?1035:1125;hurt(s,e,'留势到期，倾梁落下擦伤了你；已退到安全一侧。');}e.x=e.homeX!;e.y=e.homeY!;}emit(s,'drop','留势到期，物件落稳。',e);}}
    else if(dist(e,p)>(s.ringStyle==='long'||s.flags.trialStyle==='long'?520:320)||!clearLine(s,p,e,e.id)){release(s);emit(s,'hint','灵线因距离或遮挡断开，物件落在当前位置。');}
    else if(p.pullPoint){const destination=p.pullPoint;const d=dist(e,destination);if(d>.5){const amount=Math.min(d,220*dt),next={x:e.x+(destination.x-e.x)/d*amount,y:e.y+(destination.y-e.y)/d*amount};if(clearLine(s,e,next,e.id)){e.x=next.x;e.y=next.y;objectChanged(s,e);}else{release(s);emit(s,'hint','物件碰到实物，已停止牵动。');}}}
  }
  for(const e of entities(s)){
    if(e.state==='burning'){e.timer=Math.max(0,(e.timer??0)-dt);if(e.timer===0)e.state='burned';}
    if(e.kind==='enemy')enemyTick(s,e,dt);
  }
  if(s.scene==='creek'){
    s.flags.rockClock=Math.max(0,Number(s.flags.rockClock??0)-dt);
    if(p.x>1340&&p.x<1430&&p.y>620&&p.y<720&&Number(s.flags.rockClock)===0){const rock=entity(s,'rock_source')!;s.flags.rockClock=4;spawnProjectile(s,rock,{x:p.x,y:p.y},'enemy',220);emit(s,'warning','上方碎石松动，正落向窄段！朝上护持，或退回下方长路。',rock);}
  }
  projectileTick(s,dt);companionTick(s,dt);
  if(s.scene==='creek'&&inPlatform(p))platformVisit(s);
}
export function objective(s:GameState):string {
  if(s.defeated)return '观察来袭方向，重试这处境或撤回安全落点';
  if(s.ended)return '灯下已安顿好；仍可在走过的地方散步试术';
  if(s.flags.returned)return '和熟悉的人说说话，再到自己的桌边放环或摊图';
  if(s.flags.route)return '沿亲自走通的路，返回回石驿';
  if(s.scene==='home')return '帮陶七安灯，走溪道取回自己的引环';
  if(!s.flags.tools)return '稳住浅滩小舟，取回自己的器具袋';
  if(!s.flags.ringOwned)return '沿林路或上方小径进入旧工棚，取回引环';
  if(!s.flags.ringTrained)return '与陶七选一种用法，亲手在试架上试稳';
  if(s.scene==='creek')return '旧眺台有了新走法；也可直接去石渡试路';
  if(s.scene==='crossing')return s.flags.gateOpen?'低滩已露出，亲自走到彼岸路碑':s.flags.ridgeOpen?'绳梯已经放下，亲自走到山脊石标':'观察闸口与高处绳梯，选自己能走通的办法';
  return '带着试稳的引环，回溪道再去石渡';
}
export function snapshot(s:GameState):string{return JSON.stringify(s);}
export function restore(json:string):GameState {
  if(typeof json!=='string'||json.length>2_000_000)throw Error('存档过大或格式无效');
  let s:GameState;try{s=JSON.parse(json);}catch{throw Error('存档不是有效的 JSON');}
  const scenes=['home','creek','workshop','crossing'];
  if(!s||s.schema!==1||s.revision!=='return-stone-v1'||!scenes.includes(s.scene)||!s.profile||!['herbalist','tinker'].includes(s.profile.origin)||!['stay','travel'].includes(s.profile.wish)||typeof s.profile.name!=='string'||![0,1].includes(s.profile.appearance)||!s.player||!finitePoint(s.player)||!Number.isFinite(s.time)||s.time<0||!Number.isInteger(s.player.hp)||s.player.hp<0||s.player.hp>4||!Number.isInteger(s.player.mana)||s.player.mana<0||s.player.mana>6||!Array.isArray(s.player.path)||!s.player.path.every(finitePoint)||!s.worlds||!s.flags||Array.isArray(s.flags)||!Array.isArray(s.events)||!Array.isArray(s.projectiles)||!s.lastSafe||!scenes.includes(s.lastSafe.scene)||!finitePoint(s.lastSafe.point)||!['long','hold',null].includes(s.ringStyle)||!Number.isInteger(s.herbs)||s.herbs<0||s.herbs>2||typeof s.paused!=='boolean'||typeof s.ended!=='boolean'||typeof s.defeated!=='boolean')throw Error('存档版本或世界数据不匹配');
  for(const id of scenes as SceneId[]){
    const list=s.worlds[id];if(!Array.isArray(list)||list.length!==SCENES[id].entities.length)throw Error('存档缺少场景器物');
    const ids=new Set<string>();for(const e of list){if(!e||!finitePoint(e)||typeof e.id!=='string'||ids.has(e.id)||!SCENES[id].entities.some(n=>n.id===e.id)||typeof e.state!=='string')throw Error('存档器物数据无效');ids.add(e.id);}
  }
  if(!['pull','flame','ward'].includes(s.selected)||Object.values(s.flags).some(v=>!['boolean','string','number'].includes(typeof v)||(typeof v==='number'&&!Number.isFinite(v))))throw Error('存档标记数据无效');
  if(s.pending&&!validAction(s.pending))throw Error('存档待执行动作无效');
  if(s.events.some(e=>!e||!Number.isFinite(e.seq)||!Number.isFinite(e.time)||typeof e.text!=='string'||typeof e.type!=='string'))throw Error('存档事件数据无效');
  if(s.projectiles.some(p=>!finitePoint(p)||!Number.isFinite(p.vx)||!Number.isFinite(p.vy)||!Number.isFinite(p.life)||!['player','enemy'].includes(p.owner)))throw Error('存档投射物数据无效');
  if(s.dialogue&&(!Array.isArray(s.dialogue.choices)||typeof s.dialogue.text!=='string'))throw Error('存档对话无效');
  if(s.checkpoint!==null&&typeof s.checkpoint!=='string')throw Error('存档恢复点无效');
  for(const key of ['facing','invulnerable','cooldown','ward','wardFacing','hold']as const)if(!Number.isFinite(s.player[key]))throw Error('存档术法状态无效');
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
    default:return ['release','hold','rest','heal','retry','retreat'].includes(a.type);
  }
}

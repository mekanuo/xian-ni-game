import type { Entity, GameState, Vec } from './contracts';

export interface EncounterView { id: string; title: string; fact: string; options: string[] }

export function lifeObjective(s: GameState): string | undefined {
  if (!s.life || !['stay','travel'].includes(String(s.flags.endingWish))) return undefined;
  const r=s.life.repair,h=s.life.harvest;
  if (r.stage!=='complete') {
    if (r.stage==='unaccepted') return '陶七和许照各有一件小事等你帮忙。';
    if (!r.softened) return '把挂扣装到炉芯，用火焰软开旧胶。';
    if (!r.latched) return '把活动钳口校到刻线，再用留势或止挡压紧。';
    if (!r.tested) return '近身试压挂扣，确认它真的承得住。';
    return '回石驿把试压通过的挂扣交还陶七。';
  }
  if (h.stage!=='complete') {
    if (h.stage==='unaccepted') return '问许照要不要给晒架添两束路用叶。';
    if (h.sun==='unpicked'||h.shade==='unpicked') return '沿溪道采回向阳叶和背阴叶，各留一束根。';
    if (h.sun==='bag'||h.shade==='bag') return '回晒药架，把两束叶分到对应的上下层。';
    return '回晒药架交付分拣好的叶片，收好两份避兽药囊。';
  }
  return '手艺与行囊已经备好；可继续试术，或在桌边歇一歇。';
}

function lifeDescription(s: GameState, e: Entity): string | undefined {
  const l=s.life;if(!l)return undefined;
  const r=l.repair,h=l.harvest;
  switch(e.id){
    case 'life_hearth': return r.stage==='unaccepted'?'炉芯还没有任务用途':r.softened?'旧胶已经软开，活动钳口可以校直':'把挂扣装进炉芯，再用火焰命中引火芯';
    case 'life_jaw': return r.latched?'钳口已压紧，去压柄试承重':r.softened?'沿刻线把钳口牵到右侧，再用止挡或留势承住':'旧胶未软，先处理炉芯';
    case 'life_press': return r.tested?'挂扣已通过试压':r.latched?'近身按压一息，确认挂扣承重':'钳口尚未压紧，不能试压';
    case 'life_sun_leaf': return h.sun==='unpicked'?'向阳石边的一束嫩叶；剪上部，别拔根':h.sun==='bag'?'向阳叶在器具袋中，回晒架分层':'向阳叶已放在晒架上';
    case 'life_shade_leaf': return h.shade==='unpicked'?'背阴窄段的一束叶；东侧干路可以安全靠近':h.shade==='bag'?'背阴叶在器具袋中，回晒架分层':'背阴叶已放在晒架上';
    case 'life_home_eye': return l.clamp==='home'?'压扣固定在工位试件上':'工位的金属固定眼';
    case 'life_practice': return l.clamp==='home'?'试件被压扣承住，可安全取回':'把物件移到固定眼再试压扣';
    case 'life_lookout_eye': return l.clamp==='lookout'?'压扣承住倾梁，入口保持打开':'倾梁侧托的金属固定眼';
    case 'life_scent': return l.scent?'药囊气味还会令附近山兽绕行片刻':'已经散尽的药囊布片';
    default:return undefined;
  }
}

const distance = (a: Vec,b: Vec) => Math.hypot(a.x-b.x,a.y-b.y);
const object = (s: GameState,id: string) => s.worlds[s.scene].find(e=>e.id===id);
const style = (s: GameState) => s.flags.trialStyle || s.ringStyle;
const onPlatform = (p: Vec) => p.x>1110&&p.x<1500&&p.y>100&&p.y<315;
const view = (id: string,title: string,fact: string,...options: string[]): EncounterView => ({id,title,fact,options});

function rainShelter(s: GameState): EncounterView {
  const f=s.flags;
  if(f.herbsWet) return f.boardReturned
    ? view('rain-shelter','棚下水线','导水板已归位，药草仍受潮；许照暂未继续同行。','到雨棚一起整理药草')
    : view('rain-shelter','棚下水线','导水板移开后，水落进药筐；受潮药草还可补救。','先把导水板放回原处','再到雨棚一起晾药');
  if(f.shelterBridge)return view('rain-shelter','棚下近路','导水板已搭成近路，药筐没有再受淋。','沿板上的干地穿过水线','也可沿下方长路绕行');
  if(f.herbsRepaired)return view('rain-shelter','棚下晾药','受潮的药草已晾好；再借板前仍需留意药筐的位置。',f.basketSafe?'药筐在棚内，可以借板搭近路':'先将药筐牵进棚内干处','沿下方长路也能绕行');
  return f.basketSafe
    ? view('rain-shelter','棚下水线','药筐已在棚内干处，借走导水板不会再淋湿它。','牵导水板搭过眼前水线','在雨棚包扎或招呼同行')
    : view('rain-shelter','棚下水线','导水板下方就是药筐；借板会让水线直落筐中。','先牵药筐到右侧棚内，再借板','沿下方长路绕行，不必借板');
}

function lookout(s: GameState): EncounterView {
  const f=s.flags;
  if(f.platformReturn)return view('lookout','旧眺台','回程梯已经放稳，进出不耗灵力。',f.chime?'沿石边辨认采药记号':'到旧檐下察看风铃','沿入口回到溪道');
  if(onPlatform(s.player))return view('lookout','旧眺台',f.platformOpen&&!f.platformLong?'倾梁暂时悬停，退路还没有固定。':'你已登上眺台，入口旁有徒手可放的回程梯。','先放下回程梯，不耗灵力','再察看风铃和石边记号');
  if(f.platformLong)return view('lookout','眺台入口','绳梯已搭到入口外，石地通向台内。','沿入口登台，放下回程梯');
  if(f.platformOpen)return view('lookout','眺台入口','倾梁留势只维持八秒，停稳后才能腾手通过。','穿过入口，徒手放下回程梯');
  if(style(s)==='long')return view('lookout','眺台入口','远处绳梯可牵到入口外；台内另有回程梯。','用长牵把绳梯牵到西侧石地','登台后徒手放下回程梯');
  if(style(s)==='hold')return view('lookout','眺台入口','倾梁堵住入口；将它移到一旁，留势可腾手通行。','牵开倾梁并留势，趁八秒穿过','登台后徒手放下回程梯');
  return view('lookout','眺台入口','倾梁挡着入口，绳梯在远处；眼下的引力术不够稳。','去旧工棚取环，亲试长牵或留势');
}

function training(s: GameState): EncounterView {
  if(!s.flags.ringOwned)return view('ring-training','旧工棚试架','台上引环还系着你的旧绳，试环木块就在一旁。','先取回引环，再与陶七选练法');
  if(s.flags.trialStyle==='long')return view('ring-training','长牵试架','这次要从六步之外，把试环木块实际牵近。','站到西侧试环印，牵近木块后放下');
  if(s.flags.trialStyle==='hold')return view('ring-training','留势试架','这次要让木块离手停住；留势还需一格灵力。','走近牵住木块，再按留势');
  if(s.flags.ringTrained)return view('ring-training','试环已稳',`你已亲试${s.ringStyle==='long'?'长牵，牵物可达十步':'留势，物件可离手停住八秒'}。`,'可与陶七重试另一种练法','静息后继续去石渡');
  return view('ring-training','旧工棚试架','引环已回到手中，还没有亲手试稳练法。','与陶七选长牵或留势，再动手试环');
}

function beasts(s: GameState): EncounterView {
  const active=s.worlds[s.scene].some(e=>e.type==='beast'&&e.state!=='retreated');
  if(!active)return view('forest-beasts','林路空地','眼前山兽已退开，林路恢复通行。','沿林路去旧工棚');
  const decoy=object(s,'decoy'),straw=object(s,'straw');
  if(straw?.state==='burning')return view('forest-beasts','林路火边','干草正在燃烧，山兽避开这一处；火势会熄。','留意山兽位置，从火边空隙走过','也可沿上方小径绕行');
  if(straw?.state==='burned')return view('forest-beasts','林路山兽','干草已经烧尽，山兽仍在附近。',decoy?.data?.noiseUsed?'留意山兽来向，用护符护住前方':'把空筐牵到远处放下，试着引开山兽','也可沿上方小径绕行');
  if(decoy?.data?.noiseUsed)return view('forest-beasts','林路山兽','木筐已落过一次，不能再靠它的声响引开山兽。','可用火焰点燃干草，让山兽避开','也可沿上方小径绕行');
  return view('forest-beasts','林路山兽','空筐落地能引来声响，上方另有绕行小径。','把空筐牵到远处放下，试着引开山兽','也可沿上方小径绕开山兽');
}

function companionFact(s: GameState): string {
  if(s.flags.companion==='following'&&s.worlds[s.scene].some(e=>e.type==='xu'&&distance(e,s.player)<150))return '许照就在身旁，可一起辨路。';
  if(s.flags.companion==='refused'||s.flags.companion==='sheltered')return '同行暂时中断，可在安全处重新商量。';
  return '';
}

function crossing(s: GameState,ridge: boolean): EncounterView {
  const f=s.flags,withCompanion=(text:string)=>text+companionFact(s);
  if(ridge){
    if(f.ridgeUsed)return view('crossing-ridge','山脊绕路',withCompanion('你已亲自走过山脊；木车仍需低滩通路。'),'沿山脊原路返回');
    if(f.ridgeOpen)return view('crossing-ridge','山脊绕路',withCompanion('绳梯已经放下，还需亲自走到彼端石标。'),'沿山脊到石标辨路','松石落下时，向上护持或避到两旁');
    return view('crossing-ridge','高处绳梯',withCompanion('旧绳梯垂在高处，西岸干地可承接梯端。'),'将绳梯牵到西侧山脊干地','走通后到彼端石标辨路');
  }
  if(f.mainTraversed)return view('crossing-gate','主渡低滩',withCompanion('你已亲自走过修通的主渡，归路仍在脚下。'),'沿低滩原路返驿');
  if(f.gateOpen)return view('crossing-gate','主渡低滩',withCompanion('木楔已卡稳，低滩已经露出；你还未走到彼岸路碑。'),'沿露出的低滩走到彼岸路碑');
  if(f.gateWedge)return view('crossing-gate','闸口固定桩',withCompanion('木楔已经安好，牵开闸扣后可卡住回弹。'),'将闸扣牵向下方干地，实际排水');
  if(f.deal)return view('crossing-gate','闸前约定',withCompanion('散修已让出施术位置；主渡尚未修通。'),'在固定桩安楔，再牵开闸扣','也可牵闸留势，腾手安楔');
  if(f.gateDemonstrated)return view('crossing-gate','排水示范',withCompanion('在场散修先前看见排水；无楔的闸扣仍会回弹。'),'到石上留话处商量疏水换通行','在固定桩安楔，再牵闸修路');
  return view('crossing-gate','闸口与低滩',withCompanion('闸槽尚好；牵开能排水，无楔松手会回弹。'),'先牵闸示范排水，再近处商量','或先在固定桩安楔，再牵开闸扣');
}

/** Only local, observable circumstances; never changes progress or issues actions. */
export function nearbyEncounter(s: GameState): EncounterView|undefined {
  const near=(ids:string[],radius:number)=>s.worlds[s.scene].filter(e=>ids.includes(e.id)).some(e=>distance(s.player,e)<=radius);
  if(s.scene==='home'&&near(['lamp_stand'],280))return s.flags.lampFixed
    ? view('home-lamp','灯下归处','灯盏已经归架，暖光照着熟悉的院子。',s.flags.returned?'到自己的桌边放环或摊图':!s.flags.tools?'沿溪道取回自己的器具袋':!s.flags.ringOwned?'去旧工棚取回自己的引环':!s.flags.ringTrained?'回旧工棚，与陶七亲手试环':'沿溪道去石渡，用引环试路')
    : view('home-lamp','松脱的灯盏','陶七扶着灯架，灯盏落在一旁。','选牵引，牵灯盏到架旁落点','到位后按放下');
  if(s.scene==='home'&&s.life&&['stay','travel'].includes(String(s.flags.endingWish))){
    const ids=['life_home_eye','life_practice'];
    if(near(ids,220))return view('life-home','工位固定眼',lifeDescription(s,s.worlds.home.find(e=>ids.includes(e.id))!)||'压扣与试件的用途仍在记录中','察看压扣承物','回桌边听陶七和许照的安排');
  }
  if(s.scene==='creek'){
    if(near(['platform_beam','platform_ladder','return_ladder','chime','marks'],180))return lookout(s);
    if(near(['life_sun_leaf','life_shade_leaf'],150)){
      const e=s.worlds.creek.find(e=>e.id.startsWith('life_')&&distance(s.player,e)<=150);
      if(e)return view('life-leaf',e.name,lifeDescription(s,e)||'叶片仍在枝上','走近剪取一束叶','沿安全侧靠近');
    }
    if(near(['board','basket','shelter'],235))return rainShelter(s);
  }
  if(s.scene==='workshop'){
    if(s.life?.repair.stage!=='unaccepted'&&near(['life_hearth','life_jaw','life_press'],220)){
      const e=s.worlds.workshop.find(e=>e.id.startsWith('life_')&&e.id!=='life_scent'&&distance(s.player,e)<=220);
      if(e)return view('life-repair',e.name,lifeDescription(s,e)||'挂扣修器工序','察看当前工序','回驿交还挂扣');
    }
    if(near(['tao_work','trial','ring','trial_mark'],210))return training(s);
    if(near(['decoy','straw','beast_a','beast_b'],250))return beasts(s);
  }
  if(s.scene==='crossing'){
    if(near(['ridge_rope','ridge_marker'],300))return crossing(s,true);
    if(near(['negotiator','gate','gate_slot','far_bank'],290))return crossing(s,false);
  }
  return undefined;
}

export function inspectObject(s: GameState,e: Entity): string {
  const lifeText=lifeDescription(s,e);if(lifeText!==undefined)return lifeText;
  const f=s.flags;
  switch(e.id){
    case 'lamp':case 'lamp_stand':return f.lampFixed?'灯盏已归架，暖光照着院子':'牵灯盏到灯架旁，再放下';
    case 'basket':return f.herbsWet?'药草受潮；放回导水板后，到雨棚一起整理':f.basketSafe?'药筐在棚内干处，借板也不会淋湿':f.herbsRepaired?'药草已晾好；借板前先把筐移进棚内':'水线下的干药筐；先牵到右侧棚内';
    case 'board':return f.shelterBridge?'导水板已经搭稳，可沿板跨过水线':f.boardReturned?'导水板已归位，水线重新绕开药筐':f.herbsWet?'将板牵回原处，才能在雨棚晾药':f.basketSafe?'药筐已避水，可借板搭近路':e.hint||'';
    case 'shelter':return f.herbsWet?(f.boardReturned?'导水板已归位，可以一起整理受潮药草':'先归还导水板，再整理受潮药草'):'可在棚内包扎、晾药或招呼同行';
    case 'bag':return f.tools?'器具袋已收回，扳钳与绳束齐全':f.boatSecured?'小舟已经稳住，可以取下器具袋':e.hint||'';
    case 'boat':case 'rope':return f.boatSecured?'小舟已经稳住，器具袋可以安全取下':e.hint||'';
    case 'platform_ladder':return f.platformLong?'绳梯已搭到入口，沿石地即可登台':e.hint||'';
    case 'platform_beam':return f.platformReturn?'回程梯已放稳，不必再留势撑开入口':s.player.pullId===e.id&&s.player.hold>0?'倾梁暂时悬停，趁留势穿过并放下回程梯':e.hint||'';
    case 'return_ladder':return f.platformReturn?'回程梯已放稳，零灵力也能出入':e.hint||'';
    case 'trial':case 'trial_mark':return s.flags.trialStyle==='long'?'从六步外牵近木块；西侧试环印可站稳':s.flags.trialStyle==='hold'?'走近牵住木块，再留势让它离手悬停':f.ringTrained?'已试稳引环；可与陶七重试另一种练法':e.hint||'';
    case 'gate':return f.gateOpen?'闸口已固定，低滩已经露出':f.gateWedge?'木楔已安好，把闸扣牵开即可卡稳':f.gateDemonstrated?'排水示范已被看见；无楔松手仍会回弹':e.hint||'';
    case 'gate_slot':return f.gateOpen?'木楔已经卡稳闸口，无须重复修理':f.gateWedge?'木楔已安好，继续牵开闸扣':'带器具安楔；正牵闸时需先留势腾手';
    case 'ridge_rope':return f.ridgeOpen?'绳梯已放下，可沿高处绕行':e.hint||'';
    case 'far_bank':return f.mainTraversed?'你已在这里辨明主渡；可沿原路返驿':f.gateOpen?'亲自走过低滩，在路碑旁辨路':e.hint||'';
    case 'decoy':return e.data?.noiseUsed?'木筐已经响过一次，山兽不会再次循声过来':e.hint||'';
    case 'straw':return e.state==='burning'?'干草正在燃烧，山兽暂时避开这里':e.state==='burned'?'干草已经烧尽，不能再次点燃':e.hint||'';
    default:return e.hint||'';
  }
}

/** Suggested purpose locations, not permission to place: the model still validates each move. */
export function placementAnchors(s: GameState): Array<Vec & {id:string;title:string}> {
  const id=s.player.pullId;
  if(!id||s.player.hold>0||!object(s,id)?.movable)return [];
  switch(id){
    case 'life_jaw':return s.life?.repair.softened && !s.life.repair.latched ? [{id:'life-jaw-rail',title:'钳口右侧刻线',x:1420,y:570}] : [];
    case 'life_practice':return s.life?.clamp==='bag' ? [{id:'life-home-eye',title:'工位固定眼',x:1030,y:500}] : [];
    case 'lamp':return s.flags.lampFixed?[]:[{id:'lamp-stand',title:'灯架旁',x:560,y:665}];
    case 'basket':return [{id:'basket-shelter',title:'棚内干处',x:1180,y:520}];
    case 'board':return [{id:'board-bridge',title:'跨水落板处',x:1120,y:648},{id:'board-home',title:'导水板原位',x:945,y:510}];
    case 'platform_ladder':return [{id:'lookout-entrance',title:'入口石地',x:1010,y:290}];
    case 'platform_beam':return [{id:'beam-side',title:'移梁留势处',x:980,y:285}];
    case 'gate':return s.flags.gateOpen?[]:[{id:'gate-drain',title:'牵闸排水处',x:1030,y:750}];
    case 'ridge_rope':return [{id:'ridge-bank',title:'西岸搭梯处',x:800,y:180}];
    default:return [];
  }
}

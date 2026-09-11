/// <reference types="vite/client" />
import {describe,it,expect} from 'vitest';
import oldComplete from '../qa/fixtures/return-journey-v0.5.0.json?raw';
import oldV5 from '../qa/fixtures/return-main-v0.6.0.json?raw';
import {restore,snapshot,migrateSave} from '../src/game/save';
import {act,tick,createGame} from '../src/game/model';
import type {Entity,GameState} from '../src/game/contracts';
const fixtures=import.meta.glob('../qa/fixtures/*.json',{eager:true,query:'?raw',import:'default'}) as Record<string,string>;
const passages=()=>({public:{westToEast:false,eastToWest:false},private:{westToEast:false,eastToWest:false}});
const empty=()=>({exchanged:false,visit:null,through:passages(),reported:passages()});
const round=(s:GameState)=>restore(snapshot(s));
const current=()=>restore(oldComplete);
const entity=(s:GameState,id:string)=>s.worlds.market.find(e=>e.id===id)!;
// Synthetic decoder boundaries use genuine delivered old exports. They prove
// schema consistency, never that the player performed these routes or talks.
function inside(){const s=current();s.scene='market';s.flags.visited_market=true;s.flags.companion='waiting';s.market.visit={entry:'crossing',transit:null,passed:passages()};Object.assign(s.player,{x:360,y:760,path:[],pullId:null,pullPoint:null,hold:0});return s;}
function exchanged(){const s=inside();s.market.exchanged=true;s.kiln.visited=true;s.kiln.crossed.east=true;return s;}
function open(){const s=exchanged();Object.assign(entity(s,'market_door'),{state:'open',solid:false});return s;}

describe('market v6 immutable source migration',()=>{
 for(const [path,raw] of Object.entries(fixtures))it(`migrates ${path} and independent checkpoint without inventing facts`,()=>{
  const previous=JSON.parse(raw),s=restore(raw);
  const pairs=[[s,previous],...(previous.checkpoint?[[JSON.parse(s.checkpoint!),JSON.parse(previous.checkpoint)]]:[])];
  for(const [next,old] of pairs){
   expect(next.contentVersion).toBe(7);expect(Object.keys(next.worlds).sort()).toEqual(['canal','creek','crossing','home','kiln','market','spar','workshop']);expect(next.market).toEqual(empty());
   for(const key of ['player','flags','profile','time','herbs','paused','pending','dialogue','projectiles','lastSafe'])expect(next[key]).toEqual(old[key]);
   for(const key of ['life','canal','journey','kiln'])if(old[key])expect(next[key]).toEqual(old[key]);
   for(const [scene,list] of Object.entries(old.worlds))for(const e of list as Entity[])expect(next.worlds[scene].find((n:Entity)=>n.id===e.id)).toEqual(e);
   expect(entity(next,'xu_market').state).toBe('hidden');expect(entity(next,'market_merchant')).toMatchObject({x:470,y:380,state:'idle'});expect(entity(next,'market_door')).toMatchObject({state:'closed',solid:true});
  }
  expect(migrateSave(snapshot(s))).toBe(snapshot(s));
 });
 for(const version of [undefined,2,3,4,5])for(const defect of ['ledger','map','entry','xu','scene','safe','visited-flag','market-flag'])it(`rejects v${version??'implicit1'} contaminated by ${defect}`,()=>{
  const raw=Object.values(fixtures).find(raw=>JSON.parse(raw).contentVersion===version)!;const s=JSON.parse(raw);
  if(defect==='ledger')s.market=empty();if(defect==='map')s.worlds.market=[];if(defect==='entry')s.worlds.crossing.push({...s.worlds.crossing[0],id:'crossing_to_market'});if(defect==='xu')s.worlds.home.push({...s.worlds.home[0],id:'xu_market'});if(defect==='scene')s.scene='market';if(defect==='safe')s.lastSafe.scene='market';if(defect==='visited-flag')s.flags.visited_market=true;if(defect==='market-flag')s.flags.market_exchanged=true;
  expect(()=>restore(JSON.stringify(s))).toThrow();
 });
 for(const version of [0,1,8,'6',null])it(`rejects unsupported ${String(version)}`,()=>{const s=JSON.parse(oldV5);s.contentVersion=version;expect(()=>restore(JSON.stringify(s))).toThrow();});
 it('keeps new outer facts independent of an old checkpoint',()=>{const s=open();s.checkpoint=JSON.parse(oldV5).checkpoint;const r=round(s);expect(r.market).toEqual(s.market);expect(JSON.parse(r.checkpoint!).market).toEqual(empty());});
 it('allows an independently valid current v7 checkpoint in a v5 outer world',()=>{const s=JSON.parse(oldV5),nested=open();nested.checkpoint=null;s.checkpoint=snapshot(nested);const r=restore(JSON.stringify(s));expect(r.market).toEqual(empty());expect(JSON.parse(r.checkpoint!).market).toEqual(nested.market);});
 it('rejects malformed market in nested checkpoint',()=>{const s=current(),nested=inside();nested.market.visit=null;nested.checkpoint=null;s.checkpoint=snapshot(nested);expect(()=>round(s)).toThrow();});
 it('rejects a second nested checkpoint',()=>{const s=current();s.checkpoint=snapshot(inside());expect(()=>round(s)).toThrow();});
});

describe('market ledger and manifest boundaries',()=>{
 for(const defect of ['missing-ledger','extra-ledger','missing-map','extra-map','missing-entity','duplicate','extra-entity','visit-missing','visit-outside','visit-entry','transit-route','transit-from','passed-type','extra-route','extra-direction','reported-unearned','before-journey','market-safe','hidden-entry','wrong-entry-target','wrong-entry-spawn','wrong-entry-position'])it(`rejects ${defect}`,()=>{
  const s=inside();
  if(defect==='missing-ledger')delete (s as Partial<GameState>).market;if(defect==='extra-ledger')Object.assign(s.market,{reward:true});if(defect==='missing-map')delete (s.worlds as Partial<GameState['worlds']>).market;if(defect==='extra-map')Object.assign(s.worlds,{extra:[]});if(defect==='missing-entity')s.worlds.market.pop();if(defect==='duplicate')s.worlds.market.push({...entity(s,'market_door')});if(defect==='extra-entity')s.worlds.market.push({...entity(s,'market_door'),id:'fake'});
  if(defect==='visit-missing')s.market.visit=null;if(defect==='visit-outside')s.scene='home';if(defect==='visit-entry')Object.assign(s.market.visit!,{entry:'kiln'});if(defect==='transit-route')Object.assign(s.market.visit!,{transit:{route:'roof',from:'west'}});if(defect==='transit-from')Object.assign(s.market.visit!,{transit:{route:'public',from:'north'}});if(defect==='passed-type')Object.assign(s.market.visit!.passed.public,{westToEast:1});if(defect==='extra-route')Object.assign(s.market.through,{roof:passages().public});if(defect==='extra-direction')Object.assign(s.market.reported.public,{north:true});if(defect==='reported-unearned')s.market.reported.private.eastToWest=true;
  if(defect==='before-journey'){s.journey.stage='ready';s.journey.recordedShared=false;}if(defect==='market-safe')s.lastSafe={scene:'market',point:{x:240,y:760}};
  const entry=s.worlds.crossing.find(e=>e.id==='crossing_to_market')!;
  if(defect==='hidden-entry')entry.state='hidden';if(defect==='wrong-entry-target')entry.targetScene='home';if(defect==='wrong-entry-spawn')entry.targetSpawn={x:500,y:500};if(defect==='wrong-entry-position')entry.x+=10;
  expect(()=>round(s)).toThrow();
 });
 it('keeps direction bits separate without crediting the opposite direction',()=>{const s=open();s.market.visit!.entry='canal';s.market.visit!.transit={route:'public',from:'east'};s.market.visit!.passed.public.eastToWest=true;s.market.through.private.westToEast=true;s.market.reported.private.westToEast=true;expect(round(s).market).toEqual(s.market);expect(round(s).market.through.public.eastToWest).toBe(false);});
 it('does not allow a market safe point to bypass an unaccepted old canal',()=>{const s=restore(oldV5);s.lastSafe={scene:'canal',point:{x:300,y:350}};expect(s.canal.stage).toBe('unaccepted');expect(()=>round(s)).toThrow();});
});

describe('market merchant, door and companion physical states',()=>{
 for(const [x,y,state] of [[470,380,'idle'],[545,410,'leading'],[610,436,'waiting']] as const)it(`preserves closed-door diagonal merchant ${x},${y}`,()=>{const s=exchanged();Object.assign(entity(s,'market_merchant'),{x,y,state});expect(round(s).worlds.market).toEqual(s.worlds.market);});
 for(const [x,y] of [[614,437.6],[614,420],[560,405],[470,395],[470,380]])it(`preserves open-door actual return segment ${x},${y}`,()=>{const s=open();Object.assign(entity(s,'market_merchant'),{x,y,state:'waiting'});expect(round(s).worlds.market).toEqual(s.worlds.market);});
 for(const defect of ['closed-not-solid','open-solid','open-unexchanged','unexchanged-away','closed-off-line','npc-wall','open-impossible-turn','npc-invalid-state','door-moved','xu-outside-following','xu-invalid-state','xu-wall'])it(`rejects ${defect}`,()=>{
  const s=exchanged(),npc=entity(s,'market_merchant'),door=entity(s,'market_door'),xu=entity(s,'xu_market');
  if(defect==='closed-not-solid')door.solid=false;if(defect==='open-solid')door.state='open';if(defect==='open-unexchanged'){s.market.exchanged=false;door.state='open';door.solid=false;}if(defect==='unexchanged-away'){s.market.exchanged=false;npc.x=480;}if(defect==='closed-off-line')Object.assign(npc,{x:545,y:440});if(defect==='npc-wall')Object.assign(npc,{x:600,y:200});if(defect==='open-impossible-turn'){Object.assign(door,{state:'open',solid:false});Object.assign(npc,{x:540,y:430});}if(defect==='npc-invalid-state')npc.state='complete';if(defect==='door-moved')door.y+=8;
  if(defect==='xu-outside-following'){s.scene='home';s.market.visit=null;xu.state='waiting';s.flags.companion='following';}if(defect==='xu-invalid-state')xu.state='complete';if(defect==='xu-wall')Object.assign(xu,{state:'waiting',x:600,y:200});expect(()=>round(s)).toThrow();
 });
 it('retains a waiting companion at actual feet outside the active scene',()=>{const s=open();s.scene='home';s.market.visit=null;s.flags.companion='waiting';Object.assign(entity(s,'xu_market'),{state:'waiting',x:420,y:680,facing:1.2});const r=round(s);expect(entity(r,'xu_market')).toEqual(entity(s,'xu_market'));expect(r.flags).toEqual(s.flags);});
 it('preserves paused ongoing motion, waiting input and projectiles without opening the door',()=>{const s=exchanged();Object.assign(entity(s,'market_merchant'),{x:545,y:410,state:'leading'});s.paused=true;s.player.path=[{x:480,y:760}];s.pending={type:'interact',targetId:'market_entry'};s.projectiles=[{id:40,x:900,y:650,vx:-200,vy:0,life:.7,owner:'enemy'}];expect(round(s)).toEqual(s);});
});

describe('market history cannot bypass prerequisites',()=>{
 for(const defect of ['exchange-no-source','history-no-visit','private-closed','inside-unvisited','xu-unvisited','visit-extra','passage-missing','future-safe'])it(`rejects ${defect}`,()=>{
  const s=exchanged();
  if(defect==='exchange-no-source')s.kiln.crossed.east=false;
  if(defect==='history-no-visit'){s.scene='home';s.market.visit=null;delete s.flags.visited_market;s.market.through.public.westToEast=true;}
  if(defect==='private-closed')s.market.visit!.passed.private.westToEast=true;
  if(defect==='inside-unvisited')delete s.flags.visited_market;
  if(defect==='xu-unvisited'){s.scene='home';s.market.visit=null;s.market.exchanged=false;delete s.flags.visited_market;entity(s,'xu_market').state='waiting';}
  if(defect==='visit-extra')Object.assign(s.market.visit!,{complete:true});
  if(defect==='passage-missing')delete (s.market.through.public as Partial<typeof s.market.through.public>).eastToWest;
  if(defect==='future-safe')s.lastSafe={scene:'market',point:{x:470,y:380}};
  expect(()=>round(s)).toThrow();
 });
});

describe('market companion representation',()=>{
 it('rejects invisible following inside the market',()=>{const s=inside();s.flags.companion='following';expect(()=>round(s)).toThrow();});
 for(const relation of ['waiting','refused','sheltered'])it(`preserves actual ${relation} feet without using another map safe point`,()=>{const s=inside();s.flags.companion=relation;Object.assign(entity(s,'xu_market'),{state:relation==='waiting'?'waiting':'refused',x:420,y:680});expect(entity(round(s),'xu_market')).toEqual(entity(s,'xu_market'));});
 it('allows a visible companion to pause for danger while global agreement remains following',()=>{const s=inside();s.flags.companion='following';Object.assign(entity(s,'xu_market'),{state:'waiting',x:420,y:680});expect(round(s).flags.companion).toBe('following');});
});

// The old-map staging position, message history and hold specialization are
// explicit synthetic prerequisites; resource recovery uses the real home rest.
// Entry, exchange, motion, pause, hold, release and checkpoints below use act/tick.
function enterForReplay(holdStyle=false){
 const s=current();s.paused=false;s.dialogue=null;s.pending=null;
 walkReplay(s,340,850);expect(act(s,{type:'rest'}).ok).toBe(true);
 if(holdStyle)s.ringStyle='hold';
 s.scene='crossing';s.paused=false;s.dialogue=null;s.pending=null;s.flags.companion='waiting';s.kiln.visited=true;s.kiln.crossed.east=true;
 Object.assign(s.player,{x:1640,y:610,path:[],pullId:null,pullPoint:null,hold:0});
 expect(round(s)).toEqual(s);
 expect(act(s,{type:'interact',targetId:'crossing_to_market'}).ok).toBe(true);
 expect(s.scene).toBe('market');expect(s.market.visit).toEqual({entry:'crossing',transit:null,passed:passages()});
 return s;
}
function walkReplay(s:GameState,x:number,y:number){
 expect(act(s,{type:'move',point:{x,y}}).ok).toBe(true);
 for(let i=0;i<1200&&s.player.path.length;i++)tick(s,1/60,{x:0,y:0});
 expect(s.defeated).toBe(false);expect(s.player.path).toEqual([]);expect(Math.hypot(s.player.x-x,s.player.y-y)).toBeLessThan(4);
}

describe('production act/tick save replay',()=>{
 it('round-trips a genuinely new eight-map game and its initial checkpoint',()=>{
  const s=createGame({name:'迁移实测',origin:'tinker',wish:'travel',appearance:0});expect(round(s)).toEqual(s);expect(JSON.parse(s.checkpoint!).contentVersion).toBe(7);
 });
 it('preserves actual exchange, mid-walk pause and every real return segment without completing work on restore',()=>{
  let s=enterForReplay();const entryCheckpoint=JSON.parse(s.checkpoint!);expect(entryCheckpoint.market.exchanged).toBe(false);
  walkReplay(s,470,760);walkReplay(s,470,458);
  expect(act(s,{type:'interact',targetId:'market_merchant'}).ok).toBe(true);expect(s.dialogue?.id).toBe('market_talk');
  const reading=round(s),readingFrozen=snapshot(reading);tick(reading,.8,{x:1,y:0});expect(snapshot(reading)).toBe(readingFrozen);
  expect(act(s,{type:'choose',choiceId:'market:exchange'}).ok).toBe(true);expect(s.market.exchanged).toBe(true);expect(entity(s,'market_door').state).toBe('closed');
  const exchangedCheckpoint=JSON.parse(s.checkpoint!);expect(exchangedCheckpoint.market.exchanged).toBe(true);expect(exchangedCheckpoint.worlds.market.find((e:Entity)=>e.id==='market_door').state).toBe('closed');
  tick(s,.4,{x:0,y:0});const moving=entity(s,'market_merchant');expect(moving.x).toBeGreaterThan(470);expect(moving.x).toBeLessThan(610);expect(moving.state).toBe('leading');
  expect(act(s,{type:'pause',value:true}).ok).toBe(true);expect(act(s,{type:'move',point:{x:470,y:500}}).ok).toBe(true);
  s=round(s);const frozen=snapshot(s);tick(s,.9,{x:1,y:0});expect(snapshot(s)).toBe(frozen);expect(entity(s,'market_door').state).toBe('closed');
  expect(act(s,{type:'pause',value:false}).ok).toBe(true);expect(s.pending).toBeNull();
  let opened=false,vertical=false,horizontal=false,homeLeg=false;
  for(let i=0;i<360;i++){
   const before={...entity(s,'market_merchant')};tick(s,1/60,{x:0,y:0});
   expect(s.defeated).toBe(false);expect(round(s)).toEqual(s);
   const npc=entity(s,'market_merchant'),door=entity(s,'market_door');
   if(door.state==='open'){
    opened=true;
    if(npc.x>610&&npc.y<before.y&&Math.abs(npc.x-before.x)<.001)vertical=true;
    if(npc.x<before.x&&Math.abs(npc.y-405)<.001)horizontal=true;
    if(npc.x===470&&npc.y<405&&npc.y>380)homeLeg=true;
    if(Math.hypot(npc.x-470,npc.y-380)<.001)break;
   }
  }
  expect({opened,vertical,horizontal,homeLeg}).toEqual({opened:true,vertical:true,horizontal:true,homeLeg:true});
  expect(entity(s,'market_merchant')).toMatchObject({x:470,y:380});expect(s.market.through).toEqual(passages());
  const checkpoint=JSON.parse(s.checkpoint!);expect(checkpoint.worlds.market.find((e:Entity)=>e.id==='market_door')).toMatchObject({state:'open',solid:false});expect(checkpoint.worlds.market.find((e:Entity)=>e.id==='market_merchant').x).toBeGreaterThan(610);
 });
 for(const hold of [false,true])it(`restores a real ${hold?'held':'pulled'} basket with paused pending release and exact remaining resources`,()=>{
  let s=enterForReplay(hold);walkReplay(s,380,720);const mana=s.player.mana;
  expect(act(s,{type:'cast',spell:'pull',targetId:'decoy',point:{x:460,y:720}}).ok).toBe(true);expect(s.player.mana).toBe(mana-1);
  expect(act(s,{type:'move',point:{x:490,y:810}}).ok).toBe(true);tick(s,.2,{x:0,y:0});expect(entity(s,'decoy').y).toBeGreaterThan(720);
  if(hold){expect(act(s,{type:'hold'}).ok).toBe(true);tick(s,.15,{x:0,y:0});expect(s.player.hold).toBeGreaterThan(0);}
  expect(act(s,{type:'pause',value:true}).ok).toBe(true);expect(act(s,{type:'release'}).ok).toBe(true);
  const original=snapshot(s);s=round(s);expect(snapshot(s)).toBe(original);expect(s.player.pullPoint===null).toBe(hold);
  tick(s,1,{x:1,y:0});expect(snapshot(s)).toBe(original);
  const landed={x:entity(s,'decoy').x,y:entity(s,'decoy').y};
  expect(act(s,{type:'pause',value:false}).ok).toBe(true);expect(s.player.pullId).toBeNull();expect(s.player.hold).toBe(0);expect(s.pending).toBeNull();expect(entity(s,'decoy')).toMatchObject({...landed,state:'idle'});expect(s.player.mana).toBe(mana-(hold?2:1));expect(round(s)).toEqual(s);
 });
});

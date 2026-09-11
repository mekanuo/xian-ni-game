/// <reference types="vite/client" />
import {describe,it,expect} from 'vitest';
import oldV6 from '../qa/fixtures/return-main-v0.7.0.json?raw';
import {restore,snapshot,migrateSave} from '../src/game/save';
import {act,tick,createGame} from '../src/game/model';
import type {Entity,GameState} from '../src/game/contracts';
const fixtures=import.meta.glob('../qa/fixtures/*.json',{eager:true,query:'?raw',import:'default'}) as Record<string,string>;
const empty=()=>({run:null,last:null,facts:[],reported:[]});
const current=()=>restore(oldV6);
const round=(s:GameState)=>restore(snapshot(s));
const peer=(s:GameState)=>s.worlds.spar.find(e=>e.id==='spar_peer')!;
// These explicit synthetic states probe the decoder. They are not evidence of
// actual player input; act/tick continuation tests are added once integrated.
function inside(){const s=current();s.scene='spar';s.flags.visited_spar=true;s.flags.companion='waiting';s.player.x=900;s.player.y=940;s.player.path=[];s.player.hp=3;s.player.mana=2;s.projectiles=[];s.pending=null;s.dialogue=null;s.flags.casting=false;return s;}
function positioning(){const s=inside();s.spar.run={phase:'positioning',stance:'front',positionPath:[{x:900,y:720}],positionWaiting:false,startHp:3,startSeq:Number(s.flags.projectileSeq??0),shots:0,blocked:false,stopReason:null};return s;}
function active(){const s=positioning();s.spar.run!.phase='active';s.spar.run!.positionPath=[];Object.assign(peer(s),{x:900,y:720,state:'casting',data:{attack:1.4,seen:3,lastX:900,lastY:940}});return s;}
function flight(){const s=active();s.flags.projectileSeq=s.spar.run!.startSeq+1;s.spar.run!.shots=1;peer(s).state='peaceful';peer(s).data!.attack=0;s.projectiles=[{id:Number(s.flags.projectileSeq),x:900,y:810,vx:0,vy:260,life:1.3,owner:'enemy'}];return s;}

describe('spar v7 exact source migration',()=>{
 for(const [path,raw] of Object.entries(fixtures))it(`migrates ${path} independently without granting results or resources`,()=>{
  const old=JSON.parse(raw),s=restore(raw),pairs=[[s,old],...(old.checkpoint?[[JSON.parse(s.checkpoint!),JSON.parse(old.checkpoint)]]:[])];
  for(const [next,prior] of pairs){
   expect(next.contentVersion).toBe(7);expect(Object.keys(next.worlds).sort()).toEqual(['canal','creek','crossing','home','kiln','market','spar','workshop']);expect(next.spar).toEqual(empty());
   for(const key of ['player','flags','profile','time','herbs','paused','pending','dialogue','projectiles','lastSafe'])expect(next[key]).toEqual(prior[key]);
   for(const key of ['canal','journey','kiln','market'])if(prior[key])expect(next[key]).toEqual(prior[key]);
   for(const [scene,list] of Object.entries(prior.worlds))for(const entity of list as Entity[])expect(next.worlds[scene].find((e:Entity)=>e.id===entity.id)).toEqual(entity);
   expect(next.worlds.home.find((e:Entity)=>e.id==='home_to_spar').state).toBe(['stay','travel'].includes(prior.flags.endingWish)?'idle':'hidden');
  }
  expect(migrateSave(snapshot(s))).toBe(snapshot(s));
 });
 it('roundtrips an unopened new game and its checkpoint',()=>{const s=createGame({name:'白露',origin:'tinker',wish:'stay',appearance:0});expect(round(s)).toEqual(s);expect(s.worlds.home.find(e=>e.id==='home_to_spar')!.state).toBe('hidden');});
 for(const version of [undefined,2,3,4,5,6])for(const defect of ['ledger','map','entry','peer','scene','safe','visited','flag'])it(`rejects v${version??'implicit1'} with new ${defect}`,()=>{
  const raw=Object.values(fixtures).find(raw=>JSON.parse(raw).contentVersion===version)!;const s=JSON.parse(raw);
  if(defect==='ledger')s.spar=empty();if(defect==='map')s.worlds.spar=[];if(defect==='entry')s.worlds.home.push({...s.worlds.home[0],id:'home_to_spar'});if(defect==='peer')s.worlds.home.push({...s.worlds.home[0],id:'spar_peer'});if(defect==='scene')s.scene='spar';if(defect==='safe')s.lastSafe.scene='spar';if(defect==='visited')s.flags.visited_spar=true;if(defect==='flag')s.flags.spar_won=true;
  expect(()=>restore(JSON.stringify(s))).toThrow();
 });
 for(const version of [0,1,8,'7',null])it(`rejects unknown version ${String(version)}`,()=>{const s=JSON.parse(oldV6);s.contentVersion=version;expect(()=>restore(JSON.stringify(s))).toThrow();});
 it('keeps a v7 outer result independent of a v6 checkpoint',()=>{const s=inside();s.spar.last={stance:'front',outcome:'hit',hurt:true};s.spar.facts=['front:hit'];s.checkpoint=JSON.parse(oldV6).checkpoint;const r=round(s);expect(r.spar).toEqual(s.spar);expect(JSON.parse(r.checkpoint!).spar).toEqual(empty());});
 it('allows an independently valid v7 checkpoint inside a v6 outer world',()=>{const s=JSON.parse(oldV6),nested=flight();nested.checkpoint=null;s.checkpoint=snapshot(nested);const r=restore(JSON.stringify(s));expect(r.spar).toEqual(empty());expect(JSON.parse(r.checkpoint!).spar).toEqual(nested.spar);expect(JSON.parse(r.checkpoint!).projectiles).toEqual(nested.projectiles);});
 it('rejects an invalid nested run and a second checkpoint layer',()=>{const s=current(),nested=active();nested.checkpoint=null;nested.spar.run!.shots=1;s.checkpoint=snapshot(nested);expect(()=>round(s)).toThrow();nested.spar.run!.shots=0;nested.checkpoint=oldV6;s.checkpoint=snapshot(nested);expect(()=>round(s)).toThrow();});
});

describe('spar world and durable facts',()=>{
 it('preserves partial report and last stop with real hurt rather than granting success',()=>{const s=inside();s.spar.facts=['left:hit','front:dodged'];s.spar.reported=['front:dodged'];s.spar.last={stance:'left',outcome:'stopped',hurt:true};expect(round(s).spar).toEqual(s.spar);});
 for(const defect of ['missing-ledger','extra-ledger','missing-map','duplicate','wrong-kind','wrong-hp','wall','wrong-exit','wrong-spawn','moved-entry','hidden-entry','before-ending','not-visited','following','safe','duplicate-fact','unknown-fact','unearned-report','duplicate-report','success-hurt','hit-unhurt','last-unearned','last-extra'])it(`rejects ${defect}`,()=>{
  const s=inside(),entry=s.worlds.home.find(e=>e.id==='home_to_spar')!;
  if(defect==='missing-ledger')delete (s as Partial<GameState>).spar;if(defect==='extra-ledger')Object.assign(s.spar,{reward:1});if(defect==='missing-map')delete (s.worlds as Partial<GameState['worlds']>).spar;if(defect==='duplicate')s.worlds.spar.push({...peer(s)});if(defect==='wrong-kind')peer(s).kind='npc';if(defect==='wrong-hp')peer(s).hp=4;if(defect==='wall')Object.assign(peer(s),{x:520,y:700});if(defect==='wrong-exit')entry.targetScene='market';if(defect==='wrong-spawn')entry.targetSpawn={x:10,y:10};if(defect==='moved-entry')entry.x+=10;if(defect==='hidden-entry')entry.state='hidden';if(defect==='before-ending')delete s.flags.endingWish;if(defect==='not-visited')delete s.flags.visited_spar;if(defect==='following')s.flags.companion='following';if(defect==='safe')s.lastSafe={scene:'spar',point:{x:900,y:1220}};
  if(defect==='duplicate-fact')s.spar.facts=['front:hit','front:hit'];if(defect==='unknown-fact')Object.assign(s.spar,{facts:['left:won']});if(defect==='unearned-report')s.spar.reported=['right:blocked'];if(defect==='duplicate-report'){s.spar.facts=['front:hit'];s.spar.reported=['front:hit','front:hit'];}if(defect==='success-hurt'){s.spar.last={stance:'front',outcome:'dodged',hurt:true};s.spar.facts=['front:dodged'];}if(defect==='hit-unhurt'){s.spar.last={stance:'front',outcome:'hit',hurt:false};s.spar.facts=['front:hit'];}if(defect==='last-unearned')s.spar.last={stance:'right',outcome:'blocked',hurt:false};if(defect==='last-extra')s.spar.last=Object.assign({stance:'front' as const,outcome:'stopped' as const,hurt:false},{reward:2});
  expect(()=>round(s)).toThrow();
 });
});

describe('spar exact ongoing state, synthetic decoder boundaries',()=>{
 for(const [label,make] of [['positioning',positioning],['windup',active],['flight',flight]] as const)it(`preserves paused ${label} without advancing or replenishing`,()=>{const s=make();s.paused=true;s.pending={type:'move',point:{x:925,y:940}};const r=round(s);expect(r).toEqual(s);});
 it('accepts actual intermediate outside-circle route points and waiting pose',()=>{const s=positioning();Object.assign(peer(s),{x:790,y:830});s.spar.run!.stance='right';s.spar.run!.positionPath=[{x:900,y:720},{x:1120,y:940}];s.spar.run!.positionWaiting=true;expect(round(s).spar).toEqual(s.spar);});
 it('does not force an active peer back onto the originally agreed stance',()=>{const s=active();Object.assign(peer(s),{x:960,y:728});expect(round(s).worlds.spar).toEqual(s.worlds.spar);});
 it('preserves stopped flight and already incurred hurt together',()=>{const s=flight();s.spar.run!.phase='settling';s.spar.run!.stopReason='stopped';s.player.hp=2;expect(round(s)).toEqual(s);});
 for(const defect of ['outside-scene','phase','stance','start-hp','negative-seq','fraction-shots','second-shot','seq-mismatch','blocked-unfired','stop-while-active','position-attack','path-through-circle','path-arbitrary','path-loop','path-wrong-end','waiting-active','foreign-projectile','duplicate-projectile','wrong-speed','expired-projectile','id-mismatch','active-dialogue','active-healed','active-outside','idle-projectile'])it(`rejects ${defect}`,()=>{
  const s=flight(),r=s.spar.run!;
  if(defect==='outside-scene')s.scene='home';if(defect==='phase')Object.assign(r,{phase:'victory'});if(defect==='stance')Object.assign(r,{stance:'rear'});if(defect==='start-hp')r.startHp=1;if(defect==='negative-seq')r.startSeq=-1;if(defect==='fraction-shots')Object.assign(r,{shots:.5});if(defect==='second-shot')Object.assign(r,{shots:2});if(defect==='seq-mismatch')s.flags.projectileSeq=10;if(defect==='blocked-unfired'){r.shots=0;r.blocked=true;s.flags.projectileSeq=r.startSeq;s.projectiles=[];peer(s).state='casting';}if(defect==='stop-while-active')r.stopReason='outside';
  if(defect==='position-attack'){r.phase='positioning';r.shots=0;s.flags.projectileSeq=r.startSeq;s.projectiles=[];peer(s).state='casting';}if(defect.startsWith('path-')){r.phase='positioning';r.shots=0;s.flags.projectileSeq=r.startSeq;s.projectiles=[];Object.assign(peer(s),{x:680,y:940,state:'peaceful'});r.stance='right';r.positionPath=defect==='path-through-circle'?[{x:1120,y:940}]:defect==='path-arbitrary'?[{x:200,y:200},{x:1120,y:940}]:defect==='path-loop'?[{x:900,y:720},{x:680,y:940},{x:900,y:720},{x:1120,y:940}]:[{x:900,y:720}];}
  if(defect==='waiting-active')r.positionWaiting=true;if(defect==='foreign-projectile')s.projectiles[0].owner='player';if(defect==='duplicate-projectile')s.projectiles.push({...s.projectiles[0]});if(defect==='wrong-speed')s.projectiles[0].vy=500;if(defect==='expired-projectile')s.projectiles[0].life=0;if(defect==='id-mismatch')s.projectiles[0].id+=1;if(defect==='active-dialogue')s.dialogue={id:'spar_talk',speaker:'闻朔',text:'不能冻结余弹',choices:[]};if(defect==='active-healed')s.player.hp=4;if(defect==='active-outside')s.player.x=1000;if(defect==='idle-projectile')s.spar.run=null;
  expect(()=>round(s)).toThrow();
 });
 it('accepts paused local begin and stop actions without executing them',()=>{for(const type of ['spar-begin','spar-stop'] as const){const s=positioning();s.paused=true;s.pending={type};expect(round(s).pending).toEqual({type});}});
});


describe('spar real production input and continuation',()=>{
 function enter(){const s=current();s.paused=false;s.pending=null;s.dialogue=null;s.flags.companion='waiting';
  // Only the already-earned home doorway approach is synthetic staging.
  // Entry, agreement, positioning, firing and all outcomes below use act/tick.
  s.player.x=1500;s.player.y=480;
  expect(act(s,{type:'interact',targetId:'home_to_spar'}).ok).toBe(true);expect(s.scene).toBe('spar');return s;
 }
 function step(s:GameState,n=1){for(let i=0;i<n;i++){tick(s,.025,{x:0,y:0});expect(round(s)).toEqual(s);}}
 function walk(s:GameState,x:number,y:number){expect(act(s,{type:'move',point:{x,y}}).ok).toBe(true);for(let i=0;i<800&&s.player.path.length;i++)step(s);expect(Math.hypot(s.player.x-x,s.player.y-y)).toBeLessThan(4);}
 function agree(s:GameState,stance:'front'|'left'|'right'){
  const e=peer(s),dx=s.player.x-e.x,dy=s.player.y-e.y,d=Math.hypot(dx,dy)||1;
  walk(s,e.x+dx/d*70,e.y+dy/d*70);expect(act(s,{type:'interact',targetId:'spar_peer'}).ok).toBe(true);
  const id=`spar:agree:${stance}`;if(!s.dialogue!.choices.some(c=>c.id===id))expect(act(s,{type:'choose',choiceId:'more'}).ok).toBe(true);
  expect(act(s,{type:'choose',choiceId:id}).ok).toBe(true);walk(s,900,940);for(let i=0;i<800&&s.spar.run!.positionPath.length;i++)step(s);
  expect(act(s,{type:'spar-begin'}).ok).toBe(true);expect(round(s)).toEqual(s);
 }
 it('saves every real substep through hits and both side repositionings without rebuilding the peer',()=>{
  const s=enter(),mana=s.player.mana;for(const [index,stance] of (['front','left','right'] as const).entries()){
   agree(s,stance);for(let i=0;i<200&&s.spar.run;i++)step(s);
   expect(s.spar.last).toEqual({stance,outcome:'hit',hurt:true});expect(s.player.hp).toBe(3-index);expect(s.player.mana).toBe(mana);
  }
  expect(s.spar.facts).toEqual(['front:hit','left:hit','right:hit']);expect(s.spar.reported).toEqual([]);
  expect(JSON.parse(s.checkpoint!).player.hp).toBe(1);
 });
 it('continues a paused real windup and stopped projectile to the same hurt and outcome',()=>{
  const s=enter();agree(s,'front');for(let i=0;i<100&&peer(s).state!=='casting';i++)step(s);
  expect(peer(s).state).toBe('casting');expect(act(s,{type:'pause',value:true}).ok).toBe(true);
  let loaded=round(s);const frozen=snapshot(loaded);tick(loaded,1,{x:0,y:0});expect(snapshot(loaded)).toBe(frozen);
  expect(act(loaded,{type:'pause',value:false}).ok).toBe(true);for(let i=0;i<100&&!loaded.projectiles.length;i++)step(loaded);
  const projectile={...loaded.projectiles[0]};expect(act(loaded,{type:'spar-stop'}).ok).toBe(true);expect(loaded.projectiles[0]).toEqual(projectile);
  expect(act(loaded,{type:'pause',value:true}).ok).toBe(true);loaded=round(loaded);expect(loaded.projectiles[0]).toEqual(projectile);
  expect(act(loaded,{type:'pause',value:false}).ok).toBe(true);for(let i=0;i<100&&loaded.spar.run;i++)step(loaded);
  expect(loaded.player.hp).toBe(3);expect(loaded.spar.last).toEqual({stance:'front',outcome:'stopped',hurt:true});expect(loaded.spar.facts).toEqual(['front:hit']);
 });
 it('records a real ward impact and persists exactly one spent mana',()=>{
  const s=enter();agree(s,'left');const mana=s.player.mana;expect(act(s,{type:'cast',spell:'ward',point:{x:680,y:940}}).ok).toBe(true);
  for(let i=0;i<200&&s.spar.run;i++)step(s);
  expect(s.spar.last).toEqual({stance:'left',outcome:'blocked',hurt:false});expect(s.player.hp).toBe(4);expect(s.player.mana).toBe(mana-1);expect(round(s).spar.facts).toEqual(['left:blocked']);
 });
});

describe('spar scoped new protocol rejects only structural contamination',()=>{
 it('does not mistake old dialogue prose for a new protocol identifier',()=>{const s=JSON.parse(oldV6);s.paused=true;s.dialogue={id:'tao',speaker:'陶七',text:'本段只是旧档文字：spar: 与 spar-begin 并不是动作。',choices:[{id:'leave',label:'继续'}]};expect(restore(JSON.stringify(s)).dialogue).toEqual(s.dialogue);});
 for(const defect of ['pending-interact','dialogue-id','dialogue-choice','pending-begin','pending-stop'])it(`rejects old source ${defect}`,()=>{const s=JSON.parse(oldV6);s.paused=true;if(defect==='pending-interact')s.pending={type:'interact',targetId:'spar_peer'};if(defect==='pending-begin')s.pending={type:'spar-begin'};if(defect==='pending-stop')s.pending={type:'spar-stop'};if(defect==='dialogue-id')s.dialogue={id:'spar_peer',speaker:'闻朔',text:'约定',choices:[]};if(defect==='dialogue-choice')s.dialogue={id:'tao',speaker:'陶七',text:'约定',choices:[{id:'spar:report',label:'报告'}]};expect(()=>restore(JSON.stringify(s))).toThrow();});
 it('rejects hidden parameters on the new parameter-free begin action',()=>{const s=positioning();s.paused=true;s.pending=Object.assign({type:'spar-begin' as const},{stance:'rear'});expect(()=>round(s)).toThrow();});
 it('rejects a claimed block while the one projectile is still flying',()=>{const s=flight();s.spar.run!.blocked=true;expect(()=>round(s)).toThrow();});
 it('rejects damage without any emitted shot',()=>{const s=positioning();s.spar.run!.phase='settling';s.spar.run!.positionPath=[];s.spar.run!.stopReason='stopped';s.player.hp=2;expect(()=>round(s)).toThrow();});
 it('rejects casting before the actual raider windup threshold',()=>{const s=active();peer(s).data!.attack=.4;expect(()=>round(s)).toThrow();});
});

describe('spar positioning cannot preserve a route through the courtyard wall',()=>{
 it('rejects a free exterior starting foot whose remaining route crosses a solid wall',()=>{const s=positioning();Object.assign(peer(s),{x:1400,y:720});expect(()=>round(s)).toThrow();});
 it('keeps a legal south-circuit segment instead of recomputing it into the north circuit',()=>{const s=positioning();Object.assign(peer(s),{x:790,y:1050});s.spar.run!.stance='right';s.spar.run!.positionPath=[{x:900,y:1160},{x:1120,y:940}];expect(round(s).spar.run!.positionPath).toEqual([{x:900,y:1160},{x:1120,y:940}]);});
});

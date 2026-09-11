import {describe,it,expect} from 'vitest';
import {createKilnState} from '../src/game/kiln';
import {createJourneyState} from '../src/game/journey';
import {nearbyEncounter} from '../src/game/encounters';
import type {GameState} from '../src/game/contracts';
import {CANAL_SCENE,CANAL_POINTS} from '../src/game/canal-content';
import {canalObjective,canalDescription,createCanalState,canalInteract,canalTick,canalChoose,canalWaterState,canalObstacles,canalMaintainSupport,canalBeforeExit,type CanalPorts} from '../src/game/canal';
const ports:CanalPorts={free:()=>true,clearLine:()=>true,emit:()=>{},dialogue:(s,id,speaker,text,choices=[])=>{s.dialogue={id,speaker,text,choices};},hurt:s=>{s.player.hp=Math.max(0,s.player.hp-1);}};
function game():GameState{return {schema:1,revision:'return-stone-v1',contentVersion:5,kiln:createKilnState(),journey:createJourneyState(),profile:{name:'试渠',origin:'tinker',wish:'travel',appearance:0},scene:'canal',time:0,player:{x:600,y:400,hp:4,mana:0,facing:0,invulnerable:0,cooldown:0,ward:0,wardFacing:0,pullId:null,pullPoint:null,hold:0,path:[]},worlds:{kiln:[],home:[],creek:[],workshop:[],crossing:[],canal:structuredClone(CANAL_SCENE.entities)},flags:{endingWish:'travel'},ringStyle:'long',herbs:0,selected:'pull',paused:false,dialogue:null,events:[],projectiles:[],pending:null,ended:true,defeated:false,checkpoint:null,lastSafe:{scene:'canal',point:CANAL_POINTS.entry},life:{repair:{stage:'unaccepted',softened:false,stopSet:false,latched:false,tested:false,method:null,testing:null},harvest:{stage:'unaccepted',sun:'unpicked',shade:'unpicked',picking:null,shared:false},clamp:'unowned',sachets:0,scent:null},canal:{...createCanalState(),stage:'active',inspected:true}};}
const ent=(s:GameState,id:string)=>s.worlds.canal.find(e=>e.id===id)!;
const run=(s:GameState,n:number)=>{for(let t=0;t<n;t+=.05)canalTick(s,.05,ports);};
describe('canal authoritative work primitives',()=>{
 it('finishes diversion with zero mana, demands physical clear, restoration and downstream observation',()=>{
  const s=game();expect(canalInteract(s,ent(s,'canal_diverter'),ports)?.ok).toBe(true);run(s,2.05);expect(canalWaterState(s)).toBe('diverted');run(s,1.05);expect(canalObstacles(s)).toHaveLength(1);
  Object.assign(s.player,{x:1100,y:540});expect(canalInteract(s,ent(s,'canal_screen'),ports)?.ok).toBe(true);run(s,2.05);expect(s.canal.method).toBe('diversion');expect(s.canal.stage).toBe('active');
  Object.assign(s.player,{x:680,y:400});canalInteract(s,ent(s,'canal_diverter'),ports);run(s,2.05);run(s,3.05);expect(s.canal.flow).toBe(3);expect(s.canal.stage).toBe('active');
  Object.assign(s.player,{x:350,y:980});canalInteract(s,ent(s,'canal_tub'),ports);expect(s.canal.stage).toBe('verified');expect(s.player.mana).toBe(0);expect(ent(s,'canal_rest_mid').state).toBe('idle');
 });
 it('derives upstream priority from both devices and drops unsupported stop',()=>{const s=game(),d=ent(s,'canal_diverter'),e=ent(s,'canal_stop');Object.assign(d,CANAL_POINTS.diverterSide);Object.assign(e,CANAL_POINTS.stopSlot);s.player.pullId=e.id;s.player.hold=8;expect(canalWaterState(s)).toBe('stopped');s.player.pullId=null;s.player.hold=0;canalMaintainSupport(s,e);expect(e.x).toBe(1280);expect(canalWaterState(s)).toBe('diverted');});
 it('does not clear while actively pulling and freezes manual work under every pause gate',()=>{const s=game();s.canal.drain=1;Object.assign(ent(s,'canal_diverter'),CANAL_POINTS.diverterSide);Object.assign(s.player,{x:1100,y:540,pullId:'canal_diverter'});expect(canalInteract(s,ent(s,'canal_screen'),ports)?.ok).toBe(false);s.player.pullId=null;canalInteract(s,ent(s,'canal_screen'),ports);s.paused=true;run(s,3);expect(s.canal.work?.elapsed).toBe(0);s.paused=false;s.dialogue={id:'x',speaker:'x',text:'x',choices:[]};run(s,3);expect(s.canal.work?.elapsed).toBe(0);s.dialogue=null;s.player.x+=10;run(s,.1);expect(s.canal.work).toBe(null);});
 it('allows held work, records its actual method and keeps installed clamp on exit',()=>{const s=game(),stop=ent(s,'canal_stop');Object.assign(stop,CANAL_POINTS.stopSlot);Object.assign(s.player,{x:1230,y:410,pullId:stop.id,hold:8});s.life.clamp='bag';s.dialogue={id:'canal_eye',speaker:'架',text:'',choices:[]};expect(canalChoose(s,'canal:clamp:install',ports)?.ok).toBe(true);expect(s.life.clamp).toBe('canal');s.dialogue=null;run(s,1.05);Object.assign(s.player,{x:1100,y:540});canalInteract(s,ent(s,'canal_screen'),ports);run(s,2.05);expect(s.canal.method).toBe('clamp');canalBeforeExit(s);expect(s.life.clamp).toBe('canal');expect(stop.state).toBe('clamped');});
 it('warns before a single surge hit and moves the player to a dry bank',()=>{const s=game();s.canal.drain=1;Object.assign(s.player,{x:1100,y:540});run(s,.05);expect(s.canal.surge).not.toBe(null);expect(s.player.hp).toBe(4);run(s,1.3);expect(s.player.hp).toBe(3);expect(s.player.x<1030||s.player.y<460||s.player.x>1220).toBe(true);run(s,3);expect(s.player.hp).toBe(3);});
 it('cannot claim downstream observation while diversion still runs, or install a second clamp',()=>{const s=game();s.canal.cleared=true;s.canal.method='diversion';Object.assign(ent(s,'canal_diverter'),CANAL_POINTS.diverterSide);s.canal.flow=3;Object.assign(s.player,{x:350,y:980});expect(canalInteract(s,ent(s,'canal_tub'),ports)?.ok).toBe(false);s.life.clamp='lookout';Object.assign(s.player,CANAL_POINTS.eye);s.dialogue={id:'canal_eye',speaker:'架',text:'',choices:[]};expect(canalChoose(s,'canal:clamp:install',ports)?.ok).toBe(false);expect(s.life.clamp).toBe('lookout');});
});

describe('canal evidence, interruption and safe return',()=>{
 it('requires inspection and real presence in the dry channel',()=>{const s=game();s.canal.inspected=false;s.canal.drain=1;Object.assign(ent(s,'canal_diverter'),CANAL_POINTS.diverterSide);Object.assign(s.player,{x:1100,y:540});expect(canalInteract(s,ent(s,'canal_screen'),ports)?.ok).toBe(false);s.canal.inspected=true;Object.assign(s.player,{x:990,y:540});expect(canalInteract(s,ent(s,'canal_screen'),ports)?.ok).toBe(false);expect(s.canal.work).toBe(null);});
 it('cancels a partly completed clear if water returns; changing to diversion then permits a new work attempt',()=>{const s=game(),stop=ent(s,'canal_stop');Object.assign(stop,CANAL_POINTS.stopSlot);Object.assign(s.player,{x:1100,y:540,pullId:stop.id,hold:8});run(s,1.05);canalInteract(s,ent(s,'canal_screen'),ports);run(s,1);expect(s.canal.work?.elapsed).toBeCloseTo(1);s.player.pullId=null;s.player.hold=0;run(s,.05);expect(s.canal.cleared).toBe(false);expect(s.canal.work).toBe(null);Object.assign(ent(s,'canal_diverter'),CANAL_POINTS.diverterSide);run(s,1.05);canalInteract(s,ent(s,'canal_screen'),ports);run(s,2.05);expect(s.canal.method).toBe('diversion');});
 it('records hold only if that support is active when the two-second work finishes',()=>{const s=game(),stop=ent(s,'canal_stop');Object.assign(stop,CANAL_POINTS.stopSlot);Object.assign(s.player,{x:1100,y:540,pullId:stop.id,hold:8});run(s,1.05);canalInteract(s,ent(s,'canal_screen'),ports);run(s,2.05);expect(s.canal.method).toBe('hold');expect(s.canal.usedClamp).toBe(false);expect(s.canal.cleared).toBe(true);});
 it('records shared inspection only with a following companion near the actual observation',()=>{const s=game(),xu=ent(s,'xu_canal');Object.assign(s.player,CANAL_POINTS.inspect);s.flags.companion='following';Object.assign(xu,{x:400,y:960});canalInteract(s,ent(s,'canal_inspect'),ports);expect(s.canal.sharedInspect).toBe(false);s.dialogue=null;Object.assign(xu,CANAL_POINTS.companionInspect);s.flags.companion='refused';canalInteract(s,ent(s,'canal_inspect'),ports);expect(s.canal.sharedInspect).toBe(false);s.dialogue=null;s.flags.companion='following';canalInteract(s,ent(s,'canal_inspect'),ports);expect(s.canal.sharedInspect).toBe(true);});
 it('does not invent shared water verification later or repeat first verification and completion',()=>{const s=game();s.canal.cleared=true;s.canal.method='diversion';ent(s,'canal_screen').state='cleared';s.canal.flow=3;Object.assign(s.player,{x:350,y:980});canalInteract(s,ent(s,'canal_tub'),ports);expect(s.canal.sharedVerify).toBe(false);s.flags.companion='following';Object.assign(ent(s,'xu_canal'),CANAL_POINTS.companionVerify);canalInteract(s,ent(s,'canal_tub'),ports);expect(s.canal.sharedVerify).toBe(false);expect(s.canal.stage).toBe('verified');Object.assign(s.player,{x:300,y:980});expect(canalChoose(s,'canal:report',ports)?.ok).toBe(true);expect(canalChoose(s,'canal:report',ports)?.ok).toBe(false);s.scene='home';s.worlds.home=[{id:'table',kind:'object',type:'table',name:'桌边',x:760,y:410,w:100,h:50,state:'idle'}];Object.assign(s.player,{x:760,y:450});expect(canalChoose(s,'canal:record',ports)?.ok).toBe(true);expect(canalChoose(s,'canal:record',ports)?.ok).toBe(false);expect(s.ended).toBe(true);});
 it('refuses clamp removal with a companion in the channel and allows it after both reach shore',()=>{const s=game();s.life.clamp='canal';Object.assign(ent(s,'canal_stop'),CANAL_POINTS.stopSlot,{state:'clamped'});Object.assign(s.player,CANAL_POINTS.eye);s.flags.companion='following';Object.assign(ent(s,'xu_canal'),CANAL_POINTS.screen);s.dialogue={id:'canal_eye',speaker:'架',text:'',choices:[]};expect(canalChoose(s,'canal:clamp:remove',ports)?.ok).toBe(false);expect(s.life.clamp).toBe('canal');Object.assign(ent(s,'xu_canal'),CANAL_POINTS.westBank);expect(canalChoose(s,'canal:clamp:remove',ports)?.ok).toBe(true);expect(s.life.clamp).toBe('bag');expect(ent(s,'canal_stop').x).toBe(1280);});
 it('keeps the side path traversable throughout its warning, and avoids damage if the player leaves',()=>{const s=game();Object.assign(ent(s,'canal_diverter'),CANAL_POINTS.diverterSide);Object.assign(s.player,{x:750,y:540});run(s,.05);expect(s.canal.surge).not.toBe(null);expect(canalObstacles(s).some(r=>r.x===700)).toBe(false);Object.assign(s.player,{x:660,y:540});run(s,1.5);expect(s.player.hp).toBe(4);expect(s.canal.surge).toBe(null);expect(canalObstacles(s).some(r=>r.x===700)).toBe(true);});
 it('opens the follow-up table without resetting or repeating the original ending',()=>{const s=game();s.scene='home';s.canal=createCanalState();s.worlds.home=[{id:'table',kind:'object',type:'table',name:'桌边',x:760,y:410,w:100,h:50,state:'idle'}];Object.assign(s.player,{x:760,y:450});canalInteract(s,s.worlds.home[0],ports);expect(s.dialogue?.id).toBe('canal_table');expect(s.dialogue?.choices.some(c=>c.id==='canal:accept')).toBe(true);expect(s.ended).toBe(true);expect(canalChoose(s,'canal:accept',ports)?.ok).toBe(true);expect(canalChoose(s,'canal:accept',ports)?.ok).toBe(false);});
});


describe('canal revisit cues follow actual water without erasing history',()=>{
 it.each(['verified','ready','complete'] as const)('restores water before giving %s destination advice',stage=>{
  const s=game();Object.assign(s.canal,{stage,cleared:true,flow:3,method:'diversion'});
  canalInteract(s,ent(s,'canal_diverter'),ports);run(s,2.05);
  expect(canalWaterState(s)).toBe('diverted');
  expect(canalObjective(s)).toContain('复位');
  expect(canalDescription(s,ent(s,'canal_screen'))).not.toContain('仍需');
  Object.assign(s.player,{x:680,y:400});canalInteract(s,ent(s,'canal_diverter'),ports);run(s,2.05);
  expect(canalObjective(s)).toContain('稳定');run(s,3.05);
  expect(s.canal.stage).toBe(stage);expect(s.player.mana).toBe(0);
  expect(canalObjective(s)).toContain(stage==='verified'?'邵禾':'桌边');
 });
 it('does not call residual flow stable when a board has just changed',()=>{
  const s=game();Object.assign(s.canal,{stage:'complete',cleared:true,flow:3});
  Object.assign(ent(s,'canal_diverter'),CANAL_POINTS.diverterSide);
  expect(canalDescription(s,ent(s,'canal_tub'))).not.toContain('稳定来水');
  Object.assign(s.player,{x:300,y:980});canalInteract(s,ent(s,'canal_keeper'),ports);
  expect(s.dialogue?.text).not.toContain('取水槽也通着');
 });
 it('does not suggest draining a completed, flowing canal as required work',()=>{
  const s=game();Object.assign(s.canal,{stage:'complete',cleared:true,flow:3});Object.assign(s.player,CANAL_POINTS.tub);
  expect(nearbyEncounter(s)?.options.join(' ')).not.toContain('再安排分水或截水');
 });
 it('shows the recorded table after completion without a second acceptance or reward',()=>{
  const s=game();s.scene='home';Object.assign(s.canal,{stage:'ready',cleared:true,method:'diversion'});
  s.worlds.home=[{id:'table',kind:'object',type:'table',name:'桌边',x:760,y:410,w:100,h:50,state:'idle'}];Object.assign(s.player,{x:760,y:450});
  expect(canalChoose(s,'canal:record',ports)?.ok).toBe(true);
  const view=nearbyEncounter(s);expect(view?.title).toContain('旧渠小图');expect(JSON.stringify(view)).not.toMatch(/接信|亲手添图/);
  expect(canalChoose(s,'canal:record',ports)?.ok).toBe(false);
 });
 it('remembers clamp use while acknowledging its actual recovery',()=>{
  const s=game();Object.assign(s.canal,{stage:'complete',cleared:true,usedClamp:true});
  s.life.clamp='canal';Object.assign(ent(s,'canal_stop'),CANAL_POINTS.stopSlot);
  Object.assign(s.player,CANAL_POINTS.eye);s.dialogue={id:'canal_eye',speaker:'架',text:'',choices:[]};
  expect(canalChoose(s,'canal:clamp:remove',ports)?.ok).toBe(true);
  const tao={...ent(s,'canal_keeper'),type:'tao'};
  expect(canalDescription(s,tao)).toContain('袋中');
  expect(s.canal.usedClamp).toBe(true);expect(s.canal.stage).toBe('complete');
 });
});

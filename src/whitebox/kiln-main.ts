import Phaser from 'phaser';
import './kiln.css';
import {previewCast,previewPullMove} from '../game/model';
import type {Entity,GameAction,Spell,Vec} from '../game/contracts';
import {KILN_MAP,KILN_WEST,KILN_EAST,installKilnMap,createKilnRun,kilnAct,kilnTick} from './kiln-model';
import type {KilnPreset,KilnRun} from './kiln-model';

installKilnMap();
let preset:KilnPreset='ordinary';
let run:KilnRun=createKilnRun(preset);
let aiming:Spell|null=null;
let lastNotice='';
const status=document.querySelector<HTMLElement>('#status')!;
const notice=document.querySelector<HTMLElement>('#notice')!;
const density=()=>Math.min(window.devicePixelRatio||1,2,Math.sqrt(5_000_000/(innerWidth*innerHeight)));
let dpr=density();
function say(text:string){if(text!==lastNotice){notice.textContent=text;lastNotice=text;}}
function dispatch(action:GameAction){const result=kilnAct(run,action);if(result.message)say(result.message);return result;}
function select(spell:Spell|null){aiming=spell;if(spell)dispatch({type:'select',spell});document.querySelectorAll<HTMLButtonElement>('[data-spell]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.spell===spell)));}

class KilnScene extends Phaser.Scene {
  private ink!:Phaser.GameObjects.Graphics;
  private labels=new Map<string,Phaser.GameObjects.Text>();
  private keys!:Record<string,Phaser.Input.Keyboard.Key>;
  private manual=false;
  private overview=false;
  private drag:null|{x:number;y:number;cx:number;cy:number}=null;
  constructor(){super('kiln-whitebox');}
  create(){
    this.ink=this.add.graphics();
    this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,SPACE,ONE,TWO,THREE,C',false) as Record<string,Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{
      const event=p.event as MouseEvent;
      if(event.shiftKey){this.manual=true;this.overview=false;this.drag={x:p.x,y:p.y,cx:this.cameras.main.scrollX,cy:this.cameras.main.scrollY};return;}
      const point=this.cameras.main.getWorldPoint(p.x,p.y);
      this.groundInput(point);
    });
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{if(this.drag){const c=this.cameras.main;c.scrollX=this.drag.cx-(p.x-this.drag.x)/c.zoom;c.scrollY=this.drag.cy-(p.y-this.drag.y)/c.zoom;}});
    const release=()=>{this.drag=null;};
    for(const name of ['mouseup','touchend','touchcancel','pointercancel','blur'])window.addEventListener(name,release,true);
    this.events.once('shutdown',()=>{for(const name of ['mouseup','touchend','touchcancel','pointercancel','blur'])window.removeEventListener(name,release,true);});
    this.scale.on('resize',()=>this.frame());
    this.frame();
    Object.defineProperty(window,'__KILN__',{configurable:true,value:{
      inspect:()=>JSON.parse(JSON.stringify({preset,...run})),
      screenPoint:(x:number,y:number)=>{const c=this.cameras.main,o=c.getWorldPoint(0,0);return{x:(x-o.x)*c.zoom/dpr,y:(y-o.y)*c.zoom/dpr};},
      geometry:()=>JSON.parse(JSON.stringify(KILN_MAP)),
    }});
  }
  reset(){run=createKilnRun(preset);select(null);this.manual=false;this.overview=false;this.drag=null;this.frame();say('从西院走到东端，再亲自返回；留意墙角、挡屏与施术来向。');}
  center(){this.manual=false;this.overview=false;this.frame();}
  fullView(){this.overview=!this.overview;this.manual=this.overview;this.frame();}
  private frame(){
    const c=this.cameras.main;c.setBounds(0,0,KILN_MAP.width,KILN_MAP.height);
    c.setZoom(this.overview?Math.min(innerWidth/KILN_MAP.width,(innerHeight-210)/KILN_MAP.height)*dpr:dpr*(innerWidth<600?.8:1));
    c.centerOn(this.overview?KILN_MAP.width/2:run.state.player.x,this.overview?KILN_MAP.height/2:run.state.player.y);
    for(const label of this.labels.values())label.setResolution(dpr);
  }
  private groundInput(point:Vec){
    const s=run.state;
    if(s.defeated){say('体力耗尽。重新开始会恢复相同初态；零灵力处境仍为零。');return;}
    if(s.player.pullId&&s.player.hold<=0){const p=previewPullMove(s,point);if(!p.valid){say(p.reason);return;}dispatch({type:'move',point});return;}
    if(!aiming){dispatch({type:'move',point});return;}
    const target=s.worlds.home.filter(e=>e.state!=='retreated'&&e.state!=='burned'&&Math.abs(e.x-point.x)<=e.w/2+12&&Math.abs(e.y-point.y)<=e.h/2+12).sort((a,b)=>Phaser.Math.Distance.Between(a.x,a.y,point.x,point.y)-Phaser.Math.Distance.Between(b.x,b.y,point.x,point.y))[0];
    const destination=target?{x:target.x,y:target.y}:point;
    const preview=previewCast(s,aiming,target?.id,destination);
    if(!preview.valid){say(preview.reason);return;}
    const result=dispatch({type:'cast',spell:aiming,targetId:target?.id,point:destination});
    if(result.ok)select(null);
  }
  private label(id:string,text:string,x:number,y:number,color='#334c42'){
    let label=this.labels.get(id);if(!label){label=this.add.text(x,y,text,{fontFamily:'serif',fontSize:'16px',color,backgroundColor:'#f1edddd9',padding:{x:5,y:3}}).setOrigin(.5,1).setResolution(dpr);this.labels.set(id,label);}
    label.setText(text).setPosition(x,y).setColor(color).setVisible(true);
  }
  private actor(e:Entity){
    const g=this.ink;
    if(e.kind==='enemy'){
      if(e.state==='retreated'){g.fillStyle(0x88927c,.6).fillCircle(e.x,e.y,10);this.label(e.id,'已退开',e.x,e.y-22);return;}
      g.fillStyle(e.state==='casting'?0xd9a349:e.state==='idle'?0x826e5b:0xa26847).fillCircle(e.x,e.y,18);
      const angle=Math.atan2(Number(e.data?.lastY??e.y)-e.y,Number(e.data?.lastX??e.x)-e.x);
      g.lineStyle(3,0x4d443c).lineBetween(e.x,e.y,e.x+Math.cos(angle)*26,e.y+Math.sin(angle)*26);
      for(let i=0;i<(e.hp??0);i++)g.fillStyle(0x864e3e).fillRect(e.x-18+i*13,e.y-33,10,4);
      this.label(e.id,`${e.name} · ${e.state==='casting'?'聚火':e.state==='idle'?'守望':'警觉'}`,e.x,e.y-40);
    }else{
      const burned=e.state==='burned';
      g.fillStyle(burned?0x555d51:e.state==='burning'?0xc9803f:0x967a56,burned?.4:1).fillRect(e.x-e.w/2,e.y-e.h/2,e.w,e.h);
      g.lineStyle(2,0x5b604e,burned?.3:1).strokeRect(e.x-e.w/2,e.y-e.h/2,e.w,e.h);
      this.label(e.id,burned?'烧毁的屏':e.state==='burning'?`燃烧 · ${Math.ceil(e.timer??0)}秒`:e.state==='pulled'||e.state==='held'?'轻木屏 · 悬起':'轻木屏 · 落地',e.x,e.y-e.h/2-10);
    }
  }
  update(_time:number,delta:number){
    if(!this.keys)return;
    const k=this.keys,typing=['INPUT','TEXTAREA'].includes(document.activeElement?.tagName||'');
    if(!typing){
      if(Phaser.Input.Keyboard.JustDown(k.SPACE)&&document.activeElement?.tagName!=='BUTTON')dispatch({type:'pause',value:!run.state.paused});
      if(Phaser.Input.Keyboard.JustDown(k.ONE))select('pull');if(Phaser.Input.Keyboard.JustDown(k.TWO))select('flame');if(Phaser.Input.Keyboard.JustDown(k.THREE))select('ward');if(Phaser.Input.Keyboard.JustDown(k.C))this.center();
    }
    kilnTick(run,Math.min(delta/1000,.1),typing?{x:0,y:0}:{x:Number(k.D.isDown||k.RIGHT.isDown)-Number(k.A.isDown||k.LEFT.isDown),y:Number(k.S.isDown||k.DOWN.isDown)-Number(k.W.isDown||k.UP.isDown)});
    const s=run.state,p=s.player,g=this.ink;
    if(!this.manual)this.cameras.main.centerOn(p.x,p.y);
    g.clear();g.fillStyle(0xd6d0bb).fillRect(0,0,KILN_MAP.width,KILN_MAP.height);
    g.fillStyle(0xe5dfca).fillRect(120,80,KILN_MAP.width-240,KILN_MAP.height-200);
    for(const r of KILN_MAP.obstacles){g.fillStyle(0x737d72).fillRect(r.x,r.y,r.w,r.h);g.lineStyle(2,0x4d6056).strokeRect(r.x,r.y,r.w,r.h);}
    for(const [id,point,text] of [['west',KILN_WEST,'西院'],['east',KILN_EAST,'东端']] as const){g.fillStyle(0x708c75,.23).fillCircle(point.x,point.y,60);this.label(id,text,point.x,point.y-68);}
    for(const e of s.worlds.home)this.actor(e);
    g.fillStyle(0x284f48).fillCircle(p.x,p.y,17);g.lineStyle(3,0xe7e0bd).lineBetween(p.x,p.y,p.x+Math.cos(p.facing)*24,p.y+Math.sin(p.facing)*24);
    if(p.ward>0){g.lineStyle(4,0xd2b263).beginPath().arc(p.x,p.y,45,p.wardFacing-1.25,p.wardFacing+1.25).strokePath();}
    for(const shot of s.projectiles)g.fillStyle(shot.owner==='player'?0xe7a23b:0xbd6148).fillCircle(shot.x,shot.y,6);
    for(const e of s.events.filter(e=>s.time-e.time<.45&&e.x!==undefined&&['impact','fire','hurt','block'].includes(e.type))){g.lineStyle(3,e.type==='hurt'?0xb54e36:0xd9a144,1-(s.time-e.time)/.45).strokeCircle(e.x!,e.y!,12+(s.time-e.time)*30);}
    const latest=s.events.at(-1);if(latest&&latest.time>s.time-.15)say(latest.text);
    const text=`体力 ${p.hp}/4 · 灵力 ${p.mana}/6 · ${s.defeated?'已倒下':s.paused?'已暂停':aiming?'选术瞄准':'行走'} · ${run.returned?'已亲自往返':run.eastReached?'已抵东端，返回西院':'尚未抵达东端'}`;
    if(status.textContent!==text)status.textContent=text;
    const pause=document.querySelector<HTMLButtonElement>('[data-action="pause"]')!;pause.textContent=s.paused?'继续':'暂停';
  }
}
const game=new Phaser.Game({type:Phaser.AUTO,parent:'kiln-game',width:innerWidth*dpr,height:innerHeight*dpr,backgroundColor:'#d6d0bb',scale:{mode:Phaser.Scale.NONE,zoom:1/dpr},render:{antialias:true,roundPixels:false},scene:KilnScene});
const scene=()=>game.scene.getScene('kiln-whitebox') as KilnScene;
document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button=>button.addEventListener('click',()=>{preset=button.dataset.preset as KilnPreset;scene().reset();}));
document.querySelectorAll<HTMLButtonElement>('[data-spell]').forEach(button=>button.addEventListener('click',()=>select(button.dataset.spell as Spell)));
document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button=>button.addEventListener('click',()=>{
  switch(button.dataset.action){case'restart':scene().reset();break;case'walk':select(null);break;case'release':dispatch({type:'release'});select(null);break;case'pause':dispatch({type:'pause',value:!run.state.paused});break;case'center':scene().center();break;case'overview':scene().fullView();break;}
}));
// Pointer actions return keyboard control to the world; tab-focused buttons
// retain their native Space/Enter activation without also toggling the game.
document.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.addEventListener('click',event=>{if(event.detail>0)button.blur();}));
window.addEventListener('keydown',event=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)&&event.target===document.body)event.preventDefault();});
window.addEventListener('blur',()=>{dispatch({type:'pause',value:true});});
window.addEventListener('resize',()=>{dpr=density();game.scale.setZoom(1/dpr);game.scale.resize(innerWidth*dpr,innerHeight*dpr);});

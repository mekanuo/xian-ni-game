import Phaser from 'phaser';
import './spar.css';
import {Soundscape} from '../game/audio';
import {createSpar,installSparMap,sparAct,sparTick,SPAR_CENTER,type SparAction} from './spar-model';
installSparMap();let round=createSpar(),aim=false;
const node=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const audio=new Soundscape();audio.setScene('home');
const density=()=>Math.min(devicePixelRatio||1,3,Math.sqrt(5_000_000/(innerWidth*innerHeight)));
let dpr=density();
const outcomes={hit:'这一手碰到你了。先收势，体力不会自动恢复。',dodged:'这一发从身旁过去了，双脚仍在线内。',blocked:'护符正面承住了这一发，灵力已经用去。',stopped:'这一手已收。先前飞出的术法仍会留下真实结果。',outside:'双脚越线，这一手到此为止。'};
const say=(s:string)=>{node('notice').textContent=s;};
function dispatch(a:SparAction){void audio.start();const answer=sparAct(round,a);if(answer.message)say(answer.message);return answer;}
function mode(value:boolean){aim=value;node('ward').setAttribute('aria-pressed',String(value));node('walk').setAttribute('aria-pressed',String(!value));}
class SparScene extends Phaser.Scene{
 private ink!:Phaser.GameObjects.Graphics;private fx!:Phaser.GameObjects.Graphics;private player!:Phaser.GameObjects.Image;private peer!:Phaser.GameObjects.Image;
 private names!:Phaser.GameObjects.Text[];private keys!:Record<string,Phaser.Input.Keyboard.Key>;
 private usable={x:0,y:0,width:0,height:0};private lastSeq=0;private lastPhase='';private hitTime=-10;private blockTime=-10;
 constructor(){super('spar');}
 preload(){this.load.image('characters-source','art/characters.png');this.load.image('enemies-source','art/enemies.png');}
 private atlas(key:string,box:number[]){const source=this.textures.get(`${key}-source`).getSourceImage() as HTMLImageElement;
  const canvas=this.textures.createCanvas(key,source.width,source.height)!;const c=canvas.getContext();c.drawImage(source,0,0);
  const image=c.getImageData(0,0,source.width,source.height);
  for(let i=0;i<image.data.length;i+=4){const r=image.data[i],g=image.data[i+1],b=image.data[i+2],excess=Math.min(r-g,b-g);
   if(excess>85&&r>140&&b>140)image.data[i+3]=0;
   else if(excess>40&&r>120&&b>120){image.data[i+3]=Math.round(255*(85-excess)/45);image.data[i]=Math.min(r,g+40);image.data[i+2]=Math.min(b,g+40);}
   else if(excess>18){image.data[i]=Math.min(r,g+16);image.data[i+2]=Math.min(b,g+16);}}
  c.putImageData(image,0,0);canvas.refresh();canvas.add('body',0,box[0],box[1],box[2],box[3]);
 }
 create(){
  this.atlas('characters',[182,0,325,627]);this.atlas('enemies',[120,19,428,688]);
  this.ink=this.add.graphics();this.fx=this.add.graphics().setDepth(3000);this.player=this.add.image(0,0,'characters','body').setOrigin(.5,1).setDisplaySize(43,82);
  this.peer=this.add.image(0,0,'enemies','body').setOrigin(.5,1).setDisplaySize(51,82);
  this.names=['行舟','闻朔'].map(t=>this.add.text(0,0,t,{fontFamily:'serif',fontSize:'24px',color:'#e4e9cd',stroke:'#273b2f',strokeThickness:4}).setOrigin(.5,0));
  this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,THREE,ESC',false) as Record<string,Phaser.Input.Keyboard.Key>;
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{const x=p.x/dpr,y=p.y/dpr,u=this.usable;if(x<u.x||x>u.x+u.width||y<u.y||y>u.y+u.height)return;
   if(document.activeElement instanceof HTMLElement)document.activeElement.blur();const point=this.cameras.main.getWorldPoint(p.x,p.y);
   if(aim){if(dispatch({type:'cast',spell:'ward',point}).ok)mode(false);}else dispatch({type:'move',point});
  });
  this.scale.on('resize',()=>this.frame());this.frame();
  Object.defineProperty(window,'__SPAR__',{value:Object.freeze({inspect:()=>structuredClone(round),screenPoint:(x:number,y:number)=>this.screenPoint(x,y),
   view:()=>({usable:{...this.usable},zoom:this.cameras.main.zoom/dpr,dpr,player:this.screenPoint(round.s.player.x,round.s.player.y),peer:this.screenPoint(round.peer.x,round.peer.y)}),audio:()=>audio.inspect()}),configurable:true});
 }
 screenPoint(x:number,y:number){const c=this.cameras.main,o=c.getWorldPoint(c.x,c.y);return{x:(c.x+(x-o.x)*c.zoom)/dpr,y:(c.y+(y-o.y)*c.zoom)/dpr};}
 frame(){if(!this.cameras)return;const top=node('topbar').getBoundingClientRect().bottom+8,bottom=node('controls').getBoundingClientRect().top-8;
  this.usable={x:16,y:top,width:innerWidth-32,height:Math.max(80,bottom-top)};const u=this.usable,c=this.cameras.main;
  c.setViewport(u.x*dpr,u.y*dpr,u.width*dpr,u.height*dpr);c.setZoom(Math.min(1,u.width/600,u.height/560)*dpr);c.centerOn(900,880);
 }
 reset(){round=createSpar(Number(node<HTMLSelectElement>('mana').value));this.lastSeq=0;this.lastPhase='';this.hitTime=-10;this.blockTime=-10;this.clearKeys();mode(false);say('重建了公开合成初态，不读取或写入正式存档。');}
 clearKeys(){Object.values(this.keys??{}).forEach(k=>k.reset());}
 pause(){this.clearKeys();dispatch({type:'pause',value:!round.s.paused});}
 update(_time:number,delta:number){if(!this.ink)return;
  const form=document.activeElement?.tagName==='SELECT';
  if(!form&&Phaser.Input.Keyboard.JustDown(this.keys.SPACE))this.pause();
  if(!form&&Phaser.Input.Keyboard.JustDown(this.keys.THREE))mode(true);
  if(!form&&Phaser.Input.Keyboard.JustDown(this.keys.ESC))mode(false);
  const down=(k:string)=>this.keys[k].isDown?1:0;
  const input=form?{x:0,y:0}:{x:down('D')+down('RIGHT')-down('A')-down('LEFT'),y:down('S')+down('DOWN')-down('W')-down('UP')};
  sparTick(round,delta/1000,input);const s=round.s,p=s.player,e=round.peer,g=this.ink;
  for(const event of s.events.filter(e=>e.seq>this.lastSeq)){this.lastSeq=event.seq;
   if(event.type==='hurt'){this.hitTime=s.time;audio.play('hurt');say('碰到了，停下一次起手。');}
   if(event.type==='block'){this.blockTime=s.time;audio.play('block');}
   if(event.type==='ward')audio.play('ward');
   if(event.type==='warning')say('闻朔抬手了。看他出手时的方向，留好侧身的地方。');
  }
  if(this.lastPhase!==round.phase){this.lastPhase=round.phase;
   if(round.phase==='positioning')say('闻朔正在走到对面。你走进圆线，再按“就位”。');
   if(round.phase==='active')say('开始。只守这一手，踩出线便停。');
   if(round.phase==='settling')say('已经收手，还有先前这一发，避开再说。');
   if(round.phase==='result')say(outcomes[round.outcome!]);
  }
  node('round').textContent=round.phase==='positioning'?'就位':round.phase==='result'?'再约一手':'约一手';
  node('pause').textContent=s.paused?'恢复':'暂停';
  node('status').textContent=`体力 ${p.hp} / 4　灵力 ${p.mana} / 6　${s.paused?'已暂停':round.phase==='active'?'守线中':round.phase==='settling'?'余势未尽':round.phase==='result'?'这一手结束':'尚未开打'}`;
  g.clear();g.fillStyle(0x344439);g.fillRect(0,0,1800,1800);
  g.lineStyle(1,0x89947b,.12);for(let x=500;x<=1300;x+=40)g.lineBetween(x,540,x,1240);for(let y=540;y<=1240;y+=40)g.lineBetween(500,y,1300,y);
  g.fillStyle(0x84916b,.1);g.fillCircle(SPAR_CENTER.x,SPAR_CENTER.y,70);g.lineStyle(3,0xc9bb8c,.85);g.strokeCircle(SPAR_CENTER.x,SPAR_CENTER.y,70);
  g.lineStyle(2,0xa5ad8c,.5);g.strokeCircle(900,720,22);
  for(const who of [p,e]){g.fillStyle(0x13241c,.4);g.fillEllipse(who.x,who.y,44,15);}
  this.player.setPosition(p.x,p.y+4).setDepth(p.y).setFlipX(Math.cos(p.facing)<0);this.peer.setPosition(e.x,e.y+4).setDepth(e.y).setFlipX(p.x<e.x);
  this.player.setAngle(p.path.length||input.x||input.y?Math.sin(s.time*10)*1.6:0);this.peer.setAngle(e.state==='casting'?-7:0);
  if(s.time-this.hitTime<.2)this.player.setTintFill(0xf3c9ab);else this.player.clearTint();
  this.names[0].setPosition(p.x,p.y+12).setDepth(2000);this.names[1].setPosition(e.x,e.y-110).setDepth(2000);
  const fx=this.fx;fx.clear();
  if(e.state==='casting'){fx.fillStyle(0xf2c483,.35);fx.fillCircle(e.x+24,e.y-36,8+Math.sin(s.time*12)*2);fx.lineStyle(2,0xf4d5a0,.9);fx.strokeCircle(e.x+24,e.y-36,5);}
  if(p.ward>0){fx.lineStyle(5,0xa9d7be,.9);fx.beginPath();fx.arc(p.x,p.y,55,p.wardFacing-.85,p.wardFacing+.85);fx.strokePath();}
  for(const shot of s.projectiles){fx.fillStyle(0xe8b479,.16);fx.fillCircle(shot.x,shot.y,14);fx.fillStyle(0xf0c892);fx.fillCircle(shot.x,shot.y,6);fx.fillStyle(0xffecc1);fx.fillCircle(shot.x,shot.y,2);}
  if(s.time-this.blockTime<.3){fx.lineStyle(3,0xb8e9cb,1-(s.time-this.blockTime)/.3);fx.strokeCircle(p.x,p.y,30+(s.time-this.blockTime)*140);}
 }
}
const game=new Phaser.Game({type:Phaser.AUTO,parent:'spar-game',width:innerWidth*dpr,height:innerHeight*dpr,backgroundColor:'#26352f',scale:{mode:Phaser.Scale.NONE,zoom:1/dpr},render:{antialias:true,roundPixels:false},scene:SparScene});
const scene=()=>game.scene.getScene('spar') as SparScene;
node('round').onclick=()=>dispatch({type:round.phase==='positioning'?'begin':'agree'});
node('walk').onclick=()=>mode(false);node('ward').onclick=()=>{mode(true);say('点来袭方向撑起护符；侧后仍会被碰到。');};
node('stop').onclick=()=>dispatch({type:'stop'});node('pause').onclick=()=>scene().pause();node('restart').onclick=()=>scene().reset();
document.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.addEventListener('click',()=>button.blur()));
window.addEventListener('blur',()=>{scene()?.clearKeys();dispatch({type:'pause',value:true});});
window.addEventListener('keydown',e=>{if(e.code==='Space'&&e.target===document.body)e.preventDefault();});
window.addEventListener('resize',()=>{dpr=density();game.scale.setZoom(1/dpr);game.scale.resize(innerWidth*dpr,innerHeight*dpr);});
const resize=new ResizeObserver(()=>{if(scene()?.sys?.isActive())scene().frame();});resize.observe(node('topbar'));resize.observe(node('controls'));

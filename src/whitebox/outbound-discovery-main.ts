import Phaser from 'phaser';
import './outbound-discovery.css';
import {DISCOVERY_MAP,DISCOVERY_POINTS,installDiscoveryMap,createDiscovery,discoveryAct,discoveryTick,type DiscoveryAction} from './outbound-discovery-model';
installDiscoveryMap();let round=createDiscovery(),overview=false;
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const density=()=>Math.min(devicePixelRatio||1,3,Math.sqrt(5_000_000/(innerWidth*innerHeight)));let dpr=density();
const say=(text:string)=>{el('notice').textContent=text;};
// Local procedural ambience, solely for the spatial listening prototype.
// The gain comes from actual feet position; visits never drive the sound.
class WaterAmbience{
 context:AudioContext|null=null;wind:GainNode|null=null;water:GainNode|null=null;analyser:AnalyserNode|null=null;mix={wind:0,water:0};error:string|null=null;
 async start(){try{if(!this.context){const c=this.context=new AudioContext(),master=c.createGain();master.gain.value=.3;this.analyser=c.createAnalyser();master.connect(this.analyser);this.analyser.connect(c.destination);
  const buffer=c.createBuffer(1,c.sampleRate*4,c.sampleRate),data=buffer.getChannelData(0);let seed=931,last=0;
  for(let n=0;n<data.length;n++){seed=(Math.imul(seed,1664525)+1013904223)|0;last=(last+((seed>>>0)/4294967296*2-1)*.025)/1.025;data[n]=last*5;}
  for(const kind of ['wind','water'] as const){const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=buffer;source.loop=true;filter.type='bandpass';filter.frequency.value=kind==='wind'?1300:260;filter.Q.value=kind==='wind'?.55:1.25;gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(master);source.start();this[kind]=gain;}}
  await this.context.resume();}catch(e){this.error=String(e);}}
 update(x:number,y:number){const near=Math.max(0,1-Math.hypot(x-1760,y-1190)/820),upper=Math.max(0,1-Math.hypot(x-1550,y-500)/650);this.mix={water:.05+near*.85,wind:.16+upper*.54};if(this.context){this.water?.gain.setTargetAtTime(this.mix.water,this.context.currentTime,.3);this.wind?.gain.setTargetAtTime(this.mix.wind,this.context.currentTime,.3);}}
 inspect(){const values=new Float32Array(this.analyser?.fftSize||32);this.analyser?.getFloatTimeDomainData(values);return{state:this.context?.state??'not-started',...this.mix,rms:Math.sqrt(values.reduce((n,v)=>n+v*v,0)/values.length),error:this.error};}
}
const audio=new WaterAmbience();
function dispatch(action:DiscoveryAction){void audio.start();const result=discoveryAct(round,action);if(result.message)say(result.message);return result;}
class DiscoveryScene extends Phaser.Scene{
 ground!:Phaser.GameObjects.Graphics;water!:Phaser.GameObjects.TileSprite;flow!:Phaser.GameObjects.Graphics;player!:Phaser.GameObjects.Image;npc!:Phaser.GameObjects.Image;keys!:Record<string,Phaser.Input.Keyboard.Key>;
 usable={x:0,y:0,width:0,height:0};lastVisits='';lastPhase='';names:Phaser.GameObjects.Text[]=[];
 constructor(){super('outbound-discovery');}
 preload(){this.load.image('characters-source','art/characters.png');this.load.image('enemies-source','art/enemies.png');this.load.image('water-surface','art/water-surface.png');}
 atlas(key:string,box:number[]){const source=this.textures.get(`${key}-source`).getSourceImage() as HTMLImageElement,canvas=this.textures.createCanvas(key,source.width,source.height)!,context=canvas.getContext();context.drawImage(source,0,0);const image=context.getImageData(0,0,source.width,source.height);
  for(let i=0;i<image.data.length;i+=4){const r=image.data[i],g=image.data[i+1],b=image.data[i+2],excess=Math.min(r-g,b-g);if(excess>85&&r>140&&b>140)image.data[i+3]=0;else if(excess>40&&r>120&&b>120){image.data[i+3]=Math.round(255*(85-excess)/45);image.data[i]=Math.min(r,g+40);image.data[i+2]=Math.min(b,g+40);}else if(excess>18){image.data[i]=Math.min(r,g+16);image.data[i+2]=Math.min(b,g+16);}}
  context.putImageData(image,0,0);canvas.refresh();canvas.add('body',0,...box as [number,number,number,number]);}
 create(){this.atlas('characters',[182,0,325,627]);this.atlas('enemies',[120,19,428,688]);this.ground=this.add.graphics();this.paintGround();
  this.water=this.add.tileSprite(1800,40,360,1620,'water-surface').setOrigin(0).setAlpha(.68).setDepth(1);this.flow=this.add.graphics().setDepth(3);const banks=this.add.graphics().setDepth(2);banks.fillStyle(0x738573);banks.fillPoints([{x:1800,y:40},{x:1880,y:40},{x:1910,y:300},{x:1870,y:550},{x:1800,y:650}],true);banks.fillPoints([{x:2160,y:800},{x:2080,y:650},{x:2000,y:400},{x:1960,y:40},{x:2160,y:40}],true);banks.lineStyle(8,0xb1baa3).beginPath().moveTo(1880,40).lineTo(1910,300).lineTo(1870,550).lineTo(1800,650).strokePath();
  this.player=this.add.image(0,0,'characters','body').setOrigin(.5,1).setDisplaySize(43,82);this.npc=this.add.image(0,0,'enemies','body').setOrigin(.5,1).setDisplaySize(51,82);
  this.names=['行舟','岑舟'].map(t=>this.add.text(0,0,t,{fontFamily:'serif',fontSize:'20px',color:'#f5f0dc',stroke:'#344e42',strokeThickness:4}).setOrigin(.5,0));
  this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,C,E',false) as Record<string,Phaser.Input.Keyboard.Key>;
  this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{const x=p.x/dpr,y=p.y/dpr,u=this.usable;if(x<u.x||x>u.x+u.width||y<u.y||y>u.y+u.height)return;if(document.activeElement instanceof HTMLElement)document.activeElement.blur();const point=this.cameras.main.getWorldPoint(p.x,p.y);dispatch({type:'move',point});});
  this.scale.on('resize',()=>this.frame());this.frame();
  Object.defineProperty(window,'__DISCOVERY__',{value:Object.freeze({inspect:()=>structuredClone(round),screenPoint:(x:number,y:number)=>this.screenPoint(x,y),view:()=>({usable:{...this.usable},zoom:this.cameras.main.zoom/dpr,dpr,overview,player:this.screenPoint(round.s.player.x,round.s.player.y),npc:this.screenPoint(round.npc.x,round.npc.y)}),audio:()=>audio.inspect()}),configurable:true});}
 paintGround(){const g=this.ground;g.fillStyle(0x859276).fillRect(0,0,2200,1700);g.fillStyle(0xb8baa0).fillRect(40,40,1760,1620);
  // The pale route and the two stone shelves agree with actual walkable space.
  g.lineStyle(145,0xd4c9aa,1);g.beginPath();g.moveTo(250,1300);g.lineTo(650,1150);g.lineTo(1530,1190);g.strokePath();g.beginPath();g.moveTo(650,1150);g.lineTo(650,500);g.lineTo(1550,500);g.strokePath();
  g.fillStyle(0xd0cfb8).fillEllipse(1530,500,480,260);g.fillStyle(0xc0c3ad).fillEllipse(1510,1220,480,230);
  let seed=1841;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
  for(let i=0;i<540;i++){const x=50+rand()*1740,y=50+rand()*1600;g.fillStyle(i%3?0x889875:0xe0d5b8,.35).fillEllipse(x,y,7+rand()*16,4+rand()*10);}
  for(const rock of DISCOVERY_MAP.obstacles){g.fillStyle(0x344c42,.32).fillRect(rock.x+14,rock.y+24,rock.w,rock.h);g.fillStyle(0x778572).fillRect(rock.x,rock.y,rock.w,rock.h);g.fillStyle(0x9aa18b).fillRect(rock.x+4,rock.y+4,Math.max(1,rock.w-8),Math.min(45,rock.h-8));g.lineStyle(3,0xb7b8a0,.7).strokeRect(rock.x,rock.y,rock.w,rock.h);}
  // The river surface is not traversable. Its near-bank cavity is visible from below.
  g.fillStyle(0x4b7d7a).fillRect(1800,40,360,1620);g.fillStyle(0x314a43).fillEllipse(1798,1175,92,230);g.lineStyle(15,0xadb6a0).beginPath().moveTo(1787,1035).lineTo(1754,1090).lineTo(1754,1245).lineTo(1787,1300).strokePath();
  g.fillStyle(0x647761).fillEllipse(1130,1470,120,75);
 }
 screenPoint(x:number,y:number){const c=this.cameras.main,o=c.getWorldPoint(c.x,c.y);return{x:(c.x+(x-o.x)*c.zoom)/dpr,y:(c.y+(y-o.y)*c.zoom)/dpr};}
 frame(){if(!this.cameras)return;const top=el('topbar').getBoundingClientRect().bottom+8,bottom=el('controls').getBoundingClientRect().top-8;this.usable={x:0,y:top,width:innerWidth,height:Math.max(100,bottom-top)};const u=this.usable,c=this.cameras.main;c.setViewport(0,u.y*dpr,u.width*dpr,u.height*dpr);c.setZoom((overview?Math.min(u.width/2200,u.height/1700):Math.min(1,u.width<650?.82:.9))*dpr);c.setBounds(0,0,2200,1700);const focus=this.focus();c.centerOn(overview?1100:focus.x,overview?850:focus.y);}
 focus(){const p=round.s.player,near=Math.max(0,1-Math.min(Math.hypot(p.x-1550,p.y-500),Math.hypot(p.x-1530,p.y-1190))/350);return{x:p.x+175*near,y:p.y};}
 clearKeys(){Object.values(this.keys??{}).forEach(k=>k.reset());}
 pause(){this.clearKeys();dispatch({type:'pause',value:!round.s.paused});}
 reset(){round=createDiscovery();overview=false;this.lastVisits='';this.lastPhase='';this.clearKeys();this.frame();say('已重建独立小样初态。正式存档没有变化。');}
 update(_time:number,delta:number){if(!this.player)return;const down=(k:string)=>this.keys[k].isDown?1:0;if(Phaser.Input.Keyboard.JustDown(this.keys.SPACE))this.pause();if(Phaser.Input.Keyboard.JustDown(this.keys.C)){overview=!overview;this.frame();}if(Phaser.Input.Keyboard.JustDown(this.keys.E))dispatch({type:'talk'});
  discoveryTick(round,delta/1000,{x:down('D')+down('RIGHT')-down('A')-down('LEFT'),y:down('S')+down('DOWN')-down('W')-down('UP')});const s=round.s,p=s.player,n=round.npc;if(!overview&&!s.paused&&!s.dialogue){const focus=this.focus();this.cameras.main.centerOn(focus.x,focus.y);}
  this.player.setPosition(p.x,p.y).setDepth(p.y).setFlipX(Math.cos(p.facing)<0);this.npc.setPosition(n.x,n.y).setDepth(n.y).setFlipX(Math.cos(n.facing??0)<0);this.names[0].setPosition(p.x,p.y+9).setDepth(3000);this.names[1].setPosition(n.x,n.y+9).setDepth(3000);
  if(!s.paused&&!s.dialogue)this.water.tilePositionY=-s.time*12;this.flow.clear().lineStyle(3,0xd7e8d3,.6);for(let i=0;i<8;i++){const y=70+((s.time*45+i*193)%1560);const x=1930+Math.max(0,600-y)*.07;this.flow.beginPath().moveTo(x,y).lineTo(x-8,y+24).lineTo(x-15,y+45).strokePath();}this.flow.lineStyle(4,0xc5dfd0,.65);for(let i=0;i<5;i++){const a=s.time*1.2+i*Math.PI*.4;this.flow.beginPath().moveTo(1860+65*Math.cos(a),1180+42*Math.sin(a)).lineTo(1860+65*Math.cos(a+.45),1180+42*Math.sin(a+.45)).strokePath();}
  audio.update(p.x,p.y);const near=Math.hypot(p.x-n.x,p.y-n.y)<=100;el<HTMLButtonElement>('talk').disabled=!near||s.paused;el('pause').textContent=s.paused?'继续':'暂停';el('map').textContent=overview?'回到身边':'看全图';el('conversation').hidden=!s.dialogue;el('speech').textContent=s.dialogue?.text??'';const canSuggest=!!s.dialogue?.choices.some(c=>c.id==='suggest-upper'&&!c.disabled);el<HTMLButtonElement>('suggest').disabled=!canSuggest;el('suggest').hidden=!canSuggest;
  const place=Math.hypot(p.x-1550,p.y-500)<150?'上方石唇 · 河道沿山口向外':Math.hypot(p.x-1530,p.y-1190)<150?'近水湾 · 岩腔传回低沉水声':'山外小径';el('status').textContent=`${s.paused?'已暂停 · ':''}${place}${round.returned?' · 已沿来路返回':''}`;
  const visits=JSON.stringify(round.visits);if(visits!==this.lastVisits){if(round.visits.upper&&!JSON.parse(this.lastVisits||'{}').upper)say('从这里能看见河道绕出山口。水声已远，风从石唇上掠过。');else if(round.visits.lower)say('水在脚边岩腔里回卷。一路听到的轰鸣，原来就在这里。');this.lastVisits=visits;}
  if(round.npcPhase!==this.lastPhase){if(round.npcPhase==='walking-quiet'&&near)say('岑舟沿岸走向背水的岩侧。');if(round.npcPhase==='walking-upper'&&round.met)say('岑舟想亲自看看上方。他沿实际山径过去，不会瞬间到达。');this.lastPhase=round.npcPhase;}
 }
}
const scene=new DiscoveryScene();const game=new Phaser.Game({type:Phaser.AUTO,parent:'world',width:Math.round(innerWidth*dpr),height:Math.round(innerHeight*dpr),backgroundColor:'#718471',scene,render:{antialias:true,pixelArt:false},audio:{noAudio:true},scale:{mode:Phaser.Scale.NONE}});
el('talk').onclick=()=>dispatch({type:'talk'});el('leave').onclick=()=>dispatch({type:'leave'});el('suggest').onclick=()=>dispatch({type:'suggest-upper'});el('pause').onclick=()=>scene.pause();el('restart').onclick=()=>scene.reset();el('map').onclick=()=>{overview=!overview;scene.frame();};
addEventListener('resize',()=>{dpr=density();game.scale.resize(Math.round(innerWidth*dpr),Math.round(innerHeight*dpr));});addEventListener('blur',()=>{scene.clearKeys();if(!round.s.paused)dispatch({type:'pause',value:true});});

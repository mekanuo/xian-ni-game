import type Phaser from 'phaser';
import type {Entity,GameState} from './contracts';
import {SPAR_SCENE} from './spar-content';
import {SPAR_CENTER,SPAR_STANCES} from './spar-geometry';

/** Original Wen Shuo r2 master; scene keys its magenta RGB background first.
 * Source, rejected r1 and limits are recorded in SPAR_080_ASSET_DELIVERY.md. */
type Frame=[number,number,number,number];
type Pose='idle'|'walk'|'cast';
type Direction='front'|'back';
const FRAMES:Record<`${Direction}-${Pose}`,{rect:Frame;footX:number;footY:number}>={
 'front-idle':{rect:[184,22,214,493],footX:295,footY:513},
 'front-walk':{rect:[629,23,274,497],footX:766,footY:520},
 'front-cast':{rect:[1106,22,314,496],footX:1235,footY:516},
 'back-idle':{rect:[185,516,218,484],footX:297,footY:998},
 'back-walk':{rect:[645,520,240,487],footX:762,footY:1005},
 'back-cast':{rect:[1125,520,295,481],footX:1250,footY:999},
};
export function registerSparFrames(texture:Phaser.Textures.Texture):void{
 for(const [name,{rect}]of Object.entries(FRAMES))if(!texture.has(name))texture.add(name,0,...rect);
}
interface Motion{x:number;y:number;time:number;phase:number;moving:boolean;angle:number;back:boolean;left:boolean;}
export function createSparVisual(scene:Phaser.Scene,e:Entity):Phaser.GameObjects.Container|undefined{
 if(e.id!=='spar_peer'||!scene.textures.exists('spar-wenshuo'))return;
 const c=scene.add.container(0,0),shadow=scene.add.ellipse(0,3,30,9,0x3c493e,.19);
 const image=scene.add.image(0,5,'spar-wenshuo','front-idle');
 c.add([shadow,image]);c.setData('image',image);c.setData('shadow',shadow);return c;
}
export function updateSparVisual(c:Phaser.GameObjects.Container,e:Entity,s:GameState,reduced:boolean):void{
 if(e.id!=='spar_peer')return;const image=c.getData('image') as Phaser.GameObjects.Image|undefined;if(!image)return;
 let m=c.getData('motion') as Motion|undefined;const fresh=!m;
 const relative=Math.atan2(s.player.y-e.y,s.player.x-e.x);
 if(!m){m={x:e.x,y:e.y,time:s.time,phase:0,moving:false,angle:relative,back:false,left:false};c.setData('motion',m);}
 if(!fresh&&(s.paused||s.dialogue||s.defeated))return;
 if(s.time!==m.time){
  const dx=e.x-m.x,dy=e.y-m.y,d=Math.hypot(dx,dy);m.moving=d>.01;
  if(m.moving){m.phase+=Math.min(12,d)*.14;m.angle=Math.atan2(dy,dx);}
  m.x=e.x;m.y=e.y;m.time=s.time;
 }
 const r=s.spar.run;
 // Both positioning and an active sidestep animate only real displacement.
 // An explicit positioning wait keeps feet still; casting retains pose priority.
 const moving=m.moving&&(r?.phase==='active'||(r?.phase==='positioning'&&!r.positionWaiting));
 const casting=e.state==='casting'&&r?.phase==='active';
 // A completed approach can leave the model's last travel angle pointing away.
 // Resting / casting faces the actual partner; walking follows the actual delta.
 if(!moving||casting)m.angle=relative;
 const sy=Math.sin(m.angle),sx=Math.cos(m.angle);
 if(sy<-.15)m.back=true;else if(sy>.15)m.back=false;
 if(sx<-.08)m.left=true;else if(sx>.08)m.left=false;
 const pose:Pose=casting?'cast':moving?'walk':'idle',name=`${m.back?'back':'front'}-${pose}` as const,f=FRAMES[name];
 const anchor=(f.footX-f.rect[0])/f.rect[2];
 // The casting hand extends far to one side. Cropped-bbox centring would move
 // the actor's feet; the actual foot midpoint stays fixed, including on flip.
 image.setFrame(name).setFlipX(m.left).setOrigin(m.left?1-anchor:anchor,(f.footY-f.rect[1])/f.rect[3]);
 image.setDisplaySize(82*f.rect[2]/f.rect[3],82);
 const step=!reduced&&moving?Math.sin(m.phase):0;
 image.setPosition(0,5-Math.abs(step)*.45).setAngle(step*.65);
 c.setData('facing',m.angle);c.setData('pose',name);
}

type Rect={x:number;y:number;w:number;h:number};
function randomSource(seed:number):()=>number{return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function wash(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string,alpha:number):void{
 ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const gradient=ctx.createRadialGradient(0,0,0,0,0,1);
 gradient.addColorStop(0,color+alpha.toString(16).padStart(2,'0'));gradient.addColorStop(1,color+'00');ctx.fillStyle=gradient;ctx.fillRect(-1,-1,2,2);ctx.restore();
}
function floor(ctx:CanvasRenderingContext2D,source:CanvasImageSource,random:()=>number):void{
 ctx.fillStyle='#afb99f';ctx.fillRect(0,0,SPAR_SCENE.width,SPAR_SCENE.height);
 // The existing courtyard material supplies painted foliage and mineral detail;
 // a separately composed stone floor covers its old central courtyard pattern.
 ctx.save();ctx.globalAlpha=.48;ctx.drawImage(source,0,0,SPAR_SCENE.width,SPAR_SCENE.height);ctx.restore();
 wash(ctx,900,885,525,518,'#cbd2be',133);
 ctx.save();ctx.beginPath();ctx.rect(550,550,700,680);ctx.clip();ctx.fillStyle='#c6cbbd';ctx.fillRect(550,550,700,680);
 // Varied shallow stone joints remain planar: no raised edging or cover.
 let row=0;
 for(let y=551;y<1230;){
  const h=44+random()*20;
  for(let x=550-(row%2)*45;x<1250;){
   const w=76+random()*47,tone=Math.floor(random()*13);
   ctx.fillStyle=`rgb(${189+tone},${197+tone},${179+tone})`;ctx.beginPath();ctx.moveTo(x+3,y+2);ctx.lineTo(x+w-2,y+1);ctx.lineTo(x+w-1,y+h-3);ctx.lineTo(x+1,y+h-1);ctx.closePath();ctx.fill();
   ctx.save();ctx.globalAlpha=.22;ctx.drawImage(source,245+random()*95,220+random()*28,240,112,x+2,y+2,w-4,h-4);ctx.restore();
   ctx.strokeStyle='#65786722';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x+2,y+h-1);ctx.lineTo(x+w-1,y+h-3);ctx.lineTo(x+w-2,y+2);ctx.stroke();
   ctx.strokeStyle='#e4e8d748';ctx.beginPath();ctx.moveTo(x+2,y+h-3);ctx.lineTo(x+3,y+2);ctx.lineTo(x+w-4,y+1);ctx.stroke();x+=w;
  }
  y+=h;row++;
 }
 wash(ctx,900,940,170,145,'#e0ddc7',150);wash(ctx,894,721,111,82,'#dce0cf',108);
 wash(ctx,683,940,110,104,'#dce0cc',104);wash(ctx,1118,940,107,95,'#dbdec9',100);
 wash(ctx,897,1151,126,65,'#e0d9bf',91);
 // Broken foot-rubbed patches and a little mineral dust, not a route stripe.
 ctx.lineCap='round';
 for(let i=0;i<65;i++){const a=random()*Math.PI*2,rad=110+random()*128,x=900+Math.cos(a)*rad,y=941+Math.sin(a)*rad;ctx.strokeStyle=i%2?'#8f92712e':'#e7e5d252';ctx.lineWidth=.5+random()*.7;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+3,y+1,x+5+random()*5,y-.7);ctx.stroke();}
 ctx.restore();
 wash(ctx,900,1260,97,133,'#d6c9aa',145);
 for(const r of SPAR_SCENE.obstacles){
  if(r.h>r.w)for(let y=r.y+9;y<r.y+r.h;y+=47)wash(ctx,r.x+r.w+2,y,7,24,'#6a7e62',49);
  else for(let x=r.x+10;x<r.x+r.w;x+=49)wash(ctx,x,r.y+r.h+2,27,8,'#657860',51);
 }
 // Only one functional circle. Small station rubs below are never task slots.
 ctx.strokeStyle='#817d626b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(SPAR_CENTER.x,SPAR_CENTER.y,70,0,Math.PI*2);ctx.stroke();
 ctx.strokeStyle='#e5dab29c';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(SPAR_CENTER.x,SPAR_CENTER.y,70,0,Math.PI*2);ctx.stroke();
 for(const p of Object.values(SPAR_STANCES)){
  ctx.strokeStyle='#96977c7a';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(p.x-8,p.y+1);ctx.quadraticCurveTo(p.x-1,p.y-1,p.x+7,p.y);ctx.stroke();
  ctx.strokeStyle='#e4dfc29c';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(p.x-5,p.y-1);ctx.lineTo(p.x+3,p.y-2);ctx.stroke();
 }
}
function wall(ctx:CanvasRenderingContext2D,source:CanvasImageSource,r:Rect,random:()=>number):void{
 ctx.save();ctx.fillStyle='#43533d36';ctx.shadowColor='#35493435';ctx.shadowBlur=4;ctx.shadowOffsetX=2;ctx.shadowOffsetY=2;ctx.fillRect(r.x,r.y,r.w,r.h);ctx.shadowColor='transparent';
 ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h);ctx.clip();ctx.fillStyle='#87907a';ctx.fillRect(r.x,r.y,r.w,r.h);
 const vertical=r.h>r.w,top=vertical?14:12,face=vertical?r.w-top:r.h-top,length=vertical?r.h-14:r.w;
 for(let at=0;at<length;){
  const span=Math.min(29+random()*11,length-at),x=r.x+(vertical?0:at),y=r.y+(vertical?at:0),w=vertical?top:span,h=vertical?span:top;
  ctx.drawImage(source,667+Math.floor(random()*3)*174,635,146,77,x,y,w,h);ctx.fillStyle='#dbe0c33d';ctx.fillRect(x,y,w,h);at+=span;
 }
 if(vertical){
  for(let y=r.y;y<r.y+r.h;y+=42)ctx.drawImage(source,93+random()*250,602,123,137,r.x+top,y,face,Math.min(42,r.y+r.h-y));
  const shade=ctx.createLinearGradient(r.x+top,0,r.x+r.w,0);shade.addColorStop(0,'#34443618');shade.addColorStop(1,'#34443669');ctx.fillStyle=shade;ctx.fillRect(r.x+top,r.y,face,r.h);
  ctx.drawImage(source,95,635,230,113,r.x,r.y+r.h-14,r.w,14);ctx.fillStyle='#34473755';ctx.fillRect(r.x+top,r.y,1.2,r.h);
 }else{
  for(let x=r.x;x<r.x+r.w;x+=59)ctx.drawImage(source,83+random()*280,602,154,137,x,r.y+top,Math.min(59,r.x+r.w-x),face);
  const shade=ctx.createLinearGradient(0,r.y+top,0,r.y+r.h);shade.addColorStop(0,'#34443610');shade.addColorStop(1,'#34443666');ctx.fillStyle=shade;ctx.fillRect(r.x,r.y+top,r.w,face);ctx.fillStyle='#33453760';ctx.fillRect(r.x,r.y+top,r.w,1.1);
  // Weathered timber braces are embedded in existing wall faces, not new posts
  // or rails across the measured player and peer walking circuit.
  for(let x=r.x+5;x<r.x+r.w-5;x+=113)ctx.drawImage(source,655,84,36,281,x,r.y+top,7,face);
 }
 ctx.restore();
}
export function paintSparLandscape(scene:Phaser.Scene,landscape:Phaser.GameObjects.Container,_g:Phaser.GameObjects.Graphics):void{
 if(!scene.textures.exists('home-ground')||!scene.textures.exists('market-environment'))return;
 const key='spar-landscape';if(scene.textures.exists(key))scene.textures.remove(key);
 const texture=scene.textures.createCanvas(key,SPAR_SCENE.width*2,SPAR_SCENE.height*2);if(!texture)return;
 const ctx=texture.getContext();ctx.scale(2,2);ctx.imageSmoothingEnabled=true;const random=randomSource(8080);
 floor(ctx,scene.textures.get('home-ground').getSourceImage() as CanvasImageSource,random);
 const masonry=scene.textures.get('market-environment').getSourceImage() as CanvasImageSource;
 for(const r of SPAR_SCENE.obstacles)wall(ctx,masonry,r,random);
 texture.refresh();landscape.add(scene.add.image(0,0,key).setOrigin(0).setScale(.5));
 if(scene.textures.exists('environment'))for(const [x,y,w,h]of [[455,594,116,82],[1350,685,114,87],[455,1090,94,77],[1360,1130,112,80],[617,485,108,77],[1206,484,113,79]])landscape.add(scene.add.image(x,y,'environment','shrubs').setOrigin(.5,1).setDisplaySize(w,h));
}
/** Only the reported set can add this personal note. The current stance, run,
 * unreported facts and the waiting companion never mark the tabletop. */
export function drawSparHomeRecord(g:Phaser.GameObjects.Graphics,s:GameState):void{
 const reported=new Set(s.spar.reported);if(!reported.size)return;
 // The tabletop ends above the front apron. Keep this small note in its
 // upper-right free patch, clear of the route sheet and other actual records.
 const x=38,y=-62;
 g.fillStyle(0x3a4b3d,.15).fillRoundedRect(x+1,y+1,25,14,1);g.fillStyle(0xe8e0c6,.98).fillRoundedRect(x,y,25,14,1);g.lineStyle(.55,0xb9ae91,.65).strokeRoundedRect(x,y,25,14,1);
 for(const [stance,row]of [['front',3],['left',7],['right',11]] as const){
  if(!(['dodged','blocked','hit'] as const).some(outcome=>reported.has(`${stance}:${outcome}`)))continue;
  const lineY=y+row;
  g.lineStyle(.8,0x657c71,.87);g.beginPath();g.moveTo(x+4,lineY);g.lineTo(x+(stance==='front'?4:stance==='left'?2:6),lineY-1.5);g.strokePath();
  if(reported.has(`${stance}:dodged`)){g.lineBetween(x+8,lineY,x+10,lineY-1);g.lineBetween(x+10,lineY-1,x+12,lineY);}
  if(reported.has(`${stance}:blocked`)){g.beginPath();g.arc(x+16,lineY,1.4,-Math.PI*.65,Math.PI*.65);g.strokePath();}
  if(reported.has(`${stance}:hit`)){g.fillStyle(0x937b61,.88).fillCircle(x+21,lineY,.85);}
 }
}

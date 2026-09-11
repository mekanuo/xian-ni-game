import type Phaser from 'phaser';
import type {Entity,GameState} from './contracts';
import {MARKET_SCENE} from './market-content';

/** Original imagegen masters; RGB magenta atlases are keyed by scene.keyAtlas.
 * Source IDs, actual sizes and rendering limits: MARKET_070_ASSET_DELIVERY.md.
 * Coordinates here describe art only; MARKET_SCENE remains the sole geometry. */
type Frame=[number,number,number,number];
const ENVIRONMENT:Record<string,Frame>={
 roof:[54,19,526,479],facade:[647,73,568,416],wall:[29,532,578,291],
 coping:[649,623,567,105],counter:[33,858,574,330],parcels:[659,911,558,213],
};
const PROPS:Record<string,Frame>={
 closed:[259,18,165,448],open:[618,32,449,426],latch:[1250,221,380,182],
 crate:[164,495,582,343],burned:[943,563,667,274],
};
const SHENYAN:Record<string,Frame>={idle:[112,79,381,883],walking:[572,86,423,866],waiting:[1149,85,330,872]};
export function registerMarketFrames(environment:Phaser.Textures.Texture,props:Phaser.Textures.Texture,shenyan:Phaser.Textures.Texture):void{
 for(const [texture,frames]of [[environment,ENVIRONMENT],[props,PROPS],[shenyan,SHENYAN]] as const)
  for(const [name,rect]of Object.entries(frames))if(!texture.has(name))texture.add(name,0,...rect);
}
type Rect={x:number;y:number;w:number;h:number};
function randomSource(seed:number):()=>number{return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function wash(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string,alpha:number):void{
 ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const gradient=ctx.createRadialGradient(0,0,0,0,0,1);
 gradient.addColorStop(0,color+alpha.toString(16).padStart(2,'0'));gradient.addColorStop(1,color+'00');ctx.fillStyle=gradient;ctx.fillRect(-1,-1,2,2);ctx.restore();
}
function drawFrame(ctx:CanvasRenderingContext2D,source:CanvasImageSource,f:Frame,x:number,y:number,w:number,h:number):void{ctx.drawImage(source,...f,x,y,w,h);}
/** Flat silt and rubbed soil: broken short brush marks, never raised stones,
 * complete footprints or a continuous stripe indicating a selected route. */
function scuffedEarth(ctx:CanvasRenderingContext2D,random:()=>number,x:number,y:number,rx:number,ry:number,count:number):void{
 ctx.save();ctx.lineCap='round';
 for(let i=0;i<count;i++){
  const a=random()*Math.PI*2,r=Math.sqrt(random()),px=x+Math.cos(a)*rx*r,py=y+Math.sin(a)*ry*r,len=2+random()*10;
  ctx.strokeStyle=i%3?'#aa9d8030':'#eee6cf49';ctx.lineWidth=.4+random()*.9;ctx.beginPath();ctx.moveTo(px-len*.5,py);ctx.quadraticCurveTo(px,py+random()*2,px+len*.5,py-1);ctx.stroke();
 }
 ctx.restore();
}
function wallDamp(ctx:CanvasRenderingContext2D,r:Rect,random:()=>number):void{
 // Broken seepage is strongest at a masonry foot, with only a narrow soft stain
 // outside it. The colour is earth/lichen, not a new water or hazard boundary.
 const vertical=r.h>r.w;
 if(vertical){
  for(let at=12;at<r.h;at+=27+random()*38){
   const y=r.y+at;wash(ctx,r.x-2,y,5+random()*5,12+random()*17,'#66715b',32+Math.floor(random()*23));
   wash(ctx,r.x+r.w+2,y+7,5+random()*6,13+random()*14,'#72745a',39+Math.floor(random()*23));
  }
 }else for(let at=8;at<r.w;at+=29+random()*37)wash(ctx,r.x+at,r.y+r.h+2,14+random()*18,5+random()*6,'#68705b',38+Math.floor(random()*24));
}
function quietGround(ctx:CanvasRenderingContext2D,source:CanvasImageSource):void{
 const random=randomSource(7017);
 ctx.fillStyle='#d0cbba';ctx.fillRect(0,0,MARKET_SCENE.width,MARKET_SCENE.height);
 ctx.save();ctx.globalAlpha=.58;ctx.drawImage(source,0,0,MARKET_SCENE.width,MARKET_SCENE.height);ctx.restore();
 // Different scales of wear give the court a used surface. The bright rubs are
 // local patches, interrupted by mineral earth rather than joined as a route.
 wash(ctx,326,693,224,203,'#e2d9c1',85);wash(ctx,366,512,172,194,'#aa9b7d',38);
 wash(ctx,679,861,286,62,'#e9ddc1',156);wash(ctx,474,838,116,47,'#e7dac0',107);
 wash(ctx,857,824,125,59,'#c0ad87',75);wash(ctx,1030,727,127,199,'#d7cab0',101);
 wash(ctx,625,899,220,24,'#a49574',34);wash(ctx,950,422,124,135,'#91967b',49);
 wash(ctx,1218,538,63,221,'#e0d7bf',94);wash(ctx,1074,199,174,77,'#e1d8bf',90);
 wash(ctx,654,439,169,41,'#a2ac9a',61);wash(ctx,644,451,104,17,'#d6cbb2',75);
 // The merchant's worn standing area and dry goods sill belong together.
 wash(ctx,502,363,95,69,'#b69e76',93);wash(ctx,483,381,64,37,'#e6d5b6',126);
 wash(ctx,526,336,21,67,'#969274',49);
 for(const r of MARKET_SCENE.obstacles)wallDamp(ctx,r,random);
 // Cargo-house south feet retain a little windblown silt, spread outside the
 // solid wall as a flat stain. No crates or clutter occupy any turning space.
 for(const y of [380,780]){
  wash(ctx,657,y+4,112,12,'#8a896a',56);wash(ctx,565,y+7,32,10,'#b6a17a',48);
 }
 scuffedEarth(ctx,random,670,850,268,47,86);scuffedEarth(ctx,random,911,817,114,74,29);
 scuffedEarth(ctx,random,484,378,48,29,34);scuffedEarth(ctx,random,633,443,101,18,18);
 scuffedEarth(ctx,random,365,702,76,52,19);
 ctx.save();ctx.lineCap='round';
 // A handful of loose hemp fibres below the goods face, all at soil height.
 for(let i=0;i<22;i++){
  const x=497+random()*39,y=341+random()*54,len=2+random()*5;
  ctx.strokeStyle=i%3?'#aa936c77':'#e5d8b29c';ctx.lineWidth=.45+random()*.35;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+len*.5,y-1.2,x+len,y+.3);ctx.stroke();
 }
 ctx.restore();
}
/** Upright courses occupy most of each wall rectangle. Thin coping sits above
 * the face; no whole-height capstone strip can be mistaken for a walkable path. */
function masonry(ctx:CanvasRenderingContext2D,source:CanvasImageSource,r:Rect,random:()=>number):void{
 ctx.save();ctx.fillStyle='#4247373d';ctx.shadowColor='#404a3940';ctx.shadowBlur=3;ctx.shadowOffsetX=1.5;ctx.shadowOffsetY=1.5;ctx.fillRect(r.x,r.y,r.w,r.h);ctx.shadowColor='transparent';
 ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h);ctx.clip();ctx.fillStyle='#827f6e';ctx.fillRect(r.x,r.y,r.w,r.h);
 const vertical=r.h>r.w,side=vertical?r.w*.57:0,front=vertical?18:r.h*.64,topW=r.w-side,topH=r.h-front;
 const length=vertical?topH:topW;
 for(let at=0;at<length;){
  const span=Math.min(25+random()*13,length-at),x=r.x+(vertical?0:at),y=r.y+(vertical?at:0),w=vertical?topW:span,h=vertical?span:topH;
  ctx.drawImage(source,663+Math.floor(random()*3)*174,634,151,79,x+.3,y+.3,w-.6,h-.6);
  ctx.fillStyle='#d0cbb447';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#e2dcc076';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x+.6,y+h-.6);ctx.lineTo(x+.6,y+.6);ctx.lineTo(x+w-.6,y+.6);ctx.stroke();at+=span;
 }
 if(vertical){
  for(let y=r.y;y<r.y+topH;y+=13)ctx.drawImage(source,100+random()*210,620+Math.floor(random()*3)*38,112,34,r.x+topW,y,side,Math.min(13,r.y+topH-y));
  const shade=ctx.createLinearGradient(r.x+topW,0,r.x+r.w,0);shade.addColorStop(0,'#48473b22');shade.addColorStop(1,'#36403482');ctx.fillStyle=shade;ctx.fillRect(r.x+topW,r.y,side,topH);
 }
 for(let x=r.x;x<r.x+r.w;x+=45)ctx.drawImage(source,75+random()*320,602,123,137,x,r.y+topH,Math.min(45,r.x+r.w-x),front);
 const shade=ctx.createLinearGradient(0,r.y+topH,0,r.y+r.h);shade.addColorStop(0,'#4b4c3e15');shade.addColorStop(1,'#35403372');ctx.fillStyle=shade;ctx.fillRect(r.x,r.y+topH,r.w,front);
 ctx.fillStyle='#39413561';ctx.fillRect(r.x,r.y+topH,r.w,1.1);if(vertical)ctx.fillRect(r.x+topW,r.y,1.1,topH);
 // Moss is confined to actual masonry, never a new raised object in the lane.
 for(let i=0;i<(r.w+r.h)/45;i++){ctx.fillStyle=i%2?'#70795b5c':'#a3a08055';ctx.fillRect(r.x+r.w-2-random()*3,r.y+random()*r.h,1+random()*2,2+random()*2);}
 ctx.restore();
}
function cargoHouse(ctx:CanvasRenderingContext2D,source:CanvasImageSource,r:Rect,north:boolean):void{
 ctx.save();ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h);ctx.clip();
 const faceH=north?79:73,roofH=r.h-faceH+3;
 // The source roof has real transparent corners around its ridge. A whole-body
 // fill/shadow exposed an obvious grey rectangle above the south house. Cast
 // shadows from the actual painted silhouettes instead; never fill the atlas
 // bounding rectangle underneath them.
 ctx.shadowColor='#3543324d';ctx.shadowBlur=3;ctx.shadowOffsetX=1.5;ctx.shadowOffsetY=2;
 drawFrame(ctx,source,ENVIRONMENT.facade,r.x,r.y+r.h-faceH,r.w,faceH);
 drawFrame(ctx,source,ENVIRONMENT.roof,r.x,r.y,r.w,roofH);
 ctx.shadowColor='transparent';
 // A short recess under the eave and a darkened foot make the wall upright;
 // the texture above keeps its original uneven roof outline.
 ctx.fillStyle='#303e3457';ctx.fillRect(r.x+5,r.y+roofH-1,r.w-10,2);
 const foot=ctx.createLinearGradient(0,r.y+r.h-6,0,r.y+r.h);foot.addColorStop(0,'#3a463000');foot.addColorStop(1,'#3a46304a');ctx.fillStyle=foot;ctx.fillRect(r.x,r.y+r.h-6,r.w,6);
 if(north){
  // An inset goods face belongs to the existing building, wholly east of x540.
  ctx.fillStyle='#38433465';ctx.fillRect(r.x+1,r.y+r.h-63,78,59);
  drawFrame(ctx,source,ENVIRONMENT.counter,r.x+2,r.y+r.h-62,75,57);
  // Cloth abrasion stays on the existing sill. Blank scraps are not a sign or
  // interaction marker; the detailed goods remain the original atlas pixels.
  ctx.strokeStyle='#d8c49991';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(r.x+6,r.y+r.h-6);ctx.lineTo(r.x+61,r.y+r.h-6);ctx.stroke();
  ctx.strokeStyle='#83725461';ctx.lineWidth=.55;
  for(let i=0;i<7;i++){const x=r.x+9+i*9;ctx.beginPath();ctx.moveTo(x,r.y+r.h-5);ctx.lineTo(x+3,r.y+r.h-2);ctx.stroke();}
 }else{
  drawFrame(ctx,source,ENVIRONMENT.parcels,r.x+r.w-72,r.y+r.h-30,62,24);
 }
 ctx.restore();
}
export function paintMarketLandscape(scene:Phaser.Scene,landscape:Phaser.GameObjects.Container,_g:Phaser.GameObjects.Graphics):void{
 if(!scene.textures.exists('market-environment'))return;
 const key='market-landscape';if(scene.textures.exists(key))scene.textures.remove(key);
 const texture=scene.textures.createCanvas(key,MARKET_SCENE.width*2,MARKET_SCENE.height*2);if(!texture)return;
 const ctx=texture.getContext();ctx.scale(2,2);ctx.imageSmoothingEnabled=true;const random=randomSource(7070),source=scene.textures.get('market-environment').getSourceImage() as CanvasImageSource;
 if(scene.textures.exists('market-ground'))quietGround(ctx,scene.textures.get('market-ground').getSourceImage() as CanvasImageSource);
 for(const r of MARKET_SCENE.obstacles){
  if(r.x===540&&r.w===240)cargoHouse(ctx,source,r,r.y===80);else masonry(ctx,source,r,random);
 }
 texture.refresh();landscape.add(scene.add.image(0,0,key).setOrigin(0).setScale(.5));
 // The perimeter can reuse mature foliage; all centers are outside the court.
 if(scene.textures.exists('environment'))for(const [x,y,w,h]of [[35,340,68,55],[34,750,72,61],[1370,210,69,55],[1370,715,71,59],[315,26,116,36],[978,987,128,36]])landscape.add(scene.add.image(x,y,'environment','shrubs').setOrigin(.5,1).setDisplaySize(w,h));
}
interface MerchantMotion{x:number;y:number;time:number;phase:number;moving:boolean;}
export function createMarketVisual(scene:Phaser.Scene,e:Entity):Phaser.GameObjects.Container|undefined{
 if(!['market_merchant','market_door','decoy'].includes(e.id))return;
 const key=e.id==='market_merchant'?'market-shenyan':'market-props';if(!scene.textures.exists(key))return;
 const c=scene.add.container(0,0),shadow=scene.add.ellipse(0,4,e.id==='market_merchant'?29:42,e.id==='market_merchant'?9:10,0x344332,.15);
 const frame=e.id==='market_merchant'?'idle':e.id==='market_door'?'closed':'crate',image=scene.add.image(0,5,key,frame).setOrigin(.5,1);
 c.add([shadow,image]);c.setData('image',image);c.setData('shadow',shadow);
 const g=scene.add.graphics();c.add(g);c.setData('graphics',g);return c;
}
function merchant(c:Phaser.GameObjects.Container,e:Entity,s:GameState,image:Phaser.GameObjects.Image,reduced:boolean):void{
 let motion=c.getData('motion') as MerchantMotion|undefined;const fresh=!motion;
 if(!motion){motion={x:e.x,y:e.y,time:s.time,phase:0,moving:e.state==='leading'};c.setData('motion',motion);}
 const frozen=s.paused||!!s.dialogue||s.defeated;
 if(!fresh&&frozen)return;
 if(s.time!==motion.time){
  const moved=Math.hypot(e.x-motion.x,e.y-motion.y);motion.moving=e.state==='leading'&&moved>.01;
  if(motion.moving)motion.phase+=Math.min(12,moved)*.14;
  motion.x=e.x;motion.y=e.y;motion.time=s.time;
 }
 const pose=e.state==='waiting'?'waiting':e.state==='leading'&&motion.moving?'walking':'idle',rect=SHENYAN[pose];
 image.setFrame(pose).setDisplaySize(82*rect[2]/rect[3],82).setOrigin(.5,1);
 const facing=Math.cos(e.facing??0);if(facing<-.08)image.setFlipX(true);else if(facing>.08)image.setFlipX(false);
 const step=!reduced&&pose==='walking'?Math.sin(motion.phase):0;image.setPosition(0,5-Math.abs(step)*.6).setAngle(step*.8);
}
export function updateMarketVisual(c:Phaser.GameObjects.Container,e:Entity,s:GameState,reduced:boolean):void{
 const image=c.getData('image') as Phaser.GameObjects.Image|undefined,shadow=c.getData('shadow') as Phaser.GameObjects.Ellipse|undefined,g=c.getData('graphics') as Phaser.GameObjects.Graphics|undefined;if(!image||!shadow||!g)return;g.clear();
 if(e.id==='market_merchant'){merchant(c,e,s,image,reduced);return;}
 if(e.id==='market_door'){
  const open=e.state==='open';shadow.setVisible(false);image.setFrame(open?'open':'closed').setOrigin(open?0:.5,1).setPosition(open?-e.w/2:0,open?-e.h/2:e.h/2).setDisplaySize(open?100:e.w,open?50:e.h);
  // No animation or shadow remains across a passage that the model has opened.
  return;
 }
 if(e.id!=='decoy')return;
 const burned=e.state==='burned',burning=e.state==='burning',lifted=e.state==='held'||e.state==='pulled',frame=PROPS[burned?'burned':'crate'];
 image.setFrame(burned?'burned':'crate').setOrigin(.5,1).setDisplaySize(e.w,e.w*frame[3]/frame[2]).setPosition(0,e.h/2-(lifted?8:0));
 shadow.setPosition(0,e.h/2-3).setDisplaySize(lifted?34:44,lifted?7:9).setAlpha(burned?.4:lifted?.7:1);
 if(burning){
  const remaining=Math.max(0,Math.min(1,(e.timer??12)/12)),shade=Math.round(112+98*remaining);image.setTint((shade<<16)|((shade-9)<<8)|(shade-24));
  const phase=reduced?0:s.time*7;
  for(let i=0;i<4;i++){const x=-17+i*11,base=11+Math.sin(i)*2,h=7+(Math.sin(phase+i*1.8)+1)*3;g.fillStyle(0xbc713f,.66).fillEllipse(x,base-h*.3,8,h*1.3);g.fillStyle(0xe9bc73,.87).fillTriangle(x-2.5,base,x+3,base,x+Math.sin(phase+i),base-h);}
 }else image.clearTint();
}
/** A small personal paper slip is added once per route after face-to-face report.
 * Direction bits affect only the small entry/exit marks, never a second sheet or
 * shared witness. Unreported through/visit/exchanged facts cannot draw ink. */
export function drawMarketHomeRecord(g:Phaser.GameObjects.Graphics,s:GameState):void{
 const reported=s.market.reported,publicSeen=reported.public.westToEast||reported.public.eastToWest,privateSeen=reported.private.westToEast||reported.private.eastToWest;if(!publicSeen&&!privateSeen)return;
 g.fillStyle(0x344737,.16).fillRoundedRect(-35,-33,26,14,1);g.fillStyle(0xe5dec1,.97).fillRoundedRect(-36,-34,26,14,1);g.lineStyle(.6,0xb9ac8b,.7).strokeRoundedRect(-36,-34,26,14,1);
 for(const [route,y]of [['private',-31],['public',-27]] as const){
  const bits=reported[route];if(!bits.westToEast&&!bits.eastToWest)continue;
  g.lineStyle(.9,0x687c70,.88);g.beginPath();g.moveTo(-31,y+2);g.lineTo(-27,y+(route==='public'?4:0));g.lineTo(-20,y+(route==='public'?4:0));g.lineTo(-15,y+2);g.strokePath();
  if(bits.westToEast){g.lineBetween(-17,y,-15,y+2);g.lineBetween(-17,y+4,-15,y+2);}
  if(bits.eastToWest){g.lineBetween(-29,y,-31,y+2);g.lineBetween(-29,y+4,-31,y+2);}
 }
}

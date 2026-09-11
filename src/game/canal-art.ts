import Phaser from 'phaser';
import type {Entity,GameState} from './contracts';
import {CANAL_CHANNEL,CANAL_SIDE,type CanalRect} from './canal-content';
import {canalWaterState} from './canal';

type Frame=[number,number,number,number];
const ARCHITECTURE:Record<string,Frame>={shelter:[26,23,734,480],stopFrame:[835,186,645,308],diversion:[52,615,628,311],steps:[822,664,664,265]};
const PROPS:Record<string,Frame>={diverter:[38,125,346,136],stop:[441,68,374,228],screenBlocked:[872,44,350,291],screenClean:[31,416,351,291],tub:[430,438,395,246],wheel:[872,401,351,352],gauge:[121,797,146,404],keeper:[501,726,209,488],bucket:[923,828,239,354]};
const OBJECTS:Record<string,[string,number,number]>={canal_diverter:['diverter',70,28],canal_stop:['stop',70,43],canal_screen:['screenBlocked',76,63],canal_tub:['tub',108,67],canal_inspect:['gauge',24,66]};
const COVERS:[number,number][][]=[[[640,365],[755,365],[755,450]],[[680,326],[1199,326]],[[1240,350],[1240,430],[1125,430],[1125,460]],[[1125,620],[1125,700],[900,700],[900,850],[440,850],[440,898],[350,898]],[[755,630],[755,690],[810,690]]];
export function registerCanalFrames(architecture:Phaser.Textures.CanvasTexture,props:Phaser.Textures.CanvasTexture):void{
 for(const [name,b]of Object.entries(ARCHITECTURE))if(!architecture.has(name))architecture.add(name,0,...b);
 for(const [name,b]of Object.entries(PROPS))if(!props.has(name))props.add(name,0,...b);
}
function line(g:Phaser.GameObjects.Graphics,points:[number,number][],width:number,color:number,alpha=1):void{
 g.lineStyle(width,color,alpha);g.beginPath();g.moveTo(...points[0]);for(const p of points.slice(1))g.lineTo(...p);g.strokePath();
}
type StoneSource=CanvasImageSource;
function stoneRandom(seed:number):()=>number{return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function stoneOutline(ctx:CanvasRenderingContext2D,w:number,h:number,random:()=>number):void{
 ctx.beginPath();ctx.moveTo(-w/2+2,-h/2+random());ctx.lineTo(w/2-3,-h/2+random()*1.4);ctx.lineTo(w/2,-h/2+3);ctx.lineTo(w/2-1,h/2-2);ctx.lineTo(w/2-4,h/2);ctx.lineTo(-w/2+2,h/2-1);ctx.lineTo(-w/2,h/2-3);ctx.lineTo(-w/2+random(),-h/2+3);ctx.closePath();
}
/** Sample actual painted stone, not a new green flat-colour tile system. */
function stone(ctx:CanvasRenderingContext2D,source:StoneSource,x:number,y:number,w:number,h:number,random:()=>number,angle=0):void{
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);
 stoneOutline(ctx,w,h,random);ctx.fillStyle='#3e463743';ctx.shadowColor='#35443455';ctx.shadowBlur=2.4;ctx.shadowOffsetY=1.5;ctx.fill();ctx.shadowColor='transparent';
 ctx.save();ctx.clip();
 const sx=950+random()*210,sy=680+random()*10;
 ctx.drawImage(source,sx,sy,70+random()*45,22,-w/2,-h/2,w,h);
 ctx.globalAlpha=.08+random()*.08;ctx.fillStyle=random()>.5?'#e0d6b4':'#596452';ctx.fillRect(-w/2,-h/2,w,h);ctx.globalAlpha=1;
 for(let n=0;n<5;n++){ctx.fillStyle=n%2?'#3f514729':'#eeecd34c';ctx.fillRect((random()-.5)*w,(random()-.5)*h,.6+random(),.45+random()*.55);}
 if(random()<.4){ctx.strokeStyle='#4d594637';ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(-w*.15,-h/2);ctx.lineTo(-w*.09,-h*.08);ctx.lineTo(w*.05,h*.24);ctx.stroke();}
 ctx.restore();ctx.strokeStyle='#dddcc170';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(-w/2+3,-h/2+1.3);ctx.lineTo(w/2-4,-h/2+1);ctx.stroke();
 // Tiny interrupted moss pockets, never a continuous bright outline.
 if(random()<.36){ctx.fillStyle='#596b4657';ctx.beginPath();ctx.ellipse(w*.26,h*.4,1.5+random()*2.8,.6+random(),0,0,Math.PI*2);ctx.fill();}
 ctx.restore();
}
/** Discrete, slightly worn lids sit in the dirt; no continuous pipe or perimeter rails. */
function culvert(ctx:CanvasRenderingContext2D,source:StoneSource,points:[number,number][],random:()=>number):void{
 for(let i=1;i<points.length;i++){
  const [ax,ay]=points[i-1],[bx,by]=points[i],length=Math.hypot(bx-ax,by-ay),dx=(bx-ax)/length,dy=(by-ay)/length;
  for(let d=0;d<length;){const size=Math.min(24+random()*12,length-d);if(size<4)break;
   const center=d+size/2,jitter=(random()-.5)*1.5;stone(ctx,source,ax+dx*center-dy*jitter,ay+dy*center+dx*jitter,size-1,23+random()*4,random,Math.atan2(dy,dx));d+=size;
  }
 }
}
function bed(ctx:CanvasRenderingContext2D,source:StoneSource,r:CanalRect,random:()=>number):void{
 ctx.save();ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h);ctx.clip();
 // Warm mineral silt under irregular fieldstones preserves the painted ground's palette.
 ctx.fillStyle='#566050b8';ctx.fillRect(r.x,r.y,r.w,r.h);
 for(let row=0,y=r.y+2;y<r.y+r.h;y+=17,row++){
  for(let x=r.x-18*(row%2);x<r.x+r.w;){const w=22+random()*24,h=15+random()*3;stone(ctx,source,x+w/2,y+h/2,w-1.2,h,random);x+=w;}
 }
 for(let n=0;n<90;n++){ctx.fillStyle=n%3?'#77846626':'#d9d4b523';ctx.beginPath();ctx.ellipse(r.x+random()*r.w,r.y+random()*r.h,1+random()*3,.6+random(),random(),0,Math.PI*2);ctx.fill();}
 const shade=ctx.createLinearGradient(r.x,r.y,r.x,r.y+22);shade.addColorStop(0,'#253e425e');shade.addColorStop(1,'#253e4200');ctx.fillStyle=shade;ctx.fillRect(r.x,r.y,r.w,22);
 const side=ctx.createLinearGradient(r.x,r.y,r.x+r.w,r.y);side.addColorStop(0,'#394c453d');side.addColorStop(.12,'#394c4500');side.addColorStop(.88,'#394c4500');side.addColorStop(1,'#394c4530');ctx.fillStyle=side;ctx.fillRect(r.x,r.y,r.w,r.h);ctx.restore();
 const segments:[number,number,number,number][]=[[r.x,r.y,r.x+r.w,r.y],[r.x+r.w,r.y,r.x+r.w,r.y+r.h],[r.x+r.w,r.y+r.h,r.x,r.y+r.h],[r.x,r.y+r.h,r.x,r.y]];
 for(const [ax,ay,bx,by]of segments){const length=Math.hypot(bx-ax,by-ay),dx=(bx-ax)/length,dy=(by-ay)/length;
  for(let d=7;d<length-3;d+=18){const x=ax+dx*d,y=ay+dy*d;
   if(r===CANAL_CHANNEL&&((y===r.y&&Math.abs(x-1130)<43)||(x===r.x&&Math.abs(y-540)<35)||(x===r.x+r.w&&Math.abs(y-540)<35)))continue;
   if(r===CANAL_SIDE&&(x===r.x||x===r.x+r.w)&&Math.abs(y-540)<32)continue;
   stone(ctx,source,x,y,16+random()*3,9+random()*2,random,Math.atan2(dy,dx));
  }
 }
}
export function paintCanalLandscape(scene:Phaser.Scene,landscape:Phaser.GameObjects.Container,g:Phaser.GameObjects.Graphics):void{
 // Bake raster-sampled masonry once per landscape refresh. Runtime water remains separate.
 const source=scene.textures.get('canal-architecture-source').getSourceImage() as HTMLImageElement;
 const key='canal-masonry';if(scene.textures.exists(key))scene.textures.remove(key);
 const texture=scene.textures.createCanvas(key,2040,1320)!;
 const ctx=texture.getContext();ctx.scale(2,2);ctx.translate(-310,-300);const random=stoneRandom(404);
 COVERS.forEach(points=>culvert(ctx,source,points,random));bed(ctx,source,CANAL_CHANNEL,random);bed(ctx,source,CANAL_SIDE,random);
 // Existing side stair openings keep their exact foot geometry, now with the same stone texture.
 for(const [x,y]of [[1015,540],[1235,540],[685,540],[825,540]])for(let i=0;i<3;i++)stone(ctx,source,x-8+i*8,y,6.5,52,random);
 texture.refresh();landscape.add(scene.add.image(310,300,key).setOrigin(0).setScale(.5));
 if(!scene.textures.exists('canal-architecture'))return;
 for(const [frame,x,y,w,h]of [['shelter',355,930,410,268],['stopFrame',1240,350,155,74],['diversion',640,365,186,92],['steps',1130,465,84,34]] as [string,number,number,number,number][]){
  landscape.add(scene.add.image(x,y,'canal-architecture',frame).setOrigin(.5,1).setDisplaySize(w,h));
 }
 // Waterwheel axle support is stationary while the separately painted wheel turns.
 g.fillStyle(0x617565,.6);g.fillRoundedRect(425,917,30,9,3);line(g,[[431,923],[439,888],[447,923]],5,0x736b50,.95);
}
export function createCanalVisual(scene:Phaser.Scene,e:Entity):Phaser.GameObjects.Container|undefined{
 if(e.kind!=='object'||!e.id.startsWith('canal_')||!scene.textures.exists('canal-props'))return;
 const prop=OBJECTS[e.id];if(!prop&&!['canal_eye','canal_scent'].includes(e.id))return;
 const c=scene.add.container(0,0),shadow=scene.add.ellipse(0,4,Math.min(e.w,76),10,0x314c40,.14);c.add(shadow);
 if(prop){const image=scene.add.image(0,5,'canal-props',prop[0]).setOrigin(.5,1).setDisplaySize(prop[1],prop[2]);c.add(image);c.setData('image',image);}
 if(e.id==='canal_eye'&&scene.textures.exists('life-props')){
  const eye=scene.add.image(0,5,'life-props','practice').setOrigin(.5,1).setDisplaySize(35,29);c.add(eye);
  const clamp=scene.add.image(2,-4,'life-props','clamp').setDisplaySize(30,20).setVisible(false);c.add(clamp);c.setData('clamp',clamp);
 }
 if(e.id==='canal_scent'&&scene.textures.exists('life-props'))c.add(scene.add.image(0,5,'life-props','sachet').setOrigin(.5,1).setDisplaySize(27,36));
 if(e.id==='canal_tub'){
  const wheel=scene.add.image(89,-32,'canal-props','wheel').setDisplaySize(65,65),bucket=scene.add.image(-45,27,'canal-props','bucket').setOrigin(.5,1).setDisplaySize(30,44);
  c.add([wheel,bucket]);c.setData('wheel',wheel);c.setData('bucket',bucket);c.setData('wheelTime',null);c.setData('wheelAngle',0);
 }
 const graphics=scene.add.graphics();c.add(graphics);c.setData('graphics',graphics);return c;
}
export function updateCanalVisual(c:Phaser.GameObjects.Container,e:Entity,s:GameState,reduced:boolean):void{
 const g=c.getData('graphics') as Phaser.GameObjects.Graphics|undefined;if(!g)return;g.clear();
 const state=s.canal,mode=canalWaterState(s),image=c.getData('image') as Phaser.GameObjects.Image|undefined;
 if(e.id==='canal_screen'&&image){image.setFrame(state.cleared?'screenClean':'screenBlocked');image.setDisplaySize(76,63);}
 if(e.id==='canal_eye')(c.getData('clamp') as Phaser.GameObjects.Image|undefined)?.setVisible(s.life.clamp==='canal');
 if(e.id==='canal_diverter'||e.id==='canal_stop'){
  const installed=e.id==='canal_stop'&&s.life.clamp==='canal';if(installed)image?.setTint(0xc9d7bd);else image?.clearTint();
  if(installed){g.lineStyle(2,0x454f42,.8);g.strokeRoundedRect(-9,-16,18,10,2);}
 }
 const working=state.work&&(state.work.kind==='clear'?e.id==='canal_screen':e.id==='canal_diverter');
 if(working&&state.work){const progress=Math.min(1,state.work.elapsed/2);g.lineStyle(2,0x69846e,.3);g.strokeCircle(0,10,13);g.lineStyle(2.5,0xb5c9a0,.95);g.beginPath();g.arc(0,10,13,-Math.PI/2,-Math.PI/2+progress*Math.PI*2);g.strokePath();}
 if(e.id==='canal_inspect'){
  const water=1-state.drain;g.fillStyle(0x6eaaad,.9);g.fillRect(-7,-11-water*35,14,3);g.lineStyle(1,0xeff0d0,.9);g.lineBetween(-9,-11-water*35,9,-11-water*35);
 }
 if(e.id==='canal_tub'){
  const running=mode==='flowing'&&state.flow>=3,wheel=c.getData('wheel') as Phaser.GameObjects.Image,bucket=c.getData('bucket') as Phaser.GameObjects.Image;
  const last=c.getData('wheelTime') as number|null;let angle=c.getData('wheelAngle') as number;
  if(running&&!reduced&&last!==null&&!s.paused&&!s.dialogue&&!s.defeated)angle=(angle+Math.max(0,Math.min(.1,s.time-last))*42)%360;
  c.setData('wheelTime',s.time);c.setData('wheelAngle',angle);wheel.setAngle(reduced?0:angle);
  const moved=['verified','ready','complete'].includes(state.stage);bucket.setPosition(moved?-95:-45,moved?10:27);
  if(running){
   // Interior polygon follows the original trough's hollow, not its front wall.
   g.fillStyle(0x80a7a4,.8);g.fillPoints([{x:-36,y:-25},{x:-30,y:-43},{x:33,y:-43},{x:40,y:-25}],true);
   const phase=reduced?0:s.time*2;for(let i=0;i<3;i++){const y=-38+i*5,x=-22+Math.sin(phase+i)*3;line(g,[[x,y],[x+20,y-1]],1,0xe1e9d4,.55);}
   line(g,[[78,-12],[69,-6],[45,-26]],2,0x9cbbb0,.65);
  }
 }
 if(e.id==='canal_scent'&&s.life.scent?.scene==='canal'){
  const phase=reduced?.45:((8-s.life.scent.remaining)%1.8)/1.8;g.lineStyle(1,0xbac8a1,(1-phase)*.24);g.strokeEllipse(0,-3,30+phase*80,10+phase*28);
 }
}
function water(g:Phaser.GameObjects.Graphics,r:CanalRect,amount:number,time:number,reduced:boolean):void{
 if(amount<=0)return;
 // Translucent depth leaves the detailed stone bed visible instead of painting over it.
 g.fillStyle(0x507b83,.34*amount);g.fillRect(r.x,r.y,r.w,r.h);
 for(let i=0;i<10;i++){
  const inset=i*1.2;g.fillStyle(0x355e66,(.023-i*.0014)*amount);g.fillRect(r.x+inset,r.y+inset,r.w-inset*2,r.h-inset*2);
 }
 for(let i=0;i<8;i++){
  g.fillStyle(0x233e43,(.045-i*.0045)*amount);g.fillRect(r.x,r.y+i*1.8,r.w,1.8);
  g.fillStyle(0x97b7a5,(.032-i*.003)*amount);g.fillRect(r.x+3,r.y+r.h-3-i*2,r.w-6,2);
 }
 const phase=reduced?0:time*12;
 for(let row=0;row<5;row++)for(let col=0;col<3;col++){
  const x=r.x+11+col*(r.w-29)/3+Math.sin(row*4+col)*5,y=r.y+9+((row*29+phase+col*11)%(r.h-20)),length=9+(Math.sin(row+col*7)+1)*6;
  line(g,[[x,y],[x+length*.36,y-1.1],[x+length*.72,y-.6],[Math.min(r.x+r.w-6,x+length),y]],.7,0xd7e6d6,.25*amount);
 }
 // Broken foam and mineral reflections stay inside the wet boundary.
 for(let i=0;i<7;i++){const x=r.x+8+i*(r.w-18)/7,y=r.y+4+(i%3)*1.4;line(g,[[x,y],[x+3+(i%3)*2,y-.5]],.85,0xe3e5cd,.4*amount);}
}
/** Only renderer-owned graphics change here; all water and danger decisions remain in canal.ts. */
export function drawCanalWater(g:Phaser.GameObjects.Graphics,s:GameState,reduced:boolean):void{
 g.clear();if(s.scene!=='canal')return;
 const mode=canalWaterState(s),mainAmount=mode==='diverted'||mode==='stopped'?1-s.canal.drain:1;
 water(g,CANAL_CHANNEL,mainAmount,s.time,reduced);water(g,CANAL_SIDE,mode==='diverted'?1:0,s.time,reduced);
 // Small culvert sight slots suggest continuity beneath walkable stone covers.
 const sections:[number,number,boolean][]=[[1145,326,mode!=='stopped'],[1240,392,mode!=='stopped'],[1125,447,mainAmount>0],[755,411,mode==='diverted'],[1010,700,mode==='flowing'],[700,850,mode==='flowing'],[440,880,mode==='flowing']];
 for(const [x,y,flowing]of sections){g.fillStyle(0x465e56,.55);g.fillRoundedRect(x-6,y-3,12,6,2);if(flowing){const shift=reduced?0:Math.sin(s.time*3+x)*2;line(g,[[x-4,y+shift*.3],[x+4,y-shift*.3]],1,0xb4d2c1,.8);}}
 if(s.canal.surge!==null){
  const r=s.player.x>=CANAL_SIDE.x-17&&s.player.x<=CANAL_SIDE.x+CANAL_SIDE.w+17&&mode==='diverted'?CANAL_SIDE:CANAL_CHANNEL;
  const fraction=Math.min(1,s.canal.surge/1.2);g.fillStyle(0xe0c794,.12+fraction*.13);g.fillRect(r.x,r.y,r.w,Math.max(3,r.h*fraction));
  line(g,[[r.x+2,r.y+r.h*fraction],[r.x+r.w-2,r.y+r.h*fraction]],2,0xf1d4a2,.9);
 }
}
/** Local tabletop ornament. Completion and shared marks are historical model facts. */
export function drawCanalHomeRecord(g:Phaser.GameObjects.Graphics,s:GameState):void{
 if(s.canal.stage!=='complete')return;
 g.fillStyle(0x405344,.18);g.fillRoundedRect(23,-45,30,24,2);g.fillStyle(0xe1ddbd,.98);g.fillRoundedRect(21,-47,30,24,2);
 line(g,[[25,-41],[30,-38],[43,-40],[47,-32],[37,-28]],1,0x708b7e,.9);line(g,[[29,-44],[33,-35],[43,-29]],.8,0x557b79,.8);
 if(s.canal.sharedInspect&&s.canal.sharedVerify){g.fillStyle(0x916c50,.9);g.fillCircle(43,-40,1.3);g.fillCircle(37,-28,1.3);}
 if(s.life.clamp==='canal'){g.lineStyle(1,0x867855,.9);g.strokeCircle(47,-25,2);}
}

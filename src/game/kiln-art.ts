import type Phaser from 'phaser';
import type {Entity,GameState} from './contracts';
import {KILN_SCENE} from './kiln-content';

/** Original built-in imagegen masters, 2026-09-11. Raw RGB atlases use the same
 * magenta key as the existing game. The scene loads *-source and applies keyAtlas
 * before registering these frames. Ground is a flat material, never map geometry.
 * Sources: environment exec-cdd37f08; props exec-aeb8ddf5;
 * Du Qin exec-d7c8c1af; ground exec-a90f80fc (full source IDs in root handover).
 */
type Frame=[number,number,number,number];
const ENVIRONMENT:Record<string,Frame>={
 face:[39,34,695,425],coping:[791,107,695,292],
 awning:[70,474,624,508],rack:[801,527,665,447],
};
const PROPS:Record<string,Frame>={screen:[27,290,748,340],burned:[782,431,726,236]};
const DUQIN:Frame=[387,90,445,1108];
export function registerKilnFrames(environment:Phaser.Textures.Texture,props:Phaser.Textures.Texture,duqin:Phaser.Textures.Texture):void{
 for(const [name,rect]of Object.entries(ENVIRONMENT))if(!environment.has(name))environment.add(name,0,...rect);
 for(const [name,rect]of Object.entries(PROPS))if(!props.has(name))props.add(name,0,...rect);
 if(!duqin.has('duqin'))duqin.add('duqin',0,...DUQIN);
}
function randomSource(seed:number):()=>number{return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function wash(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string,alpha:number):void{
 ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);const gradient=ctx.createRadialGradient(0,0,0,0,0,1);
 gradient.addColorStop(0,color+alpha.toString(16).padStart(2,'0'));gradient.addColorStop(1,color+'00');ctx.fillStyle=gradient;ctx.fillRect(-1,-1,2,2);ctx.restore();
}
type Rect={x:number;y:number;w:number;h:number};
/** Coping and upright masonry have different scale, value and orientation.
 * The entire body remains clipped to its actual obstacle; only soft shadow falls
 * outside. In particular the north approach and southern gaps never gain a wall. */
function wall(ctx:CanvasRenderingContext2D,source:CanvasImageSource,r:Rect,random:()=>number,vent:boolean):void{
 ctx.save();
 ctx.fillStyle='#41463850';ctx.shadowColor='#303a315c';ctx.shadowBlur=8;ctx.shadowOffsetX=5;ctx.shadowOffsetY=5;ctx.fillRect(r.x+.6,r.y+.6,r.w-1.2,r.h-1.2);ctx.shadowColor='transparent';
 ctx.beginPath();ctx.rect(r.x,r.y,r.w,r.h);ctx.clip();
 ctx.fillStyle='#696855';ctx.fillRect(r.x,r.y,r.w,r.h);
 const vertical=r.h>r.w,side=vertical?Math.round(r.w*.56):5;
 const front=vertical?(vent?37:25):Math.round(r.h*.6),topWidth=r.w-side,topHeight=r.h-front;
 // Small coping units are a narrow lit crown, no longer the whole visible wall.
 const length=vertical?topHeight:topWidth;
 for(let offset=0;offset<length;){
  const span=Math.min(21+random()*12,length-offset),sx=802+Math.floor(random()*4)*130,sy=112+Math.floor(random()*3)*86;
  const x=vertical?r.x:r.x+offset,y=vertical?r.y+offset:r.y,w=vertical?topWidth:span,h=vertical?span:topHeight;
  ctx.drawImage(source,sx,sy,116,75,x+.5,y+.5,w-1,h-1);
  ctx.fillStyle='#b9af9340';ctx.fillRect(x+.5,y+.5,w-1,h-1);
  ctx.strokeStyle='#ebe0be8a';ctx.lineWidth=.75;ctx.beginPath();ctx.moveTo(x+1.5,y+h-1.5);ctx.lineTo(x+1.5,y+1.5);ctx.lineTo(x+w-1.5,y+1.5);ctx.stroke();
  if(random()<.35){ctx.strokeStyle='#484d4055';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(x+w*.6,y);ctx.lineTo(x+w*.5,y+h*.3);ctx.lineTo(x+w*.62,y+h*.55);ctx.stroke();}
  offset+=span;
 }
 // Fired-brick face courses stay small and run horizontally. The former 9px
 // side was mostly invisible at game scale and read like a flat flagstone path.
 const faceX=r.x+topWidth;
 for(let y=r.y;y<r.y+topHeight;y+=13){
  const h=Math.min(13,r.y+topHeight-y),sx=415+random()*165,sy=45+Math.floor(random()*4)*29;
  ctx.drawImage(source,sx,sy,145,54,faceX,y,side,h);
 }
 const shade=ctx.createLinearGradient(faceX,0,r.x+r.w,0);shade.addColorStop(0,'#4c46392b');shade.addColorStop(.35,'#49453860');shade.addColorStop(1,'#2c373384');ctx.fillStyle=shade;ctx.fillRect(faceX,r.y,side,topHeight);
 // The south-facing end has its own stacked courses and a bricked-up kiln vent.
 for(let y=r.y+topHeight;y<r.y+r.h;y+=11)for(let x=r.x;x<r.x+r.w;x+=42){
  const w=Math.min(42,r.x+r.w-x),h=Math.min(11,r.y+r.h-y);ctx.drawImage(source,425+random()*90,45+Math.floor(random()*4)*29,155,40,x,y,w,h);
 }
 if(vent)ctx.drawImage(source,162,231,224,179,r.x+3,r.y+topHeight+2,r.w-6,front-3);
 const foot=ctx.createLinearGradient(0,r.y+r.h-12,0,r.y+r.h);foot.addColorStop(0,'#2b373200');foot.addColorStop(1,'#2b37327a');ctx.fillStyle=foot;ctx.fillRect(r.x,r.y+r.h-12,r.w,12);
 // Coping lip casts a fine occlusion edge on the upright face, not a UI outline.
 ctx.fillStyle='#303c344d';ctx.fillRect(faceX,r.y,1.6,topHeight);ctx.fillRect(r.x,r.y+topHeight,r.w,1.6);
 ctx.strokeStyle='#ded1b0b3';ctx.lineWidth=.85;ctx.beginPath();ctx.moveTo(r.x+1,r.y+1);ctx.lineTo(faceX-.7,r.y+1);ctx.lineTo(faceX-.7,r.y+topHeight-.6);ctx.stroke();
 for(let i=0;i<Math.ceil((r.w+r.h)/27);i++){
  const y=r.y+random()*r.h;ctx.fillStyle=i%3?'#5260447a':'#aaa68066';ctx.fillRect(r.x+r.w-1-random()*3,y,.8+random()*2,1+random()*3);
 }
 ctx.restore();
}
function quietGround(ctx:CanvasRenderingContext2D,source:CanvasImageSource):void{
 const w=KILN_SCENE.width,h=KILN_SCENE.height;
 ctx.fillStyle='#cbc8b5';ctx.fillRect(0,0,w,h);
 // This source contains flat soil only. Half-size mirrored sampling makes chips
 // fine enough to sit behind actors; matched edges prevent a tiled seam.
 ctx.save();ctx.globalAlpha=.55;
 for(let row=0;row<2;row++)for(let col=0;col<2;col++){
  ctx.save();ctx.translate(col?w:0,row?h:0);ctx.scale(col?-1:1,row?-1:1);ctx.drawImage(source,0,0,w/2,h/2);ctx.restore();
 }
 ctx.restore();
 // Worn ground is broad and irregular, with no line promising a safe route.
 wash(ctx,300,475,230,330,'#e3d5ba',106);
 for(const [x,y,rx,ry]of [[440,800,315,91],[1035,808,320,87],[700,147,475,92],[1249,550,95,270],[320,698,129,110]])wash(ctx,x,y,rx,ry,'#e1d5bd',97);
 for(const [x,y,rx,ry]of [[720,426,190,260],[1110,635,140,115],[380,177,160,95]])wash(ctx,x,y,rx,ry,'#80917c',35);
 // Clay-wiped working ground binds the rack and potter together without placing
 // any new raised tool, crate or mat across the measured western approach.
 wash(ctx,213,584,97,72,'#e4d0af',108);wash(ctx,272,616,107,53,'#aa9373',27);
 wash(ctx,270,401,107,44,'#817f67',34);
}

export function paintKilnLandscape(scene:Phaser.Scene,landscape:Phaser.GameObjects.Container,_g:Phaser.GameObjects.Graphics):void{
 if(!scene.textures.exists('kiln-environment'))return;
 const key='kiln-masonry';if(scene.textures.exists(key))scene.textures.remove(key);
 const texture=scene.textures.createCanvas(key,KILN_SCENE.width*2,KILN_SCENE.height*2);if(!texture)return;
 const ctx=texture.getContext();ctx.scale(2,2);const random=randomSource(6060);
 if(scene.textures.exists('kiln-ground'))quietGround(ctx,scene.textures.get('kiln-ground').getSourceImage() as CanvasImageSource);
 // Coping and face material follow exactly the shared collision rectangles.
 for(const r of KILN_SCENE.obstacles){
  wall(ctx,scene.textures.get('kiln-environment').getSourceImage() as CanvasImageSource,r,random,r.x===500&&r.y===220);
 }
 texture.refresh();landscape.add(scene.add.image(0,0,key).setOrigin(0).setScale(.5));
 if(scene.textures.exists('kiln-environment')){
  // Front feet extend past the actual rest point (260,400); the cloth front
  // remains north of it. Du Qin at y560 and arrival at y480 stay unobscured.
  landscape.add(scene.add.image(275,445,'kiln-environment','awning').setOrigin(.5,1).setDisplaySize(216,176));
  // Against the western wall, clear of Du Qin's feet and the measured courtyard route.
  landscape.add(scene.add.image(156,625,'kiln-environment','rack').setOrigin(.5,1).setDisplaySize(64,43));
 }
 // Existing painted plants live wholly outside the enclosing wall footprints.
 // They frame the yard without inventing collisions on any interior path.
 if(scene.textures.exists('environment'))for(const [x,y,w,h]of [[30,245,76,54],[35,692,78,58],[1422,230,68,55],[1420,788,76,54],[353,32,134,48],[1100,978,138,52]]){
  landscape.add(scene.add.image(x,y,'environment','shrubs').setOrigin(.5,1).setDisplaySize(w,h));
 }
}

/** Call only for the kiln scene. Visuals are local to the actual entity x/y. Du Qin
 * owns an independent frame; enemies and exit signs stay in the shared renderer. */
export function createKilnVisual(scene:Phaser.Scene,e:Entity):Phaser.GameObjects.Container|undefined{
 if(!['shield_board','duqin','kiln_rest'].includes(e.id))return;
 const key=e.id==='duqin'?'kiln-duqin':e.id==='kiln_rest'?'detail-props':'kiln-props';if(!scene.textures.exists(key))return;
 const c=scene.add.container(0,0),shadow=scene.add.ellipse(0,4,e.id==='duqin'?33:87,e.id==='duqin'?11:12,0x354539,.15);c.add(shadow);c.setData('shadow',shadow);
 if(e.id==='duqin'){
  const image=scene.add.image(0,5,'kiln-duqin','duqin').setOrigin(.5,1).setDisplaySize(445/1108*78,78);c.add(image);c.setData('image',image);
 }else if(e.id==='kiln_rest'){
  const image=scene.add.image(0,14,'detail-props','rest').setOrigin(.5,1).setDisplaySize(64,64*305/399);c.add(image);c.setData('image',image);shadow.setVisible(false);
 }else if(e.id==='shield_board'){
  const image=scene.add.image(0,e.h/2,'kiln-props','screen').setOrigin(.5,1).setDisplaySize(e.w,e.w*340/748);c.add(image);c.setData('image',image);
 }
 const graphics=scene.add.graphics();c.add(graphics);c.setData('graphics',graphics);return c;
}
export function updateKilnVisual(c:Phaser.GameObjects.Container,e:Entity,s:GameState,reduced:boolean):void{
 const g=c.getData('graphics') as Phaser.GameObjects.Graphics|undefined;if(!g)return;g.clear();
 const image=c.getData('image') as Phaser.GameObjects.Image|undefined,shadow=c.getData('shadow') as Phaser.GameObjects.Ellipse;
 if(e.id==='duqin'){image?.setFlipX(Math.cos(e.facing??0)<0);return;}
 if(e.id==='kiln_rest'){const available=s.kiln.shelterOpened&&e.state!=='hidden';c.setVisible(available);shadow.setVisible(false);return;}
 if(e.id!=='shield_board'||!image)return;
 const burned=e.state==='burned',burning=e.state==='burning',lifted=e.state==='pulled'||e.state==='held';
 image.setFrame(burned?'burned':'screen').setOrigin(.5,1).setDisplaySize(e.w,burned?e.w*236/726:e.w*340/748).setPosition(0,burned?e.h/2:lifted?e.h/2-8:e.h/2);
 shadow.setPosition(0,e.h/2-3).setDisplaySize(lifted?74:88,lifted?9:12).setAlpha(burned?.3:lifted?.55:1);
 if(burning){
  const remaining=Math.max(0,Math.min(1,(e.timer??12)/12));const dark=Math.round(110+100*remaining);image.setTint((dark<<16)|((dark-10)<<8)|(dark-25));
  const phase=reduced?0:s.time*7;
  for(let i=0;i<5;i++){const x=-36+i*18,base=8+Math.sin(i*2)*4,h=9+(Math.sin(phase+i*1.8)+1)*4;
   g.fillStyle(0xbe713f,.7).fillEllipse(x,base-h*.35,10,h*1.35);g.fillStyle(0xebbb69,.86).fillTriangle(x-3,base,x+4,base,x+Math.sin(phase+i)*2,base-h);
  }
 }else image.clearTint();
}

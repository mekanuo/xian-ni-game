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
/** Covered culverts read as flat paving, so permanent paths never resemble blocked rivers. */
function culvert(g:Phaser.GameObjects.Graphics,points:[number,number][]):void{
 line(g,points,23,0x52665c,.22);line(g,points,19,0xc4c4ad,.94);line(g,points,14,0xa1aa99,.82);
 for(let i=1;i<points.length;i++){
  const [ax,ay]=points[i-1],[bx,by]=points[i],length=Math.hypot(bx-ax,by-ay),dx=(bx-ax)/length,dy=(by-ay)/length;
  for(let d=8;d<length;d+=23){const x=ax+dx*d,y=ay+dy*d;line(g,[[x-dy*7,y+dx*7],[x+dy*7,y-dx*7]],1,0x65776c,.7);line(g,[[x-dy*6+dx*2,y+dx*6+dy*2],[x+dy*6+dx*2,y-dx*6+dy*2]],1,0xe4e3c8,.7);}
 }
}
function bed(g:Phaser.GameObjects.Graphics,r:CanalRect):void{
 g.fillStyle(0x4c655d,.2);g.fillRect(r.x-5,r.y-5,r.w+10,r.h+12);
 g.fillStyle(0x94a69a,.84);g.fillRect(r.x,r.y,r.w,r.h);
 for(let row=0,y=r.y+2;y<r.y+r.h-2;row++,y+=18){
  for(let x=r.x+2-(row%2)*14;x<r.x+r.w-2;x+=30){
   const left=Math.max(r.x+2,x),right=Math.min(r.x+r.w-2,x+27),h=Math.min(15,r.y+r.h-y-2);if(right<=left||h<=0)continue;
   g.fillStyle((row+Math.floor(x/30))%3===0?0xb7c0ac:0xa4b5a4,.75);g.fillRoundedRect(left,y,right-left,h,2);
   line(g,[[left+2,y+1],[right-2,y+1]],.7,0xe4e4ce,.55);
  }
 }
 // Low banks use exactly the water footprint, with openings at the actual stair approaches.
 const segments:[number,number,number,number][]=[[r.x,r.y,r.x+r.w,r.y],[r.x+r.w,r.y,r.x+r.w,r.y+r.h],[r.x+r.w,r.y+r.h,r.x,r.y+r.h],[r.x,r.y+r.h,r.x,r.y]];
 for(const [ax,ay,bx,by]of segments){const length=Math.hypot(bx-ax,by-ay),dx=(bx-ax)/length,dy=(by-ay)/length;
  for(let d=5;d<length;d+=19){const x=ax+dx*d,y=ay+dy*d;
   if(r===CANAL_CHANNEL&&((y===r.y&&Math.abs(x-1130)<43)||(x===r.x&&Math.abs(y-540)<35)||(x===r.x+r.w&&Math.abs(y-540)<35)))continue;
   if(r===CANAL_SIDE&&(x===r.x||x===r.x+r.w)&&Math.abs(y-540)<32)continue;
   g.fillStyle(0x586f60,.6);g.fillRoundedRect(x-7,y-3,15,9,2);g.fillStyle(0xc0c4ac,.95);g.fillRoundedRect(x-7,y-5,15,7,2);line(g,[[x-5,y-4],[x+5,y-4]],.8,0xe4e3c8,.8);
  }
 }
}
export function paintCanalLandscape(scene:Phaser.Scene,landscape:Phaser.GameObjects.Container,g:Phaser.GameObjects.Graphics):void{
 COVERS.forEach(points=>culvert(g,points));bed(g,CANAL_CHANNEL);bed(g,CANAL_SIDE);
 // Flat landing treads at side entrances retain the map's real east/west access.
 for(const [x,y]of [[1015,540],[1235,540],[685,540],[825,540]])for(let i=0;i<3;i++){
  g.fillStyle(0xd0cfb5,.75);g.fillRoundedRect(x-12+i*8,y-27,7,54,1);line(g,[[x-12+i*8,y-26],[x-12+i*8,y+26]],1,0x617b6a,.6);
 }
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
 g.fillStyle(0x668f94,.65*amount);g.fillRect(r.x,r.y,r.w,r.h);
 g.fillStyle(0x94b5a8,.23*amount);g.fillRect(r.x+5,r.y+2,r.w-10,Math.max(1,r.h*.28));
 const phase=reduced?0:time*15;
 for(let row=0;row<6;row++)for(let col=0;col<3;col++){
  const x=r.x+12+col*(r.w-28)/3+Math.sin(row*4+col)*4,y=r.y+7+((row*25+phase+col*7)%(r.h-14));
  line(g,[[x,y],[x+9,y-1],[Math.min(r.x+r.w-7,x+20),y]],.9,0xd3e5d4,.45*amount);
 }
 line(g,[[r.x+2,r.y+3],[r.x+r.w-3,r.y+3]],1.5,0xe2e5cc,.6*amount);
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

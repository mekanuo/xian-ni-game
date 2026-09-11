import type Phaser from 'phaser';
import type {Entity,GameState,JourneyRoute} from './contracts';

export interface GuideMotion {x:number;y:number;time:number;step:number;angle:number;}
/** Renderer memory only: model movement/facing remain authoritative. */
export function guideAngle(e:Entity,s:GameState,m:GuideMotion,reduced:boolean):number|undefined{
 const guiding=e.type==='xu'&&(e.state==='leading'||e.state==='waiting');
 if(!guiding){m.x=e.x;m.y=e.y;m.time=s.time;m.step=0;m.angle=0;return undefined;}
 if(!s.paused&&!s.dialogue&&!s.defeated&&s.time!==m.time){
  const distance=Math.hypot(e.x-m.x,e.y-m.y);
  if(e.state==='leading'&&distance>.01){m.step+=Math.min(12,distance)*.14;m.angle=Math.sin(m.step)*1.8;}
  else m.angle=0;
  m.x=e.x;m.y=e.y;m.time=s.time;
 }
 return reduced?0:m.angle;
}
/** Marks sit on the original stone face; there is no extra ground route line. */
export function drawJourneyMark(e:Entity,g:Phaser.GameObjects.Graphics):void{
 if(e.id!=='journey_north_mark')return;
 g.lineStyle(1.3,0x4c594c,.55);g.lineBetween(-6,-24,-1,-28);g.lineBetween(-1,-28,5,-25);g.lineBetween(-5,-19,3,-21);
 g.lineStyle(.65,0xd8d8bf,.8);g.lineBetween(-6,-25,-1,-29);g.lineBetween(-1,-29,5,-26);g.lineBetween(-5,-20,3,-22);
}
const ROUTES:Record<JourneyRoute,[number,number][]>= {
 north:[[0,7],[4,1],[12,1],[17,7]],
 south:[[0,3],[5,8],[12,8],[17,3]],
 mixed:[[0,7],[5,8],[9,1],[14,1],[17,7]],
};
function ink(g:Phaser.GameObjects.Graphics,route:JourneyRoute,x:number,y:number,color:number,width:number):void{
 g.lineStyle(width,color,.86);g.beginPath();ROUTES[route].forEach(([px,py],i)=>{if(i)g.lineTo(x+px,y+py);else g.moveTo(x+px,y+py);});g.strokePath();
}
/** The narrow paper stays on the actual tabletop, left of the original two maps. */
export function drawJourneyHomeRecord(g:Phaser.GameObjects.Graphics,s:GameState):void{
 const j=s.journey;if(j.stage!=='complete')return;
 const base=j.soloRoute??(j.recordedShared?j.sharedRoute:null);if(!base)return;
 g.fillStyle(0x364b3d,.18);g.fillRoundedRect(-64,-56,25,16,1.2);
 g.fillStyle(0xe5dfc4,.98);g.fillRoundedRect(-65,-57,25,16,1.2);
 g.lineStyle(.65,0xb6ad8c,.6);g.strokeRoundedRect(-65,-57,25,16,1.2);
 ink(g,base,-61,-54,0x607e78,1);
 g.lineStyle(.7,0x8a8065,.8);g.lineBetween(-62,-44,-58,-44);g.lineBetween(-45,-44,-42,-44);
 if(j.recordedShared&&j.sharedRoute){
  if(j.soloRoute&&j.sharedRoute!==j.soloRoute)ink(g,j.sharedRoute,-61,-53,0x7e8d59,.55);
  // Separate short slanted strokes distinguish her marks without invented text.
  g.lineStyle(1.1,0x738254,.95);g.lineBetween(-58,-45,-55,-47);g.lineBetween(-49,-45,-46,-47);
 }
}

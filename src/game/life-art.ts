import Phaser from 'phaser';
import type { Entity, GameState } from './contracts';
const BOXES:Record<string,[number,number,number,number]>={
 hearth:[40,151,330,270],jaw:[398,154,374,266],press:[812,31,326,450],clamp:[1151,193,362,236],
 sun:[7,455,365,510],shade:[375,560,388,372],sachet:[810,541,280,370],practice:[1154,598,347,295]
};
const PROPS:Record<string,[string,number,number]>={life_hearth:['hearth',66,54],life_jaw:['jaw',62,44],life_press:['press',66,91],life_home_eye:['clamp',36,24],life_lookout_eye:['clamp',36,24],life_sun_leaf:['sun',44,62],life_shade_leaf:['shade',44,43],life_scent:['sachet',27,36],life_practice:['practice',42,36]};
export function registerLifeFrames(texture:Phaser.Textures.CanvasTexture):void{for(const [name,b]of Object.entries(BOXES))if(!texture.has(name))texture.add(name,0,...b);}
/** Local coordinates use the same foot point as the model entity. Images are built once. */
export function createLifeVisual(scene:Phaser.Scene,e:Entity):Phaser.GameObjects.Container|undefined{
 if(!scene.textures.exists('life-props'))return;
 const prop=PROPS[e.id];if(!prop&&!['workbench','herb_rack'].includes(e.id))return;
 const c=scene.add.container(0,0),g=scene.add.graphics();
 if(prop){const image=scene.add.image(0,5,'life-props',prop[0]).setOrigin(.5,1).setDisplaySize(prop[1],prop[2]);c.add(image);c.setData('image',image);}
 if(e.id==='herb_rack'){
  for(const key of ['sun','shade']){const image=scene.add.image(-19,-53,'life-props',key).setOrigin(.5).setDisplaySize(15,34).setAngle(-90).setVisible(false);c.add(image);c.setData(key,image);}
 }
 if(e.id==='workbench'){const image=scene.add.image(-9,-44,'life-props','clamp').setDisplaySize(29,19).setVisible(false);c.add(image);c.setData('gift',image);}
 c.add(g);c.setData('graphics',g);return c;
}
export function updateLifeVisual(c:Phaser.GameObjects.Container,e:Entity,s:GameState,reduced:boolean):void{
 const g=c.getData('graphics') as Phaser.GameObjects.Graphics;g.clear();
 const r=s.life.repair,h=s.life.harvest,image=c.getData('image') as Phaser.GameObjects.Image|undefined;
 if(e.id==='workbench'){(c.getData('gift') as Phaser.GameObjects.Image).setVisible(r.stage==='complete');return;}
 if(e.id==='herb_rack'){
  for(const key of ['sun','shade'] as const){const leaf=c.getData(key) as Phaser.GameObjects.Image,place=h[key];leaf.setVisible(place==='upper'||place==='lower');leaf.setY(place==='upper'?-53:-31);}
  return;
 }
 if(image){
  if(e.state==='picked'){image.setCrop(0,image.height*.74,image.width,image.height*.26).setAlpha(.7);}else image.setCrop().setAlpha(1);
  if(e.state==='clamped'||e.state==='latched')image.setTint(0xbacbb6);else image.clearTint();
 }
 if(e.id==='life_hearth'&&r.softened){
  g.fillStyle(0xe3a65b,.55);g.fillEllipse(-4,-27,18,7);g.fillStyle(0xffd78b,.75);g.fillTriangle(-9,-28,-3,-28,-7,-35);
  if(!reduced){const drift=Math.sin(s.time*2)*2;g.lineStyle(1,0xd1d7c1,.3);g.lineBetween(4,-39,4+drift,-48);}
 }
 if(e.id==='life_jaw'&&r.stage==='active'&&!r.latched&&Math.hypot(s.player.x-e.x,s.player.y-e.y)<210){
  const x=1420-e.x,y=570-e.y;g.lineStyle(1.5,0xb3cbb4,.85);g.lineBetween(x-10,y+8,x-10,y+15);g.lineBetween(x+10,y+8,x+10,y+15);g.lineBetween(x-10,y+15,x-4,y+15);g.lineBetween(x+4,y+15,x+10,y+15);
 }
 const progress=e.id==='life_press'?r.testing:h.picking?.id===e.id?h.picking.elapsed/2:null;
 if(progress!==null&&progress!==undefined){g.lineStyle(2,0xa1bc9c,.85);g.beginPath();g.arc(0,9,13,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,progress));g.strokePath();}
 if(e.id==='life_scent'&&s.life.scent){
  const age=8-s.life.scent.remaining,phase=reduced?.5:(age%1.8)/1.8;
  g.lineStyle(1,0xbbc7a2,(1-phase)*.22);g.strokeEllipse(0,-2,30+phase*80,10+phase*27);
 }
}

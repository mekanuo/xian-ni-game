import Phaser from 'phaser';
import type { Entity, GameState } from './contracts';

type Box={x:number;y:number;w:number;h:number};
const BOXES:Record<string,Box>={hearth:{x:40,y:151,w:330,h:270},jaw:{x:398,y:154,w:374,h:266},press:{x:812,y:313,w:264,h:250},clamp:{x:1151,y:119,w:336,h:236},sun_leaf:{x:745,y:536,w:551,h:270},shade_leaf:{x:375,y:560,w:388,h:372},sachet:{x:810,y:541,w:280,h:370},practice:{x:1154,y:598,w:347,h:295}};
const key=(id:string)=>id.replace(/^life_/,'');
export function registerLifeFrames(texture:Phaser.Textures.CanvasTexture):void {for(const [name,b] of Object.entries(BOXES)){if(!texture.has(name))texture.add(name,0,b.x,b.y,b.w,b.h);}}
export function createLifeVisual(scene:Phaser.Scene,e:Entity):Phaser.GameObjects.Container|undefined {
 const n=key(e.id), b=BOXES[n]; if(!b||!scene.textures.exists('life-props'))return undefined;
 const c=scene.add.container(0,0); const image=scene.add.image(0,0,'life-props',n).setOrigin(.5,1); image.setDisplaySize(Math.min(110,b.w*.25),Math.min(100,b.h*.25)); c.add(image);
 const g=scene.add.graphics(); c.add(g); c.setData('lifeImage',image); c.setData('lifeGraphics',g); c.setData('lifeKind',n); return c;
}
export function updateLifeVisual(c:Phaser.GameObjects.Container,e:Entity,s:GameState,reduced:boolean):void {
 const g=c.getData('lifeGraphics') as Phaser.GameObjects.Graphics|undefined; if(!g)return; g.clear(); const n=key(e.id); const r=s.life?.repair, h=s.life?.harvest;
 if(n==='hearth'&&r?.softened){g.fillStyle(0xffb45a,.7);g.fillCircle(0,-36,5);if(!reduced)g.fillStyle(0xffe2a0,.25),g.fillCircle(0,-36,11);}
 if(n==='jaw'&&r?.latched){g.lineStyle(2,0xd9eee0,.8);g.strokeRect(-18,-30,36,12);}
 if(n==='press'&&r?.testing!==null&&r?.testing!==undefined){g.lineStyle(2,0xffd18a,.85);g.strokeRect(-18,-36,36,8);}
 if((n==='sun_leaf'||n==='shade_leaf')&&((n==='sun_leaf'?h?.sun:h?.shade)!=='unpicked')){g.lineStyle(2,0xc8d8a1,.7);g.strokeCircle(0,-18,11);}
 if(n==='sachet'&&s.life?.scent){g.lineStyle(1.5,0xcdddbf,.32);const rad=8+(8-s.life.scent.remaining)*2;g.strokeCircle(0,-10,rad);if(!reduced)g.strokeCircle(0,-10,rad+5);}
 c.setVisible(e.state!=='hidden');
}

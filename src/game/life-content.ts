import type { Entity, SceneId, Vec } from './contracts';
export const LIFE_ENTITIES: Record<SceneId, Entity[]> = {
  home:[{id:'life_home_eye',kind:'object',type:'life-eye',name:'工位固定眼',x:1030,y:500,w:30,h:36,state:'hidden'},{id:'life_practice',movable:true,kind:'object',type:'life-practice',name:'挂扣试件',x:990,y:500,w:38,h:32,state:'hidden'}],
  creek:[{id:'life_sun_leaf',kind:'object',type:'leaf',name:'向阳叶',x:1420,y:270,w:32,h:28,state:'hidden'},{id:'life_shade_leaf',kind:'object',type:'leaf',name:'背阴叶',x:1380,y:680,w:32,h:28,state:'hidden'},{id:'life_lookout_eye',kind:'object',type:'life-eye',name:'眺台侧托',x:970,y:290,w:30,h:36,state:'hidden'}],
  workshop:[{id:'life_hearth',kind:'object',type:'hearth',name:'挂扣炉芯',x:1320,y:430,w:44,h:46,state:'hidden'},{id:'life_jaw',kind:'object',type:'jaw',name:'活动钳口',x:1360,y:570,w:48,h:36,state:'hidden',movable:true},{id:'life_press',kind:'object',type:'press',name:'试架压柄',x:1450,y:630,w:52,h:58,state:'hidden'},{id:'life_scent',kind:'object',type:'sachet',name:'避兽药囊',x:300,y:860,w:24,h:20,state:'hidden'}],
  crossing:[],canal:[],kiln:[]
};
export function initialLifeEntities(scene:SceneId): Entity[]{return LIFE_ENTITIES[scene].map(e=>({...e,homeX:e.x,homeY:e.y}));}
export function lifeEntityIds(scene:SceneId): string[]{return LIFE_ENTITIES[scene].map(e=>e.id);}
export const finite = (p:Vec)=>Number.isFinite(p.x)&&Number.isFinite(p.y);

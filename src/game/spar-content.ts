import type {Entity,SceneDefinition,SceneId} from './contracts';
/** Version-seven additions stay outside all seven historical scene templates. */
export const SPAR_HOME_POINT={x:1540,y:420};
export const SPAR_SCENE:SceneDefinition={
 id:'spar',title:'驿后练场',subtitle:'先约好来向，再留一步退路。',width:1800,height:1400,spawn:{x:900,y:1220},
 palette:{ground:0xa0aea0,path:0xc5bea9,foliage:0x637967,water:0x789eac},
 ground:[{type:'grass',points:[0,0,1800,0,1800,1400,0,1400]},
  {type:'stone',points:[570,570,1230,570,1230,1210,570,1210]},
  {type:'path',points:[830,1180,970,1180,970,1340,830,1340]}],
 obstacles:[{x:500,y:500,w:800,h:40},{x:500,y:540,w:40,h:700},{x:1260,y:540,w:40,h:700},
  {x:500,y:1240,w:310,h:40},{x:990,y:1240,w:310,h:40}],
 entities:[
  {id:'spar_peer',kind:'enemy',type:'raider',name:'闻朔',x:900,y:980,w:40,h:40,hp:3,state:'peaceful',data:{attack:0}},
  {id:'spar_to_home',kind:'exit',type:'sign',name:'回石驿',x:900,y:1280,w:90,h:60,state:'idle',targetScene:'home',targetSpawn:{x:1500,y:480}},
 ],
};
export function initialSparEntries(scene:SceneId):Entity[]{return scene==='home'?[{
 id:'home_to_spar',kind:'exit',type:'sign',name:'驿后练场',...SPAR_HOME_POINT,w:90,h:60,state:'hidden',targetScene:'spar',targetSpawn:{...SPAR_SCENE.spawn},
}]:[];}

import type {Entity,SceneDefinition,SceneId,Vec} from './contracts';
export const MARKET_ARRIVALS={crossing:{x:360,y:760},canal:{x:1030,y:220}};
export const MARKET_PASSAGE_BOUNDS={west:523,east:797,private:{low:397,high:483},public:{low:797,high:903}};
export const MARKET_POINTS:Record<'entry'|'exit'|'merchant'|'latch'|'decoy'|'enemy',Vec>={
 entry:{x:240,y:760},exit:{x:1140,y:240},merchant:{x:470,y:380},latch:{x:620,y:440},decoy:{x:460,y:720},enemy:{x:850,y:560},
};
export const MARKET_SCENE:SceneDefinition={
 id:'market',title:'集口问路',subtitle:'货屋之间，各有来路。',width:1400,height:1000,spawn:{...MARKET_ARRIVALS.crossing},
 palette:{ground:0xb6aa91,path:0xcbbda0,foliage:0x777d64,water:0x789eac},ground:[{type:'floor',points:[120,80,1280,80,1280,920,120,920]}],
 obstacles:[{x:80,y:40,w:1240,h:40},{x:80,y:920,w:1240,h:40},{x:80,y:80,w:40,h:840},{x:1280,y:80,w:40,h:840},{x:540,y:80,w:240,h:300},{x:540,y:500,w:240,h:280},
  // Real northern masonry gives a turn to read behind; the eastern lane remains
  // 100 wide (66 for a body), and enemies can still approach or shoot around it.
  {x:1030,y:300,w:150,h:40},{x:1150,y:300,w:30,h:180}],
 entities:[
  {id:'xu_market',name:'许照',kind:'npc',type:'xu',x:405,y:800,w:40,h:60,state:'hidden'},
  {id:'market_merchant',name:'沈砚',kind:'npc',type:'market-merchant',...MARKET_POINTS.merchant,w:40,h:60,state:'idle'},
  {id:'market_door',name:'私巷木门',kind:'object',type:'market-door',x:665,y:440,w:30,h:120,state:'closed',solid:true},
  {id:'market_entry',name:'← 石渡',kind:'exit',type:'sign',...MARKET_POINTS.entry,w:90,h:60,state:'idle',targetScene:'crossing',targetSpawn:{x:1640,y:610}},
  {id:'market_exit',name:'旧渠 →',kind:'exit',type:'sign',...MARKET_POINTS.exit,w:90,h:60,state:'idle',targetScene:'canal',targetSpawn:{x:990,y:350}},
  {id:'decoy',name:'无主空筐',kind:'object',type:'decoy',...MARKET_POINTS.decoy,homeX:460,homeY:720,w:50,h:40,state:'idle',movable:true,flammable:true},
  {id:'market_raider',name:'占道散修',kind:'enemy',type:'raider',...MARKET_POINTS.enemy,homeX:850,homeY:560,w:40,h:60,hp:3,state:'idle',data:{lastX:850,lastY:560,seen:0,attack:0}},
 ],
};

// Version-6 additions stay outside historical scene templates.
export function initialMarketEntries(scene:SceneId):Entity[]{
 if(scene==='crossing')return [{id:'crossing_to_market',kind:'exit',type:'sign',name:'小集 →',x:1660,y:520,w:90,h:60,state:'hidden',targetScene:'market',targetSpawn:{...MARKET_ARRIVALS.crossing}}];
 if(scene==='canal')return [{id:'canal_to_market',kind:'exit',type:'sign',name:'小集 →',x:1100,y:300,w:90,h:60,state:'hidden',targetScene:'market',targetSpawn:{...MARKET_ARRIVALS.canal}}];
 return [];
}

import type { Entity, SceneDefinition, Vec } from './contracts';
export type CanalRect={x:number;y:number;w:number;h:number};
/** Shared by collision, water rendering and surge safety. These are world bounds. */
export const CANAL_CHANNEL:CanalRect={x:1030,y:460,w:190,h:160};
export const CANAL_SIDE:CanalRect={x:700,y:450,w:110,h:180};
export const CANAL_POINTS={
 entry:{x:350,y:1030},diverterHome:{x:600,y:350},diverterSide:{x:680,y:350},
 stopHome:{x:1280,y:350},stopSlot:{x:1200,y:350},eye:{x:1230,y:410},screen:{x:1100,y:540},
 inspect:{x:880,y:610},tub:{x:350,y:930},keeper:{x:260,y:960},
 northBank:{x:1130,y:420},westBank:{x:990,y:540},eastBank:{x:1260,y:540},
 companionInspect:{x:940,y:640},companionVerify:{x:420,y:960},restMid:{x:880,y:720},
} satisfies Record<string,Vec>;
const entity=(id:string,kind:Entity['kind'],type:string,name:string,p:Vec,extra:Partial<Entity>={}):Entity=>({id,kind,type,name,...p,w:48,h:44,state:'idle',...extra});
const obj=(id:string,name:string,p:Vec,extra:Partial<Entity>={})=>entity(id,'object',id,name,p,extra);
const rect=(type:SceneDefinition['ground'][number]['type'],r:CanalRect)=>({type,points:[r.x,r.y,r.x+r.w,r.y,r.x+r.w,r.y+r.h,r.x,r.y+r.h]});
export const CANAL_SCENE:SceneDefinition={
 id:'canal',title:'雾岭旧渠',subtitle:'上游水声未停，下游石槽却是干的。',width:1800,height:1200,spawn:CANAL_POINTS.entry,
 palette:{ground:0x899d95,path:0xb6b2a0,foliage:0x526e65,water:0x739b9b},
 ground:[rect('path',{x:240,y:870,w:1110,h:190}),rect('path',{x:430,y:300,w:140,h:640}),rect('path',{x:480,y:270,w:880,h:155}),rect('path',{x:840,y:625,w:500,h:155}),rect('path',{x:1530,y:280,w:125,h:690}),rect('path',{x:1215,y:350,w:410,h:100}),rect('stone',{x:850,y:420,w:485,h:205}),rect('water',CANAL_CHANNEL),rect('water',CANAL_SIDE),rect('floor',{x:180,y:870,w:320,h:200})],
 obstacles:[{x:80,y:110,w:270,h:580},{x:820,y:170,w:210,h:70},{x:1370,y:470,w:75,h:170},{x:610,y:740,w:110,h:105}],
 entities:[
 obj('canal_diverter','旁路分水板',CANAL_POINTS.diverterHome,{movable:true,w:66,h:28,hint:'近身推两息，或沿导槽牵到右侧槽口；西岸始终可走'}),
 obj('canal_stop','横滑截水板',CANAL_POINTS.stopHome,{movable:true,w:64,h:32,hint:'向左牵入止水槽，再留势腾手；八秒内沿台阶进出'}),
 obj('canal_eye','截水架固定眼',CANAL_POINTS.eye,{w:34,h:30,hint:'截水板留势到位后，可用唯一压扣固定'}),
 obj('canal_screen','歪卡筛框',CANAL_POINTS.screen,{w:70,h:38,hint:'先看清堵塞；退水后亲自下渠，腾手清理两息'}),
 obj('canal_inspect','检修水尺',CANAL_POINTS.inspect,{w:36,h:58,hint:'上游水高，下游干涸；从高岸察看筛框'}),
 obj('canal_tub','下游取水石槽',CANAL_POINTS.tub,{w:98,h:45,hint:'复水稳定三息后，近身确认水位'}),
 entity('canal_keeper','npc','keeper','邵禾',CANAL_POINTS.keeper,{w:40,h:62,hint:'看渠人留在下游照看取水处'}),
 entity('canal_rest_entry','rest','rest','檐下静息', {x:480,y:1030},{w:70,h:45}),
 entity('canal_rest_mid','rest','rest','检修台坐垫',CANAL_POINTS.restMid,{w:70,h:45,state:'hidden'}),
 entity('canal_to_home','exit','exit','← 回石驿',{x:230,y:1070},{w:100,h:55,targetScene:'home',targetSpawn:{x:1520,y:690}}),
 entity('xu_canal','npc','xu','许照',{x:420,y:1040},{w:40,h:62}),
 entity('canal_beast_a','enemy','beast','干坡山兽',{x:1460,y:660},{hp:3,w:66,h:43,data:{lastX:1460,lastY:660,seen:0,attack:0}}),
 entity('canal_beast_b','enemy','beast','守窝山兽',{x:1380,y:820},{hp:3,w:66,h:43,data:{lastX:1380,lastY:820,seen:0,attack:0}}),
 obj('canal_scent','避兽药囊',{x:1500,y:900},{w:28,h:28,state:'hidden'}),
 ],
};

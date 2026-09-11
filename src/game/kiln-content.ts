import type {Entity,SceneDefinition,SceneId} from './contracts';
export const KILN_POINTS={west:{x:180,y:480},east:{x:1220,y:540},screen:{x:500,y:640},duqin:{x:260,y:560},rest:{x:260,y:400}};
export const KILN_WORKSPACE={x:420,y:600,w:160,h:100};
// Entries are version-5 additions, kept outside old scene templates for strict migration.
export function initialKilnEntries(scene:SceneId):Entity[]{
 if(scene==='creek')return [{id:'creek_to_kiln',kind:'exit',type:'sign',name:'← 旧窑',x:620,y:315,w:90,h:60,state:'hidden',targetScene:'kiln',targetSpawn:{...KILN_POINTS.west}}];
 if(scene==='canal')return [{id:'canal_to_kiln',kind:'exit',type:'sign',name:'← 旧窑',x:460,y:450,w:90,h:60,state:'hidden',targetScene:'kiln',targetSpawn:{...KILN_POINTS.east}}];
 return [];
}
const raider = (id: string, name: string, x: number, y: number): Entity => ({
  id, name, kind: 'enemy', type: 'raider', x, y, w: 40, h: 60, hp: 3, state: 'idle', homeX: x, homeY: y,
  data: { lastX: x, lastY: y, seen: 0, attack: 0 },
});
export const KILN_SCENE: SceneDefinition = {
  id: 'kiln', title: '背墙旧窑', subtitle: '窑墙隔开来向，旧路通向高岸。',
  width: 1460, height: 1000, spawn: { ...KILN_POINTS.west },
  palette: { ground: 0xb6aa91, path: 0xcbbda0, foliage: 0x777d64, water: 0x789eac },
  ground: [{ type: 'floor', points: [120, 80, 1340, 80, 1340, 880, 120, 880] }],
  obstacles: [
    { x: 80, y: 40, w: 1300, h: 40 }, { x: 80, y: 880, w: 1300, h: 40 },
    { x: 80, y: 80, w: 40, h: 800 }, { x: 1340, y: 80, w: 40, h: 800 },
    { x: 500, y: 220, w: 60, h: 380 }, { x: 900, y: 420, w: 60, h: 340 },
  ],
  entities: [
    { id: 'shield_board', type: 'shield_board', kind: 'object', name: '轻木挡屏', x: 500, y: 640, homeX: 500, homeY: 640, w: 100, h: 40, movable: true, solid: true, flammable: true, state: 'idle', hint: '落地挡双方来袭；烧毁后不再遮蔽。' },
    {id:'duqin',type:'duqin',kind:'npc',name:'杜芹',x:260,y:560,w:40,h:60,state:'idle'},
    {id:'kiln_rest',type:'kiln_rest',kind:'rest',name:'檐下棚角',x:260,y:400,w:70,h:50,state:'hidden'},
    {id:'kiln_to_creek',type:'sign',kind:'exit',name:'← 溪道',x:180,y:480,w:90,h:60,state:'idle',targetScene:'creek',targetSpawn:{x:760,y:315}},
    {id:'kiln_to_canal',type:'sign',kind:'exit',name:'旧渠 →',x:1220,y:540,w:90,h:60,state:'idle',targetScene:'canal',targetSpawn:{x:500,y:570}},
    raider('kiln_raider_a', '近墙散修', 710, 640),
    raider('kiln_raider_b', '外路散修', 1090, 300),
  ],
};


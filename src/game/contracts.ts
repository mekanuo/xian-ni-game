export type SceneId = 'home' | 'creek' | 'workshop' | 'crossing' | 'canal';
export type Spell = 'pull' | 'flame' | 'ward';
export type RingStyle = 'long' | 'hold' | null;
export type LifeStage = 'unaccepted' | 'active' | 'ready' | 'complete';
export type LeafId = 'life_sun_leaf' | 'life_shade_leaf';
export type LeafPlace = 'unpicked' | 'bag' | 'upper' | 'lower';
export type ClampSite = 'home' | 'lookout' | 'canal';
export interface LifeState { repair:{stage:LifeStage; softened:boolean; stopSet:boolean; latched:boolean; tested:boolean; method:null|'hold'|'stop'; testing:number|null}; harvest:{stage:LifeStage; sun:LeafPlace; shade:LeafPlace; picking:null|{id:LeafId; elapsed:number; start:Vec}; shared:boolean}; clamp:'unowned'|'bag'|ClampSite; sachets:0|1|2; scent:null|{remaining:number;scene:'workshop'|'canal'}; }
export interface CanalState { stage:'unaccepted'|'active'|'verified'|'ready'|'complete'; inspected:boolean; cleared:boolean; method:null|'diversion'|'hold'|'clamp'; sharedInspect:boolean; sharedVerify:boolean; usedClamp:boolean; work:null|{kind:'divert'|'restore'|'clear';elapsed:number;start:Vec}; drain:number; flow:number; surge:number|null; }
export type Vec = { x: number; y: number };
export type Profile = { name: string; origin: 'herbalist' | 'tinker'; wish: 'stay' | 'travel'; appearance: 0 | 1 };
export type EntityKind = 'npc' | 'object' | 'enemy' | 'exit' | 'rest' | 'scenery';
export interface Entity extends Vec {
  id: string; kind: EntityKind; type: string; name: string;
  w: number; h: number; solid?: boolean; movable?: boolean; flammable?: boolean;
  state: string; homeX?: number; homeY?: number; hp?: number;
  targetScene?: SceneId; targetSpawn?: Vec; hint?: string;
  facing?: number; timer?: number; data?: Record<string, string | number | boolean>;
}
export interface GroundShape { type: 'path' | 'water' | 'grass' | 'stone' | 'cliff' | 'floor'; points: number[]; }
export interface SceneDefinition {
  id: SceneId; title: string; subtitle: string; width: number; height: number;
  spawn: Vec; ground: GroundShape[]; obstacles: { x: number; y: number; w: number; h: number; flag?: string }[];
  entities: Entity[]; palette: { ground: number; path: number; foliage: number; water: number };
}
export interface DialogueChoice { id: string; label: string; disabled?: string }
export interface Dialogue { id: string; speaker: string; text: string; choices: DialogueChoice[] }
export interface GameEvent { seq: number; time: number; type: string; text: string; x?: number; y?: number; targetId?: string }
export interface Projectile extends Vec { id: number; vx: number; vy: number; life: number; owner: 'player' | 'enemy'; }
export interface Player extends Vec {
  hp: number; mana: number; facing: number; invulnerable: number; cooldown: number;
  ward: number; wardFacing: number; pullId: string | null; pullPoint: Vec | null;
  hold: number; path: Vec[];
}
export interface GameState {
  schema: 1; revision: 'return-stone-v1'; profile: Profile; scene: SceneId; time: number;
  player: Player; worlds: Record<SceneId, Entity[]>; flags: Record<string, boolean | string | number>;
  ringStyle: RingStyle; herbs: number; selected: Spell; paused: boolean;
  dialogue: Dialogue | null; events: GameEvent[]; projectiles: Projectile[];
  pending: GameAction | null; ended: boolean; defeated: boolean;
  checkpoint: string | null; contentVersion: 3; life: LifeState; canal: CanalState; lastSafe: { scene: SceneId; point: Vec };
}
export type GameAction =
  | { type: 'move'; point: Vec }
  | { type: 'cast'; spell: Spell; targetId?: string; point: Vec }
  | { type: 'interact'; targetId: string }
  | { type: 'choose'; choiceId: string }
  | { type: 'pause'; value: boolean }
  | { type: 'select'; spell: Spell }
  | { type: 'cancel' }
  | { type: 'release' }
  | { type: 'hold' }
  | { type: 'rest' }
  | { type: 'heal' }
  | { type: 'retry' }
  | { type: 'retreat' }
  | { type: 'use-sachet' };
export interface ActionResult { ok: boolean; message?: string }
export interface CastPreview { valid: boolean; reason: string; cost: number; range: number; target?: Entity; }

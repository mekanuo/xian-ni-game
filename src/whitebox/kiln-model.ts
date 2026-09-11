import { SCENES } from '../game/content';
import { act, createGame, tick } from '../game/model';
import type { ActionResult, Entity, GameAction, GameState, SceneDefinition, Vec } from '../game/contracts';

export type KilnPreset = 'ordinary' | 'zero';
export interface KilnRun { state: GameState; eastReached: boolean; returned: boolean }
export const KILN_WEST: Vec = { x: 180, y: 480 };
export const KILN_EAST: Vec = { x: 1220, y: 540 };
const raider = (id: string, name: string, x: number, y: number): Entity => ({
  id, name, kind: 'enemy', type: 'raider', x, y, w: 40, h: 60, hp: 3, state: 'idle', homeX: x, homeY: y,
  data: { lastX: x, lastY: y, seen: 0, attack: 0 },
});
export const KILN_MAP: SceneDefinition = {
  id: 'home', title: '背墙旧窑 · 空间白盒', subtitle: '观察窑墙与来向，亲自走到东端，再回西院。',
  width: 1400, height: 1000, spawn: { ...KILN_WEST },
  palette: { ground: 0xb6aa91, path: 0xcbbda0, foliage: 0x777d64, water: 0x789eac },
  ground: [{ type: 'floor', points: [120, 80, 1280, 80, 1280, 880, 120, 880] }],
  obstacles: [
    { x: 80, y: 40, w: 1240, h: 40 }, { x: 80, y: 880, w: 1240, h: 40 },
    { x: 80, y: 80, w: 40, h: 800 }, { x: 1280, y: 80, w: 40, h: 800 },
    { x: 500, y: 220, w: 60, h: 380 }, { x: 900, y: 420, w: 60, h: 340 },
  ],
  entities: [
    { id: 'shield_board', type: 'shield_board', kind: 'object', name: '轻木挡屏', x: 500, y: 640, homeX: 500, homeY: 640, w: 100, h: 40, movable: true, solid: true, flammable: true, state: 'idle', hint: '落地挡双方来袭；烧毁后不再遮蔽。' },
    raider('kiln_raider_a', '近墙散修', 710, 640),
    raider('kiln_raider_b', '外路散修', 1090, 300),
  ],
};

/** Only the isolated entry installs this slot, never the production application. */
export function installKilnMap(): () => void {
  const previous = SCENES.home;
  SCENES.home = KILN_MAP;
  return () => { SCENES.home = previous; };
}
export function createKilnRun(preset: KilnPreset): KilnRun {
  if (SCENES.home !== KILN_MAP) throw Error('先在独立白盒入口安装候选地图');
  if (preset !== 'ordinary' && preset !== 'zero') throw Error('未知白盒初态');
  const state = createGame({ name: '行舟', origin: 'tinker', wish: 'travel', appearance: 0 });
  state.worlds.home = structuredClone(KILN_MAP.entities);
  state.player.mana = preset === 'zero' ? 0 : 6;
  state.lastSafe = { scene: 'home', point: { ...KILN_WEST } };
  // This synthetic scenario is deliberately not a production save/checkpoint.
  state.checkpoint = null; state.events = []; state.flags.eventSeq = 0;
  return { state, eastReached: false, returned: false };
}
const allowed = new Set<GameAction['type']>(['move', 'cast', 'select', 'pause', 'release', 'hold', 'cancel']);
export function kilnAct(run: KilnRun, action: GameAction): ActionResult {
  if (!allowed.has(action.type)) return { ok: false, message: '空间白盒只开放走动与三术法；需从初态按钮重新开始。' };
  return act(run.state, action);
}
export function kilnTick(run: KilnRun, dt: number, input: Vec): void {
  const s = run.state;
  if (!Number.isFinite(dt) || dt <= 0 || s.paused || s.dialogue || s.defeated) return;
  const before = s.time;
  tick(s, dt, input);
  if (s.time <= before || s.paused || s.dialogue || s.defeated || s.player.hp <= 0) return;
  if (!run.eastReached && Math.hypot(s.player.x - KILN_EAST.x, s.player.y - KILN_EAST.y) <= 65) run.eastReached = true;
  else if (run.eastReached && Math.hypot(s.player.x - KILN_WEST.x, s.player.y - KILN_WEST.y) <= 65) run.returned = true;
}

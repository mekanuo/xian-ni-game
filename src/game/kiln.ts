import type { ActionResult, DialogueChoice, Entity, GameState, KilnState, SceneId, Vec } from './contracts';
import type { LifePorts } from './life';
import { KILN_POINTS, KILN_WORKSPACE } from './kiln-content';

export type KilnActionResult = ActionResult & { checkpoint?: boolean };
export function createKilnState(): KilnState {
  return { visited: false, entry: null, crossed: { west: false, east: false }, loan: 'none', shelterOpened: false };
}
const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const object = (s: GameState, id: string) => s.worlds.kiln.find(e => e.id === id);
const intact = (e: Entity) => ['idle', 'pulled', 'held'].includes(e.state);
const inWorkspace = (e: Entity) => e.x >= KILN_WORKSPACE.x && e.x <= KILN_WORKSPACE.x + KILN_WORKSPACE.w && e.y >= KILN_WORKSPACE.y && e.y <= KILN_WORKSPACE.y + KILN_WORKSPACE.h;
const near = (s: GameState, e: Entity | undefined, p: LifePorts): e is Entity => !!e && distance(s.player, e) < 96 && p.free(s, s.player) && p.clearLine(s, s.player, e, e.id);
function visible(s: GameState, e: Entity | undefined, p?: LifePorts): e is Entity {
  const n = object(s, 'duqin');
  return s.scene === 'kiln' && !!p && !!n && !!e && distance(n, e) <= 420 && p.free(s, n) && p.clearLine(s, n, e, e.id);
}
const no = (message: string): KilnActionResult => ({ ok: false, message });

/** Synchronize derived visibility only; no observation, travel or permission awards. */
export function kilnRefresh(s: GameState): void {
  for (const scene of ['creek', 'canal'] as const) {
    const e = s.worlds[scene].find(e => e.id === `${scene}_to_kiln`);
    if (e) e.state = s.journey.stage === 'complete' ? 'idle' : 'hidden';
  }
  const rest = object(s, 'kiln_rest');
  if (rest) rest.state = s.kiln.shelterOpened ? 'idle' : 'hidden';
}
export function kilnTick(s: GameState, dt: number, p: LifePorts): void {
  if (s.paused || s.dialogue || s.defeated || !Number.isFinite(dt) || dt <= 0) return;
  kilnRefresh(s);
  if (s.scene !== 'kiln' || s.kiln.loan !== 'agreed') return;
  const screen = object(s, 'shield_board');
  if (screen && intact(screen) && !inWorkspace(screen) && visible(s, screen, p)) {
    s.kiln.loan = 'borrowed';
    p.emit(s, 'note', '杜芹看见挡屏离开了作业面：“用完，完好落回原来的位置。”', object(s, 'duqin'));
  }
}
export function kilnChoices(s: GameState, e: Entity): DialogueChoice[] {
  if (s.scene !== 'kiln' || e.id !== 'duqin') return [];
  const first = s.kiln.loan === 'none' ? { id: 'kiln:borrow', label: '借屏，用完归位' }
    : s.kiln.loan === 'returned' ? { id: 'kiln:rest', label: '问檐下歇脚处' }
      : { id: 'kiln:return', label: '请看挡屏归位' };
  // The shared dialogue supplies the third, leave choice.
  return [first, { id: 'kiln:route', label: '问穿窑的路' }];
}
export function kilnChoose(s: GameState, id: string, p: LifePorts): KilnActionResult | undefined {
  if (!id.startsWith('kiln:')) return undefined;
  if (s.scene !== 'kiln' || !near(s, object(s, 'duqin'), p)) return no('到杜芹身旁，再说借屏或归还的事');
  const screen = object(s, 'shield_board'), k = s.kiln;
  if (id === 'kiln:route') {
    p.emit(s, 'note', '杜芹指向窑墙两端：“西院接溪道，东口通旧渠。挡屏不用也能绕路；墙外有人盯着，露面后别站定。”');
    return { ok: true };
  }
  if (id === 'kiln:rest') {
    if (!k.shelterOpened) return no('檐下还没允你落脚；借屏完好归位后，再来问杜芹');
    p.emit(s, 'note', '杜芹指了指北边的棚角：“说好了，那块干地你往来时可以歇脚。”');
    return { ok: true };
  }
  if (id === 'kiln:borrow') {
    if (k.loan !== 'none') return no('借屏的约定已经说过；用完把它完好落回原位');
    if (!screen || !intact(screen) || !inWorkspace(screen) || !visible(s, screen, p)) return no('先把完好的挡屏放回作业面，让杜芹看清，再说借用');
    k.loan = 'agreed';
    p.emit(s, 'note', '杜芹点头：“屏是我挡灰护坯用的。借你挪一阵，别烧，完好落回原位再告诉我。”');
    return { ok: true, checkpoint: true };
  }
  if (id === 'kiln:return') {
    if (k.loan === 'returned') return { ok: true };
    if (k.loan !== 'borrowed') return no('还没实际借离作业面，这次不算归还');
    if (!screen || screen.state !== 'idle' || s.player.pullId === screen.id || distance(screen, KILN_POINTS.screen) > 12 || !visible(s, screen, p) || !p.free(s, screen, 12, screen.id)) return no('把完好的挡屏落回原来脚印处，解除牵引，再让杜芹看清');
    k.loan = 'returned'; k.shelterOpened = true; kilnRefresh(s);
    p.emit(s, 'growth', '杜芹看了看归位的挡屏：“没耽误我护坯。北边檐下那块干地，往来累了就歇一歇。”', object(s, 'duqin'));
    return { ok: true, checkpoint: true };
  }
  return no('这件事当前不能这样做');
}
export function kilnInteract(s: GameState, e: Entity, p: LifePorts): ActionResult | undefined {
  if (s.scene !== 'kiln') return undefined;
  if (e.id === 'kiln_rest' && !s.kiln.shelterOpened) return no('这是杜芹留用的棚角，还没允你在此静息');
  if (e.id !== 'duqin') return undefined;
  if (!near(s, e, p)) return no('走到杜芹身旁再说');
  p.dialogue(s, 'kiln_duqin', e.name, kilnDescription(s, e, p)!, kilnChoices(s, e));
  return { ok: true };
}
export function kilnBeforeTravel(s: GameState, to: SceneId, p: LifePorts): void {
  if (s.journey.stage !== 'complete') return;
  if (to === 'kiln' && (s.scene === 'creek' || s.scene === 'canal')) {
    s.kiln.visited = true; s.kiln.entry = s.scene === 'creek' ? 'west' : 'east';
  } else if (s.scene === 'kiln' && to !== 'kiln') {
    const out = to === 'creek' ? 'west' : to === 'canal' ? 'east' : null;
    if (out && s.kiln.entry && out !== s.kiln.entry && !s.kiln.crossed[out]) {
      s.kiln.crossed[out] = true;
      p.emit(s, 'route', out === 'east' ? '你实际穿过旧窑，从东口走上旧渠高岸。' : '你从旧渠一侧穿过旧窑，走回西院溪道。');
    }
    s.kiln.entry = null;
  }
}
export function kilnObjective(s: GameState): string | undefined {
  if (s.scene !== 'kiln') return undefined;
  const side = s.kiln.entry === 'east' ? '西院溪道' : '东口旧渠高岸';
  const route = s.kiln.crossed.east && s.kiln.crossed.west ? '两端的路已经亲自走通，可按来向往返。' : `沿窑墙寻找去${side}的路；原端也可随时返回。`;
  const screen = object(s, 'shield_board');
  return route + (s.kiln.loan === 'borrowed' && screen && intact(screen) ? ' 借出的挡屏，完好落回原位后可请杜芹查看。' : '');
}
export function kilnDescription(s: GameState, e: Entity, p?: LifePorts): string | undefined {
  if (s.scene !== 'kiln') return undefined;
  if (e.id === 'kiln_rest') return s.kiln.shelterOpened ? '杜芹允你使用的檐下干地，往来途中可以静息。' : '杜芹留用的檐下棚角，尚未允你在此落脚。';
  if (e.id !== 'duqin') return undefined;
  const screen = object(s, 'shield_board'), k = s.kiln;
  if (visible(s, screen, p)) {
    if (screen.state === 'burning' || screen.state === 'burned') return k.shelterOpened ? '杜芹望着烧坏的挡屏，沉下脸：“歇脚的话我说过，屏却是护坯用的。你把它烧了，这里再没有那面遮挡。”' : '杜芹望着烧坏的挡屏：“它是护坯用的，不是让你烧的。屏没法完好归还，借还的事也不能算成。”';
    if (!inWorkspace(screen)) return k.loan === 'none' ? '杜芹望向被挪开的挡屏：“护坯还要用它。先放回作业面，有事当面说。”' : k.loan === 'returned' ? '杜芹看见挡屏又被挪开：“上回归还我记得。这回也别让作业面一直空着。”' : '杜芹望着离位的挡屏：“用完完好落回旧脚印，落稳了再来叫我。”';
  }
  if (k.loan === 'returned') return '杜芹记得你上回归还挡屏：“北边檐下给你留了歇脚处。出窑仍要留意墙外的人。”';
  if (k.loan === 'borrowed') return '杜芹还记着借屏的约定：“完好落回原位，放稳后到我身旁说一声。”';
  if (k.loan === 'agreed') return '杜芹说：“借屏的话说好了，护坯还要用，别烧，用完放回原位。”';
  return '杜芹正照看晾坯：“西边通溪道，东边接旧渠。这面屏挡灰护坯；要挪用先说一声，用完原样放回。”';
}

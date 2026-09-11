import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SCENES } from '../src/game/content';
import { act, createGame, previewCast, previewPullMove, restore, snapshot, tick } from '../src/game/model';
import type { Entity, GameState, SceneDefinition, Vec } from '../src/game/contracts';

let previous: SceneDefinition;
beforeEach(() => {
  previous = SCENES.home;
  SCENES.home = { ...previous, width: 1400, height: 1000, obstacles: [{ x: 500, y: 220, w: 60, h: 380 }], ground: [], entities: [] };
});
afterEach(() => { SCENES.home = previous; });
function fixture(extra: Partial<Entity> = {}) {
  const s = createGame({ name: '行舟', origin: 'tinker', wish: 'travel', appearance: 0 });
  const screen: Entity = { id: 'shield_board', type: 'shield_board', kind: 'object', name: '轻木屏', x: 500, y: 640, homeX: 500, homeY: 640, w: 100, h: 40, solid: true, movable: true, state: 'idle', ...extra };
  s.worlds.home = [screen]; s.player.x = 420; s.player.y = 640;
  return { s, screen };
}
function pull(s: GameState, screen: Entity, point: Vec) {
  return act(s, { type: 'cast', spell: 'pull', targetId: screen.id, point });
}
function run(s: GameState, seconds = 1) {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) tick(s, Math.min(1 / 60, seconds - elapsed), { x: 0, y: 0 });
}
function obstacle(extra: Partial<Entity> = {}): Entity {
  return { id: 'other_screen', type: 'screen', kind: 'object', name: '另一块屏', x: 650, y: 640, w: 40, h: 80, solid: true, state: 'idle', ...extra };
}

describe('solid pull uses the whole rectangular footprint', () => {
  it('rejects the kiln wall-corner destination even though the center is clear', () => {
    const { s, screen } = fixture(), point = { x: 580, y: 610 };
    expect(previewCast(s, 'pull', screen.id, point).valid).toBe(false);
    expect(pull(s, screen, point).ok).toBe(false);
    expect(s.player.mana).toBe(6); expect(screen.state).toBe('idle');
  });
  it('rejects a center path whose endpoints fit but whose moving corner crosses the wall', () => {
    const { s, screen } = fixture(), point = { x: 650, y: 580 };
    expect(pull(s, screen, screen).ok).toBe(true);
    expect(previewPullMove(s, point).valid).toBe(false);
    expect(act(s, { type: 'move', point }).ok).toBe(false);
    run(s); expect(screen.x).toBe(500); expect(screen.y).toBe(640);
  });
  it('rejects overlap with a different grounded solid body instead of testing only its center', () => {
    const { s, screen } = fixture(); s.worlds.home.push(obstacle());
    expect(pull(s, screen, { x: 590, y: 640 }).ok).toBe(false);
    expect(s.player.mana).toBe(6);
  });
  for (const kind of ['wall', 'entity']) it(`rechecks the swept footprint when a ${kind} appears after preview`, () => {
    const { s, screen } = fixture({ y: 720, homeY: 720 }); s.player.x = 650; s.player.y = 800;
    const next = { x: 800, y: 720 };
    const other = obstacle({ y: 675, h: 60, state: 'held' });
    if (kind === 'entity') s.worlds.home.push(other);
    expect(pull(s, screen, next).ok).toBe(true);
    // Environmental boundary fixture: a previously absent obstacle becomes physical.
    if (kind === 'wall') SCENES.home.obstacles.push({ x: 630, y: 645, w: 40, h: 60 });
    else other.state = 'idle';
    run(s);
    expect(screen.x).toBeGreaterThan(500); expect(screen.x).toBeLessThanOrEqual(580);
    expect(s.player.pullId).toBeNull(); expect(screen.state).toBe('idle'); expect(s.player.mana).toBe(5);
  });
  it('keeps a full screen inside the existing 25-unit map boundary', () => {
    const { s, screen } = fixture({ x: 120, y: 850, homeX: 120, homeY: 850 }); s.player.x = 180; s.player.y = 850;
    expect(pull(s, screen, { x: 60, y: 850 }).ok).toBe(false);
    expect(pull(s, screen, { x: 75, y: 850 }).ok).toBe(true);
    run(s); expect(screen.x).toBe(75);
  });
  it('treats physical water rectangles as footprint obstacles but not decorative water ground', () => {
    const { s, screen } = fixture({ x: 400, y: 800, homeX: 400, homeY: 800 }); s.player.x = 450; s.player.y = 900;
    SCENES.home.ground.push({ type: 'water', points: [500, 760, 520, 760, 520, 840, 500, 840] });
    SCENES.home.obstacles.push({ x: 500, y: 760, w: 20, h: 80 });
    expect(pull(s, screen, { x: 650, y: 800 }).ok).toBe(false);
    SCENES.home.obstacles.pop();
    expect(pull(s, screen, { x: 650, y: 800 }).ok).toBe(true);
    run(s, 1.3); expect(screen.x).toBe(650);
  });
  it('retains the existing non-solid center-path rule, including crossing physical water', () => {
    const { s, screen } = fixture({ id: 'loose_strip', solid: false });
    expect(pull(s, screen, { x: 580, y: 610 }).ok).toBe(true); run(s);
    expect(screen.x).toBe(580); expect(screen.y).toBe(610);
    act(s, { type: 'release' });
    screen.x = 400; screen.y = 800; s.player.x = 450; s.player.y = 900;
    SCENES.home.ground.push({ type: 'water', points: [500, 760, 520, 760, 520, 840, 500, 840] });
    SCENES.home.obstacles.push({ x: 500, y: 760, w: 20, h: 80 });
    expect(pull(s, screen, { x: 650, y: 800 }).ok).toBe(true); run(s, 1.3);
    expect(screen.x).toBe(650);
  });
  it('allows a clear full-body move and exact edge contact without penetrating a wall', () => {
    const { s, screen } = fixture();
    expect(pull(s, screen, { x: 500, y: 620 }).ok).toBe(true); run(s);
    expect(screen.y).toBe(620);
    expect(act(s, { type: 'move', point: { x: 620, y: 700 } }).ok).toBe(true); run(s);
    expect(screen.x).toBe(620); expect(screen.y).toBe(700);
  });
  it('continues to ignore held and burned solids for another screen path', () => {
    for (const state of ['held', 'burned']) {
      const { s, screen } = fixture(); s.worlds.home.push(obstacle({ state }));
      expect(pull(s, screen, { x: 590, y: 640 }).ok).toBe(true); run(s);
      expect(screen.x).toBe(590);
    }
  });
  it('picks up an old corner-overlap in place and physically slides it out without teleporting or refunding mana', () => {
    const { s, screen } = fixture({ x: 580, y: 610 });
    expect(pull(s, screen, screen).ok).toBe(true);
    expect(screen.x).toBe(580); expect(screen.y).toBe(610); expect(s.player.mana).toBe(5);
    expect(act(s, { type: 'move', point: { x: 650, y: 650 } }).ok).toBe(true);
    tick(s, .02, { x: 0, y: 0 });
    expect(screen.x).toBeGreaterThan(580); expect(screen.x).toBeLessThan(585);
    expect(screen.y).toBeGreaterThan(610); expect(screen.y).toBeLessThan(615);
    run(s); expect(screen.x).toBe(650); expect(screen.y).toBe(650);
    expect(s.player.mana).toBe(5);
  });
  it('cannot escape an old overlap by crossing the wall to its opposite side', () => {
    const { s, screen } = fixture({ x: 580, y: 610 });
    expect(pull(s, screen, screen).ok).toBe(true);
    const result = act(s, { type: 'move', point: { x: 430, y: 610 } });
    expect(result.ok).toBe(false); expect(result.message).toMatch(/先.*(墙|脱离)/);
    run(s); expect(screen.x).toBe(580); expect(screen.y).toBe(610);
  });
  it('does not deepen an old corner overlap on one axis while moving out on the other', () => {
    const { s, screen } = fixture({ x: 580, y: 610 });
    expect(pull(s, screen, { x: 650, y: 600 }).ok).toBe(false);
    expect(screen.x).toBe(580); expect(screen.y).toBe(610);
  });
  it('still sweeps other obstacles during old-overlap recovery', () => {
    const { s, screen } = fixture({ x: 580, y: 610 }); s.player.x = 650; s.player.y = 760;
    s.worlds.home.push(obstacle({ x: 700, y: 630 }));
    expect(pull(s, screen, screen).ok).toBe(true);
    expect(act(s, { type: 'move', point: { x: 780, y: 650 } }).ok).toBe(false);
    expect(screen.x).toBe(580); expect(screen.y).toBe(610);
  });
  for (const [name, start, player, finish] of [
    ['left', { x: 60, y: 850 }, { x: 180, y: 850 }, { x: 100, y: 850 }],
    ['right', { x: 1340, y: 850 }, { x: 1250, y: 850 }, { x: 1300, y: 850 }],
    ['top', { x: 400, y: 30 }, { x: 400, y: 120 }, { x: 400, y: 60 }],
    ['bottom', { x: 400, y: 970 }, { x: 400, y: 880 }, { x: 400, y: 940 }],
  ] as const) it(`recovers an old ${name}-boundary overhang through normal motion`, () => {
    const { s, screen } = fixture(start); s.player.x = player.x; s.player.y = player.y;
    expect(pull(s, screen, screen).ok).toBe(true); expect(screen.x).toBe(start.x); expect(screen.y).toBe(start.y);
    expect(act(s, { type: 'move', point: finish }).ok).toBe(true);
    tick(s, .02, { x: 0, y: 0 });
    expect(Math.hypot(screen.x - start.x, screen.y - start.y)).toBeCloseTo(4.4);
    run(s); expect(screen.x).toBe(finish.x); expect(screen.y).toBe(finish.y);
    expect(s.player.mana).toBe(5);
  });
  it('cannot worsen an old boundary overhang, slide it sideways forever, or cross out the opposite edge', () => {
    SCENES.home.width = 300;
    const { s, screen } = fixture({ x: 60, y: 850 }); s.player.x = 150; s.player.y = 850;
    expect(pull(s, screen, screen).ok).toBe(true);
    for (const point of [{ x: 55, y: 850 }, { x: 60, y: 820 }, { x: 260, y: 850 }]) expect(act(s, { type: 'move', point }).ok).toBe(false);
    expect(act(s, { type: 'move', point: { x: 70, y: 850 } }).ok).toBe(true); run(s);
    expect(screen.x).toBe(70); // A partial improvement need not snap to the legal boundary.
    expect(act(s, { type: 'move', point: { x: 100, y: 850 } }).ok).toBe(true); run(s);
    expect(screen.x).toBe(100); expect(s.player.mana).toBe(5);
  });
  it('preserves an old crossing screen position through full five-scene save/restore and allows actual recovery', () => {
    SCENES.home = previous; // Use the real complete manifest, not the empty geometry fixture.
    const original = createGame({ name: '行舟', origin: 'tinker', wish: 'travel', appearance: 0 });
    original.scene = 'crossing'; original.player.x = 960; original.player.y = 740;
    const oldScreen = original.worlds.crossing.find(e => e.id === 'shield_board')!;
    oldScreen.x = 960; oldScreen.y = 600; // A saved center-valid position previously allowed by corner-only overlap.
    const saved = snapshot(original), s = restore(saved);
    const screen = s.worlds.crossing.find(e => e.id === 'shield_board')!;
    expect(Object.keys(s.worlds)).toHaveLength(5);
    for (const scene of Object.keys(original.worlds) as (keyof typeof original.worlds)[]) expect(s.worlds[scene]).toEqual(original.worlds[scene]);
    expect(screen.x).toBe(960); expect(screen.y).toBe(600);
    expect(s.player.mana).toBe(6); expect(s.player.hp).toBe(4);
    expect(pull(s, screen, screen).ok).toBe(true);
    expect(screen.x).toBe(960); expect(screen.y).toBe(600);
    expect(act(s, { type: 'move', point: { x: 1010, y: 640 } }).ok).toBe(true);
    run(s, .5); expect(act(s, { type: 'release' }).ok).toBe(true);
    expect(screen.x).toBe(1010); expect(screen.y).toBe(640); expect(s.player.mana).toBe(5);
    const recovered = restore(snapshot(s)).worlds.crossing.find(e => e.id === 'shield_board')!;
    expect(recovered.x).toBe(1010); expect(recovered.y).toBe(640); expect(recovered.state).toBe('idle');
  });
});

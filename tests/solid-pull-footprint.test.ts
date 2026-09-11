import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SCENES } from '../src/game/content';
import { act, createGame, previewCast, previewPullMove, tick } from '../src/game/model';
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
});

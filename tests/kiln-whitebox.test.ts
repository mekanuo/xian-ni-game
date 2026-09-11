import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SCENES } from '../src/game/content';
import { KILN_EAST, KILN_MAP, KILN_WEST, createKilnRun, installKilnMap, kilnAct, kilnTick } from '../src/whitebox/kiln-model';
import type { KilnRun } from '../src/whitebox/kiln-model';
import type { GameAction, Vec } from '../src/game/contracts';

let uninstall: () => void;
beforeEach(() => { uninstall = installKilnMap(); });
afterEach(() => uninstall());
function walk(run: KilnRun, point: Vec) {
  const action = kilnAct(run, { type: 'move', point });
  expect(action.ok, JSON.stringify({ point, action, player: run.state.player, enemies: run.state.worlds.home.filter(e => e.kind === 'enemy') })).toBe(true);
  for (let t = 0; t < 30 && run.state.player.path.length && !run.state.defeated; t += 1 / 60) kilnTick(run, 1 / 60, { x: 0, y: 0 });
  expect(run.state.defeated, `defeated while moving to ${JSON.stringify(point)}`).toBe(false);
  expect(Math.hypot(run.state.player.x - point.x, run.state.player.y - point.y), JSON.stringify({ point, player: run.state.player })).toBeLessThan(3);
}
const lowerRoute: Vec[] = [{ x: 360, y: 700 }, { x: 360, y: 820 }, { x: 800, y: 820 }, { x: 1030, y: 820 }, { x: 1220, y: 820 }, KILN_EAST];

describe('isolated kiln whitebox using the shared game model', () => {
  it('installs only the home slot and restores its exact previous reference', () => {
    uninstall();
    const before = SCENES.home, others = [SCENES.creek, SCENES.workshop, SCENES.crossing, SCENES.canal];
    const undo = installKilnMap(); expect(SCENES.home).toBe(KILN_MAP); undo();
    expect(SCENES.home).toBe(before);
    expect([SCENES.creek, SCENES.workshop, SCENES.crossing, SCENES.canal]).toEqual(others);
    uninstall = installKilnMap();
  });
  it('creates ordinary and zero presets with identical enemies, geometry and unearned chapter state', () => {
    const ordinary = createKilnRun('ordinary'), zero = createKilnRun('zero');
    expect(ordinary.state.player.mana).toBe(6); expect(zero.state.player.mana).toBe(0);
    expect(zero.state.player.hp).toBe(4); expect(zero.state.worlds.home).toEqual(ordinary.state.worlds.home);
    expect(zero.state.worlds.home.filter(e => e.kind === 'enemy')).toHaveLength(2);
    expect(zero.state.worlds.home.every(e => e.homeX === e.x && e.homeY === e.y)).toBe(true);
    expect(zero.state.life.repair.stage).toBe('unaccepted'); expect(zero.state.canal.stage).toBe('unaccepted'); expect(zero.state.journey.stage).toBe('unaccepted');
    expect(zero.eastReached).toBe(false); expect(zero.returned).toBe(false);
    expect(kilnAct(zero, { type: 'cast', spell: 'ward', point: { x: 400, y: 500 } }).ok).toBe(false);
  });
  it('rejects destinations inside the actual wall and actions outside the isolated slice', () => {
    const run = createKilnRun('ordinary');
    expect(kilnAct(run, { type: 'move', point: { x: 530, y: 400 } }).ok).toBe(false);
    for (const action of [{ type: 'rest' }, { type: 'retry' }, { type: 'retreat' }, { type: 'heal' }, { type: 'use-sachet' }, { type: 'interact', targetId: 'to_creek' }, { type: 'choose', choiceId: 'journey:record' }] as GameAction[]) {
      const before = JSON.stringify(run); expect(kilnAct(run, action).ok).toBe(false); expect(JSON.stringify(run)).toBe(before);
    }
  });
  it('does not advance clocks, positions or endpoint facts during pause or invalid ticks', () => {
    const run = createKilnRun('ordinary');
    kilnAct(run, { type: 'pause', value: true }); const paused = JSON.stringify(run);
    kilnTick(run, 1, { x: 1, y: 0 }); expect(JSON.stringify(run)).toBe(paused);
    kilnAct(run, { type: 'pause', value: false }); const active = JSON.stringify(run);
    for (const dt of [0, -1, NaN, Infinity]) kilnTick(run, dt, { x: 1, y: 0 });
    expect(JSON.stringify(run)).toBe(active);
  });
  it('walks zero-mana east and back with both active enemies, retaining the screen', () => {
    const run = createKilnRun('zero'); walk(run, { x: 200, y: 500 });
    expect(run.returned).toBe(false); expect(run.eastReached).toBe(false);
    for (const point of lowerRoute) walk(run, point);
    expect(run.eastReached).toBe(true); expect(run.returned).toBe(false);
    for (const point of [{ x: 1220, y: 140 }, { x: 800, y: 140 }, { x: 360, y: 170 }, KILN_WEST]) walk(run, point);
    expect(run.returned).toBe(true); expect(run.state.player.mana).toBe(0); expect(run.state.player.hp).toBeGreaterThan(0);
    const screen = run.state.worlds.home.find(e => e.id === 'shield_board')!;
    expect(screen.state).toBe('idle'); expect(screen.x).toBe(500); expect(screen.y).toBe(640);
    expect(run.state.worlds.home.filter(e => e.kind === 'enemy').every(e => e.hp === 3 && !['peaceful', 'retreated'].includes(e.state))).toBe(true);
    expect(run.state.events.some(e => e.type === 'alert')).toBe(true);
    const restarted = createKilnRun('zero');
    expect(restarted.eastReached).toBe(false); expect(restarted.returned).toBe(false);
    expect(restarted.state.player.mana).toBe(0);
    expect(restarted.state.worlds.home.filter(e => e.kind === 'enemy').every(e => e.x === e.homeX && e.y === e.homeY && e.state === 'idle')).toBe(true);

  });
  it('restarts with fresh resources, enemies, screen and endpoint facts', () => {
    const changed = createKilnRun('ordinary'); walk(changed, { x: 420, y: 640 });
    expect(kilnAct(changed, { type: 'cast', spell: 'flame', targetId: 'shield_board', point: { x: 500, y: 640 } }).ok).toBe(true);
    for (let t = 0; t < 1; t += 1 / 60) kilnTick(changed, 1 / 60, { x: 0, y: 0 });
    expect(changed.state.worlds.home.find(e => e.id === 'shield_board')?.state).toBe('burning');
    const fresh = createKilnRun('zero');
    expect(fresh.state.player.mana).toBe(0); expect(fresh.state.player.hp).toBe(4);
    expect(fresh.state.worlds.home.find(e => e.id === 'shield_board')?.state).toBe('idle');
    expect(fresh.state.worlds.home.filter(e => e.kind === 'enemy').every(e => e.state === 'idle' && e.hp === 3)).toBe(true);
    expect(fresh.eastReached).toBe(false); expect(fresh.returned).toBe(false);
    expect(fresh.state.worlds.home).not.toBe(changed.state.worlds.home);
  });
  it('survives a zero-mana round trip with active decision gaps between actual movement commands', () => {
    const run = createKilnRun('zero');
    const walkWithDecisionGap = (point: Vec) => {
      walk(run, point);
      // Camera adjustment / reading / issuing the next click leaves the world active.
      for (let elapsed = 0; elapsed < 1; elapsed += 1 / 60) kilnTick(run, Math.min(1 / 60, 1 - elapsed), { x: 0, y: 0 });
      expect(run.state.paused).toBe(false); expect(run.state.defeated).toBe(false);
    };
    walkWithDecisionGap({ x: 200, y: 500 });
    for (const point of lowerRoute) walkWithDecisionGap(point);
    expect(run.eastReached).toBe(true); expect(run.returned).toBe(false);
    for (const point of [{ x: 1290, y: 540 }, { x: 1290, y: 140 }, { x: 800, y: 140 }, { x: 360, y: 170 }, KILN_WEST]) walkWithDecisionGap(point);
    expect(run.returned).toBe(true); expect(run.state.player.hp).toBeGreaterThan(0); expect(run.state.player.mana).toBe(0);
    expect(run.state.events.some(e => e.type === 'alert')).toBe(true);
    expect(run.state.worlds.home.filter(e => e.kind === 'enemy').every(e => e.hp === 3 && !['peaceful', 'retreated'].includes(e.state))).toBe(true);
    expect(run.state.worlds.home.find(e => e.id === 'shield_board')).toMatchObject({ x: 500, y: 640, state: 'idle' });
  });
});

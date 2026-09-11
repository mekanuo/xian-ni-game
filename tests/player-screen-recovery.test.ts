/// <reference types="vite/client" />
import { afterEach, describe, expect, it } from 'vitest';
import completed from '../qa/fixtures/return-journey-v0.5.0.json?raw';
import { act, createGame, restore, snapshot, tick } from '../src/game/model';
import { SCENES } from '../src/game/content';
import type { Entity, GameState, Vec } from '../src/game/contracts';

const home = SCENES.home;
afterEach(() => { SCENES.home = home; });
const idle = { x: 0, y: 0 };
function run(s: GameState, seconds: number, input = idle) {
  for (let t = 0; t < seconds; t += 1 / 60) tick(s, Math.min(1 / 60, seconds - t), input);
}
function walk(s: GameState, point: Vec) {
  expect(act(s, { type: 'move', point }).ok).toBe(true);
  for (let t = 0; t < 40 && s.player.path.length && !s.defeated; t += 1 / 60) tick(s, 1 / 60, idle);
  expect(Math.hypot(s.player.x - point.x, s.player.y - point.y)).toBeLessThan(3);
}
function interact(s: GameState, targetId: string) {
  expect(act(s, { type: 'interact', targetId }).ok).toBe(true);
}
function actualDrop(s: GameState, e: Entity, held: boolean, offsetX = 0) {
  const point = { x: s.player.x + offsetX, y: s.player.y };
  expect(act(s, { type: 'cast', spell: 'pull', targetId: e.id, point: { x: e.x, y: e.y } }).ok).toBe(true);
  expect(act(s, { type: 'move', point }).ok).toBe(true);
  run(s, 1);
  expect(Math.hypot(e.x - point.x, e.y - point.y)).toBeLessThan(.6);
  if (held) {
    expect(act(s, { type: 'hold' }).ok).toBe(true);
    expect(e.state).toBe('held'); run(s, 8.1);
  } else expect(act(s, { type: 'release' }).ok).toBe(true);
  expect(e.state).toBe('idle'); expect(s.player.pullId).toBeNull(); expect(s.defeated).toBe(false);
}
function actualKilnDrop(held: boolean) {
  const s = restore(completed);
  expect(act(s, { type: 'pause', value: false }).ok).toBe(true);
  if (held) {
    walk(s, { x: 1040, y: 430 }); interact(s, 'workbench');
    for (let i = 0; i < 4 && !s.dialogue?.choices.some(c => c.id === 'hold'); i++) expect(act(s, { type: 'choose', choiceId: 'more' }).ok).toBe(true);
    expect(act(s, { type: 'choose', choiceId: 'hold' }).ok).toBe(true);
  }
  walk(s, { x: 340, y: 850 }); interact(s, 'rest_home');
  while (s.player.mana > (held ? 2 : 1)) {
    expect(act(s, { type: 'cast', spell: 'ward', point: { x: 500, y: 850 } }).ok).toBe(true); run(s, 3.1);
  }
  walk(s, { x: 1580, y: 690 }); interact(s, 'to_creek');
  expect(act(s, { type: 'choose', choiceId: 'canal:depart:creek' }).ok).toBe(true);
  for (const point of [{ x: 300, y: 740 }, { x: 300, y: 340 }, { x: 700, y: 315 }]) walk(s, point);
  interact(s, 'creek_to_kiln'); walk(s, { x: 420, y: 640 });
  const e = s.worlds.kiln.find(e => e.id === 'shield_board')!;
  actualDrop(s, e, held);
  expect(s.player.mana).toBe(0); expect(Math.hypot(s.player.x - e.x, s.player.y - e.y)).toBeLessThan(.6);
  return s;
}

for (const held of [false, true]) describe(held ? 'actual hold expiry on the player' : 'actual grounded drop on the player', () => {
  for (const saved of [false, true]) for (const input of ['keyboard', 'click'] as const) it(`can leave outward with ${input}${saved ? ' after full save/restore' : ''} at zero mana`, () => {
    const source = actualKilnDrop(held), s = saved ? restore(snapshot(source)) : source;
    expect(s.player.mana).toBe(0);
    const e = s.worlds.kiln.find(e => e.id === 'shield_board')!, start = { x: s.player.x, y: s.player.y }, screenBefore = structuredClone(e);
    if (input === 'keyboard') run(s, 1, { x: -1, y: 0 });
    else walk(s, { x: start.x - 150, y: start.y });
    expect(s.player.x).toBeLessThan(start.x - 70);
    expect(s.player.mana).toBe(0); expect(s.defeated).toBe(false);
    expect(e).toEqual(screenBefore); // Recover the player, never teleport or refund the object.
  });
});

function geometry() {
  SCENES.home = { ...home, width: 1400, height: 1000, ground: [], obstacles: [], entities: [] };
  const s = createGame({ name: '行舟', origin: 'tinker', wish: 'travel', appearance: 0 });
  const screen: Entity = { id: 'shield_board', type: 'shield_board', name: '轻木屏', kind: 'object', x: 600, y: 700, homeX: 600, homeY: 700, w: 100, h: 40, state: 'idle', solid: true, movable: true };
  s.worlds.home = [screen]; s.player.x = 500; s.player.y = 700;
  return { s, screen };
}

describe('player recovery is restricted to an already overlapping movable solid', () => {
  it('does not permit entering the screen again from outside after recovering', () => {
    const { s, screen } = geometry(); actualDrop(s, screen, false);
    walk(s, { x: 350, y: 700 });
    expect(act(s, { type: 'move', point: { x: 500, y: 700 } }).ok).toBe(false);
    run(s, 2, { x: 1, y: 0 }); expect(s.player.x).toBeLessThanOrEqual(433);
  });
  it('cannot deepen an off-center overlap or pass through the far side of the screen', () => {
    const { s, screen } = geometry(); actualDrop(s, screen, false, 20);
    run(s, .2, { x: 1, y: 0 }); expect(s.player.x).toBe(500);
    run(s, 1, { x: -1, y: 0 }); expect(s.player.x).toBeLessThan(453);
  });
  for (const kind of ['wall', 'water', 'solid'] as const) it(`still collides with a separate ${kind} while escaping`, () => {
    const { s, screen } = geometry();
    if (kind === 'solid') s.worlds.home.push({ id: 'fixed_crate', kind: 'object', type: 'crate', name: '实心箱', x: 370, y: 700, w: 40, h: 160, state: 'idle', solid: true });
    else {
      SCENES.home.obstacles.push({ x: 350, y: 620, w: 40, h: 160 });
      if (kind === 'water') SCENES.home.ground.push({ type: 'water', points: [350, 620, 390, 620, 390, 780, 350, 780] });
    }
    actualDrop(s, screen, false);
    expect(act(s, { type: 'move', point: { x: 370, y: 700 } }).ok).toBe(false);
    run(s, 2, { x: -1, y: 0 });
    expect(s.player.x).toBeLessThan(433); expect(s.player.x).toBeGreaterThanOrEqual(407);
  });
});

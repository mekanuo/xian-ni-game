/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import completed from '../qa/fixtures/return-journey-v0.5.0.json?raw';
import { act, createGame, tick, restore, snapshot } from '../src/game/model';
import { createKilnState, kilnBeforeTravel, kilnChoices, kilnChoose, kilnDescription, kilnInteract, kilnObjective, kilnRefresh, kilnTick } from '../src/game/kiln';
import { KILN_POINTS as P } from '../src/game/kiln-content';
import type { GameState, Vec } from '../src/game/contracts';
import type { LifePorts } from '../src/game/life';

function fixture() {
  const s = createGame({ name: '行舟', origin: 'tinker', wish: 'travel', appearance: 0 });
  s.scene = 'kiln'; s.journey.stage = 'complete'; s.kiln.visited = true; s.kiln.entry = 'west';
  s.player.x = 260; s.player.y = 620;
  return s;
}
const screen = (s: GameState) => s.worlds.kiln.find(e => e.id === 'shield_board')!;
const duqin = (s: GameState) => s.worlds.kiln.find(e => e.id === 'duqin')!;
const ports = (visible = true, free = true): LifePorts => ({
  free: () => free, clearLine: () => visible,
  emit: (s, type, text, e) => { s.events.push({ seq: s.events.length + 1, time: s.time, type, text, ...e }); },
  dialogue: (s, id, speaker, text, choices = []) => { s.dialogue = { id, speaker, text, choices }; },
});
function borrow(s: GameState, p = ports()) {
  expect(kilnChoose(s, 'kiln:borrow', p)?.ok).toBe(true);
  Object.assign(screen(s), { x: 620, y: 700, state: 'idle' });
  kilnTick(s, .1, p); expect(s.kiln.loan).toBe('borrowed');
}
function returnScreen(s: GameState, p = ports()) {
  Object.assign(screen(s), { ...P.screen, state: 'idle' });
  return kilnChoose(s, 'kiln:return', p);
}

describe('kiln facts, permission and actual observation', () => {
  it('starts with no visits, crossings, loan or shelter permission', () => {
    expect(createKilnState()).toEqual({ visited: false, entry: null, crossed: { west: false, east: false }, loan: 'none', shelterOpened: false });
  });
  it('refreshes only derived entry and rest visibility after the actual previous chapter completes', () => {
    const s = createGame({ name: '行舟', origin: 'tinker', wish: 'travel', appearance: 0 });
    kilnRefresh(s);
    expect(s.worlds.creek.find(e => e.id === 'creek_to_kiln')?.state).toBe('hidden');
    s.journey.stage = 'complete'; kilnRefresh(s);
    expect(s.worlds.creek.find(e => e.id === 'creek_to_kiln')?.state).toBe('idle');
    expect(s.worlds.canal.find(e => e.id === 'canal_to_kiln')?.state).toBe('idle');
    expect(s.kiln).toEqual(createKilnState());
    expect(s.worlds.kiln.find(e => e.id === 'kiln_rest')?.state).toBe('hidden');
  });
  it('distinguishes west/east entry, a same-side retreat, and actually exiting the opposite side', () => {
    const s = fixture(), p = ports(); s.kiln = createKilnState(); s.scene = 'creek';
    kilnBeforeTravel(s, 'kiln', p); expect(s.kiln.entry).toBe('west'); expect(s.kiln.visited).toBe(true);
    expect(s.kiln.crossed).toEqual({ west: false, east: false });
    s.scene = 'kiln'; kilnBeforeTravel(s, 'creek', p); expect(s.kiln.entry).toBeNull(); expect(s.kiln.crossed.east).toBe(false);
    s.scene = 'canal'; kilnBeforeTravel(s, 'kiln', p); expect(s.kiln.entry).toBe('east');
    s.scene = 'kiln'; kilnBeforeTravel(s, 'creek', p); expect(s.kiln.crossed.west).toBe(true);
    s.scene = 'creek'; kilnBeforeTravel(s, 'kiln', p); s.scene = 'kiln'; kilnBeforeTravel(s, 'canal', p);
    expect(s.kiln.crossed).toEqual({ west: true, east: true }); expect(s.kiln.loan).toBe('none');
  });
  it('does not infer entry or completion from a remote visit or an unfinished previous chapter', () => {
    const s = fixture(), p = ports(); s.kiln = createKilnState(); s.journey.stage = 'ready'; s.scene = 'creek';
    kilnBeforeTravel(s, 'kiln', p); expect(s.kiln).toEqual(createKilnState());
    s.journey.stage = 'complete'; s.scene = 'home'; kilnBeforeTravel(s, 'kiln', p);
    expect(s.kiln).toEqual(createKilnState()); kilnBeforeTravel(s, 'canal', p); expect(s.kiln.crossed.east).toBe(false);
  });
  it('a promise and a small movement within the workspace cannot count as borrowing or returning', () => {
    const s = fixture(), p = ports();
    expect(kilnChoose(s, 'kiln:borrow', p)).toMatchObject({ ok: true, checkpoint: true });
    expect(s.kiln.loan).toBe('agreed');
    Object.assign(screen(s), { x: 540, y: 650 }); kilnTick(s, .1, p);
    expect(s.kiln.loan).toBe('agreed'); expect(returnScreen(s, p)?.ok).toBe(false);
    expect(s.kiln.shelterOpened).toBe(false);
  });
  it('does not retroactively authorize a screen already removed without permission', () => {
    const s = fixture(); Object.assign(screen(s), { x: 620, y: 700 });
    kilnTick(s, .1, ports()); expect(s.kiln.loan).toBe('none');
    expect(kilnChoose(s, 'kiln:borrow', ports())?.ok).toBe(false); expect(s.kiln.loan).toBe('none');
  });
  it('records borrowing only when Duqin can actually see the removed intact screen', () => {
    const s = fixture(); expect(kilnChoose(s, 'kiln:borrow', ports())?.ok).toBe(true);
    Object.assign(screen(s), { x: 620, y: 700 }); kilnTick(s, .1, ports(false)); expect(s.kiln.loan).toBe('agreed');
    screen(s).x = 900; kilnTick(s, .1, ports()); expect(s.kiln.loan).toBe('agreed');
    screen(s).x = 620; kilnTick(s, .1, ports()); expect(s.kiln.loan).toBe('borrowed');
  });
  it('burning an agreed screen in place cannot invent a borrowing history', () => {
    const s = fixture(); kilnChoose(s, 'kiln:borrow', ports());
    for (const state of ['burning', 'burned']) { Object.assign(screen(s), { x: 620, y: 700, state }); kilnTick(s, .1, ports()); }
    expect(s.kiln.loan).toBe('agreed'); expect(s.kiln.shelterOpened).toBe(false);
  });
  it('requires actual intact grounded return, visibility and a nearby acknowledgement before granting the shelter', () => {
    const s = fixture(); borrow(s);
    Object.assign(screen(s), { ...P.screen, state: 'held' }); s.player.pullId = 'shield_board'; s.player.hold = 8;
    expect(kilnChoose(s, 'kiln:return', ports())?.ok).toBe(false);
    screen(s).state = 'pulled'; s.player.hold = 0; expect(kilnChoose(s, 'kiln:return', ports())?.ok).toBe(false);
    screen(s).state = 'idle'; s.player.pullId = null;
    expect(kilnChoose(s, 'kiln:return', ports(false))?.ok).toBe(false);
    expect(kilnChoose(s, 'kiln:return', ports(true, false))?.ok).toBe(false);
    s.player.x = 800; expect(kilnChoose(s, 'kiln:return', ports())?.ok).toBe(false);
    s.player.x = 260; kilnTick(s, .1, ports()); expect(s.kiln.shelterOpened).toBe(false);
    expect(kilnChoose(s, 'kiln:return', ports())).toMatchObject({ ok: true, checkpoint: true });
    expect(s.kiln.loan).toBe('returned'); expect(s.kiln.shelterOpened).toBe(true);
    expect(s.worlds.kiln.find(e => e.id === 'kiln_rest')?.state).toBe('idle');
  });
  it('cannot return a burned screen and keeps later physical damage distinct from an already earned permission', () => {
    const damaged = fixture(); borrow(damaged); Object.assign(screen(damaged), { ...P.screen, state: 'burned' });
    expect(kilnChoose(damaged, 'kiln:return', ports())?.ok).toBe(false); expect(damaged.kiln.shelterOpened).toBe(false);
    expect(kilnObjective(damaged)).not.toMatch(/完好落回原位/);
    const s = fixture(); borrow(s); expect(returnScreen(s)?.ok).toBe(true);
    const events = s.events.length; expect(kilnChoose(s, 'kiln:return', ports())?.ok).toBe(true); expect(s.events).toHaveLength(events);
    Object.assign(screen(s), { x: 620, y: 700, state: 'burned' }); kilnTick(s, .1, ports());
    expect(s.kiln.loan).toBe('returned'); expect(s.kiln.shelterOpened).toBe(true); expect(screen(s).state).toBe('burned');
    expect(kilnDescription(s, duqin(s), ports())).toMatch(/烧/);
    expect(kilnDescription(s, duqin(s), ports(false))).not.toMatch(/烧/);
    expect(kilnDescription(s, duqin(s))).not.toMatch(/烧/);
  });
  it('does not advance observation during pause, dialogue, invalid time or while the player is in another scene', () => {
    const s = fixture(); kilnChoose(s, 'kiln:borrow', ports()); Object.assign(screen(s), { x: 620, y: 700 });
    s.paused = true; kilnTick(s, 1, ports()); expect(s.kiln.loan).toBe('agreed'); s.paused = false;
    s.dialogue = { id: 'x', speaker: '杜芹', text: '', choices: [] }; kilnTick(s, 1, ports()); expect(s.kiln.loan).toBe('agreed'); s.dialogue = null;
    for (const dt of [0, -1, NaN, Infinity]) kilnTick(s, dt, ports()); expect(s.kiln.loan).toBe('agreed');
    s.scene = 'creek'; kilnTick(s, 1, ports()); expect(s.kiln.loan).toBe('agreed');
  });
  it('blocks an unearned rest, keeps dialogue short and gives no cross-map mandatory loan objective', () => {
    const s = fixture(), p = ports(), rest = s.worlds.kiln.find(e => e.id === 'kiln_rest')!;
    expect(kilnInteract(s, rest, p)?.ok).toBe(false);
    expect(kilnInteract(s, duqin(s), p)?.ok).toBe(true); expect(s.dialogue?.choices.length).toBeLessThanOrEqual(2);
    expect(kilnChoices(s, screen(s))).toHaveLength(0);
    s.scene = 'home'; expect(kilnObjective(s)).toBeUndefined(); expect(kilnDescription(s, duqin(s), p)).toBeUndefined();
  });
});

function advance(s: GameState, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / 60) tick(s, Math.min(1 / 60, seconds - t), { x: 0, y: 0 });
}
function walk(s: GameState, point: Vec) {
  expect(act(s, { type: 'move', point }).ok).toBe(true);
  for (let i = 0; i < 600 && s.player.path.length; i++) tick(s, 1 / 60, { x: 0, y: 0 });
  expect(Math.hypot(s.player.x - point.x, s.player.y - point.y)).toBeLessThan(3);
}
function discuss(s: GameState, choiceId: string) {
  expect(act(s, { type: 'interact', targetId: 'duqin' }).ok).toBe(true);
  expect(s.dialogue?.choices.some(c => c.id === choiceId)).toBe(true);
  expect(act(s, { type: 'choose', choiceId }).ok).toBe(true);
}
function moveScreen(s: GameState, point: Vec) {
  const e = screen(s);
  expect(act(s, { type: 'cast', spell: 'pull', targetId: e.id, point: { x: e.x, y: e.y } }).ok).toBe(true);
  expect(act(s, { type: 'move', point }).ok).toBe(true);
  for (let i = 0; i < 180 && Math.hypot(e.x - point.x, e.y - point.y) > 2; i++) tick(s, 1 / 60, { x: 0, y: 0 });
  expect(Math.hypot(e.x - point.x, e.y - point.y)).toBeLessThan(3);
  expect(act(s, { type: 'release' }).ok).toBe(true);
  advance(s, .8);
}

function realEntry() {
  const s = restore(completed);
  expect(act(s, { type: 'pause', value: false }).ok).toBe(true);
  walk(s, { x: 340, y: 850 }); expect(act(s, { type: 'interact', targetId: 'rest_home' }).ok).toBe(true);
  walk(s, { x: 1580, y: 690 }); expect(act(s, { type: 'interact', targetId: 'to_creek' }).ok).toBe(true);
  expect(act(s, { type: 'choose', choiceId: 'canal:depart:creek' }).ok).toBe(true);
  for (const p of [{ x: 300, y: 740 }, { x: 300, y: 340 }, { x: 700, y: 315 }]) walk(s, p);
  expect(act(s, { type: 'interact', targetId: 'creek_to_kiln' }).ok).toBe(true);
  expect(s.scene).toBe('kiln'); walk(s, { x: 260, y: 620 });
  return s;
}

describe('kiln uses actual model input and physical objects', () => {
  it('earns the shelter by agreeing, actually pulling out and returning an intact screen, then speaking nearby', () => {
    // Start from the frozen real 0.5 export; all resources and entry come from actual input.
    const s = realEntry();
    discuss(s, 'kiln:borrow'); expect(s.kiln.loan).toBe('agreed');
    walk(s, { x: 350, y: 640 });
    moveScreen(s, { x: 620, y: 700 }); expect(s.kiln.loan).toBe('borrowed');
    expect(s.kiln.shelterOpened).toBe(false);
    moveScreen(s, P.screen); expect(screen(s).state).toBe('idle'); expect(s.player.pullId).toBeNull();
    expect(s.kiln.shelterOpened).toBe(false);
    walk(s, { x: 260, y: 620 }); discuss(s, 'kiln:return');
    expect(s.kiln.loan).toBe('returned'); expect(s.kiln.shelterOpened).toBe(true);
    expect(s.player.mana).toBe(4); expect(s.player.hp).toBeGreaterThan(0);
    expect(s.worlds.kiln.filter(e => e.kind === 'enemy').every(e => e.hp === 3 && e.state !== 'retreated')).toBe(true);
    walk(s, P.rest); expect(act(s, { type: 'interact', targetId: 'kiln_rest' }).ok).toBe(true);
    expect(s.lastSafe.scene).toBe('kiln'); expect(s.player.mana).toBe(6);
    expect(restore(snapshot(s)).kiln).toEqual(s.kiln);
    walk(s, { x: 350, y: 640 });
    expect(act(s, { type: 'retreat' }).ok).toBe(true);
    expect(s.scene).toBe('kiln'); expect(s.player.x).toBe(P.rest.x); expect(s.player.y).toBe(P.rest.y);
    expect(s.kiln.entry).toBe('west'); expect(s.kiln.crossed).toEqual({ west: false, east: false });
    expect(s.kiln.loan).toBe('returned'); expect(screen(s).state).toBe('idle');
    expect(restore(snapshot(s)).kiln).toEqual(s.kiln);
  });
  it('actually burning an agreed screen in place cannot earn a return or shelter permission', () => {
    const s = realEntry(); discuss(s, 'kiln:borrow'); walk(s, { x: 350, y: 640 });
    expect(act(s, { type: 'cast', spell: 'flame', targetId: 'shield_board', point: P.screen }).ok).toBe(true);
    advance(s, 14);
    expect(screen(s).state).toBe('burned'); expect(s.kiln.loan).toBe('agreed'); expect(s.kiln.shelterOpened).toBe(false);
    walk(s, { x: 260, y: 620 }); expect(act(s, { type: 'interact', targetId: 'duqin' }).ok).toBe(true);
    expect(s.dialogue?.text).toMatch(/烧/);
    expect(act(s, { type: 'choose', choiceId: 'kiln:return' }).ok).toBe(false);
    expect(s.kiln.shelterOpened).toBe(false); expect(s.player.mana).toBe(5);
  });
});

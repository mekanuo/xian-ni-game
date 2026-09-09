import { describe, expect, it } from 'vitest';
import { act, createGame, interactionPoint, previewPullMove, snapshot, tick } from '../src/game/model';
import type { GameState, Vec } from '../src/game/contracts';

const profile = { name: '行舟', origin: 'tinker' as const, wish: 'travel' as const, appearance: 0 as const };
const object = (s: GameState, id: string) => s.worlds[s.scene].find(e => e.id === id)!;
function arrive(s: GameState, point: Vec) {
  expect(act(s, { type: 'move', point }).ok).toBe(true);
  for (let t = 0; t < 25 && s.player.path.length; t += .05) tick(s, .05, { x: 0, y: 0 });
  expect(Math.hypot(s.player.x - point.x, s.player.y - point.y)).toBeLessThan(4);
}
function pullingByWall() {
  const s = createGame(profile);
  // The real courtyard wall occupies x 660..880, y 510..660.
  s.player.x = 750; s.player.y = 750;
  const lamp = object(s, 'lamp'); lamp.x = 630; lamp.y = 680;
  expect(act(s, { type: 'cast', spell: 'pull', targetId: lamp.id, point: { x: lamp.x, y: lamp.y } }).ok).toBe(true);
  return s;
}

describe('reachable interaction standing points', () => {
  it('finds another side when the near-side approach lies inside the courtyard wall', () => {
    const s = createGame(profile), table = object(s, 'table');
    table.y = 490; s.player.x = 760; s.player.y = 750;
    expect(act(s, { type: 'move', point: { x: table.x, y: table.y + 78 } }).ok).toBe(false);
    const before = snapshot(s), point = interactionPoint(s, table.id);
    expect(point).toBeDefined(); expect(snapshot(s)).toBe(before);
    expect(Math.hypot(point!.x - table.x, point!.y - table.y)).toBeLessThan(96);
    expect(point!.y).toBeLessThan(510);
    arrive(s, point!);
    expect(act(s, { type: 'interact', targetId: table.id }).ok).toBe(true);
    expect(s.dialogue).not.toBeNull();
  });
  it('rejects a target enclosed in a real solid obstacle without changing the old walk', () => {
    const s = createGame(profile), table = object(s, 'table');
    table.y = 580;
    act(s, { type: 'move', point: { x: 360, y: 850 } });
    const before = snapshot(s);
    expect(interactionPoint(s, table.id)).toBeUndefined(); expect(snapshot(s)).toBe(before);
  });
  it.each(['taken', 'hidden', 'gone'])('does not approach or interact with a %s object', state => {
    const s = createGame(profile), lamp = object(s, 'lamp'); lamp.state = state;
    const before = snapshot(s);
    expect(interactionPoint(s, lamp.id)).toBeUndefined();
    expect(act(s, { type: 'interact', targetId: lamp.id }).ok).toBe(false);
    expect(snapshot(s)).toBe(before);
  });
  it('rejects scenery, enemies, missing IDs, and the lamp already merged into its stand', () => {
    const s = createGame(profile); s.flags.lampFixed = true;
    expect(interactionPoint(s, 'lamp')).toBeUndefined();
    expect(interactionPoint(s, 'missing')).toBeUndefined();
    s.scene = 'workshop';
    expect(interactionPoint(s, 'trial_mark')).toBeUndefined();
    expect(interactionPoint(s, 'beast_a')).toBeUndefined();
  });
  it('cannot find a route to the far bank while both crossing passages are closed', () => {
    const s = createGame(profile); s.scene = 'crossing'; s.player.x = 500; s.player.y = 900;
    expect(interactionPoint(s, 'far_bank')).toBeUndefined();
  });
});

describe('pull placement preview and execution', () => {
  it('cancels a paused queued spell without consuming mana or dropping a held object', () => {
    const s = pullingByWall(); s.ringStyle = 'hold';
    expect(act(s, { type: 'hold' }).ok).toBe(true);
    const pullId = s.player.pullId, mana = s.player.mana;
    act(s, { type: 'pause', value: true });
    act(s, { type: 'cast', spell: 'ward', point: { x: 950, y: 750 } });
    expect(s.pending?.type).toBe('cast');
    expect(act(s, { type: 'cancel' }).ok).toBe(true);
    expect(s.pending).toBeNull(); expect(s.paused).toBe(true);
    act(s, { type: 'pause', value: false });
    expect(s.player.mana).toBe(mana); expect(s.player.ward).toBe(0);
    expect(s.player.pullId).toBe(pullId); expect(s.player.hold).toBe(8); expect(s.player.pullPoint).toBeNull();
  });
  it('canceling aim preserves a pending movement and an existing walking route', () => {
    const s = createGame(profile);
    act(s, { type: 'move', point: { x: 360, y: 900 } });
    act(s, { type: 'pause', value: true });
    act(s, { type: 'move', point: { x: 500, y: 900 } });
    const before = snapshot(s);
    expect(act(s, { type: 'cancel' }).ok).toBe(true); expect(snapshot(s)).toBe(before);
  });
  it('rejects a free destination behind a wall without replacing the old pull target', () => {
    const s = pullingByWall(), point = { x: 900, y: 500 }, before = snapshot(s);
    expect(act(s, { type: 'move', point }).ok).toBe(false);
    expect(snapshot(s)).toBe(before);
    const preview = previewPullMove(s, point);
    expect(preview.valid).toBe(false); expect(preview.reason).toContain('路径');
    expect(snapshot(s)).toBe(before);
  });
  it('shares legal placement checks and charges no extra mana for relocating a pulled object', () => {
    const s = pullingByWall(), point = { x: 600, y: 760 }, before = snapshot(s), mana = s.player.mana;
    expect(previewPullMove(s, point)).toMatchObject({ valid: true, cost: 0, range: 300 });
    expect(snapshot(s)).toBe(before);
    expect(act(s, { type: 'move', point }).ok).toBe(true);
    expect(s.player.pullPoint).toEqual(point); expect(s.player.mana).toBe(mana);
    for (let i = 0; i < 30; i++) tick(s, .05, { x: 0, y: 0 });
    expect(object(s, 'lamp').x).toBeCloseTo(point.x); expect(object(s, 'lamp').y).toBeCloseTo(point.y);
  });
  it('allows the full long-pull practice range before a ring style is permanently trained', () => {
    const s = createGame(profile); s.flags.trialStyle = 'long';
    const lamp = object(s, 'lamp');
    expect(act(s, { type: 'cast', spell: 'pull', targetId: lamp.id, point: { x: lamp.x, y: lamp.y } }).ok).toBe(true);
    const point = { x: 800, y: 850 };
    expect(previewPullMove(s, point)).toMatchObject({ valid: true, range: 500 });
    expect(act(s, { type: 'move', point }).ok).toBe(true); expect(s.player.pullPoint).toEqual(point);
  });
  it('rejects non-finite, blocked and out-of-range destinations without mutation', () => {
    const s = pullingByWall();
    for (const point of [{ x: NaN, y: 700 }, { x: 750, y: 580 }, { x: 1400, y: 750 }]) {
      const before = snapshot(s);
      expect(previewPullMove(s, point).valid).toBe(false);
      expect(act(s, { type: 'move', point }).ok).toBe(false); expect(snapshot(s)).toBe(before);
    }
  });
  it('requires an active pull; a suspended object frees move input for walking', () => {
    const s = createGame(profile), point = { x: 500, y: 780 };
    expect(previewPullMove(s, point).valid).toBe(false);
    s.ringStyle = 'hold';
    expect(act(s, { type: 'cast', spell: 'pull', targetId: 'lamp', point: { x: 430, y: 760 } }).ok).toBe(true);
    expect(act(s, { type: 'hold' }).ok).toBe(true);
    const before = snapshot(s);
    expect(previewPullMove(s, point).valid).toBe(false); expect(snapshot(s)).toBe(before);
    expect(act(s, { type: 'move', point }).ok).toBe(true);
    expect(s.player.pullPoint).toBeNull(); expect(s.player.path.length).toBeGreaterThan(0);
  });
});

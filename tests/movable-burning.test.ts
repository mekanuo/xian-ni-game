import { describe, expect, it } from 'vitest';
import { act, createGame, previewCast, tick } from '../src/game/model';
import type { Entity, GameState } from '../src/game/contracts';

function fixture() {
  const s = createGame({ name: '行舟', origin: 'tinker', wish: 'travel', appearance: 0 });
  const screen: Entity = { id: 'shield_board', kind: 'object', type: 'shield_board', name: '轻木屏', x: 700, y: 900, homeX: 700, homeY: 900, w: 100, h: 40, state: 'idle', movable: true, solid: true, flammable: true };
  s.worlds.home = [screen]; s.player.x = 500; s.player.y = 900; s.ringStyle = 'hold';
  return { s, screen };
}
function run(s: GameState, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / 60) tick(s, Math.min(1 / 60, seconds - t), { x: 0, y: 0 });
}
function flame(s: GameState, e: Entity) {
  expect(act(s, { type: 'cast', spell: 'flame', targetId: e.id, point: { x: e.x, y: e.y } }).ok).toBe(true);
}
function pull(s: GameState, e: Entity) {
  return act(s, { type: 'cast', spell: 'pull', targetId: e.id, point: { x: e.x, y: e.y } });
}

describe('movable burning objects keep their physical outcome', () => {
  it('rejects pulling a burning screen without consuming mana or extinguishing it', () => {
    const { s, screen } = fixture(); flame(s, screen); run(s, 1.1);
    expect(screen.state).toBe('burning'); const mana = s.player.mana, timer = screen.timer;
    expect(previewCast(s, 'pull', screen.id, screen).valid).toBe(false);
    expect(pull(s, screen).ok).toBe(false);
    expect(s.player.mana).toBe(mana); expect(screen.state).toBe('burning'); expect(screen.timer).toBe(timer);
  });
  it('cannot pull a genuinely burned screen back into a solid obstacle', () => {
    const { s, screen } = fixture(); flame(s, screen); run(s, 13.2);
    expect(screen.state).toBe('burned'); const mana = s.player.mana;
    expect(pull(s, screen).ok).toBe(false);
    expect(act(s, { type: 'release' }).ok).toBe(true);
    expect(screen.state).toBe('burned'); expect(s.player.mana).toBe(mana);
    expect(act(s, { type: 'move', point: { x: screen.x, y: screen.y } }).ok).toBe(true);
    run(s, 2); expect(Math.hypot(s.player.x - screen.x, s.player.y - screen.y)).toBeLessThan(3);
  });
  it('igniting a held screen naturally drops it, frees the hand and cannot be undone by release', () => {
    const { s, screen } = fixture(); expect(pull(s, screen).ok).toBe(true);
    expect(act(s, { type: 'hold' }).ok).toBe(true); expect(screen.state).toBe('held');
    flame(s, screen); run(s, 1.1);
    expect(screen.state).toBe('burning'); expect(s.player.pullId).toBeNull();
    expect(s.player.pullPoint).toBeNull(); expect(s.player.hold).toBe(0); expect(s.player.mana).toBe(3);
    expect(act(s, { type: 'release' }).ok).toBe(true); expect(screen.state).toBe('burning');
    expect(act(s, { type: 'move', point: { x: screen.x, y: screen.y } }).ok).toBe(false);
    run(s, 12.1); expect(screen.state).toBe('burned');
  });
  it('an already preparing flame can ignite the object subsequently pulled, which then drops and burns', () => {
    const { s, screen } = fixture(); flame(s, screen);
    expect(pull(s, screen).ok).toBe(true); expect(screen.state).toBe('pulled');
    run(s, 1.1);
    expect(screen.state).toBe('burning'); expect(s.player.pullId).toBeNull();
    expect(s.player.pullPoint).toBeNull(); expect(s.player.mana).toBe(4);
    run(s, 12.1); expect(screen.state).toBe('burned');
  });
  it('does not change ordinary nonburning pull, hold and release behavior', () => {
    const { s, screen } = fixture(); expect(pull(s, screen).ok).toBe(true);
    expect(act(s, { type: 'move', point: { x: 740, y: 900 } }).ok).toBe(true); run(s, .4);
    expect(screen.x).toBeCloseTo(740); expect(act(s, { type: 'hold' }).ok).toBe(true);
    expect(s.player.hold).toBe(8); expect(screen.state).toBe('held');
    expect(act(s, { type: 'release' }).ok).toBe(true);
    expect(screen.state).toBe('idle'); expect(s.player.pullId).toBeNull(); expect(s.player.mana).toBe(4);
  });
});

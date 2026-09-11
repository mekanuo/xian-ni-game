import { describe, expect, it } from 'vitest';
import { act, createGame, tick } from '../src/game/model';
import type { Entity, GameState, Projectile } from '../src/game/contracts';

const profile = { name: '行舟', origin: 'tinker' as const, wish: 'travel' as const, appearance: 0 as const };
const steps = [1 / 40, 1 / 60, 1 / 120];
function scene() {
  const s = createGame(profile);
  s.worlds.home = [];
  s.player.x = 940; s.player.y = 900;
  return s;
}
function board(s: GameState, extra: Partial<Entity> = {}) {
  const e: Entity = { id: 'shield_board', kind: 'object', type: 'shield_board', name: '挡板', x: 790, y: 900, w: 100, h: 40, state: 'idle', solid: true, movable: true, ...extra };
  s.worlds.home.push(e); return e;
}
function target(s: GameState, x: number, y: number) {
  const e: Entity = { id: 'target', kind: 'enemy', type: 'raider', name: '对手', x, y, w: 40, h: 60, state: 'peaceful', hp: 3 };
  s.worlds.home.push(e); return e;
}
function shot(s: GameState, owner: Projectile['owner'], x: number, y: number) {
  s.projectiles.push({ id: 90, owner, x, y, vx: owner === 'enemy' ? 260 : 420, vy: 0, life: 1.6 });
}
function run(s: GameState, dt: number, seconds = 1.5) {
  for (let elapsed = 0; elapsed < seconds; elapsed += dt) tick(s, Math.min(dt, seconds - elapsed), { x: 0, y: 0 });
}

describe('continuous projectile obstacle collisions', () => {
  for (const dt of steps) for (const owner of ['enemy', 'player'] as const) {
    it(`${owner} stops at the grounded board at step ${dt}`, () => {
      const s = scene(); board(s); const enemy = target(s, 940, 900);
      shot(s, owner, 680, 900); run(s, dt);
      expect(s.player.hp).toBe(4); expect(enemy.hp).toBe(3);
      expect(s.projectiles).toHaveLength(0);
      expect(s.events.find(e => e.type === 'impact')?.x).toBeCloseTo(740, 8);
    });
    it(`${owner} stops at the fixed wall at step ${dt}`, () => {
      const s = scene(); s.player.x = 950; s.player.y = 580; const enemy = target(s, 950, 580);
      shot(s, owner, 600, 580); run(s, dt);
      expect(s.player.hp).toBe(4); expect(enemy.hp).toBe(3);
      expect(s.events.find(e => e.type === 'impact')?.x).toBeCloseTo(660, 8);
    });
  }
  it('hits the first obstacle independently of entity insertion order', () => {
    const s = scene(); const far = board(s, { id: 'far', x: 820, flammable: true });
    const near = board(s, { id: 'near', x: 730, flammable: true });
    shot(s, 'player', 650, 900); run(s, 1 / 60, .5);
    expect(near.state).toBe('burning'); expect(far.state).toBe('idle');
    expect(s.events.find(e => e.type === 'fire')?.targetId).toBe('near');
  });
  it('ignites the actual solid face hit by a directly aimed flame and opens it after burning', () => {
    const s = scene(); s.player.x = 650; const e = board(s, { flammable: true });
    expect(act(s, { type: 'cast', spell: 'flame', targetId: e.id, point: e }).ok).toBe(true);
    run(s, 1 / 40, .9);
    expect(s.player.mana).toBe(5); expect(e.state).toBe('burning');
    expect(act(s, { type: 'move', point: { x: 790, y: 900 } }).ok).toBe(false);
    run(s, 1 / 40, 12.1); expect(e.state).toBe('burned');
    expect(act(s, { type: 'move', point: { x: 790, y: 900 } }).ok).toBe(true);
    s.player.path = []; shot(s, 'enemy', 850, 900); s.projectiles[0].vx = -260;
    run(s, 1 / 120, 1); expect(s.player.hp).toBe(3);
  });
  it('checks the launch offset so a thin board beside the caster cannot be skipped', () => {
    const s = scene(); s.player.x = 400; const e = board(s, { x: 412, w: 2 }); const enemy = target(s, 500, 900);
    expect(act(s, { type: 'cast', spell: 'flame', targetId: e.id, point: e }).ok).toBe(true);
    run(s, 1 / 120, 1);
    expect(s.events.find(e => e.type === 'impact')?.x).toBeCloseTo(411, 8);
    expect(enemy.hp).toBe(3); expect(s.player.mana).toBe(5);
  });
  it('checks the launch offset against a fixed wall beside the caster', () => {
    const s = scene(); s.player.x = 650; s.player.y = 580;
    expect(act(s, { type: 'cast', spell: 'flame', point: { x: 659, y: 580 } }).ok).toBe(true);
    run(s, 1 / 120, .7);
    expect(s.projectiles).toHaveLength(0);
    expect(s.events.find(e => e.type === 'impact')?.x).toBeCloseTo(660, 8);
  });
  it('keeps unobstructed enemy damage and directional ward consumption', () => {
    const s = scene(); s.player.x = 650;
    shot(s, 'enemy', 400, 900); run(s, 1 / 120, 1); expect(s.player.hp).toBe(3);
    expect(act(s, { type: 'cast', spell: 'ward', point: { x: 400, y: 900 } }).ok).toBe(true);
    shot(s, 'enemy', 400, 900); run(s, 1 / 60, 1);
    expect(s.player.hp).toBe(3); expect(s.player.ward).toBe(0); expect(s.player.mana).toBe(5);
  });
  it('keeps unobstructed flame damage, one mana cost and interrupted enemy windup', () => {
    const s = scene(); s.player.x = 650; const enemy = target(s, 840, 900);
    expect(act(s, { type: 'cast', spell: 'flame', targetId: enemy.id, point: enemy }).ok).toBe(true);
    run(s, 1 / 120, 1.1);
    expect(enemy.hp).toBe(2); expect(enemy.data?.attack).toBe(0); expect(s.player.mana).toBe(5);
  });
  it('does not hit an obstacle beside a parallel ray or damage an enemy behind the first enemy hit', () => {
    const s = scene(); board(s, { y: 940 });
    const far = target(s, 950, 900); far.id = 'far_enemy';
    const near = target(s, 840, 900);
    shot(s, 'player', 680, 900); run(s, 1 / 120, 1);
    expect(near.hp).toBe(2); expect(far.hp).toBe(3);
    expect(s.events.some(e => e.type === 'impact')).toBe(false);
  });
  it('stops at a diagonal thin-board corner even when the entire frame segment crosses it', () => {
    const s = scene(); board(s, { x: 750, w: 2, h: 2 });
    s.projectiles.push({ id: 90, owner: 'enemy', x: 747, y: 897, vx: 260, vy: 260, life: 1 });
    tick(s, 1 / 60, { x: 0, y: 0 });
    expect(s.projectiles).toHaveLength(0);
    const impact = s.events.find(e => e.type === 'impact');
    expect(impact?.x).toBeCloseTo(749, 8); expect(impact?.y).toBeCloseTo(899, 8);
  });
  it('absorbs a projectile already inside a solid object on its next step', () => {
    const s = scene(); board(s); shot(s, 'enemy', 790, 900);
    tick(s, 1 / 120, { x: 0, y: 0 });
    expect(s.projectiles).toHaveLength(0);
    expect(s.events.find(e => e.type === 'impact')?.x).toBe(790);
  });
  for (const id of ['board', 'basket', 'boat']) it(`preserves ${id} wet material response at a solid face`, () => {
    const s = scene(); board(s, { id }); const dry = board(s, { id: 'dry', x: 900, flammable: true });
    shot(s, 'player', 680, 900); run(s, 1 / 40, .9);
    expect(s.events.find(e => e.type === 'steam')?.targetId).toBe(id);
    expect(dry.state).toBe('idle'); expect(s.projectiles).toHaveLength(0);
  });
  it('preserves the repair hearth softening effect when its solid face is hit first', () => {
    const s = scene(); const hearth = board(s, { id: 'life_hearth', state: 'loaded' });
    s.life.repair.stage = 'active';
    shot(s, 'player', 680, 900); run(s, 1 / 40, .9);
    expect(s.life.repair.softened).toBe(true); expect(hearth.state).toBe('warm');
    expect(s.projectiles).toHaveLength(0);
  });
});

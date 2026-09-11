import Phaser from 'phaser';
import './market.css';
import { interactionPoint, previewCast, previewPullMove } from '../game/model';
import type { Entity, GameAction, Spell, Vec } from '../game/contracts';
import { MARKET_MAP, MARKET_POINTS, installMarketMap, createMarketRun, marketAct, marketTick, marketThreat } from './market-model';
import type { MarketPreset, MarketRun } from './market-model';

installMarketMap();
let run: MarketRun = createMarketRun({ mana: 'ordinary', informed: true });
let aiming: Spell | null = null;
let lastEvent = -1;
const get = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const status = get('#status'), notice = get('#notice'), topbar = get('#topbar'), controls = get('#controls');
const dialogue = get('#dialogue'), choices = get('#choices');
const density = () => Math.min(devicePixelRatio || 1, 3, Math.sqrt(5_000_000 / (innerWidth * innerHeight)));
let dpr = density();
function say(message: string) { notice.textContent = message; }
function dispatch(action: GameAction) {
  const answer = marketAct(run, action);
  if (answer.message) say(answer.message);
  return answer;
}
function select(spell: Spell | null) {
  aiming = spell;
  if (spell) dispatch({ type: 'select', spell });
  document.querySelectorAll<HTMLButtonElement>('[data-spell]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.spell === spell)));
  get('[data-action="walk"]').setAttribute('aria-pressed', String(spell === null));
}
function blurPointerButton(button: HTMLButtonElement) {
  button.addEventListener('click', event => { if (event.detail > 0) button.blur(); });
}

class MarketScene extends Phaser.Scene {
  private ink!: Phaser.GameObjects.Graphics;
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private manual = false;
  private overview = false;
  private panMode = false;
  private drag: { x: number; y: number; cx: number; cy: number; id: number } | null = null;
  private approach: string | null = null;
  private priorPaused = false;
  private dialogueKey = '';
  private usable = { x: 0, y: 0, width: 1, height: 1 };
  constructor() { super('market-whitebox'); }
  create() {
    this.ink = this.add.graphics();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT,SPACE,ONE,TWO,THREE,C,ESC', false) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const event = p.event as MouseEvent;
      if (event.shiftKey || this.panMode) {
        this.manual = true;
        this.drag = { x: p.x, y: p.y, cx: this.cameras.main.scrollX, cy: this.cameras.main.scrollY, id: p.id };
        return;
      }
      const u = this.usable, x = p.x / dpr, y = p.y / dpr;
      if (x < u.x || x > u.x + u.width || y < u.y || y > u.y + u.height) return;
      this.groundInput(this.cameras.main.getWorldPoint(p.x, p.y));
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.drag || this.drag.id !== p.id) return;
      const c = this.cameras.main;
      c.setScroll(this.drag.cx - (p.x - this.drag.x) / c.zoom, this.drag.cy - (p.y - this.drag.y) / c.zoom);
    });
    const release = () => { this.drag = null; };
    for (const name of ['mouseup', 'touchend', 'touchcancel', 'pointercancel', 'blur']) window.addEventListener(name, release, true);
    this.events.once('shutdown', () => {
      for (const name of ['mouseup', 'touchend', 'touchcancel', 'pointercancel', 'blur']) window.removeEventListener(name, release, true);
    });
    this.scale.on('resize', () => this.frame());
    this.frame();
    Object.defineProperty(window, '__MARKET__', { configurable: true, value: Object.freeze({
      inspect: () => structuredClone({ ...run, threat: marketThreat(run) }),
      screenPoint: (x: number, y: number) => {
        const c = this.cameras.main, o = c.getWorldPoint(c.x, c.y);
        return { x: (c.x + (x - o.x) * c.zoom) / dpr, y: (c.y + (y - o.y) * c.zoom) / dpr };
      },
      geometry: () => structuredClone({ ...MARKET_MAP, revision: 'market-whitebox-2', points: MARKET_POINTS,
        viewport: { width: innerWidth, height: innerHeight, dpr, usable: this.usable },
        camera: { x: this.cameras.main.x / dpr, y: this.cameras.main.y / dpr, zoom: this.cameras.main.zoom / dpr,
          scrollX: this.cameras.main.scrollX, scrollY: this.cameras.main.scrollY, overview: this.overview, manual: this.manual } }),
    }) });
  }
  private clearInput() {
    Object.values(this.keys || {}).forEach(key => key.reset());
    this.drag = null;
  }
  reset() {
    const preset: MarketPreset = { mana: get<HTMLSelectElement>('[data-preset="mana"]').value as MarketPreset['mana'], informed: get<HTMLSelectElement>('[data-preset="informed"]').value === 'true' };
    run = createMarketRun(preset);
    this.approach = null; this.clearInput(); this.manual = false; this.overview = false; this.panMode = false;
    this.priorPaused = run.state.paused; lastEvent = -1; select(null);
    this.dialogueKey = ''; dialogue.hidden = true;
    this.frame(); this.syncCameraButtons();
    say('新一轮已开始。北口只确认实走端点；随后亲自步行返回原口。');
  }
  pause(value: boolean) {
    this.clearInput(); this.approach = null;
    dispatch({ type: 'pause', value });
  }
  cancel() { this.approach = null; dispatch({ type: 'cancel' }); select(null); }
  center() { this.manual = false; this.overview = false; this.panMode = false; this.drag = null; this.frame(); this.syncCameraButtons(); }
  fullView() { this.overview = !this.overview; this.manual = this.overview; this.drag = null; this.frame(); this.syncCameraButtons(); }
  togglePan() { this.panMode = !this.panMode; this.drag = null; this.syncCameraButtons(); }
  private syncCameraButtons() {
    get('[data-action="overview"]').setAttribute('aria-pressed', String(this.overview));
    get('[data-action="pan"]').setAttribute('aria-pressed', String(this.panMode));
  }
  refreshViewport() { this.frame(); }
  private frame() {
    const c = this.cameras.main;
    const heldCenter = this.manual && !this.overview ? c.getWorldPoint(c.x + c.width / 2, c.y + c.height / 2) : null;
    const top = Math.ceil(topbar.getBoundingClientRect().bottom + 8);
    const bottom = Math.floor(controls.getBoundingClientRect().top - 8);
    dialogue.style.bottom = `${innerHeight - controls.getBoundingClientRect().top + 8}px`;
    this.usable = { x: 0, y: top, width: innerWidth, height: Math.max(80, bottom - top) };
    c.setViewport(0, top * dpr, innerWidth * dpr, this.usable.height * dpr);
    // Explicit scene viewport leaves the world visible between the actual DOM panels.
    if (this.overview) c.removeBounds(); else c.setBounds(0, 0, MARKET_MAP.width, MARKET_MAP.height);
    c.setZoom(this.overview ? Math.min((innerWidth - 20) / MARKET_MAP.width, (this.usable.height - 12) / MARKET_MAP.height) * dpr : dpr * (innerWidth < 600 ? .8 : 1));
    c.centerOn(this.overview ? MARKET_MAP.width / 2 : heldCenter?.x ?? run.state.player.x, this.overview ? MARKET_MAP.height / 2 : heldCenter?.y ?? run.state.player.y);
    for (const label of this.labels.values()) label.setResolution(dpr);
  }
  private groundInput(point: Vec) {
    const s = run.state;
    this.approach = null;
    if (s.dialogue) { say('先结束眼前交谈。'); return; }
    if (s.defeated) { say('体力耗尽，请选择初态后新开。'); return; }
    if (s.player.pullId && s.player.hold <= 0 && !aiming) {
      const preview = previewPullMove(s, point);
      if (!preview.valid) { say(preview.reason); return; }
      dispatch({ type: 'move', point }); return;
    }
    const target = s.worlds.home.filter(e => !['hidden', 'retreated', 'burned'].includes(e.state) && !(e.id === 'market_door' && e.state === 'open') && Math.abs(e.x - point.x) <= e.w / 2 + 12 && Math.abs(e.y - point.y) <= e.h / 2 + 12)
      .sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y))[0];
    if (aiming) {
      const destination = target ? { x: target.x, y: target.y } : point;
      const preview = previewCast(s, aiming, target?.id, destination);
      if (!preview.valid) { say(preview.reason); return; }
      if (dispatch({ type: 'cast', spell: aiming, targetId: target?.id, point: destination }).ok) select(null);
      return;
    }
    if (target && ['market_merchant', 'market_entry', 'market_exit'].includes(target.id)) {
      if (s.paused) { dispatch({ type: 'interact', targetId: target.id }); return; }
      if (target.kind === 'exit' && Math.hypot(target.x - s.player.x, target.y - s.player.y) <= 65) {
        dispatch({ type: 'interact', targetId: target.id }); return;
      }
      const near = interactionPoint(s, target.id);
      if (!near) { say('目前不能沿可走地面接近，请换一个站位。'); return; }
      // Endpoints use the marker's actual free foot point: generic interactionPoint
      // prefers 78 units, while this chapter's model requires a closer confirmation.
      const destination = target.kind === 'exit' ? { x: target.x, y: target.y } : near;
      if (Math.hypot(destination.x - s.player.x, destination.y - s.player.y) < 3) {
        dispatch({ type: 'interact', targetId: target.id }); return;
      }
      if (dispatch({ type: 'move', point: destination }).ok) { this.approach = target.id; say(`走近${target.name}后再确认。`); }
      return;
    }
    if (target?.id === 'market_door') { say('私巷木门关着，先在摊前问清。'); return; }
    if (target?.id === 'decoy') { say('无主的轻木空筐，可用牵物移到别处；落稳时只有一次声响。'); return; }
    dispatch({ type: 'move', point });
  }
  private label(id: string, text: string, x: number, y: number, color = '#344d42') {
    let label = this.labels.get(id);
    if (!label) {
      label = this.add.text(x, y, text, { fontFamily: '"Noto Serif SC",serif', fontSize: '15px', color, backgroundColor: '#f1edddd9', padding: { x: 4, y: 2 } }).setOrigin(.5, 1).setResolution(dpr);
      this.labels.set(id, label);
    }
    label.setText(text).setPosition(x, y).setColor(color).setVisible(true);
  }
  private actor(e: Entity) {
    const g = this.ink;
    if (e.kind === 'exit') {
      g.fillStyle(0x698775, .18).fillCircle(e.x, e.y, 38);
      g.lineStyle(2, 0x58715e).strokeCircle(e.x, e.y, 30);
      this.label(e.id, e.name, e.x, e.y - 43); return;
    }
    if (e.id === 'market_door') {
      if (e.state === 'open') {
        // The leaf rests on the existing cargo footprint, never implying a new obstacle.
        g.fillStyle(0x8a7150).fillRect(e.x, e.y - e.h / 2 - 12, e.h * .65, 10);
        g.fillStyle(0xbaa578).fillCircle(e.x + 8, e.y - e.h / 2 - 7, 4);
      } else {
        g.fillStyle(0x8a7150).fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
        g.lineStyle(2, 0x554c3d).strokeRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
        g.fillStyle(0xd2bd88).fillRect(e.x - 19, e.y - 3, 38, 6);
      }
      this.label(e.id, e.state === 'open' ? '私巷 · 门已开' : '私巷 · 门未开', 695, 347); return;
    }
    if (e.kind === 'npc') {
      g.fillStyle(0x657e87).fillCircle(e.x, e.y, 17);
      const angle = e.facing ?? 0;
      g.lineStyle(3, 0x344d58).lineBetween(e.x, e.y, e.x + Math.cos(angle) * 24, e.y + Math.sin(angle) * 24);
      if (e.state === 'waiting') g.lineStyle(2, 0xac783a).strokeCircle(e.x, e.y, 23);
      this.label(e.id, e.state === 'waiting' ? '沈砚 · 见来人停步' : e.state === 'leading' ? '沈砚 · 移步' : '沈砚', e.x, e.y - 31);
      return;
    }
    if (e.kind === 'enemy') {
      if (e.state === 'retreated') { g.fillStyle(0x88927c, .5).fillCircle(e.x, e.y, 10); this.label(e.id, '已退开', e.x, e.y - 22); return; }
      g.fillStyle(e.state === 'casting' ? 0xd9a349 : e.state === 'idle' ? 0x826e5b : 0xa26847).fillCircle(e.x, e.y, 18);
      const angle = e.facing ?? Math.atan2(Number(e.data?.lastY ?? e.y) - e.y, Number(e.data?.lastX ?? e.x) - e.x);
      g.lineStyle(3, 0x4d443c).lineBetween(e.x, e.y, e.x + Math.cos(angle) * 26, e.y + Math.sin(angle) * 26);
      for (let i = 0; i < (e.hp ?? 0); i++) g.fillStyle(0x864e3e).fillRect(e.x - 18 + i * 13, e.y - 31, 10, 4);
      this.label(e.id, `散修 · ${e.state === 'casting' ? '聚火' : e.state === 'idle' ? '守望' : '警觉'}`, e.x, e.y - 39); return;
    }
    const burned = e.state === 'burned';
    g.fillStyle(burned ? 0x555d51 : e.state === 'burning' ? 0xc9803f : 0xa58b61, burned ? .45 : 1).fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
    g.lineStyle(2, 0x665b44, burned ? .3 : 1).strokeRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
    this.label(e.id, burned ? '烧毁的空筐' : e.state === 'burning' ? '空筐 · 燃烧' : e.state === 'held' ? '空筐 · 留势' : e.state === 'pulled' ? '空筐 · 牵起' : '无主空筐', e.x, e.y - e.h / 2 - 9);
  }
  private syncDialogue() {
    const d = run.state.dialogue, key = JSON.stringify(d);
    const keepPaused = get<HTMLButtonElement>('[data-action="keep-paused"]');
    keepPaused.disabled = !d || Boolean(run.state.flags.dialogueWasPaused);
    keepPaused.textContent = run.state.flags.dialogueWasPaused ? '交谈后将保持暂停' : '交谈后保持暂停';
    if (key === this.dialogueKey) return;
    this.dialogueKey = key; dialogue.hidden = !d; choices.replaceChildren();
    if (!d) return;
    this.clearInput(); this.approach = null;
    get('#speaker').textContent = d.speaker; get('#dialogue-text').textContent = d.text;
    for (const choice of d.choices) {
      const button = document.createElement('button'); button.dataset.choice = choice.id;
      button.textContent = choice.label; button.disabled = Boolean(choice.disabled); button.title = choice.disabled || '';
      button.addEventListener('click', () => dispatch({ type: 'choose', choiceId: choice.id }));
      blurPointerButton(button); choices.append(button);
    }
  }
  update(_time: number, delta: number) {
    if (!this.keys) return;
    const k = this.keys;
    const typing = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement?.tagName || '');
    // Always consume edge-triggered keys, including when native controls own focus.
    const space = Phaser.Input.Keyboard.JustDown(k.SPACE), one = Phaser.Input.Keyboard.JustDown(k.ONE), two = Phaser.Input.Keyboard.JustDown(k.TWO), three = Phaser.Input.Keyboard.JustDown(k.THREE), center = Phaser.Input.Keyboard.JustDown(k.C), escape = Phaser.Input.Keyboard.JustDown(k.ESC);
    if (!typing) {
      if (space) this.pause(!run.state.paused);
      if (one) select('pull'); if (two) select('flame'); if (three) select('ward');
      if (center) this.center(); if (escape) this.cancel();
    }
    if (run.state.paused && !this.priorPaused) { this.clearInput(); this.approach = null; }
    this.priorPaused = run.state.paused;
    const input = typing ? { x: 0, y: 0 } : { x: Number(k.D.isDown || k.RIGHT.isDown) - Number(k.A.isDown || k.LEFT.isDown), y: Number(k.S.isDown || k.DOWN.isDown) - Number(k.W.isDown || k.UP.isDown) };
    if (input.x || input.y) this.approach = null;
    marketTick(run, Math.min(delta / 1000, .1), input);
    const s = run.state, p = s.player, g = this.ink;
    if (this.approach && !s.paused && !s.dialogue && !s.defeated && !p.path.length) {
      const id = this.approach; this.approach = null; dispatch({ type: 'interact', targetId: id });
    }
    this.syncDialogue();
    if (!this.manual) this.cameras.main.centerOn(p.x, p.y);
    g.clear(); g.fillStyle(0xcfc8b2).fillRect(0, 0, MARKET_MAP.width, MARKET_MAP.height);
    g.fillStyle(0xe0d8bd).fillRect(120, 80, 1160, 840);
    for (const r of MARKET_MAP.obstacles) { g.fillStyle(0x737d72).fillRect(r.x, r.y, r.w, r.h); g.lineStyle(2, 0x4d6056).strokeRect(r.x, r.y, r.w, r.h); }
    this.label('cargo-north', '北侧货屋', 660, 200); this.label('cargo-south', '南侧货屋', 660, 640);
    this.label('public-lane', '公共巷', 660, 900);
    this.label('north-corner', '北口短墙', 1100, 334);
    for (const e of s.worlds.home) this.actor(e);
    g.fillStyle(0x284f48).fillCircle(p.x, p.y, 17);
    g.lineStyle(3, 0xe7d9a6).lineBetween(p.x, p.y, p.x + Math.cos(p.facing) * 24, p.y + Math.sin(p.facing) * 24);
    if (p.ward > 0) g.lineStyle(4, 0xd2b263).beginPath().arc(p.x, p.y, 45, p.wardFacing - 1.25, p.wardFacing + 1.25).strokePath();
    for (const shot of s.projectiles) g.fillStyle(shot.owner === 'player' ? 0xe7a23b : 0xbd6148).fillCircle(shot.x, shot.y, 6);
    for (const e of s.events.filter(e => s.time - e.time < .45 && e.x !== undefined && ['impact', 'fire', 'hurt', 'block'].includes(e.type))) g.lineStyle(3, e.type === 'hurt' ? 0xb54e36 : 0xd9a144, 1 - (s.time - e.time) / .45).strokeCircle(e.x!, e.y!, 12 + (s.time - e.time) * 30);
    const latest = s.events.at(-1); if (latest && latest.seq !== lastEvent) { lastEvent = latest.seq; say(latest.text); }
    const names = (routes: { public: boolean; private: boolean }) => [routes.public ? '公共巷' : '', routes.private ? '私巷' : ''].filter(Boolean).join('、') || '无';
    const outcome = run.trip.exitRoutes ? '已确认北口，亲自返回原口' : (run.trip.traversed.public || run.trip.traversed.private) ? `本趟穿过：${names(run.trip.traversed)}` : (run.returned.public || run.returned.private) ? `此前已往返：${names(run.returned)}` : '本趟尚未穿巷';
    status.textContent = `体力 ${p.hp}/4 · 灵力 ${p.mana}/6 · ${s.defeated ? '已倒下' : s.dialogue ? '交谈暂停' : s.paused ? '已暂停' : aiming ? '选术瞄准' : '行走'} · ${outcome}`;
    get('[data-action="pause"]').textContent = s.paused ? '继续' : '暂停';
  }
}
const game = new Phaser.Game({ type: Phaser.AUTO, parent: 'market-game', width: innerWidth * dpr, height: innerHeight * dpr,
  backgroundColor: '#cfc8b2', scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr }, render: { antialias: true, roundPixels: false }, scene: MarketScene });
const scene = () => game.scene.getScene('market-whitebox') as MarketScene;
document.querySelectorAll<HTMLButtonElement>('[data-spell]').forEach(button => button.addEventListener('click', () => select(button.dataset.spell as Spell)));
document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(button => button.addEventListener('click', () => {
  switch (button.dataset.action) {
    case 'restart': scene().reset(); break;
    case 'walk': select(null); break;
    case 'release': dispatch({ type: 'release' }); select(null); break;
    case 'hold': dispatch({ type: 'hold' }); select(null); break;
    case 'pause': scene().pause(!run.state.paused); break;
    case 'keep-paused': if (run.state.dialogue) scene().pause(true); break;
    case 'center': scene().center(); break;
    case 'overview': scene().fullView(); break;
    case 'pan': scene().togglePan(); break;
    case 'cancel': scene().cancel(); break;
  }
}));
document.querySelectorAll<HTMLButtonElement>('button').forEach(blurPointerButton);
get('#premise').textContent = '本白盒固定留势练法；消息与灵力为测试初态，只影响新开，非正式存档进度。';
// Select controls retain native focus; movement keys remain with the form until
// the player clicks the canvas or a pointer-activated action button.
get('#market-game').addEventListener('pointerdown', () => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
window.addEventListener('keydown', event => { if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code) && event.target === document.body) event.preventDefault(); });
window.addEventListener('blur', () => scene()?.pause(true));
window.addEventListener('resize', () => { dpr = density(); game.scale.setZoom(1 / dpr); game.scale.resize(innerWidth * dpr, innerHeight * dpr); });
const resize = new ResizeObserver(() => { const active = scene(); if (active?.sys?.isActive()) active.refreshViewport(); });
resize.observe(topbar); resize.observe(controls);

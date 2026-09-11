import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Independent whitebox evidence only. This script never imports the simulation,
// restores a save, or mutates __MARKET__; all gameplay uses ordinary UI input.
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
const url = process.env.GAME_URL || 'http://127.0.0.1:4193/market-whitebox.html';
const output = resolve(process.env.MARKET_OUTPUT || process.env.OUTPUT || 'qa/whitebox/market.json');
const runId = new Date().toISOString().replaceAll(/[:.]/g, '-');
const evidence = join(dirname(output), `market-${runId}`);
const caseNames = ['quiet', 'public-zero', 'lure', 'threat-zero', 'pause'];
const deviceSpecs = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, hasTouch: false },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true },
};
function selection(value, allowed) {
  const chosen = !value || value === 'all' ? allowed : value.split(',').map(x => x.trim());
  assert.ok(chosen.length && chosen.every(x => allowed.includes(x)), `Invalid selection: ${value}; available: ${allowed.join(',')}`);
  return [...new Set(chosen)];
}
const report = {
  status: 'NOT_RUN', runId, url, command: 'node scripts/market-whitebox-check.mjs',
  scope: 'Isolated market geometry and negotiation whitebox; no production scene transition or save claim.',
  selection: null, fullMatrix: false, fullMatrixStatus: 'NOT_RUN',
  seed: 'N/A — deterministic public presets; ordinary/zero mana, informed true/false, fixed hold practice.',
  environment: { node: process.version, platform: process.platform },
  statusHistory: [{ status: 'NOT_RUN', at: new Date().toISOString() }],
  cases: [], errors: [],
  limitations: [
    'Desktop Chromium and Chromium mobile emulation only; no physical phone, macOS or Safari claim.',
    'Phone gameplay uses real touchscreen taps. Camera framing alone uses simulated Shift+mouse dragging, recorded in the input trace.',
    'Information and hold practice are visible synthetic starting premises, not earned old-save progress.',
    'North and original endpoints only confirm actual near interaction and walking in the isolated home slot; production changeScene, destination usefulness and save migration are untested.',
    'Return input selects southern waypoints and proves physical endpoint return; it does not independently classify which complete east-to-west corridor a dynamic avoidance path used.',
    'Placeholder art, subjective fun, balance and production release readiness are not proven by this report.',
  ],
};
let browser, page, current, device, doorOpened = false;
const entity = (r, id) => r.state.worlds.home.find(e => e.id === id);
const npc = r => entity(r, 'market_merchant');
const door = r => entity(r, 'market_door');
const enemy = r => entity(r, 'market_raider');
const point = (x, y) => ({ x, y });
const inspect = () => page.evaluate(() => window.__MARKET__.inspect());
const geometry = () => page.evaluate(() => window.__MARKET__.geometry());
const screenPoint = p => page.evaluate(p => window.__MARKET__.screenPoint(p.x, p.y), p);
function facts(r) {
  return { time: r.state.time, player: r.state.player, npc: npc(r), enemy: enemy(r), door: door(r),
    decoy: entity(r, 'decoy'), threat: r.threat, exchanged: r.exchanged, trip: r.trip,
    completed: r.completed, returned: r.returned, paused: r.state.paused,
    dialogue: r.state.dialogue, pending: r.state.pending, defeated: r.state.defeated };
}
function log(action, detail = {}) {
  current.input.push({ action, ...detail, wall: new Date().toISOString() });
}
function healthy(r) {
  assert.equal(r.state.defeated, false, `Defeated at ${JSON.stringify(point(r.state.player.x, r.state.player.y))}`);
  assert.ok(r.state.player.hp > 0, 'Continuous route must remain alive without healing or resetting');
  if (doorOpened) assert.equal(door(r).state, 'open', 'An opened private door must never relock');
  if (door(r).state === 'open') { doorOpened = true; assert.equal(door(r).solid, false); }
}
async function observe(label, r) {
  r ??= await inspect();
  healthy(r); current.observations.push({ label, wall: new Date().toISOString(), ...facts(r) }); return r;
}
async function waitFor(label, predicate, timeout = 20000) {
  const until = Date.now() + timeout; let r, lastSample = -Infinity;
  while (Date.now() < until) {
    r = await inspect(); healthy(r);
    // Motion evidence is sampled from the running world, not inferred from a final flag.
    if (r.state.time - lastSample >= .25) { current.motion.push({ label, ...facts(r) }); lastSample = r.state.time; }
    if (predicate(r)) return r;
    await page.waitForTimeout(40);
  }
  throw Error(`${label}: timeout; actual ${JSON.stringify(facts(r))}`);
}
async function activeGap(seconds = .8) {
  const before = await inspect();
  assert.equal(before.state.paused, false); assert.equal(before.state.dialogue, null);
  log('active-input-gap', { seconds, time: before.state.time });
  return waitFor('normal world time between decisions', r => r.state.time >= before.state.time + seconds);
}
async function ui(selector) {
  log(device === 'phone' ? 'touch-ui' : 'click-ui', { selector, time: (await inspect()).state.time });
  const node = page.locator(selector);
  if (device === 'phone') await node.tap(); else await node.click();
}
const action = name => ui(`[data-action="${name}"]`);
async function ensureWalking() {
  // Normal ground walking does not require pressing the already selected mode
  // before every step. Preserve real UI input whenever the player is aiming.
  if (await page.locator('[data-action="walk"]').getAttribute('aria-pressed') !== 'true') await action('walk');
}
async function canvasAt(p) {
  const g = await geometry(), u = g.viewport.usable;
  assert.ok(p.x >= u.x + 2 && p.x <= u.x + u.width - 2 && p.y >= u.y + 2 && p.y <= u.y + u.height - 2,
    `Pointer must be within actual usable viewport: ${JSON.stringify({ p, u })}`);
  assert.equal(await page.evaluate(p => document.elementFromPoint(p.x, p.y)?.tagName, p), 'CANVAS', 'DOM must not intercept the world input');
}
async function frame(target) {
  // Keep the normal close view. Real panning can run while the world runs;
  // there is deliberately no pause, camera setter, or permanent phone overview.
  for (let attempt = 0; attempt < 12; attempt++) {
    const g = await geometry(), u = g.viewport.usable, p = await screenPoint(target);
    if (p.x >= u.x + 28 && p.x <= u.x + u.width - 28 && p.y >= u.y + 28 && p.y <= u.y + u.height - 28) return;
    const from = point(u.x + u.width / 2, u.y + u.height / 2);
    const limit = (v, max) => Math.max(-max, Math.min(max, v));
    const offX = p.x < u.x + 28 || p.x > u.x + u.width - 28;
    const offY = p.y < u.y + 28 || p.y > u.y + u.height - 28;
    const to = point(from.x - (offX ? limit(p.x - from.x, u.width * .36) : 0), from.y - (offY ? limit(p.y - from.y, u.height * .36) : 0));
    await canvasAt(from); await canvasAt(to);
    log('shift-mouse-camera-pan', { simulatedOnPhone: device === 'phone', target, from, to, camera: g.camera, time: (await inspect()).state.time });
    await page.keyboard.down('Shift');
    try { await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 4 }); }
    finally { await page.mouse.up(); await page.keyboard.up('Shift'); }
    await page.waitForTimeout(35);
  }
  throw Error(`Cannot frame ${JSON.stringify(target)} within the usable canvas`);
}
async function world(target) {
  await frame(target);
  const p = await screenPoint(target); await canvasAt(p);
  log(device === 'phone' ? 'touch-world' : 'click-world', { target, delivered: p, time: (await inspect()).state.time });
  if (device === 'phone') await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y);
}
async function walk(x, y, gap = .8) {
  const target = point(x, y), before = await inspect();
  await ensureWalking(); await world(target);
  // A real pointer may round a CSS pixel. Path exhaustion plus a generous body
  // tolerance is the arrival check; full continuous corridor flags are asserted
  // separately, so nearby stations cannot manufacture a completed route.
  const r = await waitFor(`walk ${x},${y}`, r => !r.state.player.path.length && Math.hypot(r.state.player.x - x, r.state.player.y - y) <= 24);
  assert.ok(Math.hypot(r.state.player.x - before.state.player.x, r.state.player.y - before.state.player.y) > 1 || Math.hypot(before.state.player.x - x, before.state.player.y - y) <= 24);
  await observe(`arrived ${x},${y}`, r);
  if (gap) await activeGap(gap);
}
async function interact(id) {
  await ensureWalking(); const e = entity(await inspect(), id); await world(point(e.x, e.y));
  if (id === 'market_merchant') await waitFor('real near merchant dialogue', r => r.state.dialogue?.id === 'market_talk');
}
async function choose(id) { await ui(`#dialogue button[data-choice="${id}"]`); }
async function paused(value) {
  if ((await inspect()).state.paused !== value) await action('pause');
  await waitFor(`paused=${value}`, r => r.state.paused === value);
}
async function frozen(label) {
  const before = await inspect(); await page.waitForTimeout(650);
  assert.deepEqual(await inspect(), before, `${label}: dialogue/manual pause must freeze actors, projectiles, time and pending input`);
  await observe(label, before);
}
async function screenshot(name, pauseAfterOutcome = false) {
  if (pauseAfterOutcome) await paused(true);
  await action('center');
  const path = join(evidence, `${device}-${current.id}-${name}.png`);
  await page.screenshot({ path });
  const captured = await inspect();
  current.visuals.push({ name, path, pausedAfterOutcome: pauseAfterOutcome, actuallyPaused: captured.state.paused, time: captured.state.time, geometry: await geometry() });
}
async function reset(preset) {
  await page.locator('[data-preset="mana"]').selectOption(preset.mana);
  await page.locator('[data-preset="informed"]').selectOption(String(preset.informed));
  log('public-synthetic-preset', { preset, nativeSelectControl: true });
  doorOpened = false; await action('restart');
  const r = await waitFor('fresh selected initial state', r => r.preset.mana === preset.mana && r.preset.informed === preset.informed && !r.exchanged && !r.returned.public && !r.returned.private);
  assert.equal(r.state.player.hp, 4); assert.equal(r.state.player.mana, preset.mana === 'zero' ? 0 : 6);
  assert.equal(r.state.player.pullId, null); assert.equal(r.state.pending, null); assert.equal(r.state.dialogue, null); assert.equal(r.state.paused, false);
  assert.equal(door(r).state, 'closed'); assert.equal(door(r).solid, true);
  assert.deepEqual(r.completed, { public: false, private: false }); assert.deepEqual(r.returned, { public: false, private: false });
  assert.deepEqual(r.trip, { transit: null, traversed: { public: false, private: false }, exitRoutes: null });
  assert.equal(npc(r).x, 470); assert.equal(npc(r).y, 440); assert.equal(enemy(r).hp, 3); assert.equal(enemy(r).state, 'idle');
  assert.equal(r.state.checkpoint, null); assert.equal(r.state.ringStyle, 'hold');
  await observe('fresh restart', r);
  current.initialState ??= facts(r);
  current.restartState = facts(r);
}
async function confirmNorth(route) {
  const before = await inspect(); assert.equal(before.trip.traversed[route], true, 'Must have continuously traversed the real west-to-east corridor');
  assert.equal(before.completed[route], false, 'Walking near north alone must not confirm it');
  await interact('market_exit');
  const r = await waitFor('actual north endpoint confirmation', r => r.completed[route] && r.trip.exitRoutes?.includes(route));
  assert.ok(Math.hypot(r.state.player.x - 1140, r.state.player.y - 240) <= 65);
  assert.deepEqual(r.completed, { public: route === 'public', private: route === 'private' });
  await observe('north confirmed — whitebox only', r);
}
async function confirmReturn(route) {
  await interact('market_entry');
  const r = await waitFor('actual original endpoint return confirmation', r => r.returned[route] && r.trip.exitRoutes === null);
  assert.ok(Math.hypot(r.state.player.x - 240, r.state.player.y - 760) <= 65);
  assert.deepEqual(r.returned, { public: route === 'public', private: route === 'private' });
  await observe('actual round trip complete', r);
}
async function withdraw() {
  const before = await inspect();
  await interact('market_entry');
  const r = await waitFor('new actual original-endpoint response', r => r.state.events.some(e => e.seq > Number(before.state.flags.eventSeq ?? 0) && e.targetId === 'market_entry' && e.text.includes('结束这趟')));
  assert.equal(r.trip.exitRoutes, null); assert.equal(r.state.player.path.length, 0);
  assert.ok(Math.hypot(r.state.player.x - 240, r.state.player.y - 760) <= 65);
  await observe('original endpoint explicitly accepted withdrawal', r);
}

// Route bodies below follow actual act/tick replay candidates, including normal
// active input gaps. Browser execution is still required to validate their UI timing.
const scenarios = {};
const returnViaSouthernWaypoints = async () => {
  await walk(1220, 240, 0);
  const readingStart = (await inspect()).state.time;
  log('active-north-route-reading', { minimumSeconds: 5, includesActualCameraPan: true, time: readingStart });
  await frame(point(1220, 880));
  // Camera motion is the actual look-around action. Count it inside the minimum
  // observation window, rather than adding a second artificial wait before it.
  const looked = await waitFor('five seconds of active reading including the camera pan', r => r.state.time >= readingStart + 5);
  assert.equal(looked.state.paused, false); assert.equal(looked.state.dialogue, null);
  await observe('north route observed with actual camera input', looked);
  for (const [x, y] of [[1220, 880], [880, 880], [420, 880]]) await walk(x, y);
};
scenarios.quiet = async () => {
  await reset({ mana: 'ordinary', informed: true });
  await paused(true); await screenshot('initial-close-view'); await paused(false);
  await walk(470, 760); await interact('market_merchant');
  const meeting = await observe('safe first meeting');
  assert.equal(meeting.threat, false);
  assert.equal(meeting.exchanged, false); assert.equal(door(meeting).state, 'closed');
  assert.ok(!meeting.state.events.some(e => e.type === 'alert'), 'Quiet first exchange must precede exposure');
  await choose('market:exchange');
  const agreed = await observe('promise before physical opening');
  assert.equal(agreed.exchanged, true); assert.equal(door(agreed).state, 'closed');
  const start = current.motion.length;
  await waitFor('NPC actually touches latch, opens, steps aside and returns', r => door(r).state === 'open' && Math.hypot(npc(r).x - 470, npc(r).y - 440) <= 5 && npc(r).state === 'idle');
  const motion = current.motion.slice(start);
  assert.ok(motion.some(r => r.door.state === 'closed' && r.npc.x > 480), 'Promise alone is insufficient: actual closed-door NPC walking must be observed');
  assert.ok(motion.some(r => r.door.state === 'open' && r.npc.y <= 413), 'NPC must actually step aside after opening');
  await observe('open and physically back at stall'); await screenshot('open-door');
  await walk(620, 440); await walk(620, 405);
  // Regression: clicking the actual open leaf rectangle must become ground input.
  // Merely clicking beyond it would miss UI target interception at the doorway.
  await walk(665, 410); await observe('real pointer delivered inside the open doorway');
  await walk(820, 405);
  await confirmNorth('private');
  await returnViaSouthernWaypoints(); await confirmReturn('private');
  const returned = await observe('private outbound / actual return via southern waypoints');
  current.outcome = facts(returned);
  assert.equal(returned.state.player.mana, 6);
  assert.equal(returned.completed.public, false, 'Public return must not invent a second outbound result');
  assert.equal(enemy(returned).hp, 3);
  await screenshot('returned-close-view', true);
  await reset({ mana: 'ordinary', informed: true });
};
scenarios['public-zero'] = async () => {
  await reset({ mana: 'zero', informed: false });
  for (const [x, y] of [[420, 880], [880, 880], [1220, 880], [1220, 240]]) await walk(x, y);
  await confirmNorth('public');
  await returnViaSouthernWaypoints(); await confirmReturn('public');
  const r = await observe('zero mana and no information actual public round trip');
  current.outcome = facts(r);
  assert.equal(r.state.player.mana, 0); assert.equal(r.exchanged, false);
  assert.equal(door(r).state, 'closed'); assert.equal(door(r).solid, true);
  assert.equal(enemy(r).hp, 3); assert.notEqual(enemy(r).state, 'retreated');
  // A player may stay out of sight on the outer public lane. Preserve the
  // live enemy; the separate threat-zero case proves an actual encounter.
  current.outcomeEncounter = { enemyRetained: true, alertObserved: r.state.events.some(e => e.type === 'alert') };
  await screenshot('returned-close-view', true);
  await reset({ mana: 'zero', informed: false });
};
scenarios.lure = async () => {
  await reset({ mana: 'ordinary', informed: true });
  await walk(380, 720);
  await ui('[data-spell="pull"]'); await world(point(460, 720));
  await waitFor('real pull acquired decoy', r => r.state.player.pullId === 'decoy');
  await world(point(490, 840));
  await waitFor('real decoy movement', r => {
    const e = entity(r, 'decoy'); return Math.hypot(e.x - 490, e.y - 840) <= 12;
  });
  await activeGap(); await action('release');
  const drop = await observe('one actual decoy drop');
  assert.equal(drop.state.player.pullId, null); assert.equal(drop.state.player.mana, 5);
  assert.equal(entity(drop, 'decoy').data.noiseUsed, true);
  assert.ok(drop.state.events.some(e => e.type === 'drop'));
  await waitFor('enemy actually follows the drop to the west', r => enemy(r).x <= 610, 30000);
  await walk(430, 500); await interact('market_merchant');
  assert.equal((await inspect()).threat, false, 'Exchange must occur while the current encounter is actually safe');
  await choose('market:exchange'); await activeGap(2);
  const stopped = await waitFor('NPC sees the approaching enemy and stops before opening', r => r.threat && npc(r).state === 'waiting' && door(r).state === 'closed');
  assert.equal(stopped.exchanged, true);
  assert.ok(npc(stopped).x > 470 && npc(stopped).x < 620, 'Observe a real interrupted walk, not a fabricated waiting flag at the start');
  await observe('actual visible-threat interruption', stopped);
  // Keep the active retreat uninterrupted by screenshot readback on software GPU.
  // The sampled positions prove this transient stop; capture after withdrawal.
  for (const [x, y] of [[180, 500], [180, 850], [180, 780]]) await walk(x, y);
  const opened = await waitFor('lost threat permits autonomous movement and opening without another request', r => door(r).state === 'open');
  assert.equal(opened.exchanged, true); assert.equal(opened.state.player.mana, 5); assert.equal(enemy(opened).hp, 3);
  assert.ok(npc(opened).x > npc(stopped).x || current.motion.some(r => r.door.state === 'open' && r.npc.x >= 600), 'Actual resumed latch movement must be observed');
  await observe('automatic opening after real withdrawal', opened);
  // The new threat after opening is a distinct condition from the earlier closed
  // pause: NPC may stop on her return or already be idle at the stall; either
  // legal position must keep the physical open leaf passable.
  const rethreat = await waitFor('door stays open when the NPC sees danger again', r => r.threat && door(r).state === 'open', 15000);
  await observe('open door under a subsequent actual threat', rethreat);
  await withdraw();
  const r = await observe('resource lure then actual original-endpoint withdrawal');
  current.outcome = facts(r);
  assert.deepEqual(r.completed, { public: false, private: false }); assert.deepEqual(r.returned, { public: false, private: false });
  assert.ok(Math.hypot(r.state.player.x - 240, r.state.player.y - 760) <= 65);
  assert.equal(r.state.player.mana, 5); assert.equal(enemy(r).hp, 3);
  await screenshot('withdrawal-open-door', true);
};
scenarios['threat-zero'] = async () => {
  await reset({ mana: 'zero', informed: true });
  for (const [x, y] of [[420, 840], [880, 840], [1220, 900], [880, 900], [680, 900], [430, 900], [430, 500]]) await walk(x, y);
  await waitFor('zero-resource eastern loop creates an actually visible threat at the stall', r => r.threat, 15000);
  await interact('market_merchant');
  const meeting = await observe('actual near-threat refusal at zero mana');
  assert.equal(meeting.threat, true); assert.equal(meeting.exchanged, false);
  assert.equal(await page.locator('#dialogue button[data-choice="market:exchange"]:enabled').count(), 0);
  await frozen('reading a real threat refusal freezes the world'); await choose('leave');
  for (const [x, y] of [[180, 500], [180, 850], [180, 780]]) await walk(x, y);
  await withdraw();
  const r = await observe('zero-resource withdrawal without pretending north was reached');
  current.outcome = facts(r);
  assert.equal(r.state.player.mana, 0); assert.equal(enemy(r).hp, 3); assert.equal(r.exchanged, false);
  assert.equal(door(r).state, 'closed'); assert.deepEqual(r.completed, { public: false, private: false }); assert.deepEqual(r.returned, { public: false, private: false });
  assert.ok(Math.hypot(r.state.player.x - 240, r.state.player.y - 760) <= 65);
  await screenshot('withdrawal-close-view', true);
};
scenarios.pause = async () => {
  await reset({ mana: 'ordinary', informed: true });
  await paused(true); await action('walk'); await world(point(330, 760));
  await waitFor('real ground tap queues a paused move', r => r.state.pending?.type === 'move');
  await frozen('queued input remains pending while manually paused');
  await action('cancel'); await waitFor('public cancel removes the pending move', r => r.state.pending === null);
  await paused(false); await activeGap(.4);
  const cancelled = await observe('cancelled pending move cannot execute on resume');
  assert.ok(Math.hypot(cancelled.state.player.x - 240, cancelled.state.player.y - 760) < 1);
  await walk(470, 760); await interact('market_merchant');
  await frozen('reading first dialogue leaves time, actors and closed door unchanged');
  // A dialogue already pauses s.paused; toggling the ordinary pause button would
  // request resume and be refused. Use the user's explicit dialogue control.
  await action('keep-paused'); await choose('market:exchange');
  const agreed = await observe('closing the dialogue preserves manual pause');
  assert.equal(agreed.exchanged, true); assert.equal(agreed.state.dialogue, null); assert.equal(agreed.state.paused, true);
  assert.equal(door(agreed).state, 'closed'); assert.equal(npc(agreed).x, 470);
  await frozen('manual pause survives closing dialogue');
  await paused(false);
  await waitFor('NPC starts an actual in-flight walk', r => npc(r).x > 480 && door(r).state === 'closed');
  await paused(true);
  const mid = await observe('manual pause during NPC movement');
  assert.ok(npc(mid).x > 470 && npc(mid).x < 612); assert.equal(door(mid).state, 'closed');
  await frozen('mid-walk NPC pause');
  await paused(false);
  await waitFor('NPC resumes from the actual paused position and opens', r => door(r).state === 'open');
  await observe('resumed opening');
  await action('walk'); await world(point(300, 600));
  await waitFor('player actually moving before manual pause', r => r.state.player.path.length > 0 && r.state.player.x < 450);
  await paused(true); await frozen('mid-path player pause'); await paused(false);
  await waitFor('original player path finishes after resume', r => !r.state.player.path.length && Math.hypot(r.state.player.x - 300, r.state.player.y - 600) <= 24);
  await screenshot('resumed-player-close-view', true);
  // Restart while paused proves no old actor path, promise, held object or paused
  // intention can resume in the newly selected synthetic run.
  await reset({ mana: 'ordinary', informed: true }); await activeGap(.4);
  const restarted = await observe('restart remains at original spawn after time advances');
  current.outcome = facts(restarted);
  assert.ok(Math.hypot(restarted.state.player.x - 240, restarted.state.player.y - 760) < 1);
  assert.equal(npc(restarted).x, 470); assert.equal(door(restarted).state, 'closed');
};

async function persist(status) {
  if (report.status !== status) { report.status = status; report.statusHistory.push({ status, at: new Date().toISOString() }); }
  const temp = `${output}.tmp`; await writeFile(temp, JSON.stringify(report, null, 2)); await rename(temp, output);
}
try {
  await mkdir(evidence, { recursive: true });
  try { await writeFile(join(evidence, 'previous-report.json'), await readFile(output)); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await persist('NOT_RUN');
  const selectedCases = selection(process.env.MARKET_CASE, caseNames);
  const selectedDevices = selection(process.env.MARKET_DEVICE || process.env.DEVICE, Object.keys(deviceSpecs));
  report.selection = { cases: selectedCases, devices: selectedDevices };
  report.fullMatrix = selectedCases.length === caseNames.length && selectedDevices.length === Object.keys(deviceSpecs).length;
  report.environment.sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  report.environment.sourceSha256 = {};
  for (const path of ['src/whitebox/market-model.ts', 'src/whitebox/market-main.ts', 'src/whitebox/market.css', 'src/game/model.ts', 'scripts/market-whitebox-check.mjs']) {
    report.environment.sourceSha256[path] = createHash('sha256').update(await readFile(path)).digest('hex');
  }
  await persist('RUNNING');
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
  report.environment.browser = await browser.version();
  for (device of selectedDevices) {
    const context = await browser.newContext(deviceSpecs[device]);
    page = await context.newPage();
    page.on('pageerror', error => report.errors.push({ device, case: current?.id, type: 'pageerror', message: error.message }));
    page.on('console', message => { if (message.type() === 'error') report.errors.push({ device, case: current?.id, type: 'console', message: message.text() }); });
    page.on('requestfailed', request => report.errors.push({ device, case: current?.id, type: 'requestfailed', url: request.url(), failure: request.failure() }));
    await page.goto(url); await page.waitForFunction(() => window.__MARKET__);
    assert.ok(await page.locator('canvas').isVisible());
    const g = await geometry(); assert.equal(g.viewport.width, deviceSpecs[device].viewport.width); assert.equal(g.viewport.height, deviceSpecs[device].viewport.height);
    const nativeDpr = await page.evaluate(() => devicePixelRatio);
    assert.equal(nativeDpr, deviceSpecs[device].deviceScaleFactor);
    // The existing renderer caps its buffer at five million pixels: desktop
    // 1440x900 requested DPR2 legitimately renders at about 1.964, not exactly 2.
    const expectedDensity = Math.min(nativeDpr, 3, Math.sqrt(5_000_000 / (g.viewport.width * g.viewport.height)));
    assert.ok(Math.abs(g.viewport.dpr - expectedDensity) < 1e-6, 'Use the full permitted render density');
    const canvas = await page.evaluate(() => { const c = document.querySelector('canvas'); return { width: c.width, height: c.height, cssWidth: c.clientWidth, cssHeight: c.clientHeight }; });
    assert.ok(Math.abs(canvas.width - g.viewport.width * expectedDensity) <= 1);
    assert.ok(Math.abs(canvas.height - g.viewport.height * expectedDensity) <= 1);
    assert.ok(Math.abs(canvas.cssWidth - g.viewport.width) <= 1 && Math.abs(canvas.cssHeight - g.viewport.height) <= 1);
    if (device === 'phone') { assert.equal(canvas.width, 1170); assert.equal(canvas.height, 2532); }
    const runtimeScripts = [];
    for (const scriptUrl of await page.locator('script[type="module"][src]').evaluateAll(nodes => nodes.map(n => n.src))) {
      const response = await page.request.get(scriptUrl); assert.equal(response.status(), 200);
      runtimeScripts.push({ url: scriptUrl, sha256: createHash('sha256').update(await response.body()).digest('hex') });
    }
    assert.ok(runtimeScripts.length > 0);
    report.environment.rulesRevision = g.revision;
    for (const id of selectedCases) {
      current = { id, device, status: 'RUNNING', environment: { ...deviceSpecs[device], canvas, runtimeScripts, geometry: await geometry() }, input: [], observations: [], motion: [], visuals: [] };
      report.cases.push(current); await persist('RUNNING');
      console.log(`MARKET ${device} ${id} RUNNING`);
      await scenarios[id]();
      current.finalState = await inspect(); current.status = 'PASS'; await persist('RUNNING');
      console.log(`MARKET ${device} ${id} PASS`);
    }
    await context.close(); page = null;
  }
  assert.deepEqual(report.errors, [], 'Browser must have no runtime or resource errors');
  assert.equal(report.cases.length, selectedCases.length * selectedDevices.length);
  assert.ok(report.cases.every(c => c.status === 'PASS'));
  report.fullMatrixStatus = report.fullMatrix ? 'PASS' : 'NOT_RUN';
  await persist('PASS'); console.log(`MARKET ${report.fullMatrix ? 'FULL MATRIX' : 'SELECTED SCOPE ONLY'} PASS: ${output}`);
} catch (error) {
  report.failure = String(error.stack || error); report.failedAt = new Date().toISOString();
  if (current?.status === 'RUNNING') current.status = 'FAIL';
  if (page) {
    report.failureState = await inspect().catch(() => null);
    report.failureGeometry = await geometry().catch(() => null);
    report.failureVisual = join(evidence, 'failure.png');
    await page.screenshot({ path: report.failureVisual }).catch(screenshotError => { report.failureScreenshotError = String(screenshotError); });
  }
  if (report.fullMatrix) report.fullMatrixStatus = 'FAIL';
  await persist('FAIL'); console.error(error); process.exitCode = 1;
} finally { await browser?.close(); }

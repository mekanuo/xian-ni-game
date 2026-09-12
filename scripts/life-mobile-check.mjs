import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, access } from 'node:fs/promises';

const url = process.env.GAME_URL || 'http://127.0.0.1:4189/';
const shadeExport = process.env.LIFE_SHADE_EXPORT || 'qa/evidence/life-shade-ready-input.json';
const currentExport = process.env.LIFE_CURRENT_EXPORT || 'qa/evidence/life-current-export.json';
const out = 'qa/evidence/life-mobile';
await mkdir('qa/evidence', { recursive: true });
const evidence = { schemaVersion: 1, status: 'NOT_RUN', runId: 'life-mobile', environment: { url, viewport: '390x844 DPR3 touch emulation', limitation: 'Chrome touch emulation; not a physical phone or Safari.' }, checks: [], errors: [] };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
page.on('pageerror', e => evidence.errors.push(e.message));
const state = () => page.evaluate(() => window.__XIAN_NI__.inspect());
const waitState = (fn, timeout = 12000) => page.waitForFunction(fn, null, { timeout });
async function frame(x, y) {
  for (let i = 0; i < 5; i++) {
    const p = await page.evaluate(({ x, y }) => window.__XIAN_NI__.screenPoint(x, y), { x, y });
    if (p.x > 24 && p.x < 366 && p.y > 135 && p.y < 665) return p;
    const dx = Math.max(-240, Math.min(240, 195 - p.x)), dy = Math.max(-260, Math.min(260, 400 - p.y));
    await page.keyboard.down('Shift'); await page.mouse.move(195, 400); await page.mouse.down();
    await page.mouse.move(195 + dx, 400 + dy, { steps: 8 }); await page.mouse.up(); await page.keyboard.up('Shift');
    await page.waitForTimeout(120);
  }
  return page.evaluate(({ x, y }) => window.__XIAN_NI__.screenPoint(x, y), { x, y });
}
async function worldTap(x, y) { const p = await frame(x, y); await page.touchscreen.tap(p.x, p.y); }
async function resumeIfPaused() { if ((await state()).paused) { const b = page.locator('.action-dock [data-ui="pause"]'); if (await b.count()) await b.tap(); else await page.locator('[data-ui="pause"]').first().tap(); await page.waitForTimeout(120); } }
async function importSave(file) {
  await page.goto(url); await page.getByRole('button', { name: '入 山', exact: true }).tap();
  await page.getByRole('button', { name: '去回石驿', exact: true }).tap(); await page.waitForTimeout(350);
  await page.locator('[data-ui="settings"]').tap();
  await page.locator('#import-save').setInputFiles(file);
  await page.waitForTimeout(700);
  const ending = page.getByRole('button', { name: '在驿中再坐一会儿', exact: true });
  if (await ending.count()) { await ending.tap(); await page.waitForTimeout(150); }
}
try {
  await access(shadeExport); await access(currentExport);
  await importSave(shadeExport);
  let s = await state();
  assert.equal(s.scene, 'creek'); assert.equal(s.life.harvest.sun, 'bag'); assert.equal(s.life.harvest.shade, 'unpicked');
  await resumeIfPaused();
  const shade = s.worlds.creek.find(e => e.id === 'life_shade_leaf'); assert.ok(shade);
  await worldTap(shade.x, shade.y);
  await waitState(() => Boolean(window.__XIAN_NI__.inspect().life.harvest.picking));
  await page.locator('.action-dock [data-ui="pause"]').tap();
  await waitState(() => window.__XIAN_NI__.inspect().paused === true);
  const frozen = (await state()).life.harvest.picking.elapsed; await page.waitForTimeout(850);
  assert.equal((await state()).life.harvest.picking.elapsed, frozen);
  evidence.checks.push({ id: 'pick-pause-freeze', passed: true });
  await page.locator('.action-dock [data-ui="pause"]').tap(); await worldTap(shade.x + 60, shade.y + 25);
  await waitState(() => !window.__XIAN_NI__.inspect().life.harvest.picking);
  assert.equal((await state()).life.harvest.shade, 'unpicked');
  await worldTap(shade.x, shade.y); await waitState(() => Boolean(window.__XIAN_NI__.inspect().life.harvest.picking));
  await waitState(() => window.__XIAN_NI__.inspect().life.harvest.shade === 'bag', 90000);
  evidence.checks.push({ id: 'touch-pick-interrupt-and-retry', passed: true });

  await page.locator('[data-ui="bag"]').tap();
  const inventory = await page.locator('.modal-paper, [role="dialog"]').innerText();
  assert.match(inventory, /控物环|行囊|伤药/); await page.screenshot({ path: `${out}-inventory.png` });
  await page.locator('[data-ui="close"]').tap().catch(() => {});
  await page.locator('[data-ui="settings"]').tap();
  const download = page.waitForEvent('download'); await page.locator('[data-ui="export"]').tap();
  const saved = await download; await saved.saveAs(`${out}-export.json`);
  const before = await state();
  await importSave(`${out}-export.json`); const after = await state();
  assert.equal(after.life.harvest.shade, 'bag'); assert.equal(after.life.harvest.sun, before.life.harvest.sun);
  evidence.checks.push({ id: 'save-import-preserves-pick', passed: true });
  await page.screenshot({ path: `${out}-restored.png` });

  // If the production completed-life export is present, verify a paused
  // sachet action can be cancelled on touch without consuming a charge.
  try {
    await importSave(currentExport); s = await state();
    assert.equal(s.life.harvest.stage, 'complete'); assert.ok(s.life.sachets > 0); assert.equal(s.scene, 'workshop');
    {
      const beforeSachets = s.life.sachets;
      assert.equal(s.paused, true, 'Imported save stays paused before queuing a sachet');
      await waitState(() => window.__XIAN_NI__.inspect().paused === true);
      await page.locator('[data-ui="bag"]').tap();
      await page.locator('[data-ui="use-sachet"]').tap(); await page.waitForTimeout(200);
      assert.equal((await state()).pending?.type, 'use-sachet');
      await page.locator('[data-ui="cancel"]').tap();
      assert.equal((await state()).life.sachets, beforeSachets); assert.equal((await state()).pending, null);
      evidence.checks.push({ id: 'paused-sachet-cancel', passed: true });
      await page.screenshot({ path: `${out}-sachet-cancel.png` });
    }
  } catch (error) { evidence.checks.push({ id: 'paused-sachet-cancel', passed: false, error: String(error) }); throw error; }
  assert.equal(evidence.errors.length, 0, `pageerror: ${evidence.errors.join('; ')}`);
  evidence.status = 'PASS';
} catch (error) {
  evidence.status = 'FAIL'; evidence.error = String(error);
  await page.screenshot({ path: `${out}-failure.png` }).catch(() => {});
  process.exitCode = 1;
} finally {
  evidence.errors = evidence.errors; await writeFile('qa/evidence/life-mobile.json', JSON.stringify(evidence, null, 2)); await browser.close();
}
console.log(JSON.stringify(evidence));

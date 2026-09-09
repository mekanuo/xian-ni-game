import { afterAll, beforeAll, expect, test } from 'vitest';
import { chromium, type Browser, type Page } from '@playwright/test';
import { Soundscape } from '../src/game/audio';

declare global { interface Window { audioTest: Soundscape } }
let browser: Browser;
let page: Page;
beforeAll(async () => {
  browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  page = await browser.newPage();
  await page.setContent('<button id="start">开始</button>');
  await page.addScriptTag({ content: `${Soundscape.toString()}; window.audioTest = new Soundscape(); document.querySelector('#start').onclick = () => window.audioTest.start();` });
}, 15000);
afterAll(async () => { if (page) await page.evaluate(() => window.audioTest.dispose()); await browser?.close(); });

test('a real browser gesture starts a continuous score with measurable samples', async () => {
  expect(await page.evaluate(() => window.audioTest.inspect().state)).toBe('locked');
  await page.click('#start');
  await page.waitForFunction(() => window.audioTest.inspect().musicScheduled >= 3);
  const levels = await page.evaluate(async () => {
    let peak = 0;
    for (let i = 0; i < 10; i++) { peak = Math.max(peak, window.audioTest.inspect().musicRms); await new Promise(resolve => setTimeout(resolve, 30)); }
    return { peak, ...window.audioTest.inspect() };
  });
  expect(levels.state).toBe('running'); expect(levels.peak).toBeGreaterThan(.002);
});

test('music and impact faders are independent and master mute restores their settings', async () => {
  await page.evaluate(() => { window.audioTest.setVolume(0); window.audioTest.music = .55; window.audioTest.play('hit'); });
  await page.waitForTimeout(300);
  const musicOnly = await page.evaluate(() => window.audioTest.inspect());
  expect(musicOnly.musicRms).toBeGreaterThan(.001); expect(musicOnly.effectsRms).toBeLessThan(.0001);
  await page.evaluate(() => { window.audioTest.music = 0; window.audioTest.setVolume(.6); });
  await page.waitForTimeout(350);
  const effectsOnly = await page.evaluate(async () => {
    window.audioTest.play('hit'); await new Promise(resolve => setTimeout(resolve, 40)); return window.audioTest.inspect();
  });
  expect(effectsOnly.musicRms).toBeLessThan(.0001); expect(effectsOnly.effectsRms).toBeGreaterThan(.015);
  expect(effectsOnly.lastEffect).toBe('hit');
  await page.evaluate(() => { window.audioTest.music = .4; window.audioTest.setMuted(true); });
  await page.waitForTimeout(350);
  const muted = await page.evaluate(() => window.audioTest.inspect());
  expect(muted.musicRms).toBeLessThan(.0001); expect(muted.effectsRms).toBeLessThan(.0001);
  expect(muted.musicVolume).toBe(.4); expect(muted.effectsVolume).toBe(.6);
  await page.evaluate(() => window.audioTest.setMuted(false));
  await page.waitForTimeout(250);
  expect((await page.evaluate(() => window.audioTest.inspect())).musicRms).toBeGreaterThan(.001);
});

test('stopping silences and suspends transport; another gesture restarts without missed-note bursts', async () => {
  await page.evaluate(() => window.audioTest.stop());
  await page.waitForTimeout(100);
  const stopped = await page.evaluate(() => window.audioTest.inspect());
  expect(stopped.state).toBe('suspended'); expect(stopped.activeVoices).toBe(0); expect(stopped.musicRms).toBe(0);
  await page.waitForTimeout(350);
  expect((await page.evaluate(() => window.audioTest.inspect())).musicScheduled).toBe(stopped.musicScheduled);
  await page.click('#start'); await page.waitForTimeout(100);
  const resumed = await page.evaluate(() => window.audioTest.inspect());
  expect(resumed.state).toBe('running'); expect(resumed.musicScheduled - stopped.musicScheduled).toBeLessThanOrEqual(2);
  await page.evaluate(() => window.audioTest.dispose());
  await page.waitForTimeout(60);
  expect((await page.evaluate(() => window.audioTest.inspect())).state).toBe('closed');
});

import { expect, test } from '@playwright/test';
import {
  bootPage,
  collectConsoleProblems,
  dumpNodes,
  getProgress,
  scrollToProgress,
  setSlider,
  settle,
} from './helpers';

/**
 * TC-P0-05 — Debug slider matches scroll
 * TC-P0-07 — Rapid input does not break sync
 *
 * Together these assert the property the whole architecture is built around:
 * scene state is a pure function of progress, whatever route produced it.
 */

const SAMPLES = [0, 0.25, 0.5, 0.75, 1];

test('TC-P0-05 slider and scroll produce identical scene state', async ({ page }) => {
  await bootPage(page);

  for (const target of SAMPLES) {
    await scrollToProgress(page, target);
    const viaScroll = await dumpNodes(page);

    // Leave the sample, then come back to it using the slider instead.
    await scrollToProgress(page, target === 0 ? 1 : 0);
    await setSlider(page, target);
    const viaSlider = await dumpNodes(page);

    expect(viaSlider, `state at progress ${target} differs by input route`).toEqual(viaScroll);
  }
});

test('TC-P0-05 the slider reflects scroll-driven changes', async ({ page }) => {
  await bootPage(page);

  for (const target of SAMPLES) {
    await scrollToProgress(page, target);
    const value = await page.inputValue('#debug-progress');
    expect(Math.abs(Number(value) - target)).toBeLessThanOrEqual(0.01);
  }
});

test('TC-P0-05 state is path-independent across random access', async ({ page }) => {
  await bootPage(page);

  const random = [0.62, 0.13, 0.97, 0.41, 0.05, 0.88, 0.5, 0.29, 0.76, 0.02];

  // First pass: reach each value out of order and record the state.
  const recorded = new Map<number, unknown>();
  for (const target of random) {
    await scrollToProgress(page, target);
    recorded.set(target, await dumpNodes(page));
  }

  // Second pass: reach the same values by sweeping continuously from 0.
  for (const target of [...random].sort((a, b) => a - b)) {
    await scrollToProgress(page, 0);
    for (let p = 0; p < target; p += 0.1) await scrollToProgress(page, p);
    await scrollToProgress(page, target);
    expect(await dumpNodes(page), `state at ${target} depends on how it was reached`).toEqual(
      recorded.get(target),
    );
  }
});

test('TC-P0-07 rapid input leaves no NaN and no out-of-range progress', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await bootPage(page);

  const targets = Array.from({ length: 20 }, (_, i) => ((i * 37) % 100) / 100);

  for (const target of targets) {
    // Deliberately do not settle between jumps — this is the flick-scroll case.
    await page.evaluate((p) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: p * max, behavior: 'auto' });
    }, target);
  }
  await settle(page);

  expect(await page.evaluate(() => window.__apollo!.hasNaN())).toBe(false);

  const progress = await getProgress(page);
  expect(progress).toBeGreaterThanOrEqual(0);
  expect(progress).toBeLessThanOrEqual(1);
  expect(problems).toEqual([]);
});

test('TC-P0-07 progress stays clamped when scrolled past both ends', async ({ page }) => {
  await bootPage(page);

  await page.evaluate(() => window.scrollTo({ top: 10_000_000, behavior: 'auto' }));
  await settle(page);
  expect(await getProgress(page)).toBeLessThanOrEqual(1);

  await page.evaluate(() => window.scrollTo({ top: -10_000, behavior: 'auto' }));
  await settle(page);
  expect(await getProgress(page)).toBeGreaterThanOrEqual(0);
  expect(await page.evaluate(() => window.__apollo!.hasNaN())).toBe(false);
});

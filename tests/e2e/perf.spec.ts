import { expect, test } from '@playwright/test';
import { bootPage, scrollToProgress } from './helpers';

/**
 * TC-P0-09 — Baseline performance
 *
 * This runs under SwiftShader (software WebGL) in headless Chromium, so the fps
 * number here is NOT the laptop measurement the PRD's 60 fps target refers to —
 * that is procedure RP-3 on real hardware, recorded in docs/asset-budget.md.
 * What this case guards is the budget that does not depend on the GPU: draw
 * calls must stay under the PRD's ~150 per frame ceiling.
 */

const MAX_DRAW_CALLS = 150;

test('TC-P0-09 draw calls stay within budget across the timeline', async ({ page }) => {
  await bootPage(page);

  for (let i = 0; i <= 20; i += 1) {
    await scrollToProgress(page, i / 20);
    const stats = await page.evaluate(() => window.__apollo!.getStats());
    expect(stats.drawCalls, `draw calls at progress ${i / 20}`).toBeLessThanOrEqual(MAX_DRAW_CALLS);
  }
});

test('TC-P0-09 the loop sustains frames and records a baseline', async ({ page }) => {
  await bootPage(page);
  await page.evaluate(() => window.__apollo!.resetStats());
  await page.waitForTimeout(2000);

  const stats = await page.evaluate(() => window.__apollo!.getStats());

  // Under software rendering we only assert the loop is alive and sampling;
  // the real number is captured manually via RP-3.
  expect(stats.frames).toBeGreaterThan(30);
  expect(stats.fps).toBeGreaterThan(0);

  console.log(
    `[RP-3 baseline, headless SwiftShader] fps=${stats.fps} frames=${stats.frames} ` +
      `longFrames=${stats.longFrames} draws=${stats.drawCalls} tris=${stats.triangles} ` +
      `heap=${stats.jsHeapMB}MB`,
  );
});

test('TC-P0-09 scene object count does not grow across repeated passes', async ({ page }) => {
  await bootPage(page);

  const count = async (): Promise<number> =>
    page.evaluate(() => window.__apollo!.dumpState().nodes.length);

  const initial = await count();

  for (let cycle = 0; cycle < 3; cycle += 1) {
    for (let i = 0; i <= 10; i += 1) await scrollToProgress(page, i / 10);
    for (let i = 10; i >= 0; i -= 1) await scrollToProgress(page, i / 10);
  }

  expect(await count()).toBe(initial);
});

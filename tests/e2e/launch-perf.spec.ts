import { expect, test } from '@playwright/test';
import { SEPS, bootPage, scrollToMet, scrollToProgress } from './helpers';

/**
 * TC-P1-17 — Launch-range performance
 *
 * Runs under software WebGL, so the fps figure here is NOT the PRD's 60/30 fps
 * measurement — that is procedure RP-3 on real hardware. What this guards is
 * the budget that does not depend on the GPU: draw calls under ~150 per frame.
 */

const MAX_DRAW_CALLS = 150;

test('TC-P1-17 draw calls stay within budget across the launch range', async ({ page }) => {
  await bootPage(page);

  const samples: { progress: number; draws: number }[] = [];
  for (let i = 0; i <= 20; i += 1) {
    const p = i / 20;
    await scrollToProgress(page, p);
    const stats = await page.evaluate(() => window.__apollo!.getStats());
    samples.push({ progress: p, draws: stats.drawCalls });
    expect(stats.drawCalls, `draw calls at progress ${p}`).toBeLessThanOrEqual(MAX_DRAW_CALLS);
  }

  const peak = samples.reduce((a, b) => (b.draws > a.draws ? b : a));
  console.log(`[TC-P1-17] peak draw calls ${peak.draws} at progress ${peak.progress}`);
});

test('TC-P1-17 draw calls stay within budget through each separation', async ({ page }) => {
  await bootPage(page);

  for (const sep of SEPS) {
    for (const f of [0.1, 0.32, 0.5, 0.8]) {
      await scrollToMet(page, sep.met - sep.dwell / 2 + sep.dwell * f);
      const stats = await page.evaluate(() => window.__apollo!.getStats());
      expect(stats.drawCalls, `${sep.id} at ${f}`).toBeLessThanOrEqual(MAX_DRAW_CALLS);
    }
  }
});

test('TC-P1-17 the loop sustains frames and records a baseline', async ({ page }) => {
  await bootPage(page);
  await scrollToProgress(page, 0.1);
  await page.evaluate(() => window.__apollo!.resetStats());
  await page.waitForTimeout(2000);

  const stats = await page.evaluate(() => window.__apollo!.getStats());
  expect(stats.frames).toBeGreaterThan(30);
  expect(stats.fps).toBeGreaterThan(0);

  console.log(
    `[RP-3 baseline, headless SwiftShader] fps=${stats.fps} frames=${stats.frames} ` +
      `longFrames=${stats.longFrames} draws=${stats.drawCalls} tris=${stats.triangles} ` +
      `heap=${stats.jsHeapMB}MB`,
  );
});

test('TC-P1-17 triangle count stays modest for a procedural stack', async ({ page }) => {
  await bootPage(page);
  await scrollToProgress(page, 0);

  const stats = await page.evaluate(() => window.__apollo!.getStats());
  // The whole point of building the stack in code rather than cutting the NASA
  // mesh is that the budget stays ours to spend. Flag it if it creeps.
  expect(stats.triangles).toBeLessThan(120_000);
  console.log(`[TC-P1-17] triangles on the pad: ${stats.triangles}`);
});

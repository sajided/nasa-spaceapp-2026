import { expect, test } from '@playwright/test';
import { bootPage, dumpNodes, scrollToProgress } from './helpers';

/**
 * TC-P4-13 — Long-session stability.
 *
 * testcase.md asks for fifteen minutes of continuous forward-and-back
 * scrolling. That run is here, behind `LONG_SESSION=1`, because it would
 * quadruple the suite's wall time; by default the same checks run over six
 * full cycles, which is enough to catch anything that accumulates per pass
 * (objects, listeners, geometry) rather than per minute.
 *
 *   LONG_SESSION=1 npx playwright test long-session
 *
 * Under software WebGL the fps figure is a relative check only — does the
 * loop keep its pace late in the session compared with early on — not the
 * PRD's 60/30 fps, which is RP-3 on real hardware.
 */

const LONG = process.env.LONG_SESSION === '1';
const DURATION_MS = 15 * 60 * 1000;

test('TC-P4-13 memory, objects and pace hold over a long session', async ({ page }) => {
  test.setTimeout(LONG ? DURATION_MS + 5 * 60 * 1000 : 300_000);
  await bootPage(page);

  const heap = async (): Promise<number> => {
    await page.evaluate(() => (window as unknown as { gc?: () => void }).gc?.());
    await page.waitForTimeout(250);
    return page.evaluate(() => window.__apollo!.getStats().jsHeapMB);
  };
  const pace = async (): Promise<number> => {
    await page.evaluate(() => window.__apollo!.resetStats());
    await page.waitForTimeout(1500);
    return page.evaluate(() => window.__apollo!.getStats().fps);
  };

  // One pass to warm every shader and texture, then take the baseline — the
  // post-load baseline testcase.md measures against.
  const pass = async (): Promise<void> => {
    for (let i = 0; i <= 24; i += 1) await scrollToProgress(page, i / 24);
    for (let i = 24; i >= 0; i -= 1) await scrollToProgress(page, i / 24);
  };
  await pass();
  const initial = await dumpNodes(page);
  const baseHeap = await heap();
  const basePace = await pace();

  const started = Date.now();
  let cycles = 0;
  while (LONG ? Date.now() - started < DURATION_MS : cycles < 6) {
    await pass();
    cycles += 1;
  }

  const final = await dumpNodes(page);
  expect(final.length, 'objects accumulated in the scene graph').toBe(initial.length);
  expect(final, 'the scene drifted over the session').toEqual(initial);

  const endHeap = await heap();
  if (baseHeap > 0) {
    expect(endHeap, `heap grew from ${baseHeap} MB to ${endHeap} MB`).toBeLessThan(baseHeap * 1.2);
  }
  const endPace = await pace();
  expect(endPace, `pace fell from ${basePace} to ${endPace} fps`).toBeGreaterThanOrEqual(basePace * 0.8);

  console.log(
    `[TC-P4-13] ${cycles} cycles in ${Math.round((Date.now() - started) / 1000)} s; ` +
      `heap ${baseHeap} → ${endHeap} MB; pace ${basePace} → ${endPace} fps`,
  );
});

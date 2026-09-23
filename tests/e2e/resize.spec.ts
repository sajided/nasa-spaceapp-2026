import { expect, test } from '@playwright/test';
import { bootPage, dumpNodes, getProgress, scrollToProgress } from './helpers';

/**
 * TC-P0-08 — Resize and orientation
 *
 * PRD responsiveness requirement: 360 px phones to wide desktops.
 */

const WIDTHS = [
  { width: 360, height: 780 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
];

test('TC-P0-08 canvas matches the viewport at every supported width', async ({ page }) => {
  await bootPage(page);

  for (const size of WIDTHS) {
    await page.setViewportSize(size);
    await page.waitForTimeout(150);

    const box = await page.locator('#scene').boundingBox();
    expect(box!.width, `canvas width at ${size.width}px`).toBeCloseTo(size.width, 0);
    expect(box!.height, `canvas height at ${size.width}px`).toBeCloseTo(size.height, 0);

    // No horizontal overflow at any width.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow at ${size.width}px`).toBe(false);
  }
});

test('TC-P0-08 progress is preserved across a resize', async ({ page }) => {
  await bootPage(page);
  await scrollToProgress(page, 0.5);

  const before = await getProgress(page);
  const stateBefore = await dumpNodes(page);

  await page.setViewportSize({ width: 360, height: 780 });
  await page.waitForTimeout(400); // the observer re-measures on a debounce

  expect(Math.abs((await getProgress(page)) - before)).toBeLessThanOrEqual(0.02);
  expect(await dumpNodes(page)).toEqual(stateBefore);
});

test('TC-P0-08 orientation change keeps the scene coherent', async ({ page }) => {
  await bootPage(page);
  await scrollToProgress(page, 0.75);

  await page.setViewportSize({ width: 844, height: 390 }); // landscape phone
  await page.waitForTimeout(400);

  const box = await page.locator('#scene').boundingBox();
  expect(box!.width).toBeCloseTo(844, 0);
  expect(box!.height).toBeCloseTo(390, 0);
  expect(await page.evaluate(() => window.__apollo!.hasNaN())).toBe(false);
});

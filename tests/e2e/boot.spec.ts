import { expect, test } from '@playwright/test';
import { DEV_URL, PREVIEW_URL } from '../../playwright.config';
import { bootPage, collectConsoleProblems } from './helpers';

/**
 * TC-P0-01 — Project builds and serves
 * TC-P0-02 — Scene renders with camera and lights
 */

test('TC-P0-01 production preview boots with a clean console', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await bootPage(page, `${PREVIEW_URL}/?debug=1`);
  expect(problems).toEqual([]);
});

test('TC-P0-01 dev server boots with a clean console', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await bootPage(page, `${DEV_URL}/?debug=1`);
  expect(problems).toEqual([]);
});

test('TC-P0-01 dev and preview render identical scene state', async ({ page }) => {
  await bootPage(page, `${DEV_URL}/?debug=1`);
  const dev = await page.evaluate(() => window.__apollo!.dumpState());

  await bootPage(page, `${PREVIEW_URL}/?debug=1`);
  const preview = await page.evaluate(() => window.__apollo!.dumpState());

  expect(preview).toEqual(dev);
});

test('TC-P0-02 canvas fills the viewport and the loop is running', async ({ page }) => {
  await bootPage(page);

  const canvas = page.locator('#scene');
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  const viewport = page.viewportSize()!;
  expect(box!.width).toBeCloseTo(viewport.width, 0);
  expect(box!.height).toBeCloseTo(viewport.height, 0);

  // The frame counter must advance between two samples.
  const first = await page.evaluate(() => window.__apollo!.getStats().frames);
  await page.waitForTimeout(300);
  const second = await page.evaluate(() => window.__apollo!.getStats().frames);
  expect(second).toBeGreaterThan(first);

  // Something is actually being drawn.
  const stats = await page.evaluate(() => window.__apollo!.getStats());
  expect(stats.drawCalls).toBeGreaterThan(0);
  expect(stats.triangles).toBeGreaterThan(0);
});

test('the debug API is absent from a production build without ?debug=1', async ({ page }) => {
  await page.goto(`${PREVIEW_URL}/`);
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
  expect(await page.evaluate(() => Boolean(window.__apollo))).toBe(false);
  expect(await page.locator('#debug-panel').count()).toBe(0);
});

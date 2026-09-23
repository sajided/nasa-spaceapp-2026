import { expect, test } from '@playwright/test';
import { chapters } from '../../src/chapters/registry';
import { bootPage, scrollToProgress } from './helpers';

/**
 * TC-P0-06 — Chapter sub-timeline pattern
 *
 * The point of this case is that chapters are composable: bounds fall where the
 * weights put them, and a chapter knows its own local progress independently of
 * where it sits on the master timeline.
 *
 * Bounds are checked as *properties* rather than against literal numbers, so
 * reweighting or adding a chapter does not make this file wrong — which is what
 * the case is actually protecting.
 */

test('TC-P0-06 chapter bounds are contiguous and cover the timeline', async ({ page }) => {
  await bootPage(page);

  const bounds = await page.evaluate(() => window.__apollo!.chapterBounds());
  const entries = Object.entries(bounds);

  expect(entries.length).toBeGreaterThanOrEqual(2);

  const sorted = entries.map(([, b]) => b).sort((a, b) => a[0] - b[0]);
  expect(sorted[0]![0]).toBe(0);
  expect(sorted[sorted.length - 1]![1]).toBe(1);
  for (let i = 1; i < sorted.length; i += 1) {
    expect(sorted[i]![0]).toBeCloseTo(sorted[i - 1]![1], 6);
  }
  for (const [, b] of entries) expect(b[1]).toBeGreaterThan(b[0]);
});

test('TC-P0-06 bounds match the declared chapter weights', async ({ page }) => {
  await bootPage(page);

  const bounds = await page.evaluate(() => window.__apollo!.chapterBounds());

  // Derived from the registry rather than written out, so adding chapters does
  // not make this file wrong — which is the property the case is protecting.
  const total = chapters.reduce((sum, c) => sum + c.weight, 0);
  let cursor = 0;
  for (const chapter of chapters) {
    const expected: [number, number] = [cursor / total, (cursor + chapter.weight) / total];
    expect(bounds[chapter.id], `no bounds for chapter '${chapter.id}'`).toBeDefined();
    expect(bounds[chapter.id]![0]).toBeCloseTo(expected[0], 6);
    expect(bounds[chapter.id]![1]).toBeCloseTo(expected[1], 6);
    cursor += chapter.weight;
  }
});

test('TC-P0-06 the reported chapter matches the bounds at every sample', async ({ page }) => {
  await bootPage(page);

  const bounds = await page.evaluate(() => window.__apollo!.chapterBounds());

  for (let i = 0; i <= 20; i += 1) {
    const p = i / 20;
    await scrollToProgress(page, p);
    const chapter = await page.evaluate(() => window.__apollo!.getChapter());
    const [start, end] = bounds[chapter.id]!;

    expect(p + 1e-6).toBeGreaterThanOrEqual(start);
    expect(p - 1e-6).toBeLessThanOrEqual(end);
  }
});

test('TC-P0-06 local chapter progress runs 0 to 1 within each chapter', async ({ page }) => {
  await bootPage(page);

  const bounds = await page.evaluate(() => window.__apollo!.chapterBounds());
  const first = chapters[0]!;
  const second = chapters[1]!;
  const boundary = bounds[first.id]![1];
  const span = boundary - bounds[first.id]![0];

  await scrollToProgress(page, 0);
  expect((await page.evaluate(() => window.__apollo!.getChapter())).localProgress).toBeLessThan(
    0.02,
  );

  await scrollToProgress(page, boundary - span * 0.03);
  const endOfFirst = await page.evaluate(() => window.__apollo!.getChapter());
  expect(endOfFirst.id).toBe(first.id);
  expect(endOfFirst.localProgress).toBeGreaterThan(0.9);

  await scrollToProgress(page, boundary + span * 0.03);
  const startOfSecond = await page.evaluate(() => window.__apollo!.getChapter());
  expect(startOfSecond.id).toBe(second.id);
  expect(startOfSecond.localProgress).toBeLessThan(0.1);
});

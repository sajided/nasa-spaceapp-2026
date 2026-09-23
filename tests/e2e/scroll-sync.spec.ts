import { expect, test } from '@playwright/test';
import {
  bootPage,
  collectConsoleProblems,
  dumpNodes,
  getProgress,
  getScrollProgress,
  scrollToProgress,
  DETACHED,
} from './helpers';

/**
 * TC-P0-03 — Scroll drives timeline progress forward
 * TC-P0-04 — Scroll drives timeline progress backward
 *
 * These two are the phase's exit criterion expressed as assertions.
 */

const STEPS = 20;
/** testcase.md TC-P0-03: progress readout matches scroll percentage within 1%. */
const TOLERANCE = 0.01;

test('TC-P0-03 progress advances monotonically and tracks scroll within 1%', async ({ page }) => {
  await bootPage(page);

  let previous = -1;
  for (let i = 0; i <= STEPS; i += 1) {
    const target = i / STEPS;
    await scrollToProgress(page, target);

    const progress = await getProgress(page);
    const scroll = await getScrollProgress(page);

    expect(progress).toBeGreaterThanOrEqual(previous - 1e-6);
    expect(Math.abs(progress - scroll)).toBeLessThanOrEqual(TOLERANCE);
    previous = progress;
  }

  expect(previous).toBeGreaterThan(0.99);
});

test('TC-P0-04 progress descends monotonically back to zero', async ({ page }) => {
  await bootPage(page);
  await scrollToProgress(page, 1);

  let previous = 2;
  for (let i = STEPS; i >= 0; i -= 1) {
    await scrollToProgress(page, i / STEPS);
    const progress = await getProgress(page);
    expect(progress).toBeLessThanOrEqual(previous + 1e-6);
    previous = progress;
  }

  expect(previous).toBeLessThan(0.01);
});

test('TC-P0-04 three full cycles leave no drift', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await bootPage(page);

  const initial = await dumpNodes(page);

  for (let cycle = 0; cycle < 3; cycle += 1) {
    for (let i = 0; i <= 10; i += 1) await scrollToProgress(page, i / 10);
    for (let i = 10; i >= 0; i -= 1) await scrollToProgress(page, i / 10);
  }

  const final = await dumpNodes(page);
  expect(final).toEqual(initial);
  expect(problems).toEqual([]);
});

test('TC-P0-04 the stack returns to its original parent after a full reverse', async ({ page }) => {
  await bootPage(page);

  const atStart = await dumpNodes(page);
  expect(atStart.find((n) => n.name === 'S-IC')?.parent).toBe('stack');

  await scrollToProgress(page, 1);
  const atEnd = await dumpNodes(page);
  // Separations have happened: the spent stages now live at the scene root.
  expect(atEnd.find((n) => n.name === 'S-IC')?.parent).toBe(DETACHED);
  expect(atEnd.find((n) => n.name === 'S-II')?.parent).toBe(DETACHED);

  await scrollToProgress(page, 0);
  const backAtStart = await dumpNodes(page);
  expect(backAtStart.find((n) => n.name === 'S-IC')?.parent).toBe('stack');
  expect(backAtStart).toEqual(atStart);
});

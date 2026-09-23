import { expect, test } from '@playwright/test';
import { MET, bootPage, getMet, scrollToMet, scrollToProgress } from './helpers';

/**
 * TC-P1-07 — the interstage fires about 30 s after S-IC separation
 *
 * The PRD says "about 30 s" (line 100). With a real time model that is an
 * arithmetic assertion rather than something to eyeball.
 */

test('TC-P1-07 the interstage jettisons 30 s after S-IC separation', async ({ page }) => {
  await bootPage(page);

  await scrollToMet(page, MET.sepSIC);
  const sic = await getMet(page);

  await scrollToMet(page, MET.sepInterstage);
  const interstage = await getMet(page);

  expect(interstage - sic).toBeCloseTo(30, 0);
});

test('the escape tower goes shortly after the interstage', async ({ page }) => {
  await bootPage(page);
  // Apollo 11 flew these six seconds apart.
  expect(MET.sepLES - MET.sepInterstage).toBe(6);
});

test('MET advances monotonically with scroll and never runs backwards', async ({ page }) => {
  await bootPage(page);

  let previous = -Infinity;
  for (let i = 0; i <= 40; i += 1) {
    await scrollToProgress(page, i / 40);
    const met = await getMet(page);
    expect(met, `MET went backwards at progress ${i / 40}`).toBeGreaterThanOrEqual(previous - 0.01);
    previous = met;
  }
});

test('the timeline spans ignition to splashdown', async ({ page }) => {
  await bootPage(page);

  await scrollToProgress(page, 0);
  expect(await getMet(page)).toBeCloseTo(MET.ignition, 0);

  // The whole mission: the page ends with the capsule afloat, a couple of
  // minutes after splashdown at 195:18:35.
  await scrollToProgress(page, 1);
  expect(await getMet(page)).toBeCloseTo(MET.missionEnd, 0);
});

test('separations get disproportionate scroll — the slow-motion dwell', async ({ page }) => {
  await bootPage(page);

  const span = async (fromMet: number, toMet: number): Promise<number> => {
    const a = await page.evaluate((m) => window.__apollo!.progressAtMet(m), fromMet);
    const b = await page.evaluate((m) => window.__apollo!.progressAtMet(m), toMet);
    return b - a;
  };

  // Six seconds around S-IC separation against 346 seconds of S-II burn.
  const separationScroll = await span(MET.sepSIC - 3, MET.sepSIC + 3);
  const burnScroll = await span(220, 540);

  expect(separationScroll).toBeGreaterThan(burnScroll);
});

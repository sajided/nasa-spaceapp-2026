import { expect, test } from '@playwright/test';
import {
  SEPS,
  bootPage,
  progressAtMet,
  scrollToMet,
  scrollToProgress,
  separationWindow,
} from './helpers';

/**
 * TC-P1-15 — SLOW-MO badge
 *
 * The badge is derived from whether progress falls inside a separation window
 * rather than being switched on by the animation, so it cannot get stuck on
 * after a flick-scroll and is correct in both directions for free.
 */

const badge = '#slowmo-badge';

test('TC-P1-15 the badge appears inside every separation', async ({ page }) => {
  await bootPage(page);

  for (const sep of SEPS) {
    await scrollToMet(page, sep.met);
    expect(await separationWindow(page), `${sep.id} window not reported`).toBe(sep.id);
    await expect(page.locator(badge)).toHaveCSS('opacity', '1');
  }
});

test('TC-P1-15 the badge reports the right separation, never a neighbour', async ({ page }) => {
  await bootPage(page);

  // Probed by scroll position rather than by mission time. Around the
  // extraction the timeline is compressed roughly three thousand to one, so
  // "six seconds earlier" is a smaller step than a single scrolled pixel —
  // the probe would land back inside the window it is trying to step outside.
  for (const sep of SEPS) {
    const centre = await progressAtMet(page, sep.met);

    await scrollToProgress(page, Math.max(0, centre - 0.03));
    expect(await separationWindow(page), `${sep.id} leaked backwards`).not.toBe(sep.id);

    await scrollToProgress(page, Math.min(1, centre + 0.03));
    expect(await separationWindow(page), `${sep.id} leaked forwards`).not.toBe(sep.id);
  }
});

test('TC-P1-15 the badge behaves the same scrolling backwards', async ({ page }) => {
  await bootPage(page);

  const sep = SEPS[1]!;

  await scrollToMet(page, sep.met + 20);
  expect(await separationWindow(page)).toBeNull();

  await scrollToMet(page, sep.met);
  expect(await separationWindow(page)).toBe(sep.id);

  await scrollToMet(page, sep.met - 20);
  expect(await separationWindow(page)).toBeNull();
  await expect(page.locator(badge)).toHaveCSS('opacity', '0');
});

test('TC-P1-15 the badge is hidden on the pad and in orbit', async ({ page }) => {
  await bootPage(page);

  for (const met of [-8, 0, 60, 690]) {
    await scrollToMet(page, met);
    expect(await separationWindow(page), `badge showing at MET ${met}`).toBeNull();
  }
});

test('TC-P1-15 the badge is real text, readable by assistive tech', async ({ page }) => {
  await bootPage(page);
  const el = page.locator(badge);
  await expect(el).toHaveText('SLOW-MO');
  await expect(el).toHaveAttribute('role', 'status');
});

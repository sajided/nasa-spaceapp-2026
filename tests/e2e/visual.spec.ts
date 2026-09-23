import { expect, test } from '@playwright/test';
import { MET, SEPS, bootPage, hideDebugChrome, scrollToMet, scrollToProgress } from './helpers';

/**
 * Screenshot baselines.
 *
 * The dumps prove the scene graph is right; these prove it *looks* right. They
 * catch the class of regression a dump cannot see — a part drifting the wrong
 * way, a camera clipping through geometry, a plume rendering in vacuum.
 *
 * This is only possible because nothing in the scene reads the clock: the same
 * progress renders the same frame, so a baseline is a stable artifact rather
 * than a flaky one. Update deliberately with `--update-snapshots`.
 */

const OPTIONS = {
  // Software rendering is deterministic but not bit-exact across platforms.
  maxDiffPixelRatio: 0.02,
  animations: 'disabled' as const,
};

test.beforeEach(async ({ page }) => {
  await bootPage(page);
  await hideDebugChrome(page);
});

test('the vehicle on the pad', async ({ page }) => {
  await scrollToMet(page, MET.ignition);
  await expect(page).toHaveScreenshot('01-pad.png', OPTIONS);
});

test('ignition and hold-down', async ({ page }) => {
  await scrollToMet(page, -2);
  await expect(page).toHaveScreenshot('02-ignition.png', OPTIONS);
});

test('liftoff', async ({ page }) => {
  await scrollToMet(page, 6);
  await expect(page).toHaveScreenshot('03-liftoff.png', OPTIONS);
});

test('climbing out of the atmosphere', async ({ page }) => {
  await scrollToMet(page, 80);
  await expect(page).toHaveScreenshot('04-ascent.png', OPTIONS);
});

for (const [index, sep] of SEPS.entries()) {
  test(`${sep.id} — the flash at beat 2`, async ({ page }) => {
    await scrollToMet(page, sep.met - sep.dwell / 2 + sep.dwell * 0.32);
    await expect(page).toHaveScreenshot(`05-${index + 1}-${sep.id}-flash.png`, OPTIONS);
  });

  test(`${sep.id} — the spent piece falling away`, async ({ page }) => {
    await scrollToMet(page, sep.met - sep.dwell / 2 + sep.dwell * 0.85);
    await expect(page).toHaveScreenshot(`06-${index + 1}-${sep.id}-drift.png`, OPTIONS);
  });
}

test('Earth from the parking orbit', async ({ page }) => {
  await scrollToMet(page, MET.orbitInsertion + 1800);
  await expect(page).toHaveScreenshot('07-earth-orbit.png', OPTIONS);
});

test('trans-lunar injection', async ({ page }) => {
  await scrollToMet(page, MET.tliIgnition + 60);
  await expect(page).toHaveScreenshot('08-tli.png', OPTIONS);
});

test('the docked spacecraft', async ({ page }) => {
  await scrollToMet(page, MET.docking);
  await expect(page).toHaveScreenshot('09-docked.png', OPTIONS);
});

test('the translunar coast', async ({ page }) => {
  await scrollToMet(page, MET.midcourseCorrection);
  await expect(page).toHaveScreenshot('10-coast.png', OPTIONS);
});

test('lunar orbit', async ({ page }) => {
  // Chapter 6's last frame. It was the end of the page until Phase 3.
  await scrollToMet(page, MET.loi2);
  await expect(page).toHaveScreenshot('11-lunar-orbit.png', OPTIONS);
});

// ── Phase 3 ──────────────────────────────────────────────────────────────
// Numbered on from chapter 6. SEP-8's flash and drift shots come from the
// separation loop above, like every other separation.

test('Eagle and Columbia apart over the Moon', async ({ page }) => {
  await scrollToMet(page, MET.sepUndock + 200);
  await expect(page).toHaveScreenshot('12-undock.png', OPTIONS);
});

test('powered descent, engine-first', async ({ page }) => {
  await scrollToMet(page, MET.pdi + 120);
  await expect(page).toHaveScreenshot('13-pdi.png', OPTIONS);
});

test('the 1202 alarm', async ({ page }) => {
  await scrollToMet(page, MET.alarm1202a + 10);
  await expect(page).toHaveScreenshot('14-1202.png', OPTIONS);
});

test('touchdown in the dust', async ({ page }) => {
  await scrollToMet(page, MET.touchdown - 4);
  await expect(page).toHaveScreenshot('15-touchdown.png', OPTIONS);
});

test('the first step', async ({ page }) => {
  await scrollToMet(page, MET.firstStep + 20);
  await expect(page).toHaveScreenshot('16-first-step.png', OPTIONS);
});

test('the flag', async ({ page }) => {
  await scrollToMet(page, MET.flag + 120);
  await expect(page).toHaveScreenshot('17-flag.png', OPTIONS);
});

// ── Phase 4 ──────────────────────────────────────────────────────────────
// SEP-9 to SEP-12's flash and drift shots come from the separation loop.

test('liftoff from the Moon', async ({ page }) => {
  await scrollToMet(page, MET.ascentLiftoff + 100);
  await expect(page).toHaveScreenshot('18-ascent.png', OPTIONS);
});

test('looking back at the descent stage', async ({ page }) => {
  await scrollToMet(page, MET.ascentLiftoff + 14);
  await expect(page).toHaveScreenshot('19-look-back.png', OPTIONS);
});

test('rendezvous', async ({ page }) => {
  await scrollToMet(page, MET.tpi + 1800);
  await expect(page).toHaveScreenshot('20-rendezvous.png', OPTIONS);
});

test('trans-Earth injection', async ({ page }) => {
  await scrollToMet(page, MET.teiIgnition + 60);
  await expect(page).toHaveScreenshot('21-tei.png', OPTIONS);
});

test('the coast home', async ({ page }) => {
  await scrollToMet(page, MET.mcc5 - 60);
  await expect(page).toHaveScreenshot('22-return-coast.png', OPTIONS);
});

test('the Earth from 400 km', async ({ page }) => {
  await scrollToMet(page, MET.sepSM - 60);
  await expect(page).toHaveScreenshot('23-sm-jettison.png', OPTIONS);
});

test('reentry plasma', async ({ page }) => {
  await scrollToMet(page, MET.peakHeating);
  await expect(page).toHaveScreenshot('24-plasma.png', OPTIONS);
});

test('the drogues', async ({ page }) => {
  await scrollToMet(page, MET.drogues + 6);
  await expect(page).toHaveScreenshot('25-drogues.png', OPTIONS);
});

test('the mains', async ({ page }) => {
  await scrollToMet(page, MET.mains + 30);
  await expect(page).toHaveScreenshot('26-mains.png', OPTIONS);
});

test('splashdown', async ({ page }) => {
  await scrollToMet(page, MET.missionEnd);
  await expect(page).toHaveScreenshot('27-splashdown.png', OPTIONS);
});

test('the stack is whole again after a full reverse', async ({ page }) => {
  await scrollToProgress(page, 1);
  await scrollToProgress(page, 0);
  await expect(page).toHaveScreenshot('01-pad.png', OPTIONS);
});

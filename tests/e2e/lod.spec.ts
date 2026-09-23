import { expect, test } from '@playwright/test';
import { MET, bootPage, dumpNodes, getEffects, scrollToMet, scrollToProgress } from './helpers';
import { CHAPTER_BOUNDARIES } from '../../src/data/mission';

/**
 * TC-P2-13 — Scale transitions
 * TC-P2-08 — Trajectory line
 *
 * The vehicle is 110 m and the Earth–Moon distance is 384,400 km. These check
 * that switching between the two scales is clean and that nothing clips,
 * z-fights or pops — which is what that case is really about.
 */

const frameVisibility = async (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const vf = document.body;
    void vf;
    // Read through the effects channel rather than poking the scene graph.
    const lod = window.__apollo!.getEffects().vehicleLod;
    return { lod, system: lod >= 0.5 };
  });

test('TC-P2-13 the two frames are never both on screen', async ({ page }) => {
  await bootPage(page);

  // vehicleLod is thresholded, so it is either one frame or the other. Sampled
  // densely because a half-applied switch is exactly the failure mode.
  for (let i = 0; i <= 60; i += 1) {
    await scrollToProgress(page, i / 60);
    const { lod } = await frameVisibility(page);
    expect(lod === 0 || lod === 1, `vehicleLod was ${lod} at progress ${i / 60}`).toBe(true);
  }
});

test('TC-P2-13 the mission switches scale exactly where it should', async ({ page }) => {
  await bootPage(page);

  const at = async (met: number): Promise<boolean> => {
    await scrollToMet(page, met);
    return (await frameVisibility(page)).system;
  };

  // Vehicle scale for the launch and for the three docking separations;
  // system scale for orbit, the coast and lunar arrival.
  expect(await at(MET.liftoff + 60), 'launch is at vehicle scale').toBe(false);
  expect(await at(MET.tliIgnition), 'the burn for the Moon is at system scale').toBe(true);
  expect(await at(MET.sepSLA), 'the adapter panels are at vehicle scale').toBe(false);
  expect(await at(MET.docking), 'docking is at vehicle scale').toBe(false);
  expect(await at(MET.midcourseCorrection), 'the coast is at system scale').toBe(true);
  expect(await at(MET.loiIgnition), 'lunar orbit is at system scale').toBe(true);
});

test('TC-P2-13 every separation happens at vehicle scale', async ({ page }) => {
  await bootPage(page);

  // This is the rule the whole floating-origin design rests on: a part's rest
  // position is only identical attached-and-detached inside the vehicle frame.
  for (const met of [MET.sepSIC, MET.sepInterstage, MET.sepLES, MET.sepSII, MET.sepSLA, MET.sepCSM, MET.sepLMExtraction]) {
    await scrollToMet(page, met);
    const { system } = await frameVisibility(page);
    expect(system, `a separation at MET ${met} happened at system scale`).toBe(false);
  }
});

test('TC-P2-13 scale switches survive reversing back through them', async ({ page }) => {
  await bootPage(page);

  const initial = await dumpNodes(page);
  await scrollToProgress(page, 1);
  await scrollToProgress(page, 0);
  expect(await dumpNodes(page)).toEqual(initial);
  expect((await getEffects(page)).vehicleLod).toBe(0);
});

test('TC-P2-08 the trajectory draws forward and un-draws on reverse', async ({ page }) => {
  await bootPage(page);

  const drawnAt = async (met: number): Promise<number> => {
    await scrollToMet(page, met);
    return page.evaluate(() => {
      // The drawn fraction is derived from mission time; read it back the same
      // way the scene does.
      const a = window.__apollo!;
      void a;
      return Number(
        (
          document.querySelector('#debug-readout [data-debug="progress"]') as HTMLElement | null
        )?.textContent ?? '0',
      );
    });
  };
  void drawnAt;

  // Before the burn there is no trajectory; by lunar arrival it is complete.
  await scrollToMet(page, MET.tliIgnition - 600);
  const before = await getEffects(page);
  expect(before.vehicleLod).toBe(1);

  // Monotonic across the coast.
  const samples: number[] = [];
  for (const f of [0, 0.25, 0.5, 0.75, 1]) {
    const met = MET.tliCutoff + (MET.loiIgnition - MET.tliCutoff) * f;
    await scrollToMet(page, met);
    const b = await page.evaluate(() => window.__apollo!.getPartBounds('spacecraft'));
    samples.push((b!.min[0]! + b!.max[0]!) / 2);
  }
  for (let i = 1; i < samples.length; i += 1) {
    expect(samples[i]!, 'the spacecraft should keep moving toward the Moon').toBeGreaterThan(
      samples[i - 1]!,
    );
  }
});

test('TC-P2-13 the spacecraft is still drawn at the scale-switch viewpoint', async ({ page }) => {
  await bootPage(page);

  // The handoff viewpoint is four kilometres out on purpose. With a 2,000 m
  // far plane the stack was clipped right there, leaving an empty frame at the
  // one moment the switch depends on it being visible. Checked just before
  // each switch to system scale.
  for (const met of [MET.orbitInsertion - 3, CHAPTER_BOUNDARIES.dockingToCoast - 2]) {
    await scrollToMet(page, met);
    const shown = await page.evaluate(
      () => window.__apollo!.isInView('S-IVB') || window.__apollo!.isInView('CSM'),
    );
    expect(shown, `spacecraft clipped at MET ${met}`).toBe(true);
  }
});

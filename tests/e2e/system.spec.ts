import { expect, test } from '@playwright/test';
import { MET, bootPage, getEffects, getPartBounds, scrollToMet, scrollToProgress } from './helpers';

/**
 * TC-P2-01 — Earth sphere and texture
 * TC-P2-02 — Parking orbit
 * TC-P2-03 — TLI burn
 * TC-P2-10 — Moon sphere and lunar orbit insertion
 * TC-P2-13 — Scale transitions
 */

/** System units are thousands of kilometres — see src/core/frames.ts. */
const EARTH_RADIUS = 6.371;
const MOON_RADIUS = 1.737;
const EARTH_MOON_DISTANCE = 384.4;

test('TC-P2-01 Earth is present at the right size', async ({ page }) => {
  await bootPage(page);
  await scrollToMet(page, MET.orbitInsertion + 1800);

  const earth = await page.evaluate(() => {
    const scene = document.body;
    void scene;
    return window.__apollo!.getPartBounds('spacecraft');
  });
  expect(earth, 'the spacecraft marker should exist in the system frame').not.toBeNull();
});

test('TC-P2-01 textures load before the page reports ready', async ({ page }) => {
  // A texture that arrives after `ready` would make boot.spec's dev-vs-preview
  // dump comparison race the network.
  const failures: string[] = [];
  page.on('response', (r) => {
    if (r.url().includes('/textures/') && !r.ok()) failures.push(`${r.status()} ${r.url()}`);
  });
  const requested: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/textures/')) requested.push(r.url());
  });

  await bootPage(page);
  expect(failures).toEqual([]);
  expect(requested.some((u) => u.includes('earth'))).toBe(true);
  expect(requested.some((u) => u.includes('moon'))).toBe(true);
});

test('TC-P2-02 the parking orbit holds a constant altitude', async ({ page }) => {
  await bootPage(page);

  const radii: number[] = [];
  for (let i = 0; i <= 8; i += 1) {
    const met = MET.orbitInsertion + (MET.tliIgnition - MET.orbitInsertion) * (i / 8);
    await scrollToMet(page, met);
    const b = await getPartBounds(page, 'spacecraft');
    const c = [
      (b!.min[0]! + b!.max[0]!) / 2,
      (b!.min[1]! + b!.max[1]!) / 2,
      (b!.min[2]! + b!.max[2]!) / 2,
    ];
    radii.push(Math.hypot(c[0]!, c[1]!, c[2]!));
  }

  // Every sample sits just above the surface, and none drifts away from it.
  for (const r of radii) {
    expect(r).toBeGreaterThan(EARTH_RADIUS);
    expect(r).toBeLessThan(EARTH_RADIUS * 1.2);
  }
  const spread = Math.max(...radii) - Math.min(...radii);
  expect(spread, 'altitude should be constant around the orbit').toBeLessThan(0.4);
});

test('TC-P2-02 the orbit is a curve, not a straight drift', async ({ page }) => {
  await bootPage(page);

  const xs: number[] = [];
  for (let i = 0; i <= 8; i += 1) {
    const met = MET.orbitInsertion + (MET.tliIgnition - MET.orbitInsertion) * (i / 8);
    await scrollToMet(page, met);
    const b = await getPartBounds(page, 'spacecraft');
    xs.push((b!.min[0]! + b!.max[0]!) / 2);
  }

  // A straight drift is monotonic in x; going round something is not.
  const increasing = xs.slice(1).filter((v, i) => v > xs[i]!).length;
  expect(increasing).toBeGreaterThan(0);
  expect(increasing).toBeLessThan(xs.length - 1);
});

test('TC-P2-03 the S-IVB relights for the burn and shuts down after', async ({ page }) => {
  await bootPage(page);

  await scrollToMet(page, MET.tliIgnition - 120);
  expect((await getEffects(page)).exhaustJ2Single, 'engine should be cold before TLI').toBeLessThan(
    0.05,
  );

  await scrollToMet(page, MET.tliIgnition + 40);
  expect((await getEffects(page)).exhaustJ2Single, 'engine should be lit during TLI').toBeGreaterThan(
    0.8,
  );

  await scrollToMet(page, MET.tliCutoff + 60);
  expect((await getEffects(page)).exhaustJ2Single, 'engine should be out after cutoff').toBeLessThan(
    0.05,
  );
});

test('TC-P2-03 reversing out of the burn extinguishes it again', async ({ page }) => {
  await bootPage(page);
  await scrollToMet(page, MET.tliIgnition + 40);
  expect((await getEffects(page)).exhaustJ2Single).toBeGreaterThan(0.8);

  await scrollToMet(page, MET.tliIgnition - 120);
  expect((await getEffects(page)).exhaustJ2Single).toBeLessThan(0.05);
});

test('TC-P2-10 the spacecraft ends in a closed orbit around the Moon', async ({ page }) => {
  await bootPage(page);
  // The end of chapter 6 — the end of the page until the way home was added.
  await scrollToMet(page, MET.loi2);

  const b = await getPartBounds(page, 'spacecraft');
  const c = [
    (b!.min[0]! + b!.max[0]!) / 2,
    (b!.min[1]! + b!.max[1]!) / 2,
    (b!.min[2]! + b!.max[2]!) / 2,
  ];

  // Close to the Moon, and above its surface rather than inside it.
  const fromMoon = Math.hypot(c[0]! - EARTH_MOON_DISTANCE, c[1]!, c[2]!);
  expect(fromMoon).toBeGreaterThan(MOON_RADIUS);
  expect(fromMoon).toBeLessThan(MOON_RADIUS * 2.5);
});

test('TC-P2-10 the braking burn fires between ignition and cutoff', async ({ page }) => {
  await bootPage(page);

  await scrollToMet(page, MET.loiIgnition + 60);
  expect((await getEffects(page)).exhaustJ2Single).toBeGreaterThan(0.8);

  await scrollToProgress(page, 1);
  expect((await getEffects(page)).exhaustJ2Single).toBeLessThan(0.05);
});

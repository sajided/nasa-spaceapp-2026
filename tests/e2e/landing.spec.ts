import { expect, test, type Page } from '@playwright/test';
import { CALLOUTS } from '../../src/data/callouts';
import { DESCENT_KEY_METS } from '../../src/data/lunarFlight';
import { DUST_MAX_HEIGHT } from '../../src/scene/lunarSurface';
import {
  MET,
  SEPS,
  bootPage,
  collectConsoleProblems,
  dumpNodes,
  getEffects,
  isInView,
  parentOf,
  partNode,
  scrollToMet,
  scrollToProgress,
} from './helpers';
import type { SurfaceReport } from '../../src/types';

/**
 * Phase 3 — chapter 7: undocking, powered descent and landing.
 *
 * TC-P3-01 SEP-8 LM undocking
 * TC-P3-02 Powered descent
 * TC-P3-03 1202 alarm beat
 * TC-P3-04 Low-fuel callouts
 * TC-P3-06 Touchdown dust
 * TC-P3-07 "The Eagle has landed"
 * TC-P3-12 Reverse scroll through the landing
 * TC-P3-13 Dust scales with the quality tier
 *
 * The generic separation checks — RP-1 attach/detach, reverse, five scrubs,
 * in-shot, four beats, SLOW-MO — already run for SEP-8 because it is a row in
 * data/separations.ts. What is here is what only chapter 7 has.
 */

const SEP8 = SEPS.find((s) => s.id === 'sep-8')!;

async function surface(page: Page): Promise<SurfaceReport> {
  return page.evaluate(() => window.__apollo!.getSurface());
}

async function callout(page: Page): Promise<string | null> {
  return page.evaluate(() => window.__apollo!.getCallout());
}

// ── TC-P3-01 ─────────────────────────────────────────────────────────────

test('TC-P3-01 Eagle leaves Columbia for its own flight frame', async ({ page }) => {
  await bootPage(page);

  await scrollToMet(page, SEP8.met - SEP8.dwell / 2 - 4);
  expect(await parentOf(page, 'LM')).toBe('CSM');

  await scrollToMet(page, SEP8.met + SEP8.dwell / 2 + 4);
  expect(await parentOf(page, 'LM')).toBe('LM-flight');
});

test('TC-P3-01 the handover does not move Eagle', async ({ page }) => {
  await bootPage(page);

  // Either side of the attachment crossing, a whisker apart: the LM changes
  // parent and nothing else. A wrong rest transform shows up as a jump here.
  const crossing = SEP8.met - SEP8.dwell / 2 + SEP8.dwell * 0.33;
  await scrollToMet(page, crossing - 0.4);
  const before = await partNode(page, 'LM');
  await scrollToMet(page, crossing + 0.4);
  const after = await partNode(page, 'LM');

  expect(before.parent).toBe('CSM');
  expect(after.parent).toBe('LM-flight');
  for (let i = 0; i < 3; i += 1) expect(Math.abs(after.pos[i]! - before.pos[i]!)).toBeLessThan(0.05);
});

test('TC-P3-01 both vehicles stay in the scene and in shot after undocking', async ({ page }) => {
  await bootPage(page);

  // The wide hold after the window — "long enough to read what happened".
  for (const dt of [40, 120, 280]) {
    await scrollToMet(page, SEP8.met + SEP8.dwell / 2 + dt);
    expect(await isInView(page, 'LM'), `Eagle out of shot at +${dt}s`).toBe(true);
    expect(await isInView(page, 'CSM'), `Columbia out of shot at +${dt}s`).toBe(true);
  }

  // Columbia is hidden once it is a speck, but never removed: Phase 4 needs it.
  await scrollToMet(page, MET.pdi);
  const csm = await partNode(page, 'CSM');
  expect(csm.visible).toBe(false);
  expect(csm.parent).toBe('vehicle-frame');
});

test('TC-P3-01 reverse redocks with Eagle exactly on the CM nose', async ({ page }) => {
  await bootPage(page);

  await scrollToMet(page, SEP8.met - SEP8.dwell / 2 - 4);
  const docked = await dumpNodes(page);

  await scrollToMet(page, MET.pdi);
  await scrollToMet(page, SEP8.met - SEP8.dwell / 2 - 4);

  expect(await dumpNodes(page)).toEqual(docked);
  expect(await parentOf(page, 'LM')).toBe('CSM');
});

test('TC-P2-06 regression: the CM apex meets the LM tunnel with no overlap', async ({ page }) => {
  await bootPage(page);

  // Found while building SEP-8: the Phase 2 docking put the CM nose three
  // metres inside the LM, and extraction then flipped the LM onto the SM's
  // engine bell. Both vehicles are measured, not their origins.
  for (const met of [MET.docking + 2, MET.sepLMExtraction + 30, MET.sepUndock - 60]) {
    await scrollToMet(page, met);
    const cm = await page.evaluate(() => window.__apollo!.getPartBounds('CM'));
    const lm = await page.evaluate(() => window.__apollo!.getPartBounds('LM'));
    expect(cm && lm, 'bounds missing').toBeTruthy();
    // CM hangs apex-down above the LM.
    const gap = cm!.min[1]! - lm!.max[1]!;
    expect(gap, `CM/LM gap at MET ${met}`).toBeGreaterThanOrEqual(-0.05);
    expect(gap, `CM/LM gap at MET ${met}`).toBeLessThan(0.7);
  }
});

// ── TC-P3-02 ─────────────────────────────────────────────────────────────

test('TC-P3-02 powered descent: engine lit throughout, altitude always falling', async ({ page }) => {
  await bootPage(page);

  let previous = Infinity;
  const samples = 14;
  for (let i = 0; i <= samples; i += 1) {
    const met = MET.pdi + 30 + ((MET.touchdown - 2 - (MET.pdi + 30)) * i) / samples;
    await scrollToMet(page, met);
    const s = await surface(page);
    const fx = await getEffects(page);
    expect(fx.exhaustDPS, `engine out at MET ${met}`).toBeGreaterThan(0.5);
    expect(s.altitude, `altitude rose at MET ${met}`).toBeLessThan(previous);
    previous = s.altitude;
  }
});

test('TC-P3-02 Eagle pitches from engine-first to upright', async ({ page }) => {
  await bootPage(page);

  await scrollToMet(page, MET.pdi + 60);
  const braking = (await surface(page)).attitude;
  expect(braking).toBeGreaterThan(1.3); // near π/2: horizontal, engine forward

  await scrollToMet(page, MET.highGate + 30);
  const afterPitchOver = (await surface(page)).attitude;
  expect(afterPitchOver).toBeLessThan(0.8);

  await scrollToMet(page, MET.touchdown);
  expect((await surface(page)).attitude).toBeCloseTo(0, 3);
});

test('TC-P3-02 the profile is monotone between every pair of keys', async ({ page }) => {
  await bootPage(page);

  // Denser than the test above, and across the whole chapter: no key pair may
  // make Eagle climb, however the interpolation behaves between them.
  let previous = Infinity;
  for (let k = 0; k < DESCENT_KEY_METS.length - 1; k += 1) {
    const a = DESCENT_KEY_METS[k]!;
    const b = DESCENT_KEY_METS[k + 1]!;
    for (const f of [0, 0.5]) {
      await scrollToMet(page, a + (b - a) * f);
      const alt = (await surface(page)).altitude;
      expect(alt, `climbed between keys ${k} and ${k + 1}`).toBeLessThanOrEqual(previous + 1e-6);
      previous = alt;
    }
  }
});

// ── TC-P3-03 / TC-P3-04 ──────────────────────────────────────────────────

test('TC-P3-03 the 1202 alarm is a readable beat and clears on reverse', async ({ page }) => {
  await bootPage(page);

  await scrollToMet(page, MET.alarm1202a + 5);
  expect(await callout(page)).toBe('alarm-1202');
  const card = page.locator('#callout');
  await expect(card).toHaveCSS('opacity', '1');
  await expect(card).toContainText('1202');
  // Explained in plain language, not just a code.
  await expect(card).toContainText('overloaded');

  // Timed to the right point in the descent: after powered descent began,
  // before the pitch-over.
  const s = await surface(page);
  expect(s.altitude).toBeGreaterThan(5000);
  expect(s.altitude).toBeLessThan(15000);

  await scrollToMet(page, MET.alarm1202a - 60);
  expect(await callout(page)).not.toBe('alarm-1202');
});

test('TC-P3-04 fuel callouts come in order, the last just before touchdown', async ({ page }) => {
  await bootPage(page);

  const fuel = CALLOUTS.filter((c) => c.kind === 'fuel');
  expect(fuel.map((c) => c.id)).toEqual(['fuel-60', 'fuel-30']);
  for (let i = 1; i < fuel.length; i += 1) {
    expect(fuel[i]!.metStart).toBeGreaterThan(fuel[i - 1]!.metEnd);
  }
  const last = fuel[fuel.length - 1]!;
  expect(last.metEnd).toBeLessThan(MET.touchdown);
  expect(MET.touchdown - last.metStart).toBeLessThan(60);

  for (const c of fuel) {
    await scrollToMet(page, (c.metStart + c.metEnd) / 2);
    expect(await callout(page)).toBe(c.id);
  }
});

test('TC-P3-03/04 no callout window overlaps another', async () => {
  const sorted = [...CALLOUTS].sort((a, b) => a.metStart - b.metStart);
  for (let i = 1; i < sorted.length; i += 1) {
    expect(sorted[i]!.metStart, `${sorted[i]!.id} overlaps ${sorted[i - 1]!.id}`).toBeGreaterThan(
      sorted[i - 1]!.metEnd,
    );
  }
});

// ── TC-P3-06 ─────────────────────────────────────────────────────────────

test('TC-P3-06 dust starts before contact and settles after', async ({ page }) => {
  await bootPage(page);

  await scrollToMet(page, MET.dustStart - 20);
  expect((await getEffects(page)).dust).toBe(0);

  await scrollToMet(page, MET.touchdown - 10);
  const s = await surface(page);
  expect((await getEffects(page)).dust).toBeGreaterThan(0.5);
  expect(s.altitude, 'dust should be flying before contact').toBeGreaterThan(0.5);

  await scrollToMet(page, MET.engineStop + 10);
  expect((await getEffects(page)).dust).toBe(0);
});

test('TC-P3-06 the dust sheet is flat — no atmospheric billowing', async () => {
  // The ceiling is a shader constant, so assert the constant: nothing in the
  // sheet can rise above half a metre.
  expect(DUST_MAX_HEIGHT).toBeLessThanOrEqual(0.5);
});

test('TC-P3-06 the LM neither sinks into nor hovers above the surface', async ({ page }) => {
  await bootPage(page);

  for (const met of [MET.touchdown, MET.eagleLanded, MET.firstStep, MET.hatchClose]) {
    await scrollToMet(page, met);
    const s = await surface(page);
    expect(Math.abs(s.clearance), `clearance at MET ${met}`).toBeLessThan(0.02);
  }
});

// ── TC-P3-07 ─────────────────────────────────────────────────────────────

test('TC-P3-07 engine cuts, motion stops, and the moment gets a caption', async ({ page }) => {
  await bootPage(page);

  await scrollToMet(page, MET.eagleLanded + 5);
  expect((await getEffects(page)).exhaustDPS).toBe(0);
  expect(await callout(page)).toBe('landed');
  await expect(page.locator('#callout')).toContainText('The Eagle has landed');

  // Eagle does not move through the hold.
  const a = await partNode(page, 'LM');
  const b = await partNode(page, 'lunar-surface');
  await scrollToMet(page, MET.eagleLanded + 55);
  expect((await partNode(page, 'LM')).pos).toEqual(a.pos);
  expect((await partNode(page, 'lunar-surface')).pos).toEqual(b.pos);
});

test('TC-P3-07 the landing gets room: its hold is not scrolled straight past', async ({ page }) => {
  await bootPage(page);

  const span = async (m0: number, m1: number): Promise<number> =>
    page.evaluate(
      ([x, y]) => window.__apollo!.progressAtMet(y!) - window.__apollo!.progressAtMet(x!),
      [m0, m1],
    );
  // A minute after "The Eagle has landed" gets at least a third of the scroll
  // the whole twelve-minute powered descent took per minute on average.
  const hold = await span(MET.eagleLanded, MET.eagleLanded + 60);
  const descentPerMinute = (await span(MET.pdi, MET.touchdown)) / ((MET.touchdown - MET.pdi) / 60);
  expect(hold).toBeGreaterThan(descentPerMinute / 3);
});

// ── TC-P3-12 ─────────────────────────────────────────────────────────────

test('TC-P3-12 reversing through the landing restores the start of chapter 7', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await bootPage(page);

  const bounds = await page.evaluate(() => window.__apollo!.chapterBounds());
  const [ch7Start] = bounds['descent']!;
  const [, ch8End] = bounds['moonwalk']!;

  await scrollToProgress(page, ch7Start + 1e-4);
  const start = await dumpNodes(page);
  const startSurface = await surface(page);

  for (let i = 1; i <= 12; i += 1) {
    await scrollToProgress(page, ch7Start + ((ch8End - ch7Start) * i) / 12);
  }
  for (let i = 11; i >= 0; i -= 1) {
    await scrollToProgress(page, ch7Start + ((ch8End - ch7Start) * i) / 12);
  }
  await scrollToProgress(page, ch7Start + 1e-4);

  expect(await dumpNodes(page)).toEqual(start);
  expect(await surface(page)).toEqual(startSurface);
  expect((await getEffects(page)).dust).toBe(0);
  expect(await page.evaluate(() => window.__apollo!.hasNaN())).toBe(false);
  expect(problems).toEqual([]);
});

test('TC-P3-12 a full pass to the moonwalk and back restores the initial scene', async ({ page }) => {
  test.setTimeout(120_000);
  const problems = collectConsoleProblems(page);
  await bootPage(page);

  const initial = await dumpNodes(page);
  for (let i = 0; i <= 16; i += 1) await scrollToProgress(page, i / 16);
  for (let i = 16; i >= 0; i -= 1) await scrollToProgress(page, i / 16);

  expect(await dumpNodes(page)).toEqual(initial);
  expect(problems).toEqual([]);
});

// ── TC-P3-13 ─────────────────────────────────────────────────────────────

test('TC-P3-13 dust particle count follows the quality tier hook', async ({ page }) => {
  await bootPage(page);
  const high = (await surface(page)).dustCount;

  await bootPage(page, '/?debug=1&story=0&quality=medium');
  const medium = (await surface(page)).dustCount;

  await bootPage(page, '/?debug=1&story=0&quality=low');
  const low = (await surface(page)).dustCount;

  expect(high).toBeGreaterThan(medium);
  expect(medium).toBeGreaterThan(low);
  expect(low).toBeGreaterThan(0);
});

test('TC-P3-13 clip planes track the camera height over the Moon', async ({ page }) => {
  await bootPage(page);

  // In lunar orbit the horizon is hundreds of kilometres out; on the surface
  // it is a couple of kilometres. Near scales with far so depth precision
  // holds (TC-P2-13's "no z-fighting" at the new scales).
  await scrollToMet(page, MET.sepUndock - 120);
  const orbit = await surface(page);
  await scrollToMet(page, MET.firstStep);
  const ground = await surface(page);

  expect(orbit.far).toBeGreaterThan(500_000);
  expect(ground.far).toBeLessThan(20_000);
  // 300,000:1 by construction; the slack is the debug API's rounding.
  expect(orbit.far / orbit.near).toBeLessThanOrEqual(300_000 * 1.001);
  expect(ground.near).toBeLessThanOrEqual(0.1);

  // And back to the defaults once the surface is gone.
  await scrollToMet(page, MET.loi2 - 3600);
  const system = await surface(page);
  expect(system.visible).toBe(false);
  expect(system.far).toBe(2000);
});

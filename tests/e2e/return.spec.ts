import { expect, test, type Page } from '@playwright/test';
import { CALLOUTS } from '../../src/data/callouts';
import { DESCENT_STAGES, reentryAt } from '../../src/data/reentry';
import { CM_DRAFT } from '../../src/data/vehicle';
import {
  ATTACHMENT_PARENTS,
  FINAL_STATE,
  MET,
  SEPS,
  bootPage,
  collectConsoleProblems,
  dumpNodes,
  getEffects,
  hideDebugChrome,
  isInView,
  parentOf,
  partNode,
  scrollToMet,
  scrollToProgress,
  setSlider,
} from './helpers';
import type { ReentryReport, SceneDump } from '../../src/types';

/**
 * Phase 4 — chapters 9 and 10: the way home.
 *
 * TC-P4-01 SEP-9 ascent stage leaves the descent stage
 * TC-P4-02 Rendezvous and redocking
 * TC-P4-03 SEP-10 ascent stage jettison, after crew transfer
 * TC-P4-04 Trans-Earth injection
 * TC-P4-05 SEP-11 Service Module jettison
 * TC-P4-06 Reentry plasma
 * TC-P4-07 SEP-12 parachute sequence
 * TC-P4-08 Splashdown
 * TC-P4-09 Only the Command Module remains
 * TC-P4-10 / 11 Full mission forward and reverse
 * TC-P4-12 Random-access consistency
 *
 * RP-1 and RP-2 for SEP-9 to SEP-12 — attach/detach, reverse, five scrubs,
 * in shot, the four beats, SLOW-MO — already run from the separation loop in
 * separations.spec.ts, slowmo.spec.ts and separation-order.spec.ts, because
 * each is a row in data/separations.ts. What is here is what only chapters
 * 9–10 have.
 */

const sep = (id: string): (typeof SEPS)[number] => SEPS.find((s) => s.id === id)!;
const SEP9 = sep('sep-9');
const SEP10 = sep('sep-10');
const SEP11 = sep('sep-11');
const SEP12 = sep('sep-12');

type Node = SceneDump['nodes'][number];

async function reentry(page: Page): Promise<ReentryReport> {
  return page.evaluate(() => window.__apollo!.getReentry());
}

function distance(a: Node, b: Node): number {
  return Math.hypot(a.pos[0]! - b.pos[0]!, a.pos[1]! - b.pos[1]!, a.pos[2]! - b.pos[2]!);
}

// ── The helpers' attachment table is the one the page registers ──────────

test('helpers-consistency: ATTACHMENT_PARENTS matches the running scene', async ({ page }) => {
  await bootPage(page);
  for (const [part, expected] of Object.entries(ATTACHMENT_PARENTS)) {
    const actual = await page.evaluate((n) => window.__apollo!.getAttachmentParents(n), part);
    expect(actual, part).toEqual(expected);
  }
});

// ── TC-P4-01 ─────────────────────────────────────────────────────────────

test('TC-P4-01 the ascent stage lifts off; the descent stage stays on the Moon', async ({ page }) => {
  await bootPage(page);

  await scrollToMet(page, SEP9.met - SEP9.dwell / 2 - 4);
  expect(await parentOf(page, 'LM-ascent-stage')).toBe('LM-descent-stage');
  expect(await parentOf(page, 'LM')).toBe('LM-flight');

  for (const met of [SEP9.met + SEP9.dwell / 2 + 4, MET.tpi, MET.sepAscentJettison, MET.missionEnd]) {
    await scrollToMet(page, met);
    expect(await parentOf(page, 'LM'), `descent stage at MET ${met}`).toBe('surface-site');
  }
});

test('TC-P4-01 neither stage jumps at the handover', async ({ page }) => {
  await bootPage(page);

  const crossing = SEP9.met - SEP9.dwell / 2 + SEP9.dwell * 0.33;
  await scrollToMet(page, crossing - 0.3);
  const before = await dumpNodes(page);
  await scrollToMet(page, crossing + 0.3);
  const after = await dumpNodes(page);

  for (const name of ['LM', 'LM-ascent-stage']) {
    const a = before.find((n) => n.name === name)!;
    const b = after.find((n) => n.name === name)!;
    expect(a.parent, `${name} before`).not.toBe(b.parent);
    expect(distance(a, b), `${name} jumped at the handover`).toBeLessThan(0.1);
  }
});

test('TC-P4-01 the descent stage sits on the surface, and is in view on the look back', async ({ page }) => {
  await bootPage(page);

  // The camera's one look back down, a few seconds after liftoff.
  await scrollToMet(page, MET.ascentLiftoff + 14);
  expect(await isInView(page, 'LM'), 'descent stage out of shot on the look back').toBe(true);

  // Footpads on the regolith: the descent stage is exactly where the landing
  // site is, however far the ascent stage has flown past it.
  for (const met of [MET.ascentLiftoff + 14, MET.ascentLiftoff + 60, MET.tpi]) {
    await scrollToMet(page, met);
    const s = await page.evaluate(() => window.__apollo!.getSurface());
    expect(Math.abs(s.siteClearance), `footpads off the ground at MET ${met}`).toBeLessThan(0.01);
  }
});

// ── TC-P4-02 ─────────────────────────────────────────────────────────────

test('TC-P4-02 Columbia closes on Eagle all the way to contact', async ({ page }) => {
  await bootPage(page);

  let previous = Infinity;
  for (let i = 0; i <= 8; i += 1) {
    // From just after Columbia comes back into view, to just before contact.
    const met = MET.tpi + 60 + ((MET.redock - 60 - (MET.tpi + 60)) * i) / 8;
    await scrollToMet(page, met);
    expect((await partNode(page, 'CSM')).visible, `Columbia hidden at MET ${met}`).toBe(true);
    const d = distance(await partNode(page, 'CM'), await partNode(page, 'LM-ascent-stage'));
    expect(d, `gap grew at MET ${met}`).toBeLessThan(previous);
    previous = d;
  }
});

test('TC-P4-02 docking is nose to tunnel, and they move as one', async ({ page }) => {
  await bootPage(page);

  await scrollToMet(page, MET.redock + 30);
  expect(await parentOf(page, 'LM-ascent-stage')).toBe('CSM');
  const cm = await page.evaluate(() => window.__apollo!.getPartBounds('CM'));
  const stage = await page.evaluate(() => window.__apollo!.getPartBounds('LM-ascent-stage'));
  const gap = cm!.min[1]! - stage!.max[1]!;
  expect(gap).toBeGreaterThanOrEqual(-0.05);
  expect(gap).toBeLessThan(0.7);

  // One unit: the offset between them does not change while docked.
  const offset = async (): Promise<number[]> => {
    const a = await partNode(page, 'CM');
    const b = await partNode(page, 'LM-ascent-stage');
    return a.pos.map((v, i) => v - b.pos[i]!);
  };
  const first = await offset();
  await scrollToMet(page, SEP10.met - SEP10.dwell / 2 - 30);
  const second = await offset();
  for (let i = 0; i < 3; i += 1) expect(Math.abs(second[i]! - first[i]!)).toBeLessThan(0.01);

  // Reverse separates them again.
  await scrollToMet(page, MET.redock - 120);
  expect(await parentOf(page, 'LM-ascent-stage')).toBe('LM-flight');
});

// ── TC-P4-03 ─────────────────────────────────────────────────────────────

test('TC-P4-03 the jettison comes after the crew-transfer beat, not before', async ({ page }) => {
  const transfer = CALLOUTS.find((c) => c.id === 'crew-transfer')!;
  expect(transfer.metEnd).toBeLessThan(SEP10.met - SEP10.dwell / 2);
  expect(transfer.metStart).toBeGreaterThan(MET.redock);

  await bootPage(page);
  await scrollToMet(page, (transfer.metStart + transfer.metEnd) / 2);
  expect(await page.evaluate(() => window.__apollo!.getCallout())).toBe('crew-transfer');
  expect(await parentOf(page, 'LM-ascent-stage'), 'still docked during the transfer').toBe('CSM');
});

// ── TC-P4-04 ─────────────────────────────────────────────────────────────

test('TC-P4-04 TEI: the burn glows, the path leaves the Moon, the line draws home', async ({ page }) => {
  await bootPage(page);

  const moonDistance = async (): Promise<number> => {
    const m = await partNode(page, 'spacecraft');
    return Math.hypot(m.pos[0]! - 384.4, m.pos[1]!, m.pos[2]!);
  };

  await scrollToMet(page, MET.teiIgnition - 60);
  expect(await moonDistance(), 'in lunar orbit before the burn').toBeLessThan(2.5);
  expect(await page.evaluate(() => window.__apollo!.getObjectBounds('trajectory-return'))).toBeNull();

  await scrollToMet(page, MET.teiIgnition + 60);
  expect((await getEffects(page)).spsBurn).toBeGreaterThan(0.5);

  // The way home climbs slowly out of the Moon's well at first (the path is
  // eased that way), so check half a day out.
  await scrollToMet(page, MET.teiCutoff + 12 * 3600);
  expect(await moonDistance(), 'left lunar orbit').toBeGreaterThan(10);
  expect((await getEffects(page)).spsBurn).toBe(0);
  expect(await page.evaluate(() => window.__apollo!.getObjectBounds('trajectory-return'))).not.toBeNull();
});

test('TC-P4-04 the Moon shrinks and the Earth grows on the way home', async ({ page }) => {
  await bootPage(page);

  // Across the return coast, from departure to Earth approach. The camera
  // moves with the story, so the comparison is start against end: the Moon
  // left behind is smaller, the Earth ahead is larger.
  const sizes: { earth: number; moon: number }[] = [];
  for (const met of [MET.teiCutoff + 600, MET.mcc5, MET.sepSM - 1200]) {
    await scrollToMet(page, met);
    sizes.push(await page.evaluate(() => window.__apollo!.getBodySizes()));
  }
  const [first, middle, last] = sizes as [typeof sizes[0], typeof sizes[0], typeof sizes[0]];
  expect(middle.moon, 'Moon did not shrink leaving it').toBeLessThan(first.moon);
  expect(last.moon, 'Moon did not shrink overall').toBeLessThan(first.moon);
  expect(middle.earth, 'Earth did not grow').toBeGreaterThan(first.earth);
  expect(last.earth, 'Earth did not grow approaching it').toBeGreaterThan(middle.earth);
});

// ── TC-P4-05 ─────────────────────────────────────────────────────────────

test('TC-P4-05 the SM goes before entry, and the CM turns heat shield first', async ({ page }) => {
  await bootPage(page);

  await scrollToMet(page, SEP11.met - SEP11.dwell / 2 - 20);
  expect(await parentOf(page, 'SM')).toBe('CSM');
  expect(await parentOf(page, 'CM')).toBe('CSM');
  expect((await reentry(page)).attitude, 'apex down while docked to the SM').toBeCloseTo(Math.PI, 3);

  await scrollToMet(page, MET.entryInterface - 60);
  expect(await parentOf(page, 'SM')).toBe('vehicle-frame');
  expect(await parentOf(page, 'CM')).toBe('CM-flight');
  expect((await reentry(page)).attitude, 'heat shield down for entry').toBeCloseTo(0, 3);

  // Reverse reattaches the SM, and the CM rides in the CSM again.
  await scrollToMet(page, SEP11.met - SEP11.dwell / 2 - 20);
  expect(await parentOf(page, 'SM')).toBe('CSM');
  expect(await parentOf(page, 'CM')).toBe('CSM');
});

// ── TC-P4-06 ─────────────────────────────────────────────────────────────

test('TC-P4-06 plasma builds as the capsule falls, then fades as it slows', async ({ page }) => {
  await bootPage(page);

  const at = async (met: number): Promise<number> => {
    await scrollToMet(page, met);
    return (await getEffects(page)).plasma!;
  };
  const early = await at(MET.entryInterface + 30);
  const peak = await at(MET.peakHeating);
  const late = await at(MET.blackoutEnd + 30);
  const gone = await at(MET.drogues - 30);

  expect(early).toBeGreaterThan(0);
  expect(peak).toBeGreaterThan(early);
  expect(peak).toBeGreaterThan(0.9);
  expect(late).toBeLessThan(peak);
  expect(gone).toBe(0);
});

test('TC-P4-06 the glow trails behind the heat shield, not ahead of it', async ({ page }) => {
  await bootPage(page);
  await scrollToMet(page, MET.peakHeating);

  const wake = await page.evaluate(() => window.__apollo!.getObjectBounds('plasma-wake'));
  const cm = await page.evaluate(() => window.__apollo!.getPartBounds('CM'));
  expect(wake && cm).toBeTruthy();
  // The capsule falls toward the ocean (-Y); behind it is up. The wake's bulk
  // is above the heat shield — the CM's lowest point.
  const wakeCentre = (wake!.min[1]! + wake!.max[1]!) / 2;
  expect(wakeCentre).toBeGreaterThan(cm!.min[1]!);
  expect(wake!.min[1]!).toBeGreaterThan(cm!.min[1]! - 1.5);
});

// ── TC-P4-07 ─────────────────────────────────────────────────────────────

test('TC-P4-07 apex cover, then drogues, then exactly three mains, in order', async ({ page }) => {
  await bootPage(page);
  const start = SEP12.met - SEP12.dwell / 2;

  const state = async (met: number): Promise<Record<string, { parent: string; visible: boolean }>> => {
    await scrollToMet(page, met);
    const nodes = await dumpNodes(page);
    const out: Record<string, { parent: string; visible: boolean }> = {};
    for (const n of ['apex-cover', 'drogue-1', 'drogue-2', 'main-1', 'main-2', 'main-3']) {
      const node = nodes.find((x) => x.name === n)!;
      out[n] = { parent: node.parent, visible: node.visible };
    }
    return out;
  };

  const s0 = await state(start + SEP12.dwell * 0.2);
  expect(s0['apex-cover']!.parent).toBe('CM');
  expect(s0['drogue-1']!.visible || s0['drogue-2']!.visible).toBe(false);

  const s1 = await state(start + SEP12.dwell * 0.4);
  expect(s1['apex-cover']!.parent, 'apex cover off first').toBe('vehicle-frame');
  expect(s1['drogue-1']!.visible, 'drogues not before the cover is off').toBe(false);

  const s2 = await state(start + SEP12.dwell * 0.8);
  expect(s2['drogue-1']!.visible && s2['drogue-2']!.visible, 'both drogues out').toBe(true);
  expect(s2['main-1']!.visible || s2['main-2']!.visible || s2['main-3']!.visible).toBe(false);

  // The mains open one after another.
  const s3 = await state(MET.mains + 1);
  expect([s3['main-1']!.visible, s3['main-2']!.visible, s3['main-3']!.visible]).toEqual([true, false, false]);
  expect(s3['drogue-1']!.parent, 'drogues cut loose as the mains go').toBe('vehicle-frame');

  const s4 = await state(MET.mains + 30);
  const mains = ['main-1', 'main-2', 'main-3'].filter((n) => s4[n]!.visible && s4[n]!.parent === 'CM');
  expect(mains, 'exactly three mains').toHaveLength(3);
});

test('TC-P4-07 each parachute stage slows the descent', async () => {
  // From the profile itself: average descent rate over each stage.
  const rate = ([a, b]: readonly [number, number]): number =>
    (reentryAt(a).altitude - reentryAt(b).altitude) / (b - a);
  const free = rate(DESCENT_STAGES.freeFall);
  const drogues = rate(DESCENT_STAGES.drogues);
  const mains = rate(DESCENT_STAGES.mains);
  expect(drogues).toBeLessThan(free);
  expect(mains).toBeLessThan(drogues);
  // About 30 km/h on the mains, as the caption says.
  expect(mains).toBeGreaterThan(6);
  expect(mains).toBeLessThan(11);
});

test('TC-P4-07 reverse retracts the parachutes in reverse order', async ({ page }) => {
  await bootPage(page);
  const start = SEP12.met - SEP12.dwell / 2;

  await scrollToMet(page, MET.splashdown - 30);
  await scrollToMet(page, MET.mains + 3); // main-3 not yet open
  expect((await partNode(page, 'main-3')).visible).toBe(false);
  expect((await partNode(page, 'main-1')).visible).toBe(true);

  await scrollToMet(page, start - 5);
  const nodes = await dumpNodes(page);
  for (const n of ['drogue-1', 'drogue-2', 'main-1', 'main-2', 'main-3']) {
    const node = nodes.find((x) => x.name === n)!;
    expect(node.visible, `${n} still out before the sequence`).toBe(false);
    expect(node.parent, `${n} not packed`).toBe('CM');
  }
  expect(nodes.find((x) => x.name === 'apex-cover')!.parent).toBe('CM');
});

// ── TC-P4-08 ─────────────────────────────────────────────────────────────

test('TC-P4-08 the timeline ends at exactly progress 1, with no empty scroll', async ({ page }) => {
  await bootPage(page);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(100);
  await scrollToProgress(page, 1);

  expect(await page.evaluate(() => window.__apollo!.getProgress())).toBe(1);
  expect(await page.evaluate(() => window.__apollo!.getMet())).toBeCloseTo(MET.missionEnd, 0);

  // The last one percent of scroll is still mission: nothing is left over.
  await scrollToProgress(page, 0.99);
  expect(await page.evaluate(() => window.__apollo!.getMet())).toBeLessThan(MET.missionEnd);
});

test('TC-P4-08 splash, mains released, the capsule afloat and still', async ({ page }) => {
  await bootPage(page);

  await scrollToMet(page, MET.splashdown + 1);
  expect((await getEffects(page)).splash).toBeGreaterThan(0.5);

  await scrollToMet(page, MET.splashdown + 60);
  for (const n of ['main-1', 'main-2', 'main-3']) {
    expect(await parentOf(page, n), `${n} not released`).toBe('vehicle-frame');
  }

  await scrollToMet(page, MET.missionEnd);
  const r = await reentry(page);
  expect(r.altitude).toBe(0);
  // Afloat: the heat shield about a draft under, give or take the swell.
  expect(r.shieldAboveWater).toBeLessThan(-CM_DRAFT + 0.3);
  expect(r.shieldAboveWater).toBeGreaterThan(-CM_DRAFT - 0.3);

  const held = await dumpNodes(page);
  await page.waitForTimeout(1000);
  expect(await dumpNodes(page), 'the capsule moved on its own while idle').toEqual(held);
});

// ── TC-P4-09 ─────────────────────────────────────────────────────────────

test('TC-P4-09 at the end, only the Command Module is still the vehicle', async ({ page }) => {
  await bootPage(page);
  await scrollToProgress(page, 1);
  const nodes = await dumpNodes(page);

  const active = Object.entries(FINAL_STATE).filter(([, s]) => s.role === 'active');
  expect(active.map(([n]) => n)).toEqual(['CM']);

  for (const [name, expected] of Object.entries(FINAL_STATE)) {
    const node = nodes.find((n) => n.name === name);
    expect(node, `${name} missing from the dump`).toBeDefined();
    expect(node!.parent, `${name} parent`).toBe(expected.parent);
    expect(node!.visible, `${name} visibility`).toBe(expected.visible);
  }

  // Everything in the stack's original ten parts is accounted for.
  for (const name of ['S-IC', 'interstage', 'S-II', 'S-IVB', 'IU', 'SLA', 'LM', 'SM', 'CM', 'LES']) {
    expect(FINAL_STATE[name], `${name} has no final state`).toBeDefined();
  }
});

// ── TC-P4-10 / TC-P4-11 ──────────────────────────────────────────────────

test('TC-P4-10/11 the whole mission forward then back, one step at a time', async ({ page }) => {
  test.setTimeout(240_000);
  const problems = collectConsoleProblems(page);
  await bootPage(page);

  const initial = await dumpNodes(page);
  const count = initial.length;
  const steps = 60;

  for (let i = 0; i <= steps; i += 1) {
    await scrollToProgress(page, i / steps);
    const nodes = await dumpNodes(page);
    expect(nodes.length, `object count changed at ${i / steps}`).toBe(count);
    expect(new Set(nodes.map((n) => n.name)).size, `duplicate part at ${i / steps}`).toBe(count);
  }
  expect(await page.evaluate(() => window.__apollo!.hasNaN())).toBe(false);

  // Every separation resolved, in order, by the end.
  const end = await dumpNodes(page);
  for (const [name, expected] of Object.entries(FINAL_STATE)) {
    expect(end.find((n) => n.name === name)!.parent, name).toBe(expected.parent);
  }

  for (let i = steps; i >= 0; i -= 1) await scrollToProgress(page, i / steps);
  expect(await dumpNodes(page), 'the rocket is not whole on the pad again').toEqual(initial);
  expect(problems).toEqual([]);
});

// ── TC-P4-12 ─────────────────────────────────────────────────────────────

/**
 * Fraction of pixels that differ noticeably between two PNG screenshots.
 *
 * Decoded in the page with canvases: an image library in the test process
 * (sharp) trips a module-loading fault in Playwright's runner, and the browser
 * already has a PNG decoder.
 */
async function pixelDiff(page: Page, a: Buffer, b: Buffer): Promise<number> {
  return page.evaluate(
    async ([pa, pb]) => {
      const load = async (b64: string): Promise<ImageData> => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, c.width, c.height);
      };
      const [da, db] = await Promise.all([load(pa!), load(pb!)]);
      let differ = 0;
      for (let i = 0; i < da.data.length; i += 4) {
        let d = 0;
        for (let c = 0; c < 3; c += 1) d = Math.max(d, Math.abs(da.data[i + c]! - db.data[i + c]!));
        if (d > 24) differ += 1;
      }
      return differ / (da.data.length / 4);
    },
    [a.toString('base64'), b.toString('base64')],
  );
}

test('TC-P4-12 twenty random positions: slider jumps and continuous scroll agree', async ({ page }) => {
  test.setTimeout(420_000);
  await bootPage(page);
  await hideDebugChrome(page);

  // Seeded, so a failure reproduces.
  let seed = 1969;
  const random = (): number => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const targets = Array.from({ length: 20 }, () => Math.round(random() * 1000) / 1000);

  const recorded = new Map<number, { dump: SceneDump['nodes']; shot: Buffer }>();
  for (const t of targets) {
    await setSlider(page, t);
    recorded.set(t, {
      dump: await dumpNodes(page),
      shot: await page.screenshot({ animations: 'disabled' }),
    });
  }

  for (const t of [...targets].sort((a, b) => a - b)) {
    await scrollToProgress(page, 0);
    for (let p = 0; p < t; p += 0.1) await scrollToProgress(page, p);
    await scrollToProgress(page, t);
    const ref = recorded.get(t)!;
    expect(await dumpNodes(page), `scene at ${t} depends on the path taken`).toEqual(ref.dump);
    const diff = await pixelDiff(page, ref.shot, await page.screenshot({ animations: 'disabled' }));
    expect(diff, `frame at ${t} differs by ${(diff * 100).toFixed(2)}%`).toBeLessThan(0.005);
  }
});

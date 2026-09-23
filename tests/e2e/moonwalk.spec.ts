import { expect, test, type Page } from '@playwright/test';
import { FOOTPRINTS, PLACEMENTS } from '../../src/data/moonwalk';
import { MET, bootPage, collectConsoleProblems, dumpNodes, partNode, scrollToMet } from './helpers';
import type { SceneDump } from '../../src/types';

/**
 * Phase 3 — chapter 8: the moonwalk.
 *
 * TC-P3-08 Surface camera and astronaut figure
 * TC-P3-09 Flag and experiments
 */

const PROPS = ['flag', 'PSEP', 'LRRR'] as const;
const CAST = ['astronaut-CDR', 'astronaut-LMP', ...PROPS] as const;

type Node = SceneDump['nodes'][number];

async function nodes(page: Page): Promise<Node[]> {
  return dumpNodes(page);
}

async function footprints(page: Page): Promise<number> {
  return page.evaluate(() => window.__apollo!.getSurface().footprints);
}

// ── TC-P3-08 ─────────────────────────────────────────────────────────────

test('TC-P3-08 the camera comes down to eye level for the first step', async ({ page }) => {
  await bootPage(page);

  await scrollToMet(page, MET.firstStep);
  const all = await nodes(page);
  const camera = all.find((n) => n.name === 'camera')!;
  const ground = all.find((n) => n.name === 'lunar-surface')!;
  const height = camera.pos[1]! - ground.pos[1]!;
  expect(height).toBeGreaterThan(0.5);
  expect(height).toBeLessThan(3);
});

test('TC-P3-08 Armstrong comes down the ladder and steps onto the surface', async ({ page }) => {
  await bootPage(page);
  const ground = async (): Promise<number> => (await partNode(page, 'lunar-surface')).pos[1]!;

  // Still inside before the hatch opens.
  await scrollToMet(page, MET.hatchOpen - 60);
  expect((await partNode(page, 'astronaut-CDR')).visible).toBe(false);

  // On the ladder: above the ground, beside the forward leg.
  await scrollToMet(page, MET.firstStep - 240);
  const onLadder = await partNode(page, 'astronaut-CDR');
  expect(onLadder.visible).toBe(true);
  expect(onLadder.pos[1]! - (await ground())).toBeGreaterThan(0.3);

  // First step: boots on the regolith, and the first footprint is down.
  await scrollToMet(page, MET.firstStep + 1);
  const stepped = await partNode(page, 'astronaut-CDR');
  expect(Math.abs(stepped.pos[1]! - (await ground()))).toBeLessThan(0.1);
  expect(await footprints(page)).toBeGreaterThan(0);

  // No prints before it.
  await scrollToMet(page, MET.firstStep - 1);
  expect(await footprints(page)).toBe(0);
});

test('TC-P3-08 figure scale is right against the LM', async ({ page }) => {
  await bootPage(page);
  await scrollToMet(page, MET.aldrinOut + 120);

  const cdr = await page.evaluate(() => window.__apollo!.getPartBounds('astronaut-CDR'));
  const lm = await page.evaluate(() => window.__apollo!.getPartBounds('LM'));
  expect(cdr && lm).toBeTruthy();
  // A suited astronaut, life-support pack included, stood about 1.9 m; the LM
  // about 7 m to the top of its tunnel, legs deployed.
  expect(cdr!.height).toBeGreaterThan(1.7);
  expect(cdr!.height).toBeLessThan(2.1);
  const ratio = lm!.height / cdr!.height;
  expect(ratio).toBeGreaterThan(3);
  expect(ratio).toBeLessThan(4.2);
});

test('TC-P3-08 footprints only ever accumulate forward, and un-happen in reverse', async ({ page }) => {
  await bootPage(page);

  const mets = [MET.firstStep + 60, MET.aldrinOut + 300, MET.flag + 200, MET.lrrr + 600];
  const counts: number[] = [];
  for (const met of mets) {
    await scrollToMet(page, met);
    counts.push(await footprints(page));
  }
  for (let i = 1; i < counts.length; i += 1) expect(counts[i]).toBeGreaterThan(counts[i - 1]!);

  // Reverse: exactly the same counts, not more — prints are a count, never a
  // pile, so scrubbing cannot leave extras behind.
  for (let i = mets.length - 1; i >= 0; i -= 1) {
    await scrollToMet(page, mets[i]!);
    expect(await footprints(page)).toBe(counts[i]);
  }
  expect(counts[counts.length - 1]).toBeLessThanOrEqual(FOOTPRINTS.length);
});

// ── TC-P3-09 ─────────────────────────────────────────────────────────────

test('TC-P3-09 flag, seismometer and reflector are placed in that order', async ({ page }) => {
  await bootPage(page);

  const order = [...PROPS].sort((a, b) => PLACEMENTS[a].met - PLACEMENTS[b].met);
  expect(order).toEqual(['flag', 'PSEP', 'LRRR']);

  const visibleAt = async (met: number): Promise<string[]> => {
    await scrollToMet(page, met);
    const all = await nodes(page);
    return PROPS.filter((p) => all.find((n) => n.name === p)?.visible);
  };

  const checkpoints: [number, string[]][] = [
    [MET.flag - 120, []],
    [MET.flag + 30, ['flag']],
    [MET.psep + 30, ['flag', 'PSEP']],
    [MET.lrrr + 30, ['flag', 'PSEP', 'LRRR']],
  ];

  // Forward, then the same checkpoints in reverse: they come off in reverse
  // order and nothing is left behind.
  for (const [met, expected] of checkpoints) {
    expect(await visibleAt(met), `forward at MET ${met}`).toEqual(expected);
  }
  for (const [met, expected] of [...checkpoints].reverse()) {
    expect(await visibleAt(met), `reverse at MET ${met}`).toEqual(expected);
  }
});

test('TC-P3-09 every cast member exists exactly once, whatever the route', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await bootPage(page);

  for (const met of [MET.flag + 60, MET.hatchOpen, MET.lrrr + 60, MET.firstStep, MET.hatchClose]) {
    await scrollToMet(page, met);
    const names = (await nodes(page)).map((n) => n.name);
    for (const member of CAST) {
      expect(names.filter((n) => n === member), `${member} at MET ${met}`).toHaveLength(1);
    }
  }
  expect(problems).toEqual([]);
});

test('TC-P3-09 the flag does not wave', async ({ page }) => {
  await bootPage(page);

  // Two moments well apart after planting: the flag's transform is identical.
  await scrollToMet(page, MET.flag + 60);
  const a = await partNode(page, 'flag');
  await scrollToMet(page, MET.lrrr);
  const b = await partNode(page, 'flag');
  expect(b.pos).toEqual(a.pos);
  expect(b.quat).toEqual(a.quat);
});

test('TC-P3-09 placed items sit on the ground once set down', async ({ page }) => {
  await bootPage(page);
  await scrollToMet(page, MET.hatchClose - 60);

  const ground = (await partNode(page, 'lunar-surface')).pos[1]!;
  for (const p of PROPS) {
    const node = await partNode(page, p);
    expect(node.visible, `${p} should still be there`).toBe(true);
    expect(Math.abs(node.pos[1]! - ground), `${p} is off the ground`).toBeLessThan(0.01);
  }
});

test('TC-P3-08 both astronauts are back inside when the hatch closes', async ({ page }) => {
  await bootPage(page);
  await scrollToMet(page, MET.hatchClose);
  expect((await partNode(page, 'astronaut-CDR')).visible).toBe(false);
  expect((await partNode(page, 'astronaut-LMP')).visible).toBe(false);
  // ...and what they left behind is still out there.
  expect((await partNode(page, 'flag')).visible).toBe(true);
});

import { expect, test } from '@playwright/test';
import { STAGE_NAMES, bootPage, dumpNodes, getPartBounds, scrollToMet, MET } from './helpers';

/**
 * TC-P1-01 — Stack is built as named groups
 * TC-P1-02 — Stack proportions
 * TC-P1-03 — Liftoff from the pad
 */

/**
 * Real Saturn V stage heights, metres — the distance from one stage's base
 * station to the next. TC-P1-02 allows 10%.
 *
 * Measured by station rather than by bounding box on purpose: engine bells
 * legitimately hang down into the stage below (the J-2s sit inside the
 * interstage), so a bbox is not the stage height. The station spacing is.
 */
const REFERENCE_HEIGHTS: Record<string, number> = {
  'S-IC': 42.1,
  interstage: 5.5,
  'S-II': 19.3,
  'S-IVB': 17.8,
  IU: 0.9,
  SLA: 8.5,
  SM: 4.6,
  CM: 3.5,
};

/** Stack order for station maths. The LM rides inside the SLA, so it is out. */
const IN_LINE = ['S-IC', 'interstage', 'S-II', 'S-IVB', 'IU', 'SLA', 'SM', 'CM', 'LES'] as const;

test('TC-P1-01 the stack contains exactly the ten named parts', async ({ page }) => {
  await bootPage(page);
  const nodes = await dumpNodes(page);
  const names = nodes.map((n) => n.name);

  for (const stage of STAGE_NAMES) {
    expect(names, `missing part '${stage}'`).toContain(stage);
    expect(
      names.filter((n) => n === stage).length,
      `duplicate part '${stage}'`,
    ).toBe(1);
  }
});

test('TC-P1-01 every part hangs off the named stack Group', async ({ page }) => {
  await bootPage(page);
  const nodes = await dumpNodes(page);

  for (const stage of STAGE_NAMES) {
    const node = nodes.find((n) => n.name === stage)!;
    expect(node.parent, `'${stage}' should start attached to the stack`).toBe('stack');
  }
});

test('TC-P1-01 no part reports an unnamed ancestor', async ({ page }) => {
  await bootPage(page);
  const nodes = await dumpNodes(page);

  // '(UNNAMED)' is the dump's explicit error value. An unnamed Group in the
  // chain would otherwise make a re-parent assertion pass when it should fail.
  for (const node of nodes) {
    expect(node.parent, `'${node.name}' has an unnamed parent`).not.toBe('(UNNAMED)');
  }
});

test('TC-P1-02 stage heights are within 10% of the real vehicle', async ({ page }) => {
  await bootPage(page);

  // At rest each part sits at its station, so its world Y is the station base.
  const nodes = await dumpNodes(page);
  const stationOf = (name: string): number => {
    const node = nodes.find((n) => n.name === name);
    if (!node) throw new Error(`'${name}' not in dump`);
    return node.pos[1]!;
  };

  for (let i = 0; i < IN_LINE.length - 1; i += 1) {
    const name = IN_LINE[i]!;
    const expected = REFERENCE_HEIGHTS[name];
    if (expected === undefined) continue;
    const measured = stationOf(IN_LINE[i + 1]!) - stationOf(name);
    const ratio = measured / expected;
    expect(ratio, `'${name}' measures ${measured}m, reference ${expected}m`).toBeGreaterThan(0.9);
    expect(ratio, `'${name}' measures ${measured}m, reference ${expected}m`).toBeLessThan(1.1);
  }
});

test('TC-P1-02 the assembled stack is about 110.6 m tall', async ({ page }) => {
  await bootPage(page);

  const base = await getPartBounds(page, 'S-IC');
  const top = await getPartBounds(page, 'LES');
  const height = top!.max[1]! - base!.min[1]!;

  expect(height).toBeGreaterThan(110.6 * 0.95);
  expect(height).toBeLessThan(110.6 * 1.05);
});

test('TC-P1-02 parts stack in order with no gaps or overlaps', async ({ page }) => {
  await bootPage(page);
  const nodes = await dumpNodes(page);

  let previous = -Infinity;
  for (const name of IN_LINE) {
    const station = nodes.find((n) => n.name === name)!.pos[1]!;
    expect(station, `'${name}' is out of stack order`).toBeGreaterThan(previous);
    previous = station;
  }

  // The base of the vehicle is the engine bell exit plane.
  expect(nodes.find((n) => n.name === 'S-IC')!.pos[1]).toBeCloseTo(0, 3);
});

test('TC-P1-03 the pad falls away as the vehicle climbs', async ({ page }) => {
  await bootPage(page);

  // The vehicle holds the origin; ascent is the world moving past it.
  await scrollToMet(page, MET.ignition);
  const onPad = (await dumpNodes(page)).find((n) => n.name === 'pad')!;
  expect(onPad.pos[1]).toBeCloseTo(0, 1);

  const samples: number[] = [];
  for (const met of [0, 20, 60, 100, 150]) {
    await scrollToMet(page, met);
    const pad = (await dumpNodes(page)).find((n) => n.name === 'pad')!;
    samples.push(pad.pos[1]!);
  }

  // Monotonic descent, and it actually goes somewhere.
  for (let i = 1; i < samples.length; i += 1) {
    expect(samples[i]!).toBeLessThan(samples[i - 1]!);
  }
  expect(samples[samples.length - 1]!).toBeLessThan(-1000);
});

test('TC-P1-03 the vehicle itself never leaves the origin', async ({ page }) => {
  await bootPage(page);

  // If the stack drifted in world space the separations would have to chase it;
  // holding the origin is what makes the handovers exact.
  for (const met of [MET.ignition, 0, 60, 150]) {
    await scrollToMet(page, met);
    const sic = (await dumpNodes(page)).find((n) => n.name === 'S-IC')!;
    expect(Math.abs(sic.pos[1]!), `S-IC moved at MET ${met}`).toBeLessThan(0.01);
  }
});

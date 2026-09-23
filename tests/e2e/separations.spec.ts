import { expect, test } from '@playwright/test';
import {
  MET,
  SEPS,
  bootPage,
  collectConsoleProblems,
  dumpNodes,
  getEffects,
  isInView,
  parentOf,
  progressAtMet,
  scrollToMet,
  scrollToProgress,
  DETACHED,
} from './helpers';

/**
 * TC-P1-05 — Separation function is reusable
 * TC-P1-06…09 — SEP-1 to SEP-4
 * TC-P1-08 — the LES takes the boost cover with it
 *
 * This is procedure RP-1 from testcase.md, run per event: correct parent before
 * and after, reverse restores, repeated scrubbing stays stable, console clean.
 */

const BEFORE = 4;
const AFTER = 4;

for (const sep of SEPS) {
  test(`${sep.id} — ${sep.part} is attached before and detached after`, async ({ page }) => {
    await bootPage(page);

    await scrollToMet(page, sep.met - sep.dwell / 2 - BEFORE);
    expect(await parentOf(page, sep.part), `${sep.part} before the event`).toBe(sep.from);

    await scrollToMet(page, sep.met + sep.dwell / 2 + AFTER);
    expect(await parentOf(page, sep.part), `${sep.part} after the event`).toBe(sep.to);
  });

  test(`${sep.id} — reverse restores ${sep.part} to the stack`, async ({ page }) => {
    await bootPage(page);

    await scrollToMet(page, sep.met - sep.dwell / 2 - BEFORE);
    const before = await dumpNodes(page);

    await scrollToMet(page, sep.met + sep.dwell / 2 + AFTER);
    await scrollToMet(page, sep.met - sep.dwell / 2 - BEFORE);

    expect(await parentOf(page, sep.part)).toBe(sep.from);
    expect(await dumpNodes(page)).toEqual(before);
  });

  test(`${sep.id} — scrubbing the boundary five times is stable`, async ({ page }) => {
    const problems = collectConsoleProblems(page);
    await bootPage(page);

    const beforeP = await progressAtMet(page, sep.met - sep.dwell / 2 - BEFORE);
    const afterP = await progressAtMet(page, sep.met + sep.dwell / 2 + AFTER);

    await scrollToProgress(page, beforeP);
    const reference = await dumpNodes(page);

    for (let i = 0; i < 5; i += 1) {
      await scrollToProgress(page, afterP);
      await scrollToProgress(page, beforeP);
    }

    expect(await dumpNodes(page)).toEqual(reference);
    expect(problems).toEqual([]);
  });

  test(`${sep.id} — ${sep.visible} stays in shot through the sequence`, async ({ page }) => {
    await bootPage(page);

    // TC-P1-14: the separating part must remain visible for the whole four-beat
    // sequence, not slide out of frame the moment it lets go.
    for (const f of [0.1, 0.35, 0.6, 0.85, 1.0]) {
      const met = sep.met - sep.dwell / 2 + sep.dwell * f;
      await scrollToMet(page, met);
      expect(
        await isInView(page, sep.visible),
        `${sep.visible} left frame at ${f} of the window`,
      ).toBe(true);
    }
  });
}

test('TC-P1-08 the LES takes the boost cover with it as one unit', async ({ page }) => {
  await bootPage(page);

  const sep = SEPS[2]!;

  await scrollToMet(page, sep.met - 6);
  expect(await parentOf(page, 'boost-cover')).toBe('LES');

  await scrollToMet(page, sep.met + 6);
  // The tower has gone to the scene root; the cover went with it, still parented
  // to the tower rather than stranded on the Command Module.
  expect(await parentOf(page, 'LES')).toBe(DETACHED);
  expect(await parentOf(page, 'boost-cover')).toBe('LES');

  await scrollToMet(page, sep.met - 6);
  expect(await parentOf(page, 'LES')).toBe('stack');
  expect(await parentOf(page, 'boost-cover')).toBe('LES');
});

test('TC-P1-06 SEP-1 fades the F-1s, then lights the J-2s', async ({ page }) => {
  await bootPage(page);

  await scrollToMet(page, MET.sepSIC - 8);
  const before = await getEffects(page);
  expect(before.exhaustF1, 'F-1s should still be burning').toBeGreaterThan(0.9);
  expect(before.exhaustJ2, 'J-2s should not have lit yet').toBeLessThan(0.05);

  await scrollToMet(page, MET.sepSIC + 8);
  const after = await getEffects(page);
  expect(after.exhaustF1, 'F-1s should be out').toBeLessThan(0.05);
  expect(after.exhaustJ2, 'J-2s should be burning').toBeGreaterThan(0.9);
});

test('TC-P1-09 SEP-4 hands over from the J-2 cluster to the single J-2', async ({ page }) => {
  await bootPage(page);

  await scrollToMet(page, MET.sepSII - 10);
  const before = await getEffects(page);
  expect(before.exhaustJ2).toBeGreaterThan(0.9);
  expect(before.exhaustJ2Single).toBeLessThan(0.05);

  await scrollToMet(page, MET.sepSII + 10);
  const after = await getEffects(page);
  expect(after.exhaustJ2).toBeLessThan(0.05);
  expect(after.exhaustJ2Single).toBeGreaterThan(0.9);
});

test('the four beats play in order at every separation', async ({ page }) => {
  await bootPage(page);

  for (const sep of SEPS) {
    // Beat 2 is the flash. It should peak inside the window and be gone by the
    // end of it — a flash still burning at the end means the beats have slipped.
    const at = async (f: number): Promise<number> => {
      await scrollToMet(page, sep.met - sep.dwell / 2 + sep.dwell * f);
      return (await getEffects(page)).flash!;
    };

    expect(await at(0.02), `${sep.id}: flash before beat 2`).toBeLessThan(0.1);
    // Relative to the declared peak: undocking (SEP-8) is a glint by design.
    expect(await at(0.32), `${sep.id}: flash should peak at beat 2`).toBeGreaterThan(
      0.6 * sep.flashPeak,
    );
    expect(await at(0.9), `${sep.id}: flash should be out by beat 4`).toBeLessThan(0.1);
  }
});

test('TC-P1-05 all four separations produce the same shape of sequence', async ({ page }) => {
  await bootPage(page);

  // Every event runs through buildSeparation(), so every one of them must show
  // the same signature: attached before, flash at beat 2, detached after. If a
  // fifth row were added to data/separations.ts it would satisfy this too.
  for (const sep of SEPS) {
    await scrollToMet(page, sep.met - sep.dwell / 2 - 2);
    expect(await parentOf(page, sep.part), `${sep.id} pre-state`).toBe(sep.from);

    await scrollToMet(page, sep.met - sep.dwell / 2 + sep.dwell * 0.32);
    expect((await getEffects(page)).flash, `${sep.id} flash`).toBeGreaterThan(0.6 * sep.flashPeak);

    await scrollToMet(page, sep.met + sep.dwell / 2 + 2);
    expect(await parentOf(page, sep.part), `${sep.id} post-state`).toBe(sep.to);
  }
});

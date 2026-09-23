import { expect, test } from '@playwright/test';
import {
  FINAL_STATE,
  SEPS,
  bootPage,
  collectConsoleProblems,
  dumpNodes,
  progressAtMet,
  scrollToProgress,
  settle,
  DETACHED,
} from './helpers';

/**
 * TC-P1-10 — Separation order under fast scroll
 * TC-P1-11 — Stopping mid-separation
 */

async function flickTo(page: import('@playwright/test').Page, p: number): Promise<void> {
  // Deliberately no settle: this is the flick, not a controlled scroll.
  await page.evaluate((v) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: v * max, behavior: 'auto' });
  }, p);
}

test('TC-P1-10 flick-scrolling the whole range resolves every separation', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await bootPage(page);

  const slow = await (async () => {
    for (let i = 0; i <= 10; i += 1) await scrollToProgress(page, i / 10);
    return dumpNodes(page);
  })();

  for (let i = 0; i < 5; i += 1) {
    await flickTo(page, 0);
    await flickTo(page, 1);
  }
  await settle(page);

  // Arriving at 1 in a single flick must give the same scene as walking there.
  expect(await dumpNodes(page)).toEqual(slow);
  expect(problems).toEqual([]);
});

test('TC-P1-10 flick-scrolling backwards restores the stack', async ({ page }) => {
  await bootPage(page);
  const initial = await dumpNodes(page);

  for (let i = 0; i < 5; i += 1) {
    await flickTo(page, 1);
    await flickTo(page, 0);
  }
  await settle(page);

  expect(await dumpNodes(page)).toEqual(initial);
});

test('TC-P1-10 no part is left attached that should be gone', async ({ page }) => {
  await bootPage(page);

  // Jump straight past every separation in one movement.
  await flickTo(page, 1);
  await settle(page);

  const nodes = await dumpNodes(page);
  for (const [part, { parent }] of Object.entries(FINAL_STATE)) {
    expect(
      nodes.find((n) => n.name === part)?.parent,
      `${part} did not reach its destination after a flick to the end`,
    ).toBe(parent);
  }

  // ...and what is left at the end of the mission: one capsule, afloat.
  expect(nodes.find((n) => n.name === 'CM')?.parent).toBe('CM-flight');
  expect(nodes.find((n) => n.name === 'LM')?.parent, 'the descent stage stays on the Moon').toBe(
    'surface-site',
  );
});

test('TC-P1-11 holding inside beat 2 freezes a coherent frame', async ({ page }) => {
  await bootPage(page);

  for (const sep of SEPS) {
    // Beat 2 is the flash, at 0.32 of the window.
    const inFlash = await progressAtMet(page, sep.met - sep.dwell / 2 + sep.dwell * 0.32);
    await scrollToProgress(page, inFlash);

    const held = await dumpNodes(page);
    await page.waitForTimeout(1000); // ~60 frames of idle
    expect(await dumpNodes(page), `${sep.id} drifted while scroll was idle`).toEqual(held);
  }
});

test('TC-P1-11 resuming forward or backward from mid-separation both work', async ({ page }) => {
  await bootPage(page);
  const sep = SEPS[0]!;

  const before = await progressAtMet(page, sep.met - sep.dwell / 2 - 3);
  const inFlash = await progressAtMet(page, sep.met - sep.dwell / 2 + sep.dwell * 0.32);
  const after = await progressAtMet(page, sep.met + sep.dwell / 2 + 3);

  await scrollToProgress(page, before);
  const reference = await dumpNodes(page);

  // Stop in the flash, then continue forward.
  await scrollToProgress(page, inFlash);
  await page.waitForTimeout(400);
  await scrollToProgress(page, after);
  expect((await dumpNodes(page)).find((n) => n.name === sep.part)?.parent).toBe(DETACHED);

  // Stop in the flash again, then reverse out of it.
  await scrollToProgress(page, inFlash);
  await page.waitForTimeout(400);
  await scrollToProgress(page, before);
  expect(await dumpNodes(page)).toEqual(reference);
});

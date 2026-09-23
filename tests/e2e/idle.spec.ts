import { expect, test } from '@playwright/test';
import { MET, SEPS, bootPage, dumpNodes, getEffects, scrollToMet } from './helpers';

/**
 * TC-P1-16 — No physics drift when idle
 *
 * Everything the timeline drives is a pure function of progress, so an idle
 * scroll position should render an identical frame indefinitely. Effects are
 * progress-driven too, which is why they are included here — a time-based
 * plume would show up as a failure.
 */

const HOLD_MS = 1000;

test('TC-P1-16 nothing moves while scroll is idle', async ({ page }) => {
  await bootPage(page);

  const positions = [
    MET.ignition,
    MET.liftoff + 30,
    MET.sepSIC + 6, // just after a separation
    MET.sepLES,
    MET.orbitInsertion - 40,
    // Phase 3: Eagle mid-pirouette, mid-descent, dust streaming, and the
    // astronauts mid-stride — the positions most likely to hide a clock.
    MET.sepUndock + 4,
    MET.highGate,
    MET.touchdown - 5,
    MET.firstStep + 90,
    MET.flag - 30,
    // Phase 4: climbing off the Moon, mid-rendezvous, in the plasma, under the
    // mains, and afloat — where a bob or a sway could hide a clock.
    MET.ascentLiftoff + 40,
    MET.tpi + 1800,
    MET.peakHeating,
    MET.mains + 60,
    MET.missionEnd - 30,
  ];

  for (const met of positions) {
    await scrollToMet(page, met);
    const before = await dumpNodes(page);
    const effectsBefore = await getEffects(page);

    await page.waitForTimeout(HOLD_MS);

    expect(await dumpNodes(page), `scene drifted while idle at MET ${met}`).toEqual(before);
    expect(await getEffects(page), `effects drifted while idle at MET ${met}`).toEqual(
      effectsBefore,
    );
  }
});

test('TC-P1-16 a spent stage does not keep falling while scroll is idle', async ({ page }) => {
  await bootPage(page);

  const sep = SEPS[0]!;
  await scrollToMet(page, sep.met + 2);

  const first = (await dumpNodes(page)).find((n) => n.name === sep.part)!;
  await page.waitForTimeout(HOLD_MS);
  const second = (await dumpNodes(page)).find((n) => n.name === sep.part)!;

  expect(second.pos).toEqual(first.pos);
  expect(second.quat).toEqual(first.quat);
});

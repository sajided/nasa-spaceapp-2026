import type { ConsoleMessage, Page } from '@playwright/test';
import { MET as MISSION_MET } from '../../src/data/mission';
import { SEPARATIONS } from '../../src/data/separations';
import { STAGE_NAMES as VEHICLE_STAGE_NAMES } from '../../src/data/vehicle';
import type { ApolloDebugAPI, SceneDump } from '../../src/types';

/**
 * Every test loads with the debug API explicitly enabled.
 *
 * The mission specs run against classic mode (`story=0`): the replay exactly
 * as Phases 0–4 built it, without story mode's prologue, epilogue and
 * children's layer. Story mode has its own specs (story.spec.ts and friends),
 * which use STORY_URL.
 */
export const PAGE_URL = '/?debug=1&story=0';
export const STORY_URL = '/?debug=1';

declare global {
  interface Window {
    __apollo?: ApolloDebugAPI;
  }
}

/** Waits for boot and for the debug API to be installed. */
export async function bootPage(page: Page, url: string = PAGE_URL): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => document.body.dataset.ready === 'true');
  await page.waitForFunction(() => Boolean(window.__apollo));
  // Let the first frames settle so fps and draw-call stats are populated.
  await page.waitForTimeout(250);
}

/**
 * Collects console errors and page exceptions for the lifetime of the test.
 * Several Phase 0 cases assert the console stays clean, so this is shared.
 */
export function collectConsoleProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      problems.push(`${msg.type()}: ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  return problems;
}

/** Scrolls to a 0..1 position using real scroll, then waits for it to render. */
export async function scrollToProgress(page: Page, progress: number): Promise<void> {
  await page.evaluate((p) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: p * max, behavior: 'auto' });
  }, progress);
  await settle(page);
}

/**
 * Drives the debug slider as a user would, rather than calling the API.
 * TC-P0-05 is about the control agreeing with scroll, so the test has to
 * actually operate the control.
 */
export async function setSlider(page: Page, progress: number): Promise<void> {
  await page.evaluate((p) => {
    const slider = document.querySelector<HTMLInputElement>('#debug-progress');
    if (!slider) throw new Error('debug slider not found');
    slider.value = String(p);
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
  }, progress);
  await settle(page);
}

/**
 * Waits until the scroll observer and the render loop have both caught up.
 * The observer applies on its next scroll frame and the reconciler on the one
 * after, so a fixed handful of frames plus a short settle is enough.
 */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let n = 6;
        const step = (): void => {
          n -= 1;
          if (n <= 0) resolve();
          else requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }),
  );
}

export async function getProgress(page: Page): Promise<number> {
  return page.evaluate(() => window.__apollo!.getProgress());
}

export async function getScrollProgress(page: Page): Promise<number> {
  return page.evaluate(() => window.__apollo!.getScrollProgress());
}

export async function dumpState(page: Page): Promise<SceneDump> {
  return page.evaluate(() => window.__apollo!.dumpState());
}

/** A dump with the progress field stripped, for comparing scene state alone. */
export async function dumpNodes(page: Page): Promise<SceneDump['nodes']> {
  return page.evaluate(() => window.__apollo!.dumpState().nodes);
}

// ── Phase 1 additions ────────────────────────────────────────────────────

/**
 * Mission data, imported from the source rather than mirrored.
 *
 * These used to be hand-copied literals with a comment saying they mirrored
 * `src/data/`. Nothing checked the copy, so the first divergence would surface
 * as an unrelated assertion failing in some other spec. Importing the real
 * modules means the specs cannot drift from the mission they are testing.
 */
export const STAGE_NAMES = VEHICLE_STAGE_NAMES;

/**
 * What the dump reports for a part that has left the stack.
 *
 * Jettisoned pieces go to the vehicle frame rather than the scene root, so a
 * wide shot hides the whole metre-scale scene in one move (core/frames.ts).
 * Named here so the specs say what they mean rather than repeating a literal.
 */
export const DETACHED = 'vehicle-frame';

/** What the dump reports for a part still on the launch vehicle. */
export const ON_STACK = 'stack';

export const MET = MISSION_MET;

/**
 * The parent of each attachment, by part and index, as the scene builders
 * register them. Most parts have two homes — on the stack and adrift — so that
 * is the default; the rest are spelled out. The table is checked against the
 * running page by `helpers-consistency` in return.spec.ts, so it cannot drift.
 */
export const ATTACHMENT_PARENTS: Record<string, readonly string[]> = {
  'SLA-panel-1': ['SLA', DETACHED],
  'SLA-panel-2': ['SLA', DETACHED],
  'SLA-panel-3': ['SLA', DETACHED],
  'SLA-panel-4': ['SLA', DETACHED],
  CSM: [ON_STACK, DETACHED],
  SM: [ON_STACK, DETACHED, 'CSM', DETACHED],
  CM: [ON_STACK, DETACHED, 'CSM', 'CM-flight'],
  LM: [ON_STACK, DETACHED, 'CSM', 'LM-flight', 'surface-site'],
  'LM-ascent-stage': ['LM-descent-stage', 'LM-flight', 'CSM', DETACHED],
  'apex-cover': ['CM', DETACHED],
};

const parentsOf = (part: string): readonly string[] => ATTACHMENT_PARENTS[part] ?? [ON_STACK, DETACHED];

/**
 * Each separation, with the parent its part starts under and the one it ends
 * under, looked up from the attachment table rather than assumed: parts leave
 * the stack, the SLA, the CSM, the descent stage and the CM.
 */
export const SEPS = SEPARATIONS.map((s) => ({
  id: s.id,
  part: s.part,
  met: s.met,
  dwell: s.dwellSeconds,
  from: parentsOf(s.part)[s.attachFrom ?? 0]!,
  to: parentsOf(s.part)[s.attachTo ?? 1]!,
  /** Where the part lives at boot — not always `from`: some separate twice. */
  home: parentsOf(s.part)[0]!,
  /** Declared flash peak. Undocking is a glint, not a pyrotechnic bang. */
  flashPeak: s.flashPeak ?? 1,
  /**
   * The part to look for on screen during the event.
   *
   * Usually the separating part itself — but the CSM Group is empty until the
   * modules move into it at the handover, so before that the thing you can
   * actually see is the Service Module.
   */
  visible: s.carries?.[0] ?? s.part,
}));

/**
 * TC-P4-09: where everything is once the capsule is afloat, and what role it
 * ends in. Exactly one entry is `active` — the Command Module.
 *
 *   active     still part of the vehicle that is flying (or floating)
 *   discarded  cast off and gone: hidden, in the vehicle frame
 *   moon       left at Tranquility Base
 *   container  a frame or group that held other parts, now empty or inert
 */
export type FinalRole = 'active' | 'discarded' | 'moon' | 'container';

export const FINAL_STATE: Record<string, { parent: string; visible: boolean; role: FinalRole }> = {
  'S-IC': { parent: DETACHED, visible: false, role: 'discarded' },
  interstage: { parent: DETACHED, visible: false, role: 'discarded' },
  'S-II': { parent: DETACHED, visible: false, role: 'discarded' },
  'S-IVB': { parent: DETACHED, visible: false, role: 'discarded' },
  IU: { parent: ON_STACK, visible: false, role: 'discarded' },
  SLA: { parent: ON_STACK, visible: false, role: 'discarded' },
  'SLA-panel-1': { parent: DETACHED, visible: false, role: 'discarded' },
  'SLA-panel-2': { parent: DETACHED, visible: false, role: 'discarded' },
  'SLA-panel-3': { parent: DETACHED, visible: false, role: 'discarded' },
  'SLA-panel-4': { parent: DETACHED, visible: false, role: 'discarded' },
  LES: { parent: DETACHED, visible: false, role: 'discarded' },
  'boost-cover': { parent: 'LES', visible: false, role: 'discarded' },
  LM: { parent: 'surface-site', visible: true, role: 'moon' },
  'LM-ascent-stage': { parent: DETACHED, visible: false, role: 'discarded' },
  SM: { parent: DETACHED, visible: false, role: 'discarded' },
  CM: { parent: 'CM-flight', visible: true, role: 'active' },
  'apex-cover': { parent: DETACHED, visible: false, role: 'discarded' },
  'drogue-1': { parent: DETACHED, visible: false, role: 'discarded' },
  'drogue-2': { parent: DETACHED, visible: false, role: 'discarded' },
  'main-1': { parent: DETACHED, visible: false, role: 'discarded' },
  'main-2': { parent: DETACHED, visible: false, role: 'discarded' },
  'main-3': { parent: DETACHED, visible: false, role: 'discarded' },
  CSM: { parent: DETACHED, visible: true, role: 'container' },
};

export async function progressAtMet(page: Page, met: number): Promise<number> {
  return page.evaluate((m) => window.__apollo!.progressAtMet(m), met);
}

/** Scrolls to a mission time rather than a raw progress value. */
export async function scrollToMet(page: Page, met: number): Promise<void> {
  await scrollToProgress(page, await progressAtMet(page, met));
}

export async function getMet(page: Page): Promise<number> {
  return page.evaluate(() => window.__apollo!.getMet());
}

export async function partNode(page: Page, name: string): Promise<SceneDump['nodes'][number]> {
  const nodes = await dumpNodes(page);
  const found = nodes.find((n) => n.name === name);
  if (!found) throw new Error(`Part '${name}' not in dump. Have: ${nodes.map((n) => n.name)}`);
  return found;
}

export async function parentOf(page: Page, name: string): Promise<string> {
  return (await partNode(page, name)).parent;
}

export async function getPartBounds(
  page: Page,
  name: string,
): Promise<{ name: string; min: number[]; max: number[]; height: number } | null> {
  return page.evaluate((n) => window.__apollo!.getPartBounds(n), name);
}

export async function getEffects(page: Page): Promise<Record<string, number>> {
  return page.evaluate(() => window.__apollo!.getEffects() as unknown as Record<string, number>);
}

export async function separationWindow(page: Page): Promise<string | null> {
  return page.evaluate(() => window.__apollo!.getSeparationWindow());
}

export async function isInView(page: Page, name: string): Promise<boolean> {
  return page.evaluate((n) => window.__apollo!.isInView(n), name);
}

/** Hides the debug chrome so screenshot baselines capture the scene alone. */
export async function hideDebugChrome(page: Page): Promise<void> {
  await page.addStyleTag({ content: '#debug-panel { display: none !important; }' });
}

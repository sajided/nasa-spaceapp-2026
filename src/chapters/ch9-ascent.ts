import { buildSeparation } from '../core/separation';
import { CHAPTER_BOUNDARIES, MET } from '../data/mission';
import { separation } from '../data/separations';
import { CSM_COAST_Y } from '../data/vehicle';
import type { ChapterDef } from '../types';

/**
 * Chapter 9 — Ascent, rendezvous and docking.
 *
 * Eagle leaves the Moon the way it arrived, in reverse: the ascent stage holds
 * its place in the vehicle frame and the surface falls away beneath it, the
 * profile coming from data/lunarFlight.ts. What stays behind is the point of
 * the first beat — the descent stage becomes the launch pad and is left at
 * Tranquility Base, where it still is (TC-P4-01).
 *
 * Then the long chase: Columbia, hidden since it opened the distance in
 * chapter 7, comes back into shot and closes along a curve to dock nose-first
 * onto the ascent stage's tunnel, exactly as it docked with the whole LM on
 * the way out. The crew move across, and the ascent stage is cast off.
 */
export const ascent: ChapterDef = {
  id: 'ascent',
  weight: 5,
  build(ctx) {
    const { tl, parts, effects, msAt } = ctx;
    const between = (a: number, b: number): number => msAt(b) - msAt(a);
    const lm = parts.get('LM');
    const stage = parts.get('LM-ascent-stage');
    const csm = parts.get('CSM');
    const start = CHAPTER_BOUNDARIES.moonwalkToAscent;
    const end = CHAPTER_BOUNDARIES.ascentToReturn;

    ctx.cameraTo('ascentPad', msAt(start), between(start, MET.ascentLiftoff - 600));

    // ── SEP-9: liftoff from the Moon ──────────────────────────────────────
    const sep9 = separation('sep-9');
    buildSeparation(sep9, ctx);

    // The descent stage moves to the landing site at the same instant the
    // ascent stage leaves it — the handover crossing in core/separation.ts is
    // at a third of the window. From the site it stays behind on the surface.
    const handover9 = sep9.met - sep9.dwellSeconds / 2 + sep9.dwellSeconds * 0.33;
    tl.add(lm, { attachment: [3, 4], duration: 1, ease: 'linear' }, msAt(handover9));

    // The ascent engine burns to orbit, then shuts down.
    tl.add(
      effects,
      {
        exhaustAPS: [1, 0],
        duration: between(MET.ascentInsertion - 10, MET.ascentInsertion),
        ease: 'inQuad',
      },
      msAt(MET.ascentInsertion - 10),
    );

    // One look back down at what stays behind (TC-P4-01), then up with Eagle.
    const windowEnd9 = sep9.met + sep9.dwellSeconds / 2;
    ctx.cameraTo('lookBack', msAt(windowEnd9), between(windowEnd9, MET.ascentLiftoff + 14));
    ctx.cameraTo(
      'ascentClimb',
      msAt(MET.ascentLiftoff + 24),
      between(MET.ascentLiftoff + 24, MET.ascentLiftoff + 120),
    );
    ctx.cameraTo('ascentOrbit', msAt(MET.ascentLiftoff + 200), between(MET.ascentLiftoff + 200, MET.ascentInsertion));

    // ── Rendezvous ────────────────────────────────────────────────────────
    // Columbia returns from where chapter 7 left it: 760 m back and 420 m up.
    // x closes early and y late, so the path is a readable curve that ends
    // with a straight approach down the docking axis (TC-P4-02).
    tl.add(csm, { visible: [0, 1], duration: 1, ease: 'linear' }, msAt(MET.tpi));
    tl.add(
      csm,
      { x: [-760, 0], duration: between(MET.tpi, MET.redock - 300), ease: 'outSine' },
      msAt(MET.tpi),
    );
    tl.add(
      csm,
      {
        y: [CSM_COAST_Y + 420, CSM_COAST_Y],
        duration: between(MET.tpi, MET.redock),
        ease: 'inOutSine',
      },
      msAt(MET.tpi),
    );
    ctx.cameraTo('rendezvous', msAt(MET.tpi - 600), between(MET.tpi - 600, MET.tpi));
    ctx.cameraTo('redockApproach', msAt(MET.redock - 900), between(MET.redock - 900, MET.redock - 60));

    // Docked: the ascent stage moves into the CSM and they fly as one.
    tl.add(stage, { attachment: [1, 2], duration: 1, ease: 'linear' }, msAt(MET.redock));
    ctx.cameraTo('redocked', msAt(MET.redock + 60), between(MET.redock + 60, MET.redock + 600));

    // ── SEP-10: the ascent stage is cast off ──────────────────────────────
    const sep10 = separation('sep-10');
    buildSeparation(sep10, ctx);
    const gone = sep10.met + sep10.dwellSeconds / 2 + 600;
    tl.add(stage, { visible: [1, 0], duration: 1, ease: 'linear' }, msAt(gone));

    // Pull back until the spacecraft is a speck, ready for the switch to
    // system scale that opens chapter 10.
    ctx.cameraTo('lunarHandoff', msAt(end - 900), between(end - 900, end - 10));
  },
};

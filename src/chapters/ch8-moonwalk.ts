import { CHAPTER_BOUNDARIES, MET } from '../data/mission';
import type { ChapterDef } from '../types';

/**
 * Chapter 8 — The moonwalk.
 *
 * The camera comes down to eye level for the first time since the pad. Who is
 * where — the two astronauts, the flag, the experiments, every footprint — is
 * derived from mission time in data/moonwalk.ts, so this chapter is almost
 * entirely camera: it frames the ladder for the first step, pulls wide for
 * Aldrin, then visits the flag and the experiments in the order they were set
 * out, and ends on Eagle with the hatch closed behind them.
 */
export const moonwalk: ChapterDef = {
  id: 'moonwalk',
  weight: 5,
  build(ctx) {
    const { msAt } = ctx;
    const between = (a: number, b: number): number => msAt(b) - msAt(a);
    const start = CHAPTER_BOUNDARIES.descentToMoonwalk;
    const H = 3600;

    ctx.cameraTo('surfaceLadder', msAt(start), between(start, MET.hatchOpen + 60));
    ctx.cameraTo('surfaceWide', msAt(MET.firstStep + 120), between(MET.firstStep + 120, MET.aldrinOut - 60));
    ctx.cameraTo('surfaceFlag', msAt(110 * H + 1 * 60), between(110 * H + 1 * 60, MET.flag - 120));
    ctx.cameraTo('surfaceEASEP', msAt(110 * H + 40 * 60), between(110 * H + 40 * 60, MET.psep - 60));
    ctx.cameraTo('surfaceEnd', msAt(111 * H + 12 * 60), between(111 * H + 12 * 60, MET.aldrinIn));
  },
};

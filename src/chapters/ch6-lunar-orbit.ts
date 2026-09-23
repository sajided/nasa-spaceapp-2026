import { CHAPTER_BOUNDARIES, MET } from '../data/mission';
import type { ChapterDef } from '../types';

/**
 * Chapter 6 — Lunar orbit insertion.
 *
 * The braking burn happened behind the Moon, out of contact with Earth: for
 * the length of it nobody at Mission Control knew whether it had worked. The
 * chapter is shaped around that — the engine lights where it cannot be seen,
 * and what comes back is a closed orbit rather than a fly-by.
 */
export const lunarOrbit: ChapterDef = {
  id: 'lunar-orbit',
  weight: 5,
  build(ctx) {
    const { tl, effects, msAt } = ctx;
    const between = (a: number, b: number): number => msAt(b) - msAt(a);
    const start = CHAPTER_BOUNDARIES.coastToLunarOrbit;

    ctx.cameraTo('lunarOrbit', msAt(start), between(start, MET.loiIgnition - 60));

    // ── The braking burn ──────────────────────────────────────────────────
    tl.add(
      effects,
      {
        exhaustJ2Single: [0, 1],
        duration: between(MET.loiIgnition, MET.loiIgnition + 20),
        ease: 'outQuad',
      },
      msAt(MET.loiIgnition),
    );
    tl.add(
      effects,
      {
        exhaustJ2Single: [1, 0],
        duration: between(MET.loiCutoff - 20, MET.loiCutoff),
        ease: 'inQuad',
      },
      msAt(MET.loiCutoff - 20),
    );

    // The same burn as the system frame sees it: the marker's glow. The plume
    // above lives in the vehicle frame, which is hidden at this scale, so on
    // its own the braking burn was invisible (found in Phase 4).
    tl.add(
      effects,
      { spsBurn: [0, 1], duration: between(MET.loiIgnition, MET.loiIgnition + 20), ease: 'outQuad' },
      msAt(MET.loiIgnition),
    );
    tl.add(
      effects,
      { spsBurn: [1, 0], duration: between(MET.loiCutoff - 20, MET.loiCutoff), ease: 'inQuad' },
      msAt(MET.loiCutoff - 20),
    );
  },
};

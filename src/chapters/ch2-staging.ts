import { buildSeparation } from '../core/separation';
import { CHAPTER_BOUNDARIES, MET } from '../data/mission';
import { separation } from '../data/separations';
import type { ChapterDef } from '../types';

/**
 * Chapter 2 — Staging.
 *
 * T+2:42 to orbit. Four separations, all four built by the same function from
 * the rows in data/separations.ts — this chapter contains no animation code of
 * its own for them, which is the property TC-P1-05 checks.
 */
export const staging: ChapterDef = {
  id: 'staging',
  weight: 7,
  build(ctx) {
    const { tl, effects, msAt } = ctx;

    const between = (fromMet: number, toMet: number): number => msAt(toMet) - msAt(fromMet);

    // Named explicitly rather than iterating every spec: the separation table
    // now spans six chapters, and a chapter that builds an event belonging to
    // another one places it outside its own slot — which the `msAt` guard
    // rejects, but only after the fact.
    for (const id of ['sep-1', 'sep-2', 'sep-3', 'sep-4']) {
      buildSeparation(separation(id), ctx);
    }

    // The S-II burns for nearly six minutes between the escape tower going and
    // its own cutoff. Nothing dramatic happens; the camera drifts and the
    // engines hold steady.
    ctx.cameraTo('ascent', msAt(210), between(210, 330));
    ctx.cameraTo('sepSII', msAt(430), between(430, 520));

    // S-IVB burns on to orbital insertion after the last separation.
    tl.add(
      effects,
      {
        exhaustJ2Single: [1, 1],
        duration: between(MET.s4bIgnition, CHAPTER_BOUNDARIES.stagingToOrbit),
        ease: 'linear',
      },
      msAt(MET.s4bIgnition),
    );

    ctx.cameraTo('orbit', msAt(600), between(600, CHAPTER_BOUNDARIES.stagingToOrbit));
  },
};

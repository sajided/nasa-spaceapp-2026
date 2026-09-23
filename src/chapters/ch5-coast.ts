import { CHAPTER_BOUNDARIES, MET } from '../data/mission';
import type { ChapterDef } from '../types';

/**
 * Chapter 5 — The translunar coast.
 *
 * Seventy-one hours in which the spacecraft does almost nothing, compressed
 * into an eighth of the page — deliberately the shortest of the six chapters
 * despite covering the most time (TC-P2-09).
 *
 * The risk is that it reads as a loading screen, so it is anchored on three
 * things that actually happened rather than on a time-lapse: the passive
 * thermal control roll, the single midcourse correction Apollo 11 needed, and
 * the point where Earth has shrunk to something you could cover with a thumb.
 */
export const coast: ChapterDef = {
  id: 'coast',
  weight: 4,
  build(ctx) {
    const { tl, parts, effects, msAt } = ctx;
    const spacecraft = parts.get('spacecraft');
    const between = (a: number, b: number): number => msAt(b) - msAt(a);

    const start = CHAPTER_BOUNDARIES.dockingToCoast;
    const end = CHAPTER_BOUNDARIES.coastToLunarOrbit;

    // Back out to system scale, camera paired with the switch.
    tl.add(effects, { vehicleLod: [0, 1], duration: 1, ease: 'linear' }, msAt(start));
    ctx.cameraTo('coast', msAt(start), 1);

    // ── Beat 1: the passive thermal control roll ──────────────────────────
    // Two revolutions an hour, holding the sun off any one side. It is the
    // only motion in an otherwise still frame, which is rather the point.
    tl.add(
      spacecraft,
      { ry: [0, Math.PI * 8], duration: between(MET.thermalRoll, end), ease: 'linear' },
      msAt(MET.thermalRoll),
    );

    // ── Beat 2: the midcourse correction ──────────────────────────────────
    // Three seconds of burn in seventy-one hours — the only course change the
    // flight needed.
    tl.add(
      effects,
      {
        exhaustJ2Single: [0, 0.55],
        duration: between(MET.midcourseCorrection - 200, MET.midcourseCorrection),
        ease: 'outQuad',
      },
      msAt(MET.midcourseCorrection - 200),
    );
    tl.add(
      effects,
      {
        exhaustJ2Single: [0.55, 0],
        duration: between(MET.midcourseCorrection, MET.midcourseCorrection + 400),
        ease: 'inQuad',
      },
      msAt(MET.midcourseCorrection),
    );

    // ── Beat 3: Earth as a thumbnail, the Moon ahead ──────────────────────
    ctx.cameraTo('coast', msAt(start + 600), between(start + 600, MET.earthThumbnail));
    ctx.cameraTo('lunarApproach', msAt(MET.earthThumbnail), between(MET.earthThumbnail, end));
  },
};

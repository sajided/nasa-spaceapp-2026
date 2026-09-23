import { CHAPTER_BOUNDARY_MET, MET } from '../data/mission';
import { PAD_TRAVEL } from '../scene/pad';
import type { ChapterDef } from '../types';

/**
 * Chapter 1 — Launch.
 *
 * T-8 seconds to T+2:40. Ignition, hold-down release, and the climb out of the
 * atmosphere. Because the vehicle holds the origin, the climb is the pad
 * falling away beneath it (see scene/saturnV.ts).
 *
 * Every event places itself by mission time through `msAt`, not by a hand-tuned
 * fraction of the chapter — so the timings are readable against the flight
 * record and stay correct if the scroll weighting changes.
 */
export const launch: ChapterDef = {
  id: 'launch',
  weight: 3,
  build(ctx) {
    const { tl, parts, camera, effects, msAt } = ctx;
    const pad = parts.get('pad');

    const between = (fromMet: number, toMet: number): number => msAt(toMet) - msAt(fromMet);

    // ── Ignition ──────────────────────────────────────────────────────────
    // The F-1s light at T-8 and build to full thrust before the hold-downs
    // release; the vehicle sits still through all of it.
    tl.add(
      effects,
      {
        exhaustF1: [0, 1],
        duration: between(MET.ignition, MET.liftoff),
        ease: 'outQuad',
      },
      msAt(MET.ignition),
    );
    tl.add(
      effects,
      { smoke: [0, 1], duration: between(MET.ignition, 4), ease: 'outQuad' },
      msAt(MET.ignition),
    );

    // ── Liftoff and climb ─────────────────────────────────────────────────
    // `inQuad` because the vehicle is at its heaviest and slowest right here;
    // a linear climb reads as an elevator.
    tl.add(
      pad,
      {
        y: [0, -PAD_TRAVEL],
        duration: between(MET.liftoff, CHAPTER_BOUNDARY_MET),
        ease: 'inQuad',
      },
      msAt(MET.liftoff),
    );

    tl.add(
      effects,
      { smoke: [1, 0], duration: between(4, 48), ease: 'outQuad' },
      msAt(4),
    );

    // Atmosphere thins out; by max-Q it is already noticeably darker.
    tl.add(
      effects,
      { atmosphere: [1, 0], duration: between(MET.liftoff, 130), ease: 'outQuad' },
      msAt(MET.liftoff),
    );

    // ── Camera shake ──────────────────────────────────────────────────────
    // Hardest at the moment of release, decaying with altitude as the air
    // thins and the vehicle gets further from the ground plane (TC-P1-04).
    tl.add(camera, { shake: [0, 0.12], duration: between(MET.ignition, -1), ease: 'outQuad' }, msAt(MET.ignition));
    tl.add(camera, { shake: [0.12, 0.45], duration: between(-1, 4), ease: 'outQuad' }, msAt(-1));
    tl.add(camera, { shake: [0.45, 0.06], duration: between(4, 110), ease: 'outQuad' }, msAt(4));
    tl.add(camera, { shake: [0.06, 0], duration: between(110, 145), ease: 'linear' }, msAt(110));

    // ── Camera moves ──────────────────────────────────────────────────────
    ctx.cameraTo('liftoff', msAt(-6), between(-6, 2));
    ctx.cameraTo('ascent', msAt(6), between(6, 60));
  },
};

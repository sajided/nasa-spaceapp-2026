import { CHAPTER_BOUNDARIES, MET } from '../data/mission';
import type { ChapterDef } from '../types';

/**
 * Chapter 3 — Earth orbit and trans-lunar injection.
 *
 * The scale changes here. The vehicle has reached orbit and the story stops
 * being about a machine and starts being about a distance, so this chapter
 * hands over from the vehicle frame to the system frame (core/frames.ts) and
 * the spacecraft becomes a marker on a trajectory.
 *
 * The handover is placed where it is invisible: the camera has already pulled
 * back to four kilometres, the stack is about twenty pixels tall, and the
 * marker is sized to the same apparent height.
 *
 * Where the spacecraft actually *is* comes from data/orbits.ts#spacecraftAt,
 * not from tweens here — a chapter that animates a shared object writes its
 * start value whenever it renders at its own time zero, which for a position
 * spanning four chapters is a bug waiting to happen.
 */
export const earthOrbit: ChapterDef = {
  id: 'earth-orbit',
  weight: 5,
  build(ctx) {
    const { tl, effects, msAt } = ctx;
    const between = (a: number, b: number): number => msAt(b) - msAt(a);
    const start = CHAPTER_BOUNDARIES.stagingToOrbit;
    const handoverAt = MET.orbitInsertion;

    // ── Orbital insertion ─────────────────────────────────────────────────
    // The S-IVB shuts down here and the spacecraft coasts for two and a half
    // hours before relighting for the Moon. Chapter 2 hands it over still
    // burning, so this is where it stops.
    tl.add(
      effects,
      { exhaustJ2Single: [1, 0], duration: between(start, handoverAt), ease: 'inQuad' },
      msAt(start),
    );

    // ── The scale handover ────────────────────────────────────────────────
    tl.add(effects, { vehicleLod: [0, 1], duration: 1, ease: 'linear' }, msAt(handoverAt));
    tl.add(
      effects,
      { stars: [0, 1], duration: between(start, handoverAt), ease: 'outQuad' },
      msAt(start),
    );

    ctx.cameraTo('handoff', msAt(start), between(start, handoverAt - 2));
    // Paired with the switch: one millisecond, because the frames do not share
    // a coordinate scale and a tween between them would sweep through nothing.
    ctx.cameraTo('earthOrbit', msAt(handoverAt), 1);

    // ── Trans-lunar injection ─────────────────────────────────────────────
    // The S-IVB relights, five and a half minutes that turn a circle into a
    // trajectory.
    tl.add(
      effects,
      {
        exhaustJ2Single: [0, 1],
        duration: between(MET.tliIgnition, MET.tliIgnition + 12),
        ease: 'outQuad',
      },
      msAt(MET.tliIgnition),
    );
    tl.add(
      effects,
      {
        exhaustJ2Single: [1, 0],
        duration: between(MET.tliCutoff - 10, MET.tliCutoff),
        ease: 'inQuad',
      },
      msAt(MET.tliCutoff - 10),
    );

    ctx.cameraTo('tli', msAt(MET.tliIgnition - 50), between(MET.tliIgnition - 50, MET.tliCutoff));
  },
};

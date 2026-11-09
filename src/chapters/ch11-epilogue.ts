import { STORY_MET } from '../data/mission';
import type { ChapterDef } from '../types';

/**
 * Epilogue — A Museum of Courage (story Scene 7).
 *
 * Story mode only. From the capsule afloat on the Pacific the page cuts back up
 * to the Earth–Moon system, both journeys drawn, and settles on the whole Moon —
 * warm now, where the prologue's was grey — with one small glow at Tranquility
 * Base. The beats that are HTML rather than scene (the real LRO photograph,
 * the Resting Places map, the "what would you leave?" picker) are driven from
 * the same story MET by the story UI; this chapter only moves the camera and
 * the scene channels under them.
 */
export const epilogue: ChapterDef = {
  id: 'epilogue',
  weight: 6,
  build(ctx) {
    const { tl, parts, effects, msAt } = ctx;
    const between = (a: number, b: number): number => msAt(b) - msAt(a);
    const S = STORY_MET;

    // ── Back up to the system, paired with the camera ─────────────────────
    tl.add(effects, { vehicleLod: [0, 1], duration: 1, ease: 'linear' }, msAt(S.epilogueStart));
    tl.add(parts.get('ocean'), { visible: [1, 0], duration: 1, ease: 'linear' }, msAt(S.epilogueStart));
    // Chapter 10 ends under a blue Pacific sky; out here it is space again.
    tl.add(effects, { atmosphere: [1, 0], duration: 1, ease: 'linear' }, msAt(S.epilogueStart));
    ctx.cameraTo('returnCoast', msAt(S.epilogueStart), 1);

    // ── The whole Moon, warming ───────────────────────────────────────────
    ctx.cameraTo('moonMuseum', msAt(S.epilogueStart + 30), between(S.epilogueStart + 30, S.moonArrive));
    tl.add(
      effects,
      { moonWarmth: [0.7, 1], duration: between(S.epilogueStart + 30, S.moonArrive), ease: 'inOutSine' },
      msAt(S.epilogueStart + 30),
    );

    // ── Tranquility Base glows ────────────────────────────────────────────
    tl.add(
      effects,
      { siteGlow: [0, 1], duration: between(S.siteGlow, S.siteGlow + 60), ease: 'outQuad' },
      msAt(S.siteGlow),
    );
    ctx.cameraTo('siteClose', msAt(S.siteGlow + 20), between(S.siteGlow + 20, S.lroIn));

    // ── The laser: Earth still saying hello ───────────────────────────────
    ctx.cameraTo('laserView', msAt(S.lroOut - 40), between(S.lroOut - 40, S.laserIn + 30));
    tl.add(
      effects,
      { laser: [0, 1], duration: between(S.laserIn, S.laserIn + 40), ease: 'outQuad' },
      msAt(S.laserIn),
    );
    tl.add(
      effects,
      { laser: [1, 0.45], duration: between(S.laserOut - 40, S.laserOut), ease: 'inOutSine' },
      msAt(S.laserOut - 40),
    );

    // ── The map, the gift, the promise ────────────────────────────────────
    ctx.cameraTo('moonMuseum', msAt(S.mapIn), between(S.mapIn, S.leaveIn));
    ctx.cameraTo('laserView', msAt(S.finale), between(S.finale, S.epilogueEnd - 20));
  },
};

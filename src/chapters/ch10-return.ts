import { buildSeparation } from '../core/separation';
import { CHAPTER_BOUNDARIES, MET } from '../data/mission';
import { separation } from '../data/separations';
import { PARACHUTES } from '../scene/parachutes';
import type { ChapterBuildContext, ChapterDef } from '../types';

/**
 * Chapter 10 — The way home.
 *
 * Three scales in one chapter. It opens at system scale for trans-Earth
 * injection and the coast; switches back to metres near Earth for the last
 * separations; and ends at eye level on the Pacific.
 *
 * The PRD's vision line is this chapter's job: "the ending makes clear that
 * only the Command Module came home". Everything else peels away in the
 * shot — the Service Module, the apex cover, the drogues, finally the mains —
 * until one small capsule is floating on its own (TC-P4-09).
 *
 * Height and attitude come from data/reentry.ts, applied by
 * scene/reentry.ts; this chapter tweens the events.
 */
export const returnHome: ChapterDef = {
  id: 'return',
  weight: 7,
  build(ctx) {
    const { tl, parts, effects, msAt } = ctx;
    const between = (a: number, b: number): number => msAt(b) - msAt(a);
    const start = CHAPTER_BOUNDARIES.ascentToReturn;

    // ── System scale: TEI and the coast home ──────────────────────────────
    tl.add(effects, { vehicleLod: [0, 1], duration: 1, ease: 'linear' }, msAt(start));
    ctx.cameraTo('lunarOrbit', msAt(start), 1);
    ctx.cameraTo('teiDeparture', msAt(MET.teiIgnition - 1800), between(MET.teiIgnition - 1800, MET.teiIgnition - 60));

    // Behind the Moon, two and a half minutes of SPS: the way home (TC-P4-04).
    tl.add(
      effects,
      { spsBurn: [0, 1], duration: between(MET.teiIgnition, MET.teiIgnition + 15), ease: 'outQuad' },
      msAt(MET.teiIgnition),
    );
    tl.add(
      effects,
      { spsBurn: [1, 0], duration: between(MET.teiCutoff - 15, MET.teiCutoff), ease: 'inQuad' },
      msAt(MET.teiCutoff - 15),
    );

    ctx.cameraTo('returnCoast', msAt(MET.teiCutoff + 600), between(MET.teiCutoff + 600, MET.mcc5));

    // The one midcourse correction on the way home: a flicker of glow.
    tl.add(
      effects,
      { spsBurn: [0, 0.4], duration: between(MET.mcc5, MET.mcc5 + 5), ease: 'outQuad' },
      msAt(MET.mcc5),
    );
    tl.add(
      effects,
      { spsBurn: [0.4, 0], duration: between(MET.mcc5 + 5, MET.mcc5 + 15), ease: 'inQuad' },
      msAt(MET.mcc5 + 5),
    );

    // ── Back to metres, above the Earth ───────────────────────────────────
    // The switch, paired with the camera as every scale switch is. The Moon's
    // surface and the ascent stage are left behind in the hidden frame; the
    // ocean — with the Earth seen from orbit riding in it — comes on.
    const cut = MET.sepSM - 900;
    ctx.cameraTo('earthApproach', msAt(MET.mcc5 + 3600), between(MET.mcc5 + 3600, cut - 60));
    tl.add(effects, { vehicleLod: [1, 0], duration: 1, ease: 'linear' }, msAt(cut));
    tl.add(parts.get('ocean'), { visible: [0, 1], duration: 1, ease: 'linear' }, msAt(cut));
    tl.add(parts.get('lunar-surface'), { visible: [1, 0], duration: 1, ease: 'linear' }, msAt(cut));
    tl.add(effects, { lunarSun: [1, 0], duration: 1, ease: 'linear' }, msAt(cut));
    ctx.cameraTo('earthHandoff', msAt(cut), 1);

    // ── SEP-11: the Service Module goes ───────────────────────────────────
    const sep11 = separation('sep-11');
    buildSeparation(sep11, ctx);
    // The CM leaves the empty CSM for its own flight frame at the same
    // instant, so its turn to heat-shield-first is about its own centre.
    const handover11 = sep11.met - sep11.dwellSeconds / 2 + sep11.dwellSeconds * 0.33;
    tl.add(parts.get('CM'), { attachment: [2, 3], duration: 1, ease: 'linear' }, msAt(handover11));
    ctx.cameraTo('cmFlip', msAt(MET.sepSM + 10), between(MET.sepSM + 10, MET.sepSM + 70));
    // Discarded, and burned up on entry: hidden once it has drifted clear.
    tl.add(parts.get('SM'), { visible: [1, 0], duration: 1, ease: 'linear' }, msAt(MET.sepSM + 300));

    // ── Entry ─────────────────────────────────────────────────────────────
    ctx.cameraTo('reentry', msAt(MET.entryInterface - 300), between(MET.entryInterface - 300, MET.entryInterface));
    tl.add(
      effects,
      { plasma: [0, 1], duration: between(MET.entryInterface, MET.peakHeating), ease: 'inQuad' },
      msAt(MET.entryInterface),
    );
    tl.add(
      effects,
      { plasma: [1, 0], duration: between(MET.peakHeating + 30, MET.blackoutEnd + 60), ease: 'outQuad' },
      msAt(MET.peakHeating + 30),
    );
    // The sky arrives: black to blue as the capsule falls into the thick of
    // the air, after the plasma has done its work.
    tl.add(
      effects,
      { atmosphere: [0, 1], duration: between(MET.blackoutEnd, MET.drogues - 60), ease: 'inOutSine' },
      msAt(MET.blackoutEnd),
    );

    // ── SEP-12: apex cover, drogues, mains ────────────────────────────────
    const sep12 = separation('sep-12');
    buildSeparation(sep12, ctx);
    parachuteSequence(ctx, sep12.met - sep12.dwellSeconds / 2, sep12.dwellSeconds);
    tl.add(parts.get('apex-cover'), { visible: [1, 0], duration: 1, ease: 'linear' }, msAt(MET.drogues + 30));

    ctx.cameraTo('mainsView', msAt(MET.mains - 10), between(MET.mains - 10, MET.mains + 20));
    ctx.cameraTo('splashdown', msAt(MET.splashdown - 120), between(MET.splashdown - 120, MET.splashdown - 10));

    // ── Splashdown ────────────────────────────────────────────────────────
    tl.add(
      effects,
      { splash: [0, 1], duration: between(MET.splashdown, MET.splashdown + 1), ease: 'outQuad' },
      msAt(MET.splashdown),
    );
    tl.add(
      effects,
      { splash: [1, 0], duration: between(MET.splashdown + 1, MET.splashdown + 10), ease: 'inQuad' },
      msAt(MET.splashdown + 1),
    );
    tl.add(
      effects,
      { splashFlow: [0, 1], duration: between(MET.splashdown, MET.splashdown + 8), ease: 'linear' },
      msAt(MET.splashdown),
    );

    ctx.cameraTo('bobbing', msAt(MET.splashdown + 30), between(MET.splashdown + 30, MET.missionEnd - 10));
  },
};

/**
 * The drogues and mains, as tweens on their part state.
 *
 * The drogues come out as beat 4 of SEP-12 — the separation's "next engine
 * ignites", here the next stage of braking. They are cut loose as the mains
 * go, and the mains open one after another, reefed first and then full, so
 * the viewer sees exactly three (TC-P4-07). After splashdown the mains are
 * released onto the water, leaving the capsule on its own.
 */
function parachuteSequence(ctx: ChapterBuildContext, windowStart: number, dwell: number): void {
  const { tl, parts, msAt } = ctx;
  const between = (a: number, b: number): number => msAt(b) - msAt(a);
  const drogueOpen = windowStart + dwell * 0.46;
  const drogueFull = windowStart + dwell * 0.72;

  for (const spec of PARACHUTES) {
    const chute = parts.get(spec.name);
    const isDrogue = spec.name.startsWith('drogue');
    const index = Number(spec.name.slice(-1)) - 1;
    const outX = Math.cos(spec.azimuth);
    const outZ = Math.sin(spec.azimuth);

    if (isDrogue) {
      tl.add(chute, { visible: [0, 1], duration: 1, ease: 'linear' }, msAt(drogueOpen));
      tl.add(
        chute,
        { sx: [0.05, 1], sy: [0.05, 1], sz: [0.05, 1], duration: between(drogueOpen, drogueFull), ease: 'outQuad' },
        msAt(drogueOpen),
      );
      // Cut loose as the mains come out; they fly up and away, slowed by
      // their own canopies while the capsule keeps falling.
      const release = MET.mains - 1;
      tl.add(chute, { attachment: [0, 1], duration: 1, ease: 'linear' }, msAt(release));
      tl.add(
        chute,
        { x: [0, outX * 24], y: [0, 45], z: [0, outZ * 24], duration: between(release, release + 25), ease: 'outQuad' },
        msAt(release),
      );
      tl.add(chute, { visible: [1, 0], duration: 1, ease: 'linear' }, msAt(release + 25));
      continue;
    }

    // Mains: one after another, lines out, reefed, then fully open.
    const open = MET.mains + index * 2;
    tl.add(chute, { visible: [0, 1], duration: 1, ease: 'linear' }, msAt(open));
    tl.add(
      chute,
      { sy: [0.05, 1], sx: [0.05, 0.25], sz: [0.05, 0.25], duration: between(open, open + 4), ease: 'outQuad' },
      msAt(open),
    );
    tl.add(
      chute,
      { sx: [0.25, 1], sz: [0.25, 1], duration: between(open + 8, open + 16), ease: 'inOutSine' },
      msAt(open + 8),
    );

    // Released on the water, to settle and drift off.
    const release = MET.splashdown + 15;
    tl.add(chute, { attachment: [0, 1], duration: 1, ease: 'linear' }, msAt(release));
    tl.add(
      chute,
      {
        x: [0, outX * 20],
        y: [0, -22],
        z: [0, outZ * 20],
        sy: [1, 0.15],
        duration: between(release, release + 40),
        ease: 'inQuad',
      },
      msAt(release),
    );
    tl.add(chute, { visible: [1, 0], duration: 1, ease: 'linear' }, msAt(release + 90));
  }
}

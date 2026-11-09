import { buildSeparation } from '../core/separation';
import { MET } from '../data/mission';
import { separation } from '../data/separations';
import { CSM_COAST_Y } from '../data/vehicle';
import type { ChapterDef } from '../types';

/**
 * Chapter 7 — Undocking, powered descent and landing.
 *
 * The emotional peak (PRD line 239), and built to feel like one: the page
 * spends more scroll on these twelve minutes of powered descent than on the
 * whole of the translunar coast. The tension is the real tension — program
 * alarms nobody had rehearsed, a computer steering into boulders, the fuel
 * calls — told through the callout card (data/callouts.ts) while the scene
 * shows what the crew could see.
 *
 * What moves, and what does not
 * -----------------------------
 * Eagle holds its place in the vehicle frame. Its height above the Moon, how
 * far it still has to go and which way it points are all derived from mission
 * time in data/lunarFlight.ts and applied by scene/lunarSurface.ts — the Moon
 * comes up to meet it, as the pad fell away from the Saturn V in chapter 1.
 * What this chapter tweens is everything that is an *event*: the scale switch,
 * the undocking, Columbia backing off, the engine, the dust, and the camera.
 */
export const descent: ChapterDef = {
  id: 'descent',
  weight: 7,
  build(ctx) {
    const { tl, parts, effects, msAt } = ctx;
    const between = (a: number, b: number): number => msAt(b) - msAt(a);
    const csm = parts.get('CSM');
    const surface = parts.get('lunar-surface');

    // ── Back to metre scale, over the Moon ────────────────────────────────
    // The same hard cut chapter 4 makes, taken where it is invisible: the
    // docked spacecraft is a speck in both frames. The lunar surface switches
    // on with it, and the debris of the launch — still parked far below in the
    // vehicle frame — switches off, or the S-IVB would be hanging between
    // Eagle and the Moon.
    const cut = MET.lmLegsDeployed - 1800;
    tl.add(effects, { vehicleLod: [1, 0], duration: 1, ease: 'linear' }, msAt(cut));
    tl.add(surface, { visible: [0, 1], duration: 1, ease: 'linear' }, msAt(cut));
    const debris = [
      'S-IC',
      'interstage',
      'S-II',
      'S-IVB',
      'IU',
      'SLA',
      'SLA-panel-1',
      'SLA-panel-2',
      'SLA-panel-3',
      'SLA-panel-4',
      'LES',
      'boost-cover',
      'pad',
    ];
    for (const name of debris) {
      if (!parts.has(name)) continue;
      tl.add(parts.get(name), { visible: [1, 0], duration: 1, ease: 'linear' }, msAt(cut));
    }
    ctx.cameraTo('lunarHandoff', msAt(cut), 1);
    ctx.cameraTo('lunarDocked', msAt(cut + 60), between(cut + 60, MET.lmLegsDeployed - 300));

    // The key light swings round to the low morning sun over the landing site.
    tl.add(
      effects,
      { lunarSun: [0, 1], duration: between(cut, MET.doi), ease: 'inOutSine' },
      msAt(cut),
    );

    // ── Landing gear ──────────────────────────────────────────────────────
    tl.add(
      effects,
      {
        lmLegs: [0, 1],
        duration: between(MET.lmLegsDeployed - 120, MET.lmLegsDeployed + 120),
        ease: 'inOutSine',
      },
      msAt(MET.lmLegsDeployed - 120),
    );

    // ── SEP-8: "The Eagle has wings" ──────────────────────────────────────
    const sep = separation('sep-8');
    buildSeparation(sep, ctx);

    // Columbia backs away while Eagle turns its pirouette — the four-beat
    // "drift" of this separation, carried by the other vehicle. Timed to beat 3
    // of the window (core/separation.ts), which starts at 0.34 of it.
    const windowStart = sep.met - sep.dwellSeconds / 2;
    const windowEnd = sep.met + sep.dwellSeconds / 2;
    const driftStart = windowStart + sep.dwellSeconds * 0.34;
    tl.add(
      csm,
      { y: [CSM_COAST_Y, CSM_COAST_Y + 14], duration: between(driftStart, windowEnd), ease: 'inOutSine' },
      msAt(driftStart),
    );
    tl.add(
      effects,
      { rcsLM: [1, 0], duration: between(windowEnd, windowEnd + 90), ease: 'inQuad' },
      msAt(windowEnd),
    );

    // Hold wide on both vehicles long enough to read what just happened
    // (TC-P3-01) — two spacecraft now, each on its own.
    ctx.cameraTo('undockWide', msAt(windowEnd + 20), between(windowEnd + 20, windowEnd + 300));

    // ── Columbia's separation burn ────────────────────────────────────────
    // It opens the distance and passes out of the story until Phase 4 brings
    // it back for the rendezvous. Hidden once it is a speck, not removed.
    const gone = MET.csmSepBurn + 900;
    tl.add(
      csm,
      {
        y: [CSM_COAST_Y + 14, CSM_COAST_Y + 420],
        x: [0, -760],
        duration: between(MET.csmSepBurn, gone),
        ease: 'inQuad',
      },
      msAt(MET.csmSepBurn),
    );
    tl.add(csm, { visible: [1, 0], duration: 1, ease: 'linear' }, msAt(gone));

    // ── Descent orbit insertion ───────────────────────────────────────────
    ctx.cameraTo('descentOrbit', msAt(gone), between(gone, MET.doi - 60));
    tl.add(
      effects,
      { exhaustDPS: [0, 0.7], duration: between(MET.doi, MET.doi + 4), ease: 'outQuad' },
      msAt(MET.doi),
    );
    tl.add(
      effects,
      { exhaustDPS: [0.7, 0], duration: between(MET.doi + 26, MET.doi + 30), ease: 'inQuad' },
      msAt(MET.doi + 26),
    );

    // ── Powered descent ───────────────────────────────────────────────────
    // The engine lights at PDI and burns continuously to touchdown (TC-P3-02),
    // throttling down about six minutes in.
    ctx.cameraTo('descentChase', msAt(MET.pdi - 50), between(MET.pdi - 50, MET.pdi));
    tl.add(
      effects,
      { exhaustDPS: [0, 1], duration: between(MET.pdi, MET.pdi + 26), ease: 'outQuad' },
      msAt(MET.pdi),
    );
    const throttleDown = MET.pdi + 6 * 60 + 24;
    tl.add(
      effects,
      { exhaustDPS: [1, 0.62], duration: between(throttleDown, throttleDown + 8), ease: 'inOutSine' },
      msAt(throttleDown),
    );

    // High gate: the pitch-over puts the landing site in the window. The
    // camera goes with it, looking ahead past Eagle at what the crew saw.
    ctx.cameraTo('highGate', msAt(MET.highGate - 25), between(MET.highGate - 25, MET.highGate + 30));
    ctx.cameraTo('finalApproach', msAt(MET.p66 - 20), between(MET.p66 - 20, MET.fuel60 - 20));
    ctx.cameraTo('touchdown', msAt(MET.fuel60 - 10), between(MET.fuel60 - 10, MET.touchdown - 8));

    // ── Dust ──────────────────────────────────────────────────────────────
    // Starts well above the surface, streams flat and outward, and drops out
    // the moment the engine stops — in vacuum it does not hang.
    tl.add(
      effects,
      { dust: [0, 1], duration: between(MET.dustStart, MET.touchdown - 6), ease: 'inQuad' },
      msAt(MET.dustStart),
    );
    tl.add(
      effects,
      { dust: [1, 0], duration: between(MET.touchdown, MET.engineStop + 6), ease: 'outQuad' },
      msAt(MET.touchdown),
    );
    tl.add(
      effects,
      { dustFlow: [0, 7], duration: between(MET.dustStart, MET.engineStop + 6), ease: 'linear' },
      msAt(MET.dustStart),
    );

    // ── Contact light, engine stop ────────────────────────────────────────
    tl.add(
      effects,
      { exhaustDPS: [0.62, 0], duration: between(MET.touchdown, MET.engineStop), ease: 'inQuad' },
      msAt(MET.touchdown),
    );

    // "The Eagle has landed." The camera settles back and holds — the pacing
    // gives the moment room rather than scrolling straight past it (TC-P3-07).
    ctx.cameraTo('landed', msAt(MET.engineStop), between(MET.engineStop, MET.eagleLanded + 40));

    // Story mode: the lonely Moon's first visitors. It warms a step, unseen
    // here at metre scale, so it is already warmer the next time the whole
    // Moon is on screen (chapter 10's departure).
    tl.add(
      effects,
      { moonWarmth: [0, 0.35], duration: between(MET.touchdown, MET.eagleLanded), ease: 'linear' },
      msAt(MET.touchdown),
    );
  },
};

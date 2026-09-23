import { buildSeparation } from '../core/separation';
import { CHAPTER_BOUNDARIES, MET } from '../data/mission';
import { separation } from '../data/separations';
import { CSM_COAST_Y, CSM_DOCK_Y } from '../data/vehicle';
import type { ChapterDef } from '../types';

/**
 * Chapter 4 — Transposition, docking and extraction.
 *
 * Back to the vehicle frame: three separations happen here, and separations
 * only ever happen at metre scale where a part's rest position is identical
 * whether it is attached or adrift.
 *
 * The manoeuvre itself is the odd one in the mission — the CSM pulls forward,
 * turns completely around, and docks with the vehicle it just left. The
 * turnaround is authored here rather than in the separation spec because it
 * happens after the event window closes.
 */
export const docking: ChapterDef = {
  id: 'docking',
  weight: 6,
  build(ctx) {
    const { tl, parts, effects, msAt } = ctx;
    const between = (a: number, b: number): number => msAt(b) - msAt(a);

    const csm = parts.get('CSM');
    const sIVB = parts.get('S-IVB');
    const start = CHAPTER_BOUNDARIES.orbitToDocking;

    // ── Back to metre scale ───────────────────────────────────────────────
    // The camera is shared between the two frames, so switching scale without
    // moving it leaves it at system-frame coordinates — which in metres puts it
    // about three metres from the hull. The jump is paired with the switch and
    // takes 1 ms: both sides of it are deliberate, and the subject's apparent
    // size is what carries the continuity, not the camera's path.
    tl.add(effects, { vehicleLod: [1, 0], duration: 1, ease: 'linear' }, msAt(start));
    ctx.cameraTo('handoff', msAt(start), 1);
    ctx.cameraTo('sepSLA', msAt(start + 40), between(start + 40, start + 300));

    // SEP-5 the adapter panels, then SEP-6 the CSM pulling clear.
    //
    // The order of the calls in this function is load-bearing, not incidental.
    // `ctx.cameraTo` threads a single build-time cursor through every chapter,
    // supplying the previous destination as the next move's start value — so
    // camera moves have to be *declared* in the order they play. SEP-7's move
    // happens after the docking shot, so it is built after it.
    buildSeparation(separation('sep-5'), ctx);
    buildSeparation(separation('sep-6'), ctx);

    // ── The 180° turnaround ───────────────────────────────────────────────
    // Eased rather than linear, and about one axis only: a single-axis Euler
    // rotation reverses cleanly, which is what TC-P2-05 is checking when it
    // asks that the model not end up mirrored or off-axis.
    const turnStart = MET.sepCSM + 8;
    const turnEnd = MET.docking - 120;
    tl.add(
      csm,
      { rz: [0, Math.PI], duration: between(turnStart, turnEnd), ease: 'inOutSine' },
      msAt(turnStart),
    );

    // Station-keeping, then the approach back down the axis to contact: the CM
    // apex on the LM's tunnel, derived in data/vehicle.ts from the same numbers
    // the LM's docked attachment uses, so contact is exact rather than tuned.
    tl.add(
      csm,
      { y: [20, 20], duration: between(turnEnd, turnEnd + 30), ease: 'linear' },
      msAt(turnEnd),
    );
    tl.add(
      csm,
      { y: [20, CSM_DOCK_Y], duration: between(turnEnd + 30, MET.docking), ease: 'inOutSine' },
      msAt(turnEnd + 30),
    );

    ctx.cameraTo('docked', msAt(MET.docking - 90), between(MET.docking - 90, MET.docking));

    // ── Extraction ────────────────────────────────────────────────────────
    buildSeparation(separation('sep-7'), ctx);

    // The docked pair pulls the LM clear, and the spent S-IVB falls behind.
    const pullStart = MET.sepLMExtraction + 6;
    const pullEnd = CHAPTER_BOUNDARIES.dockingToCoast;
    tl.add(
      csm,
      { y: [CSM_DOCK_Y, CSM_COAST_Y], duration: between(pullStart, pullEnd), ease: 'inOutSine' },
      msAt(pullStart),
    );
    tl.add(
      sIVB,
      { y: [0, -70], duration: between(pullStart, pullEnd), ease: 'inQuad' },
      msAt(pullStart),
    );
    tl.add(
      sIVB,
      { attachment: [0, 1], duration: 1, ease: 'linear' },
      msAt(pullStart),
    );

    // Pull back before handing over to the coast, so the switch to system
    // scale happens with the spacecraft already small in frame.
    ctx.cameraTo('handoff', msAt(pullEnd - 80), between(pullEnd - 80, pullEnd));
  },
};

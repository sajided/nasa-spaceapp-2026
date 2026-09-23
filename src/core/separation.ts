import type { ChapterBuildContext, MetMapper, SeparationSpec } from '../types';

/**
 * The four-beat separation, as one reusable function.
 *
 * PRD lines 90–95 give the rhythm every separation follows:
 *
 *   1. Engine glow fades (cutoff).
 *   2. Flashes at the joint, brief pause.
 *   3. The spent piece drifts back and tumbles.
 *   4. The next engine ignites and the camera eases forward.
 *
 * All twelve events in the finished piece run through here; only the row in
 * data/separations.ts changes. That is TC-P1-05 — adding SEP-5 in Phase 2 is a
 * configuration entry, not new animation code.
 *
 * Nothing in here fires a callback or mutates the scene. It emits tweens onto
 * plain state objects, and the reconciler derives the actual re-parenting from
 * `detach` crossing 0.5. That is what makes the sequence survive being scrubbed
 * backwards, stopped halfway through, or jumped over entirely.
 */

/** Beat boundaries as fractions of the slow-motion window. */
const BEATS = {
  cutoffStart: 0.0,
  cutoffEnd: 0.24,
  /** The pyrotechnic flash. Short and bright. */
  flashStart: 0.26,
  flashPeak: 0.32,
  flashEnd: 0.42,
  /** The handover itself — `detach` crosses 0.5 here. */
  handoverStart: 0.3,
  handoverEnd: 0.36,
  driftStart: 0.34,
  driftEnd: 1.0,
  igniteStart: 0.46,
  igniteEnd: 0.72,
} as const;

/**
 * Deterministic jitter in [-1, 1] from a string seed.
 *
 * The PRD asks for "slightly randomized rotation" (line 94). Actual randomness
 * would make the same scroll position render differently on each visit, which
 * breaks every determinism assertion and makes screenshot baselines impossible
 * — and `boot.spec.ts` compares the dev and preview builds directly, so it has
 * to be stable across builds too. Hashing the spec id gives motion that looks
 * arbitrary and is perfectly repeatable.
 */
function jitter(seed: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 0xffffffff) * 2 - 1;
}

export interface SeparationWindow {
  id: string;
  /** Global progress bounds of the slow-motion sequence. */
  from: number;
  to: number;
}

/** Global progress bounds of each separation, for the SLOW-MO badge. */
export function separationWindows(
  specs: readonly SeparationSpec[],
  met: MetMapper,
): SeparationWindow[] {
  return specs.map((spec) => ({
    id: spec.id,
    from: met.progressAtMet(spec.met - spec.dwellSeconds / 2),
    to: met.progressAtMet(spec.met + spec.dwellSeconds / 2),
  }));
}

export function buildSeparation(spec: SeparationSpec, ctx: ChapterBuildContext): void {
  const { tl, parts, effects, msAt } = ctx;

  const part = parts.get(spec.part);
  // A missing name here means the scene graph and the config have drifted
  // apart, and that should fail loudly while the timeline is built.
  const carried = (spec.carries ?? []).map((name) => parts.get(name));

  // Siblings leave at the same moment but travel independently — the four SLA
  // panels peeling outward. One event, one window, one badge.
  const siblings = (spec.siblings ?? []).map((name) => ({ name, state: parts.get(name) }));
  const destination = spec.attachTo ?? 1;
  const origin = spec.attachFrom ?? 0;
  const flashPeak = spec.flashPeak ?? 1;
  const spin = (salt: number, seed: string): number =>
    spec.tumbleExact ? 1 : 1 + 0.25 * jitter(seed, salt);

  const start = msAt(spec.met - spec.dwellSeconds / 2);
  const end = msAt(spec.met + spec.dwellSeconds / 2);
  const span = end - start;
  const at = (fraction: number): number => start + span * fraction;
  const dur = (from: number, to: number): number => span * (to - from);

  // Beat 1 — the engine that has been pushing cuts out.
  if (spec.cutoff) {
    tl.add(
      effects,
      {
        [spec.cutoff]: [1, 0],
        duration: dur(BEATS.cutoffStart, BEATS.cutoffEnd),
        ease: 'inQuad',
      },
      at(BEATS.cutoffStart),
    );
  }

  // Beat 2 — pyrotechnics at the joint. Rise fast, fall slower.
  tl.add(
    effects,
    { flashY: [spec.jointY, spec.jointY], duration: 1, ease: 'linear' },
    at(BEATS.flashStart),
  );
  tl.add(
    effects,
    {
      flash: [0, flashPeak],
      duration: dur(BEATS.flashStart, BEATS.flashPeak),
      ease: 'outQuad',
    },
    at(BEATS.flashStart),
  );
  tl.add(
    effects,
    {
      flash: [flashPeak, 0],
      duration: dur(BEATS.flashPeak, BEATS.flashEnd),
      ease: 'inQuad',
    },
    at(BEATS.flashPeak),
  );

  // The handover. The reconciler turns this crossing into a re-parent.
  const handover = { duration: dur(BEATS.handoverStart, BEATS.handoverEnd), ease: 'linear' };
  tl.add(part, { attachment: [origin, destination], ...handover }, at(BEATS.handoverStart));
  if (spec.carriesTo !== undefined) {
    for (const state of carried) {
      tl.add(state, { attachment: [0, spec.carriesTo], ...handover }, at(BEATS.handoverStart));
    }
  }
  for (const sibling of siblings) {
    tl.add(sibling.state, { attachment: [0, destination], ...handover }, at(BEATS.handoverStart));
  }

  // Beat 3 — the spent piece falls away and tumbles.
  const driftDuration = dur(BEATS.driftStart, BEATS.driftEnd);
  tl.add(
    part,
    {
      x: [0, spec.drift[0]],
      y: [0, spec.drift[1]],
      z: [0, spec.drift[2]],
      duration: driftDuration,
      ease: 'inQuad',
    },
    at(BEATS.driftStart),
  );
  tl.add(
    part,
    {
      rx: [0, spec.tumble[0] * spin(1, spec.id)],
      ry: [0, spec.tumble[1] * spin(2, spec.id)],
      rz: [0, spec.tumble[2] * spin(3, spec.id)],
      duration: driftDuration,
      ease: 'outSine',
    },
    at(BEATS.driftStart),
  );

  // Siblings take the same drift, rotated about the stack axis so they spread
  // outward evenly rather than all going the same way.
  const spread = siblings.length + 1;
  siblings.forEach((sibling, i) => {
    const angle = ((i + 1) / spread) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    tl.add(
      sibling.state,
      {
        x: [0, spec.drift[0] * cos - spec.drift[2] * sin],
        y: [0, spec.drift[1]],
        z: [0, spec.drift[0] * sin + spec.drift[2] * cos],
        duration: driftDuration,
        ease: 'inQuad',
      },
      at(BEATS.driftStart),
    );
    tl.add(
      sibling.state,
      {
        rx: [0, spec.tumble[0] * spin(1, sibling.name)],
        ry: [0, spec.tumble[1] * spin(2, sibling.name)],
        rz: [0, spec.tumble[2] * spin(3, sibling.name)],
        duration: driftDuration,
        ease: 'outSine',
      },
      at(BEATS.driftStart),
    );
  });

  // Beat 4 — the next engine lights.
  if (spec.ignites) {
    tl.add(
      effects,
      {
        [spec.ignites]: [0, 1],
        duration: dur(BEATS.igniteStart, BEATS.igniteEnd),
        ease: 'outQuad',
      },
      at(BEATS.igniteStart),
    );
  }

  // ...and the camera eases forward. Eased, never cut (TC-P1-14).
  //
  // The move happens in the run-up, not during the event: it has to be settled
  // and framing the joint by beat 1, or the spent piece spends the first beats
  // outside the frame while the camera is still travelling.
  const leadStart = msAt(spec.met - spec.dwellSeconds / 2 - spec.cameraLead);
  ctx.cameraTo(spec.camera, leadStart, Math.max(1, start - leadStart));
}

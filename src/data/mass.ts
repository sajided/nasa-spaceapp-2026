import { MET, STORY_MET } from './mission';

/**
 * How heavy the ship is, for the weight meter (story Scene 2's "dropping the
 * weight").
 *
 * Keyframes in tonnes by mission time, linear between them: a burn is a
 * steady slope as propellant goes, a separation is a cliff two seconds wide.
 * Before the cut to the pad, the meter is hidden: the prologue is the Earth
 * and the Moon, and there is no ship yet.
 *
 * The figures are rounded, approximate, and for children; they follow the
 * shape of the AS-506 flight evaluation report and must be checked against it
 * before shipping (docs/story.md, Sources).
 *
 * Between undocking and redocking there are two ships, so the meter is hidden
 * (`visible: false` keyframes); it tracks Columbia again from redocking.
 */
export interface MassKey {
  met: number;
  tonnes: number;
}

export const MASS_KEYS: MassKey[] = [
  // On the pad, from the prologue's cut down to the rocket.
  { met: STORY_MET.prologueCut, tonnes: 2938 },
  { met: MET.liftoff, tonnes: 2938 },
  // The S-IC burns some 2,000 t of propellant in two and a half minutes.
  { met: MET.sepSIC - 1, tonnes: 860 },
  { met: MET.sepSIC + 1, tonnes: 680 },
  { met: MET.sepInterstage - 1, tonnes: 668 },
  { met: MET.sepInterstage + 1, tonnes: 663 },
  { met: MET.sepLES - 1, tonnes: 662 },
  { met: MET.sepLES + 1, tonnes: 658 },
  { met: MET.sepSII - 1, tonnes: 210 },
  { met: MET.sepSII + 1, tonnes: 172 },
  { met: MET.orbitInsertion, tonnes: 140 },
  { met: MET.tliIgnition, tonnes: 139 },
  { met: MET.tliCutoff, tonnes: 64 },
  { met: MET.sepSLA - 1, tonnes: 64 },
  { met: MET.sepSLA + 1, tonnes: 62 },
  // The S-IVB is left behind: Columbia and Eagle, together.
  { met: MET.sepLMExtraction - 1, tonnes: 62 },
  { met: MET.sepLMExtraction + 1, tonnes: 44 },
  { met: MET.loiIgnition, tonnes: 44 },
  { met: MET.loiCutoff, tonnes: 34 },
  { met: MET.sepUndock, tonnes: 33 },
  // — two ships: hidden —
  { met: MET.redock, tonnes: 20 },
  { met: MET.sepAscentJettison - 1, tonnes: 20 },
  { met: MET.sepAscentJettison + 1, tonnes: 17.5 },
  { met: MET.teiIgnition, tonnes: 17.5 },
  { met: MET.teiCutoff, tonnes: 12.9 },
  { met: MET.sepSM - 1, tonnes: 12.9 },
  { met: MET.sepSM + 1, tonnes: 5.9 },
  { met: MET.splashdown, tonnes: 4.9 },
];

/** An African elephant, roughly. The unit a six-year-old can picture. */
export const ELEPHANT_TONNES = 6;

export interface MassReading {
  tonnes: number;
  /** False before ignition, after splashdown, and while there are two ships. */
  visible: boolean;
}

export function massAt(met: number): MassReading {
  const first = MASS_KEYS[0]!;
  const last = MASS_KEYS[MASS_KEYS.length - 1]!;
  if (met < first.met) return { tonnes: first.tonnes, visible: false };
  if (met > last.met + 60) return { tonnes: last.tonnes, visible: false };
  if (met >= last.met) return { tonnes: last.tonnes, visible: true };
  const visible = !(met > MET.sepUndock && met < MET.redock);
  for (let i = 1; i < MASS_KEYS.length; i += 1) {
    const a = MASS_KEYS[i - 1]!;
    const b = MASS_KEYS[i]!;
    if (met <= b.met) {
      const t = (met - a.met) / (b.met - a.met);
      return { tonnes: a.tonnes + t * (b.tonnes - a.tonnes), visible };
    }
  }
  return { tonnes: last.tonnes, visible };
}

for (let i = 1; i < MASS_KEYS.length; i += 1) {
  if (MASS_KEYS[i]!.met <= MASS_KEYS[i - 1]!.met) {
    throw new Error(`Mass keyframes out of order at index ${i}`);
  }
}

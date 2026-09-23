import { MET } from './mission';
import { monotoneProfile, type ProfileKey } from './profile';

/**
 * The Command Module's way down, as a function of mission time: its height
 * above the Pacific, and which way up it is.
 *
 * The same floating-origin idea as the Moon landing (data/lunarFlight.ts): the
 * capsule holds its place in the vehicle frame and the ocean rises to meet it.
 * Deriving it from mission time rather than tweening it keeps reentry a pure
 * function of scroll, so the parachutes and the splash un-happen exactly on
 * the way back up.
 *
 * Altitudes follow the flight as flown where it matters to the viewer: entry
 * interface at 122 km (400,000 ft), drogues near 7.3 km, mains near 3 km,
 * splashdown at 195:18:35. The spacing is chosen so the descent rate drops at
 * every parachute stage (TC-P4-07). Above entry interface it is stylised — the
 * SM jettison really happened some 3,000 km out, which would put the Earth
 * outside any sensible shot. Working values; TC-P5-17 checks them.
 */

export interface ReentryState {
  /** Height of the heat shield above the water, metres. 0 is afloat. */
  altitude: number;
  /**
   * Attitude, radians about the vehicle frame's Z axis. π is apex-down, as the
   * CM rides in the turned-around CSM; 0 is heat shield down, the only way it
   * can meet the atmosphere.
   */
  attitude: number;
}

type Key = ProfileKey<'altitude' | 'attitude'>;

/** Stylised height at SM jettison: high enough for Earth to fill the frame below. */
export const JETTISON_ALTITUDE = 400_000;

const KEYS: readonly Key[] = [
  { met: MET.sepSM - 600, altitude: JETTISON_ALTITUDE, attitude: Math.PI },
  { met: MET.sepSM + 10, altitude: JETTISON_ALTITUDE - 2_000, attitude: Math.PI },
  // Turning heat shield first, straight after the Service Module has gone.
  { met: MET.sepSM + 70, altitude: JETTISON_ALTITUDE - 20_000, attitude: 0 },
  { met: MET.entryInterface, altitude: 122_000, attitude: 0 },
  { met: MET.peakHeating, altitude: 60_000, attitude: 0 },
  { met: MET.blackoutEnd, altitude: 38_000, attitude: 0 },
  // Terminal descent, then each parachute stage slower than the last.
  { met: MET.drogues - 26, altitude: 11_000, attitude: 0 },
  { met: MET.drogues, altitude: 7_300, attitude: 0 },
  { met: MET.mains, altitude: 3_000, attitude: 0 },
  { met: MET.mains + 60, altitude: 2_450, attitude: 0 },
  { met: MET.splashdown, altitude: 0, attitude: 0 },
];

const PROFILE = monotoneProfile(KEYS, ['altitude', 'attitude'] as const);

export function reentryAt(met: number, out: ReentryState = { altitude: 0, attitude: 0 }): ReentryState {
  PROFILE.sample(met, out);
  out.altitude = Math.max(0, out.altitude);
  return out;
}

/**
 * The phases a viewer should feel slow down, as [from, to] in mission time:
 * free fall below the plasma, on the drogues, on the mains.
 */
export const DESCENT_STAGES = {
  freeFall: [MET.drogues - 26, MET.drogues],
  drogues: [MET.drogues, MET.mains],
  mains: [MET.mains + 60, MET.splashdown],
} as const;

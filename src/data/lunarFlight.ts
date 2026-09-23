import { MET } from './mission';
import { monotoneProfile, type ProfileKey } from './profile';

/**
 * Where Eagle is, as a function of mission time — down to Tranquility Base in
 * chapter 7, and back up to Columbia in chapter 9: altitude, where it is along
 * its track relative to the landing site, and which way it is pointing.
 *
 * This is the lunar counterpart of data/orbits.ts#spacecraftAt, for the same
 * reason. The LM's height above the Moon spans two chapters and five orders of
 * magnitude, from 110 km in orbit to the moment the probes touch. Tweening that
 * across separate chapter timelines means every chapter that touches it writes
 * its start value whenever it renders at its own time zero — the bug that
 * spacecraftAt exists to avoid. A pure function of MET cannot disagree with
 * itself, runs identically forward and back, and gives TC-P3-02's "altitude
 * visibly decreases" an exact, testable definition.
 *
 * Values follow the Apollo 11 descent as flown: powered descent from about
 * 15 km, the pitch-over at high gate near 2,300 m, Armstrong taking manual
 * control near 150 m and flying long over West crater's boulder field, dust
 * from about 30 m, contact light at 102:45:40. Downrange distances are
 * stylised — the real PDI started about 480 km out, which is kept — and
 * everything before PDI is compressed. Working values; the authoritative check
 * is TC-P5-17.
 */

export interface FlightState {
  /**
   * Height above the surface, metres: the footpads on the way down, the
   * ascent stage's base on the way up (the two coincide on the pad).
   */
  altitude: number;
  /**
   * Ground distance still to fly to the landing site, metres. 0 on the
   * surface; negative after liftoff — how far the ascent stage has gone past.
   */
  toGo: number;
  /**
   * Attitude, radians, as a rotation about the vehicle frame's Z axis.
   *
   * 0 is upright, engine down: how the LM hangs under the turned-around CSM
   * after docking, and how it lands. π/2 is engine-first along the direction
   * of flight (+X), the braking attitude for descent orbit insertion and the
   * start of powered descent. Negative tips the top forward: the ascent
   * stage's pitch-over on the way back up.
   */
  attitude: number;
}

type Key = ProfileKey<'altitude' | 'toGo' | 'attitude'>;

/** Orbit altitude after undocking — a 100 × 120 km ellipse, stylised as round. */
export const LUNAR_ORBIT_ALTITUDE = 110_000;

/** Keyframes, interpolated monotone-cubically (data/profile.ts). */
const KEYS: readonly Key[] = [
  // Docked in lunar orbit, the LM hanging off the nose of Columbia.
  { met: MET.loi2, altitude: LUNAR_ORBIT_ALTITUDE, toGo: 1_600_000, attitude: 0 },
  { met: MET.sepUndock + 60, altitude: LUNAR_ORBIT_ALTITUDE, toGo: 1_150_000, attitude: 0 },
  // After the separation burn Eagle turns engine-first for descent orbit
  // insertion — a quarter turn about its pitch axis.
  { met: MET.csmSepBurn + 120, altitude: LUNAR_ORBIT_ALTITUDE, toGo: 1_050_000, attitude: 0 },
  { met: MET.doi - 240, altitude: LUNAR_ORBIT_ALTITUDE, toGo: 760_000, attitude: Math.PI / 2 },
  // Descent orbit: half a revolution coasting down to 15 km.
  { met: MET.pdi, altitude: 15_000, toGo: 480_000, attitude: Math.PI / 2 },
  // Braking phase. Engine-first and almost horizontal the whole way.
  { met: MET.alarm1202a, altitude: 10_200, toGo: 190_000, attitude: Math.PI / 2 - 0.12 },
  { met: MET.highGate - 20, altitude: 2_600, toGo: 9_000, attitude: Math.PI / 2 - 0.35 },
  // High gate: the pitch-over that brings the landing site into the window.
  { met: MET.highGate + 15, altitude: 2_100, toGo: 7_000, attitude: 0.62 },
  // Low gate, and Armstrong takes over.
  { met: MET.p66, altitude: 130, toGo: 700, attitude: 0.28 },
  // Flying long over West crater, then settling into the hover.
  { met: MET.fuel60 - 30, altitude: 55, toGo: 190, attitude: 0.1 },
  { met: MET.dustStart, altitude: 30, toGo: 60, attitude: 0.04 },
  { met: MET.fuel30, altitude: 9, toGo: 8, attitude: 0.01 },
  { met: MET.touchdown, altitude: 0, toGo: 0, attitude: 0 },

  // ── Ascent (chapter 9) ─────────────────────────────────────────────────
  // Seven minutes of ascent engine: straight up off the descent stage, a
  // pitch-over within seconds to build horizontal speed, then orbit. The
  // rendezvous raises it to Columbia's 110 km and brings it upright, tunnel
  // toward the CSM, for docking.
  { met: MET.ascentLiftoff, altitude: 0, toGo: 0, attitude: 0 },
  { met: MET.ascentLiftoff + 10, altitude: 25, toGo: 0, attitude: 0 },
  { met: MET.ascentLiftoff + 30, altitude: 180, toGo: -120, attitude: -0.85 },
  { met: MET.ascentLiftoff + 120, altitude: 2_500, toGo: -30_000, attitude: -1.1 },
  { met: MET.ascentInsertion, altitude: 18_000, toGo: -400_000, attitude: -1.45 },
  { met: MET.csi, altitude: 60_000, toGo: -4_000_000, attitude: -1.2 },
  { met: MET.tpi, altitude: 105_000, toGo: -8_000_000, attitude: -0.6 },
  { met: MET.redock - 900, altitude: LUNAR_ORBIT_ALTITUDE, toGo: -9_000_000, attitude: 0 },
  { met: MET.redock, altitude: LUNAR_ORBIT_ALTITUDE, toGo: -9_200_000, attitude: 0 },
  { met: MET.sepAscentJettison + 600, altitude: LUNAR_ORBIT_ALTITUDE, toGo: -10_000_000, attitude: 0 },
];

const PROFILE = monotoneProfile(KEYS, ['altitude', 'toGo', 'attitude'] as const);

/** Eagle's state at a mission time. Clamped to the first and last keys. */
export function flightAt(
  met: number,
  out: FlightState = { altitude: 0, toGo: 0, attitude: 0 },
): FlightState {
  PROFILE.sample(met, out);
  // Monotone cubic cannot overshoot, but float noise at a key can land a hair
  // below zero, and a negative altitude puts the footpads underground.
  out.altitude = Math.max(0, out.altitude);
  return out;
}

/** Keyframe times of the descent, up to and including touchdown. */
export const DESCENT_KEY_METS: readonly number[] = KEYS.filter((k) => k.met <= MET.touchdown).map(
  (k) => k.met,
);

/** Keyframe times of the ascent, from liftoff off the Moon. */
export const ASCENT_KEY_METS: readonly number[] = KEYS.filter((k) => k.met >= MET.ascentLiftoff).map(
  (k) => k.met,
);

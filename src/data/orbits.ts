import { Vector3 } from 'three';
import { EARTH_MOON_DISTANCE, EARTH_RADIUS, MOON_RADIUS, PARKING_ALTITUDE } from '../core/frames';
import { MET } from './mission';

/**
 * Stylised paths, in system units of 1,000 km.
 *
 * The PRD is explicit that trajectories are drawn, not computed (line 26):
 * physically accurate orbital simulation is a non-goal. These are shaped to
 * read correctly — a parking orbit that looks circular, a translunar coast that
 * leaves Earth fast and arrives slow — rather than to be integrated.
 *
 * Every function writes into a caller-supplied vector so the per-frame path
 * never allocates.
 */

/** Radius of the parking orbit from Earth's centre. */
export const PARKING_RADIUS = EARTH_RADIUS + PARKING_ALTITUDE;

/** Radius of the lunar orbit from the Moon's centre, ~110 km up. */
export const LUNAR_ORBIT_RADIUS = MOON_RADIUS + 110 / 1000;

/**
 * Inclination of the mission plane, so it is not edge-on to the camera.
 *
 * Applied as a tilt *about the Earth–Moon line* rather than a rotation of the
 * whole path. Rotating about Z, as Phase 2 did, swung the far end of the coast
 * 138,000 km off the Moon, and the marker jumped that far at LOI. Tilting about
 * X leaves the Earth and the Moon on the axis and every endpoint where the
 * orbits are.
 */
const PLANE_TILT = 0.36;
const TILT_AXIS = new Vector3(1, 0, 0);

/** Where the parking orbit starts at insertion, in revolutions. */
const PARKING_START = 0.5;
/** Revolutions in parking orbit before TLI ignition; the burn adds a sliver. */
const PARKING_REVS = 1.42;
const TLI_ARC = 0.08;

/** Where lunar orbit starts at LOI, in revolutions: beside the Moon. */
const LOI_ANGLE = 0.25;

/**
 * The parking orbit. `t` is revolutions. Apollo 11 made about one and a half
 * before the burn for the Moon; the phase is chosen so that TLI happens on the
 * side facing the Moon.
 */
export function PARKING_ORBIT(t: number, out: Vector3): Vector3 {
  const a = t * Math.PI * 2;
  out.set(Math.cos(a) * PARKING_RADIUS, 0, Math.sin(a) * PARKING_RADIUS);
  out.applyAxisAngle(TILT_AXIS, PLANE_TILT);
  return out;
}

/** The lunar orbit, once captured. `t` is revolutions. */
export function LUNAR_ORBIT(t: number, out: Vector3): Vector3 {
  const a = t * Math.PI * 2;
  out.set(
    EARTH_MOON_DISTANCE + Math.cos(a) * LUNAR_ORBIT_RADIUS,
    Math.sin(a) * LUNAR_ORBIT_RADIUS * 0.2,
    Math.sin(a) * LUNAR_ORBIT_RADIUS,
  );
  return out;
}

/** Lunar-orbit revolutions since LOI at a mission time: two by LOI-2. */
function lunarRevs(met: number): number {
  return LOI_ANGLE + ((met - MET.loiIgnition) / Math.max(1, MET.loi2 - MET.loiIgnition)) * 2;
}

const TLI_START = PARKING_ORBIT(PARKING_START + PARKING_REVS + TLI_ARC, new Vector3());
const LOI_POINT = LUNAR_ORBIT(LOI_ANGLE, new Vector3());
const TEI_POINT = LUNAR_ORBIT(lunarRevs(MET.teiCutoff), new Vector3());
const ENTRY_POINT = new Vector3(EARTH_RADIUS + 0.12, 0, 0).applyAxisAngle(TILT_AXIS, -PLANE_TILT);

/** A bow perpendicular to the Earth–Moon line, in the tilted plane. */
function bow(amount: number, out: Vector3): Vector3 {
  return out.set(0, amount * Math.cos(PLANE_TILT), amount * Math.sin(PLANE_TILT));
}
const bowScratch = new Vector3();

/**
 * The trans-lunar coast, from the end of the TLI burn to lunar orbit.
 *
 * Eased so the spacecraft covers most of the distance early and creeps the last
 * stretch — which is what actually happens as it climbs out of Earth's well,
 * and is the only reason a three-day coast reads as decelerating rather than as
 * a constant slide. It ends exactly where lunar orbit begins.
 */
export function TRAJECTORY(t: number, out: Vector3): Vector3 {
  const eased = 1 - Math.pow(1 - t, 2.1);
  out.copy(TLI_START).lerp(LOI_POINT, eased);
  // A shallow arc rather than a straight line, so it reads as a trajectory.
  return out.add(bow(Math.sin(t * Math.PI) * EARTH_MOON_DISTANCE * 0.11, bowScratch));
}

/**
 * The trans-Earth coast, from the end of the TEI burn to entry interface.
 *
 * The mirror image of the way out: slow as it climbs away from the Moon, fast
 * as it falls toward Earth, and bowed to the other side of the Earth–Moon line
 * so the two paths read as a loop out and back rather than one line drawn
 * twice. It starts exactly where the TEI burn leaves lunar orbit.
 */
export function RETURN_TRAJECTORY(t: number, out: Vector3): Vector3 {
  const eased = Math.pow(t, 2.1);
  out.copy(TEI_POINT).lerp(ENTRY_POINT, eased);
  return out.add(bow(-Math.sin(t * Math.PI) * EARTH_MOON_DISTANCE * 0.09, bowScratch));
}

/** Where the spacecraft sits along the coast at a given fraction. */
export function coastPosition(t: number, out: Vector3): Vector3 {
  return TRAJECTORY(t, out);
}

/**
 * Where the spacecraft marker sits at any mission time.
 *
 * Derived here rather than tweened by the chapters, and that is a correctness
 * fix rather than a tidy-up. Three chapters wanted to move the marker, and a
 * chapter's tweens write their *start* value whenever that chapter renders at
 * its own time zero — so once the viewer had been to lunar orbit, scrolling
 * back to the pad left the marker parked at the Moon. Scene state has to be a
 * pure function of progress; this makes the marker one.
 *
 * Every segment starts where the last one ends. The burns are not blends
 * between two paths — a blend cut straight through the Earth at TLI — but a
 * stretch of the orbit being left.
 */
export function spacecraftAt(met: number, out: Vector3): Vector3 {
  if (met <= MET.orbitInsertion) return PARKING_ORBIT(PARKING_START, out);

  // Parking orbit, then the TLI burn as the last sliver of it.
  if (met <= MET.tliCutoff) {
    const parked = Math.min(1, (met - MET.orbitInsertion) / (MET.tliIgnition - MET.orbitInsertion));
    const burn = Math.max(0, (met - MET.tliIgnition) / (MET.tliCutoff - MET.tliIgnition));
    return PARKING_ORBIT(PARKING_START + parked * PARKING_REVS + burn * TLI_ARC, out);
  }

  // The coast, all the way to the braking burn.
  if (met <= MET.loiIgnition) {
    const t = (met - MET.tliCutoff) / (MET.loiIgnition - MET.tliCutoff);
    return TRAJECTORY(t, out);
  }

  // Captured, and orbiting through the TEI burn behind the Moon.
  if (met <= MET.teiCutoff) return LUNAR_ORBIT(lunarRevs(met), out);

  // The coast home, to entry interface.
  if (met <= MET.entryInterface) {
    const t = (met - MET.teiCutoff) / (MET.entryInterface - MET.teiCutoff);
    return RETURN_TRAJECTORY(t, out);
  }
  return RETURN_TRAJECTORY(1, out);
}

/** How much of the way-home line has been drawn at a given mission time. */
export function returnDrawn(met: number): number {
  if (met <= MET.teiCutoff) return 0;
  if (met >= MET.entryInterface) return 1;
  return (met - MET.teiCutoff) / (MET.entryInterface - MET.teiCutoff);
}

/** How much of the trajectory line has been drawn at a given mission time. */
export function trajectoryDrawn(met: number): number {
  if (met <= MET.tliIgnition) return 0;
  if (met >= MET.loiIgnition) return 1;
  return (met - MET.tliIgnition) / (MET.loiIgnition - MET.tliIgnition);
}

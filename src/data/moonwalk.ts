import { MET } from './mission';

/**
 * Where Armstrong and Aldrin are on the surface, as a function of mission time.
 *
 * Coordinates are metres in the landing-site frame: origin under Eagle's
 * centre, +X forward (west — the way Eagle flew and faced), +Z to Eagle's
 * left, surface at y = 0. The ladder is on the +X leg, footpad at x = 4.4.
 *
 * The routes are a faithful sketch rather than a survey: out of the hatch
 * backwards, down the ladder, the first step off the footpad, Aldrin nineteen
 * minutes later, the flag a few metres in front of Eagle, the experiments
 * set out to the south, and back up the ladder. Times are working values
 * from the Apollo Lunar Surface Journal, checked in TC-P5-17.
 *
 * Like data/lunarFlight.ts, this is a pure function of mission time rather than a
 * set of tweens. The moonwalk has two figures, thirty-odd waypoints and a trail
 * of footprints; as tweens that would be a hundred objects whose start values
 * every revisit has to get right. As data it reverses for free, and "reverse
 * removes them in reverse order without leaving duplicates" (TC-P3-09) holds by
 * construction.
 */

export type Crew = 'CDR' | 'LMP';

export interface Waypoint {
  met: number;
  x: number;
  y: number;
  z: number;
  /**
   * Which way the figure faces, radians about +Y; 0 faces +X. Omitted, the
   * figure faces along its direction of travel into this waypoint.
   */
  yaw?: number;
}

export interface Pose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** Visible outside the LM. */
  out: boolean;
  /** Walking on the surface (not on the ladder, not standing still). */
  walking: boolean;
  /** Stride phase, in strides, from distance walked so far. */
  stride: number;
}

/** Facing into the LM, as when backing out of the hatch or climbing the ladder. */
const FACE_LM = Math.PI;
const H = 3600;
const t = (h: number, m: number, s = 0): number => h * H + m * 60 + s;

/** Porch, top rung, bottom rung and footpad on the +X leg. */
const PORCH = { x: 2.1, y: 3.37, z: 0 };
const TOP_RUNG = { x: 2.55, y: 2.75, z: 0 };
const BOTTOM_RUNG = { x: 4.0, y: 0.62, z: 0 };
const FOOTPAD = { x: 4.45, y: 0.14, z: 0 };

/** Ground positions of the flag and the two experiments. */
export const FLAG_POS = { x: 9.6, z: 5.2 } as const;
export const PSEP_POS = { x: 6.4, z: 15.8 } as const;
export const LRRR_POS = { x: 1.6, z: 16.4 } as const;

const ROUTES: Record<Crew, readonly Waypoint[]> = {
  CDR: [
    { met: MET.hatchOpen, ...PORCH, x: 1.2, yaw: FACE_LM },
    { met: t(109, 11, 57), ...PORCH, yaw: FACE_LM },
    { met: t(109, 19, 16), ...TOP_RUNG, yaw: FACE_LM },
    { met: t(109, 21, 30), ...BOTTOM_RUNG, yaw: FACE_LM },
    { met: t(109, 23, 30), ...FOOTPAD, yaw: FACE_LM },
    // "That's one small step…" — off the footpad, turning to look out.
    { met: MET.firstStep, x: 5.05, y: 0, z: 0.15, yaw: FACE_LM },
    { met: MET.firstStep + 40, x: 5.2, y: 0, z: 0.3, yaw: 0.3 },
    { met: t(109, 31), x: 7.6, y: 0, z: 2.8 },
    { met: t(109, 36), x: 7.6, y: 0, z: 2.8, yaw: -2.4 },
    { met: t(109, 41), x: 5.6, y: 0, z: -1.6 },
    { met: t(109, 50), x: 5.6, y: 0, z: -1.6, yaw: 0.4 },
    // Out to the flag site.
    { met: t(110, 4), x: FLAG_POS.x - 0.6, y: 0, z: FLAG_POS.z - 1.1 },
    { met: MET.flag + 300, x: FLAG_POS.x - 0.6, y: 0, z: FLAG_POS.z - 1.1, yaw: 1.2 },
    // South to set out the laser reflector.
    { met: t(110, 45), x: 5.8, y: 0, z: 9.2 },
    { met: t(110, 58), x: LRRR_POS.x + 0.9, y: 0, z: LRRR_POS.z - 0.8 },
    { met: MET.lrrr + 300, x: LRRR_POS.x + 0.9, y: 0, z: LRRR_POS.z - 0.8, yaw: 2.2 },
    // Back to the ladder, and up — last in.
    { met: t(111, 31), x: 5.05, y: 0, z: 0.1 },
    { met: t(111, 32), x: 5.05, y: 0, z: 0.1, yaw: FACE_LM },
    { met: t(111, 33), ...FOOTPAD, yaw: FACE_LM },
    { met: t(111, 35, 30), ...TOP_RUNG, yaw: FACE_LM },
    { met: MET.armstrongIn - 30, ...PORCH, yaw: FACE_LM },
    { met: MET.armstrongIn, ...PORCH, x: 1.2, yaw: FACE_LM },
  ],
  LMP: [
    { met: t(109, 39), ...PORCH, x: 1.2, yaw: FACE_LM },
    { met: t(109, 39, 50), ...PORCH, yaw: FACE_LM },
    { met: t(109, 40, 40), ...TOP_RUNG, yaw: FACE_LM },
    { met: t(109, 42, 10), ...BOTTOM_RUNG, yaw: FACE_LM },
    { met: t(109, 42, 50), ...FOOTPAD, yaw: FACE_LM },
    { met: MET.aldrinOut, x: 5.0, y: 0, z: -0.5, yaw: FACE_LM },
    { met: MET.aldrinOut + 50, x: 5.1, y: 0, z: -0.6, yaw: -0.5 },
    { met: t(109, 56), x: 7.4, y: 0, z: -3.6 },
    { met: t(110, 1), x: 7.4, y: 0, z: -3.6, yaw: 1.3 },
    { met: t(110, 7, 30), x: FLAG_POS.x + 0.9, y: 0, z: FLAG_POS.z + 0.6 },
    // The salute, facing the flag and the camera.
    { met: MET.flag + 300, x: FLAG_POS.x + 0.9, y: 0, z: FLAG_POS.z + 0.6, yaw: 2.6 },
    { met: t(110, 40), x: 4.4, y: 0, z: 10.2 },
    { met: t(110, 52), x: PSEP_POS.x - 1.0, y: 0, z: PSEP_POS.z - 0.7 },
    { met: MET.psep + 600, x: PSEP_POS.x - 1.0, y: 0, z: PSEP_POS.z - 0.7, yaw: 0.6 },
    // Aldrin goes back in first.
    { met: t(111, 24), x: 5.0, y: 0, z: -0.2 },
    { met: t(111, 25), x: 5.0, y: 0, z: -0.2, yaw: FACE_LM },
    { met: t(111, 26), ...FOOTPAD, yaw: FACE_LM },
    { met: t(111, 28), ...TOP_RUNG, yaw: FACE_LM },
    { met: MET.aldrinIn - 20, ...PORCH, yaw: FACE_LM },
    { met: MET.aldrinIn, ...PORCH, x: 1.2, yaw: FACE_LM },
  ],
};

/** Length of one stride in the loping lunar gait, metres. */
export const STRIDE = 0.75;

interface Resolved extends Waypoint {
  yaw: number;
  /** Surface distance walked from the start of the route to here. */
  walked: number;
}

/** Fills in facings and cumulative distance once, at load. */
function resolve(route: readonly Waypoint[]): Resolved[] {
  const out: Resolved[] = [];
  let walked = 0;
  let lastYaw = route[0]?.yaw ?? 0;
  route.forEach((w, i) => {
    const prev = route[i - 1];
    if (prev) {
      const dx = w.x - prev.x;
      const dz = w.z - prev.z;
      const onSurface = w.y === 0 && prev.y === 0;
      const d = Math.hypot(dx, dz);
      if (onSurface) walked += d;
      if (w.yaw === undefined && d > 0.05) lastYaw = Math.atan2(-dz, dx);
    }
    const yaw = w.yaw ?? lastYaw;
    lastYaw = yaw;
    out.push({ ...w, yaw, walked });
  });
  return out;
}

const RESOLVED: Record<Crew, Resolved[]> = {
  CDR: resolve(ROUTES.CDR),
  LMP: resolve(ROUTES.LMP),
};

/** Shortest-way angle interpolation, so a turn never spins the long way round. */
function lerpAngle(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function poseAt(crew: Crew, met: number, out: Pose): Pose {
  const route = RESOLVED[crew];
  const first = route[0]!;
  const last = route[route.length - 1]!;
  out.out = met >= first.met && met < last.met;
  if (met <= first.met || met >= last.met) {
    const w = met <= first.met ? first : last;
    out.x = w.x;
    out.y = w.y;
    out.z = w.z;
    out.yaw = w.yaw;
    out.walking = false;
    out.stride = w.walked / STRIDE;
    return out;
  }
  let i = 0;
  while (i < route.length - 2 && met > route[i + 1]!.met) i += 1;
  const a = route[i]!;
  const b = route[i + 1]!;
  const f = (met - a.met) / (b.met - a.met);
  // Ease in and out of each leg, so a figure does not start or stop dead.
  const e = f * f * (3 - 2 * f);
  out.x = a.x + (b.x - a.x) * e;
  out.y = a.y + (b.y - a.y) * e;
  out.z = a.z + (b.z - a.z) * e;
  out.yaw = lerpAngle(a.yaw, b.yaw, Math.min(1, e * 4));
  const moving = a.y === 0 && b.y === 0 && Math.hypot(b.x - a.x, b.z - a.z) > 0.05;
  out.walking = moving && f > 0 && f < 1;
  out.stride = (a.walked + (b.walked - a.walked) * e) / STRIDE;
  return out;
}

export interface Footprint {
  met: number;
  x: number;
  z: number;
  yaw: number;
}

/**
 * Every boot print of the moonwalk, in the order they were made.
 *
 * Laid at each stride along each surface leg, alternating left and right. The
 * number visible at any moment is how many have a time at or before it — a
 * count, never an accumulation, so scrubbing cannot leave extra prints behind.
 */
export const FOOTPRINTS: readonly Footprint[] = (() => {
  const prints: Footprint[] = [];
  (Object.keys(RESOLVED) as Crew[]).forEach((crew) => {
    const route = RESOLVED[crew];
    let side = 1;
    for (let i = 1; i < route.length; i += 1) {
      const a = route[i - 1]!;
      const b = route[i]!;
      if (a.y !== 0 || b.y !== 0) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) continue;
      const yaw = Math.atan2(-dz, dx);
      const steps = Math.max(1, Math.floor(d / STRIDE));
      // From 1, not 0: a leg's first print is the previous leg's last.
      for (let s = 1; s <= steps; s += 1) {
        const f = s / steps;
        // Offset each print a boot's width to either side of the path.
        const ox = (-dz / d) * 0.13 * side;
        const oz = (dx / d) * 0.13 * side;
        // The smoothstep in poseAt means distance is not linear in time;
        // invert it so each print appears as the boot reaches it.
        const met = a.met + (b.met - a.met) * smoothstepInverse(f);
        prints.push({ met, x: a.x + dx * f + ox, z: a.z + dz * f + oz, yaw });
        side = -side;
      }
    }
  });
  // The first step gets its own print, right where the boot came down.
  prints.push({ met: MET.firstStep, x: 5.05, z: 0.15, yaw: 0 });
  return prints.sort((p, q) => p.met - q.met);
})();

function smoothstepInverse(y: number): number {
  // Inverse of 3t² - 2t³ on [0, 1].
  return 0.5 - Math.sin(Math.asin(1 - 2 * y) / 3);
}

/** How many footprints are down at a mission time. */
export function footprintsAt(met: number): number {
  let n = 0;
  while (n < FOOTPRINTS.length && FOOTPRINTS[n]!.met <= met) n += 1;
  return n;
}

/**
 * Deployment of each placed item, 0 before and 1 after, easing over the
 * moment it is set down: the flag pushed into the regolith, the experiments
 * lowered to the ground.
 */
export const PLACEMENTS = {
  flag: { met: MET.flag, duration: 60 },
  PSEP: { met: MET.psep, duration: 90 },
  LRRR: { met: MET.lrrr, duration: 90 },
} as const;

export type Placed = keyof typeof PLACEMENTS;

export function placedAt(item: Placed, met: number): number {
  const p = PLACEMENTS[item];
  const f = (met - (p.met - p.duration)) / p.duration;
  return Math.max(0, Math.min(1, f));
}

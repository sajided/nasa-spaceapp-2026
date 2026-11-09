import type { Viewpoint } from '../types';
import { VEHICLE_HEIGHT } from './vehicle';

/**
 * Named viewpoints.
 *
 * The camera eases between these — it never cuts (TC-P1-14). Each separation
 * viewpoint frames the joint that is about to open, far enough back that the
 * spent piece stays in shot for the whole four-beat sequence.
 *
 * The vehicle never leaves the origin (see scene/saturnV.ts on the floating
 * origin), so these are fixed positions in vehicle space rather than a chase
 * camera that has to track an ascending rocket.
 */
export const VIEWPOINTS: Record<string, Viewpoint> = {
  /** The whole stack on the pad. Far enough back that all 110 m fits. */
  pad: { px: 120, py: 72, pz: 150, tx: 0, ty: 55, tz: 0, fov: 40 },

  /** Low and close as the hold-downs release — the engines fill the frame. */
  liftoff: { px: 48, py: 20, pz: 60, tx: 0, ty: 20, tz: 0, fov: 52 },

  /** Pulling back and up as it climbs. */
  ascent: { px: 85, py: 60, pz: 105, tx: 0, ty: 50, tz: 0, fov: 46 },

  /** Level with the S-IC/S-II joint for SEP-1, wide enough to hold the
   *  falling stage in shot for the whole four-beat sequence (TC-P1-14). */
  sepSIC: { px: 104, py: 30, pz: 128, tx: 0, ty: 12, tz: 0, fov: 45 },

  /** Tighter on the interstage ring as it slides past the J-2 bells. */
  sepInterstage: { px: 68, py: 38, pz: 82, tx: 0, ty: 26, tz: 0, fov: 40 },

  /** Up at the spacecraft for the escape tower. */
  sepLES: { px: 52, py: 128, pz: 62, tx: 0, ty: 124, tz: 0, fov: 40 },

  /** The S-II/S-IVB joint. */
  sepSII: { px: 92, py: 48, pz: 112, tx: 0, ty: 38, tz: 0, fov: 45 },

  /** What is left of the stack, coasting to orbit. */
  orbit: { px: 58, py: 96, pz: 72, tx: 0, ty: 92, tz: 0, fov: 44 },

  /** The adapter opening, seen from alongside. */
  sepSLA: { px: 44, py: 96, pz: 52, tx: 0, ty: 90, tz: 0, fov: 42 },

  /** The CSM pulling clear and turning around. */
  sepCSM: { px: 38, py: 108, pz: 46, tx: 0, ty: 100, tz: 0, fov: 44 },

  /** Wide enough to hold both the CSM and the LM through extraction. */
  sepExtraction: { px: 52, py: 104, pz: 62, tx: 0, ty: 94, tz: 0, fov: 46 },

  /** Docked, looking along the joined stack. */
  docked: { px: 30, py: 100, pz: 36, tx: 0, ty: 96, tz: 0, fov: 40 },

  /**
   * Four kilometres out, where the stack is about twenty pixels tall.
   *
   * This is the handoff point: the marker in the system frame is sized to the
   * same apparent height, so switching scales here is invisible. Pulling back
   * this far is also simply what the moment calls for — the vehicle has reached
   * orbit and is now a speck.
   */
  handoff: { px: 2600, py: 1700, pz: 2600, tx: 0, ty: 55, tz: 0, fov: 46 },

  // ── System frame, in units of 1,000 km ─────────────────────────────────

  /** Earth filling the frame, the spacecraft in parking orbit. */
  earthOrbit: { px: 9.4, py: 3.1, pz: 11.8, tx: 0, ty: 0, tz: 0, fov: 45 },

  /** Pulled back for the burn that leaves Earth behind. */
  tli: { px: 17, py: 6, pz: 21, tx: 2.4, ty: 0.6, tz: 0, fov: 45 },

  /** Earth and Moon both in shot — the whole distance to cross. */
  coast: { px: 150, py: 118, pz: 300, tx: 170, ty: 8, tz: 0, fov: 45 },

  /** Closing on the Moon. */
  lunarApproach: { px: 366, py: 12, pz: 42, tx: 384.4, ty: 0, tz: 0, fov: 45 },

  /** In lunar orbit, the Moon filling the frame. */
  lunarOrbit: { px: 379, py: 2.6, pz: 6.4, tx: 384.4, ty: 0, tz: 0, fov: 45 },

  // ── Vehicle frame again, over the Moon (chapters 7–8) ─────────────────
  //
  // Eagle's centre is at LM_FLIGHT_Y ≈ 109 m and never moves; the surface is
  // brought up to it. On the ground the regolith is at LUNAR_GROUND_Y ≈ 105.6,
  // so a camera at y ≈ 107 is at eye height once Eagle has landed — and,
  // because the ground rises to meet a fixed camera, the final approach reads
  // as the camera coming down with the LM.

  /**
   * Twelve hundred metres out: the docked spacecraft about as big on screen as
   * the system-frame marker, so the switch back to metre scale is invisible.
   */
  lunarHandoff: { px: 700, py: 560, pz: 850, tx: 0, ty: 114, tz: 0, fov: 45 },

  /** Columbia and Eagle docked, the Moon below. */
  lunarDocked: { px: 34, py: 122, pz: 40, tx: 0, ty: 114, tz: 0, fov: 40 },

  /** Close on the tunnel for the undocking and the inspection turn. */
  sepUndock: { px: 22, py: 116, pz: 27, tx: 0, ty: 112, tz: 0, fov: 44 },

  /** Wide enough for both vehicles as Columbia backs off (TC-P3-01). */
  undockWide: { px: 60, py: 128, pz: 72, tx: 0, ty: 119, tz: 0, fov: 46 },

  /** Alongside Eagle, engine-first, for descent orbit insertion. */
  descentOrbit: { px: -18, py: 116, pz: 26, tx: 1, ty: 109, tz: 0, fov: 42 },

  /** Riding along through the braking phase, the surface below. */
  descentChase: { px: -14, py: 114, pz: 24, tx: 2, ty: 108, tz: 0, fov: 44 },

  /** Behind and above after the pitch-over, looking where Eagle is going. */
  highGate: { px: -16, py: 117, pz: 12, tx: 10, ty: 104, tz: 0, fov: 48 },

  /** Low and close through Armstrong's manual approach. */
  finalApproach: { px: -10, py: 112, pz: 14, tx: 4, ty: 106.5, tz: 0, fov: 50 },

  /** Eye height on the surface: the ground comes up to meet this camera. */
  touchdown: { px: 16, py: 107.3, pz: 21, tx: 0, ty: 108.4, tz: 0, fov: 46 },

  /** Pulled back for "The Eagle has landed". */
  landed: { px: 26, py: 108.6, pz: 30, tx: 0, ty: 109, tz: 0, fov: 44 },

  /** The ladder, from off the forward-left quarter, for the first step. */
  surfaceLadder: { px: 9.5, py: 107.1, pz: 6.5, tx: 4.2, ty: 106.6, tz: 0, fov: 45 },

  /** Both astronauts and Eagle. */
  surfaceWide: { px: 15, py: 108.2, pz: 12, tx: 5, ty: 106.4, tz: 1, fov: 48 },

  /** The flag, Eagle behind it. */
  surfaceFlag: { px: 15.5, py: 107.2, pz: 13, tx: 9.4, ty: 106.6, tz: 5, fov: 45 },

  /** The seismometer and the laser reflector, south of Eagle. */
  surfaceEASEP: { px: 12, py: 107.4, pz: 25, tx: 3.6, ty: 106, tz: 15, fov: 46 },

  /** Last look: Eagle, the flag and the footprints, hatch closed. */
  surfaceEnd: { px: 18, py: 108.8, pz: 18, tx: 2, ty: 107, tz: 2, fov: 46 },

  // ── Chapter 9: off the Moon and back to Columbia ──────────────────────
  // The ascent stage holds Eagle's pivot (≈109 m) and the Moon falls away;
  // Columbia docks back at its coast offset, apex down at ≈112 m.

  /** On the surface, waiting to go. */
  ascentPad: { px: 15, py: 107.4, pz: 19, tx: 0, ty: 109.5, tz: 0, fov: 46 },

  /** Wide and low for SEP-9, so both stages are in shot as they part. */
  sepAscent: { px: 17, py: 108.2, pz: 22, tx: 0, ty: 110, tz: 0, fov: 50 },

  /** One look straight back down at what stays behind (TC-P4-01). */
  lookBack: { px: 9, py: 118, pz: 13, tx: 0, ty: 55, tz: 0, fov: 50 },

  /** From below and beside, the stage climbing away from the Moon. */
  ascentClimb: { px: 16, py: 104, pz: 22, tx: 0, ty: 111, tz: 0, fov: 46 },

  /** In orbit, the Moon curving below. */
  ascentOrbit: { px: -22, py: 116, pz: 30, tx: 0, ty: 110, tz: 0, fov: 44 },

  /**
   * Over Eagle's shoulder, looking up the line Columbia is coming down: the
   * stage large in the foreground, the CSM growing out of the distance.
   */
  rendezvous: { px: 40, py: 92, pz: 30, tx: -200, ty: 250, tz: 0, fov: 50 },

  /** The last stretch down the docking axis. */
  redockApproach: { px: 38, py: 126, pz: 46, tx: 0, ty: 116, tz: 0, fov: 42 },

  /** Docked again. */
  redocked: { px: 32, py: 121, pz: 38, tx: 0, ty: 114.5, tz: 0, fov: 40 },

  /** Wide enough to hold the ascent stage as it falls away and tumbles. */
  sepAscentJettison: { px: 40, py: 118, pz: 50, tx: 0, ty: 108, tz: 0, fov: 48 },

  // ── Chapter 10: the way home ──────────────────────────────────────────
  // System frame, in units of 1,000 km.

  /** Beyond the Moon, looking back along the way home. */
  teiDeparture: { px: 400, py: 8, pz: 18, tx: 372, ty: 0, tz: 0, fov: 45 },

  /** Both bodies and both lines: out and back. */
  returnCoast: { px: 150, py: -118, pz: 300, tx: 190, ty: -8, tz: 0, fov: 45 },

  /** Earth filling the frame, the marker falling toward it. */
  earthApproach: { px: 22, py: -9, pz: 28, tx: 0, ty: 0, tz: 0, fov: 45 },

  // Back to metres. The CM's flight frame is at ≈113.75 m and never moves; the
  // ocean comes up to meet it and floats it at ≈113.1 m.

  /** Twelve hundred metres out, the spacecraft a speck against the Earth: the paired cut. */
  earthHandoff: { px: 700, py: 700, pz: 850, tx: 0, ty: 116, tz: 0, fov: 45 },

  /** The SM/CM joint, wide enough to hold the SM as it tumbles off. */
  smJettison: { px: 40, py: 127, pz: 50, tx: 0, ty: 123, tz: 0, fov: 50 },

  /** Close on the CM as it turns heat shield first. */
  cmFlip: { px: 13, py: 116, pz: 17, tx: 0, ty: 113.75, tz: 0, fov: 44 },

  /** Beside and below: the glowing shield, and the wake streaming up behind. */
  reentry: { px: 11, py: 108, pz: 15, tx: 0, ty: 117, tz: 0, fov: 52 },

  /** The drogues above the capsule. */
  drogueView: { px: 20, py: 112, pz: 27, tx: 0, ty: 119, tz: 0, fov: 56 },

  /** All three mains and the capsule under them. */
  mainsView: { px: 48, py: 104, pz: 64, tx: 0, ty: 126, tz: 0, fov: 56 },

  /** Low over the water for the splash. */
  splashdown: { px: 28, py: 116, pz: 36, tx: 0, ty: 114.5, tz: 0, fov: 48 },

  /** The end: one capsule, afloat. */
  bobbing: { px: 20, py: 116.5, pz: 26, tx: 0, ty: 113.6, tz: 0, fov: 44 },

  // ── Story mode: prologue and epilogue (system frame) ──────────────────

  /**
   * Scene 1: from just beyond the Moon, looking back at the Earth — the Moon
   * large and lonely in the foreground, home small and bright behind it.
   */
  storyOpen: { px: 392.6, py: 1.4, pz: 4.6, tx: 300, ty: -2, tz: -14, fov: 45 },
  /** The same, a little closer, as the prologue's dialogue plays. */
  storyOpenClose: { px: 391.2, py: 1.1, pz: 4.0, tx: 300, ty: -2, tz: -14, fov: 43 },

  /** Scene 7: the whole Moon, its Earth-facing side, Tranquility Base in view. */
  moonMuseum: { px: 378.6, py: 1.6, pz: 3.4, tx: 384.4, ty: 0, tz: 0, fov: 45 },

  /** Closer on the landing site, for the glow and the real photograph. */
  siteClose: { px: 380.4, py: 0.7, pz: 2.2, tx: 383.0, ty: 0, tz: 0.6, fov: 40 },

  /** From the side, so the laser from Earth crosses the frame to the site. */
  laserView: { px: 376, py: 2.4, pz: 9.5, tx: 381, ty: 0, tz: 0.5, fov: 45 },

  /** The full vehicle, used by the intro and the exploded view in Phase 5. */
  full: { px: 128, py: VEHICLE_HEIGHT / 2, pz: 158, tx: 0, ty: VEHICLE_HEIGHT / 2, tz: 0, fov: 40 },
};

export function viewpoint(key: string): Viewpoint {
  const vp = VIEWPOINTS[key];
  if (!vp) {
    throw new Error(`Unknown viewpoint '${key}'. Known: ${Object.keys(VIEWPOINTS).join(', ')}`);
  }
  return vp;
}

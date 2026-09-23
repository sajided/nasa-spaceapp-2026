/**
 * Saturn V dimensions. One scene unit is one metre.
 *
 * Stations are measured from the base of the S-IC. Heights are the real
 * vehicle's, so TC-P1-02 ("relative stage heights within 10% of the real
 * vehicle") is satisfied by construction rather than by eye — and asserted
 * against this table by `stack.spec.ts`.
 *
 * Note how the numbers add up: the commonly quoted 42.1 m S-IC, 24.8 m S-II and
 * 17.8 m S-IVB include their interstages. The S-IC/S-II interstage is broken
 * out here as its own part because the PRD's scene graph needs it to jettison
 * separately (SEP-2), so the S-II proper is 19.3 m with a 5.5 m ring below it.
 *
 * Authoritative fact-check is TC-P5-17 against the NASA Apollo 11 Flight
 * Journal; these are the working values.
 */

export interface StageSpec {
  /** Scene-graph name. Must match the PRD's spelling exactly (PRD line 167). */
  name: string;
  /** Height of the base above the S-IC base, metres. */
  base: number;
  /** Height of the part, metres. */
  height: number;
  /** Diameter at the base, metres. */
  diameter: number;
  /** Diameter at the top, where it differs (the SLA tapers). */
  topDiameter?: number;
}

export const VEHICLE_HEIGHT = 110.6;

export const STAGES: readonly StageSpec[] = [
  { name: 'S-IC', base: 0, height: 42.1, diameter: 10.1 },
  { name: 'interstage', base: 42.1, height: 5.5, diameter: 10.1 },
  { name: 'S-II', base: 47.6, height: 19.3, diameter: 10.1 },
  { name: 'S-IVB', base: 66.9, height: 17.8, diameter: 6.6 },
  { name: 'IU', base: 84.7, height: 0.9, diameter: 6.6 },
  { name: 'SLA', base: 85.6, height: 8.5, diameter: 6.6, topDiameter: 3.9 },
  { name: 'LM', base: 86.6, height: 7.0, diameter: 4.3 },
  { name: 'SM', base: 94.1, height: 4.6, diameter: 3.9 },
  { name: 'CM', base: 98.7, height: 3.5, diameter: 3.9 },
  { name: 'LES', base: 102.2, height: 8.4, diameter: 0.7 },
] as const;

/** The ten names the PRD's scene graph requires, in stack order. */
export const STAGE_NAMES = STAGES.map((s) => s.name);

export function stage(name: string): StageSpec {
  const found = STAGES.find((s) => s.name === name);
  if (!found) throw new Error(`Unknown stage '${name}'`);
  return found;
}

/** Height of the joint between a part and the one below it. */
export function jointY(name: string): number {
  return stage(name).base;
}

/**
 * The five F-1 engine positions on the S-IC thrust structure: one on the
 * centreline, four on a square at 5.2 m radius (the outboard engines gimbal;
 * the centre one is fixed).
 */
export const F1_RADIUS = 3.4;
export const F1_POSITIONS: readonly [number, number][] = [
  [0, 0],
  [F1_RADIUS, 0],
  [-F1_RADIUS, 0],
  [0, F1_RADIUS],
  [0, -F1_RADIUS],
] as const;

/**
 * Height of the S-IC thrust-structure bay, measured up from the nozzle exit
 * plane. The stage's hull begins here.
 */
export const F1_HEIGHT = 5.6;

/**
 * Exit diameter of one F-1 bell.
 *
 * The NASA engine mesh is 3.93 x 4.92 m — a wider aspect than the real bell —
 * so the instanced model is scaled to match this width rather than the bay
 * height. Driving it by height instead makes each bell 4.5 m across, which no
 * longer fits five of them inside a 10.1 m stage.
 */
export const F1_BELL_WIDTH = 3.3;

/** The four S-IC fins, at 45° to the engine square. */
export const FIN_COUNT = 4;
export const FIN_HEIGHT = 9.6;
export const FIN_SPAN = 4.2;

// ── Docking geometry ─────────────────────────────────────────────────────
//
// Chapter 4 docks the CSM nose-first onto the LM's tunnel, and from then until
// chapter 7 the LM hangs off the Command Module. Those positions used to be
// literals in the chapter and the scene builder, and they drifted apart: the
// CM nose sat three metres inside the LM at contact, and the LM's attachment
// inside the CSM ignored the CSM's 180° turn, so at extraction it jumped to the
// engine end upside down. Deriving every docked position from these few
// numbers makes that class of error impossible to reintroduce by editing one
// side only.

/** The CM's apex, measured up from the CSM origin (the SM base). */
export const CM_APEX = stage('CM').base - stage('SM').base + stage('CM').height;

/** Height of the top of the LM's docking tunnel above its footpads. */
export const LM_DOCK_HEIGHT = 6.4;

/**
 * CSM offset from its stack rest at the moment of docking: the CM apex resting
 * on the LM tunnel. The CSM is turned 180°, so its apex points down.
 */
export const CSM_DOCK_Y = stage('LM').base + LM_DOCK_HEIGHT + CM_APEX - stage('SM').base;

/** CSM offset once it has pulled the LM clear of the S-IVB, held to lunar orbit. */
export const CSM_COAST_Y = 26;

/**
 * Where the LM sits inside the turned-around CSM: below the apex, and itself
 * turned 180° so that — combined with the CSM's turn — it stays upright in the
 * world. It does not rotate at extraction; it only changes parent.
 */
export const LM_IN_CSM_Y = CM_APEX + LM_DOCK_HEIGHT;

/** Height of Eagle's attitude pivot above its footpads — roughly its centre. */
export const LM_PIVOT_Y = 3.5;

/**
 * Where Eagle's flight frame sits in the vehicle frame: the LM's centre, with
 * the docked CSM held at its coast offset.
 */
export const LM_FLIGHT_Y = stage('SM').base + CSM_COAST_Y - LM_IN_CSM_Y + LM_PIVOT_Y;

/**
 * Height of the lunar surface in the vehicle frame once Eagle has landed:
 * directly under the footpads when it is upright.
 */
export const LUNAR_GROUND_Y = LM_FLIGHT_Y - LM_PIVOT_Y;

/** Height of the LM descent stage's top deck above its footpads: the ascent stage's base. */
export const LM_ASCENT_BASE = 3.25;

// ── Chapters 9–10 ─────────────────────────────────────────────────────────

/**
 * Where the ascent stage sits inside the turned-around CSM once redocked. The
 * same drogue-to-apex contact as the first docking, one descent stage shorter.
 */
export const ASCENT_IN_CSM_Y = CM_APEX + LM_DOCK_HEIGHT - LM_ASCENT_BASE;

/** Radius of the CM's blunt apex, where the docking probe sits. */
export const CM_APEX_RADIUS = 1.0;

/**
 * Height above the heat shield where the apex cover begins. Below it is the
 * crew compartment; above it, over the parachutes, the cover jettisoned at
 * SEP-12.
 */
export const APEX_COVER_BASE = 2.6;

/** Where the parachutes' risers attach: the deck under the apex cover. */
export const PARACHUTE_MOUNT_Y = 2.75;

/** Height of the CM's centre above its heat shield — its attitude pivot. */
export const CM_PIVOT_Y = stage('CM').height / 2;

/**
 * Where the CM's flight frame sits: the CM's centre with the CSM docked at its
 * coast offset. The CSM is turned 180°, so the CM hangs apex-down below it —
 * its centre is below the CSM origin by its base offset plus half its height.
 */
export const CM_FLIGHT_Y =
  stage('SM').base + CSM_COAST_Y - (stage('CM').base - stage('SM').base) - CM_PIVOT_Y;

/**
 * How far the heat shield rides below the waterline once the CM is floating.
 * The ocean's rest height is set so that altitude 0 in data/reentry.ts puts
 * the capsule at this draft.
 */
export const CM_DRAFT = 1.1;

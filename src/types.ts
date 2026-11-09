import type { Object3D } from 'three';

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

/**
 * The animated state of one part of the stack.
 *
 * anime.js animates THESE objects, never Three.js objects. The reconciler reads
 * them once per frame and writes the result onto the scene graph. Keeping the
 * animated values in plain data is what makes scene state a pure function of
 * timeline progress — see core/reconcile.ts for why that matters.
 */
export interface PartState {
  /** Local position offset from the part's rest position, in metres. */
  x: number;
  y: number;
  z: number;
  /** Local euler rotation offset from rest, in radians. */
  rx: number;
  ry: number;
  rz: number;
  /** Local scale. 1 is rest size. */
  sx: number;
  sy: number;
  sz: number;
  opacity: number;
  /**
   * Which of the part's `attachments` it currently belongs to.
   *
   * Continuous so anime can tween it; the reconciler rounds to the nearest
   * index, so a tween from 0 to 1 flips at 0.5 exactly as the old boolean
   * `detach` did. Ordered lists rather than a home/away pair because parts do
   * not only fall off: the LM is extracted from the stack *into the CSM*, and
   * in Phase 4 the ascent stage docks and is then jettisoned.
   */
  attachment: number;
  /** >= 0.5 means visible. Continuous for the same reason as `detach`. */
  visible: number;
}

export interface RestTransform {
  pos: Vec3;
  rot: Vec3;
}

/** One place a part can live, and where it sits once it is there. */
export interface Attachment {
  parent: Object3D;
  rest: RestTransform;
}

/**
 * Binds one animated state object to one Three.js object, plus the ordered list
 * of parents it can live under. Index 0 is where the part starts.
 */
export interface PartBinding {
  name: string;
  object: Object3D;
  attachments: Attachment[];
  state: PartState;
}

/**
 * The camera, animated exactly like a part: chapters tween this plain object
 * and core/camera.ts applies it after the reconciler each frame.
 */
export interface CameraState {
  /** Camera position, metres. */
  px: number;
  py: number;
  pz: number;
  /** Look-at target, metres. */
  tx: number;
  ty: number;
  tz: number;
  fov: number;
  /** Roll about the view axis, radians. */
  roll: number;
  /**
   * Shake amplitude in metres. The displacement itself is derived from scroll
   * progress, never from elapsed time, so shaking stays deterministic under
   * scrubbing and freezes when scroll is idle.
   */
  shake: number;
}

/** A named viewpoint chapters can ease the camera to. */
export type CameraKey = string;

export interface Viewpoint {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
  fov: number;
}

/**
 * Effect channels, animated like parts but deliberately kept out of the scene
 * dump — see core/effects.ts.
 */
export interface EffectsState {
  /** F-1 cluster on the S-IC, 0..1. */
  exhaustF1: number;
  /** J-2 cluster on the S-II, 0..1. */
  exhaustJ2: number;
  /** Single J-2 on the S-IVB, 0..1. */
  exhaustJ2Single: number;
  /** Ground smoke at the pad, 0..1. */
  smoke: number;
  /** Separation flash at the joint, 0..1. */
  flash: number;
  /** Height of the flash above the stack base, metres. */
  flashY: number;
  /** Atmosphere fade: 1 at sea level, 0 in vacuum. */
  atmosphere: number;
  /**
   * Which frame is on screen: 0 the vehicle at metre scale, 1 the Earth–Moon
   * system. Thresholded at 0.5 — see core/frames.ts for why it is a hard cut.
   */
  vehicleLod: number;
  /** Fraction of the trans-lunar trajectory drawn so far, 0..1. */
  trajectory: number;
  /** Brightness of the starfield, 0 in daylight to 1 in vacuum. */
  stars: number;

  // ── Chapters 7–8 ────────────────────────────────────────────────────────
  /** LM landing gear: 0 folded for launch, 1 deployed. */
  lmLegs: number;
  /** LM descent engine, 0..1. */
  exhaustDPS: number;
  /** LM reaction-control thrusters, 0..1. */
  rcsLM: number;
  /**
   * The key light's swing from the "space" angle used since launch to the low
   * morning sun over Tranquility Base, 0..1. At 1 it also casts shadows.
   */
  lunarSun: number;
  /** Touchdown dust sheet density, 0..1. */
  dust: number;
  /**
   * How far the dust has streamed outward. Monotone through the dust window,
   * so the sheet moves only while the viewer scrolls and freezes when idle.
   */
  dustFlow: number;
  /** Fraction of the moonwalk's footprints laid down so far, 0..1. */
  footprints: number;
  /** Stride phase of each astronaut's walk, in strides. */
  walkCDR: number;
  walkLMP: number;

  // ── Chapters 9–10 ───────────────────────────────────────────────────────
  /** LM ascent engine, 0..1. */
  exhaustAPS: number;
  /** The Service Module engine seen from afar: the marker's burn glow, 0..1. */
  spsBurn: number;
  /** Reentry plasma sheath and wake, 0..1. */
  plasma: number;
  /** Splashdown spray, 0..1, and how far it has flown outward. */
  splash: number;
  splashFlow: number;

  // ── Story mode ──────────────────────────────────────────────────────────
  /**
   * The Moon's mood, 0 cold and grey (lonely, Scene 1) to 1 warm (a museum of
   * human courage, Scene 7). Steps up at the landing and the moonwalk.
   */
  moonWarmth: number;
  /** The glow marking Tranquility Base on the Moon seen from afar, 0..1. */
  siteGlow: number;
  /** The laser-ranging beam from Earth to the retroreflector, 0..1. */
  laser: number;
}

/**
 * By-name access to part states.
 *
 * `noUncheckedIndexedAccess` makes a bare record lookup `PartState | undefined`,
 * which with ten parts would mean a ten-way guard in every chapter. This throws
 * at build time instead, so a typo in a part name fails loudly while the
 * timeline is being constructed rather than silently animating nothing.
 */
export interface PartsAccessor {
  get(name: string): PartState;
  has(name: string): boolean;
  names(): string[];
}

/** Maps between scroll progress and Mission Elapsed Time. */
export interface MetMapper {
  /** MET in seconds at a global progress value. */
  metAt(progress: number): number;
  /** Global progress at a MET, in seconds. */
  progressAtMet(met: number): number;
}

export interface ChapterBuildContext {
  /** Chapter duration in timeline-ms. */
  duration: number;
  /** Absolute start of this chapter on the master timeline, in timeline-ms. */
  offset: number;
  parts: PartsAccessor;
  camera: CameraState;
  /**
   * Eases the camera to a named viewpoint. Supplies the `from` value from
   * wherever the previous chapter left it — see core/camera.ts#createCameraTrack.
   */
  cameraTo(key: CameraKey, positionMs: number, durationMs: number, ease?: string): void;
  effects: EffectsState;
  met: MetMapper;
  /**
   * Chapter-local timeline position, in ms, for a given MET. This is how every
   * event places itself: by mission time, not by hand-tuned fractions.
   */
  msAt(met: number): number;
  /** anime.js timeline instance the chapter adds its tweens to. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tl: any;
}

export interface ChapterDef {
  id: string;
  /** Share of the master timeline this chapter occupies. */
  weight: number;
  build: (ctx: ChapterBuildContext) => void;
}

/**
 * One separation event, as data.
 *
 * TC-P1-05 requires that all separations run through one shared function and
 * that adding another needs only a configuration entry. Everything that varies
 * between the twelve events lives here; core/separation.ts does the rest.
 */
export interface SeparationSpec {
  /** Stable id, e.g. 'sep-1'. Also seeds the tumble, so it must not change. */
  id: string;
  /** Scene-graph name of the part that leaves. */
  part: string;
  /**
   * Parts that go with it as one unit.
   *
   * Two shapes of this exist. The boost cover is a *child* of the escape tower
   * in the scene graph, so it rides along with no tween at all. The Command and
   * Service Modules are siblings of the CSM Group, so they have to be moved
   * into it — that is what `carriesTo` is for.
   */
  carries?: string[];
  /** Attachment index the carried parts move to. Omitted, they do not move. */
  carriesTo?: number;
  /**
   * Parts that separate at the same moment as `part` but travel independently,
   * spread radially — the four SLA panels opening like petals. They share one
   * window and one SLOW-MO badge, because they are one event.
   */
  siblings?: string[];
  /**
   * Which of the part's attachments it ends up in. Defaults to 1, the usual
   * "off the stack and into open space". SEP-7 uses this to put the LM into
   * the CSM rather than adrift.
   */
  attachTo?: number;
  /**
   * Which attachment the part leaves from. Defaults to 0, its home. SEP-8 is
   * the first event whose part is not at home when it separates: the LM is in
   * the CSM (index 2) and undocks into its own flight frame.
   */
  attachFrom?: number;
  /**
   * Peak of the joint flash, 0..1. Defaults to 1, the pyrotechnic bang of a
   * staging event. Undocking has no pyrotechnics — the capture latches let go
   * — so SEP-8 asks for a glint rather than a flash.
   */
  flashPeak?: number;
  /** Mission elapsed time of the separation, in seconds. */
  met: number;
  /** How much mission time the slow-motion sequence covers, in seconds. */
  dwellSeconds: number;
  /** Which engine glow fades at beat 1. */
  cutoff?: keyof EffectsState;
  /** Which engine lights at beat 4. */
  ignites?: keyof EffectsState;
  /** Height of the joint above the stack base, metres — where the flash goes. */
  jointY: number;
  /** Where the spent piece ends up, relative to its rest position. */
  drift: Vec3;
  /** Tumble in radians. Magnitudes are jittered from a hash of `id`. */
  tumble: Vec3;
  /**
   * Skip the jitter and turn exactly `tumble`. For a controlled rotation rather
   * than debris: SEP-8's "Eagle has wings" inspection yaw is one full turn, and
   * a jittered 1.1 turns would leave the ladder facing somewhere arbitrary.
   */
  tumbleExact?: boolean;
  /** Viewpoint the camera eases to for this event. */
  camera: CameraKey;
  /**
   * Seconds of mission time before the window opens that the camera starts
   * moving, so it is settled by beat 1 rather than still travelling. Must not
   * reach back past the previous event's window or the chapter boundary.
   */
  cameraLead: number;
}

export interface SceneDumpNode {
  name: string;
  parent: string;
  pos: Vec3;
  quat: Quat;
  visible: boolean;
}

/**
 * Procedure RP-4 in testcase.md. Shaped to be deep-equal comparable: nodes are
 * sorted by name and floats are rounded, so float noise cannot produce a false
 * diff when TC-P1-12 compares dumps before and after a full reverse pass.
 */
export interface SceneDump {
  progress: number;
  nodes: SceneDumpNode[];
}

export interface PartBounds {
  name: string;
  min: Vec3;
  max: Vec3;
  height: number;
}

export interface FrameStats {
  fps: number;
  frames: number;
  longFrames: number;
  drawCalls: number;
  triangles: number;
  jsHeapMB: number;
}

export interface ChapterPosition {
  id: string;
  index: number;
  localProgress: number;
}

export type Direction = -1 | 0 | 1;

export interface ApolloDebugAPI {
  seek(progress: number): Promise<void>;
  getProgress(): number;
  getScrollProgress(): number;
  getDirection(): Direction;
  getChapter(): ChapterPosition;
  chapterBounds(): Record<string, [number, number]>;
  dumpState(): SceneDump;
  getStats(): FrameStats;
  resetStats(): void;
  hasNaN(): boolean;
  /** MET in seconds at the current progress. */
  getMet(): number;
  /** Global progress at a mission time — how specs address events. */
  progressAtMet(met: number): number;
  /** World bounding box of a named part, for the proportions check. */
  getPartBounds(name: string): PartBounds | null;
  /** Current effect channel values. */
  getEffects(): EffectsState;
  /** Whether the current progress sits inside a separation window. */
  getSeparationWindow(): string | null;
  /** True if the named part is currently inside the camera frustum. */
  isInView(name: string): boolean;

  // ── Phase 3 ────────────────────────────────────────────────────────────
  /** Id of the callout card on screen (1202 alarm, fuel calls…), or null. */
  getCallout(): string | null;
  /** Eagle and the lunar surface at the current progress. */
  getSurface(): SurfaceReport;

  // ── Phase 4 ────────────────────────────────────────────────────────────
  /** The CM's way down at the current progress. */
  getReentry(): ReentryReport;
  /** Parent names of a part's attachments, in index order. */
  getAttachmentParents(name: string): string[];
  /** World bounds of what is drawn under any named object — not only parts. */
  getObjectBounds(name: string): PartBounds | null;
  /**
   * Apparent angular radius, radians, of the Earth and the Moon from the
   * camera, while the system frame is on screen.
   */
  getBodySizes(): { earth: number; moon: number };

  // ── Story mode ─────────────────────────────────────────────────────────
  /** The story layer's state — line, album, meter, "Let go!" — or null in classic mode. */
  getStory(): import('./ui/story/layer').StoryReport | null;
}

/** What `getReentry()` reports, for the chapter 10 checks. */
export interface ReentryReport {
  /** Whether the ocean (and the Earth seen from orbit) is being drawn. */
  visible: boolean;
  /** Profile height of the heat shield above the water, metres. */
  altitude: number;
  /** CM attitude, radians: π apex down, 0 heat shield down. */
  attitude: number;
  /** Measured: world height of the heat shield above the water surface. */
  shieldAboveWater: number;
  /** Splash particles built for the current quality tier. */
  splashCount: number;
}

/** What `getSurface()` reports, for the chapter 7–8 checks. */
export interface SurfaceReport {
  /** Whether the lunar surface is being drawn. */
  visible: boolean;
  /** Profile altitude of Eagle's footpads, metres (data/lunarFlight.ts). */
  altitude: number;
  /** Profile distance still to fly to the landing site, metres. */
  toGo: number;
  /** Eagle's attitude, radians: 0 upright, π/2 engine-first. */
  attitude: number;
  /**
   * Measured, not profiled: world height of Eagle's footpad plane above the
   * surface under it. Near zero once landed — neither sinking nor hovering.
   */
  clearance: number;
  /**
   * Measured: the descent stage's footpads above the landing site's ground,
   * once it has been left there. Zero however far the ascent stage has gone.
   */
  siteClearance: number;
  /** Dust particles built for the current quality tier. */
  dustCount: number;
  /** Footprints currently down. */
  footprints: number;
  /** Camera clip planes, which the surface owns while it is drawn. */
  near: number;
  far: number;
}

declare global {
  interface Window {
    __apollo?: ApolloDebugAPI;
  }
}

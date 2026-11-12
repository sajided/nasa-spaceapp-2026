import { Vector3, type PerspectiveCamera } from 'three';
import type { CameraState, Viewpoint } from '../types';

/**
 * The camera rig.
 *
 * The camera is animated exactly like a part: chapters tween a plain
 * `CameraState`, and this applies it once per frame right after the reconciler.
 * Keeping it in the same model means camera regressions are caught by the same
 * deep-equality dump assertions as everything else — a camera that cuts instead
 * of easing shows up as a discontinuity in the dump, not just by eye.
 */

export interface CameraRig {
  state: CameraState;
  apply(progress: number): void;
  /** World position and look-at, for the scene dump. */
  readonly position: Vector3;
  readonly target: Vector3;
}

export function createCameraState(overrides: Partial<CameraState> = {}): CameraState {
  return {
    px: 0,
    py: 60,
    pz: 140,
    tx: 0,
    ty: 55,
    tz: 0,
    fov: 50,
    roll: 0,
    shake: 0,
    ...overrides,
  };
}

/** Copies a named viewpoint into a state object, leaving shake untouched. */
export function applyViewpoint(state: CameraState, vp: Viewpoint): void {
  state.px = vp.px;
  state.py = vp.py;
  state.pz = vp.pz;
  state.tx = vp.tx;
  state.ty = vp.ty;
  state.tz = vp.tz;
  state.fov = vp.fov;
}

/**
 * Deterministic value noise on [0,1).
 *
 * Camera shake must not read the clock. A time-based shake would make the scene
 * differ between two visits to the same scroll position, which breaks the
 * determinism assertions and makes screenshot baselines impossible. Deriving the
 * displacement from progress instead gives shake that is violent while scrolling
 * through liftoff, frozen when the viewer stops (TC-P1-16), and identical on
 * every replay.
 */
function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const smooth = f * f * (3 - 2 * f);
  return hash(i) * (1 - smooth) + hash(i + 1) * smooth;
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453123;
  return s - Math.floor(s);
}

/** Shake frequencies, deliberately non-harmonic so the motion never looks cyclic. */
const SHAKE_FREQ = [733, 941, 1279] as const;

/**
 * Threads the camera's position through the chapters as they are built.
 *
 * Every tween has to declare an explicit [from, to] pair — a tween that omits
 * its start value resolves it at build time, and because each chapter is a
 * separate nested timeline, chapter 2 cannot see where chapter 1 left the
 * camera. This cursor remembers the last viewpoint written during the build and
 * supplies it as the `from`, so a chapter only has to say where it is going.
 *
 * It is a build-time construct: once the timeline is assembled it has no role.
 */
export interface CameraTrack {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  easeTo(tl: any, to: Viewpoint, position: number, duration: number, ease?: string): void;
  current(): Viewpoint;
}

export function createCameraTrack(state: CameraState, initial: Viewpoint): CameraTrack {
  let from: Viewpoint = { ...initial };
  applyViewpoint(state, initial);

  return {
    easeTo(tl, to, position, duration, ease = 'inOutSine'): void {
      tl.add(
        state,
        {
          px: [from.px, to.px],
          py: [from.py, to.py],
          pz: [from.pz, to.pz],
          tx: [from.tx, to.tx],
          ty: [from.ty, to.ty],
          tz: [from.tz, to.tz],
          fov: [from.fov, to.fov],
          duration,
          ease,
        },
        position,
      );
      from = { ...to };
    },
    current: () => ({ ...from }),
  };
}

export function createCameraRig(camera: PerspectiveCamera): CameraRig {
  const state = createCameraState();
  const position = new Vector3();
  const target = new Vector3();

  const apply = (progress: number): void => {
    position.set(state.px, state.py, state.pz);
    target.set(state.tx, state.ty, state.tz);

    if (state.shake > 0) {
      const a = state.shake;
      position.x += (noise1(progress * SHAKE_FREQ[0]) - 0.5) * 2 * a;
      position.y += (noise1(progress * SHAKE_FREQ[1]) - 0.5) * 2 * a;
      position.z += (noise1(progress * SHAKE_FREQ[2]) - 0.5) * 2 * a;
    }

    camera.position.copy(position);
    camera.up.set(Math.sin(state.roll), Math.cos(state.roll), 0);
    camera.lookAt(target);

    const fov = fitFov(state.fov, camera.aspect);
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  };

  return { state, apply, position, target };
}

/**
 * Viewpoints are authored for a 16:10 screen. On anything narrower — a tablet
 * held upright, a phone — a fixed vertical field of view crops the sides, and
 * a craft framed off-centre (the marker circling the Earth, the spacecraft
 * coasting to the Moon) slides out of shot. Below the authored aspect the
 * vertical field of view opens up to keep the authored horizontal one, up to a
 * cap past which perspective would distort more than the crop costs.
 */
const AUTHORED_ASPECT = 1.6;
const MAX_FOV = 80;

export function fitFov(fov: number, aspect: number): number {
  if (!(aspect > 0) || aspect >= AUTHORED_ASPECT) return fov;
  const half = (fov * Math.PI) / 360;
  const widened = (Math.atan((Math.tan(half) * AUTHORED_ASPECT) / aspect) * 360) / Math.PI;
  return Math.min(Math.max(fov, MAX_FOV), widened);
}

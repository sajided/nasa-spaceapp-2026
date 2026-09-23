import { Vector3, type PerspectiveCamera } from 'three';
import { CAMERA_NEAR, farFor } from './renderer';

/**
 * The camera's clip planes, set once per frame after the camera has moved.
 *
 * Two things stretch them beyond the renderer's defaults. The scale-switch
 * shots pull the camera kilometres back from the vehicle (`farFor`), and the
 * Moon needs a far plane at the horizon — hundreds of kilometres from orbit —
 * with near scaled to keep depth precision (scene/lunarSurface.ts). Everything
 * else renders in the defaults, exactly as it did before either existed.
 *
 * The subject is the vehicle frame's origin: the stack holds it, so distance
 * from it is distance from the rocket. In the system frame the camera sits a
 * few hundred units out, which leaves the defaults untouched.
 */
const origin = new Vector3();

export function applyClipPlanes(
  camera: PerspectiveCamera,
  override: { near: number; far: number } | null,
): void {
  const far = override
    ? Math.max(farFor(0), override.far)
    : farFor(camera.position.distanceTo(origin));
  const near = override ? override.near : CAMERA_NEAR;
  // A 1% dead band, so a camera easing through a shot is not rebuilding its
  // projection matrix every frame for no visible change.
  if (Math.abs(camera.far - far) > far * 0.01 || camera.near !== near) {
    camera.far = far;
    camera.near = near;
    camera.updateProjectionMatrix();
  }
}

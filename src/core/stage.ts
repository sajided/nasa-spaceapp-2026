import { AmbientLight, DirectionalLight, Scene, type Object3D, type WebGLRenderer } from 'three';
import { applyEnvironment } from '../style/environment';
import { lighting, palette } from '../style/tokens';

export interface StageBundle {
  scene: Scene;
}

/**
 * Scene, lights and image-based lighting.
 *
 * The rig lives inside the VEHICLE frame, not the scene root. Three skips
 * invisible subtrees when it gathers lights, so this rig lights the rocket and
 * nothing else — the Earth–Moon system carries its own sun, at its own angle,
 * and the two never contaminate each other.
 *
 * The light rig is deliberately the one the mission needs rather than a generic
 * three-point setup: a hard white key standing in for unfiltered sunlight, a
 * cool low fill standing in for earthshine, and a rim to separate the hull from
 * black space.
 */
export function createStage(
  renderer: WebGLRenderer,
  vehicleFrame: Object3D,
  scene: Scene,
): StageBundle {
  scene.background = palette.space;
  scene.environmentIntensity = lighting.envIntensity;

  const sun = new DirectionalLight(palette.sun, lighting.sunIntensity);
  sun.position.set(5, 6, 4);
  sun.name = 'sun';
  vehicleFrame.add(sun);

  const earthshine = new DirectionalLight(palette.earthshine, lighting.fillIntensity);
  earthshine.position.set(-3, -4, 2);
  earthshine.name = 'earthshine';
  vehicleFrame.add(earthshine);

  const rim = new DirectionalLight(palette.sun, lighting.rimIntensity);
  rim.position.set(-4, 2, -6);
  rim.name = 'rim';
  vehicleFrame.add(rim);

  // A trace of ambient so nothing reads as pure black in the shadow side.
  const ambient = new AmbientLight(palette.earthshine, 0.08);
  ambient.name = 'ambient';
  vehicleFrame.add(ambient);

  applyEnvironment(renderer, scene);

  return { scene };
}

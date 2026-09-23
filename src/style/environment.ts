import { PMREMGenerator, type Scene, type Texture, type WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * Image-based lighting for the cinematic-realism style.
 *
 * Phase 0 uses Three's procedural RoomEnvironment rather than a downloaded HDRI:
 * it costs zero bytes, which keeps the Phase 0 baseline honest as a *renderer*
 * measurement rather than a measurement of one particular HDRI's file size.
 * Phase 1 swaps in a real space HDRI within the budget in docs/asset-budget.md.
 */
export function applyEnvironment(renderer: WebGLRenderer, scene: Scene): Texture {
  const pmrem = new PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new RoomEnvironment();
  const envMap = pmrem.fromScene(envScene, 0.04).texture;

  scene.environment = envMap;

  pmrem.dispose();
  return envMap;
}

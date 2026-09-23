import { Box3, InstancedMesh, Matrix4, Mesh, Vector3, type Group, type Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { refreshMaterials } from '../core/reconcile';
import { F1_BELL_WIDTH, F1_POSITIONS } from '../data/vehicle';

/**
 * NASA's F-1 engine, instanced five times at the base of the S-IC.
 *
 * This is the one thing the downloaded Saturn V is genuinely good for. Its body
 * is a single 2,280-triangle mesh spanning the whole vehicle, but its engines
 * are separate nodes carrying 86% of the model's detail — pointed at exactly
 * the part of the rocket the camera is closest to during liftoff.
 *
 * All five are the same geometry, so `scripts/prepare-engines.mjs` extracts one
 * and this renders five instances: 5,958 triangles in a single draw call rather
 * than 29,790 across five meshes.
 *
 * Loading is best-effort. The procedural bells built by saturnV.ts stay in the
 * scene until this resolves, and are removed only on success — so a missing or
 * failed asset leaves a complete, testable rocket rather than a hole where the
 * engines should be.
 */

const MODEL_URL = 'models/f1-engine.glb';

export interface EngineSwap {
  /** Resolves true if the NASA geometry replaced the procedural bells. */
  ready: Promise<boolean>;
  dispose: () => void;
}

export function loadF1Engines(proceduralBells: Group): EngineSwap {
  let instanced: InstancedMesh | null = null;

  const ready = new Promise<boolean>((resolve) => {
    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => {
        const source = findFirstMesh(gltf.scene);
        if (!source) {
          resolve(false);
          return;
        }

        // Recentre on the bounding box, scale to the bell's exit diameter, and
        // seat it on the nozzle exit plane at y = 0. Scaling by width, not
        // height: this mesh is proportionally wider than a real F-1, so
        // matching the bay height would make five of them too wide for the
        // stage they hang from.
        source.updateWorldMatrix(true, true);
        const box = new Box3().setFromObject(source);
        const size = box.getSize(new Vector3());
        const centre = box.getCenter(new Vector3());
        const scale = size.x > 0 ? F1_BELL_WIDTH / size.x : 1;

        instanced = new InstancedMesh(source.geometry, source.material, F1_POSITIONS.length);
        instanced.name = 'F1-engines';

        const matrix = new Matrix4();
        F1_POSITIONS.forEach(([x, z], i) => {
          matrix.makeScale(scale, scale, scale);
          matrix.setPosition(
            x - centre.x * scale,
            -box.min.y * scale,
            z - centre.z * scale,
          );
          instanced!.setMatrixAt(i, matrix);
        });
        instanced.instanceMatrix.needsUpdate = true;

        // Only now is it safe to drop the placeholders.
        for (const child of [...proceduralBells.children]) {
          proceduralBells.remove(child);
          if (child instanceof Mesh) child.geometry.dispose();
        }
        proceduralBells.add(instanced);

        // The S-IC's material set was collected at registration, before this
        // geometry existed — without this, fading the S-IC would leave the
        // engines at full opacity.
        refreshMaterials('S-IC');
        resolve(true);
      },
      undefined,
      // A 404 or a parse failure is not fatal; keep the procedural bells.
      () => resolve(false),
    );
  });

  const dispose = (): void => {
    if (!instanced) return;
    instanced.geometry.dispose();
    proceduralBells.remove(instanced);
  };

  return { ready, dispose };
}

function findFirstMesh(root: Object3D): Mesh | null {
  let found: Mesh | null = null;
  root.traverse((child) => {
    if (!found && child instanceof Mesh) found = child;
  });
  return found;
}

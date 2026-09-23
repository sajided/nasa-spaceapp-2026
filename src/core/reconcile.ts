import { Mesh, type Material, type Object3D } from 'three';
import type { Attachment, PartBinding, PartState, PartsAccessor } from '../types';

/**
 * The reconciler: the one place that writes to the Three.js scene graph.
 *
 * Why this exists
 * ---------------
 * The obvious way to implement the PRD's separation model is an `onComplete`
 * callback that calls `scene.attach()` when a stage is jettisoned. That breaks
 * under exactly the conditions testcase.md tests hardest — flick-scrolling past
 * an event (TC-P1-10), stopping inside one (TC-P1-11), scrubbing a boundary
 * twenty times (TC-P1-13), jumping to a progress value out of order (TC-P4-12).
 * A callback that fires once forward and never un-fires strands a stage at the
 * scene root, and no amount of scrolling back puts it right.
 *
 * So no callback ever mutates the scene. Instead, every frame, this function
 * derives what the scene *should* look like from the animated state objects and
 * makes it so. Two properties follow:
 *
 *   1. Parent changes are decided by comparison, not by events. If the desired
 *      parent differs from the current one, re-parent; otherwise do nothing.
 *      Running it twice does the same as running it once.
 *
 *   2. The full local transform is rewritten from state every frame. `attach()`
 *      preserves world position by rewriting the local transform, which would
 *      otherwise be a source of drift across repeated re-parenting — but since
 *      the next lines overwrite it wholesale from data, that drift has nowhere
 *      to accumulate. This is what makes TC-P0-04's "no drift after 3 cycles"
 *      and TC-P1-13's "no accumulated error after 20 scrubs" hold by
 *      construction rather than by luck.
 *
 * The consequence worth stating plainly: scene state is a pure function of
 * timeline progress. The same progress produces the same scene whether it was
 * reached by slow scroll, flick-scroll, the debug slider or a test seek.
 */

const bindings: PartBinding[] = [];
const byName = new Map<string, PartBinding>();

/**
 * Materials per binding, collected once at registration.
 *
 * Opacity has to reach every mesh under a part, because the ten stack parts are
 * Groups with nested children — the Phase 0 version only handled a direct Mesh
 * and silently did nothing for a Group. Walking the subtree on every frame for
 * every part would be wasteful, so the walk happens once here.
 */
const materialsByName = new Map<string, Material[]>();

/** >= this counts as "on" for the continuous booleans anime tweens. */
const THRESHOLD = 0.5;

export function registerPart(binding: PartBinding): PartBinding {
  if (byName.has(binding.name)) {
    throw new Error(`Duplicate part name '${binding.name}'. Part names must be unique.`);
  }
  if (!binding.object.name) {
    throw new Error(`Part '${binding.name}' is bound to an unnamed Object3D.`);
  }
  if (binding.attachments.length === 0) {
    throw new Error(`Part '${binding.name}' has no attachments; it needs at least a home.`);
  }
  bindings.push(binding);
  byName.set(binding.name, binding);
  materialsByName.set(binding.name, collectMaterials(binding.object));
  return binding;
}

export function getBindings(): readonly PartBinding[] {
  return bindings;
}

export function getBinding(name: string): PartBinding | undefined {
  return byName.get(name);
}

export function clearBindings(): void {
  bindings.length = 0;
  byName.clear();
  materialsByName.clear();
}

export function createPartState(overrides: Partial<PartState> = {}): PartState {
  return {
    x: 0,
    y: 0,
    z: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    sx: 1,
    sy: 1,
    sz: 1,
    opacity: 1,
    attachment: 0,
    visible: 1,
    ...overrides,
  };
}

/** By-name access that fails loudly on a typo while a chapter is being built. */
export function createPartsAccessor(states: Record<string, PartState>): PartsAccessor {
  return {
    get(name: string): PartState {
      const state = states[name];
      if (!state) {
        throw new Error(
          `Unknown part '${name}'. Known parts: ${Object.keys(states).sort().join(', ')}`,
        );
      }
      return state;
    },
    has: (name) => Boolean(states[name]),
    names: () => Object.keys(states).sort(),
  };
}

export function reconcile(): void {
  for (const binding of bindings) {
    const { object, state } = binding;

    // Rounding, not thresholding, so a tween from 0 to 1 still flips at 0.5 —
    // but a part with three or more attachments works the same way.
    const index = clampIndex(Math.round(state.attachment), binding.attachments.length);
    const { parent: desiredParent, rest }: Attachment = binding.attachments[index]!;

    // (1) Discrete state, derived by comparison. Idempotent.
    if (object.parent !== desiredParent) {
      desiredParent.attach(object);
    }

    // (2) Continuous state, rewritten wholesale. Nothing accumulates.
    object.position.set(rest.pos[0] + state.x, rest.pos[1] + state.y, rest.pos[2] + state.z);
    object.rotation.set(rest.rot[0] + state.rx, rest.rot[1] + state.ry, rest.rot[2] + state.rz);
    object.scale.set(state.sx, state.sy, state.sz);
    object.visible = state.visible >= THRESHOLD;

    applyOpacity(binding.name, state.opacity);
  }
}

function clampIndex(value: number, length: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > length - 1 ? length - 1 : value;
}

/**
 * Re-reads a part's materials after its subtree has changed.
 *
 * `collectMaterials` runs once at registration, so anything swapped in later —
 * the NASA F-1 `InstancedMesh` replacing the procedural bells, for instance —
 * is invisible to opacity until this is called. It fails silently otherwise,
 * which is the worst kind of failure for a fade.
 */
export function refreshMaterials(name: string): void {
  const binding = byName.get(name);
  if (!binding) return;
  materialsByName.set(name, collectMaterials(binding.object));
}

/**
 * Marks a material as driving its own opacity, so a part's fade leaves it
 * alone.
 *
 * Effects that ride inside a part — Eagle's descent plume and RCS puffs — are
 * additive and set
 * their opacity every frame from an effect channel. Without this, the part's
 * `opacity: 1` would overwrite that and mark them opaque, and an opaque,
 * non-depth-writing plume is simply painted over by whatever draws after it.
 */
export function ownsOpacity(material: Material): Material {
  material.userData.ownsOpacity = true;
  return material;
}

function collectMaterials(object: Object3D): Material[] {
  const found = new Set<Material>();
  const add = (m: Material): void => {
    if (!m.userData.ownsOpacity) found.add(m);
  };
  object.traverse((child) => {
    // Meshes only. Points clouds (the pad smoke, the touchdown dust) have
    // always driven their own opacity and are not a part's to fade.
    if (!(child instanceof Mesh)) return;
    const material = child.material as Material | Material[];
    if (Array.isArray(material)) {
      for (const m of material) add(m);
    } else if (material) {
      add(material);
    }
  });
  return [...found];
}

function applyOpacity(name: string, opacity: number): void {
  const materials = materialsByName.get(name);
  if (!materials) return;
  for (const material of materials) {
    // Opacity is inert on an opaque material, so the flag has to follow the
    // value rather than being assumed at authoring time.
    material.transparent = opacity < 1;
    material.opacity = opacity;
  }
}

/**
 * Scans every animated value for NaN / Infinity (TC-P0-07). A single NaN written
 * into a transform silently removes an object from the render, so it is worth
 * asserting explicitly rather than hoping a visual check catches it.
 */
export function hasNaN(): boolean {
  for (const { state } of bindings) {
    for (const value of Object.values(state)) {
      if (typeof value === 'number' && !Number.isFinite(value)) return true;
    }
  }
  return false;
}

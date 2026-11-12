import {
  Box3,
  Frustum,
  Matrix4,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Mesh,
  type Object3D,
  type PerspectiveCamera,
  type Scene,
} from 'three';
import { getBinding, getBindings, hasNaN } from '../core/reconcile';
import { effectsHaveNaN, getEffectsState } from '../core/effects';
import { getDirection, getProgress, getScrollProgress } from '../core/progress';
import type { CameraRig } from '../core/camera';
import type { LoopBundle } from '../core/loop';
import type { TimelineBundle } from '../core/timeline';
import type { SlowMoBadge } from '../ui/slowmo';
import type { CalloutCard } from '../ui/callouts';
import type { StoryLayer } from '../ui/story/layer';
import type { LunarSurfaceScene } from '../scene/lunarSurface';
import type { SurfaceCast } from '../scene/surfaceCast';
import type { ReentryScene } from '../scene/reentry';
import { EARTH_MOON_DISTANCE, EARTH_RADIUS, MOON_RADIUS } from '../core/frames';
import { CM_PIVOT_Y } from '../data/vehicle';
import type {
  ApolloDebugAPI,
  EffectsState,
  PartBounds,
  ReentryReport,
  SceneDump,
  SceneDumpNode,
  SurfaceReport,
} from '../types';

/**
 * `window.__apollo` — the contract the automated suite drives the page through.
 *
 * This is the most reusable artifact of the project so far. Every phase's checks
 * go through it, and `dumpState()` is procedure RP-4 in testcase.md.
 *
 * Gated behind dev mode or ?debug=1 so it never ships in the production bundle,
 * which matters for the Phase 6 page-weight budget.
 */

/** Rounding for dumped floats, so float noise cannot produce a false diff. */
const PRECISION = 4;

const worldPos = new Vector3();
const worldQuat = new Quaternion();
const box = new Box3();
const frustum = new Frustum();
const viewProjection = new Matrix4();

export function isDebugEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  return new URLSearchParams(window.location.search).has('debug');
}

export interface DebugDeps {
  timeline: TimelineBundle;
  loop: LoopBundle;
  scene: Scene;
  camera: PerspectiveCamera;
  rig: CameraRig;
  badge: SlowMoBadge | null;
  callouts: CalloutCard;
  /** Story mode's layer, or null in classic mode. */
  story: StoryLayer | null;
  surface: LunarSurfaceScene;
  cast: SurfaceCast;
  reentry: ReentryScene;
}

const lmWorld = new Vector3();
const groundWorld = new Vector3();
const siteWorld = new Vector3();

export function installDebugAPI({
  timeline,
  loop,
  scene,
  camera,
  rig,
  badge,
  callouts,
  story,
  surface,
  cast,
  reentry,
}: DebugDeps): (() => void) | undefined {
  if (!isDebugEnabled()) return undefined;

  const api: ApolloDebugAPI = {
    async seek(progress: number): Promise<void> {
      timeline.seek(progress);
      // Resolve only once the change has actually been rendered: the observer
      // applies on its next scroll frame, and the reconciler on the frame after.
      await nextFrames(3);
    },

    getProgress: () => getProgress(),
    getScrollProgress: () => getScrollProgress(),
    getDirection: () => getDirection(),
    getChapter: () => timeline.chapterAt(getProgress()),
    chapterBounds: () => timeline.chapterBounds(),
    getMet: () => round(timeline.met.metAt(getProgress())),
    progressAtMet: (met: number) => timeline.met.progressAtMet(met),

    dumpState(): SceneDump {
      const nodes: SceneDumpNode[] = getBindings().map((binding) => {
        binding.object.updateWorldMatrix(true, false);
        binding.object.getWorldPosition(worldPos);
        binding.object.getWorldQuaternion(worldQuat);
        return {
          name: binding.name,
          parent: parentName(binding.object.parent, scene),
          pos: [round(worldPos.x), round(worldPos.y), round(worldPos.z)],
          quat: [round(worldQuat.x), round(worldQuat.y), round(worldQuat.z), round(worldQuat.w)],
          visible: binding.object.visible,
        };
      });

      // The camera is dumped like a part, so a camera that cuts instead of
      // easing shows up in the same deep-equality assertions as everything else.
      nodes.push({
        name: 'camera',
        parent: '(scene)',
        pos: [round(camera.position.x), round(camera.position.y), round(camera.position.z)],
        quat: [
          round(camera.quaternion.x),
          round(camera.quaternion.y),
          round(camera.quaternion.z),
          round(camera.quaternion.w),
        ],
        visible: true,
      });
      nodes.push({
        name: 'camera-target',
        parent: '(scene)',
        pos: [round(rig.target.x), round(rig.target.y), round(rig.target.z)],
        quat: [0, 0, 0, 1],
        visible: true,
      });

      // Sorted so the dump is order-independent and deep-equal comparable.
      nodes.sort((a, b) => a.name.localeCompare(b.name));

      return { progress: round(getProgress()), nodes };
    },

    getPartBounds(name: string): PartBounds | null {
      const binding = getBinding(name);
      if (!binding) return null;
      visibleBounds(binding.object, box);
      if (box.isEmpty()) return null;
      return {
        name,
        min: [round(box.min.x), round(box.min.y), round(box.min.z)],
        max: [round(box.max.x), round(box.max.y), round(box.max.z)],
        height: round(box.max.y - box.min.y),
      };
    },

    isInView(name: string): boolean {
      const binding = getBinding(name);
      if (!binding) return false;
      visibleBounds(binding.object, box);
      if (box.isEmpty()) return false;
      camera.updateMatrixWorld();
      viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(viewProjection);
      return frustum.intersectsBox(box);
    },

    /**
     * Where a part lands on screen: its visible bounds projected to NDC
     * (-1..1 is on screen), and how much of that rectangle is inside the
     * viewport. Used to sweep the flight for a craft framed out of shot.
     */
    screenRect(name: string): { min: [number, number]; max: [number, number]; onScreen: number; behind: boolean } | null {
      const binding = getBinding(name);
      if (!binding || !isDrawn(binding.object)) return null;
      visibleBounds(binding.object, box);
      if (box.isEmpty()) return null;
      camera.updateMatrixWorld();
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      let behind = false;
      for (let i = 0; i < 8; i++) {
        worldPos.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
        worldPos.applyMatrix4(camera.matrixWorldInverse);
        if (worldPos.z > -camera.near) behind = true;
        worldPos.applyMatrix4(camera.projectionMatrix);
        x0 = Math.min(x0, worldPos.x); x1 = Math.max(x1, worldPos.x);
        y0 = Math.min(y0, worldPos.y); y1 = Math.max(y1, worldPos.y);
      }
      const area = Math.max(1e-9, (x1 - x0) * (y1 - y0));
      const ix = Math.max(0, Math.min(1, x1) - Math.max(-1, x0));
      const iy = Math.max(0, Math.min(1, y1) - Math.max(-1, y0));
      return { min: [round(x0), round(y0)], max: [round(x1), round(y1)], onScreen: behind ? 0 : round((ix * iy) / area), behind };
    },

    getEffects(): EffectsState {
      const state = getEffectsState();
      if (!state) throw new Error('Effects state not initialised');
      return { ...state };
    },

    getSeparationWindow: () => badge?.activeWindow(getProgress()) ?? null,

    getStats: () => loop.stats(),
    resetStats: () => loop.resetStats(),
    hasNaN: () => hasNaN() || effectsHaveNaN(),

    // ── Phase 4 ──
    getReentry(): ReentryReport {
      const ocean = getBinding('ocean');
      const cmFlight = getBinding('CM-flight');
      let above = 0;
      if (ocean && cmFlight) {
        ocean.object.updateWorldMatrix(true, false);
        cmFlight.object.updateWorldMatrix(true, false);
        ocean.object.getWorldPosition(groundWorld);
        cmFlight.object.getWorldPosition(lmWorld);
        // Heat shield below the pivot when upright, above it when apex down.
        const shield = lmWorld.y - CM_PIVOT_Y * Math.cos(reentry.reentry.attitude);
        above = shield - groundWorld.y;
      }
      return {
        visible: ocean?.object.visible ?? false,
        altitude: round(reentry.reentry.altitude),
        attitude: round(reentry.reentry.attitude),
        shieldAboveWater: round(above),
        splashCount: reentry.splashCount,
      };
    },

    getAttachmentParents: (name: string): string[] =>
      getBinding(name)?.attachments.map((a) => parentName(a.parent, scene)) ?? [],

    getObjectBounds(name: string): PartBounds | null {
      const object = scene.getObjectByName(name);
      if (!object || !isDrawn(object)) return null;
      visibleBounds(object, box);
      if (box.isEmpty()) return null;
      return {
        name,
        min: [round(box.min.x), round(box.min.y), round(box.min.z)],
        max: [round(box.max.x), round(box.max.y), round(box.max.z)],
        height: round(box.max.y - box.min.y),
      };
    },

    getBodySizes(): { earth: number; moon: number } {
      const p = camera.position;
      const dEarth = p.length();
      const dMoon = Math.hypot(p.x - EARTH_MOON_DISTANCE, p.y, p.z);
      return {
        earth: round(Math.asin(Math.min(1, EARTH_RADIUS / dEarth))),
        moon: round(Math.asin(Math.min(1, MOON_RADIUS / dMoon))),
      };
    },

    getCallout: () => callouts.active(timeline.met.metAt(getProgress())),

    getStory: () => story?.report() ?? null,

    getSurface(): SurfaceReport {
      const lm = getBinding('LM');
      surface.group.updateWorldMatrix(true, false);
      surface.group.getWorldPosition(groundWorld);
      if (lm) {
        lm.object.updateWorldMatrix(true, false);
        lm.object.getWorldPosition(lmWorld);
      }
      return {
        visible: surface.group.visible,
        altitude: round(surface.flight.altitude),
        toGo: round(surface.flight.toGo),
        attitude: round(surface.flight.attitude),
        clearance: round(lmWorld.y - groundWorld.y),
        siteClearance: round(lmWorld.y - surface.site.getWorldPosition(siteWorld).y),
        dustCount: surface.dustCount,
        footprints: cast.footprintCount(),
        near: round(camera.near),
        far: round(camera.far),
      };
    },
  };

  window.__apollo = api;

  // RP-4 by keyboard, as testcase.md describes it: D logs the scene dump.
  // Ignored while typing in a field, so it cannot hijack the debug slider.
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== 'd' && event.key !== 'D') return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    const dump = api.dumpState();
    // eslint-disable-next-line no-console
    console.info(`[RP-4] progress ${dump.progress}\n` + dump.nodes
      .map((n) => `${n.name} → ${n.parent} → (${n.pos.join(', ')})${n.visible ? '' : ' [hidden]'}`)
      .join('\n'));
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}

/**
 * World bounds of what is actually drawn under an object.
 *
 * `Box3.setFromObject` counts invisible children too, which stopped being
 * harmless once parts started carrying their own effects: the LM's descent
 * plume, hidden, still hangs five metres below the footpads, and measured that
 * way Eagle is eleven metres tall. Both callers — proportions and "is it in
 * shot" — are about what the viewer sees, so hidden subtrees are skipped.
 */
function visibleBounds(root: Object3D, target: Box3): Box3 {
  target.makeEmpty();
  root.updateWorldMatrix(true, true);
  const visit = (object: Object3D): void => {
    if (!object.visible) return;
    const geometry = (object as Mesh).geometry as BufferGeometry | undefined;
    const drawable = (object as Mesh).isMesh || (object as { isLine?: boolean }).isLine;
    if (drawable && geometry) {
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      meshBox.copy(geometry.boundingBox!).applyMatrix4(object.matrixWorld);
      target.union(meshBox);
    }
    for (const child of object.children) visit(child);
  };
  visit(root);
  return target;
}

const meshBox = new Box3();

/** True if the object and every ancestor are visible — actually on screen. */
function isDrawn(object: Object3D): boolean {
  for (let o: Object3D | null = object; o; o = o.parent) if (!o.visible) return false;
  return true;
}

/**
 * The scene root reports as `(scene)`, and anything else must have a name.
 *
 * The Phase 0 version used `parent?.name || '(root)'`, which collapsed any
 * unnamed Group to the same string as the scene root — so a part that had been
 * re-parented into an unnamed intermediate would report as detached and a
 * re-parent assertion would pass when it should fail. With a nested stack that
 * is a live hazard, so an unnamed parent is now an explicit error value rather
 * than a plausible-looking one.
 */
function parentName(parent: unknown, scene: Scene): string {
  if (!parent) return '(none)';
  if (parent === scene) return '(scene)';
  const name = (parent as { name?: string }).name;
  return name && name.length > 0 ? name : '(UNNAMED)';
}

function round(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** PRECISION;
  // `+ 0` normalises -0 to 0 so dumps of the same state always compare equal.
  return Math.round(value * factor) / factor + 0;
}

function nextFrames(count: number): Promise<void> {
  return new Promise((resolve) => {
    let remaining = count;
    const step = (): void => {
      remaining -= 1;
      if (remaining <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ownsOpacity } from '../core/reconcile';
import { LM_ASCENT_BASE, LM_DOCK_HEIGHT } from '../data/vehicle';
import { palette } from '../style/tokens';
import type { EffectsState } from '../types';

/**
 * The Lunar Module, Eagle, built in code.
 *
 * Phase 1 gave the LM two bare cylinders, which was enough to ride inside the
 * adapter. From chapter 7 it is the subject of the shot, so it gets its real
 * silhouette: a gold-foil octagonal descent stage on four splayed legs, and the
 * angular, faceted ascent stage on top.
 *
 * Two things matter structurally, not just visually:
 *
 *   - The two stages are separate named Groups, `LM-descent-stage` and
 *     `LM-ascent-stage`. SEP-9 in Phase 4 lifts the ascent stage off the
 *     descent stage and leaves the descent stage on the Moon, and TC-P3-10 asks
 *     that the split exist under names the scene graph can use.
 *
 *   - The local origin is the footpad plane. "On the surface" is then simply
 *     y = 0 in the LM's frame, which is what the touchdown clearance check
 *     (TC-P3-06) measures against.
 *
 * Draw calls are kept down by merging each rigid piece per material: the whole
 * LM is about a dozen calls, which matters when the moonwalk adds its own cast
 * and the shadow pass doubles the casters.
 *
 * NASA's LM GLB (PRD asset plan) is deferred to FR-13: using it needs a Blender
 * split into these same two stages, and the procedural model already carries
 * the names SEP-9 needs.
 */

/** Horizontal distance from the centreline to each deployed footpad. */
export const LM_FOOTPAD_RADIUS = 4.4;

/** Contact probe length. The probes hang below three footpads; not the ladder leg. */
const PROBE_LENGTH = 1.7;

/** Where each leg hinges on the descent stage, and how far it folds for launch. */
const LEG_PIVOT = { r: 2.3, y: 2.95 } as const;
const LEG_FOLD = -0.68;

export interface LunarModuleScene {
  descent: Group;
  ascent: Group;
  /**
   * Per-frame update from effect channels.
   * `altitude` is the footpads' height above the surface, for the contact
   * probes, which fold back as they touch rather than going underground.
   */
  apply(state: EffectsState, altitude: number): void;
  materials: Material[];
}

type Keep = <T extends BufferGeometry>(g: T) => T;

const m4 = new Matrix4();
const q = new Quaternion();
const up = new Vector3(0, 1, 0);

/** Places a geometry with a position, a direction for its Y axis, and a scale. */
function place(
  g: BufferGeometry,
  pos: [number, number, number],
  yAxis: [number, number, number] = [0, 1, 0],
  rotY = 0,
): BufferGeometry {
  const dir = new Vector3(...yAxis).normalize();
  q.setFromUnitVectors(up, dir);
  if (rotY !== 0) q.multiply(new Quaternion().setFromAxisAngle(up, rotY));
  m4.compose(new Vector3(...pos), q, new Vector3(1, 1, 1));
  g.applyMatrix4(m4);
  return g;
}

/** A rod between two points. */
function rod(a: Vector3, b: Vector3, radius: number): BufferGeometry {
  const length = a.distanceTo(b);
  const g = new CylinderGeometry(radius, radius, length, 6, 1);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dir = b.clone().sub(a);
  return place(g, [mid.x, mid.y, mid.z], [dir.x, dir.y, dir.z]);
}

function merged(keep: Keep, parts: BufferGeometry[]): BufferGeometry {
  // Built-in geometries are all indexed with position/normal/uv, which is what
  // mergeGeometries needs to accept them together.
  const g = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!g) throw new Error('LM geometry merge failed: mismatched attributes');
  return keep(g);
}

export function buildLunarModule(lm: Group, keep: Keep): LunarModuleScene {
  const gold = new MeshStandardMaterial({
    color: '#C99A3E',
    metalness: 0.92,
    roughness: 0.42,
    name: 'LM-foil',
  });
  const silver = new MeshStandardMaterial({
    color: '#B9B6AD',
    metalness: 0.55,
    roughness: 0.5,
    name: 'LM-panel',
  });
  const black = new MeshStandardMaterial({
    color: '#1E1E21',
    metalness: 0.3,
    roughness: 0.65,
    name: 'LM-black',
  });
  const engine = new MeshStandardMaterial({
    color: '#3A3836',
    metalness: 0.8,
    roughness: 0.4,
    name: 'LM-engine',
  });

  // ── Descent stage ───────────────────────────────────────────────────────
  const descent = new Group();
  descent.name = 'LM-descent-stage';
  lm.add(descent);

  {
    // The octagonal body, rotated so the flat faces carry the legs.
    const body = place(new CylinderGeometry(2.15, 2.15, 1.7, 8, 1), [0, 2.4, 0], [0, 1, 0], Math.PI / 8);
    const mesh = new Mesh(keep(body), gold);
    mesh.name = 'LM-descent-body';
    descent.add(mesh);

    const plate = place(new CylinderGeometry(2.05, 2.05, 0.08, 8, 1), [0, 1.52, 0], [0, 1, 0], Math.PI / 8);
    const bell = place(new CylinderGeometry(0.42, 0.78, 1.05, 18, 1, true), [0, 1.0, 0]);
    const under = new Mesh(merged(keep, [plate, bell]), engine);
    under.name = 'LM-descent-engine';
    descent.add(under);
  }

  // Four legs on the ±X and ±Z faces. The ladder is on the +X leg, under the
  // forward hatch: +X is "forward" — the way Eagle flew, and the way it faced
  // on the surface (west), which is what data/moonwalk.ts routes assume.
  const legs: Group[] = [];
  const probes: { mesh: Mesh; outward: Vector3 }[] = [];
  const azimuths = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
  azimuths.forEach((az, i) => {
    const leg = new Group();
    leg.name = `LM-leg-${i + 1}`;
    // Each leg's own frame: X points radially outward, Y up. The fold is a
    // rotation about Z, so one number swings the whole leg against the body.
    leg.rotation.y = -az;
    leg.position.set(0, 0, 0);
    descent.add(leg);

    const hinge = new Group();
    hinge.name = `LM-leg-${i + 1}-hinge`;
    hinge.position.set(LEG_PIVOT.r, LEG_PIVOT.y, 0);
    leg.add(hinge);

    // In the hinge frame the pivot is the origin.
    const pad = new Vector3(LM_FOOTPAD_RADIUS - LEG_PIVOT.r, 0.14 - LEG_PIVOT.y, 0);
    const pieces: BufferGeometry[] = [
      rod(new Vector3(0, 0, 0), pad, 0.075),
      // Secondary struts back to the lower corners of the body.
      rod(new Vector3(-0.2, -1.3, 0.75), pad.clone().multiplyScalar(0.55), 0.04),
      rod(new Vector3(-0.2, -1.3, -0.75), pad.clone().multiplyScalar(0.55), 0.04),
      place(new CylinderGeometry(0.45, 0.36, 0.14, 14, 1), [pad.x, pad.y - 0.07, 0]),
    ];

    const isLadderLeg = i === 0;
    if (isLadderLeg) {
      // Rails either side of the strut, and rungs between them. Nine rungs,
      // as on the real forward leg.
      const railA = rod(new Vector3(0.05, -0.1, 0.24), pad.clone().add(new Vector3(-0.1, 0.35, 0.24)), 0.02);
      const railB = rod(new Vector3(0.05, -0.1, -0.24), pad.clone().add(new Vector3(-0.1, 0.35, -0.24)), 0.02);
      pieces.push(railA, railB);
      for (let r = 1; r <= 9; r += 1) {
        const t = r / 10;
        const p = new Vector3(0.05, -0.1, 0).lerp(pad.clone().add(new Vector3(-0.1, 0.35, 0)), t);
        pieces.push(rod(new Vector3(p.x, p.y, -0.24), new Vector3(p.x, p.y, 0.24), 0.018));
      }
    }

    const legMesh = new Mesh(merged(keep, pieces), silver);
    legMesh.name = `LM-leg-${i + 1}-strut`;
    hinge.add(legMesh);

    if (!isLadderLeg) {
      const probeGroup = new Group();
      probeGroup.name = `LM-probe-${i + 1}`;
      probeGroup.position.copy(pad).add(new Vector3(0, -0.14, 0));
      hinge.add(probeGroup);
      const probe = new Mesh(
        keep(place(new CylinderGeometry(0.018, 0.018, PROBE_LENGTH, 5, 1), [0, -PROBE_LENGTH / 2, 0])),
        silver,
      );
      probe.name = `LM-probe-${i + 1}-rod`;
      probeGroup.add(probe);
      probes.push({ mesh: probe, outward: new Vector3(1, 0, 0) });
    }

    legs.push(hinge);
  });

  // ── Ascent stage ────────────────────────────────────────────────────────
  const ascent = new Group();
  ascent.name = 'LM-ascent-stage';
  ascent.position.y = LM_ASCENT_BASE;
  descent.add(ascent);

  {
    // Crew cabin: a squat cylinder facing forward, with the equipment bay
    // behind it and the docking tunnel on top. Authored facing +Z and turned
    // a quarter to face +X, the ladder's side.
    const cabin = place(new CylinderGeometry(1.18, 1.18, 2.1, 12, 1), [0, 1.3, 0.35], [0, 0, 1]);
    const aft = place(new BoxGeometry(2.7, 1.5, 1.35), [0, 1.2, -1.15]);
    const deck = place(new CylinderGeometry(1.55, 1.7, 0.35, 8, 1), [0, 0.18, 0], [0, 1, 0], Math.PI / 8);
    // Its top is the docking interface, where the CM's probe meets the drogue.
    const tunnel = place(
      new CylinderGeometry(0.42, 0.46, 0.75, 14, 1),
      [0, LM_DOCK_HEIGHT - LM_ASCENT_BASE - 0.375, 0.05],
    );
    const radar = place(new SphereGeometry(0.3, 10, 6), [0.55, 2.55, 1.15]);
    const sband = place(new SphereGeometry(0.34, 10, 6), [-1.45, 2.6, -0.4]);
    const boom = rod(new Vector3(-0.9, 2.1, -0.3), new Vector3(-1.45, 2.6, -0.4), 0.04);
    // Kept below the tunnel top: nothing may stand proud of the docking
    // interface, or the CM would dock onto an antenna.
    const vhf = rod(new Vector3(0.3, 2.2, -1.5), new Vector3(0.45, 2.95, -1.7), 0.02);
    // Four reaction-control quads on outriggers at the corners.
    const quads: BufferGeometry[] = [];
    for (const [x, z] of [
      [1.75, 1.05],
      [-1.75, 1.05],
      [1.75, -1.05],
      [-1.75, -1.05],
    ] as const) {
      quads.push(place(new BoxGeometry(0.34, 0.34, 0.34), [x, 1.9, z]));
      quads.push(rod(new Vector3(x * 0.62, 1.9, z * 0.62), new Vector3(x, 1.9, z), 0.05));
    }
    const shell = new Mesh(merged(keep, [cabin, aft, deck, tunnel, radar, sband, boom, vhf, ...quads]), silver);
    shell.name = 'LM-ascent-shell';
    shell.rotation.y = Math.PI / 2;
    ascent.add(shell);

    // The dark parts: the two triangular windows, the square forward hatch,
    // the porch, and the black thermal blanket over the upper cabin.
    const windowL = place(new ConeGeometry(0.34, 0.5, 3, 1), [0.48, 1.72, 1.43], [0, 0, 1]);
    const windowR = place(new ConeGeometry(0.34, 0.5, 3, 1), [-0.48, 1.72, 1.43], [0, 0, 1]);
    const hatch = place(new BoxGeometry(0.82, 0.82, 0.06), [0, 0.85, 1.42]);
    const porch = place(new BoxGeometry(0.9, 0.05, 0.8), [0, 0.12, 1.85]);
    const blanket = place(new BoxGeometry(2.4, 0.5, 1.2), [0, 2.1, -1.1]);
    const dark = new Mesh(merged(keep, [windowL, windowR, hatch, porch, blanket]), black);
    dark.name = 'LM-ascent-trim';
    dark.rotation.y = Math.PI / 2;
    ascent.add(dark);
  }

  // ── Descent engine plume ────────────────────────────────────────────────
  // In vacuum the exhaust is nearly invisible — no smoke, no long flame. What
  // reads is the glow at the bell and a faint cone below it, so that is all
  // this is. It is a child of the descent stage, so it pitches with Eagle.
  const plumeMaterial = new MeshBasicMaterial({
    color: palette.exhaustCore,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    name: 'plume-dps',
  });
  const glowMaterial = new MeshBasicMaterial({
    color: palette.exhaustTip,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    name: 'plume-dps-glow',
  });
  ownsOpacity(plumeMaterial);
  ownsOpacity(glowMaterial);
  const plume = new Group();
  plume.name = 'plume-dps';
  plume.visible = false;
  descent.add(plume);
  const cone = new Mesh(keep(place(new ConeGeometry(1.4, 5.5, 18, 1, true), [0, 0.48 - 2.75, 0], [0, -1, 0])), plumeMaterial);
  cone.name = 'plume-dps-core';
  const glow = new Mesh(keep(place(new SphereGeometry(0.62, 14, 8), [0, 0.62, 0])), glowMaterial);
  glow.name = 'plume-dps-glow';
  plume.add(cone, glow);

  // ── Ascent engine plume ─────────────────────────────────────────────────
  // Under the ascent stage, so it lifts off with it; the descent stage it
  // fires into stays behind as the launch pad (SEP-9). Same vacuum treatment as
  // the descent engine: a glow and a faint cone.
  const apsMaterial = ownsOpacity(
    new MeshBasicMaterial({
      color: palette.exhaustCore,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      name: 'plume-aps',
    }),
  ) as MeshBasicMaterial;
  const aps = new Group();
  aps.name = 'plume-aps';
  aps.visible = false;
  ascent.add(aps);
  const apsCone = new Mesh(keep(place(new ConeGeometry(0.9, 4.2, 16, 1, true), [0, -2.1, 0], [0, -1, 0])), apsMaterial);
  apsCone.name = 'plume-aps-core';
  const apsGlow = new Mesh(keep(place(new SphereGeometry(0.45, 12, 8), [0, 0.05, 0])), glowMaterial);
  apsGlow.name = 'plume-aps-glow';
  aps.add(apsCone, apsGlow);

  // ── RCS puffs ───────────────────────────────────────────────────────────
  const rcsMaterial = new MeshBasicMaterial({
    color: '#FFF1D6',
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    name: 'rcs-lm',
  });
  ownsOpacity(rcsMaterial);
  const puffs: BufferGeometry[] = [];
  for (const [x, z] of [
    [1.75, 1.05],
    [-1.75, 1.05],
    [1.75, -1.05],
    [-1.75, -1.05],
  ] as const) {
    puffs.push(place(new ConeGeometry(0.22, 0.9, 8, 1, true), [x, 2.55, z], [0, 1, 0]));
  }
  const rcs = new Mesh(merged(keep, puffs), rcsMaterial);
  rcs.name = 'rcs-lm';
  rcs.visible = false;
  ascent.add(rcs);

  const apply = (state: EffectsState, altitude: number): void => {
    // Landing gear: folded for launch, deployed during LM activation.
    const fold = LEG_FOLD * (1 - state.lmLegs);
    for (const hinge of legs) hinge.rotation.z = fold;

    // Contact probes fold back as the footpads close on the surface, so the
    // tip stays on the ground instead of going through it. Above 1.7 m they
    // hang straight down.
    const clearance = Math.max(0, Math.min(PROBE_LENGTH, altitude));
    const bend = state.lmLegs < 0.99 ? 0 : Math.acos(clearance / PROBE_LENGTH);
    for (const { mesh } of probes) {
      const g = mesh.parent;
      if (g) g.rotation.z = bend;
    }

    plume.visible = state.exhaustDPS > 0.01;
    if (plume.visible) {
      plume.scale.set(0.7 + state.exhaustDPS * 0.3, 0.4 + state.exhaustDPS * 0.6, 0.7 + state.exhaustDPS * 0.3);
    }
    plumeMaterial.opacity = state.exhaustDPS * 0.22;

    rcs.visible = state.rcsLM > 0.01;
    rcsMaterial.opacity = state.rcsLM * 0.5;

    aps.visible = state.exhaustAPS > 0.01;
    if (aps.visible) aps.scale.set(1, 0.4 + state.exhaustAPS * 0.6, 1);
    apsMaterial.opacity = state.exhaustAPS * 0.25;
    // The glow material is shared with the descent engine; the brighter of
    // the two engines sets it, and they never burn together.
    glowMaterial.opacity = Math.max(state.exhaustDPS, state.exhaustAPS) * 0.75;
  };

  // Eagle's shadow on the surface is the classic image of the landing site.
  // Only the lit hardware casts; the additive plume and puffs do not.
  lm.traverse((o) => {
    if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) o.castShadow = true;
  });

  return {
    descent,
    ascent,
    apply,
    materials: [gold, silver, black, engine, plumeMaterial, glowMaterial, rcsMaterial, apsMaterial],
  };
}

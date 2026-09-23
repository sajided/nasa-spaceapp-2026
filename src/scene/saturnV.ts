import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  Shape,
  Vector2,
  Vector3,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createPartState, getBinding, registerPart } from '../core/reconcile';
import {
  F1_BELL_WIDTH,
  F1_HEIGHT,
  F1_POSITIONS,
  FIN_HEIGHT,
  FIN_SPAN,
  APEX_COVER_BASE,
  ASCENT_IN_CSM_Y,
  CM_APEX_RADIUS,
  CM_FLIGHT_Y,
  CM_PIVOT_Y,
  CSM_COAST_Y,
  LM_ASCENT_BASE,
  LM_FLIGHT_Y,
  LUNAR_GROUND_Y,
  PARACHUTE_MOUNT_Y,
  LM_IN_CSM_Y,
  LM_PIVOT_Y,
  STAGES,
  stage,
} from '../data/vehicle';
import { VIEWPOINTS } from '../data/cameras';
import { drawLivery, drawRibs, type Livery, type LiverySpec } from './livery';
import { buildLunarModule, type LunarModuleScene } from './lunarModule';
import { buildParachutes } from './parachutes';
import { materials } from '../style/tokens';
import type { PartState } from '../types';

/**
 * The Saturn V, built in code as ten named Groups.
 *
 * Floating origin
 * ---------------
 * The vehicle never moves. Ascent is conveyed by moving the world past it — the
 * pad and tower fall away downward while the stack holds the origin.
 *
 * This is not a shortcut, it is what makes the separations exact. If the stack
 * climbed to orbital altitude in world space, a jettisoned stage re-parented to
 * the scene root would need its rest position recomputed from wherever the
 * rocket happened to be at that instant, and the handover would pop. Holding the
 * origin means a part's rest position is identical whether it is attached or
 * detached, so `attach()` changes the parent and nothing else — exactly the
 * property the Phase 0 probe proved. It also keeps coordinates small, so float
 * precision never becomes a problem at altitude.
 *
 * Naming
 * ------
 * Every Group is named, including intermediates. The scene dump reports a
 * node's parent by name, so an unnamed Group in the chain would report as the
 * scene root and make a re-parent assertion pass when it should fail.
 */

export interface StackScene {
  stack: Group;
  parts: Record<string, PartState>;
  /** The five F-1 bell meshes, so engines.ts can swap in the NASA model. */
  f1Bells: Group;
  /**
   * Every named part Group, so other modules can use one as a parent — the LM
   * has to become a child of the CSM at extraction, and nothing outside this
   * file could reach that Object3D before.
   */
  groups: Record<string, Group>;
  /** Eagle's per-frame effects: legs, probes, descent engine, RCS. */
  lunarModule: LunarModuleScene;
  dispose: () => void;
}

interface MaterialSet {
  hull: MeshStandardMaterial;
  dark: MeshStandardMaterial;
  engine: MeshStandardMaterial;
}

const disposables: BufferGeometry[] = [];

/**
 * The azimuth the pad camera looks from, in CylinderGeometry's convention
 * (theta from +z toward +x). Liveries put their flag and lettering here.
 */
const FRONT = Math.atan2(VIEWPOINTS.pad!.px, VIEWPOINTS.pad!.pz);

/** Bump strength for weld seams and stringers: felt in raking light, not seen head-on. */
const BUMP_SCALE = 2;

/** The F-1 fairings: from low on the bell up into the hull, centred just outboard of each engine. */
const FAIRING_BASE = 1.4;
const FAIRING_TOP = F1_HEIGHT + 3.5;
const FAIRING_OFFSET = 3.9;

/** Height of the S-II/S-IVB interstage cone. */
const SHROUD_HEIGHT = 3;

/** Azimuths of the four outboard F-1s, measured from +x toward +z. */
function outboardAzimuths(): number[] {
  return F1_POSITIONS.filter(([x, z]) => x !== 0 || z !== 0).map(([x, z]) => Math.atan2(z, x));
}

/** One geometry from many, so a cluster of small parts costs one draw call. */
function merged(parts: BufferGeometry[]): BufferGeometry {
  const out = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!out) throw new Error('saturnV: parts could not be merged');
  return out;
}

/** A round strut between two points, for the escape tower's truss. */
function strut(a: Vector3, b: Vector3, radius: number): BufferGeometry {
  const axis = new Vector3().subVectors(b, a);
  const g = new CylinderGeometry(radius, radius, axis.length(), 6, 1, true);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), axis.normalize()));
  const mid = new Vector3().addVectors(a, b).multiplyScalar(0.5);
  g.translate(mid.x, mid.y, mid.z);
  return g;
}

function geo<T extends BufferGeometry>(g: T): T {
  disposables.push(g);
  return g;
}

export function createSaturnV(vehicleFrame: Group): StackScene {
  disposables.length = 0;

  /**
   * Materials, cloned per part.
   *
   * Sharing three materials across the whole stack is cheaper, but it makes
   * `state.opacity` useless: the reconciler writes opacity onto whatever
   * materials a part's subtree contains, so fading the SLA would fade the hull
   * of every other stage with it. Draw calls are per mesh, not per material, so
   * the cost of cloning is bookkeeping rather than frames.
   */
  const materialSets = new Map<string, MaterialSet>();
  const mat = (partName: string): MaterialSet => {
    let set = materialSets.get(partName);
    if (!set) {
      set = {
        hull: new MeshStandardMaterial({ ...materials.hull, name: `${partName}-hull` }),
        dark: new MeshStandardMaterial({ ...materials.hullDark, name: `${partName}-dark` }),
        engine: new MeshStandardMaterial({
          color: materials.hullDark.color,
          metalness: 0.85,
          roughness: 0.45,
          name: `${partName}-engine`,
        }),
      };
      materialSets.set(partName, set);
    }
    return set;
  };

  const stack = new Group();
  stack.name = 'stack';
  vehicleFrame.add(stack);

  const parts: Record<string, PartState> = {};
  const groups: Record<string, Group> = {};

  /** Creates a named part Group whose local origin sits at the stage base. */
  const part = (name: string, parent: Object3D = stack): Group => {
    const g = new Group();
    g.name = name;
    parent.add(g);
    groups[name] = g;
    return g;
  };

  /** A cylinder section with its origin at its own base. */
  const tube = (
    diameter: number,
    height: number,
    material: MeshStandardMaterial,
    topDiameter = diameter,
    segments = 32,
  ): Mesh => {
    const mesh = new Mesh(
      geo(new CylinderGeometry(topDiameter / 2, diameter / 2, height, segments, 1, false)),
      material,
    );
    mesh.position.y = height / 2;
    return mesh;
  };

  // Materials and textures beyond the per-part set, disposed with the stack.
  // Each is still created for exactly one part, for the same opacity reason.
  const extraMaterials: Material[] = [];
  const textures: Texture[] = [];
  const own = <M extends Material>(m: M): M => {
    extraMaterials.push(m);
    return m;
  };
  const tex = <T extends Texture>(t: T): T => {
    textures.push(t);
    return t;
  };
  const livery = (spec: LiverySpec): Livery => {
    const l = drawLivery(spec);
    tex(l.map);
    tex(l.bump);
    return l;
  };
  const painted = (
    partName: string,
    l: Livery,
    look: { metalness: number; roughness: number } = materials.hull,
  ): MeshStandardMaterial =>
    own(
      new MeshStandardMaterial({
        color: 0xffffff,
        map: l.map,
        bumpMap: l.bump,
        bumpScale: BUMP_SCALE,
        metalness: look.metalness,
        roughness: look.roughness,
        name: `${partName}-livery`,
      }),
    );

  /**
   * A closed cylinder whose side wears a livery and whose end caps stay plain.
   *
   * Cap UVs map the whole texture onto a disc, so a painted cap would show a
   * smear of flag and roll pattern the moment a stage separates. Two groups,
   * two materials: the side, then both caps. Theta starts half a turn from
   * FRONT so the texture's centre column faces the pad camera.
   */
  const paintedTube = (
    diameter: number,
    height: number,
    side: MeshStandardMaterial,
    caps: MeshStandardMaterial,
    segments = 64,
  ): Mesh => {
    const r = diameter / 2;
    const g = geo(
      new CylinderGeometry(r, r, height, segments, 1, false, FRONT - Math.PI, Math.PI * 2),
    );
    const sideCount = segments * 6;
    g.clearGroups();
    g.addGroup(0, sideCount, 0);
    g.addGroup(sideCount, g.index!.count - sideCount, 1);
    const mesh = new Mesh(g, [side, caps]);
    mesh.position.y = height / 2;
    return mesh;
  };

  // ── S-IC ────────────────────────────────────────────────────────────────
  const sIC = part('S-IC');
  {
    const spec = stage('S-IC');
    const { hull, dark, engine } = mat('S-IC');
    const r = spec.diameter / 2;

    // The quoted 42.1 m of the S-IC is measured from the engine bell exit
    // plane, not from the thrust structure — so the bells sit *inside* the
    // stage, occupying its bottom 5.6 m, and the vehicle's base is y = 0.
    //
    // The livery follows the real stage from the bottom up — thrust structure,
    // fuel tank, intertank, LOX tank, forward skirt — compressed to fit the
    // 36.5 m body. The three stiffened sections carry the roll pattern and the
    // stringers; the two tanks are smooth white with weld seams, and the LOX
    // tank carries the flag and the lettering on the side the pad camera sees.
    const bodyHeight = spec.height - F1_HEIGHT;
    const paint = painted(
      'S-IC',
      livery({
        diameter: spec.diameter,
        height: bodyHeight,
        ppm: 32,
        roll: [
          [0, 3.5],
          [13.5, 18.5],
          [bodyHeight - 3, bodyHeight],
        ],
        ribs: [
          [0, 3.5],
          [13.5, 18.5],
          [bodyHeight - 3, bodyHeight],
        ],
        seams: [8.5, 23, 28],
        flag: { top: 32.8, width: 3.6 },
        letters: { text: 'UNITED STATES', top: 30.2, size: 0.78 },
      }),
    );
    const body = paintedTube(spec.diameter, bodyHeight, paint, hull);
    body.name = 'S-IC-body';
    // `paintedTube` centres the mesh on its own height; offset it, do not replace it.
    body.position.y += F1_HEIGHT;
    sIC.add(body);

    // Thrust structure skirt, shrouding the top of the bells.
    const skirt = new Mesh(
      geo(new CylinderGeometry(r, r - 0.5, 2.6, 32, 1, true)),
      dark,
    );
    skirt.name = 'S-IC-skirt';
    skirt.position.y = F1_HEIGHT - 1.3;
    sIC.add(skirt);

    // The engine fairings: a half-cone over the outer side of each outboard
    // F-1, flaring from the hull down to the bell. They are what gives the base
    // of a Saturn V its shape, and they are what the fins stand on. One merged
    // mesh for all four. Double-sided because the open inner face is visible
    // from below.
    const fairingMat = own(
      new MeshStandardMaterial({ ...materials.hull, side: DoubleSide, name: 'S-IC-fairing' }),
    );
    const fairings: BufferGeometry[] = [];
    for (const phi of outboardAzimuths()) {
      const h = FAIRING_TOP - FAIRING_BASE;
      const g = new CylinderGeometry(1.0, 2.4, h, 16, 1, true, 0, Math.PI);
      g.translate(FAIRING_OFFSET, FAIRING_BASE + h / 2, 0);
      g.rotateY(-phi);
      fairings.push(g);
    }
    const fairing = new Mesh(geo(merged(fairings)), fairingMat);
    fairing.name = 'S-IC-fairings';
    sIC.add(fairing);

    // Four trapezoidal fins, each rooted along its fairing's flank with a
    // swept leading edge — the real planform, rather than a triangular prism.
    const fins = new Group();
    fins.name = 'S-IC-fins';
    sIC.add(fins);
    outboardAzimuths().forEach((phi, i) => {
      const shape = new Shape([
        new Vector2(r + 1.2, 1.2),
        new Vector2(r - 0.05, 1.2 + FIN_HEIGHT * 0.8),
        new Vector2(r + FIN_SPAN, 4.6),
        new Vector2(r + FIN_SPAN, 1.2),
      ]);
      const g = new ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
      g.translate(0, 0, -0.15);
      g.rotateY(-phi);
      const fin = new Mesh(geo(g), dark);
      fin.name = `S-IC-fin-${i}`;
      fins.add(fin);
    });

    // Procedural F-1 bells. engines.ts replaces these with the NASA geometry
    // when it loads; keeping them here means the stack is complete and testable
    // whether or not that asset is available.
    const bells = new Group();
    bells.name = 'S-IC-engines';
    bells.position.y = 0;
    sIC.add(bells);
    for (const [x, z] of F1_POSITIONS) {
      const height = F1_BELL_WIDTH * 1.25;
      const bell = new Mesh(
        geo(new CylinderGeometry(F1_BELL_WIDTH * 0.28, F1_BELL_WIDTH / 2, height, 20, 1, true)),
        engine,
      );
      bell.name = `F1-${x}-${z}`;
      bell.position.set(x, height / 2, z);
      bells.add(bell);
    }
    groups['S-IC-engines'] = bells;
  }

  // ── Interstage ──────────────────────────────────────────────────────────
  {
    const spec = stage('interstage');
    const { hull, dark } = mat('interstage');
    const g = part('interstage');
    const r = spec.diameter / 2;

    // The S-IC/S-II interstage: a white, stringer-stiffened ring that falls
    // away thirty seconds after the S-IC, carrying the S-II's ullage motors.
    const skin = own(
      new MeshStandardMaterial({
        ...materials.hull,
        bumpMap: tex(
          drawRibs({ diameter: spec.diameter, height: spec.height, ppm: 24, ribs: [[0, spec.height]] }),
        ),
        bumpScale: BUMP_SCALE,
        name: 'interstage-skin',
      }),
    );
    const body = paintedTube(spec.diameter, spec.height, skin, hull);
    body.name = 'interstage-body';
    g.add(body);

    const motors: BufferGeometry[] = [];
    for (let i = 0; i < 8; i += 1) {
      const a = ((i + 0.5) / 8) * Math.PI * 2;
      const x = Math.cos(a) * (r + 0.15);
      const z = Math.sin(a) * (r + 0.15);
      const case_ = new CylinderGeometry(0.2, 0.2, 2.0, 10, 1);
      case_.translate(x, 1.5, z);
      const nose = new CylinderGeometry(0.02, 0.2, 0.5, 10, 1);
      nose.translate(x, 2.75, z);
      motors.push(case_, nose);
    }
    const ullage = new Mesh(geo(merged(motors)), dark);
    ullage.name = 'interstage-ullage-motors';
    g.add(ullage);
  }

  // ── S-II ────────────────────────────────────────────────────────────────
  {
    const spec = stage('S-II');
    const { hull, engine } = mat('S-II');
    const g = part('S-II');
    const paint = painted(
      'S-II',
      livery({
        diameter: spec.diameter,
        height: spec.height,
        ppm: 20,
        ribs: [
          [0, 2.2],
          [spec.height - 2, spec.height],
        ],
        seams: [5.5, 9, 12.5, 15],
      }),
    );
    const body = paintedTube(spec.diameter, spec.height, paint, hull);
    body.name = 'S-II-body';
    g.add(body);

    // The S-II/S-IVB interstage: the cone that steps the vehicle down from
    // 10.1 m to 6.6 m. It is structurally the S-II's — it leaves with it — so it
    // hangs off the S-II Group and wraps the S-IVB's aft skirt, as the real one
    // did. Open at both ends, and double-sided, because a separating S-II is
    // seen from above.
    const upper = stage('S-IVB').diameter / 2 + 0.05;
    const shroud = new Mesh(
      geo(new CylinderGeometry(upper, spec.diameter / 2, SHROUD_HEIGHT, 64, 1, true)),
      own(
        new MeshStandardMaterial({
          ...materials.hull,
          side: DoubleSide,
          bumpMap: tex(
            drawRibs({
              diameter: spec.diameter,
              height: SHROUD_HEIGHT,
              ppm: 20,
              ribs: [[0, SHROUD_HEIGHT]],
            }),
          ),
          bumpScale: BUMP_SCALE,
          name: 'S-II-shroud',
        }),
      ),
    );
    shroud.name = 'S-II-shroud';
    shroud.position.y = spec.height + SHROUD_HEIGHT / 2;
    g.add(shroud);

    // J-2 cluster under the S-II.
    const cluster = new Group();
    cluster.name = 'S-II-engines';
    g.add(cluster);
    for (const [x, z] of F1_POSITIONS) {
      const bell = new Mesh(geo(new CylinderGeometry(0.5, 0.95, 3.2, 16, 1, true)), engine);
      bell.name = `J2-${x}-${z}`;
      bell.position.set(x * 0.55, -1.6, z * 0.55);
      cluster.add(bell);
    }
  }

  // ── S-IVB and IU ────────────────────────────────────────────────────────
  {
    const spec = stage('S-IVB');
    const { hull, dark, engine } = mat('S-IVB');
    const g = part('S-IVB');
    const r = spec.diameter / 2;

    // Roll pattern on the aft skirt, just above where the interstage cone
    // meets it; the rest of the stage plain white.
    const paint = painted(
      'S-IVB',
      livery({
        diameter: spec.diameter,
        height: spec.height,
        ppm: 24,
        roll: [[SHROUD_HEIGHT, SHROUD_HEIGHT + 2.2]],
        ribs: [
          [0, SHROUD_HEIGHT + 2.2],
          [spec.height - 2, spec.height],
        ],
        seams: [9, 12.5],
      }),
    );
    const body = paintedTube(spec.diameter, spec.height, paint, hull);
    body.name = 'S-IVB-body';
    g.add(body);

    // The two auxiliary propulsion system modules, on opposite sides of the
    // aft skirt, set side-on to the pad camera so they read in silhouette.
    const pods: BufferGeometry[] = [];
    for (const phi of [FRONT + Math.PI / 2, FRONT - Math.PI / 2]) {
      const pod = new BoxGeometry(0.7, 1.6, 1.2);
      pod.translate(r + 0.3, SHROUD_HEIGHT + 0.9, 0);
      // FRONT is measured from +z toward +x; rotateY wants it from +x.
      pod.rotateY(phi - Math.PI / 2);
      pods.push(pod);
    }
    const aps = new Mesh(geo(merged(pods)), dark);
    aps.name = 'S-IVB-aps';
    g.add(aps);

    const single = new Mesh(geo(new CylinderGeometry(0.55, 1.05, 3.6, 16, 1, true)), engine);
    single.name = 'S-IVB-engine';
    single.position.y = -1.8;
    g.add(single);
  }
  {
    const spec = stage('IU');
    const { hull } = mat('IU');
    const g = part('IU');
    const body = tube(spec.diameter, spec.height, hull, spec.diameter, 64);
    body.name = 'IU-body';
    g.add(body);
  }

  // ── Spacecraft ──────────────────────────────────────────────────────────
  {
    // The spacecraft-LM adapter: a tapered shroud in four panels that hinge
    // outward like petals and release (SEP-5).
    //
    // Each panel's Group origin sits ON ITS HINGE LINE, at the adapter base,
    // with the geometry offset back to the stack axis. That is what makes the
    // hinge expressible at all: rotation about a Group's own origin is all the
    // reconciler writes, so putting the origin on the hinge turns `rz` into the
    // hinge angle directly, with no pivot machinery.
    const sla = stage('SLA');
    const adapter = part('SLA');
    const hingeRadius = sla.diameter / 2;

    for (let i = 0; i < 4; i += 1) {
      const name = `SLA-panel-${i + 1}`;
      const { hull } = mat(name);

      const g = new Group();
      g.name = name;
      adapter.add(g);
      groups[name] = g;

      const shell = new Mesh(
        geo(
          new CylinderGeometry(
            (sla.topDiameter ?? sla.diameter) / 2,
            hingeRadius,
            sla.height,
            10,
            1,
            true,
            -Math.PI / 4,
            Math.PI / 2,
          ),
        ),
        hull,
      );
      shell.name = `${name}-shell`;
      // Back to the stack axis from the hinge.
      shell.position.set(-hingeRadius, sla.height / 2, 0);
      g.add(shell);
    }
  }
  // The LM rides inside the SLA until Phase 2 extracts it. Built in its own
  // module, because from chapter 7 it is the subject of the shot.
  const lunarModule = buildLunarModule(part('LM'), geo);

  {
    // The Command and Service Modules fly as one rigid body from SEP-6 onward,
    // and a 180° turnaround about a shared axis is not expressible as two parts
    // each rotating about its own origin. So there is a CSM Group for them to
    // move into — empty until the transposition, which keeps the boot-time
    // scene graph exactly as the PRD describes it (PRD line 167).
    const csm = part('CSM');
    csm.visible = true;
    void csm;
  }
  {
    const spec = stage('SM');
    const { hull, engine } = mat('SM');
    const g = part('SM');
    const r = spec.diameter / 2;

    // Bare aluminium with the radiator panels picked out, and the flag and
    // UNITED STATES that Columbia carried to the Moon.
    const paint = painted(
      'SM',
      livery({
        diameter: spec.diameter,
        height: spec.height,
        ppm: 96,
        base: `#${materials.aluminium.color.getHexString()}`,
        panels: [[0.6, 3.4]],
        seams: [0.35, spec.height - 0.3],
        flag: { top: 4.0, width: 0.9 },
        letters: { text: 'UNITED STATES', top: 3.45, size: 0.2 },
      }),
      materials.aluminium,
    );
    const body = paintedTube(spec.diameter, spec.height, paint, hull, 48);
    body.name = 'SM-body';
    g.add(body);

    // Four RCS quads, each a housing with four thrusters: up, down and both
    // ways around. Set between the lettering and its neighbours, not over it.
    const quads: BufferGeometry[] = [];
    for (let k = 0; k < 4; k += 1) {
      const phi = FRONT + Math.PI / 4 + (k * Math.PI) / 2;
      const y = 3.3;
      const parts_: BufferGeometry[] = [];
      const housing = new BoxGeometry(0.3, 0.8, 0.6);
      housing.translate(r + 0.12, y, 0);
      parts_.push(housing);
      const nozzle = (): BufferGeometry => new CylinderGeometry(0.035, 0.09, 0.22, 8, 1, true);
      const up = nozzle();
      up.translate(r + 0.2, y + 0.51, 0);
      const down = nozzle();
      down.rotateX(Math.PI);
      down.translate(r + 0.2, y - 0.51, 0);
      const left = nozzle();
      left.rotateX(Math.PI / 2);
      left.translate(r + 0.2, y, 0.41);
      const right = nozzle();
      right.rotateX(-Math.PI / 2);
      right.translate(r + 0.2, y, -0.41);
      parts_.push(up, down, left, right);
      for (const p of parts_) {
        p.rotateY(phi - Math.PI / 2);
        quads.push(p);
      }
    }
    const rcs = new Mesh(geo(merged(quads)), hull);
    rcs.name = 'SM-rcs';
    g.add(rcs);

    const bell = new Mesh(geo(new CylinderGeometry(0.6, 1.4, 2.9, 16, 1, true)), engine);
    bell.name = 'SM-engine';
    bell.position.y = -1.45;
    g.add(bell);
  }
  {
    const spec = stage('CM');
    const { dark } = mat('CM');
    const g = part('CM');
    // Three pieces, because two of them leave: the body; the apex cover over
    // the parachutes, jettisoned at SEP-12; and the heat shield, which is only
    // seen once the Service Module has gone (SEP-11).
    //
    // The body and the apex cover wear the Mylar skin, not the hull paint:
    // Columbia was a mirror, and it should be the brightest thing in the frame.
    const r0 = spec.diameter / 2;
    const r1 = CM_APEX_RADIUS;
    const radiusAt = (y: number): number => r0 + (r1 - r0) * (y / spec.height);
    const body = new Mesh(
      geo(new CylinderGeometry(radiusAt(APEX_COVER_BASE), r0, APEX_COVER_BASE, 48, 1)),
      own(new MeshStandardMaterial({ ...materials.mylar, name: 'CM-mylar' })),
    );
    body.name = 'CM-body';
    body.position.y = APEX_COVER_BASE / 2;
    const shield = new Mesh(geo(new CylinderGeometry(r0, r0 * 0.96, 0.14, 48, 1)), dark);
    shield.name = 'CM-heat-shield';
    shield.position.y = 0.05;
    g.add(body, shield);

    const apex = new Group();
    apex.name = 'apex-cover';
    groups['apex-cover'] = apex;
    const apexHeight = spec.height - APEX_COVER_BASE;
    const apexShell = new Mesh(
      geo(new CylinderGeometry(r1, radiusAt(APEX_COVER_BASE), apexHeight, 48, 1)),
      own(new MeshStandardMaterial({ ...materials.mylar, name: 'apex-cover-mylar' })),
    );
    apexShell.name = 'apex-cover-shell';
    apexShell.position.y = apexHeight / 2;
    apex.add(apexShell);
    apex.position.y = APEX_COVER_BASE;
    g.add(apex);
  }
  {
    const spec = stage('LES');
    const { hull, dark } = mat('LES');
    const g = part('LES');
    const motorHeight = 3.2;
    const towerHeight = spec.height - motorHeight;

    // The motor as one turned profile: the skirt over the four canted escape
    // nozzles, the main motor case, the pitch-control motor, and the nose cone
    // with the Q-ball at its tip. It ends exactly where the old cylinder did,
    // so the stack's height is unchanged.
    const profile = [
      [0, 0],
      [0.42, 0],
      [0.55, 0.35],
      [0.55, 2.2],
      [0.4, 2.45],
      [0.3, 2.5],
      [0.3, 2.75],
      [0.22, 3.0],
      [0.08, 3.15],
      [0, motorHeight],
    ].map(([x, y]) => new Vector2(x, y));
    const motorParts: BufferGeometry[] = [new LatheGeometry(profile, 24)];
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const nozzle = new CylinderGeometry(0.12, 0.2, 0.4, 10, 1, true);
      nozzle.rotateZ(0.6);
      nozzle.translate(0.45, 0.15, 0);
      nozzle.rotateY(a);
      motorParts.push(nozzle);
    }
    const motor = new Mesh(geo(merged(motorParts)), hull);
    motor.name = 'LES-motor';
    motor.position.y = towerHeight;

    // The tower as an actual truss: four tapering legs, horizontal frames and
    // X-bracing in three bays, merged into one mesh and one draw call.
    const struts: BufferGeometry[] = [];
    const halfWidthAt = (y: number): number => 0.7 + (0.4 - 0.7) * (y / towerHeight);
    const corner = (i: number, y: number): Vector3 => {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const w = halfWidthAt(y) * Math.SQRT2;
      return new Vector3(Math.cos(a) * w, y, Math.sin(a) * w);
    };
    const bays = 3;
    for (let i = 0; i < 4; i += 1) {
      const j = (i + 1) % 4;
      struts.push(strut(corner(i, 0), corner(i, towerHeight), 0.06));
      for (let b = 0; b <= bays; b += 1) {
        const y = (b / bays) * towerHeight;
        struts.push(strut(corner(i, y), corner(j, y), 0.035));
        if (b < bays) {
          const y1 = ((b + 1) / bays) * towerHeight;
          struts.push(strut(corner(i, y), corner(j, y1), 0.03));
          struts.push(strut(corner(j, y), corner(i, y1), 0.03));
        }
      }
    }
    const tower = new Mesh(geo(merged(struts)), dark);
    tower.name = 'LES-tower';
    g.add(motor, tower);

    // The boost protective cover. It is a child of the LES Group, so when the
    // tower goes it takes the cover with it as one unit (PRD line 101) with no
    // extra animation — TC-P1-08 falls out of the scene graph rather than out
    // of two tweens that have to be kept in step.
    const coverGroup = new Group();
    coverGroup.name = 'boost-cover';
    coverGroup.position.y = -stage('CM').height;
    g.add(coverGroup);
    const cover = new Mesh(
      geo(new CylinderGeometry(1.05, stage('CM').diameter / 2 + 0.05, stage('CM').height, 48, 1, true)),
      dark,
    );
    cover.name = 'boost-cover-shell';
    cover.position.y = stage('CM').height / 2;
    coverGroup.add(cover);
    groups['boost-cover'] = coverGroup;
  }

  // ── Register every part with the reconciler ─────────────────────────────
  for (const spec of STAGES) {
    const g = groups[spec.name]!;
    const rest = {
      pos: [0, spec.base, 0] as [number, number, number],
      rot: [0, 0, 0] as [number, number, number],
    };
    const state = createPartState();
    parts[spec.name] = state;
    registerPart({
      name: spec.name,
      object: g,
      attachments: [
        { parent: stack, rest },
        // Identical rest in both: the vehicle holds the origin, so a part's
        // rest place is the same whether it is on the stack or falling away.
        { parent: vehicleFrame, rest },
      ],
      state,
    });
  }

  // The four adapter panels: hinged on the SLA, released into open space.
  for (let i = 0; i < 4; i += 1) {
    const name = `SLA-panel-${i + 1}`;
    const azimuth = (i / 4) * Math.PI * 2;
    const sla = stage('SLA');
    const hingeRadius = sla.diameter / 2;
    const rot = [0, -azimuth, 0] as [number, number, number];
    const hinge: [number, number] = [
      Math.cos(azimuth) * hingeRadius,
      Math.sin(azimuth) * hingeRadius,
    ];

    // Two rests, not one shared object. Elsewhere a part's rest is identical
    // whether it is attached or adrift, because both parents sit on the vehicle
    // origin — but a panel's home is the SLA Group, which is 85.6 m up the
    // stack. Reusing that rest against the vehicle frame drops the panel to
    // ground level the instant it releases.
    const state = createPartState();
    parts[name] = state;
    registerPart({
      name,
      object: groups[name]!,
      attachments: [
        { parent: groups['SLA']!, rest: { pos: [hinge[0], 0, hinge[1]], rot } },
        { parent: vehicleFrame, rest: { pos: [hinge[0], sla.base, hinge[1]], rot } },
      ],
      state,
    });
  }

  // The CSM, and the two modules that move into it.
  {
    const csmRest = {
      pos: [0, stage('SM').base, 0] as [number, number, number],
      rot: [0, 0, 0] as [number, number, number],
    };
    const state = createPartState();
    parts['CSM'] = state;
    registerPart({
      name: 'CSM',
      object: groups['CSM']!,
      attachments: [
        { parent: stack, rest: csmRest },
        { parent: vehicleFrame, rest: csmRest },
      ],
      state,
    });

    for (const name of ['SM', 'CM'] as const) {
      const binding = getBinding(name);
      if (!binding) continue;
      // A second attachment: inside the CSM, positioned relative to it.
      binding.attachments.push({
        parent: groups['CSM']!,
        rest: {
          pos: [0, stage(name).base - stage('SM').base, 0],
          rot: [0, 0, 0],
        },
      });
    }

    // The Lunar Module gets a THIRD attachment. It starts on the stack, and at
    // extraction it is pulled into the CSM and stays there for the rest of the
    // outbound trip — a destination that is neither its home nor open space,
    // which is the case the ordered-attachment model exists for.
    //
    // The CSM has turned 180° by then, so the LM is turned 180° inside it too:
    // the two turns cancel and the LM stays upright in the world, exactly as it
    // sat in the adapter. It hangs below the CM apex by its own tunnel height —
    // CM nose on the drogue. Both numbers come from data/vehicle.ts, shared with
    // chapter 4's docking move, so the handover at SEP-7 cannot pop.
    const lm = getBinding('LM');
    if (lm) {
      lm.attachments.push({
        parent: groups['CSM']!,
        rest: { pos: [0, LM_IN_CSM_Y, 0], rot: [0, 0, Math.PI] },
      });
    }
  }

  // Eagle's own flight frame, for chapter 7 onward.
  //
  // After undocking the LM flies itself, and its attitude swings through a
  // right angle and back — engine-first for braking, upright to land. Rotating
  // the LM about its own origin (the footpad plane) would swing the whole
  // vehicle on a seven-metre arm. So it moves into this frame, whose origin is
  // the LM's centre, and the frame is what rotates. Its attitude is derived
  // from mission time (data/lunarFlight.ts), not tweened.
  {
    const flight = new Group();
    flight.name = 'LM-flight';
    vehicleFrame.add(flight);
    groups['LM-flight'] = flight;
    const state = createPartState();
    parts['LM-flight'] = state;
    registerPart({
      name: 'LM-flight',
      object: flight,
      attachments: [{ parent: vehicleFrame, rest: { pos: [0, LM_FLIGHT_Y, 0], rot: [0, 0, 0] } }],
      state,
    });

    const lm = getBinding('LM');
    if (lm) {
      // Index 3: undocked. The frame sits exactly where the docked LM's centre
      // is, so the handover at SEP-8 changes the parent and nothing else.
      lm.attachments.push({ parent: flight, rest: { pos: [0, -LM_PIVOT_Y, 0], rot: [0, 0, 0] } });
    }
  }

  // The ascent stage is a part in its own right, with four homes: on the
  // descent stage; flying free in Eagle's flight frame after SEP-9; inside the
  // CSM once redocked; and cast off into lunar orbit at SEP-10. Each rest is the
  // stage's world pose at the moment it moves there, so no handover pops.
  {
    const state = createPartState();
    parts['LM-ascent-stage'] = state;
    registerPart({
      name: 'LM-ascent-stage',
      object: lunarModule.ascent,
      attachments: [
        { parent: lunarModule.descent, rest: { pos: [0, LM_ASCENT_BASE, 0], rot: [0, 0, 0] } },
        {
          parent: groups['LM-flight']!,
          rest: { pos: [0, LM_ASCENT_BASE - LM_PIVOT_Y, 0], rot: [0, 0, 0] },
        },
        // Turned 180° inside the turned CSM, as the whole LM was on the way out.
        { parent: groups['CSM']!, rest: { pos: [0, ASCENT_IN_CSM_Y, 0], rot: [0, 0, Math.PI] } },
        {
          parent: vehicleFrame,
          rest: { pos: [0, LUNAR_GROUND_Y + LM_ASCENT_BASE, 0], rot: [0, 0, 0] },
        },
      ],
      state,
    });
  }

  // ── The way home ────────────────────────────────────────────────────────
  // The Service Module's jettison pose: where it sits in the docked CSM, as a
  // vehicle-frame rest. The CSM is turned 180°, so the SM is upside down.
  {
    const sm = getBinding('SM');
    if (sm) {
      sm.attachments.push({
        parent: vehicleFrame,
        rest: { pos: [0, stage('SM').base + CSM_COAST_Y, 0], rot: [0, 0, Math.PI] },
      });
    }
  }

  // The CM's flight frame, for reentry. Its origin is the CM's centre, for the
  // same reason as Eagle's: the turn to heat-shield-first after SEP-11 is a
  // half turn, and about the CM's base it would swing the capsule on a
  // metre-and-a-half arm. Attitude is derived from mission time
  // (data/reentry.ts): π while docked, apex down; 0 heat shield down.
  {
    const flight = new Group();
    flight.name = 'CM-flight';
    vehicleFrame.add(flight);
    groups['CM-flight'] = flight;
    const state = createPartState();
    parts['CM-flight'] = state;
    registerPart({
      name: 'CM-flight',
      object: flight,
      attachments: [{ parent: vehicleFrame, rest: { pos: [0, CM_FLIGHT_Y, 0], rot: [0, 0, 0] } }],
      state,
    });
    const cm = getBinding('CM');
    if (cm) cm.attachments.push({ parent: flight, rest: { pos: [0, -CM_PIVOT_Y, 0], rot: [0, 0, 0] } });
  }

  // The apex cover: on the CM, then cast off at SEP-12. By then the CM is
  // upright in its flight frame, which never moves, so the jettison pose is a
  // constant.
  const heatShieldY = CM_FLIGHT_Y - CM_PIVOT_Y;
  {
    const state = createPartState();
    parts['apex-cover'] = state;
    registerPart({
      name: 'apex-cover',
      object: groups['apex-cover']!,
      attachments: [
        { parent: groups['CM']!, rest: { pos: [0, APEX_COVER_BASE, 0], rot: [0, 0, 0] } },
        { parent: vehicleFrame, rest: { pos: [0, heatShieldY + APEX_COVER_BASE, 0], rot: [0, 0, 0] } },
      ],
      state,
    });
  }

  // The parachutes, packed under the apex cover until they deploy; released
  // from the CM when their job is done — the drogues as the mains open, the
  // mains after splashdown.
  const parachutes = buildParachutes();
  for (const [name, group] of Object.entries(parachutes.groups)) {
    groups['CM']!.add(group);
    groups[name] = group;
    const state = createPartState({ visible: 0, sx: 0.05, sy: 0.05, sz: 0.05 });
    parts[name] = state;
    registerPart({
      name,
      object: group,
      attachments: [
        { parent: groups['CM']!, rest: { pos: [0, PARACHUTE_MOUNT_Y, 0], rot: [0, 0, 0] } },
        {
          parent: vehicleFrame,
          rest: { pos: [0, heatShieldY + PARACHUTE_MOUNT_Y, 0], rot: [0, 0, 0] },
        },
      ],
      state,
    });
  }

  {
    const cover = groups['boost-cover']!;
    const rest = {
      pos: [0, -stage('CM').height, 0] as [number, number, number],
      rot: [0, 0, 0] as [number, number, number],
    };
    const state = createPartState();
    parts['boost-cover'] = state;
    registerPart({
      name: 'boost-cover',
      object: cover,
      // One attachment only: it never leaves the tower, it goes where the LES
      // goes. A single-entry list says that more plainly than a home and a root
      // that happen to be the same object.
      attachments: [{ parent: groups['LES']!, rest }],
      state,
    });
  }

  const captured = [...disposables];
  const capturedMaterials = [...materialSets.values()];
  const lmMaterials = [...lunarModule.materials];
  const dispose = (): void => {
    for (const g of captured) g.dispose();
    for (const set of capturedMaterials) {
      set.hull.dispose();
      set.dark.dispose();
      set.engine.dispose();
    }
    for (const m of lmMaterials) m.dispose();
    for (const m of extraMaterials) m.dispose();
    for (const t of textures) t.dispose();
    parachutes.dispose();
    vehicleFrame.remove(stack);
  };

  return { stack, parts, f1Bells: groups['S-IC-engines']!, groups, lunarModule, dispose };
}

import {
  BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
} from 'three';
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

  // ── S-IC ────────────────────────────────────────────────────────────────
  const sIC = part('S-IC');
  {
    const spec = stage('S-IC');
    const { hull, dark, engine } = mat('S-IC');

    // The quoted 42.1 m of the S-IC is measured from the engine bell exit
    // plane, not from the thrust structure — so the bells sit *inside* the
    // stage, occupying its bottom 5.6 m, and the vehicle's base is y = 0.
    const body = tube(spec.diameter, spec.height - F1_HEIGHT, hull);
    body.name = 'S-IC-body';
    // `tube` centres the mesh on its own height; offset it, do not replace it.
    body.position.y += F1_HEIGHT;
    sIC.add(body);

    // Thrust structure skirt, shrouding the top of the bells.
    const skirt = new Mesh(
      geo(new CylinderGeometry(spec.diameter / 2, spec.diameter / 2 - 0.5, 2.6, 32, 1, true)),
      dark,
    );
    skirt.name = 'S-IC-skirt';
    skirt.position.y = F1_HEIGHT - 1.3;
    sIC.add(skirt);

    // The black roll-pattern bands, which is what makes a Saturn V readable at
    // a distance — and, during staging, what makes the roll visible at all.
    for (const [y, h] of [
      [F1_HEIGHT + 1.4, 3.0],
      [spec.height - 5.5, 2.4],
    ] as const) {
      const band = new Mesh(geo(new CylinderGeometry(5.06, 5.06, h, 32, 1, true)), dark);
      band.name = `S-IC-band-${y}`;
      band.position.y = y + h / 2;
      sIC.add(band);
    }

    const fins = new Group();
    fins.name = 'S-IC-fins';
    sIC.add(fins);
    for (let i = 0; i < 4; i += 1) {
      const fin = new Mesh(geo(new CylinderGeometry(0.1, FIN_SPAN, FIN_HEIGHT, 3, 1)), dark);
      fin.name = `S-IC-fin-${i}`;
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      fin.position.set(Math.cos(a) * 5.4, F1_HEIGHT + FIN_HEIGHT / 2, Math.sin(a) * 5.4);
      fin.rotation.y = -a;
      fins.add(fin);
    }

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

  // ── Interstage, S-II, S-IVB, IU ─────────────────────────────────────────
  for (const name of ['interstage', 'S-II', 'S-IVB', 'IU'] as const) {
    const spec = stage(name);
    const { hull, dark } = mat(name);
    const g = part(name);
    const body = tube(spec.diameter, spec.height, name === 'interstage' ? dark : hull);
    body.name = `${name}-body`;
    g.add(body);
  }
  {
    // J-2 cluster under the S-II, and the single J-2 under the S-IVB.
    const engine = mat('S-II').engine;
    const sIVBEngine = mat('S-IVB').engine;
    const sII = groups['S-II']!;
    const cluster = new Group();
    cluster.name = 'S-II-engines';
    sII.add(cluster);
    for (const [x, z] of F1_POSITIONS) {
      const bell = new Mesh(geo(new CylinderGeometry(0.5, 0.95, 3.2, 16, 1, true)), engine);
      bell.name = `J2-${x}-${z}`;
      bell.position.set(x * 0.55, -1.6, z * 0.55);
      cluster.add(bell);
    }

    const single = new Mesh(geo(new CylinderGeometry(0.55, 1.05, 3.6, 16, 1, true)), sIVBEngine);
    single.name = 'S-IVB-engine';
    single.position.y = -1.8;
    groups['S-IVB']!.add(single);
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
    const body = tube(spec.diameter, spec.height, hull, spec.diameter, 24);
    body.name = 'SM-body';
    g.add(body);
    const bell = new Mesh(geo(new CylinderGeometry(0.6, 1.4, 2.9, 16, 1, true)), engine);
    bell.name = 'SM-engine';
    bell.position.y = -1.45;
    g.add(bell);
  }
  {
    const spec = stage('CM');
    const { hull, dark } = mat('CM');
    const g = part('CM');
    // Three pieces, because two of them leave: the body; the apex cover over
    // the parachutes, jettisoned at SEP-12; and the heat shield, which is only
    // seen once the Service Module has gone (SEP-11).
    const r0 = spec.diameter / 2;
    const r1 = CM_APEX_RADIUS;
    const radiusAt = (y: number): number => r0 + (r1 - r0) * (y / spec.height);
    const body = new Mesh(
      geo(new CylinderGeometry(radiusAt(APEX_COVER_BASE), r0, APEX_COVER_BASE, 24, 1)),
      hull,
    );
    body.name = 'CM-body';
    body.position.y = APEX_COVER_BASE / 2;
    const shield = new Mesh(geo(new CylinderGeometry(r0, r0 * 0.96, 0.14, 24, 1)), dark);
    shield.name = 'CM-heat-shield';
    shield.position.y = 0.05;
    g.add(body, shield);

    const apex = new Group();
    apex.name = 'apex-cover';
    groups['apex-cover'] = apex;
    const apexHeight = spec.height - APEX_COVER_BASE;
    const apexShell = new Mesh(
      geo(new CylinderGeometry(r1, radiusAt(APEX_COVER_BASE), apexHeight, 24, 1)),
      mat('apex-cover').hull,
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
    const motor = new Mesh(geo(new CylinderGeometry(0.55, 0.55, 3.2, 16, 1)), hull);
    motor.name = 'LES-motor';
    motor.position.y = spec.height - 1.6;
    const tower = new Mesh(geo(new CylinderGeometry(0.18, 0.28, spec.height - 3.2, 8, 1, true)), dark);
    tower.name = 'LES-tower';
    tower.position.y = (spec.height - 3.2) / 2;
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
      geo(new CylinderGeometry(1.05, stage('CM').diameter / 2 + 0.05, stage('CM').height, 24, 1, true)),
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
    parachutes.dispose();
    vehicleFrame.remove(stack);
  };

  return { stack, parts, f1Bells: groups['S-IC-engines']!, groups, lunarModule, dispose };
}

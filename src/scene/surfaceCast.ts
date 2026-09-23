import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createPartState, registerPart } from '../core/reconcile';
import {
  FLAG_POS,
  FOOTPRINTS,
  LRRR_POS,
  PSEP_POS,
  footprintsAt,
  placedAt,
  poseAt,
  type Crew,
  type Placed,
  type Pose,
} from '../data/moonwalk';
import { MET } from '../data/mission';
import type { PartState } from '../types';

/**
 * The moonwalk: two astronauts, their footprints, the flag, and the two
 * experiments left behind.
 *
 * Every piece is a registered part under the landing site, so the scene dump
 * (RP-4) sees each one exactly once — TC-P3-09's "no duplicates" is checked
 * against the same list the reconciler owns. Where each one is comes from
 * data/moonwalk.ts as a function of mission time; this module turns that into
 * part state before the reconciler runs, and poses the limbs after.
 *
 * Scale is the point of TC-P3-08: a suited astronaut stood about 1.9 m to the
 * top of the life-support pack, against a seven-metre LM whose footpads sit
 * four and a half metres out. Getting that ratio right is what makes the LM
 * read as a vehicle rather than a model.
 */

export interface SurfaceCast {
  /** Derives positions and visibility from mission time. Before reconcile. */
  update(met: number): void;
  /** Limb poses and footprints. After reconcile. */
  apply(met: number): void;
  /** Footprints currently down, for the debug API. */
  footprintCount(): number;
  dispose(): void;
}

const HIP_Y = 0.9;
/** How far over the flag ends up, radians: not quite flat, propped on its crossbar. */
const FLAG_KNOCKED = 1.35;
const SHOULDER_Y = 1.42;

type Keep = <T extends BufferGeometry>(g: T) => T;

const m4 = new Matrix4();
const qa = new Quaternion();
const up = new Vector3(0, 1, 0);

function at(g: BufferGeometry, x: number, y: number, z: number, axis?: Vector3, angle = 0): BufferGeometry {
  qa.identity();
  if (axis) qa.setFromAxisAngle(axis, angle);
  m4.compose(new Vector3(x, y, z), qa, new Vector3(1, 1, 1));
  g.applyMatrix4(m4);
  return g;
}

function merge(keep: Keep, parts: BufferGeometry[]): BufferGeometry {
  const g = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!g) throw new Error('surface cast geometry merge failed');
  return keep(g);
}

interface Figure {
  crew: Crew;
  group: Group;
  state: PartState;
  legs: [Group, Group];
  arms: [Group, Group];
  pose: Pose;
}

export function createSurfaceCast(site: Group): SurfaceCast {
  const geometries: BufferGeometry[] = [];
  const keep: Keep = (g) => {
    geometries.push(g);
    return g;
  };

  const suit = new MeshStandardMaterial({ color: '#E7E4DC', roughness: 0.82, metalness: 0, name: 'suit' });
  const boots = new MeshStandardMaterial({ color: '#8F8C86', roughness: 0.9, metalness: 0, name: 'boots' });
  const visor = new MeshStandardMaterial({ color: '#D2A443', roughness: 0.12, metalness: 1, name: 'visor' });
  const metal = new MeshStandardMaterial({ color: '#C9C7C0', roughness: 0.4, metalness: 0.7, name: 'hardware' });
  const foil = new MeshStandardMaterial({ color: '#C99A3E', roughness: 0.4, metalness: 0.9, name: 'experiment-foil' });
  const dark = new MeshStandardMaterial({ color: '#202024', roughness: 0.5, metalness: 0.3, name: 'experiment-dark' });
  const print = new MeshStandardMaterial({
    color: '#4E4B46',
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    name: 'footprint',
  });
  const flagTexture = makeFlagTexture();
  const flagCloth = new MeshStandardMaterial({
    map: flagTexture,
    roughness: 0.85,
    metalness: 0,
    side: DoubleSide,
    name: 'flag-cloth',
  });
  const materials: Material[] = [suit, boots, visor, metal, foil, dark, print, flagCloth];

  // ── Astronauts ──────────────────────────────────────────────────────────
  // Built facing +X. Merged per rigid piece and material: body, visor, and
  // each limb, so a figure is six draw calls.
  const buildFigure = (crew: Crew): Figure => {
    const group = new Group();
    group.name = `astronaut-${crew}`;
    site.add(group);

    const torso = at(new CylinderGeometry(0.25, 0.23, 0.62, 12, 1), 0, 1.2, 0);
    const pack = at(new BoxGeometry(0.3, 0.64, 0.5), -0.36, 1.32, 0);
    const packTop = at(new BoxGeometry(0.26, 0.12, 0.44), -0.36, 1.7, 0);
    const helmet = at(new SphereGeometry(0.2, 16, 12), 0.02, 1.74, 0);
    const chest = at(new BoxGeometry(0.1, 0.16, 0.26), 0.27, 1.3, 0);
    const hips = at(new CylinderGeometry(0.22, 0.24, 0.16, 12, 1), 0, HIP_Y, 0);
    const body = new Mesh(merge(keep, [torso, pack, packTop, helmet, chest, hips]), suit);
    body.name = `astronaut-${crew}-body`;
    body.castShadow = true;
    group.add(body);

    const shield = new Mesh(
      keep(at(new SphereGeometry(0.205, 16, 10, -Math.PI / 2.4, Math.PI / 1.2, Math.PI / 4, Math.PI / 2.6), 0.03, 1.74, 0)),
      visor,
    );
    shield.name = `astronaut-${crew}-visor`;
    group.add(shield);

    const limb = (name: string, y: number, z: number, length: number, radius: number, withBoot: boolean): Group => {
      const pivot = new Group();
      pivot.name = name;
      pivot.position.set(0, y, z);
      group.add(pivot);
      const pieces = [at(new CylinderGeometry(radius, radius * 0.92, length, 10, 1), 0, -length / 2, 0)];
      const mesh = new Mesh(merge(keep, pieces), suit);
      mesh.name = `${name}-mesh`;
      mesh.castShadow = true;
      pivot.add(mesh);
      if (withBoot) {
        const boot = new Mesh(keep(at(new BoxGeometry(0.3, 0.12, 0.15), 0.05, -length + 0.02, 0)), boots);
        boot.name = `${name}-boot`;
        boot.castShadow = true;
        pivot.add(boot);
      }
      return pivot;
    };

    const legs: [Group, Group] = [
      limb(`astronaut-${crew}-leg-L`, HIP_Y, 0.12, HIP_Y - 0.04, 0.11, true),
      limb(`astronaut-${crew}-leg-R`, HIP_Y, -0.12, HIP_Y - 0.04, 0.11, true),
    ];
    const arms: [Group, Group] = [
      limb(`astronaut-${crew}-arm-L`, SHOULDER_Y, 0.31, 0.62, 0.085, false),
      limb(`astronaut-${crew}-arm-R`, SHOULDER_Y, -0.31, 0.62, 0.085, false),
    ];

    const state = createPartState({ visible: 0 });
    registerPart({
      name: `astronaut-${crew}`,
      object: group,
      attachments: [{ parent: site, rest: { pos: [0, 0, 0], rot: [0, 0, 0] } }],
      state,
    });

    return {
      crew,
      group,
      state,
      legs,
      arms,
      pose: { x: 0, y: 0, z: 0, yaw: 0, out: false, walking: false, stride: 0 },
    };
  };

  const figures = [buildFigure('CDR'), buildFigure('LMP')];

  // ── Placed items ────────────────────────────────────────────────────────
  const placed: { item: Placed; group: Group; state: PartState; drop: number }[] = [];
  const place = (item: Placed, x: number, z: number, yaw: number, build: (g: Group) => void, drop: number): void => {
    const group = new Group();
    group.name = item;
    site.add(group);
    build(group);
    const state = createPartState({ visible: 0 });
    registerPart({
      name: item,
      object: group,
      attachments: [{ parent: site, rest: { pos: [x, 0, z], rot: [0, yaw, 0] } }],
      state,
    });
    placed.push({ item, group, state, drop });
  };

  // The flag: a pole pushed about 30 cm into the regolith, a telescoping
  // crossbar along the top to hold the cloth out, and a cloth that stays
  // exactly as crinkled as it was when it was unfurled. It does not wave.
  place(
    'flag',
    FLAG_POS.x,
    FLAG_POS.z,
    -0.5,
    (g) => {
      const pole = at(new CylinderGeometry(0.016, 0.016, 2.25, 8, 1), 0, 0.97, 0);
      const bar = at(new CylinderGeometry(0.012, 0.012, 0.95, 6, 1), 0, 2.02, 0.47, new Vector3(1, 0, 0), Math.PI / 2);
      const hardware = new Mesh(merge(keep, [pole, bar]), metal);
      hardware.name = 'flag-pole';
      hardware.castShadow = true;
      g.add(hardware);

      const clothGeo = keep(new PlaneGeometry(0.9, 0.6, 18, 10));
      const pos = clothGeo.attributes.position!;
      for (let i = 0; i < pos.count; i += 1) {
        const u = pos.getX(i) + 0.45;
        const v = pos.getY(i);
        // Fixed ripples from being folded in its sleeve for four days.
        pos.setZ(i, 0.025 * Math.sin(u * 17 + v * 3) * u + 0.012 * Math.sin(v * 23 + u * 5));
      }
      clothGeo.computeVertexNormals();
      clothGeo.rotateY(-Math.PI / 2);
      clothGeo.translate(0, 1.71, 0.47);
      const cloth = new Mesh(clothGeo, flagCloth);
      cloth.name = 'flag-cloth';
      cloth.castShadow = true;
      g.add(cloth);
    },
    0.35,
  );

  // PSEP, the passive seismometer: a small central package between two
  // six-sided solar panel wings.
  place(
    'PSEP',
    PSEP_POS.x,
    PSEP_POS.z,
    0.3,
    (g) => {
      const box = at(new BoxGeometry(0.46, 0.45, 0.46), 0, 0.23, 0);
      const dish = at(new CylinderGeometry(0.02, 0.02, 0.5, 6, 1), 0.1, 0.7, 0.1);
      const shell = new Mesh(merge(keep, [box, dish]), foil);
      shell.name = 'PSEP-body';
      shell.castShadow = true;
      const wingL = at(new CylinderGeometry(0.42, 0.42, 0.02, 6, 1), 0, 0.42, 0.68);
      const wingR = at(new CylinderGeometry(0.42, 0.42, 0.02, 6, 1), 0, 0.42, -0.68);
      const wings = new Mesh(merge(keep, [wingL, wingR]), dark);
      wings.name = 'PSEP-panels';
      wings.castShadow = true;
      g.add(shell, wings);
    },
    0.25,
  );

  // LRRR, the laser ranging retro-reflector: an array of a hundred corner
  // cubes in a frame, tilted toward Earth. Still in use.
  place(
    'LRRR',
    LRRR_POS.x,
    LRRR_POS.z,
    0.9,
    (g) => {
      const base = at(new BoxGeometry(0.62, 0.08, 0.5), 0, 0.04, 0);
      const strut = at(new CylinderGeometry(0.02, 0.02, 0.32, 6, 1), -0.2, 0.2, 0);
      const frame = new Mesh(merge(keep, [base, strut]), metal);
      frame.name = 'LRRR-frame';
      frame.castShadow = true;
      const panel = at(new BoxGeometry(0.46, 0.05, 0.46), 0, 0.28, 0, new Vector3(0, 0, 1), 0.45);
      const array = new Mesh(merge(keep, [panel]), dark);
      array.name = 'LRRR-array';
      array.castShadow = true;
      g.add(frame, array);
    },
    0.2,
  );

  // ── Footprints ──────────────────────────────────────────────────────────
  // One instanced mesh for every print; how many draw is the only thing that
  // changes, so there is nothing to accumulate.
  const printGeo = keep(new CircleGeometry(0.5, 10));
  printGeo.rotateX(-Math.PI / 2);
  const prints = new InstancedMesh(printGeo, print, FOOTPRINTS.length);
  prints.name = 'footprints';
  prints.receiveShadow = true;
  const dummy = new Matrix4();
  const rot = new Quaternion();
  FOOTPRINTS.forEach((p, i) => {
    rot.setFromAxisAngle(up, p.yaw);
    dummy.compose(new Vector3(p.x, 0.006, p.z), rot, new Vector3(0.32, 1, 0.13));
    prints.setMatrixAt(i, dummy);
  });
  prints.instanceMatrix.needsUpdate = true;
  prints.count = 0;
  prints.frustumCulled = false;
  site.add(prints);

  let printCount = 0;

  const update = (met: number): void => {
    for (const f of figures) {
      poseAt(f.crew, met, f.pose);
      f.state.x = f.pose.x;
      // The loping gait: a little hop on every stride.
      f.state.y = f.pose.y + (f.pose.walking ? 0.09 * Math.abs(Math.sin(Math.PI * f.pose.stride)) : 0);
      f.state.z = f.pose.z;
      f.state.ry = f.pose.yaw;
      f.state.visible = f.pose.out ? 1 : 0;
    }
    for (const p of placed) {
      const f = placedAt(p.item, met);
      p.state.visible = f > 0 ? 1 : 0;
      // Lowered, or pushed in, over its last stretch.
      p.state.y = p.drop * (1 - f * f * (3 - 2 * f));
    }

    // The ascent engine's blast knocked the flag over — Aldrin saw it fall as
    // Eagle lifted off. Two seconds, from mission time like everything else.
    const flag = placed.find((p) => p.item === 'flag');
    if (flag) {
      const k = Math.max(0, Math.min(1, (met - MET.ascentLiftoff - 1) / 2));
      flag.state.rz = -FLAG_KNOCKED * k * k;
    }
  };

  const apply = (met: number): void => {
    for (const f of figures) {
      const swing = f.pose.walking ? Math.sin(Math.PI * f.pose.stride) : 0;
      f.legs[0].rotation.z = 0.42 * swing;
      f.legs[1].rotation.z = -0.42 * swing;
      f.arms[0].rotation.z = -0.28 * swing;
      f.arms[1].rotation.z = 0.28 * swing;
    }
    printCount = footprintsAt(met);
    prints.count = printCount;
    prints.visible = printCount > 0;
  };

  const dispose = (): void => {
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    flagTexture.dispose();
    for (const f of figures) site.remove(f.group);
    for (const p of placed) site.remove(p.group);
    site.remove(prints);
  };

  return { update, apply, footprintCount: () => printCount, dispose };
}

/** The 1969 flag, fifty stars, drawn once into a small canvas. */
function makeFlagTexture(): CanvasTexture {
  const w = 190;
  const h = 100;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    for (let i = 0; i < 13; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? '#B22234' : '#FFFFFF';
      ctx.fillRect(0, (i * h) / 13, w, h / 13 + 1);
    }
    const unionW = w * 0.4;
    const unionH = (h * 7) / 13;
    ctx.fillStyle = '#3C3B6E';
    ctx.fillRect(0, 0, unionW, unionH);
    ctx.fillStyle = '#FFFFFF';
    for (let row = 0; row < 9; row += 1) {
      const cols = row % 2 === 0 ? 6 : 5;
      for (let col = 0; col < cols; col += 1) {
        const x = ((col + (row % 2 === 0 ? 0.5 : 1)) * unionW) / 6;
        const y = ((row + 0.5) * unionH) / 9;
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

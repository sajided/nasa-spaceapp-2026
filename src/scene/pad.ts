import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three';
import { createPartState, registerPart } from '../core/reconcile';
import type { PartState } from '../types';
import { createPadScenery } from './padScenery';

/**
 * Launch Complex 39A — pad, mobile launcher and service tower.
 *
 * Because the vehicle holds the origin (see saturnV.ts), ascent is this Group
 * falling away downward. It is registered as a part like any other, so its
 * motion is reconciled from state and reverses for free.
 */

export interface PadScene {
  pad: Group;
  state: PartState;
  dispose: () => void;
}

/** How far the pad travels during chapter 1. Stylised, not to scale. */
export const PAD_TRAVEL = 2600;

export function createPad(vehicleFrame: Group, opts: { story?: boolean } = {}): PadScene {
  const geometries: BufferGeometry[] = [];
  const keep = <T extends BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const concrete = new MeshStandardMaterial({
    color: 0x6f6f6a,
    roughness: 0.95,
    metalness: 0.0,
    name: 'concrete',
  });
  const steel = new MeshStandardMaterial({
    color: 0x9a3b1e,
    roughness: 0.7,
    metalness: 0.4,
    name: 'steel',
  });

  const pad = new Group();
  pad.name = 'pad';
  vehicleFrame.add(pad);

  const ground = new Mesh(keep(new PlaneGeometry(4000, 4000)), concrete);
  ground.name = 'ground';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -16;
  pad.add(ground);

  // Story mode dresses the pad in Cape Kennedy (scene/padScenery.ts) and its
  // own ground replaces the plain concrete plane. Classic mode is unchanged.
  const scenery = opts.story ? createPadScenery() : null;
  if (scenery) {
    ground.visible = false;
    pad.add(scenery.group);
  }

  // The mobile launcher platform, built as four slabs around a central
  // opening rather than one solid deck: the exhaust has to have somewhere to
  // go. Without the hole the plume is simply buried and the engines look dead.
  const slabLong = keep(new BoxGeometry(52, 7, 14));
  const slabShort = keep(new BoxGeometry(14, 7, 24));
  const deckY = -4;
  for (const [name, geometry, x, z] of [
    ['launcher-deck-n', slabLong, 0, -19],
    ['launcher-deck-s', slabLong, 0, 19],
    ['launcher-deck-w', slabShort, -19, 0],
    ['launcher-deck-e', slabShort, 19, 0],
  ] as const) {
    const slab = new Mesh(geometry, concrete);
    slab.name = name;
    slab.position.set(x, deckY, z);
    pad.add(slab);
  }

  // Flame trench walls below the opening.
  const trenchWall = keep(new BoxGeometry(2, 18, 40));
  for (const x of [-13, 13]) {
    const wall = new Mesh(trenchWall, concrete);
    wall.name = `flame-trench-${x}`;
    wall.position.set(x, -22, 0);
    pad.add(wall);
  }

  // Launch umbilical tower: four legs, cross bracing, and the swing arms that
  // reach across to the vehicle.
  const tower = new Group();
  tower.name = 'umbilical-tower';
  tower.position.set(-26, 0, 0);
  pad.add(tower);

  const legGeo = keep(new BoxGeometry(1.2, 120, 1.2));
  for (const [x, z] of [
    [-4, -4],
    [4, -4],
    [-4, 4],
    [4, 4],
  ] as const) {
    const leg = new Mesh(legGeo, steel);
    leg.name = `tower-leg-${x}-${z}`;
    leg.position.set(x, 56, z);
    tower.add(leg);
  }

  const braceGeo = keep(new BoxGeometry(9, 0.5, 9));
  for (let y = 6; y < 118; y += 8) {
    const brace = new Mesh(braceGeo, steel);
    brace.name = `tower-brace-${y}`;
    brace.position.y = y;
    tower.add(brace);
  }

  const armGeo = keep(new BoxGeometry(18, 0.9, 1.6));
  for (const y of [34, 62, 88, 102]) {
    const arm = new Mesh(armGeo, steel);
    arm.name = `swing-arm-${y}`;
    arm.position.set(13, y, 0);
    tower.add(arm);
  }

  // The lightning mast on top.
  const mast = new Mesh(keep(new CylinderGeometry(0.3, 0.5, 26, 8)), steel);
  mast.name = 'lightning-mast';
  mast.position.y = 133;
  tower.add(mast);

  const state = createPartState();
  registerPart({
    name: 'pad',
    object: pad,
    // The pad never re-parents; its descent is entirely state.y.
    attachments: [{ parent: vehicleFrame, rest: { pos: [0, 0, 0], rot: [0, 0, 0] } }],
    state,
  });

  const dispose = (): void => {
    for (const g of geometries) g.dispose();
    concrete.dispose();
    steel.dispose();
    scenery?.dispose();
    vehicleFrame.remove(pad);
  };

  return { pad, state, dispose };
}

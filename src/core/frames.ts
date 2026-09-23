import { Group, type Scene } from 'three';

/**
 * The two scales the mission is told at, and the switch between them.
 *
 * The problem
 * -----------
 * The vehicle is 110 m. The Earth–Moon distance is 384,400 km. That is a ratio
 * of about three and a half billion to one, and no single set of units renders
 * both without either z-fighting or a spacecraft too small to see.
 *
 * The trick
 * ---------
 * Pick the system unit so that both frames occupy the *same numeric range*.
 * With one system unit = 1,000 km:
 *
 *              vehicle frame (metres)     system frame (1,000 km)
 *   subject    110-unit stack             Earth r 6.371, Moon r 1.737
 *   spread     pad ~2,600 units           Earth→Moon 384.4 units
 *   camera     50–200 units               10–900 units
 *
 * Both live inside `near 0.1 / far 2000` (core/renderer.ts), so one camera and
 * one depth range serve both — stretched only when the camera pulls back past
 * it (`farFor`), and by the lunar surface while it is drawn. No logarithmic depth buffer, no second render pass, no composite.
 *
 * The rule
 * --------
 * The vehicle holds the origin in the VEHICLE frame, where every separation
 * happens — that is what keeps a part's rest position identical whether it is
 * attached or falling away, and it is the whole reason the handovers are exact.
 * In the SYSTEM frame, where no separation happens, the marker moves along a
 * fixed trajectory and the bodies stay put.
 *
 * The two frames share a world origin but only one is ever visible, so they
 * cannot interpenetrate. The switch is a hard cut taken at a moment when the
 * stack is only a few pixels tall and the marker is sized to match — which is
 * far more robust than cross-fading two scales that differ by a billion.
 */

/** One system unit is a thousand kilometres. */
export const SYSTEM_UNIT_KM = 1000;

export const EARTH_RADIUS = 6371 / SYSTEM_UNIT_KM;
export const MOON_RADIUS = 1737 / SYSTEM_UNIT_KM;
export const EARTH_MOON_DISTANCE = 384_400 / SYSTEM_UNIT_KM;

/** Parking-orbit altitude, ~185 km, in system units. */
export const PARKING_ALTITUDE = 185 / SYSTEM_UNIT_KM;

/** Above this, the system frame is showing. Thresholded like every other flag. */
const LOD_THRESHOLD = 0.5;

export interface Frames {
  /** Metre scale: the stack, the pad, everything a separation touches. */
  vehicleFrame: Group;
  /** Thousand-kilometre scale: Earth, the Moon, the trajectory, the marker. */
  systemFrame: Group;
  apply(vehicleLod: number): void;
  /** True while the system frame is the one on screen. */
  isSystem(vehicleLod: number): boolean;
  dispose(): void;
}

export function createFrames(scene: Scene): Frames {
  const vehicleFrame = new Group();
  vehicleFrame.name = 'vehicle-frame';
  scene.add(vehicleFrame);

  const systemFrame = new Group();
  systemFrame.name = 'system-frame';
  systemFrame.visible = false;
  scene.add(systemFrame);

  const isSystem = (vehicleLod: number): boolean => vehicleLod >= LOD_THRESHOLD;

  const apply = (vehicleLod: number): void => {
    const system = isSystem(vehicleLod);
    vehicleFrame.visible = !system;
    systemFrame.visible = system;
  };

  const dispose = (): void => {
    scene.remove(vehicleFrame, systemFrame);
  };

  return { vehicleFrame, systemFrame, apply, isSystem, dispose };
}

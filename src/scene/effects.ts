import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  ConeGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Points,
  PointsMaterial,
  SphereGeometry,
  type Scene,
} from 'three';
import { F1_HEIGHT, stage } from '../data/vehicle';
import { palette } from '../style/tokens';
import type { EffectsState } from '../types';

/**
 * Exhaust, smoke, separation flashes and the atmosphere fade.
 *
 * Every value here is read from `EffectsState`, which chapters animate and the
 * timeline drives — nothing reads the clock. A plume parked at a fixed scroll
 * position is therefore still rather than flickering, which is the deliberate
 * trade: the same progress renders the same frame, so screenshot baselines are
 * possible and the determinism assertions stay honest.
 *
 * Draw-call discipline matters here more than anywhere else in the scene: the
 * plumes are three meshes, the smoke is a single `Points`, and the flash is one
 * mesh plus one light — against a 150-call ceiling that `perf.spec.ts` asserts
 * at every sample point.
 */

export interface EffectsScene {
  apply(state: EffectsState): void;
  dispose: () => void;
}

/**
 * A soft radial sprite for the smoke points.
 *
 * `PointsMaterial` with no map draws hard squares, which read as grey confetti
 * rather than as a smoke column. One small generated texture fixes it without
 * shipping an asset.
 */
function makePuffTexture(): CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/** Seeded scatter, so the smoke cloud is identical on every load. */
function seeded(i: number): number {
  const s = Math.sin(i * 12.9898) * 43758.5453123;
  return s - Math.floor(s);
}

const SMOKE_COUNT = 420;

const SKY = new Color('#7FA8D0');
const SPACE = new Color('#05070C');

export function createEffects(scene: Scene, vehicleFrame: Group, padGroup: Group): EffectsScene {
  const geometries: BufferGeometry[] = [];
  const keep = <T extends BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  // ── Engine plumes ───────────────────────────────────────────────────────
  const plumeMaterial = new MeshBasicMaterial({
    color: palette.exhaustCore,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    name: 'plume',
  });

  const shroudMaterial = new MeshBasicMaterial({
    color: palette.exhaustTip,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    name: 'plume-shroud',
  });

  /**
   * A plume is two nested cones: a tight bright core inside a wide soft shroud.
   * One cone on its own reads as an opaque shard rather than as flame, and the
   * second costs a single extra draw call.
   */
  const makePlume = (name: string, y: number, radius: number, length: number): Group => {
    const group = new Group();
    group.name = name;

    const core = new Mesh(keep(new ConeGeometry(radius * 0.55, length, 20, 1, true)), plumeMaterial);
    core.name = `${name}-core`;
    core.rotation.x = Math.PI;
    core.position.y = y - length / 2;

    const shroud = new Mesh(keep(new ConeGeometry(radius, length * 0.72, 20, 1, true)), shroudMaterial);
    shroud.name = `${name}-shroud`;
    shroud.rotation.x = Math.PI;
    shroud.position.y = y - (length * 0.72) / 2;

    group.add(shroud, core);
    group.visible = false;
    vehicleFrame.add(group);
    return group;
  };

  // Radius is the plume's half-width at the bells; wider than the stage itself
  // reads as a solid block rather than exhaust.
  const plumeF1 = makePlume('plume-f1', 0.5, 3.6, 46);
  const plumeJ2 = makePlume('plume-j2', stage('S-II').base - 3.2, 2.6, 30);
  const plumeJ2Single = makePlume('plume-j2-single', stage('S-IVB').base - 3.6, 1.3, 18);

  const engineLight = new PointLight(palette.exhaustTip, 0, 260, 2);
  engineLight.name = 'engine-light';
  engineLight.position.y = F1_HEIGHT * 0.5;
  vehicleFrame.add(engineLight);

  // ── Ground smoke ────────────────────────────────────────────────────────
  // Parented to the pad so it falls away with it; positions are fixed and the
  // cloud is driven entirely by scale and opacity.
  const smokeGeo = keep(new BufferGeometry());
  const positions = new Float32Array(SMOKE_COUNT * 3);
  for (let i = 0; i < SMOKE_COUNT; i += 1) {
    const angle = seeded(i) * Math.PI * 2;
    const radius = 12 + seeded(i + 1000) * 46;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = -14 + seeded(i + 2000) * 30;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  smokeGeo.setAttribute('position', new Float32BufferAttribute(positions, 3));

  const puff = makePuffTexture();
  const smokeMaterial = new PointsMaterial({
    color: 0xd8d4cc,
    size: 22,
    map: puff,
    alphaMap: puff,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    name: 'smoke',
  });
  const smoke = new Points(smokeGeo, smokeMaterial);
  smoke.name = 'smoke';
  smoke.visible = false;
  padGroup.add(smoke);

  // ── Separation flash ────────────────────────────────────────────────────
  const flashMaterial = new MeshBasicMaterial({
    color: 0xfff4d6,
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    name: 'flash',
  });
  const flash = new Mesh(keep(new SphereGeometry(6, 16, 12)), flashMaterial);
  flash.name = 'separation-flash';
  flash.visible = false;
  vehicleFrame.add(flash);

  const flashLight = new PointLight(0xfff4d6, 0, 180, 2);
  flashLight.name = 'flash-light';
  vehicleFrame.add(flashLight);

  const background = new Color();

  const apply = (state: EffectsState): void => {
    // Plumes: length and brightness both track intensity, so throttling reads
    // as the engine easing off rather than the plume blinking out.
    const setPlume = (group: Group, intensity: number): void => {
      group.visible = intensity > 0.01;
      if (!group.visible) return;
      group.scale.set(0.6 + intensity * 0.4, 0.25 + intensity * 0.75, 0.6 + intensity * 0.4);
    };
    setPlume(plumeF1, state.exhaustF1);
    setPlume(plumeJ2, state.exhaustJ2);
    setPlume(plumeJ2Single, state.exhaustJ2Single);

    const strongest = Math.max(state.exhaustF1, state.exhaustJ2, state.exhaustJ2Single);
    plumeMaterial.opacity = 0.2 + strongest * 0.42;
    shroudMaterial.opacity = 0.05 + strongest * 0.16;
    engineLight.intensity = strongest * 900;
    engineLight.position.y = state.exhaustF1 > 0.01 ? 1 : stage('S-II').base - 3.2;

    // Smoke only exists in atmosphere; in vacuum there is nothing to billow.
    smoke.visible = state.smoke > 0.01;
    smokeMaterial.opacity = state.smoke * 0.55;
    const spread = 1 + state.smoke * 1.6;
    smoke.scale.set(spread, 1 + state.smoke * 0.8, spread);

    flash.visible = state.flash > 0.01;
    if (flash.visible) {
      flash.position.y = state.flashY;
      const s = 0.4 + state.flash * 1.6;
      flash.scale.setScalar(s);
    }
    flashMaterial.opacity = Math.min(1, state.flash * 0.9);
    flashLight.position.y = state.flashY;
    flashLight.intensity = state.flash * 1400;

    background.copy(SPACE).lerp(SKY, state.atmosphere);
    scene.background = background;
  };

  const dispose = (): void => {
    for (const g of geometries) g.dispose();
    plumeMaterial.dispose();
    shroudMaterial.dispose();
    smokeMaterial.dispose();
    puff.dispose();
    flashMaterial.dispose();
    vehicleFrame.remove(plumeF1, plumeJ2, plumeJ2Single, flash, engineLight, flashLight);
    padGroup.remove(smoke);
  };

  return { apply, dispose };
}

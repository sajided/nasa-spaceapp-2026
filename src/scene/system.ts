import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Points,
  PointsMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Texture,
} from 'three';
import { createPartState, registerPart } from '../core/reconcile';
import { EARTH_MOON_DISTANCE, EARTH_RADIUS, MOON_RADIUS } from '../core/frames';
import {
  RETURN_TRAJECTORY,
  TRAJECTORY,
  returnDrawn,
  spacecraftAt,
  trajectoryDrawn,
} from '../data/orbits';
import type { EffectsState, PartState } from '../types';

/**
 * The Earth–Moon system: the two bodies, the trans-lunar trajectory, the
 * spacecraft marker and the starfield.
 *
 * Everything here is in system units of 1,000 km (see core/frames.ts). The
 * bodies stay put and the marker moves along the trajectory — the opposite of
 * the vehicle frame's floating origin, and safe precisely because no separation
 * ever happens at this scale.
 */

export interface SystemScene {
  /** The marker's state, animated by chapters like any other part. */
  marker: PartState;
  /** World position of Tranquility Base on the Moon sphere (story mode). */
  sitePosition: Vector3;
  apply(state: EffectsState, cameraPosition: Vector3, met: number): void;
  /**
   * Resolves once both planet textures have loaded, or failed.
   *
   * Awaited before the page reports ready, the way the F-1 model is: otherwise
   * `boot.spec.ts`'s dev-vs-preview dump comparison races the network, and its
   * clean-console assertion catches the loader's own warning.
   */
  ready: Promise<boolean>;
  dispose: () => void;
}

/** Enough points that the drawn line reads as a curve, few enough to be free. */
const TRAJECTORY_POINTS = 240;
const STAR_COUNT = 1400;

/**
 * Where the landing-site glow sits on the Moon, as a unit direction in the
 * system frame (story mode).
 *
 * Not a selenographic placement: `moon.webp` is a regional photo mosaic
 * wrapped round the sphere, not a global equirectangular map, so latitude
 * and longitude would land on nothing in particular. Instead the glow goes
 * where the story needs it and where the flight had it: on the Earth-facing
 * side, just inside the morning terminator. Apollo 11 landed with the Sun about
 * ten degrees up. If a true global map replaces the mosaic, place this from
 * Tranquility Base's 0.67°N 23.47°E instead.
 */
export const SITE_DIRECTION = new Vector3(-0.74, 0.06, 0.67).normalize();

/** A soft round glow, drawn once at boot: no texture asset needed. */
function glowTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) return null;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,248,220,1)');
  grad.addColorStop(0.18, 'rgba(255,214,140,0.85)');
  grad.addColorStop(0.5, 'rgba(255,170,80,0.25)');
  grad.addColorStop(1, 'rgba(255,150,60,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Seeded, so the starfield is identical on every load. */
function seeded(i: number): number {
  const s = Math.sin(i * 78.233) * 43758.5453123;
  return s - Math.floor(s);
}

export interface SystemOptions {
  /**
   * Story mode tints the Moon by its mood (`moonWarmth`). Classic mode leaves
   * it exactly as Phases 2–4 approved it.
   */
  storyMoon?: boolean;
}

export function createSystem(systemFrame: Group, options: SystemOptions = {}): SystemScene {
  const storyMoon = options.storyMoon ?? false;
  const geometries: BufferGeometry[] = [];
  const keep = <T extends BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  // ── Sunlight ────────────────────────────────────────────────────────────
  // A light parented to this frame only contributes while the frame is
  // visible, because Three skips invisible subtrees when it gathers lights. So
  // the bodies get a sun angled for them without disturbing how the rocket is
  // lit in the vehicle frame — or the Phase 1 screenshot baselines.
  //
  // Angled so the terminator runs across the visible face rather than along
  // the limb: a fully lit disc reads as flat, and a fully dark one reads as
  // nothing at all.
  const sun = new DirectionalLight(new Color('#fff6e8'), 3.4);
  sun.name = 'system-sun';
  sun.position.set(60, 26, 82);
  systemFrame.add(sun);

  // ── Earth ───────────────────────────────────────────────────────────────
  const earthMaterial = new MeshStandardMaterial({
    color: new Color('#2b4a6f'),
    roughness: 0.92,
    metalness: 0,
    // The scene's image-based lighting is tuned for a metal rocket in daylight.
    // Left on, it fills the night side and the terminator disappears.
    envMapIntensity: 0,
    name: 'earth',
  });
  const earth = new Mesh(keep(new SphereGeometry(EARTH_RADIUS, 64, 48)), earthMaterial);
  earth.name = 'earth';
  systemFrame.add(earth);

  // A thin backfaced shell for the limb glow. Cheap, and it is what stops the
  // planet reading as a flat disc against black.
  const haloMaterial = new MeshBasicMaterial({
    color: new Color('#6ea8e0'),
    transparent: true,
    opacity: 0.16,
    side: BackSide,
    blending: AdditiveBlending,
    depthWrite: false,
    name: 'earth-halo',
  });
  const halo = new Mesh(keep(new SphereGeometry(EARTH_RADIUS * 1.025, 48, 32)), haloMaterial);
  halo.name = 'earth-halo';
  systemFrame.add(halo);

  // ── Moon ────────────────────────────────────────────────────────────────
  const moonMaterial = new MeshStandardMaterial({
    color: new Color('#8a8681'),
    roughness: 0.98,
    metalness: 0,
    envMapIntensity: 0,
    name: 'moon',
  });
  const moon = new Mesh(keep(new SphereGeometry(MOON_RADIUS, 48, 32)), moonMaterial);
  moon.name = 'moon';
  moon.position.set(EARTH_MOON_DISTANCE, 0, 0);
  systemFrame.add(moon);

  // ── Story mode: the Moon's mood, Tranquility Base, the laser ───────────
  // The texture is multiplied by a tint that runs from a cool grey (the
  // lonely Moon of Scene 1) to a warm cream (Scene 7). Kept subtle: the Moon
  // still reads as the Moon, only its mood changes.
  const MOON_COLD = new Color('#b9c0cc');
  const MOON_WARM = new Color('#fff0d8');
  const MOON_UNTEXTURED = new Color('#8a8681');
  let moonTextured = false;

  const glowMap = glowTexture();
  const siteGlowMaterial = new SpriteMaterial({
    map: glowMap,
    color: new Color('#ffd28a'),
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    // Drawn over the sphere it sits on, which would otherwise slice the
    // sprite's quad in half; `apply` hides it whenever the site faces away.
    depthTest: false,
    name: 'landing-site-glow',
  });
  const siteGlow = new Sprite(siteGlowMaterial);
  siteGlow.name = 'landing-site-glow';
  // A hair above the surface so the sphere never clips the sprite's centre.
  siteGlow.position.copy(SITE_DIRECTION).multiplyScalar(MOON_RADIUS * 1.01);
  siteGlow.scale.setScalar(0.32);
  siteGlow.visible = false;
  moon.add(siteGlow);

  const sitePosition = new Vector3();
  moon.updateMatrixWorld(true);
  siteGlow.getWorldPosition(sitePosition);
  // Back into system-frame coordinates (the frame sits at the world origin).
  systemFrame.worldToLocal(sitePosition);

  // Earth to the retroreflector. Lunar laser ranging uses green 532 nm light.
  // A thin tube rather than a GL line: lines are one pixel wide everywhere,
  // which is too faint to read as a beam. Thirty kilometres across, so it is
  // a few pixels wide in the epilogue's shots.
  const laserFrom = sitePosition.clone().normalize().multiplyScalar(EARTH_RADIUS * 1.02);
  const laserLength = laserFrom.distanceTo(sitePosition);
  const laserGeometry = keep(new CylinderGeometry(0.03, 0.03, laserLength, 8, 1, true));
  const laserMaterial = new MeshBasicMaterial({
    color: new Color('#5dff8a'),
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
    name: 'laser-beam',
  });
  const laser = new Mesh(laserGeometry, laserMaterial);
  laser.name = 'laser-beam';
  laser.position.copy(laserFrom).add(sitePosition).multiplyScalar(0.5);
  laser.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), sitePosition.clone().sub(laserFrom).normalize());
  laser.frustumCulled = false;
  laser.visible = false;
  systemFrame.add(laser);

  // ── Trajectory ──────────────────────────────────────────────────────────
  // One Line whose draw range is driven from the `trajectory` channel, so it
  // draws itself forward and un-draws on reverse with no extra machinery.
  const points = new Float32Array(TRAJECTORY_POINTS * 3);
  const p = new Vector3();
  for (let i = 0; i < TRAJECTORY_POINTS; i += 1) {
    TRAJECTORY(i / (TRAJECTORY_POINTS - 1), p);
    points[i * 3] = p.x;
    points[i * 3 + 1] = p.y;
    points[i * 3 + 2] = p.z;
  }
  const trajectoryGeometry = keep(new BufferGeometry());
  trajectoryGeometry.setAttribute('position', new Float32BufferAttribute(points, 3));
  trajectoryGeometry.setDrawRange(0, 0);

  const trajectoryMaterial = new LineBasicMaterial({
    color: new Color('#7fc4ff'),
    transparent: true,
    opacity: 0.85,
    name: 'trajectory',
  });
  const trajectory = new Line(trajectoryGeometry, trajectoryMaterial);
  trajectory.name = 'trajectory';
  trajectory.frustumCulled = false;
  systemFrame.add(trajectory);

  // The way home, drawn the same way from its own mission-time fraction. A
  // warmer colour, so out and back read as two journeys.
  const returnPoints = new Float32Array(TRAJECTORY_POINTS * 3);
  for (let i = 0; i < TRAJECTORY_POINTS; i += 1) {
    RETURN_TRAJECTORY(i / (TRAJECTORY_POINTS - 1), p);
    returnPoints[i * 3] = p.x;
    returnPoints[i * 3 + 1] = p.y;
    returnPoints[i * 3 + 2] = p.z;
  }
  const returnGeometry = keep(new BufferGeometry());
  returnGeometry.setAttribute('position', new Float32BufferAttribute(returnPoints, 3));
  returnGeometry.setDrawRange(0, 0);
  const returnMaterial = new LineBasicMaterial({
    color: new Color('#ffc07a'),
    transparent: true,
    opacity: 0.85,
    name: 'trajectory-return',
  });
  const returnLine = new Line(returnGeometry, returnMaterial);
  returnLine.name = 'trajectory-return';
  returnLine.frustumCulled = false;
  systemFrame.add(returnLine);

  // ── Spacecraft marker ───────────────────────────────────────────────────
  // Registered as a part so it shows up in the scene dump and is animated by
  // chapters exactly like the stack is.
  const markerGroup = new Group();
  markerGroup.name = 'spacecraft';
  systemFrame.add(markerGroup);

  const markerMaterial = new MeshBasicMaterial({
    color: new Color('#ffe9c4'),
    name: 'spacecraft-marker',
  });
  const markerBody = new Mesh(keep(new SphereGeometry(0.9, 12, 10)), markerMaterial);
  markerBody.name = 'spacecraft-marker';
  markerGroup.add(markerBody);

  const glowMaterial = new MeshBasicMaterial({
    color: new Color('#ffb066'),
    transparent: true,
    opacity: 0.35,
    blending: AdditiveBlending,
    depthWrite: false,
    name: 'spacecraft-glow',
  });
  const markerGlow = new Mesh(keep(new SphereGeometry(2.2, 12, 10)), glowMaterial);
  markerGlow.name = 'spacecraft-glow';
  markerGroup.add(markerGlow);

  const marker = createPartState();
  registerPart({
    name: 'spacecraft',
    object: markerGroup,
    attachments: [{ parent: systemFrame, rest: { pos: [0, 0, 0], rot: [0, 0, 0] } }],
    state: marker,
  });

  // ── Starfield ───────────────────────────────────────────────────────────
  const starPositions = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i += 1) {
    // Even distribution on a sphere well outside the Moon's orbit.
    const u = seeded(i) * 2 - 1;
    const theta = seeded(i + 5000) * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    const distance = 1800;
    starPositions[i * 3] = Math.cos(theta) * r * distance;
    starPositions[i * 3 + 1] = u * distance;
    starPositions[i * 3 + 2] = Math.sin(theta) * r * distance;
  }
  const starGeometry = keep(new BufferGeometry());
  starGeometry.setAttribute('position', new Float32BufferAttribute(starPositions, 3));
  const starMaterial = new PointsMaterial({
    color: 0xffffff,
    size: 2.6,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    name: 'stars',
  });
  const stars = new Points(starGeometry, starMaterial);
  stars.name = 'stars';
  stars.frustumCulled = false;
  systemFrame.add(stars);

  const markerWorld = new Vector3();
  const toCamera = new Vector3();

  /**
   * Fraction of the viewport height the marker occupies, whatever the distance.
   *
   * A world-sized marker cannot work here: big enough to see beside the Moon is
   * a thousand kilometres across beside Earth. Scaling it with camera distance
   * keeps it a constant handful of pixels, which also makes the switch out of
   * the vehicle frame invisible — the stack is about twenty pixels tall at the
   * handoff and so is this.
   */
  const MARKER_SCREEN_FRACTION = 0.022;
  /** 2 * tan(fov/2) for the 45° the system-frame viewpoints use. */
  const FOV_FACTOR = 0.828;

  // Runs after the reconciler each frame, which is why it can own the marker's
  // scale outright: the reconciler writes state.sx/sy/sz first and this
  // overwrites it. The marker's size is derived, not authored.
  const markerPosition = new Vector3();

  const apply = (state: EffectsState, cameraPosition: Vector3, met: number): void => {
    // Position from mission time, not from a chapter tween — see
    // data/orbits.ts#spacecraftAt for why that distinction matters.
    spacecraftAt(met, markerPosition);
    markerGroup.position.copy(markerPosition);

    markerGroup.getWorldPosition(markerWorld);
    const distance = markerWorld.distanceTo(cameraPosition);
    // Marker body radius is 0.9, so diameter 1.8 before scaling.
    const scale = (MARKER_SCREEN_FRACTION * FOV_FACTOR * distance) / 1.8;
    markerGroup.scale.setScalar(Math.max(scale, 1e-4));

    // The line is drawn to exactly where the marker is, so the marker always
    // sits on its leading end (TC-P2-08).
    const drawn = Math.round(trajectoryDrawn(met) * TRAJECTORY_POINTS);
    trajectoryGeometry.setDrawRange(0, drawn);
    trajectory.visible = drawn > 1;
    const drawnHome = Math.round(returnDrawn(met) * TRAJECTORY_POINTS);
    returnGeometry.setDrawRange(0, drawnHome);
    returnLine.visible = drawnHome > 1;

    // An engine burn seen from a thousand kilometres: the marker's glow
    // swells and brightens with the SPS (LOI, TEI).
    glowMaterial.opacity = 0.35 + state.spsBurn * 0.6;
    markerGlow.scale.setScalar(1 + state.spsBurn * 1.4);

    starMaterial.opacity = state.stars;
    stars.visible = state.stars > 0.01;

    // ── Story mode ────────────────────────────────────────────────────────
    const warmth = Math.min(Math.max(state.moonWarmth, 0), 1);
    if (!moonTextured) moonMaterial.color.copy(MOON_UNTEXTURED);
    else if (storyMoon) moonMaterial.color.copy(MOON_COLD).lerp(MOON_WARM, warmth);
    else moonMaterial.color.set('#ffffff');

    // Facing the camera, or not drawn at all: with depth testing off it would
    // otherwise shine through the Moon from the far side.
    toCamera.copy(cameraPosition).sub(moon.position).normalize();
    const facing = toCamera.dot(SITE_DIRECTION);
    siteGlowMaterial.opacity = state.siteGlow * Math.min(1, Math.max(0, facing * 4));
    siteGlow.visible = state.siteGlow > 0.01 && facing > 0;

    // A slow shimmer along the beam, from mission time so it holds still when
    // the reader does: well under three pulses a second at any scroll speed a
    // child can manage, and never a full on/off flash.
    const shimmer = 0.75 + 0.25 * Math.sin(met * 0.09);
    laserMaterial.opacity = state.laser * shimmer;
    laser.visible = state.laser > 0.01;
  };

  // ── Textures ────────────────────────────────────────────────────────────
  // Best-effort: the bodies are already shaded plausible colours, so a missing
  // texture leaves a dimmer Earth rather than a hole.
  const loadedTextures: Texture[] = [];
  const loadTexture = (url: string): Promise<Texture | null> =>
    new Promise((resolve) => {
      new TextureLoader().load(
        url,
        (texture) => {
          texture.colorSpace = SRGBColorSpace;
          loadedTextures.push(texture);
          resolve(texture);
        },
        undefined,
        () => resolve(null),
      );
    });

  const ready = Promise.all([
    loadTexture('textures/earth.webp'),
    loadTexture('textures/moon.webp'),
  ]).then(([earthMap, moonMap]) => {
    if (earthMap) {
      earthMaterial.map = earthMap;
      earthMaterial.color.set('#ffffff');
      earthMaterial.needsUpdate = true;
    }
    if (moonMap) {
      moonMaterial.map = moonMap;
      moonMaterial.color.copy(storyMoon ? MOON_COLD : new Color('#ffffff'));
      moonTextured = true;
      moonMaterial.needsUpdate = true;
    }
    return Boolean(earthMap && moonMap);
  });

  const dispose = (): void => {
    for (const g of geometries) g.dispose();
    earthMaterial.dispose();
    haloMaterial.dispose();
    moonMaterial.dispose();
    trajectoryMaterial.dispose();
    returnMaterial.dispose();
    markerMaterial.dispose();
    glowMaterial.dispose();
    starMaterial.dispose();
    siteGlowMaterial.dispose();
    glowMap?.dispose();
    laserMaterial.dispose();
    for (const texture of loadedTextures) texture.dispose();
    systemFrame.clear();
  };

  return { marker, sitePosition, apply, ready, dispose };
}

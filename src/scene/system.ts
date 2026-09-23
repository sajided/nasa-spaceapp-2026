import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  Color,
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

/** Seeded, so the starfield is identical on every load. */
function seeded(i: number): number {
  const s = Math.sin(i * 78.233) * 43758.5453123;
  return s - Math.floor(s);
}

export function createSystem(systemFrame: Group): SystemScene {
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
      moonMaterial.color.set('#ffffff');
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
    for (const texture of loadedTextures) texture.dispose();
    systemFrame.clear();
  };

  return { marker, apply, ready, dispose };
}

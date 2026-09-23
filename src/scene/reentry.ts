import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  Points,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type PerspectiveCamera,
  type WebGLRenderer,
} from 'three';
import { createPartState, ownsOpacity, registerPart } from '../core/reconcile';
import { particleBudget, type QualityTier } from '../core/quality';
import { MET } from '../data/mission';
import { reentryAt, type ReentryState } from '../data/reentry';
import { CM_DRAFT, CM_FLIGHT_Y, CM_PIVOT_Y } from '../data/vehicle';
import type { EffectsState, PartState } from '../types';
import { buildRadialCap } from './radialCap';

/**
 * Chapter 10's world: the Earth coming up, the plasma, the sky, the Pacific
 * and the splash.
 *
 * The same floating origin as the Moon landing. The CM holds its place in the
 * vehicle frame, in its own flight frame (scene/saturnV.ts, `CM-flight`), and
 * the ocean rises to meet it. The ocean is one registered part whose height
 * below the heat shield is `altitude` from data/reentry.ts; the Earth seen from
 * orbit, the ocean surface and the splash all ride in it.
 *
 * The capsule's attitude — apex down while it is still in the CSM, heat
 * shield down for entry — and its bob once afloat are derived from mission
 * time here as well, and written to the CM flight frame before the reconciler
 * reads it.
 */

export const EARTH_RADIUS_M = 6_371_000;

/** Where the water surface sits once the CM is floating: the heat shield just under. */
export const OCEAN_REST_Y = CM_FLIGHT_Y - CM_PIVOT_Y + CM_DRAFT;

/** Above this the Earth is seen whole; below it, the ocean surface. */
const BACKDROP_CEILING = 45_000;

/** Horizontal reach of the splash, metres from the capsule's rim. */
const SPLASH_REACH = 9;

const SKY = new Color('#7FA8D0');

export interface ReentryScene {
  /** The registered part: the ocean, and everything that rides on it. */
  state: PartState;
  readonly reentry: ReentryState;
  /** Derives the ocean's height and the CM's attitude. Before the reconciler. */
  update(met: number): void;
  /** Plasma, splash, backdrop and water. After the reconciler. */
  apply(effects: EffectsState): void;
  /** Clip planes for Earth's horizon while the scene is drawn, or null. */
  clipPlanes(camera: PerspectiveCamera): { near: number; far: number } | null;
  /** Splash particles built for the current tier. */
  splashCount: number;
  dispose(): void;
}

interface Deps {
  vehicleFrame: Group;
  /** The CM's flight frame: its attitude is written here, and the plasma rides on it. */
  cmFlight: { group: Group; state: PartState };
  renderer: WebGLRenderer;
  tier: QualityTier;
}

export function createReentry(deps: Deps): ReentryScene {
  const { vehicleFrame, cmFlight, renderer, tier } = deps;

  const group = new Group();
  group.name = 'ocean';
  vehicleFrame.add(group);
  const state = createPartState({ visible: 0 });
  registerPart({
    name: 'ocean',
    object: group,
    attachments: [{ parent: vehicleFrame, rest: { pos: [0, OCEAN_REST_Y, 0], rot: [0, 0, 0] } }],
    state,
  });

  // ── The Earth from orbit ────────────────────────────────────────────────
  // Drawn first and without depth: at 400 km the far side of the planet is
  // thousands of kilometres beyond anything else in the frame, and there is
  // nothing it could correctly occlude.
  //
  // Procedural rather than the system frame's Earth map. That map is 20 km a
  // texel, and seen obliquely from 400 km it smears into streaks; it is also
  // false-colour topography. The CM came down over the Pacific — open ocean
  // under cloud — which a shader can draw at any resolution for nothing.
  const earthMaterial = new MeshStandardMaterial({
    color: '#123F6E',
    roughness: 0.55,
    metalness: 0,
    envMapIntensity: 0,
    depthTest: false,
    depthWrite: false,
    name: 'earth-backdrop',
  });
  earthMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDir;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDir = normalize(position + vec3(0.0, ' + EARTH_RADIUS_M.toFixed(1) + ', 0.0));');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDir;\n' + CLOUD_NOISE)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          // Cloud streets and patches: two octaves of noise over the sphere,
          // stretched along latitude the way trade-wind cloud lies.
          vec3 p = vDir * vec3(26.0, 60.0, 26.0);
          float c = fbm(p) * 0.65 + fbm(p * 3.1 + 7.0) * 0.35;
          float cloud = smoothstep(0.52, 0.72, c);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92), cloud * 0.85);
        }`,
      );
  };
  earthMaterial.customProgramCacheKey = () => 'earth-backdrop-v1';
  const earthGeo = new SphereGeometry(EARTH_RADIUS_M, 128, 96);
  earthGeo.translate(0, -EARTH_RADIUS_M, 0);
  const earth = new Mesh(earthGeo, earthMaterial);
  earth.name = 'earth-backdrop';
  earth.renderOrder = -2;
  earth.frustumCulled = false;
  group.add(earth);

  const limbMaterial = new MeshBasicMaterial({
    color: new Color('#6ea8e0'),
    transparent: true,
    opacity: 0.22,
    side: BackSide,
    blending: AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    name: 'earth-limb',
  });
  const limbGeo = new SphereGeometry(EARTH_RADIUS_M * 1.012, 64, 32);
  limbGeo.translate(0, -EARTH_RADIUS_M, 0);
  const limb = new Mesh(limbGeo, limbMaterial);
  limb.name = 'earth-limb';
  limb.renderOrder = -1;
  limb.frustumCulled = false;
  group.add(limb);

  // ── The Pacific ─────────────────────────────────────────────────────────
  const oceanGeo = buildRadialCap({
    radius: EARTH_RADIUS_M,
    first: 1,
    growth: 1.07,
    rim: 700_000,
    segments: 96,
  });
  const haze = { uHaze: { value: SKY.clone() } };
  const oceanMaterial = new MeshStandardMaterial({
    color: '#16466B',
    roughness: 0.32,
    metalness: 0,
    envMapIntensity: 0.35,
    name: 'ocean',
  });
  oceanMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, haze);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 ground;\nvarying vec2 vGround;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGround = ground;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uHaze;\nvarying vec2 vGround;')
      // A static swell: fixed sines of position, so the sea has texture but
      // never moves on its own — the frame freezes when the scroll does.
      .replace(
        '#include <normal_fragment_maps>',
        `{
          vec2 g = vGround;
          vec2 w = vec2(
            sin(g.x * 0.21 + g.y * 0.07) * 0.6 + sin(g.x * 0.93 - g.y * 0.52) * 0.25,
            sin(g.y * 0.19 - g.x * 0.11) * 0.6 + sin(g.y * 1.07 + g.x * 0.61) * 0.25
          );
          float fade = 1.0 - smoothstep(60.0, 900.0, length(vViewPosition));
          normal = normalize(normal + mat3(viewMatrix) * vec3(w.x, 0.0, w.y) * 0.08 * fade);
        }`,
      )
      .replace(
        '#include <tonemapping_fragment>',
        `gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, smoothstep(4000.0, 60000.0, length(vViewPosition)));
        #include <tonemapping_fragment>`,
      );
  };
  oceanMaterial.customProgramCacheKey = () => 'ocean-v1';
  const ocean = new Mesh(oceanGeo, oceanMaterial);
  ocean.name = 'ocean-surface';
  ocean.frustumCulled = false;
  group.add(ocean);

  // ── Splash ──────────────────────────────────────────────────────────────
  const splashCount = particleBudget(tier).splash;
  const splashGeo = new BufferGeometry();
  const seeds = new Float32Array(splashCount * 3);
  for (let i = 0; i < splashCount; i += 1) {
    seeds[i * 3] = hash(i * 1.7) * Math.PI * 2;
    seeds[i * 3 + 1] = 0.35 + hash(i * 4.1 + 3) * 0.65;
    seeds[i * 3 + 2] = 0.5 + hash(i * 2.9 + 7) * 1.0;
  }
  splashGeo.setAttribute('position', new Float32BufferAttribute(new Float32Array(splashCount * 3), 3));
  splashGeo.setAttribute('seed', new Float32BufferAttribute(seeds, 3));
  const splashUniforms = {
    uSplash: { value: 0 },
    uFlow: { value: 0 },
    uReach: { value: SPLASH_REACH },
    uScale: { value: 400 },
  };
  const splashMaterial = new ShaderMaterial({
    name: 'splash',
    uniforms: splashUniforms,
    vertexShader: SPLASH_VERTEX,
    fragmentShader: SPLASH_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  });
  const splash = new Points(splashGeo, splashMaterial);
  splash.name = 'splash';
  splash.visible = false;
  splash.frustumCulled = false;
  group.add(splash);

  // ── Plasma ──────────────────────────────────────────────────────────────
  // On the CM's flight frame, so it sits on the heat shield whichever way up
  // the capsule is. A hot cap on the shield and a wake streaming up behind
  // it: the capsule falls toward the ocean, so "behind" is up (TC-P4-06).
  const capMaterial = ownsOpacity(
    new MeshBasicMaterial({
      color: '#FFB98A',
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      name: 'plasma-cap',
    }),
  ) as MeshBasicMaterial;
  // The wake fades with distance behind the shield: brightest where the
  // shock is, gone within a few capsule lengths. A plain additive cone reads
  // as a solid lampshade.
  const wakeUniforms = {
    uPlasma: { value: 0 },
    uColor: { value: new Color('#FF7A3A') },
  };
  const wakeMaterial = ownsOpacity(
    new ShaderMaterial({
      name: 'plasma-wake',
      uniforms: wakeUniforms,
      vertexShader: WAKE_VERTEX,
      fragmentShader: WAKE_FRAGMENT,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    }),
  ) as ShaderMaterial;
  const plasma = new Group();
  plasma.name = 'plasma';
  plasma.visible = false;
  const shieldY = -CM_PIVOT_Y;
  const capGeo = new SphereGeometry(2.25, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  capGeo.scale(1, 0.45, 1);
  capGeo.translate(0, shieldY, 0);
  const cap = new Mesh(capGeo, capMaterial);
  cap.name = 'plasma-cap';
  // Apex down at the heat shield, widening upward: ConeGeometry's apex is +Y.
  const wakeLength = 16;
  const wakeGeo = new ConeGeometry(3.4, wakeLength, 24, 1, true);
  wakeGeo.rotateX(Math.PI);
  wakeGeo.translate(0, shieldY + wakeLength / 2 - 0.3, 0);
  const wake = new Mesh(wakeGeo, wakeMaterial);
  wake.name = 'plasma-wake';
  plasma.add(cap, wake);
  cmFlight.group.add(plasma);

  const reentry: ReentryState = { altitude: 0, attitude: 0 };
  const waterWorld = new Vector3();

  const update = (met: number): void => {
    reentryAt(met, reentry);
    state.y = -reentry.altitude;
    cmFlight.state.rz = reentry.attitude;

    // Afloat: a slow roll and heave, from mission time so the frame is the
    // same on every visit and still when the viewer stops.
    const afloat = Math.max(0, met - MET.splashdown);
    const settle = Math.min(1, afloat / 20);
    cmFlight.state.y = settle * 0.18 * Math.sin(afloat * 0.9);
    cmFlight.state.rx = settle * 0.06 * Math.sin(afloat * 0.63 + 1.1);
  };

  const apply = (effects: EffectsState): void => {
    const high = reentry.altitude > BACKDROP_CEILING;
    earth.visible = high;
    limb.visible = high;
    ocean.visible = !high;
    haze.uHaze.value.copy(SKY);

    plasma.visible = effects.plasma > 0.01;
    capMaterial.opacity = effects.plasma * 0.9;
    wakeUniforms.uPlasma.value = effects.plasma;
    wake.scale.set(1, 0.4 + effects.plasma * 0.6, 1);

    splash.visible = group.visible && effects.splash > 0.005;
    splashUniforms.uSplash.value = effects.splash;
    splashUniforms.uFlow.value = effects.splashFlow;
    splashUniforms.uScale.value = renderer.domElement.height / 2;
  };

  const clipPlanes = (camera: PerspectiveCamera): { near: number; far: number } | null => {
    if (!group.visible) return null;
    group.getWorldPosition(waterWorld);
    const h = Math.max(1, camera.position.y - waterWorld.y);
    const horizon = Math.sqrt(2 * EARTH_RADIUS_M * h + h * h);
    const far = horizon * 1.15 + 2000;
    const near = Math.min(3, Math.max(0.05, far / 300_000));
    return { near, far };
  };

  const dispose = (): void => {
    earthGeo.dispose();
    limbGeo.dispose();
    oceanGeo.dispose();
    splashGeo.dispose();
    capGeo.dispose();
    wakeGeo.dispose();
    earthMaterial.dispose();
    limbMaterial.dispose();
    oceanMaterial.dispose();
    splashMaterial.dispose();
    capMaterial.dispose();
    wakeMaterial.dispose();
    vehicleFrame.remove(group);
    cmFlight.group.remove(plasma);
  };

  return { state, reentry, update, apply, clipPlanes, splashCount, dispose };
}

function hash(n: number): number {
  const s = Math.sin(n * 91.3458) * 47453.5453;
  return s - Math.floor(s);
}

/** Value noise and a small fBm, for the cloud cover seen from orbit. */
const CLOUD_NOISE = /* glsl */ `
float hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y),
    f.z
  );
}
float fbm(vec3 p) {
  float a = 0.5;
  float v = 0.0;
  for (int i = 0; i < 4; i++) {
    v += a * noise3(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}
`;

const WAKE_VERTEX = /* glsl */ `
varying float vAlong;
void main() {
  // uv.y runs 0 at the cone's base to 1 at its apex; the cone is flipped, so
  // the apex is at the heat shield and 1 - uv.y is distance behind it.
  vAlong = 1.0 - uv.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const WAKE_FRAGMENT = /* glsl */ `
uniform float uPlasma;
uniform vec3 uColor;
varying float vAlong;
void main() {
  float a = uPlasma * pow(1.0 - clamp(vAlong, 0.0, 1.0), 2.2) * 0.9;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor * a, a);
}
`;

const SPLASH_VERTEX = /* glsl */ `
attribute vec3 seed;
uniform float uSplash;
uniform float uFlow;
uniform float uReach;
uniform float uScale;
varying float vAlpha;

void main() {
  // One burst, not a stream: each droplet flies a single parabola outward
  // from the capsule's rim, timed by how far the splash has played out.
  float t = clamp(uFlow * seed.z, 0.0, 1.0);
  float r = 2.0 + t * uReach * seed.y;
  float y = 5.5 * seed.y * 4.0 * t * (1.0 - t);
  vec3 p = vec3(cos(seed.x) * r, y, sin(seed.x) * r);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(0.5 * uScale / -mv.z, 1.0, 40.0);
  vAlpha = uSplash * (1.0 - t) * 0.9;
}
`;

const SPLASH_FRAGMENT = /* glsl */ `
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = vAlpha * (1.0 - smoothstep(0.2, 0.5, d));
  if (a < 0.003) discard;
  gl_FragColor = vec4(0.93, 0.96, 1.0, a);
}
`;

import {
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  NormalBlending,
  PCFShadowMap,
  Points,
  ShaderMaterial,
  Vector3,
  type Object3D,
  type PerspectiveCamera,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { createPartState, registerPart } from '../core/reconcile';
import { particleBudget, type QualityTier } from '../core/quality';
import { flightAt, type FlightState } from '../data/lunarFlight';
import { LUNAR_GROUND_Y } from '../data/vehicle';
import type { EffectsState, PartState } from '../types';
import { bakeCraterField } from './craters';
import { buildRadialCap } from './radialCap';

/**
 * The lunar surface for chapters 7–8: terrain, touchdown dust, the low
 * morning sun, and the clip planes the camera needs while it is on screen.
 *
 * Floating origin, again
 * ----------------------
 * Eagle holds its place in the vehicle frame and the Moon comes up to meet it,
 * exactly as the pad fell away from the Saturn V. The surface is one registered
 * part whose height below Eagle is `altitude` from data/lunarFlight.ts. How far
 * Eagle has flown over the ground is not a translation at all: the grid stays
 * centred under the LM and the crater field slides through it, so the surface
 * never runs out of edge however far downrange the descent goes.
 *
 * One mesh, no LOD switching
 * --------------------------
 * The grid is a disc of geometrically spaced rings, about half a metre apart
 * under the footpads and kilometres apart near its 700 km rim, curved to the
 * Moon's radius. That one mesh serves the view from lunar orbit (horizon about
 * 620 km out) and the view from a boot (horizon about 2.5 km). Crater detail
 * fades in and out continuously with distance, so there is nothing to pop
 * (TC-P3-05). The horizon's curvature is the real one.
 *
 * Deterministic
 * -------------
 * Everything here is a function of mission time and effect channels — nothing
 * reads the clock. Dust is positioned in the vertex shader from `dustFlow`, so
 * it streams while the viewer scrolls and freezes when they stop (TC-P1-16).
 */

/** The Moon's mean radius, metres. */
export const MOON_RADIUS_M = 1_737_400;

/**
 * Tile sizes of the four crater layers, metres, largest first: basins, craters
 * the size of the approach path, the boulder-field scale Armstrong flew over,
 * and the pits a boot steps around.
 */
const TILES = [42_000, 2_600, 160, 11] as const;
/** Each layer is rotated so the one tile never lines up with itself. */
const ROTATIONS = [0, 0.83, 2.21, 4.02] as const;
/**
 * How much of a fresh crater field's relief each layer keeps. The Sea of
 * Tranquility is a mare — old lava, flooded smooth — so the large layers are
 * held well down; at boot scale the regolith is as pitted as anywhere.
 */
const RELIEF = [0.18, 0.26, 0.5, 0.85] as const;

/** Stylised distance from the LM's position at chapter 7's start to the site. */
const TRACK_ORIGIN = 1_600_000;

/** Grid: first ring radius, growth per ring, and rim. */
const RING_FIRST = 0.5;
const RING_GROWTH = 1.05;
const RING_RIM = 700_000;
const SEGMENTS = 128;

/** Where the dust sheet reaches, metres from the point under the engine. */
const DUST_REACH = 48;
/**
 * The sheet's ceiling. Blown regolith in vacuum travels flat and low — there
 * is no air to loft it into a cloud — so it never rises above this (TC-P3-06).
 */
export const DUST_MAX_HEIGHT = 0.5;

/**
 * Sun direction over Tranquility Base, pointing toward the sun: low in the
 * east (−X, behind Eagle's approach), about eleven degrees up at landing, and
 * swung toward +Z so the moonwalk camera sees the cast side-lit rather than as
 * silhouettes.
 */
const LUNAR_SUN = new Vector3(-0.77, 0.19, 0.6).normalize();

export interface LunarSurfaceScene {
  /** The registered part: terrain, dust and the landing site move together. */
  group: Group;
  /** Its animated state; chapter 7 switches `visible`, update() writes `y`. */
  state: PartState;
  /** Parent for everything placed at Tranquility Base (the moonwalk cast). */
  site: Group;
  /** Eagle's flight state at the current mission time, down or back up. */
  readonly flight: FlightState;
  /**
   * Derives the surface's height and Eagle's attitude from mission time.
   * Runs BEFORE the reconciler, because it writes part state.
   */
  update(met: number): void;
  /** Shader uniforms, dust and sun. Runs after the reconciler. */
  apply(effects: EffectsState): void;
  /** Clip planes the Moon needs this frame, or null when it is not drawn. */
  clipPlanes(camera: PerspectiveCamera): { near: number; far: number } | null;
  /** Number of dust particles built, for the quality-tier check (TC-P3-13). */
  dustCount: number;
  dispose(): void;
}

interface Deps {
  vehicleFrame: Group;
  renderer: WebGLRenderer;
  /** Eagle's flight-frame state; its attitude is written here. */
  lmFlight: PartState;
  tier: QualityTier;
  /** The scene's image-based lighting, to use at the Moon's own intensity. */
  environment: Texture | null;
  /** The vehicle frame's key, fill and rim lights, from core/stage.ts. */
  lights: { sun: DirectionalLight; fill: Object3D & { intensity: number }; rim: Object3D & { intensity: number } };
}

export function createLunarSurface(deps: Deps): LunarSurfaceScene {
  const { vehicleFrame, renderer, lmFlight, tier, lights, environment } = deps;

  const group = new Group();
  group.name = 'lunar-surface';
  vehicleFrame.add(group);

  const state = createPartState({ visible: 0 });
  registerPart({
    name: 'lunar-surface',
    object: group,
    attachments: [{ parent: vehicleFrame, rest: { pos: [0, LUNAR_GROUND_Y, 0], rot: [0, 0, 0] } }],
    state,
  });

  const site = new Group();
  site.name = 'surface-site';
  group.add(site);

  // ── Terrain ─────────────────────────────────────────────────────────────
  const field = bakeCraterField();
  const geometry = buildRadialCap({
    radius: MOON_RADIUS_M,
    first: RING_FIRST,
    growth: RING_GROWTH,
    rim: RING_RIM,
    segments: SEGMENTS,
  });

  const uniforms = {
    uCraters: { value: field.texture },
    uTile: { value: [...TILES] },
    uAmp: { value: TILES.map((t, i) => (RELIEF[i]! * field.heightMax * t) / field.size) },
    uRelief: { value: [...RELIEF] },
    uShift: { value: TILES.map(() => [0, 0]).flat() },
    uToGo: { value: 0 },
    uSlope: { value: field.slopeMax },
    uRadius: { value: MOON_RADIUS_M },
    uTexSize: { value: field.size },
  };

  const material = new MeshStandardMaterial({
    color: new Color('#6F6B64'),
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.12,
    name: 'lunar-regolith',
  });
  // Assigned explicitly rather than inherited from scene.environment: three
  // applies the scene-wide environment intensity to anything that inherits it
  // and ignores the material's own, and the studio-bright room environment
  // that flatters the rocket would light the Moon like an overcast day — no
  // black shadows, no contrast. Set on the material, envMapIntensity holds.
  material.envMap = environment;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${TERRAIN_COMMON}\n${TERRAIN_VERTEX_DECL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${TERRAIN_VERTEX_BODY}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${TERRAIN_COMMON}\n${TERRAIN_FRAGMENT_DECL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${TERRAIN_ALBEDO}`)
      .replace('#include <normal_fragment_maps>', TERRAIN_NORMAL);
  };
  // Stable key: the injected code never changes, so one compiled program.
  material.customProgramCacheKey = () => 'lunar-regolith-v1';

  const terrain = new Mesh(geometry, material);
  terrain.name = 'lunar-terrain';
  terrain.receiveShadow = true;
  // The shader displaces vertices by kilometres; the CPU bounding sphere knows
  // nothing about that, and the disc is always underfoot anyway.
  terrain.frustumCulled = false;
  group.add(terrain);

  // ── Touchdown dust ──────────────────────────────────────────────────────
  const dustCount = particleBudget(tier).dust;
  const dustGeometry = new BufferGeometry();
  const seeds = new Float32Array(dustCount * 3);
  const dummy = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i += 1) {
    seeds[i * 3] = hash(i * 3.1) * Math.PI * 2;
    seeds[i * 3 + 1] = hash(i * 7.7 + 1);
    seeds[i * 3 + 2] = 0.55 + hash(i * 5.3 + 2) * 0.9;
  }
  dustGeometry.setAttribute('position', new Float32BufferAttribute(dummy, 3));
  dustGeometry.setAttribute('seed', new Float32BufferAttribute(seeds, 3));

  const dustUniforms = {
    uDust: { value: 0 },
    uFlow: { value: 0 },
    uReach: { value: DUST_REACH },
    uCeiling: { value: DUST_MAX_HEIGHT },
    uScale: { value: 400 },
    uColor: { value: new Color('#D6CFC1') },
  };
  const dustMaterial = new ShaderMaterial({
    name: 'lunar-dust',
    uniforms: dustUniforms,
    vertexShader: DUST_VERTEX,
    fragmentShader: DUST_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  });
  const dust = new Points(dustGeometry, dustMaterial);
  dust.name = 'lunar-dust';
  dust.frustumCulled = false;
  dust.visible = false;
  group.add(dust);

  // ── Sun ─────────────────────────────────────────────────────────────────
  // The vehicle frame's key light doubles as the lunar sun. It casts shadows
  // throughout — toggling `castShadow` mid-scroll would recompile every
  // material in the scene — but only the surface receives them, and nothing
  // receives them before chapter 7, so earlier chapters render identically.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  const { sun, fill, rim } = lights;
  const spaceSun = sun.position.clone().sub(sun.target.position).normalize();
  const sunTarget = sun.target;
  sunTarget.name = 'sun-target';
  sunTarget.position.set(0, LUNAR_GROUND_Y, 0);
  vehicleFrame.add(sunTarget);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const shadowCamera = sun.shadow.camera;
  shadowCamera.left = -40;
  shadowCamera.right = 40;
  shadowCamera.top = 40;
  shadowCamera.bottom = -40;
  shadowCamera.near = 1;
  shadowCamera.far = 700;
  shadowCamera.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  const baseFill = fill.intensity;
  const baseRim = rim.intensity;
  const sunDir = new Vector3();
  let shadowPrimed = false;

  const flight: FlightState = { altitude: 0, toGo: 0, attitude: 0 };
  const groundWorld = new Vector3();

  const update = (met: number): void => {
    flightAt(met, flight);
    state.y = -flight.altitude;
    lmFlight.rz = flight.attitude;

    // After liftoff the grid stays under the ascent stage and the crater field
    // slides on, so the landing site has to slide with it — the descent stage,
    // the flag and the footprints stay where they were left (TC-P4-01). Past
    // the site, toGo is negative: the site is that far behind. The drop is
    // the Moon's curvature, so the site sinks below the horizon rather than
    // floating along it.
    const behind = Math.min(0, flight.toGo);
    site.position.set(behind, -(behind * behind) / (2 * MOON_RADIUS_M), 0);
  };

  const apply = (effects: EffectsState): void => {
    // Slide the crater layers by how far Eagle has flown. Computed here in
    // double precision and wrapped, because 1,600 km in a float32 uniform would
    // leave the finest layer — eleven-metre tiles — swimming.
    const along = TRACK_ORIGIN - flight.toGo;
    const shift = uniforms.uShift.value;
    TILES.forEach((tile, i) => {
      const a = ROTATIONS[i]!;
      const u = along / tile;
      shift[i * 2] = fract(Math.cos(a) * u);
      shift[i * 2 + 1] = fract(Math.sin(a) * u);
    });
    uniforms.uToGo.value = flight.toGo;

    dust.visible = group.visible && effects.dust > 0.005;
    dustUniforms.uDust.value = effects.dust;
    dustUniforms.uFlow.value = effects.dustFlow;
    dustUniforms.uScale.value = renderer.domElement.height / 2;

    // The key light swings from the angle it has lit the rocket at since the
    // pad to the Moon's low morning sun, and the fill and rim — earthshine and
    // a separation light, both wrong on the surface — fade out.
    sunDir.copy(spaceSun).lerp(LUNAR_SUN, effects.lunarSun).normalize();
    sun.position.copy(sunTarget.position).addScaledVector(sunDir, 300);
    fill.intensity = baseFill * (1 - 0.85 * effects.lunarSun);
    rim.intensity = baseRim * (1 - effects.lunarSun);
    // The shadow map only has a receiver once the surface is up. Redrawing it
    // every frame through launch and the coast would be pure cost. It is still
    // drawn once at startup: until it has been, there is no depth texture to
    // bind to the shadow sampler every lit material now declares, and WebGL
    // rejects the draw.
    renderer.shadowMap.autoUpdate = effects.lunarSun > 0.01;
    if (!shadowPrimed) {
      renderer.shadowMap.needsUpdate = true;
      shadowPrimed = true;
    }
  };

  /**
   * Clip planes while the Moon is drawn, or null when it is not.
   *
   * The vehicle frame normally fits in the renderer's default range; the Moon
   * does not. Far reaches just past the horizon for the camera's height, and
   * near scales with it so the depth buffer keeps its precision — the camera
   * is never closer than a few metres to anything while it is high up.
   */
  const clipPlanes = (camera: PerspectiveCamera): { near: number; far: number } | null => {
    if (!group.visible) return null;
    group.getWorldPosition(groundWorld);
    const h = Math.max(1, camera.position.y - groundWorld.y);
    const horizon = Math.sqrt(2 * MOON_RADIUS_M * h + h * h);
    const far = horizon * 1.15 + 2000;
    const near = Math.min(3, Math.max(0.05, far / 300_000));
    return { near, far };
  };

  const dispose = (): void => {
    geometry.dispose();
    material.dispose();
    field.texture.dispose();
    dustGeometry.dispose();
    dustMaterial.dispose();
    vehicleFrame.remove(group, sunTarget);
  };

  return { group, state, site, flight, update, apply, clipPlanes, dustCount, dispose };
}

function fract(v: number): number {
  return v - Math.floor(v);
}

function hash(n: number): number {
  const s = Math.sin(n * 91.3458) * 47453.5453;
  return s - Math.floor(s);
}

// ── Shaders ────────────────────────────────────────────────────────────────

/**
 * Shared by both stages: the layer rotations, the landing-site flattening,
 * and West crater — the one real feature on the approach, the boulder-strewn
 * crater that made Armstrong fly long.
 */
const TERRAIN_COMMON = /* glsl */ `
uniform sampler2D uCraters;
uniform float uTile[4];
uniform float uAmp[4];
uniform float uRelief[4];
uniform float uShift[8];
uniform float uToGo;
uniform float uSlope;
uniform float uRadius;
uniform float uTexSize;

mat2 layerRot(int i) {
  float a = i == 0 ? ${ROTATIONS[0].toFixed(4)} : i == 1 ? ${ROTATIONS[1].toFixed(4)} : i == 2 ? ${ROTATIONS[2].toFixed(4)} : ${ROTATIONS[3].toFixed(4)};
  float c = cos(a);
  float s = sin(a);
  return mat2(c, s, -s, c);
}

vec2 layerUV(int i, vec2 g) {
  return layerRot(i) * (g / uTile[i]) + vec2(uShift[i * 2], uShift[i * 2 + 1]);
}

// 0 on the landing site, rising to 1 around it: Armstrong chose a smooth spot.
float siteFlat(vec2 g) {
  return smoothstep(28.0, 140.0, length(vec2(g.x - uToGo, g.y)));
}

// Flat enough to walk on out to where the experiments were set down.
float walkFlat(vec2 g) {
  return smoothstep(22.0, 60.0, length(vec2(g.x - uToGo, g.y)));
}

// West crater, about 190 m across and 400 m short of the landing site.
float westCrater(vec2 g) {
  vec2 d = vec2(g.x - uToGo + 400.0, g.y - 35.0) / 95.0;
  float r = length(d);
  if (r < 1.0) return -21.0 + 26.0 * pow(r, 2.4);
  return 5.0 * exp(-(r - 1.0) * (r - 1.0) / 0.16);
}
`;

const TERRAIN_VERTEX_DECL = /* glsl */ `
attribute vec2 ground;
attribute float spacing;
varying vec2 vGround;
varying vec3 vSphereN;
`;

const TERRAIN_VERTEX_BODY = /* glsl */ `
{
  vec3 sphereN = normalize(position + vec3(0.0, uRadius, 0.0));
  vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  float camD = distance(worldPos, cameraPosition);
  float flatness = siteFlat(ground);
  float h = 0.0;
  for (int i = 0; i < 4; i++) {
    float tile = uTile[i];
    // Fade a layer out where the grid is too coarse to carry it, and where
    // it is too far away to see — either would alias as the field slides.
    float fade = (1.0 - smoothstep(tile / 300.0, tile / 70.0, spacing))
               * (1.0 - smoothstep(tile * 10.0, tile * 45.0, camD));
    float lod = log2(max(spacing * uTexSize / tile, 1.0));
    float sampleH = textureLod(uCraters, layerUV(i, ground), lod).r * 2.0 - 1.0;
    // Under Eagle and where the crew walked, the finest layer is flattened
    // too, so footpads and boots meet the ground rather than floating over
    // or sinking into its pits. Its shading is kept (see TERRAIN_NORMAL).
    float keep = i == 3 ? walkFlat(ground) : flatness;
    h += sampleH * uAmp[i] * fade * keep;
  }
  h += westCrater(ground);
  transformed += sphereN * h;
  vGround = ground;
  vSphereN = sphereN;
}
`;

const TERRAIN_FRAGMENT_DECL = /* glsl */ `
varying vec2 vGround;
varying vec3 vSphereN;
`;

const TERRAIN_ALBEDO = /* glsl */ `
{
  float camD = length(vViewPosition);
  float albedo = 0.0;
  for (int i = 0; i < 4; i++) {
    float tile = uTile[i];
    float fade = 1.0 - smoothstep(tile * 8.0, tile * 60.0, camD);
    albedo += (texture2D(uCraters, layerUV(i, vGround)).a - 0.5) * fade;
  }
  diffuseColor.rgb *= clamp(1.0 + albedo * 1.4, 0.55, 1.7);
}
`;

/**
 * Replaces normal_fragment_maps: tilts the sphere normal by the summed crater
 * slopes. The terrain group is never rotated, so object space is world space
 * up to a translation, and the view matrix alone takes it to view space.
 */
const TERRAIN_NORMAL = /* glsl */ `
{
  float camD = length(vViewPosition);
  float flatness = siteFlat(vGround);
  vec2 slope = vec2(0.0);
  for (int i = 0; i < 4; i++) {
    float tile = uTile[i];
    float fade = 1.0 - smoothstep(tile * 8.0, tile * 60.0, camD);
    vec2 s = (texture2D(uCraters, layerUV(i, vGround)).gb * 2.0 - 1.0) * uSlope;
    float keep = i == 3 ? mix(0.45, 1.0, walkFlat(vGround)) : flatness;
    slope += (transpose(layerRot(i)) * s) * uRelief[i] * fade * keep;
  }
  float e = 0.75;
  slope += vec2(
    westCrater(vGround + vec2(e, 0.0)) - westCrater(vGround - vec2(e, 0.0)),
    westCrater(vGround + vec2(0.0, e)) - westCrater(vGround - vec2(0.0, e))
  ) / (2.0 * e);
  vec3 n = normalize(vSphereN);
  vec3 tx = normalize(vec3(1.0, 0.0, 0.0) - n * n.x);
  vec3 tz = normalize(cross(tx, n));
  vec3 perturbed = normalize(n - slope.x * tx - slope.y * tz);
  normal = normalize(mat3(viewMatrix) * perturbed);
}
`;

const DUST_VERTEX = /* glsl */ `
attribute vec3 seed;
uniform float uDust;
uniform float uFlow;
uniform float uReach;
uniform float uCeiling;
uniform float uScale;
varying float vAlpha;

void main() {
  // Each grain rides a straight ray outward from under the engine. No drag,
  // no lift: in vacuum dust flies flat and far, which is what the landing
  // film shows — a sheet, not a cloud.
  float t = fract(seed.y + uFlow * seed.z);
  float r = mix(2.0, uReach, t);
  // Thickest close in, thinning to a skin at the edge; always under uCeiling.
  float y = 0.03 + (uCeiling - 0.06) * (1.0 - t) * fract(seed.z * 7.13);
  vec3 p = vec3(cos(seed.x) * r, y, sin(seed.x) * r);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(1.6 * uScale / -mv.z, 1.0, 64.0);
  vAlpha = uDust * (1.0 - smoothstep(0.5, 1.0, t)) * 0.85;
}
`;

const DUST_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = vAlpha * (1.0 - smoothstep(0.15, 0.5, d));
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
}
`;

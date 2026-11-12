import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Story mode only: Cape Kennedy around the pad, so the prologue's "my humans
 * built a giant rocket" lands somewhere rather than on an endless grey plane.
 *
 * Grass, a sandy cape curving out to the Atlantic, palms, the Vehicle Assembly
 * Building on the skyline, the pad's water tower, a crowd and their cars on
 * the causeway, puffy clouds and a warm haze on the horizon.
 *
 * Everything lives in the pad group, so it falls away with the pad at liftoff
 * exactly as the concrete does. Cost is kept to four draw calls by baking the
 * props into one vertex-coloured mesh and the ground into another.
 *
 * Coordinates: metres, pad deck at the origin, ground at y = -16. The pad
 * camera sits at +x/+z looking back at the origin, so the scenery that shows
 * behind the rocket is laid out towards -x/-z.
 */

const GROUND_Y = -16;

/** The cape: a disc of land, sea to the camera's left and behind. */
const LAND = { x: 300, z: -500, r: 1000 };
const onLand = (x: number, z: number, margin = 80): boolean =>
  Math.hypot(x - LAND.x, z - LAND.z) < LAND.r - margin;

/** The Vehicle Assembly Building, on the skyline behind the pad. */
const VAB = { x: -310, z: -1030 };
const crawlerHeading = Math.atan2(VAB.x, VAB.z);
const onCrawlerway = (x: number, z: number): boolean => {
  const len = Math.hypot(VAB.x, VAB.z);
  const ux = VAB.x / len;
  const uz = VAB.z / len;
  const t = x * ux + z * uz;
  const perp = Math.abs(x * uz - z * ux);
  return t > 0 && t < len && perp < 30;
};

/** Bake a colour into a geometry and move it into place, for merging. */
function tint(
  geometry: BufferGeometry,
  color: Color | string | number,
  x = 0,
  y = 0,
  z = 0,
  opts: { rx?: number; ry?: number; rz?: number; sx?: number; sy?: number; sz?: number } = {},
): BufferGeometry {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  if (g !== geometry) geometry.dispose();
  g.deleteAttribute('uv');
  if (opts.sx || opts.sy || opts.sz) g.scale(opts.sx ?? 1, opts.sy ?? 1, opts.sz ?? 1);
  if (opts.rx) g.rotateX(opts.rx);
  if (opts.rz) g.rotateZ(opts.rz);
  if (opts.ry) g.rotateY(opts.ry);
  g.translate(x, y, z);
  const c = new Color(color);
  const n = g.getAttribute('position').count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new BufferAttribute(colors, 3));
  return g;
}

/** Small deterministic PRNG so the scenery is the same on every load. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const C = {
  grass: '#7DBA4F',
  grassDeep: '#5E9E3C',
  sand: '#EED9A4',
  ocean: '#3E9BD0',
  oceanShallow: '#69C2D9',
  surf: '#F4FBFF',
  concrete: '#C9C4B8',
  road: '#9C978C',
  trunk: '#8A5A34',
  frond: '#3E9A47',
  frondLight: '#5DB85A',
  bush: '#4F9A40',
  vab: '#E9E6DE',
  vabDoor: '#B8B5AE',
  flagRed: '#C8323A',
  flagBlue: '#2C4A8C',
  white: '#FFFFFF',
  tower: '#F2EFE6',
  towerLeg: '#B44A2A',
};

/** The ground: grass, a sandy shore, shallows and the Atlantic beyond. */
function buildGround(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const flat = (g: BufferGeometry, color: string, x: number, y: number, z: number): void => {
    parts.push(tint(g, color, x, GROUND_Y + y, z, { rx: -Math.PI / 2 }));
  };

  // The sea fills everything, the land sits on top of it as a cape whose
  // shore curves around behind the pad.
  flat(new PlaneGeometry(4000, 4000), C.ocean, 0, -0.6, 0);
  const capeX = LAND.x;
  const capeZ = LAND.z;
  flat(new CircleGeometry(LAND.r + 70, 96), C.oceanShallow, capeX, -0.4, capeZ);
  flat(new RingGeometry(LAND.r, LAND.r + 16, 96), C.surf, capeX, -0.3, capeZ);
  flat(new CircleGeometry(LAND.r, 96), C.sand, capeX, -0.2, capeZ);
  flat(new CircleGeometry(LAND.r - 60, 96), C.grass, capeX, 0, capeZ);

  // Patches of darker grass so the field is not one flat colour.
  const r = rng(7);
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const d = 90 + r() * 650;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (!onLand(x, z, 110)) continue;
    flat(new CircleGeometry(20 + r() * 50, 18), C.grassDeep, x, 0.05, z);
  }

  // The concrete hardstand under the launcher, and the crawlerway heading
  // inland towards the VAB.
  flat(new CircleGeometry(72, 48), C.concrete, 0, 0.1, 0);
  const crawlerLen = Math.hypot(VAB.x, VAB.z) - 60;
  parts.push(
    tint(new PlaneGeometry(26, crawlerLen), C.road, (VAB.x / 2) * 0.94, GROUND_Y + 0.12, (VAB.z / 2) * 0.94, {
      rx: -Math.PI / 2,
      ry: crawlerHeading,
    }),
  );

  const merged = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  return merged;
}

function palm(parts: BufferGeometry[], x: number, z: number, h: number, lean: number, turn: number): void {
  const y0 = GROUND_Y;
  const trunk = new CylinderGeometry(0.45, 0.8, h, 6);
  // Lean the trunk by shearing its top over.
  const pos = trunk.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + h / 2) / h;
    pos.setX(i, pos.getX(i) + lean * t * t * h);
  }
  parts.push(tint(trunk, C.trunk, x, y0 + h / 2, z, { ry: turn }));
  const topX = x + Math.cos(turn) * lean * h;
  const topZ = z - Math.sin(turn) * lean * h;
  const topY = y0 + h;
  parts.push(tint(new SphereGeometry(1.1, 6, 5), C.trunk, topX, topY, topZ));
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + turn;
    const frond = new ConeGeometry(1.4, 9, 4);
    parts.push(
      tint(frond, k % 2 ? C.frond : C.frondLight, topX + Math.cos(a) * 3.6, topY - 0.9, topZ + Math.sin(a) * 3.6, {
        sz: 0.35,
        rz: Math.PI / 2 + 0.35,
        ry: -a,
      }),
    );
  }
}

/** Everything that stands up: one merged, vertex-coloured mesh. */
function buildProps(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const r = rng(42);

  // ── Vehicle Assembly Building, on the skyline behind the pad ──────────────
  const vab = { x: VAB.x, z: VAB.z, ry: crawlerHeading };
  const put = (g: BufferGeometry, color: string, lx: number, ly: number, lz: number): void => {
    const c = Math.cos(vab.ry);
    const s = Math.sin(vab.ry);
    parts.push(tint(g, color, vab.x + lx * c + lz * s, ly, vab.z - lx * s + lz * c, { ry: vab.ry }));
  };
  put(new BoxGeometry(160, 160, 120), C.vab, 0, GROUND_Y + 80, 0);
  put(new BoxGeometry(80, 64, 110), C.vab, 118, GROUND_Y + 32, 0);
  // Its tall doors, facing the pad.
  for (const lx of [-42, 42]) put(new BoxGeometry(22, 136, 1), C.vabDoor, lx, GROUND_Y + 68, -60.5);
  // The flag painted on the face towards the pad, between the doors, and
  // the NASA blue meatball beside it.
  for (let i = 0; i < 7; i++) {
    put(new BoxGeometry(56, 5, 1), i % 2 ? C.white : C.flagRed, 0, GROUND_Y + 112 + i * 5, -60.8);
  }
  put(new BoxGeometry(24, 20, 1.2), C.flagBlue, -16, GROUND_Y + 134.5, -61);
  {
    const disc = new CylinderGeometry(9, 9, 1.2, 20);
    disc.rotateX(Math.PI / 2);
    put(disc, C.flagBlue, 0, GROUND_Y + 92, -61);
  }
  put(new BoxGeometry(14, 1.6, 1.4), C.flagRed, 0, GROUND_Y + 92, -61.2);

  // ── The pad's water tower: a white ball on red legs ───────────────────────
  const wt = { x: -95, z: -170 };
  parts.push(tint(new SphereGeometry(9, 14, 10), C.tower, wt.x, GROUND_Y + 46, wt.z));
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    parts.push(
      tint(new CylinderGeometry(0.6, 0.6, 42, 5), C.towerLeg, wt.x + Math.cos(a) * 5, GROUND_Y + 21, wt.z + Math.sin(a) * 5, {
        rx: Math.sin(a) * 0.12,
        rz: -Math.cos(a) * 0.12,
      }),
    );
  }

  // ── Palms in loose groves, and bushes along the shore ─────────────────────
  const groves: [number, number, number][] = [
    [-170, -110, 9],
    [-60, -260, 7],
    [130, -210, 8],
    [-260, 60, 7],
    [230, -60, 6],
    [-380, -330, 8],
    [40, -420, 6],
  ];
  for (const [gx, gz, n] of groves) {
    for (let i = 0; i < n; i++) {
      const x = gx + (r() - 0.5) * 70;
      const z = gz + (r() - 0.5) * 70;
      if (Math.hypot(x, z) < 85 || !onLand(x, z) || onCrawlerway(x, z)) continue;
      palm(parts, x, z, 11 + r() * 9, (r() - 0.3) * 0.25, r() * Math.PI * 2);
    }
  }
  for (let i = 0; i < 70; i++) {
    const a = -Math.PI * 0.95 + r() * Math.PI * 1.3;
    const d = 150 + r() * 420;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (!onLand(x, z, 70) || onCrawlerway(x, z)) continue;
    const s = 3 + r() * 5;
    parts.push(tint(new IcosahedronGeometry(s, 0), r() > 0.5 ? C.bush : C.grassDeep, x, GROUND_Y + s * 0.5, z, { sy: 0.7 }));
  }

  // ── The crowd on the causeway, with their cars ────────────────────────────
  const shirts = ['#FF6A3D', '#FFB547', '#3C8DDE', '#E04F8A', '#7B5BD6', '#2FAE8E', '#FFFFFF', '#F2D04B'];
  const cars = ['#D9473A', '#3C8DDE', '#F2D04B', '#2FAE8E', '#F4F1EA', '#E58A12'];
  const crowd = { x: 210, z: -150 };
  // A bleacher stand.
  for (let row = 0; row < 4; row++) {
    parts.push(tint(new BoxGeometry(44, 1.2, 3), '#D8D2C4', crowd.x, GROUND_Y + 1 + row * 1.6, crowd.z - row * 3, { ry: 0.5 }));
    for (let i = 0; i < 16; i++) {
      const along = -20 + i * 2.6 + (r() - 0.5);
      const px = crowd.x + Math.cos(0.5) * along;
      const pz = crowd.z - Math.sin(0.5) * along - row * 3;
      const y = GROUND_Y + 2.2 + row * 1.6;
      parts.push(tint(new BoxGeometry(0.9, 1.4, 0.6), shirts[Math.floor(r() * shirts.length)]!, px, y, pz, { ry: 0.5 }));
      parts.push(tint(new SphereGeometry(0.42, 6, 4), '#F0C8A0', px, y + 1.05, pz));
    }
  }
  for (let i = 0; i < 14; i++) {
    const along = -60 + i * 8.5;
    const x = crowd.x + 30 + Math.cos(0.5) * along;
    const z = crowd.z + 26 - Math.sin(0.5) * along;
    const color = cars[i % cars.length]!;
    parts.push(tint(new BoxGeometry(4.4, 1.3, 2), color, x, GROUND_Y + 0.9, z, { ry: 0.5 + Math.PI / 2 }));
    parts.push(tint(new BoxGeometry(2.4, 1, 1.8), color, x, GROUND_Y + 2, z, { ry: 0.5 + Math.PI / 2 }));
  }

  // ── A lighthouse out on the point, for the shoreline ──────────────────────
  const lh = { x: -420, z: -150 };
  for (let i = 0; i < 5; i++) {
    parts.push(tint(new CylinderGeometry(3.4 - i * 0.3, 3.7 - i * 0.3, 6, 10), i % 2 ? C.flagRed : C.white, lh.x, GROUND_Y + 3 + i * 6, lh.z));
  }
  parts.push(tint(new CylinderGeometry(2.2, 2.2, 3, 10), '#FFE9A8', lh.x, GROUND_Y + 32.5, lh.z));
  parts.push(tint(new ConeGeometry(2.8, 3, 10), C.flagRed, lh.x, GROUND_Y + 35.5, lh.z));

  // ── Sailboats on the Atlantic ─────────────────────────────────────────────
  for (const [bx, bz] of [
    [-900, -300],
    [-800, 150],
    [-1100, -700],
  ] as const) {
    parts.push(tint(new BoxGeometry(10, 2, 3.4), C.white, bx, GROUND_Y + 0.4, bz));
    parts.push(tint(new ConeGeometry(4, 12, 3), C.white, bx, GROUND_Y + 8, bz, { sz: 0.15 }));
  }

  // ── Gulls: little V shapes against the sky ────────────────────────────────
  for (let i = 0; i < 9; i++) {
    const x = -160 + r() * 220;
    const y = 70 + r() * 70;
    const z = -120 + r() * 120;
    for (const side of [-1, 1]) {
      parts.push(tint(new BoxGeometry(2.6, 0.25, 0.5), '#3A3550', x + side * 1.15, y, z, { rz: side * 0.35, ry: 0.8 }));
    }
  }

  const merged = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  return merged;
}

/** Puffy clouds: clusters of flattened balls, one merged mesh. */
function buildClouds(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const r = rng(99);
  const clouds: [number, number, number, number][] = [
    [-700, 340, -1100, 1.4],
    [-1150, 260, -500, 1.1],
    [-300, 420, -1350, 1.2],
    [200, 300, -1200, 1.0],
    [-1350, 380, 120, 1.3],
    [-950, 520, -1000, 0.9],
    [500, 460, -1300, 1.1],
  ];
  for (const [cx, cy, cz, s] of clouds) {
    const puffs = 6 + Math.floor(r() * 4);
    for (let i = 0; i < puffs; i++) {
      const t = i / (puffs - 1) - 0.5;
      const rad = (34 + r() * 30) * s * (1 - Math.abs(t) * 0.8);
      parts.push(
        tint(new DodecahedronGeometry(rad, 1), C.white, cx + t * 200 * s + (r() - 0.5) * 20, cy + rad * 0.3, cz + (r() - 0.5) * 50, {
          sy: 0.62,
        }),
      );
    }
  }
  const merged = mergeGeometries(parts)!;
  for (const p of parts) p.dispose();
  return merged;
}

/**
 * Inside the 2,000 m far plane from every pad camera, with room to spare for
 * looking up: any further and the ring is clipped into a hard arc in the sky.
 */
const HAZE_RADIUS = 1350;

/** A warm haze band on the horizon, fading to nothing overhead. */
function buildHaze(): { mesh: Mesh; material: ShaderMaterial } {
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      low: { value: new Color('#FFE9C9') },
      high: { value: new Color('#B9D7F0') },
    },
    vertexShader: /* glsl */ `
      varying float vH;
      void main() {
        vH = uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 low;
      uniform vec3 high;
      varying float vH;
      void main() {
        vec3 c = mix(low, high, smoothstep(0.03, 0.3, vH));
        float a = (1.0 - smoothstep(0.03, 0.42, vH)) * 0.92;
        gl_FragColor = vec4(c, a);
      }
    `,
  });
  const mesh = new Mesh(new CylinderGeometry(HAZE_RADIUS, HAZE_RADIUS, 900, 64, 1, true), material);
  mesh.name = 'story-horizon-haze';
  mesh.position.y = GROUND_Y - 30 + 450;
  mesh.renderOrder = -1;
  return { mesh, material };
}

export interface PadScenery {
  group: Group;
  dispose: () => void;
}

export function createPadScenery(): PadScenery {
  const group = new Group();
  group.name = 'story-scenery';

  const flatMaterial = new MeshLambertMaterial({ vertexColors: true, name: 'story-ground' });
  const ground = new Mesh(buildGround(), flatMaterial);
  ground.name = 'story-ground';
  group.add(ground);

  const propMaterial = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, flatShading: true, name: 'story-props' });
  const props = new Mesh(buildProps(), propMaterial);
  props.name = 'story-props';
  group.add(props);

  const cloudMaterial = new MeshLambertMaterial({
    vertexColors: true,
    emissive: new Color('#C9D8EA'),
    emissiveIntensity: 0.55,
    name: 'story-clouds',
  });
  const clouds = new Mesh(buildClouds(), cloudMaterial);
  clouds.name = 'story-clouds';
  group.add(clouds);

  const haze = buildHaze();
  group.add(haze.mesh);

  const dispose = (): void => {
    for (const m of [ground, props, clouds, haze.mesh]) m.geometry.dispose();
    flatMaterial.dispose();
    propMaterial.dispose();
    cloudMaterial.dispose();
    haze.material.dispose();
  };

  return { group, dispose };
}

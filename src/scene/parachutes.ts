import {
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  SRGBColorSpace,
  type Material,
} from 'three';

/**
 * The Command Module's parachutes: two drogues and three mains.
 *
 * Built so that one scale per axis tells the whole deployment story. Each
 * parachute's origin is its attach point on the CM's upper deck; the risers
 * run straight up from it to the canopy rim. So:
 *
 *   - `sy` from near 0 to 1 is the lines paying out;
 *   - `sx`/`sz` at 0.25 is the reefed canopy, 1 the fully open one.
 *
 * Chapter 10 tweens those as part state, which keeps the parachutes inside
 * the reconciler's pure-function-of-progress model — they un-deploy in exact
 * reverse order when the viewer scrolls back (TC-P4-07).
 *
 * The mains are the real size: 25.4 m across, orange and white gores. The
 * drogues are 5 m conical ribbons.
 */

export interface ParachuteSpec {
  name: string;
  /** Canopy radius, metres. */
  radius: number;
  /** Riser length from the attach point to the canopy rim, metres. */
  lines: number;
  /** Outward lean from vertical, radians, and which way. */
  lean: number;
  azimuth: number;
}

export const PARACHUTES: readonly ParachuteSpec[] = [
  { name: 'drogue-1', radius: 2.5, lines: 11, lean: 0.22, azimuth: 0 },
  { name: 'drogue-2', radius: 2.5, lines: 11, lean: 0.22, azimuth: Math.PI },
  { name: 'main-1', radius: 12.7, lines: 24, lean: 0.34, azimuth: Math.PI / 2 },
  { name: 'main-2', radius: 12.7, lines: 24, lean: 0.34, azimuth: Math.PI / 2 + (2 * Math.PI) / 3 },
  { name: 'main-3', radius: 12.7, lines: 24, lean: 0.34, azimuth: Math.PI / 2 + (4 * Math.PI) / 3 },
] as const;

/** How far the canopy reaches down from its crown: a shallow dome, not a ball. */
const CANOPY_ARC = Math.PI * 0.4;
const GORES = 12;
const RISERS = 12;

export interface ParachuteSet {
  groups: Record<string, Group>;
  materials: Material[];
  dispose(): void;
}

export function buildParachutes(): ParachuteSet {
  const geometries: BufferGeometry[] = [];
  const goreTexture = makeGoreTexture();
  const canopyMaterial = new MeshStandardMaterial({
    map: goreTexture,
    roughness: 0.85,
    metalness: 0,
    side: DoubleSide,
    name: 'parachute-canopy',
  });
  const drogueMaterial = new MeshStandardMaterial({
    color: '#F2EEE6',
    roughness: 0.85,
    metalness: 0,
    side: DoubleSide,
    name: 'parachute-drogue',
  });
  const lineMaterial = new LineBasicMaterial({ color: '#CFC9BE', name: 'parachute-lines' });

  const groups: Record<string, Group> = {};

  for (const spec of PARACHUTES) {
    const group = new Group();
    group.name = spec.name;
    groups[spec.name] = group;

    // The canopy is a spherical cap whose rim sits at the top of the lines.
    const rimY = spec.lines;
    const sphereR = spec.radius / Math.sin(CANOPY_ARC);
    const centreY = rimY - sphereR * Math.cos(CANOPY_ARC);
    const canopyGeo = new SphereGeometry(sphereR, GORES * 2, 6, 0, Math.PI * 2, 0, CANOPY_ARC);
    canopyGeo.translate(0, centreY, 0);
    geometries.push(canopyGeo);
    const canopy = new Mesh(canopyGeo, spec.name.startsWith('main') ? canopyMaterial : drogueMaterial);
    canopy.name = `${spec.name}-canopy`;
    canopy.castShadow = false;

    // Risers: straight lines from the attach point to evenly spaced points on
    // the rim. One LineSegments, one draw call.
    const positions: number[] = [];
    for (let i = 0; i < RISERS; i += 1) {
      const a = (i / RISERS) * Math.PI * 2;
      positions.push(0, 0, 0, Math.cos(a) * spec.radius, rimY, Math.sin(a) * spec.radius);
    }
    const riserGeo = new BufferGeometry();
    riserGeo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometries.push(riserGeo);
    const risers = new LineSegments(riserGeo, lineMaterial);
    risers.name = `${spec.name}-risers`;

    // Lean outward so the three mains spread into their familiar cluster
    // rather than stacking on one axis.
    const lean = new Group();
    lean.name = `${spec.name}-lean`;
    lean.rotation.set(Math.sin(spec.azimuth) * spec.lean, 0, -Math.cos(spec.azimuth) * spec.lean);
    lean.add(canopy, risers);
    group.add(lean);
  }

  return {
    groups,
    materials: [canopyMaterial, drogueMaterial, lineMaterial],
    dispose(): void {
      for (const g of geometries) g.dispose();
      canopyMaterial.dispose();
      drogueMaterial.dispose();
      lineMaterial.dispose();
      goreTexture.dispose();
    },
  };
}

/** Alternating orange and white gores, as on Apollo's main parachutes. */
function makeGoreTexture(): CanvasTexture {
  const w = 256;
  const h = 32;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    for (let i = 0; i < GORES * 2; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? '#E8742F' : '#F4F1EA';
      ctx.fillRect((i * w) / (GORES * 2), 0, w / (GORES * 2) + 1, h);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

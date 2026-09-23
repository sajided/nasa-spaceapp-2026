import { BufferGeometry, Float32BufferAttribute } from 'three';

export interface RadialCapSpec {
  /** Radius of the sphere the cap is bent onto, metres. */
  radius: number;
  /** Radius of the first ring around the centre, metres. */
  first: number;
  /** Growth factor from one ring to the next. */
  growth: number;
  /** Ground distance to the outermost ring, metres. */
  rim: number;
  /** Vertices per ring. */
  segments: number;
}

/**
 * A disc of rings at geometrically growing radii, bent onto a sphere whose
 * top touches the origin.
 *
 * Dense under the vehicle and sparse at the horizon, so one mesh serves every
 * altitude with nothing to switch — the lunar surface (scene/lunarSurface.ts)
 * and the Pacific (scene/reentry.ts) are both one of these. Besides position
 * and normal it carries `ground` (the flat ground-distance coordinates) and
 * `spacing` (the local grid spacing), which the terrain shader uses to fade
 * detail it is too coarse to carry.
 */
export function buildRadialCap(spec: RadialCapSpec): BufferGeometry {
  const { radius, first, growth, rim, segments } = spec;
  const SEGMENTS = segments;
  const radii: number[] = [0];
  for (let r = first; r < rim; r *= growth) radii.push(r);
  radii.push(rim);

  const vertexCount = 1 + (radii.length - 1) * SEGMENTS;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const grounds = new Float32Array(vertexCount * 2);
  const spacings = new Float32Array(vertexCount);

  const R = radius;
  const write = (index: number, s: number, phi: number, spacing: number): void => {
    const theta = s / R;
    const nx = Math.sin(theta) * Math.cos(phi);
    const ny = Math.cos(theta);
    const nz = Math.sin(theta) * Math.sin(phi);
    positions[index * 3] = R * nx;
    positions[index * 3 + 1] = R * ny - R;
    positions[index * 3 + 2] = R * nz;
    normals[index * 3] = nx;
    normals[index * 3 + 1] = ny;
    normals[index * 3 + 2] = nz;
    grounds[index * 2] = s * Math.cos(phi);
    grounds[index * 2 + 1] = s * Math.sin(phi);
    spacings[index] = spacing;
  };

  write(0, 0, 0, first);
  for (let ring = 1; ring < radii.length; ring += 1) {
    const s = radii[ring]!;
    const spacing = Math.max(s - radii[ring - 1]!, (2 * Math.PI * s) / SEGMENTS);
    for (let k = 0; k < SEGMENTS; k += 1) {
      write(1 + (ring - 1) * SEGMENTS + k, s, (k / SEGMENTS) * Math.PI * 2, spacing);
    }
  }

  const indices: number[] = [];
  // Centre fan.
  for (let k = 0; k < SEGMENTS; k += 1) {
    indices.push(0, 1 + ((k + 1) % SEGMENTS), 1 + k);
  }
  for (let ring = 1; ring < radii.length - 1; ring += 1) {
    const a = 1 + (ring - 1) * SEGMENTS;
    const b = 1 + ring * SEGMENTS;
    for (let k = 0; k < SEGMENTS; k += 1) {
      const k1 = (k + 1) % SEGMENTS;
      indices.push(a + k, a + k1, b + k);
      indices.push(a + k1, b + k1, b + k);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  geometry.setAttribute('ground', new Float32BufferAttribute(grounds, 2));
  geometry.setAttribute('spacing', new Float32BufferAttribute(spacings, 1));
  geometry.setIndex(indices);
  return geometry;
}


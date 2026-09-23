import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat } from 'three';

/**
 * A tileable crater field, baked once at startup.
 *
 * The lunar surface has to read at every scale from 110 km up to a boot print,
 * and ship at zero bytes: the page-weight budget (TC-P6-01) has no room for a
 * terrain dataset. Craters are self-similar — a field of small craters looks
 * like a field of big ones — so one tile, sampled at four scales with a
 * different rotation each, stands in for the whole range. The terrain shader
 * does the layering (scene/lunarSurface.ts); this only bakes the tile.
 *
 * Channels, all 8-bit:
 *   R  height, mapped from [-1, 1]
 *   G  slope ∂h/∂x in texels, mapped from [-slopeMax, slopeMax]
 *   B  slope ∂h/∂y, likewise
 *   A  albedo: 0.5 is average regolith; fresh ejecta is brighter
 *
 * Slopes are baked rather than taken by finite differences in the fragment
 * shader: one texture tap per layer instead of five, which matters on phones
 * and on the software rasteriser the test suite runs under.
 *
 * Why the slopes need no per-layer scaling: heights are in texel units, and a
 * layer of tile size T maps a texel to T/size metres both horizontally and
 * vertically. A 30° crater wall is 30° at every scale, so the world slope is
 * just the baked slope, rotated into the layer's orientation.
 *
 * Seeded, so the Moon is the same Moon on every load and in every screenshot.
 */

export interface CraterField {
  texture: DataTexture;
  /** Tile resolution in texels. */
  size: number;
  /** Largest |height| in texels, before normalisation. */
  heightMax: number;
  /** Largest |slope|, the scale for the G and B channels. */
  slopeMax: number;
}

/** mulberry32: small, fast, and good enough for scattering craters. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Crater profile at normalised distance d = distance / radius.
 *
 * A parabolic bowl rising to a raised rim at d = 1, then an ejecta blanket
 * decaying outside it. Depth is about a third of the radius, the proportion of
 * a fresh simple crater; `fresh` below 1 softens both for older, degraded ones.
 */
function profile(d: number, radius: number, fresh: number): number {
  const depth = 0.32 * radius * fresh;
  const rim = 0.075 * radius * fresh;
  // A slightly steepened parabola: floor at -depth, rim crest at d = 1.
  if (d < 1) return -depth + (depth + rim) * d ** 2.4;
  return rim * Math.exp(-((d - 1) * (d - 1)) / 0.16);
}

export function bakeCraterField(size = 512, seed = 1969): CraterField {
  const random = rng(seed);
  const height = new Float32Array(size * size);
  const albedo = new Float32Array(size * size).fill(0.5);
  const wrap = (v: number): number => ((v % size) + size) % size;

  // Gentle undulation first, so the maria are not billiard-table flat between
  // craters: a few broad, low swells.
  for (let i = 0; i < 24; i += 1) {
    const cx = random() * size;
    const cy = random() * size;
    const r = size * (0.08 + random() * 0.18);
    const amp = (random() - 0.5) * r * 0.05;
    const reach = Math.ceil(r * 2);
    for (let dy = -reach; dy <= reach; dy += 1) {
      for (let dx = -reach; dx <= reach; dx += 1) {
        const d2 = (dx * dx + dy * dy) / (r * r);
        if (d2 > 4) continue;
        const idx = wrap(Math.floor(cy) + dy) * size + wrap(Math.floor(cx) + dx);
        height[idx] = height[idx]! + amp * Math.exp(-d2 * 1.5);
      }
    }
  }

  // Craters, power-law in size: many small, few large. Each one adds its bowl,
  // rim and ejecta; later craters landing on earlier ones is exactly how a
  // real surface accumulates.
  const count = Math.round(1100 * (size / 512) ** 2);
  const rMin = 1.4;
  const rMax = size * 0.17;
  for (let i = 0; i < count; i += 1) {
    const u = random();
    const radius = rMin * (rMax / rMin) ** (u ** 2.4);
    const cx = random() * size;
    const cy = random() * size;
    const fresh = 0.35 + 0.65 * random() ** 0.6;
    const bright = fresh > 0.9 && random() < 0.35;
    const reach = Math.ceil(radius * 2.4);
    const ix = Math.floor(cx);
    const iy = Math.floor(cy);
    for (let dy = -reach; dy <= reach; dy += 1) {
      for (let dx = -reach; dx <= reach; dx += 1) {
        const px = ix + dx + 0.5 - cx;
        const py = iy + dy + 0.5 - cy;
        const d = Math.sqrt(px * px + py * py) / radius;
        if (d > 2.4) continue;
        const idx = wrap(iy + dy) * size + wrap(ix + dx);
        height[idx] = height[idx]! + profile(d, radius, fresh);
        if (bright) {
          // Fresh ejecta is paler than the mature regolith around it.
          albedo[idx] = albedo[idx]! + 0.18 * Math.exp(-((d - 0.9) ** 2) / 0.5);
        } else if (d < 1) {
          // Old crater floors collect darker, mature soil.
          albedo[idx] = albedo[idx]! - 0.03 * fresh * (1 - d);
        }
      }
    }
  }

  // Normalise height to [-1, 1] about its mean.
  let mean = 0;
  for (let i = 0; i < height.length; i += 1) mean += height[i]!;
  mean /= height.length;
  let heightMax = 1e-6;
  for (let i = 0; i < height.length; i += 1) {
    height[i] = height[i]! - mean;
    heightMax = Math.max(heightMax, Math.abs(height[i]!));
  }

  // Slopes by central difference, in texel units, wrapping at the edges.
  const sx = new Float32Array(size * size);
  const sy = new Float32Array(size * size);
  let slopeMax = 1e-6;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x;
      sx[i] = (height[y * size + wrap(x + 1)]! - height[y * size + wrap(x - 1)]!) / 2;
      sy[i] = (height[wrap(y + 1) * size + x]! - height[wrap(y - 1) * size + x]!) / 2;
      slopeMax = Math.max(slopeMax, Math.abs(sx[i]!), Math.abs(sy[i]!));
    }
  }

  const data = new Uint8Array(size * size * 4);
  const byte = (v: number): number => Math.max(0, Math.min(255, Math.round(v * 255)));
  for (let i = 0; i < size * size; i += 1) {
    data[i * 4] = byte(0.5 + 0.5 * (height[i]! / heightMax));
    data[i * 4 + 1] = byte(0.5 + 0.5 * (sx[i]! / slopeMax));
    data[i * 4 + 2] = byte(0.5 + 0.5 * (sy[i]! / slopeMax));
    data[i * 4 + 3] = byte(albedo[i]!);
  }

  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.name = 'crater-field';
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  // Mipmaps, so the fine layers do not shimmer as the surface slides past at
  // distance. 8-bit RGBA is filterable and mipmappable everywhere, which a
  // float texture is not.
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 4;
  texture.needsUpdate = true;

  return { texture, size, heightMax, slopeMax };
}

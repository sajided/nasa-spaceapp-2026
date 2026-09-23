#!/usr/bin/env node
/**
 * Downsizes NASA's Earth and Moon imagery for the web.
 *
 * Both come from the repository the PRD cites, and both ship far too large:
 * Earth is 1.4 MB and the Moon 4.5 MB as published, against a 5 MB budget for
 * the entire page. At 2048x1024 WebP they land around 250-350 KB each, which
 * is the resolution the camera actually needs — nothing in the mission gets
 * closer to Earth than the parking orbit.
 *
 *   npm run prepare:textures
 *
 * NASA imagery is public domain; the credit goes on the About screen (TC-P6-23).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const RAW = 'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/Images%20and%20Textures';

const TEXTURES = [
  {
    name: 'earth',
    // "Earth (A)", not "(B)". (B) is a photograph of a globe — a disc with its
    // own baked-in day/night terminator — so wrapping it round a sphere gives
    // a planet lit from a direction that has nothing to do with the scene's
    // sun. (A) is a true equirectangular map, which is what a sphere needs.
    url: `${RAW}/Earth%20(A)/Earth%20(A).jpg`,
    width: 2048,
    quality: 78,
  },
  {
    name: 'moon',
    url: `${RAW}/Moon%20-%20Lunar%20Color/Moon%20-%20Lunar%20Color.jpg`,
    width: 2048,
    quality: 80,
  },
];

async function fetchCached(url, cachePath) {
  if (existsSync(cachePath)) return readFileSync(cachePath);
  console.log(`Downloading ${url.split('/').pop()}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, buf);
  return buf;
}

const outDir = resolve(ROOT, 'public/textures');
mkdirSync(outDir, { recursive: true });

let total = 0;
for (const texture of TEXTURES) {
  const cache = resolve(ROOT, `.cache/${texture.name}-source.jpg`);
  const source = await fetchCached(texture.url, cache);

  const out = resolve(outDir, `${texture.name}.webp`);
  // 2:1 equirectangular — anything else pinches at the poles on a sphere.
  const buffer = await sharp(source)
    .resize(texture.width, texture.width / 2, { fit: 'fill' })
    .webp({ quality: texture.quality })
    .toBuffer();
  writeFileSync(out, buffer);

  total += buffer.length;
  console.log(
    `  ${texture.name.padEnd(6)} ${(source.length / 1024).toFixed(0).padStart(5)} KB source ` +
      `-> ${(buffer.length / 1024).toFixed(0).padStart(4)} KB webp ` +
      `(${texture.width}x${texture.width / 2})`,
  );
}

console.log(`\nWrote public/textures/, ${(total / 1024).toFixed(0)} KB total.`);
console.log('Source: NASA 3D Resources — public domain.');

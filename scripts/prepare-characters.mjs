// Cut the Earth and Moon characters out of the story artwork panels into
// transparent portraits for the speech bubbles, one file per expression.
//
//   node scripts/prepare-characters.mjs <panel1.png> <panel2.png> <panel3.png>
//
// Panels are the 8000x3125 comic strips with the Earth on the left and the
// small Moon bottom right:
//   1 "Why are you sad moon?"          -> earth-gasp,  moon-sad
//   2 "Haha moon, you are so silly"    -> earth-laugh, moon-smirk
//   3 "but don't worry, humans are..." -> earth-smug,  moon-surprised
import sharp from 'sharp';

const panels = process.argv.slice(2);
if (panels.length !== 3) {
  console.error('usage: node scripts/prepare-characters.mjs <panel1.png> <panel2.png> <panel3.png>');
  process.exit(1);
}
const outDir = new URL('../public/images/characters/', import.meta.url).pathname;
const NAMES = [
  ['earth-gasp', 'moon-sad'],
  ['earth-laugh', 'moon-smirk'],
  ['earth-smug', 'moon-surprised'],
];
const SIZE = 320;
const EARTH_REGION = { left: 450, top: 150, width: 2850, height: 2850 };
// Starts right of the speech-bubble tails that point at the Moon.
const MOON_REGION = { left: 6420, top: 1900, width: 600, height: 650 };

const webp = (img) => img.webp({ quality: 88, alphaQuality: 90 });

function neighbours(i, w, h) {
  const x = i % w, y = (i / w) | 0;
  return [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
}

// The Earth is drawn slightly oval, so knock out the black sky by
// flood-filling from the crop border, then keep the largest blob (drops the
// stars and speech bubbles). Its face never touches its edge, so the black
// ink inside survives.
async function cutEarth(src, out) {
  const { width: w, height: h } = EARTH_REGION;
  const data = await sharp(src).extract(EARTH_REGION).removeAlpha().raw().toBuffer();
  const N = w * h;
  const bg = new Uint8Array(N);
  const dark = (i) => data[i * 3] + data[i * 3 + 1] + data[i * 3 + 2] < 180;
  const stack = [];
  const seed = (i) => { if (!bg[i] && dark(i)) { bg[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
  while (stack.length) {
    for (const j of neighbours(stack.pop(), w, h)) if (j >= 0 && !bg[j] && dark(j)) { bg[j] = 1; stack.push(j); }
  }
  const lab = new Int32Array(N);
  let best = 0, bestSize = 0, n = 0;
  for (let s = 0; s < N; s++) {
    if (bg[s] || lab[s]) continue;
    lab[s] = ++n;
    let size = 0;
    stack.push(s);
    while (stack.length) {
      size++;
      for (const j of neighbours(stack.pop(), w, h)) if (j >= 0 && !bg[j] && !lab[j]) { lab[j] = n; stack.push(j); }
    }
    if (size > bestSize) { bestSize = size; best = n; }
  }
  const mask = Buffer.alloc(N);
  for (let i = 0; i < N; i++) mask[i] = lab[i] === best ? 255 : 0;
  const alpha = await sharp(mask, { raw: { width: w, height: h, channels: 1 } })
    .blur(2).extractChannel(0).raw().toBuffer();
  const rgba = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    rgba[i * 4] = data[i * 3];
    rgba[i * 4 + 1] = data[i * 3 + 1];
    rgba[i * 4 + 2] = data[i * 3 + 2];
    rgba[i * 4 + 3] = alpha[i];
  }
  const trimmed = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).trim().png().toBuffer();
  await webp(sharp(trimmed).resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }))
    .toFile(out);
}

// The Moon's ink touches the black sky, so a colour cut can't separate the
// two. Find its disc from the bright rows/columns and crop a circle.
async function cutMoon(src, out) {
  const { left, top, width: w, height: h } = MOON_REGION;
  const data = await sharp(src).extract(MOON_REGION).removeAlpha().raw().toBuffer();
  const rows = new Array(h).fill(0), cols = new Array(w).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 3;
    // Grey moon surface only: not the black sky, not white bubbles or stars.
    const sum = data[i] + data[i + 1] + data[i + 2];
    if (sum > 240 && Math.max(data[i], data[i + 1], data[i + 2]) < 238) { rows[y]++; cols[x]++; }
  }
  const span = (a) => { const k = a.map((c, i) => (c > 40 ? i : -1)).filter((i) => i >= 0); return [k[0], k.at(-1)]; };
  const [y0, y1] = span(rows);
  const [, x1] = span(cols);
  // Eye rings can poke out on the left, so take the size from the height
  // and anchor on the right edge.
  const r = Math.round((y1 - y0) / 2);
  const cx = left + x1 - r, cy = top + Math.round((y0 + y1) / 2), d = r * 2;
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2 - 2}" fill="#fff"/></svg>`);
  const img = await sharp(src).extract({ left: cx - r, top: cy - r, width: d, height: d })
    .resize(SIZE, SIZE).ensureAlpha().png().toBuffer();
  await webp(sharp(img).composite([{ input: mask, blend: 'dest-in' }])).toFile(out);
}

for (const [k, src] of panels.entries()) {
  const [earth, moon] = NAMES[k];
  await cutEarth(src, `${outDir}${earth}.webp`);
  await cutMoon(src, `${outDir}${moon}.webp`);
  console.log(`wrote ${earth}.webp, ${moon}.webp`);
}

// ── Happy Moon faces ───────────────────────────────────────────────────────
// The artwork has no happy Moon, so build two from the artist's own strokes:
// wipe the ink off a Moon cut-out (filling each inked pixel from the grey
// around it), then lay the black ink of an Earth face over it.
//   moon-laugh: the Earth's laughing face (panel 2)
//   moon-cheer: the Earth's cheerful talking face (panel 3)
const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

async function rgba(file) {
  return sharp(file).ensureAlpha().raw().toBuffer();
}

/** The Moon with its face wiped: ink pixels filled in from the outside in. */
async function blankMoon() {
  const d = await rgba(`${outDir}moon-sad.webp`);
  const N = SIZE * SIZE;
  const ink = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    // Dark and opaque: the drawn lines, plus a pixel of margin for their soft edges.
    if (d[i * 4 + 3] > 200 && lum(d, i * 4) < 120) ink[i] = 1;
  }
  const grow = new Uint8Array(ink);
  for (let i = 0; i < N; i++) {
    if (!ink[i]) continue;
    for (const j of neighbours(i, SIZE, SIZE)) if (j >= 0) grow[j] = 1;
  }
  let todo = grow.reduce((a, b) => a + b, 0);
  while (todo > 0) {
    const next = [];
    for (let i = 0; i < N; i++) {
      if (!grow[i]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      const x = i % SIZE, y = (i / SIZE) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= SIZE || yy >= SIZE) continue;
        const j = yy * SIZE + xx;
        if (grow[j] || d[j * 4 + 3] < 200) continue;
        r += d[j * 4]; g += d[j * 4 + 1]; b += d[j * 4 + 2]; n++;
      }
      if (n) next.push([i, r / n, g / n, b / n]);
    }
    if (!next.length) break;
    for (const [i, r, g, b] of next) {
      d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b;
      grow[i] = 0;
      todo--;
    }
  }
  return d;
}

/** The black ink of an Earth face, as an alpha mask, from the middle of the disc only. */
async function faceInk(name) {
  const d = await rgba(`${outDir}${name}.webp`);
  const mask = Buffer.alloc(SIZE * SIZE);
  for (let y = Math.round(SIZE * 0.18); y < SIZE * 0.82; y++) {
    for (let x = Math.round(SIZE * 0.12); x < SIZE * 0.88; x++) {
      const i = y * SIZE + x;
      const l = lum(d, i * 4);
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      // The dark green edges of the land are not ink.
      if (d[i * 4 + 3] < 200 || g - Math.max(r, b) > 18) continue;
      // Ink is near-black; its soft, blue-tinted edges fade out by 120.
      mask[i] = Math.max(0, Math.min(255, Math.round(((120 - l) / 75) * 255)));
    }
  }
  return mask;
}

const blank = await blankMoon();
for (const [face, from] of [['moon-laugh', 'earth-laugh'], ['moon-cheer', 'earth-smug']]) {
  const ink = await faceInk(from);
  const out = Buffer.from(blank);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const a = (ink[i] / 255) * (out[i * 4 + 3] / 255);
    for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(out[i * 4 + c] * (1 - a) + 17 * a);
  }
  await webp(sharp(out, { raw: { width: SIZE, height: SIZE, channels: 4 } })).toFile(`${outDir}${face}.webp`);
  console.log(`wrote ${face}.webp (from ${from})`);
}

import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';
import { palette } from '../style/tokens';

/**
 * The Saturn V's paint, drawn at load time.
 *
 * A downloaded texture set for the stack would cost more than every other
 * asset combined; the livery is flat colour, a flag and a few words, so it is
 * drawn onto a canvas instead and costs nothing on the wire. The same pass
 * draws a bump map for the weld seams and the corrugated skirts, which is what
 * lets the hard vacuum sunlight find some structure on an otherwise smooth
 * cylinder.
 *
 * Canvas x runs once around the hull, with the centre column facing the pad
 * camera (saturnV.ts sets the cylinder's theta start to match). Canvas y runs
 * from the top of the section down, which is what `flipY` expects. Every
 * measurement in a spec is in metres from the section's base, so a spec reads
 * like the vehicle drawings rather than like pixel arithmetic.
 */

export interface LiverySpec {
  /** Hull diameter, in metres. */
  diameter: number;
  /** Section height, in metres. */
  height: number;
  /** Pixels per metre, around and along. Small sections with lettering need more. */
  ppm: number;
  /** Base colour of the section. Defaults to the hull white. */
  base?: string;
  /** Eight-panel black-and-white roll pattern, as [from, to] bands. */
  roll?: readonly (readonly [number, number])[];
  /** Solid black rings. */
  black?: readonly (readonly [number, number])[];
  /** Corrugated or stringer-stiffened bands: bump only. */
  ribs?: readonly (readonly [number, number])[];
  /** Horizontal weld seams. */
  seams?: readonly number[];
  /** Lighter panels, e.g. the Service Module's radiators, as [from, to] bands. */
  panels?: readonly (readonly [number, number])[];
  /** A US flag facing the camera, with its top edge at `top`. */
  flag?: { top: number; width: number };
  /** Vertically stacked lettering facing the camera, starting at `top`. */
  letters?: { text: string; top: number; size: number };
}

export interface Livery {
  map: Texture;
  bump: Texture;
}

const WHITE = `#${palette.hull.getHexString()}`;
const BLACK = `#${palette.hullDark.getHexString()}`;
const FLAG_RED = '#B22234';
const FLAG_BLUE = '#3C3B6E';

/** Mid-grey is "flush"; lighter stands proud, darker is recessed. */
const FLUSH = 128;

export function drawLivery(spec: LiverySpec): Livery {
  const width = Math.round(Math.PI * spec.diameter * spec.ppm);
  const height = Math.round(spec.height * spec.ppm);
  const yOf = (m: number): number => height - m * spec.ppm;
  const centre = width / 2;

  const colour = canvas(width, height);
  const bump = canvas(width, height);
  const c = colour.ctx;
  const b = bump.ctx;

  c.fillStyle = spec.base ?? WHITE;
  c.fillRect(0, 0, width, height);
  b.fillStyle = grey(FLUSH);
  b.fillRect(0, 0, width, height);

  for (const [from, to] of spec.panels ?? []) {
    c.fillStyle = 'rgba(255, 255, 255, 0.35)';
    const panel = width / 12;
    for (let i = 0; i < 12; i += 2) c.fillRect(i * panel, yOf(to), panel * 0.8, (to - from) * spec.ppm);
  }

  for (const [from, to] of spec.black ?? []) {
    c.fillStyle = BLACK;
    c.fillRect(0, yOf(to), width, (to - from) * spec.ppm);
  }

  // The roll pattern. Eight panels rather than a plain ring, because a ring
  // looks identical at every roll angle — the whole point of the pattern was
  // that film of the ascent could measure the roll program from it.
  for (const [from, to] of spec.roll ?? []) {
    c.fillStyle = BLACK;
    const panel = width / 8;
    for (let i = 0; i < 8; i += 2) c.fillRect(i * panel, yOf(to), panel, (to - from) * spec.ppm);
  }

  // Stringers: raised vertical ribs about every 30 cm of circumference.
  for (const [from, to] of spec.ribs ?? []) {
    const pitch = Math.max(3, Math.round(0.3 * spec.ppm));
    b.fillStyle = grey(FLUSH + 50);
    for (let x = 0; x < width; x += pitch) {
      b.fillRect(x, yOf(to), Math.max(1, pitch / 3), (to - from) * spec.ppm);
    }
    // Circumferential frames at each end of the band.
    b.fillStyle = grey(FLUSH + 70);
    b.fillRect(0, yOf(to), width, 2);
    b.fillRect(0, yOf(from) - 2, width, 2);
  }

  b.fillStyle = grey(FLUSH - 55);
  for (const y of spec.seams ?? []) b.fillRect(0, yOf(y) - 1, width, 2);

  if (spec.flag) {
    const w = spec.flag.width * spec.ppm;
    const h = w / 1.9;
    drawFlag(c, centre - w / 2, yOf(spec.flag.top), w, h);
  }

  if (spec.letters) {
    const size = spec.letters.size * spec.ppm;
    const step = size * 1.18;
    c.fillStyle = BLACK;
    c.font = `bold ${Math.round(size)}px Helvetica, Arial, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'top';
    let y = yOf(spec.letters.top);
    for (const ch of spec.letters.text) {
      if (ch !== ' ') c.fillText(ch, centre, y);
      y += ch === ' ' ? step * 0.6 : step;
    }
  }

  const map = new CanvasTexture(colour.canvas);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 8;
  const bumpMap = new CanvasTexture(bump.canvas);
  bumpMap.anisotropy = 8;
  return { map, bump: bumpMap };
}

/** Bump only, for sections that stay plain white. */
export function drawRibs(spec: Omit<LiverySpec, 'roll' | 'black' | 'flag' | 'letters'>): Texture {
  const { map, bump } = drawLivery(spec);
  map.dispose();
  return bump;
}

function canvas(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const el = document.createElement('canvas');
  el.width = width;
  el.height = height;
  return { canvas: el, ctx: el.getContext('2d')! };
}

function grey(v: number): string {
  return `rgb(${v}, ${v}, ${v})`;
}

function drawFlag(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const stripe = h / 13;
  for (let i = 0; i < 13; i += 1) {
    c.fillStyle = i % 2 === 0 ? FLAG_RED : '#FFFFFF';
    c.fillRect(x, y + i * stripe, w, Math.ceil(stripe));
  }
  const cw = w * 0.4;
  const ch = stripe * 7;
  c.fillStyle = FLAG_BLUE;
  c.fillRect(x, y, cw, ch);

  // Fifty stars in nine alternating rows of six and five. At any distance the
  // camera reaches they are dots, so they are drawn as dots.
  c.fillStyle = '#FFFFFF';
  const r = Math.max(0.6, ch * 0.028);
  for (let row = 0; row < 9; row += 1) {
    const count = row % 2 === 0 ? 6 : 5;
    const offset = row % 2 === 0 ? 1 : 2;
    for (let i = 0; i < count; i += 1) {
      c.beginPath();
      c.arc(x + ((offset + i * 2) * cw) / 12, y + ((row + 1) * ch) / 10, r, 0, Math.PI * 2);
      c.fill();
    }
  }
}

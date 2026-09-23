/**
 * A keyframed profile over mission time, interpolated monotone-cubically.
 *
 * Shared by the lunar flight (data/lunarFlight.ts) and reentry
 * (data/reentry.ts), which have the same need: a smooth curve through flight
 * record values that never overshoots between keys. A plain Catmull–Rom spline
 * puts the LM briefly underground before touchdown, and the CM briefly
 * climbing between parachute stages; Fritsch–Carlson tangents cannot.
 *
 * Pure functions of mission time, so anything derived from them runs
 * identically forward and back and freezes when the scroll is idle.
 */

export type ProfileKey<C extends string> = { met: number } & Record<C, number>;

export interface Profile<C extends string> {
  /** Writes each channel's value at `met` into `out`. Clamped to the ends. */
  sample(met: number, out: Record<C, number>): Record<C, number>;
  /** The key times, for tests that sample between them. */
  readonly mets: readonly number[];
}

export function monotoneProfile<C extends string>(
  keys: readonly ProfileKey<C>[],
  channels: readonly C[],
): Profile<C> {
  for (let i = 1; i < keys.length; i += 1) {
    if (keys[i]!.met <= keys[i - 1]!.met) {
      throw new Error(`Profile keys must increase in time: ${keys[i - 1]!.met} then ${keys[i]!.met}`);
    }
  }

  const tangents = {} as Record<C, number[]>;
  for (const c of channels) tangents[c] = fritschCarlson(keys, c);

  const sample = (met: number, out: Record<C, number>): Record<C, number> => {
    const first = keys[0]!;
    const last = keys[keys.length - 1]!;
    if (met <= first.met || met >= last.met) {
      const k = met <= first.met ? first : last;
      for (const c of channels) out[c] = k[c];
      return out;
    }
    let i = 0;
    while (i < keys.length - 2 && met > keys[i + 1]!.met) i += 1;
    const a = keys[i]!;
    const b = keys[i + 1]!;
    const h = b.met - a.met;
    const t = (met - a.met) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    for (const c of channels) {
      const m = tangents[c];
      out[c] =
        (2 * t3 - 3 * t2 + 1) * a[c] +
        (t3 - 2 * t2 + t) * h * m[i]! +
        (-2 * t3 + 3 * t2) * b[c] +
        (t3 - t2) * h * m[i + 1]!;
    }
    return out;
  };

  return { sample, mets: keys.map((k) => k.met) };
}

function fritschCarlson<C extends string>(keys: readonly ProfileKey<C>[], c: C): number[] {
  const n = keys.length;
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    delta.push((keys[i + 1]![c] - keys[i]![c]) / (keys[i + 1]!.met - keys[i]!.met));
  }
  const m = new Array<number>(n).fill(0);
  m[0] = delta[0]!;
  m[n - 1] = delta[n - 2]!;
  for (let i = 1; i < n - 1; i += 1) {
    const d0 = delta[i - 1]!;
    const d1 = delta[i]!;
    // A local extremum or flat segment gets a zero tangent: that is what makes
    // the curve monotone between keys.
    m[i] = d0 * d1 <= 0 ? 0 : (d0 + d1) / 2;
  }
  for (let i = 0; i < n - 1; i += 1) {
    const d = delta[i]!;
    if (d === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i]! / d;
    const b = m[i + 1]! / d;
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d;
      m[i + 1] = t * b * d;
    }
  }
  return m;
}

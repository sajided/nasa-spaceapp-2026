import { Color } from 'three';

/**
 * Visual style tokens — cinematic realism.
 *
 * The decision and its reference images live in docs/visual-style.md (TC-P0-10).
 * Every material in the project reads its values from here so a style change is
 * one edit, not a sweep through the scene code.
 */

export const palette = {
  /** Deep space background. Not pure black — pure black kills the tone curve. */
  space: new Color('#05070C'),
  /** Saturn V hull white, slightly warm and slightly off-white for PBR. */
  hull: new Color('#D9D7D0'),
  /** The black roll-pattern panels on the S-IC. */
  hullDark: new Color('#1C1C1E'),
  /** Exhaust core → tip gradient. */
  exhaustCore: new Color('#FFEBC4'),
  exhaustTip: new Color('#FF6A1F'),
  /** Key light: sunlight in vacuum is hard, white and unfiltered. */
  sun: new Color('#FFF6E8'),
  /** Fill: earthshine bounced up from below. */
  earthshine: new Color('#5B86C4'),
} as const;

export const materials = {
  hull: {
    color: palette.hull,
    metalness: 0.65,
    roughness: 0.38,
  },
  hullDark: {
    color: palette.hullDark,
    metalness: 0.4,
    roughness: 0.6,
  },
} as const;

export const lighting = {
  sunIntensity: 3.2,
  fillIntensity: 0.35,
  rimIntensity: 1.1,
  /** Strength of the PMREM environment contribution. */
  envIntensity: 0.6,
} as const;

/** UI chrome, kept minimal so the render carries the frame. */
export const ui = {
  font: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
  text: '#E8E8EA',
  textDim: '#9A9AA2',
  panelBg: 'rgba(10, 12, 18, 0.82)',
  panelBorder: 'rgba(255, 255, 255, 0.12)',
  accent: '#FF6A1F',
} as const;

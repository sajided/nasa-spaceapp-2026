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
  /** The Command Module's aluminised Mylar skin: the brightest thing in frame. */
  mylar: {
    color: new Color('#CDD0D4'),
    metalness: 0.92,
    roughness: 0.2,
  },
  /** The Service Module's bare aluminium, under its radiator paint. */
  aluminium: {
    color: new Color('#C4C6C8'),
    metalness: 0.78,
    roughness: 0.34,
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

/**
 * Story mode: a warm storybook layer over the cinematic render. Rounded type
 * from the system (no web font, so no bytes against the budget), large enough
 * for six-year-olds — never below 20px for anything a child reads.
 */
export const story = {
  font: "ui-rounded, 'SF Pro Rounded', 'Nunito', 'Varela Round', 'Trebuchet MS', system-ui, sans-serif",
  paper: '#FFF8EC',
  paperEdge: '#F1DDBB',
  ink: '#2A2340',
  inkDim: '#6B6280',
  earth: '#3C8DDE',
  earthDeep: '#1E5FA8',
  moon: '#A9A3BA',
  moonDeep: '#6F6987',
  warm: '#FFB547',
  warmDeep: '#E58A12',
  go: '#FF6A3D',
  glass: 'rgba(16, 18, 32, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.18)',
  shadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
  /** Body text size, px. */
  text: 22,
  /** Minimum touch target, px. */
  touch: 56,
} as const;

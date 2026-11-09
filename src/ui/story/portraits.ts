import type { Mood, Speaker } from '../../data/story';

/**
 * The Earth and the Moon as characters, using the hand-drawn story artwork
 * (cut out by scripts/prepare-characters.mjs).
 *
 * Kept off the 3D planets on purpose. The render stays cinematic and real
 * (docs/visual-style.md); the storybook voice lives in the HTML layer beside
 * it, like a comic panel.
 *
 * Each mood maps to the closest expression in the artwork (the Moon's two
 * happy faces are built from the artist's own strokes); the exact mood still goes into the accessible label.
 */

type Earth = 'gasp' | 'laugh' | 'smug';
/** laugh and cheer are built from the artist's Earth faces (scripts/prepare-characters.mjs). */
type Moon = 'sad' | 'smirk' | 'surprised' | 'laugh' | 'cheer';

const EARTH: Record<Mood, Earth> = {
  happy: 'laugh',
  smiling: 'smug',
  proud: 'smug',
  annoyed: 'smug',
  curious: 'gasp', // "Why are you sad, Moon?" is the gasp panel's own line.
  shocked: 'gasp',
  sad: 'gasp',
};

const MOON: Record<Mood, Moon> = {
  sad: 'sad',
  annoyed: 'smirk',
  happy: 'laugh',
  smiling: 'cheer',
  proud: 'cheer',
  curious: 'surprised',
  shocked: 'surprised',
};

/** The real 1969 audio: a little vintage radio, drawn inline (no asset bytes). */
const RADIO_SVG = `<svg viewBox="0 0 64 64" width="100%" height="100%" role="img" aria-label="Real mission radio" xmlns="http://www.w3.org/2000/svg">
  <line x1="40" y1="16" x2="52" y2="3" stroke="#3a3a46" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="52" cy="3.5" r="2.6" fill="#ff8a3d"/>
  <rect x="5" y="16" width="54" height="40" rx="9" fill="#e9b872" stroke="#3a2a1a" stroke-width="2.6"/>
  <rect x="10" y="21" width="29" height="30" rx="5" fill="#5b4a3a"/>
  ${[26, 31, 36, 41, 46].map((y) => `<line x1="13" y1="${y}" x2="36" y2="${y}" stroke="#2c241c" stroke-width="2.2" stroke-linecap="round"/>`).join('')}
  <circle cx="50" cy="29" r="5.5" fill="#fff6e6" stroke="#3a2a1a" stroke-width="2"/>
  <line x1="50" y1="29" x2="52.5" y2="25.5" stroke="#3a2a1a" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="50" cy="44" r="4" fill="#d9534f" stroke="#3a2a1a" stroke-width="2"/>
</svg>`;

export function portraitSrc(speaker: Exclude<Speaker, 'mission'>, mood: Mood): string {
  const face = speaker === 'earth' ? EARTH[mood] : MOON[mood];
  return `images/characters/${speaker}-${face}.webp`;
}

export function portraitSvg(speaker: Speaker, mood: Mood): string {
  if (speaker === 'mission') return RADIO_SVG;
  const label = `${speaker === 'earth' ? 'Earth' : 'Moon'}, ${mood}`;
  return `<img src="${portraitSrc(speaker, mood)}" alt="${label}" width="100%" height="100%" draggable="false" style="display:block;width:100%;height:100%;object-fit:contain;" />`;
}

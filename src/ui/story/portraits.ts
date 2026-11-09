import type { Mood, Speaker } from '../../data/story';

/**
 * The Earth and the Moon as characters: small inline SVG faces, one
 * expression per mood.
 *
 * Kept off the 3D planets on purpose. The render stays cinematic and real
 * (docs/visual-style.md); the storybook voice lives in the HTML layer beside
 * it, like a comic panel. Inline SVG costs no asset bytes and stays crisp at
 * any pixel ratio.
 */

interface Face {
  eyes: string;
  mouth: string;
  brows?: string;
}

const INK = '#2A2340';

const FACES: Record<Mood, Face> = {
  happy: {
    eyes: `<circle cx="23" cy="29" r="3.2" fill="${INK}"/><circle cx="41" cy="29" r="3.2" fill="${INK}"/>`,
    mouth: `<path d="M21 38 Q32 50 43 38" stroke="${INK}" stroke-width="3" fill="#fff" stroke-linecap="round"/>`,
  },
  smiling: {
    eyes: `<circle cx="23" cy="29" r="3" fill="${INK}"/><circle cx="41" cy="29" r="3" fill="${INK}"/>`,
    mouth: `<path d="M23 40 Q32 46 41 40" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
  proud: {
    eyes: `<path d="M19 30 Q23 25 27 30" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M37 30 Q41 25 45 30" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    mouth: `<path d="M21 38 Q32 49 43 38" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
  sad: {
    eyes: `<circle cx="23" cy="31" r="3" fill="${INK}"/><circle cx="41" cy="31" r="3" fill="${INK}"/><path d="M27 37 q1 4 -1 6" stroke="#7fc4ff" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    brows: `<path d="M18 24 L27 21" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><path d="M46 24 L37 21" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`,
    mouth: `<path d="M24 46 Q32 39 40 46" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
  shocked: {
    eyes: `<circle cx="23" cy="28" r="4.6" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="23" cy="28" r="2" fill="${INK}"/><circle cx="41" cy="28" r="4.6" fill="#fff" stroke="${INK}" stroke-width="2"/><circle cx="41" cy="28" r="2" fill="${INK}"/>`,
    brows: `<path d="M18 20 Q23 17 28 20" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M36 20 Q41 17 46 20" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
    mouth: `<ellipse cx="32" cy="43" rx="4.5" ry="5.5" fill="${INK}"/>`,
  },
  annoyed: {
    eyes: `<path d="M19 30 h8" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/><path d="M37 30 h8" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`,
    brows: `<path d="M18 22 L28 26" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/><path d="M46 22 L36 26" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`,
    mouth: `<path d="M25 43 h14" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  },
  curious: {
    eyes: `<circle cx="23" cy="29" r="3.2" fill="${INK}"/><circle cx="41" cy="29" r="3.2" fill="${INK}"/>`,
    brows: `<path d="M36 19 Q41 15 46 19" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
    mouth: `<circle cx="33" cy="42" r="3.4" fill="${INK}"/>`,
  },
};

const EARTH_BODY = `
  <circle cx="32" cy="32" r="29" fill="#3C8DDE"/>
  <path d="M9 22 q8 -9 17 -5 q4 6 -3 10 q-6 2 -6 9 q-5 2 -9 -3 z" fill="#58B368"/>
  <path d="M38 6 q9 2 14 10 q-3 5 -9 3 q-6 -4 -5 -13 z" fill="#58B368"/>
  <path d="M41 46 q7 -4 12 1 q-2 9 -10 10 q-5 -4 -2 -11 z" fill="#58B368"/>
  <circle cx="32" cy="32" r="29" fill="none" stroke="#1E5FA8" stroke-width="3"/>
  <circle cx="16" cy="38" r="4" fill="#ff9aa8" opacity="0.55"/>
  <circle cx="48" cy="38" r="4" fill="#ff9aa8" opacity="0.55"/>
`;

const MOON_BODY = `
  <circle cx="32" cy="32" r="29" fill="#C9C4D6"/>
  <circle cx="17" cy="17" r="5" fill="#ADA7BE"/>
  <circle cx="48" cy="20" r="3.5" fill="#ADA7BE"/>
  <circle cx="46" cy="49" r="5.5" fill="#ADA7BE"/>
  <circle cx="13" cy="44" r="3" fill="#ADA7BE"/>
  <circle cx="32" cy="32" r="29" fill="none" stroke="#6F6987" stroke-width="3"/>
  <circle cx="16" cy="38" r="4" fill="#ff9aa8" opacity="0.45"/>
  <circle cx="48" cy="38" r="4" fill="#ff9aa8" opacity="0.45"/>
`;

export function portraitSvg(speaker: Speaker, mood: Mood): string {
  const face = FACES[mood];
  const label = `${speaker === 'earth' ? 'Earth' : 'Moon'}, ${mood}`;
  return `<svg viewBox="0 0 64 64" width="100%" height="100%" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">
    ${speaker === 'earth' ? EARTH_BODY : MOON_BODY}
    ${face.brows ?? ''}${face.eyes}${face.mouth}
  </svg>`;
}

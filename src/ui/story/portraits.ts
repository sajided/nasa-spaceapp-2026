import type { Mood, Speaker } from '../../data/story';

/**
 * The Earth and the Moon as characters, using the hand-drawn story artwork
 * (cut out by scripts/prepare-characters.mjs).
 *
 * Kept off the 3D planets on purpose. The render stays cinematic and real
 * (docs/visual-style.md); the storybook voice lives in the HTML layer beside
 * it, like a comic panel.
 *
 * The artwork has three expressions per character, so each mood maps to the
 * closest one; the exact mood still goes into the accessible label.
 */

type Earth = 'gasp' | 'laugh' | 'smug';
type Moon = 'sad' | 'smirk' | 'surprised';

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
  happy: 'smirk',
  smiling: 'smirk',
  proud: 'smirk',
  curious: 'surprised',
  shocked: 'surprised',
};

export function portraitSrc(speaker: Speaker, mood: Mood): string {
  const face = speaker === 'earth' ? EARTH[mood] : MOON[mood];
  return `images/characters/${speaker}-${face}.webp`;
}

export function portraitSvg(speaker: Speaker, mood: Mood): string {
  const label = `${speaker === 'earth' ? 'Earth' : 'Moon'}, ${mood}`;
  return `<img src="${portraitSrc(speaker, mood)}" alt="${label}" width="100%" height="100%" draggable="false" style="display:block;width:100%;height:100%;object-fit:contain;" />`;
}

#!/usr/bin/env node
/**
 * Cuts the real Apollo 11 audio into the story's 📻 mission lines.
 *
 *   npm run prepare:mission-audio && npm run prepare:audio
 *
 * Source: NASA "Historical Sounds", https://www.nasa.gov/historical-sounds/
 * NASA audio is not copyrighted (public domain); credit NASA and don't imply
 * endorsement.
 *
 * Downloads each NASA MP3 once into recordings/nasa/ (git-ignored), then
 * writes recordings/<lineId>.wav and recordings/<lineId>.json for
 * scripts/prepare-audio.mjs to encode. Word times were taken from a
 * transcript of each clip and are counted from the cut's start; the clips
 * keep their leading radio hiss (`keepSilence`) so those times stay true.
 *
 * Each `words` entry is the start, in seconds within the NASA file, of one
 * whitespace-separated word of the line's text in src/data/story.ts.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'recordings');
const CACHE = resolve(OUT, 'nasa');
const NASA = 'https://www.nasa.gov/wp-content/uploads/2015/01/';

const CLIPS = [
  {
    id: 's2-03b',
    file: '590320main_ringtone_apollo11_countdown.mp3',
    from: 0.1,
    to: 11.2,
    // Ignition sequence start. Six, five, four, three, two, one, zero. All engines running.
    words: [0.18, 0.84, 1.46, 2.74, 3.58, 4.56, 5.42, 6.52, 7.64, 8.8, 9.54, 9.84, 10.32],
  },
  {
    id: 's2-03c',
    file: '590320main_ringtone_apollo11_countdown.mp3',
    from: 11.45,
    to: 24.76,
    // Liftoff! We have a liftoff, thirty-two minutes past the hour. Liftoff on Apollo 11. Tower cleared. We got a roll program.
    words: [
      11.6, 12.56, 12.76, 13.0, 13.1, 13.88, 14.46, 14.94, 15.32, 15.46, 16.22, 16.68, 16.78, 17.18, 21.4,
      21.92, 23.04, 23.14, 23.28, 23.36, 23.62,
    ],
  },
  {
    id: 's4-04b',
    file: '590333main_ringtone_eagleHasLanded_extended.mp3',
    from: 0.35,
    to: 14.78,
    // Houston, uh, Tranquility Base here. The Eagle has landed. Roger, Twan… Tranquility. We copy you on
    // the ground. You got a bunch of guys about to turn blue. We're breathing again. Thanks a lot.
    // (The beeps at the end are the real "Quindar" tones of the radio link.)
    words: [
      0.5, 1.22, 3.26, 3.96, 4.3, 4.88, 5.02, 5.36, 5.6, 6.64, 7.06, 7.56, 8.48, 8.68, 9.0, 9.1, 9.22, 9.36,
      9.98, 10.1, 10.26, 10.36, 10.58, 10.7, 11.02, 11.28, 11.42, 11.68, 12.02, 12.2, 12.58, 13.0, 13.26, 13.36,
    ],
  },
  {
    id: 's5-00',
    file: '590331main_ringtone_smallStep.mp3',
    from: 0.3,
    to: 12.95,
    // I'm going to step off the LM now. That's one small step for man, one giant leap for mankind.
    words: [0.42, 0.54, 0.6, 0.7, 1.02, 1.24, 1.32, 1.58, 4.28, 4.58, 4.96, 5.46, 5.96, 6.14, 9.58, 10.64, 11.04, 11.4, 11.56],
  },
];

mkdirSync(CACHE, { recursive: true });

for (const clip of CLIPS) {
  const src = resolve(CACHE, clip.file);
  if (!existsSync(src)) {
    const res = await fetch(NASA + clip.file, { headers: { 'user-agent': 'apollo-11-story-build' } });
    if (!res.ok) throw new Error(`${res.status} downloading ${clip.file}`);
    writeFileSync(src, Buffer.from(await res.arrayBuffer()));
    console.log(`downloaded ${clip.file}`);
  }
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-ss', String(clip.from), '-to', String(clip.to), '-i', src,
    // Short fades so a cut never clicks.
    '-af', `afade=t=in:d=0.05,afade=t=out:st=${(clip.to - clip.from - 0.15).toFixed(2)}:d=0.15`,
    '-ac', '1', '-ar', '24000',
    resolve(OUT, `${clip.id}.wav`),
  ]);
  const words = clip.words.map((t) => +(t - clip.from).toFixed(3));
  writeFileSync(resolve(OUT, `${clip.id}.json`), `${JSON.stringify({ words, keepSilence: true })}\n`);
  console.log(`  ${clip.id}  ${(clip.to - clip.from).toFixed(1)} s, ${words.length} words`);
}
console.log('Next: npm run prepare:audio');

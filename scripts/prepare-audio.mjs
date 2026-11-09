#!/usr/bin/env node
/**
 * Turns the story recordings into web audio, and lists them for the page.
 *
 *   npm run prepare:audio
 *
 * Input:  recordings/<lineId>.wav (or .m4a/.mp3/.aif) — one file per line of
 *         docs/story.md, named by its id, e.g. recordings/s1-02.wav.
 *         Optional recordings/<lineId>.json word timings: { "words": [0, 0.4, …] }
 * Output: public/audio/<lineId>.m4a — AAC, mono, 24 kbps (plays everywhere,
 *         Safari included), silence trimmed, loudness normalised;
 *         public/audio/<lineId>.json copied through;
 *         public/audio/manifest.json — the list core/narration.ts reads, so
 *         the page never requests a recording that does not exist.
 *
 * Needs ffmpeg on the PATH. Lines without a recording are simply read as text.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IN = resolve(ROOT, 'recordings');
const OUT = resolve(ROOT, 'public/audio');
const SCRIPT = resolve(ROOT, 'docs/story.md');

const ids = new Set([...readFileSync(SCRIPT, 'utf8').matchAll(/^\| (s\d-\d\d[a-z]?) \|/gm)].map((m) => m[1]));
mkdirSync(OUT, { recursive: true });

const sources = existsSync(IN) ? readdirSync(IN) : [];
const lines = [];
const timings = [];
let total = 0;

for (const file of sources.sort()) {
  const ext = extname(file).toLowerCase();
  const id = basename(file, ext);
  if (ext === '.json') continue;
  if (!['.wav', '.m4a', '.mp3', '.aif', '.aiff', '.flac'].includes(ext)) continue;
  if (!ids.has(id)) {
    console.warn(`skip ${file}: '${id}' is not a line id in docs/story.md`);
    continue;
  }
  const out = resolve(OUT, `${id}.m4a`);
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-i', resolve(IN, file),
    '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-18:TP=-2',
    '-ac', '1', '-ar', '24000', '-c:a', 'aac', '-b:a', '24k',
    out,
  ]);
  total += statSync(out).size;
  lines.push(id);
  const timing = resolve(IN, `${id}.json`);
  if (existsSync(timing)) {
    copyFileSync(timing, resolve(OUT, `${id}.json`));
    timings.push(id);
  }
}

writeFileSync(resolve(OUT, 'manifest.json'), `${JSON.stringify({ lines, timings }, null, 2)}\n`);
const missing = [...ids].filter((id) => !lines.includes(id));
console.log(`${lines.length} recordings, ${(total / 1024).toFixed(0)} KB (budget 700 KB).`);
if (missing.length) console.log(`Not yet recorded (${missing.length}): ${missing.join(', ')}`);

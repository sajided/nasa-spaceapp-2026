#!/usr/bin/env node
/**
 * Generates the story voice-over with ElevenLabs: one file per line, the Earth
 * and the Moon in their own voices, plus word timings for the read-along
 * highlight.
 *
 *   npm run voices -- --list                  # show the voices on your account
 *   npm run voices -- --only s1-01,s1-02      # a couple of samples first
 *   npm run voices                            # every line not generated yet
 *   npm run voices -- --force                 # regenerate everything
 *   npm run prepare:audio                     # then: recordings/ → public/audio
 *
 * Options: --earth <voiceId>  --moon <voiceId>  --model <modelId>
 * (or ELEVENLABS_EARTH_VOICE / ELEVENLABS_MOON_VOICE / ELEVENLABS_MODEL).
 *
 * The API key is read from ELEVENLABS_API_KEY, or from a line
 * `ELEVENLABS_API_KEY=...` in .env.local (git-ignored). Never commit it.
 *
 * Output: recordings/<lineId>.mp3 and recordings/<lineId>.json
 * ({ "words": [seconds, …] }, one start time per word as the bubble splits
 * them). Existing files are skipped so reruns cost nothing.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'recordings');
const API = 'https://api.elevenlabs.io/v1';

// ── Options ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

function readKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  const envFile = resolve(ROOT, '.env.local');
  if (existsSync(envFile)) {
    const m = readFileSync(envFile, 'utf8').match(/^\s*ELEVENLABS_API_KEY\s*=\s*["']?([^"'\s]+)/m);
    if (m) return m[1];
  }
  return null;
}

const key = readKey();
if (!key) {
  console.error('No ElevenLabs key. Add a line ELEVENLABS_API_KEY=... to .env.local (git-ignored).');
  process.exit(1);
}

// Default voices from the ElevenLabs premade library; change with --earth/--moon.
const VOICES = {
  earth: opt('earth') ?? process.env.ELEVENLABS_EARTH_VOICE ?? 'EXAVITQu4vr4xnSDxMaL', // Sarah: warm, reassuring
  moon: opt('moon') ?? process.env.ELEVENLABS_MOON_VOICE ?? 'pFZP5JQG7iQjIQuC4Bku', // Lily: soft, gentle
  // (Free plans can only use some premade voices: Sarah, Lily, Jessica, Laura, Alice.)
};
const MODEL = opt('model') ?? process.env.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2';

/** A touch more expression for big moods, steadier for calm ones. */
const MOOD_STYLE = {
  happy: 0.45, proud: 0.4, smiling: 0.3, curious: 0.35, shocked: 0.55, annoyed: 0.4, sad: 0.3,
};

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'xi-api-key': key, 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} on ${path}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

// ── --list: show the account's voices ─────────────────────────────────────
if (flag('list')) {
  const { voices } = await api('/voices');
  for (const v of voices) {
    const labels = Object.values(v.labels ?? {}).join(', ');
    console.log(`${v.voice_id}  ${v.name.padEnd(28)} ${labels}`);
  }
  process.exit(0);
}

// ── The script: the same text the bubbles show ────────────────────────────
const source = readFileSync(resolve(ROOT, 'src/data/story.ts'), 'utf8');
const ROW = /\[\s*'(s\d-\d\d[a-z]?)',\s*'(earth|moon)',\s*'(\w+)',\s*[^,]+,\s*[^,]+,\s*'((?:[^'\\]|\\.)*)'\s*\]/g;
const lines = [...source.matchAll(ROW)].map((m) => ({
  id: m[1],
  speaker: m[2],
  mood: m[3],
  text: m[4].replace(/\\(.)/g, '$1'),
}));
if (lines.length === 0) {
  console.error('Found no story lines in src/data/story.ts.');
  process.exit(1);
}

const only = opt('only')?.split(',').map((s) => s.trim());
const todo = lines.filter((l) => (!only || only.includes(l.id)) && (flag('force') || only || !existsSync(resolve(OUT, `${l.id}.mp3`))));

/** One start time per whitespace-separated word, from the character alignment. */
function wordTimes(text, alignment) {
  const starts = alignment.character_start_times_seconds;
  const words = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(text))) words.push(starts[Math.min(m.index, starts.length - 1)] ?? 0);
  // prepare-audio trims the leading silence, so count from the first word.
  const t0 = words[0] ?? 0;
  return words.map((t) => Math.max(0, +(t - t0).toFixed(3)));
}

mkdirSync(OUT, { recursive: true });
console.log(`${todo.length} of ${lines.length} lines to generate (model ${MODEL}).`);

let chars = 0;
for (const line of todo) {
  const body = {
    text: line.text,
    model_id: MODEL,
    voice_settings: {
      stability: 0.45,
      similarity_boost: 0.75,
      style: MOOD_STYLE[line.mood] ?? 0.35,
      use_speaker_boost: true,
    },
  };
  const res = await api(`/text-to-speech/${VOICES[line.speaker]}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  writeFileSync(resolve(OUT, `${line.id}.mp3`), Buffer.from(res.audio_base64, 'base64'));
  if (res.alignment) {
    writeFileSync(resolve(OUT, `${line.id}.json`), `${JSON.stringify({ words: wordTimes(line.text, res.alignment) })}\n`);
  }
  chars += line.text.length;
  console.log(`  ${line.id} ${line.speaker.padEnd(5)} ${line.text.slice(0, 60)}`);
}
console.log(`Done: ${todo.length} lines, ${chars} characters. Next: npm run prepare:audio`);

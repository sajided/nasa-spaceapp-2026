import type { Direction } from '../types';

/**
 * Voice-over for story mode: one recorded file per story line.
 *
 * Files live at `public/audio/<lineId>.m4a` and are listed in
 * `public/audio/manifest.json` (written by scripts/prepare-audio.mjs). Only
 * listed lines are ever requested, so a line with no recording yet is simply
 * read as text — no 404s in the console, and the app works end to end before a
 * single voice has been recorded.
 *
 * Playback follows the reader:
 * - a line starts when it comes on screen while moving forward or at rest;
 * - it stops the moment the line leaves;
 * - scrolling backwards never starts one (the bubble's replay button does).
 *
 * Optional word timings — `{ "words": [0, 0.42, 0.9, …] }`, seconds per word —
 * sit beside each file as `<lineId>.json` and drive the read-along highlight.
 * Without them the highlight runs at a pace proportional to word length.
 */

export interface NarrationState {
  enabled: boolean;
  lineId: string | null;
  playing: boolean;
  /** Whether the current line has a recording. */
  available: boolean;
}

export interface Narration {
  /** Turns sound on or off. Must first be called from a user gesture. */
  setEnabled(on: boolean): void;
  enabled(): boolean;
  /** Called every frame with the line on screen and the scroll direction. */
  update(lineId: string | null, direction: Direction): void;
  replay(): void;
  /** 0..1 through the current line's audio, or null if none is playing or done. */
  progress(): number | null;
  /** Word start times for the current line, if timings were provided. */
  wordTimes(): number[] | null;
  /** Seconds into the current line's audio. */
  currentTime(): number;
  /** True while the current line's recording is still playing. */
  isPlaying(): boolean;
  has(lineId: string): boolean;
  state(): NarrationState;
  dispose(): void;
}

const AUDIO_BASE = 'audio/';

/** A tenth of a second of silence, as a WAV data URI, to unlock audio in a gesture. */
function silentWav(): string {
  const rate = 8000;
  const samples = rate / 10;
  const buffer = new ArrayBuffer(44 + samples);
  const v = new DataView(buffer);
  const str = (o: number, s: string): void => {
    for (let i = 0; i < s.length; i += 1) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true);
  str(36, 'data');
  v.setUint32(40, samples, true);
  for (let i = 0; i < samples; i += 1) v.setUint8(44 + i, 128);
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export function createNarration(): Narration {
  const audio = new Audio();
  audio.preload = 'auto';
  let on = false;
  let current: string | null = null;
  let playing = false;
  let finished = false;
  let available = new Set<string>();
  const timings = new Map<string, number[] | null>();
  let manifestLoaded = false;

  const loadManifest = (): void => {
    if (manifestLoaded) return;
    manifestLoaded = true;
    fetch(`${AUDIO_BASE}manifest.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : { lines: [] }))
      .then((m: { lines?: string[]; timings?: string[] }) => {
        available = new Set(m.lines ?? []);
        for (const id of m.timings ?? []) timings.set(id, null);
      })
      .catch(() => {
        available = new Set();
      });
  };

  const loadTimings = (id: string): void => {
    if (!timings.has(id) || timings.get(id)) return;
    fetch(`${AUDIO_BASE}${id}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((t: { words?: number[] } | null) => {
        if (t?.words) timings.set(id, t.words);
      })
      .catch(() => undefined);
  };

  audio.addEventListener('ended', () => {
    playing = false;
    finished = true;
  });
  audio.addEventListener('pause', () => {
    playing = false;
  });
  audio.addEventListener('error', () => {
    playing = false;
    finished = true;
  });

  const stop = (): void => {
    if (!audio.paused) audio.pause();
    playing = false;
  };

  const start = (id: string): void => {
    finished = false;
    if (!on || !available.has(id)) return;
    loadTimings(id);
    audio.src = `${AUDIO_BASE}${id}.m4a`;
    audio.currentTime = 0;
    playing = true;
    audio.play().catch(() => {
      playing = false;
      finished = true;
    });
  };

  return {
    setEnabled(value: boolean): void {
      on = value;
      if (on) {
        loadManifest();
        // Unlock playback inside the gesture that turned sound on (iOS Safari
        // will not start audio later otherwise).
        const unlock = new Audio(silentWav());
        unlock.play().catch(() => undefined);
      } else {
        stop();
      }
    },
    enabled: () => on,

    update(lineId: string | null, direction: Direction): void {
      if (lineId === current) return;
      stop();
      current = lineId;
      finished = false;
      if (lineId && direction >= 0) start(lineId);
    },

    replay(): void {
      if (current) {
        stop();
        start(current);
      }
    },

    progress(): number | null {
      if (!playing && !finished) return null;
      if (finished) return 1;
      const d = audio.duration;
      return Number.isFinite(d) && d > 0 ? Math.min(1, audio.currentTime / d) : 0;
    },
    wordTimes: () => (current ? timings.get(current) ?? null : null),
    currentTime: () => audio.currentTime,
    isPlaying: () => playing,
    has: (id: string) => available.has(id),

    state: () => ({
      enabled: on,
      lineId: current,
      playing,
      available: current ? available.has(current) : false,
    }),

    dispose(): void {
      stop();
      audio.removeAttribute('src');
    },
  };
}

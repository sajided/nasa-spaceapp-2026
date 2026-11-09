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
 * Playback follows the reader, like a narrator who never cuts a sentence:
 * - a line starts when it comes on screen while moving forward or at rest;
 * - if the reader scrolls on mid-line, the voice finishes its sentence, then
 *   (after a breath) voices whatever line is on screen by then — lines
 *   scrolled straight past are skipped rather than queued up;
 * - scrolling backwards fades the voice out and never starts one (the
 *   bubble's replay button does).
 *
 * Optional word timings — `{ "words": [0, 0.42, 0.9, …] }`, seconds per word —
 * sit beside each file as `<lineId>.json` and drive the read-along highlight.
 * Without them the highlight runs at a pace proportional to word length.
 *
 * Lines with no recording yet are read by the browser's own speech synthesis
 * (when it has an English voice), with a different voice or pitch for the
 * Earth and the Moon. A recording always wins over speech, so recorded lines
 * can be added one at a time.
 */

export interface NarrationState {
  enabled: boolean;
  lineId: string | null;
  playing: boolean;
  /** Whether the current line has a recording. */
  available: boolean;
  /** How the current line is voiced: its recording, browser speech, or not at all. */
  voice: 'recording' | 'speech' | 'none';
}

/** What speech synthesis needs to read a line that has no recording. */
export interface SpokenLine {
  text: string;
  speaker: 'earth' | 'moon';
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
  /** The line whose voice is sounding now (may still be finishing after its line left). */
  playingLine(): string | null;
  /** Whether a line on screen is waiting for the current voice to finish. */
  waiting(): boolean;
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

/** Each character's voice: preferred voice names (first found wins), pitch and pace. */
const SPEECH_STYLE = {
  earth: {
    prefer: ['Samantha', 'Karen', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Microsoft Zira'],
    pitch: 1.0,
    rate: 0.9,
  },
  moon: {
    prefer: ['Daniel', 'Moira', 'Tessa', 'Google UK English Female', 'Microsoft Sonia', 'Microsoft Libby', 'Microsoft Hazel'],
    pitch: 1.3,
    rate: 0.88,
  },
} as const;

/** Breath between one line's voice ending and the next one starting. */
const LINE_GAP_MS = 250;
/** How long scrolling back takes to fade a voice out. */
const FADE_MS = 200;
/** After any backward movement, a waiting line holds this long before it starts. */
const BACK_HOLD_MS = 400;

/** Rough spoken length, for the highlight when the browser sends no word events. */
const SPEECH_WPS = 2.3;

interface Speech {
  speak(id: string, line: SpokenLine, onEnd: () => void, onWord: (charIndex: number) => void): void;
  cancel(): void;
  unlock(): void;
  ready(): boolean;
}

function createSpeech(): Speech | null {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return null;

  let voices: SpeechSynthesisVoice[] = [];
  const picked: Partial<Record<SpokenLine['speaker'], SpeechSynthesisVoice | null>> = {};
  const loadVoices = (): void => {
    voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
    delete picked.earth;
    delete picked.moon;
  };
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);

  const pick = (speaker: SpokenLine['speaker']): SpeechSynthesisVoice | null => {
    if (picked[speaker] !== undefined) return picked[speaker]!;
    const byName = (names: readonly string[]): SpeechSynthesisVoice | undefined => {
      for (const n of names) {
        const v = voices.find((x) => x.name.startsWith(n));
        if (v) return v;
      }
      return undefined;
    };
    let voice = byName(SPEECH_STYLE[speaker].prefer);
    if (!voice) {
      // No favourite installed: the default English voice for the Earth, a
      // different one for the Moon if there is one (pitch tells them apart
      // either way).
      const fallback = voices.find((v) => v.default) ?? voices[0];
      voice = speaker === 'moon' ? voices.find((v) => v !== pick('earth')) ?? fallback : fallback;
    }
    picked[speaker] = voice ?? null;
    return picked[speaker]!;
  };

  let token = 0;
  return {
    ready: () => voices.length > 0,
    speak(_id, line, onEnd, onWord): void {
      const mine = ++token;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(line.text);
      const style = SPEECH_STYLE[line.speaker];
      const voice = pick(line.speaker);
      if (voice) {
        u.voice = voice;
        u.lang = voice.lang;
      } else {
        u.lang = 'en-US';
      }
      u.pitch = style.pitch;
      u.rate = style.rate;
      // cancel() ends the previous utterance asynchronously; only the
      // current one may report back.
      u.onend = () => mine === token && onEnd();
      u.onerror = () => mine === token && onEnd();
      u.onboundary = (e) => mine === token && e.name !== 'sentence' && onWord(e.charIndex);
      synth.speak(u);
      // Chrome can leave the queue paused after a tab switch.
      if (synth.paused) synth.resume();
    },
    cancel(): void {
      token += 1;
      if (synth.speaking || synth.pending) synth.cancel();
    },
    unlock(): void {
      // iOS only lets speech start later if it has started once inside a tap.
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      synth.speak(u);
    },
  };
}

export function createNarration(lineText: (id: string) => SpokenLine | undefined = () => undefined): Narration {
  const audio = new Audio();
  const speech = createSpeech();
  let speaking = false;
  let speechStart = 0;
  let speechChars = 0;
  let speechLength = 1;
  let speechSeconds = 1;
  /** The line came up before the browser's voices had loaded. */
  let speechPending = false;
  audio.preload = 'auto';
  let on = false;
  /** The line on screen. */
  let current: string | null = null;
  /** The line whose voice is sounding (may lag behind `current` while it finishes). */
  let playingId: string | null = null;
  /** The last line whose voice played to its end. */
  let doneId: string | null = null;
  /** The on-screen line waiting for the voice before it to finish. */
  let pendingId: string | null = null;
  let endedAt = 0;
  /** Last time the reader moved backwards; wheel ticks leave still frames between them. */
  let backAt = -Infinity;
  let playing = false;
  let fadeTimer: ReturnType<typeof setInterval> | null = null;
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

  /** The voice reached the end of its line on its own. */
  const ended = (): void => {
    playing = false;
    speaking = false;
    doneId = playingId;
    playingId = null;
    endedAt = performance.now();
  };

  audio.addEventListener('ended', ended);
  audio.addEventListener('error', ended);
  audio.addEventListener('pause', () => {
    if (!audio.ended) playing = false;
  });

  const canSpeak = (id: string): boolean => Boolean(speech?.ready() && lineText(id));
  const voiceOf = (id: string): NarrationState['voice'] =>
    available.has(id) ? 'recording' : canSpeak(id) ? 'speech' : 'none';

  const clearFade = (): void => {
    if (fadeTimer !== null) clearInterval(fadeTimer);
    fadeTimer = null;
  };

  /** Silence the voice at once (sound off, replay). */
  const stop = (): void => {
    clearFade();
    if (!audio.paused) audio.pause();
    if (speaking) speech?.cancel();
    speaking = false;
    playing = false;
    playingId = null;
    pendingId = null;
  };

  /** Silence the voice gently (scrolling back), so it never clicks off mid-word. */
  const fadeOut = (): void => {
    pendingId = null;
    if (speaking) {
      speech?.cancel();
      speaking = false;
    }
    playing = false;
    playingId = null;
    if (audio.paused || fadeTimer !== null) return;
    const t0 = performance.now();
    fadeTimer = setInterval(() => {
      const k = 1 - (performance.now() - t0) / FADE_MS;
      if (k > 0) {
        audio.volume = k;
        return;
      }
      audio.pause();
      clearFade();
    }, 16);
  };

  const speak = (id: string): void => {
    const line = lineText(id);
    if (!speech || !line) return;
    speaking = true;
    playing = true;
    playingId = id;
    speechStart = performance.now();
    speechChars = 0;
    speechLength = Math.max(1, line.text.length);
    speechSeconds = Math.max(1, line.text.split(/\s+/).length / SPEECH_WPS);
    speech.speak(id, line, ended, (charIndex) => {
      speechChars = charIndex;
    });
  };

  const start = (id: string): void => {
    if (!on) return;
    clearFade();
    audio.volume = 1;
    if (doneId === id) doneId = null;
    if (!available.has(id)) {
      if (canSpeak(id)) speak(id);
      else speechPending = Boolean(speech && lineText(id));
      return;
    }
    loadTimings(id);
    audio.src = `${AUDIO_BASE}${id}.m4a`;
    audio.currentTime = 0;
    playing = true;
    playingId = id;
    audio.play().catch(ended);
  };

  /** Whether `id` would make any sound if started. */
  const voiced = (id: string): boolean => on && (available.has(id) || Boolean(speech && lineText(id)));

  return {
    setEnabled(value: boolean): void {
      on = value;
      if (on) {
        loadManifest();
        // Unlock playback inside the gesture that turned sound on (iOS Safari
        // will not start audio later otherwise).
        const unlock = new Audio(silentWav());
        unlock.play().catch(() => undefined);
        speech?.unlock();
      } else {
        stop();
      }
    },
    enabled: () => on,

    update(lineId: string | null, direction: Direction): void {
      const now = performance.now();
      if (direction < 0) backAt = now;
      // A voice that never reports its end must not hold the story forever.
      if (speaking && (now - speechStart) / 1000 > speechSeconds * 2.5 + 4) {
        speech?.cancel();
        ended();
      }

      if (lineId !== current) {
        current = lineId;
        speechPending = false;
        if (direction < 0) {
          // Going back never starts a voice, and quietly ends the one playing.
          fadeOut();
          return;
        }
        // Moving on: let the line being spoken finish, then voice whatever is
        // on screen by then. Lines scrolled straight past are skipped.
        pendingId = lineId && lineId !== playingId && voiced(lineId) ? lineId : null;
        if (pendingId && !playing) {
          pendingId = null;
          start(lineId!);
        }
        return;
      }

      if (speechPending && on && lineId && canSpeak(lineId)) {
        speechPending = false;
        speak(lineId);
      }
      if (pendingId && !playing && now - endedAt >= LINE_GAP_MS && now - backAt >= BACK_HOLD_MS) {
        const id = pendingId;
        pendingId = null;
        start(id);
      }
    },

    replay(): void {
      if (current) {
        stop();
        start(current);
      }
    },

    progress(): number | null {
      if (!current) return null;
      if (doneId === current && playingId !== current) return 1;
      if (!playing || playingId !== current) return null;
      if (speaking) {
        // Word events where the voice sends them; otherwise an estimate from
        // elapsed time, held short of the end until the voice really stops.
        const byWords = speechChars / speechLength;
        const byTime = (performance.now() - speechStart) / 1000 / speechSeconds;
        return Math.min(0.97, Math.max(byWords, byTime));
      }
      const d = audio.duration;
      return Number.isFinite(d) && d > 0 ? Math.min(1, audio.currentTime / d) : 0;
    },
    wordTimes: () => (current && playingId === current ? timings.get(current) ?? null : null),
    currentTime: () => (speaking ? (performance.now() - speechStart) / 1000 : audio.currentTime),
    // A line waiting its turn counts: auto-advance holds for it too.
    isPlaying: () => playing || pendingId !== null,
    has: (id: string) => available.has(id) || canSpeak(id),
    playingLine: () => (playing ? playingId : null),
    waiting: () => pendingId !== null,

    state: () => ({
      enabled: on,
      lineId: current,
      playing,
      available: current ? available.has(current) : false,
      voice: current && on ? voiceOf(current) : 'none',
    }),

    dispose(): void {
      stop();
      audio.removeAttribute('src');
    },
  };
}

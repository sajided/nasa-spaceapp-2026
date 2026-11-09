import { MET } from '../../data/mission';
import { SEPARATIONS } from '../../data/separations';

/**
 * Sound effects for story mode, all synthesised with Web Audio — no files,
 * no licences, 0 KB.
 *
 * - Engine rumble is a pure function of mission time, like everything else on
 *   the page: it swells through each real burn and follows the scroll in
 *   either direction. It ducks under the voices.
 * - One-shots (pyro bangs at separations, the docking clunk, the touchdown
 *   thud, the splashdown) fire when the reader moves *forward* across their
 *   moment. A frame that crosses several at once is a jump (a scene button,
 *   a big scroll), and plays none of them rather than a pile-up.
 * - Mission radio lines open with a Quindar tone, the beep that keyed the
 *   real air-to-ground link.
 */

export interface Soundscape {
  /** Turn sound on or off. Turning it on must happen inside a user gesture. */
  setEnabled(on: boolean): void;
  /**
   * Every frame: mission time, this frame's direction, whether a voice is
   * sounding, and whether a radio line just started.
   */
  update(met: number, direction: number, voice: boolean, radioStarted: boolean): void;
  dispose(): void;
}

interface Burn {
  start: number;
  end: number;
  /** 0..1 loudness. */
  level: number;
  /** Low-pass cutoff in Hz: higher sounds closer and harsher. */
  tone: number;
}

const BURNS: Burn[] = [
  // The five F-1s: the loudest thing people had ever built.
  { start: MET.ignition, end: MET.sepSIC, level: 1, tone: 520 },
  { start: MET.s2Ignition, end: MET.s2Cutoff, level: 0.55, tone: 300 },
  { start: MET.s4bIgnition, end: MET.orbitInsertion, level: 0.42, tone: 260 },
  { start: MET.tliIgnition, end: MET.tliCutoff, level: 0.42, tone: 260 },
  { start: MET.loiIgnition, end: MET.loiCutoff, level: 0.3, tone: 220 },
  // Eagle's descent engine, all the way down to "engine stop".
  { start: MET.pdi, end: MET.engineStop, level: 0.32, tone: 340 },
  { start: MET.ascentLiftoff, end: MET.ascentInsertion, level: 0.32, tone: 360 },
  { start: MET.teiIgnition, end: MET.teiCutoff, level: 0.3, tone: 220 },
  // Re-entry: not an engine, but the roar of the air on the heat shield.
  { start: MET.entryInterface, end: MET.drogues, level: 0.45, tone: 900 },
];

type Shot = 'pyro' | 'clunk' | 'thud' | 'splash';

interface ShotAt {
  met: number;
  kind: Shot;
}
const pyro = (met: number): ShotAt => ({ met, kind: 'pyro' });
const SHOTS: ShotAt[] = [
  ...SEPARATIONS.map((s) => pyro(s.met)),
  { met: MET.docking, kind: 'clunk' } as ShotAt,
  { met: MET.redock, kind: 'clunk' } as ShotAt,
  { met: MET.touchdown, kind: 'thud' } as ShotAt,
  { met: MET.splashdown, kind: 'splash' } as ShotAt,
].sort((a, b) => a.met - b.met);

/** Seconds of fade at each end of a burn, so the rumble swells rather than switches. */
const RAMP = 4;
const MASTER = 0.55;
const DUCK = 0.35;

function burnLevel(met: number): { level: number; tone: number } {
  for (const b of BURNS) {
    if (met < b.start || met > b.end) continue;
    const ramp = Math.min(RAMP, (b.end - b.start) / 3);
    const k = Math.min(1, (met - b.start) / ramp, (b.end - met) / ramp);
    return { level: b.level * Math.max(0, k), tone: b.tone };
  }
  return { level: 0, tone: 200 };
}

export function createSoundscape(): Soundscape {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let rumbleGain: GainNode | null = null;
  let rumbleFilter: BiquadFilterNode | null = null;
  let noise: AudioBuffer | null = null;
  let on = false;
  let lastMet: number | null = null;

  const setup = (): void => {
    if (ctx) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = MASTER;
    master.connect(ctx.destination);

    // Two seconds of brown noise, looped: the raw material for everything.
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    let b = 0;
    for (let i = 0; i < data.length; i += 1) {
      b = (b + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = b * 3.5;
    }

    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 200;
    rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0;
    src.connect(rumbleFilter).connect(rumbleGain).connect(master);
    src.start();
  };

  /** A burst of filtered noise with a fast attack and an exponential tail. */
  const burst = (type: BiquadFilterType, freq: number, gain: number, decay: number, delay = 0): void => {
    if (!ctx || !master || !noise) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random());
    src.stop(t + decay + 0.05);
  };

  /** A sine (or other wave) that falls in pitch: thumps, bonks, beeps. */
  const tone = (type: OscillatorType, from: number, to: number, gain: number, dur: number, delay = 0): void => {
    if (!ctx || !master) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  };

  const play = (kind: Shot): void => {
    switch (kind) {
      case 'pyro': // explosive bolts: a sharp crack and a deep thump
        burst('highpass', 1400, 0.9, 0.18);
        tone('sine', 110, 38, 0.8, 0.35);
        break;
      case 'clunk': // two metal latches catching
        tone('triangle', 240, 150, 0.5, 0.25);
        burst('bandpass', 2200, 0.5, 0.08);
        tone('triangle', 200, 120, 0.45, 0.3, 0.14);
        burst('bandpass', 1800, 0.4, 0.08, 0.14);
        break;
      case 'thud': // footpads into the dust
        tone('sine', 70, 32, 0.9, 0.6);
        burst('lowpass', 400, 0.6, 0.5);
        break;
      case 'splash': // the capsule into the Pacific
        burst('lowpass', 900, 0.9, 1.4);
        burst('bandpass', 2600, 0.5, 0.9, 0.05);
        tone('sine', 90, 40, 0.6, 0.5);
        break;
    }
  };

  /** The Quindar intro tone: 2525 Hz for a quarter of a second. */
  const quindar = (): void => tone('sine', 2525, 2525, 0.12, 0.25);

  return {
    setEnabled(value: boolean): void {
      on = value;
      if (on) {
        setup();
        void ctx?.resume();
      } else {
        void ctx?.suspend();
      }
      lastMet = null;
    },

    update(met: number, direction: number, voice: boolean, radioStarted: boolean): void {
      if (!on || !ctx || !rumbleGain || !rumbleFilter) {
        lastMet = met;
        return;
      }
      const now = ctx.currentTime;
      const { level, tone: cutoff } = burnLevel(met);
      const target = level * (voice ? DUCK : 1);
      rumbleGain.gain.setTargetAtTime(target, now, 0.12);
      rumbleFilter.frequency.setTargetAtTime(cutoff, now, 0.2);

      if (radioStarted) quindar();

      if (lastMet !== null && direction > 0 && met > lastMet) {
        const crossed = SHOTS.filter((s) => s.met > lastMet! && s.met <= met);
        // More than two at once is a jump, not a moment: stay quiet.
        if (crossed.length > 0 && crossed.length <= 2) crossed.forEach((s, i) => setTimeout(() => play(s.kind), i * 250));
      }
      lastMet = met;
    },

    dispose(): void {
      void ctx?.close();
      ctx = null;
    },
  };
}

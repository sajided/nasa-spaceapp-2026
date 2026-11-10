import { getScrollProgress, scrollToProgress } from '../../core/progress';
import { reducedMotion } from '../../core/motion';
import { story } from '../../style/tokens';
import type { StoryScene } from '../../data/story';

/**
 * Playback controls, sized for small fingers: previous scene, play/pause,
 * next scene; and in the corner, sound, "more facts" and "about".
 *
 * Play is auto-advance: it scrolls the page itself, gently, and *holds* —
 * on each new line until its voice finishes (or, reading quietly, for a
 * child's reading time), at every "Let go!" until it is tapped, and while the
 * album is open. Scroll stays the one source of truth: auto-advance is just
 * scrolling, so the scene behaves exactly as if the child had scrolled.
 * Any manual scroll, swipe or key pauses it.
 */

export interface HoldReasons {
  /** The voice is still speaking the current line. */
  speaking: boolean;
  /** A new line came up and needs reading time (no recording, or sound off). */
  lineId: string | null;
  lineWords: number;
  /** Something else wants the page still: a "Let go!", the album, a picker. */
  waiting: boolean;
  /** A glide (a "Let go!" release, a scene jump) is moving the page. */
  gliding: boolean;
}

export interface StoryControls {
  update(progress: number, hold: HoldReasons): void;
  playing(): boolean;
  play(): void;
  pause(): void;
  dispose(): void;
}

export interface ControlsDeps {
  scenes: readonly StoryScene[];
  progressAtMet(met: number): number;
  sceneAt(progress: number): StoryScene;
  /** Scroll track height in vh, to turn a reading speed into progress. */
  trackVh: number;
  onGlide(progress: number, ms: number): void;
  onToggleSound(): boolean;
  soundOn(): boolean;
  onToggleFacts(): boolean;
  /** Whether a grown-up fact card has something to show right now. */
  factShowingNow(): boolean;
  onAbout(): void;
}

/** Auto-advance speed between lines, in viewport heights per second. */
const SPEED_VH = 34;
/** Reading time for a quiet line: a pause, then a beat per word. */
const readMs = (words: number): number => 1400 + words * 380;

function roundButton(label: string, glyph: string, size: number = story.touch): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('aria-label', label);
  b.textContent = glyph;
  b.style.cssText = `
    width: ${size}px; height: ${size}px; border-radius: 50%;
    border: 3px solid ${story.paperEdge}; background: ${story.paper}; color: ${story.ink};
    font-size: ${Math.round(size * 0.42)}px; font-family: ${story.font}; font-weight: 900;
    display: inline-flex; align-items: center; justify-content: center;
    box-shadow: ${story.shadow}; cursor: pointer; padding: 0;
  `;
  return b;
}

export function createStoryControls(deps: ControlsDeps): StoryControls {
  const bar = document.createElement('nav');
  bar.id = 'story-controls';
  bar.setAttribute('aria-label', 'Story controls');
  bar.style.cssText = `
    position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 11;
    display: flex; align-items: center; gap: 14px;
    padding: 8px 12px; border-radius: 44px;
    background: ${story.glass}; border: 2px solid ${story.glassBorder};
  `;
  const prev = roundButton('Previous part of the story', '⏮');
  const playBtn = roundButton('Play the story', '▶', 68);
  playBtn.id = 'story-play';
  playBtn.style.background = story.warm;
  const next = roundButton('Next part of the story', '⏭');
  bar.append(prev, playBtn, next);

  const corner = document.createElement('div');
  corner.id = 'story-corner';
  corner.style.cssText = `
    position: fixed; top: 16px; right: 16px; z-index: 11; display: flex; gap: 10px;
  `;
  const sound = roundButton('Sound on or off', '🔇');
  sound.id = 'story-sound';
  const facts = roundButton('More facts for grown-ups', '🔭');
  facts.id = 'story-facts';
  facts.setAttribute('aria-pressed', 'false');
  facts.title = 'More facts for grown-ups';
  // A short note under the corner buttons, so the toggle never looks dead
  // when there is no fact for this part of the story.
  const factsHint = document.createElement('p');
  factsHint.id = 'story-facts-hint';
  factsHint.setAttribute('role', 'status');
  factsHint.style.cssText = `
    position: fixed; top: ${16 + story.touch + 10}px; right: 16px; z-index: 11; margin: 0;
    max-width: min(260px, calc(100vw - 32px)); padding: 8px 12px; border-radius: 14px;
    background: ${story.paper}; border: 2px solid ${story.paperEdge}; color: ${story.ink};
    font-family: ${story.font}; font-size: 15px; line-height: 1.3; box-shadow: ${story.shadow};
    opacity: 0; transition: opacity 200ms ease; pointer-events: none;
  `;
  let hintTimer = 0;
  const showHint = (text: string): void => {
    factsHint.textContent = text;
    factsHint.style.opacity = '1';
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => (factsHint.style.opacity = '0'), 3500);
  };
  const about = roundButton('About this story and NASA sources', 'ⓘ');
  about.id = 'story-about';
  corner.append(sound, facts, about);
  document.body.append(bar, corner, factsHint);

  let isPlaying = false;
  let heldLine: string | null = null;
  let holdUntil = 0;
  let last = performance.now();
  /** Fractional pixels carried between frames, so slow speeds still move. */
  let carry = 0;

  const render = (): void => {
    playBtn.textContent = isPlaying ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', isPlaying ? 'Pause the story' : 'Play the story');
    playBtn.dataset.playing = String(isPlaying);
    sound.textContent = deps.soundOn() ? '🔊' : '🔇';
    sound.setAttribute('aria-pressed', String(deps.soundOn()));
  };

  const play = (): void => {
    isPlaying = true;
    heldLine = null;
    last = performance.now();
    render();
  };
  const pause = (): void => {
    isPlaying = false;
    render();
  };

  const jump = (dir: -1 | 1): void => {
    const p = getScrollProgress();
    const scenes = deps.scenes;
    const here = deps.sceneAt(p);
    const i = scenes.findIndex((s) => s.id === here.id);
    const startP = deps.progressAtMet(here.metStart);
    let target: StoryScene | undefined;
    if (dir < 0) {
      // Back to the start of this scene, or to the previous one if already there.
      target = p - startP > 0.004 ? here : scenes[Math.max(0, i - 1)];
    } else {
      target = scenes[i + 1];
    }
    if (!target) {
      if (dir > 0) deps.onGlide(1, 1200);
      return;
    }
    heldLine = null;
    const to = target.id === scenes[0]!.id ? 0 : deps.progressAtMet(target.metStart) + 0.0002;
    deps.onGlide(to, reducedMotion() ? 0 : 1400);
  };

  playBtn.addEventListener('click', () => (isPlaying ? pause() : play()));
  prev.addEventListener('click', () => jump(-1));
  next.addEventListener('click', () => jump(1));
  sound.addEventListener('click', () => {
    deps.onToggleSound();
    render();
  });
  facts.addEventListener('click', () => {
    const on = deps.onToggleFacts();
    facts.setAttribute('aria-pressed', String(on));
    facts.style.background = on ? story.warm : story.paper;
    if (!on) showHint('Grown-up facts off.');
    else if (!deps.factShowingNow()) {
      showHint('Grown-up facts on! They pop up from the Moon landing onwards.');
    } else showHint('Grown-up facts on.');
  });
  about.addEventListener('click', () => deps.onAbout());

  // Manual scrolling pauses auto-play: the child has taken the wheel.
  const onManual = (): void => {
    if (isPlaying) pause();
  };
  const onKey = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    if (document.querySelector('[role="dialog"]:not([hidden])')) return;
    if (e.key === ' ' && target?.tagName !== 'BUTTON') {
      e.preventDefault();
      if (isPlaying) pause();
      else play();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      jump(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      jump(-1);
    } else if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(e.key)) {
      onManual();
    }
  };
  window.addEventListener('wheel', onManual, { passive: true });
  window.addEventListener('touchmove', onManual, { passive: true });
  window.addEventListener('keydown', onKey);
  render();

  return {
    update(progress: number, hold: HoldReasons): void {
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!isPlaying) return;
      if (progress >= 0.9995) {
        pause();
        return;
      }

      // A new line: hold for its voice, or for reading time.
      if (hold.lineId && hold.lineId !== heldLine) {
        heldLine = hold.lineId;
        holdUntil = now + (hold.speaking ? 600 : readMs(hold.lineWords));
      }
      const holding = hold.speaking || hold.waiting || hold.gliding || now < holdUntil;
      if (holding) {
        carry = 0;
        return;
      }

      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const progressPerSecond = SPEED_VH / Math.max(1, deps.trackVh - 100);
      carry += progressPerSecond * dt * max;
      const step = Math.floor(carry);
      if (step >= 1) {
        carry -= step;
        scrollToProgress((window.scrollY + step) / max);
      }
    },
    playing: () => isPlaying,
    play,
    pause,
    dispose(): void {
      window.removeEventListener('wheel', onManual);
      window.removeEventListener('touchmove', onManual);
      window.removeEventListener('keydown', onKey);
      bar.remove();
      corner.remove();
      window.clearTimeout(hintTimer);
      factsHint.remove();
    },
  };
}

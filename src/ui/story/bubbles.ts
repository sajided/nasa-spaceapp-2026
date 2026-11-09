import { reducedMotion } from '../../core/motion';
import type { StoryLine } from '../../data/story';
import { story } from '../../style/tokens';
import { portraitSvg } from './portraits';

/**
 * The speech bubble: who is talking, what they say, and which word the voice
 * is on.
 *
 * Like the callout card and the SLOW-MO badge, what it shows is derived every
 * frame from the line on screen — never toggled by a callback — so it clears
 * and swaps correctly in either scroll direction.
 *
 * Placement: while the Earth–Moon system is on screen and the speaking body is
 * visible, the bubble sits beside that body, so a child sees *who* is
 * talking. Everywhere else (metre scale, small screens, the body off-frame)
 * it docks at the bottom: Earth on the left, the Moon on the right.
 */

export interface ScreenAnchor {
  x: number;
  y: number;
  /** Apparent radius of the body, px. */
  r: number;
}

export interface BubbleFrame {
  line: StoryLine | null;
  /** 0..1 of the way through the line's scroll range. */
  lineFraction: number;
  /** Where the speaker is on screen, or null to dock. */
  anchor: ScreenAnchor | null;
  /** 0..1 through the line's recording, or null with no audio. */
  audioProgress: number | null;
  /** Per-word start times and the clock, if the recording has timings. */
  wordTimes: number[] | null;
  audioTime: number;
  /** Whether the replay button makes sense (a recording exists, sound on). */
  canReplay: boolean;
}

export interface StoryBubbles {
  update(frame: BubbleFrame): void;
  /** Id of the line on screen, or null. */
  active(): string | null;
  /** 'anchored' or 'docked', for the specs. */
  placement(): 'anchored' | 'docked' | 'hidden';
  /** A little wiggle: "I'm still talking!" when a scroll is held. */
  nudge(): void;
  dispose(): void;
}

const BUBBLE_MAX = 440;
/** Largest portrait size, px; it scales down with the viewport (see PORTRAIT_SIZE). */
const PORTRAIT = 150;
/** Big enough to read the faces in the artwork, still leaving a phone room for the text. */
const PORTRAIT_SIZE = `clamp(88px, 13vw, ${PORTRAIT}px)`;
const MARGIN = 16;
/** Below this width the bubble always docks. */
const ANCHOR_MIN_WIDTH = 760;
/** Room left at the bottom for the playback controls. */
const DOCK_BOTTOM = 104;

export function createStoryBubbles(onReplay: () => void): StoryBubbles {
  const root = document.createElement('section');
  root.id = 'story-bubble';
  root.setAttribute('aria-live', 'polite');
  root.setAttribute('aria-atomic', 'true');
  root.style.cssText = `
    position: fixed; left: 0; top: 0; z-index: 8;
    display: flex; align-items: flex-end; gap: 10px;
    max-width: calc(100vw - ${MARGIN * 2}px);
    font-family: ${story.font}; color: ${story.ink};
    opacity: 0; transition: opacity 220ms ease;
    pointer-events: none; will-change: transform;
  `;

  const portrait = document.createElement('div');
  portrait.className = 'story-portrait';
  portrait.style.cssText = `
    flex: 0 0 ${PORTRAIT_SIZE}; width: ${PORTRAIT_SIZE}; height: ${PORTRAIT_SIZE};
    filter: drop-shadow(0 6px 14px rgba(0,0,0,0.4));
  `;

  const bubble = document.createElement('div');
  bubble.className = 'story-text';
  bubble.style.cssText = `
    position: relative; flex: 1 1 auto; max-width: ${BUBBLE_MAX}px;
    padding: 16px 20px; border-radius: 22px;
    background: ${story.paper}; border: 3px solid ${story.paperEdge};
    box-shadow: ${story.shadow};
    font-size: ${story.text}px; line-height: 1.38; font-weight: 600;
  `;

  const name = document.createElement('p');
  name.className = 'story-name';
  name.style.cssText = `margin: 0 0 4px; font-size: 15px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase;`;

  const text = document.createElement('p');
  text.className = 'story-line';
  text.style.cssText = 'margin: 0;';

  const replay = document.createElement('button');
  replay.type = 'button';
  replay.className = 'story-replay';
  replay.setAttribute('aria-label', 'Hear it again');
  replay.textContent = '🔁';
  replay.style.cssText = `
    position: absolute; right: -14px; top: -14px;
    width: 44px; height: 44px; border-radius: 50%;
    border: 3px solid ${story.paperEdge}; background: ${story.paper};
    font-size: 20px; cursor: pointer; pointer-events: auto;
  `;
  replay.addEventListener('click', onReplay);

  bubble.append(name, text, replay);
  root.append(portrait, bubble);
  document.body.appendChild(root);

  let shownId: string | null = null;
  let words: HTMLSpanElement[] = [];
  let weights: number[] = [];
  let highlighted = -1;
  let mode: 'anchored' | 'docked' | 'hidden' = 'hidden';
  let side: 'left' | 'right' = 'left';

  const setLine = (line: StoryLine): void => {
    shownId = line.id;
    root.dataset.lineId = line.id;
    root.dataset.speaker = line.speaker;
    root.dataset.mood = line.mood;
    portrait.innerHTML = portraitSvg(line.speaker, line.mood);
    const isEarth = line.speaker === 'earth';
    name.textContent = isEarth ? 'Earth' : 'Moon';
    name.style.color = isEarth ? story.earthDeep : story.moonDeep;
    bubble.style.borderColor = isEarth ? '#BBD8F5' : '#D8D3E6';

    text.textContent = '';
    words = [];
    weights = [];
    const parts = line.text.split(/\s+/);
    parts.forEach((w, i) => {
      const span = document.createElement('span');
      span.textContent = w;
      span.style.transition = 'color 120ms ease, background-color 120ms ease';
      span.style.borderRadius = '6px';
      text.append(span);
      if (i < parts.length - 1) text.append(' ');
      words.push(span);
      // Longer words take longer to say; punctuation adds a beat.
      weights.push(w.length + 2 + (/[.,!?…]$/.test(w) ? 3 : 0));
    });
    highlighted = -1;
  };

  const highlight = (index: number): void => {
    if (index === highlighted) return;
    highlighted = index;
    words.forEach((span, i) => {
      span.style.color = i <= index ? story.ink : story.inkDim;
      span.style.backgroundColor = i === index ? 'rgba(255,181,71,0.45)' : 'transparent';
    });
  };

  const indexAtFraction = (f: number): number => {
    if (f <= 0) return -1;
    if (f >= 1) return words.length - 1;
    const total = weights.reduce((a, b) => a + b, 0);
    let acc = 0;
    for (let i = 0; i < weights.length; i += 1) {
      acc += weights[i]!;
      if (acc / total >= f) return i;
    }
    return words.length - 1;
  };

  const place = (frame: BubbleFrame, line: StoryLine): void => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = root.getBoundingClientRect();
    const w = rect.width || BUBBLE_MAX + PORTRAIT;
    const h = rect.height || 140;

    const a = frame.anchor;
    if (a && vw >= ANCHOR_MIN_WIDTH) {
      // Beside the body, on the side facing the middle of the screen.
      const right = a.x < vw / 2;
      const x = right ? a.x + a.r + MARGIN : a.x - a.r - MARGIN - w;
      const y = Math.min(Math.max(a.y - h / 2, MARGIN), vh - h - DOCK_BOTTOM);
      if (x >= MARGIN && x + w <= vw - MARGIN) {
        mode = 'anchored';
        side = right ? 'left' : 'right';
        root.style.flexDirection = right ? 'row' : 'row-reverse';
        root.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        return;
      }
    }

    mode = 'docked';
    const earth = line.speaker === 'earth';
    side = earth ? 'left' : 'right';
    root.style.flexDirection = earth ? 'row' : 'row-reverse';
    const x = earth ? MARGIN : vw - MARGIN - w;
    root.style.transform = `translate(${Math.round(Math.max(MARGIN, x))}px, ${Math.round(vh - DOCK_BOTTOM - h)}px)`;
  };

  return {
    update(frame: BubbleFrame): void {
      const line = frame.line;
      if (!line) {
        if (shownId !== null) {
          shownId = null;
          root.dataset.lineId = '';
          root.style.opacity = '0';
        }
        mode = 'hidden';
        return;
      }
      if (line.id !== shownId) setLine(line);
      root.style.opacity = '1';
      replay.hidden = !frame.canReplay;

      let index: number;
      if (frame.wordTimes && frame.audioProgress !== null && frame.audioProgress < 1) {
        index = -1;
        frame.wordTimes.forEach((t, i) => {
          if (frame.audioTime >= t) index = i;
        });
      } else if (frame.audioProgress !== null) {
        index = indexAtFraction(frame.audioProgress);
      } else {
        // Read quietly: the highlight follows the scroll, finishing a little
        // before the line leaves so the last word is seen lit.
        index = indexAtFraction(frame.lineFraction / 0.8);
      }
      highlight(index);
      place(frame, line);
      root.dataset.placement = mode;
      root.dataset.side = side;
    },
    active: () => shownId,
    nudge(): void {
      if (reducedMotion()) return;
      bubble.animate(
        [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(-2deg) scale(1.03)' },
          { transform: 'rotate(2deg) scale(1.03)' },
          { transform: 'rotate(0deg)' },
        ],
        { duration: 360, easing: 'ease-in-out' },
      );
    },
    placement: () => mode,
    dispose(): void {
      root.remove();
    },
  };
}

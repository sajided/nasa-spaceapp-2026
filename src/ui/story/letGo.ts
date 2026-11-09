import { reducedMotion } from '../../core/motion';
import type { SeparationWindow } from '../../core/separation';
import { MONUMENTS, type Monument } from '../../data/monuments';
import { story } from '../../style/tokens';
import type { Glide } from './glide';

/**
 * The "Let go!" button: the child drops each piece of the ship themselves.
 *
 * It appears a short way before a separation that leaves a monument behind,
 * pulses, and — when tapped — glides the page through the separation's
 * slow-motion window, so the stage falls away because the child said so.
 *
 * It is never a gate. Scrolling straight past drops the piece anyway, and the
 * piece is collected anyway; the button only gives a child the moment to do
 * it. Whether it shows is derived from progress every frame, like the
 * SLOW-MO badge, so it cannot get stuck on.
 */
export interface LetGoState {
  monumentId: string | null;
  visible: boolean;
  /** True in the second half of the approach: where auto-play waits for a tap. */
  waiting: boolean;
}

export interface LetGo {
  update(progress: number): void;
  state(): LetGoState;
  /** What the button would do, for keyboard users and the specs. */
  release(): void;
  dispose(): void;
}

/** How far before the window the button appears, in page progress (~45vh). */
const LEAD = 0.006;
const GLIDE_MS = 2600;

interface Moment {
  monument: Monument;
  window: SeparationWindow;
}

export function createLetGo(windows: readonly SeparationWindow[], glide: Glide): LetGo {
  const moments: Moment[] = [];
  for (const m of MONUMENTS) {
    if (!m.separationId) continue;
    const w = windows.find((x) => x.id === m.separationId);
    if (w) moments.push({ monument: m, window: w });
  }

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'let-go';
  button.hidden = true;
  button.style.cssText = `
    position: fixed; left: 50%; top: 84px; z-index: 12;
    transform: translateX(-50%);
    min-height: 72px; padding: 0 30px; border-radius: 40px;
    border: 4px solid #fff; background: ${story.go}; color: #fff;
    font-family: ${story.font}; font-size: 26px; font-weight: 900;
    box-shadow: 0 0 0 0 rgba(255,106,61,0.6), ${story.shadow};
    cursor: pointer; white-space: nowrap; max-width: calc(100vw - 32px);
  `;
  document.body.appendChild(button);

  let current: Moment | null = null;
  let progress = 0;
  let pulse: Animation | null = null;

  const release = (): void => {
    if (!current) return;
    glide.to(current.window.to + 0.0004, GLIDE_MS);
    button.textContent = '👋 Bye-bye!';
  };
  button.addEventListener('click', release);

  const activeAt = (p: number): Moment | null => {
    for (const m of moments) {
      if (p >= m.window.from - LEAD && p < m.window.from) return m;
    }
    return null;
  };

  return {
    update(p: number): void {
      progress = p;
      const next = activeAt(p);
      if (next === current) return;
      current = next;
      pulse?.cancel();
      pulse = null;
      if (!next) {
        button.hidden = true;
        button.dataset.monument = '';
        return;
      }
      button.hidden = false;
      button.dataset.monument = next.monument.id;
      button.textContent = `👋 Let go of ${next.monument.kidName}!`;
      if (!reducedMotion() && button.animate) {
        pulse = button.animate(
          [
            { boxShadow: '0 0 0 0 rgba(255,106,61,0.65)' },
            { boxShadow: '0 0 0 22px rgba(255,106,61,0)' },
          ],
          { duration: 1400, iterations: Infinity },
        );
      }
    },
    state(): LetGoState {
      if (!current) return { monumentId: null, visible: false, waiting: false };
      const from = current.window.from;
      return {
        monumentId: current.monument.id,
        visible: true,
        waiting: progress >= from - LEAD / 2,
      };
    },
    release,
    dispose(): void {
      pulse?.cancel();
      button.remove();
    },
  };
}

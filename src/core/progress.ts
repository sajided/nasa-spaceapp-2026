import type { Direction } from '../types';

/**
 * The single canonical progress value for the whole experience.
 *
 * Scroll position is the source of truth: the anime.js ScrollObserver scrubs the
 * master timeline, the timeline reports its progress here, and everything else
 * (reconciler, debug panel, mission clock in later phases) reads from here.
 * The debug slider and the test API do NOT write progress directly — they set
 * scroll position and let it flow back through the same path, so there is never
 * a second source of truth that can drift out of step. See timeline.ts#seek.
 */

let current = 0;
/** Progress at the previous rendered frame, for direction. */
let previous = 0;
let direction: Direction = 0;

/** Below this, a frame-over-frame change is treated as noise rather than motion. */
const DIRECTION_EPSILON = 1e-6;

export function setProgress(value: number): void {
  current = clamp01(value);
}

export function getProgress(): number {
  return current;
}

/**
 * Called once per rendered frame, after the reconciler has consumed the value.
 * Direction is derived here rather than read from the scroll observer so it
 * stays correct when progress is driven by the debug slider or a test seek.
 */
export function commitFrame(): void {
  const delta = current - previous;
  if (Math.abs(delta) < DIRECTION_EPSILON) {
    direction = 0;
  } else {
    direction = delta > 0 ? 1 : -1;
  }
  previous = current;
}

export function getDirection(): Direction {
  return direction;
}

/** Scroll position as 0..1, read straight from the document. */
export function getScrollProgress(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (max <= 0) return 0;
  return clamp01(window.scrollY / max);
}

/** Sets scroll position from a 0..1 progress value. */
export function scrollToProgress(progress: number, behavior: ScrollBehavior = 'auto'): void {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: clamp01(progress) * max, behavior });
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/**
 * Keeps the viewer's place in the mission when the window is resized.
 *
 * The scroll track is sized in viewport heights, so changing the viewport
 * changes the total scrollable distance. Scroll *position* survives a resize
 * but scroll *fraction* does not — so without this, dragging a window taller
 * silently jumps the mission forward, and rotating a phone lands somewhere
 * other than where you were. TC-P0-08 asks that progress be preserved; this is
 * what preserves it.
 */
export function preserveProgressAcrossResize(): () => void {
  let pending = 0;

  const onResize = (): void => {
    // Captured synchronously, before any frame can overwrite it with the
    // progress implied by the new, not-yet-corrected layout.
    const target = current;
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      scrollToProgress(target);
    });
  };

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  return () => {
    cancelAnimationFrame(pending);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
  };
}

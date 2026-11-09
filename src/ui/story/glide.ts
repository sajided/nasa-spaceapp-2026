import { reducedMotion } from '../../core/motion';
import { clamp01, getScrollProgress, scrollToProgress } from '../../core/progress';

/**
 * Smoothly moves the page to a progress value by driving real scroll.
 *
 * Scroll stays the single source of truth (core/timeline.ts#seek), so a
 * glide is just many small scrolls: the scene follows exactly as if a child
 * had scrolled there by hand, and reversing is just as exact. Any manual
 * wheel, touch or key input cancels a glide in progress.
 */
export interface Glide {
  to(progress: number, durationMs: number): void;
  cancel(): void;
  active(): boolean;
  dispose(): void;
}

export function createGlide(): Glide {
  let frame = 0;
  let running = false;

  const cancel = (): void => {
    cancelAnimationFrame(frame);
    running = false;
  };

  const onUser = (): void => {
    if (running) cancel();
  };
  window.addEventListener('wheel', onUser, { passive: true });
  window.addEventListener('touchstart', onUser, { passive: true });

  return {
    to(progress: number, durationMs: number): void {
      cancel();
      const from = getScrollProgress();
      const target = clamp01(progress);
      if (reducedMotion() || durationMs <= 0) {
        scrollToProgress(target);
        return;
      }
      const start = performance.now();
      running = true;
      const step = (now: number): void => {
        const t = Math.min(1, (now - start) / durationMs);
        // Ease in and out, so the scene starts and settles gently.
        const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        scrollToProgress(from + (target - from) * e);
        if (t < 1) frame = requestAnimationFrame(step);
        else running = false;
      };
      frame = requestAnimationFrame(step);
    },
    cancel,
    active: () => running,
    dispose(): void {
      cancel();
      window.removeEventListener('wheel', onUser);
      window.removeEventListener('touchstart', onUser);
    },
  };
}

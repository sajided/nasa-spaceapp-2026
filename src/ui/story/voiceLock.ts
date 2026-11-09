/**
 * While a line is being spoken, the reader can't scroll past it: forward
 * wheel, swipe and key scrolling are held until the voice finishes, so every
 * line is heard whole.
 *
 * Deliberately narrow:
 * - only forward movement is held; scrolling back still works (and fades the
 *   voice, which releases the hold);
 * - only the reader's own input is held, never programmatic scrolling, so
 *   auto-play, the ◀ ▶ scene buttons and "Let go!" glides behave as before;
 * - a voice that runs far past any line's length releases the hold anyway,
 *   so a stalled recording can never trap the page.
 */

export interface VoiceLock {
  /** Call every frame with whether a voice is sounding right now. */
  update(speaking: boolean): void;
  locked(): boolean;
  dispose(): void;
}

/** No line is anywhere near this long; past it, assume the voice is stuck. */
const MAX_LOCK_MS = 20_000;
const FORWARD_KEYS = new Set(['ArrowDown', 'PageDown', 'End']);

export function createVoiceLock(onBlocked: () => void): VoiceLock {
  let isLocked = false;
  let wasSpeaking = false;
  let since = 0;
  let touchY: number | null = null;
  let lastNudge = 0;

  const block = (e: Event): void => {
    if (e.cancelable) e.preventDefault();
    const now = performance.now();
    if (now - lastNudge > 600) {
      lastNudge = now;
      onBlocked();
    }
  };

  const onWheel = (e: WheelEvent): void => {
    if (isLocked && e.deltaY > 0) block(e);
  };
  const onTouchStart = (e: TouchEvent): void => {
    touchY = e.touches[0]?.clientY ?? null;
  };
  const onTouchMove = (e: TouchEvent): void => {
    const y = e.touches[0]?.clientY;
    if (!isLocked || touchY === null || y === undefined) return;
    // Finger moving up scrolls the page forward.
    if (y < touchY) block(e);
    else touchY = y;
  };
  const onKey = (e: KeyboardEvent): void => {
    if (!isLocked || !FORWARD_KEYS.has(e.key) || e.shiftKey) return;
    const t = e.target as HTMLElement | null;
    if (t && ['INPUT', 'TEXTAREA'].includes(t.tagName)) return;
    block(e);
  };

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('keydown', onKey);

  return {
    update(speaking: boolean): void {
      const now = performance.now();
      if (speaking && !wasSpeaking) since = now;
      wasSpeaking = speaking;
      isLocked = speaking && now - since < MAX_LOCK_MS;
    },
    locked: () => isLocked,
    dispose(): void {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKey);
    },
  };
}

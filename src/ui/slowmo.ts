import type { SeparationWindow } from '../core/separation';
import { ui } from '../style/tokens';

/**
 * The SLOW-MO badge.
 *
 * PRD line 90: every separation is "played in slow motion with a SLOW-MO
 * badge". Rather than being switched on and off by the separation animation,
 * the badge is *derived* from whether the current progress falls inside a
 * separation window. That makes it correct in both scroll directions for free,
 * and impossible for it to get stuck on after a flick-scroll past an event —
 * which is what TC-P1-15 checks.
 *
 * It is real HTML text, not a texture, so it is available to screen readers
 * (Phase 6) and stays crisp at any pixel ratio.
 */

export interface SlowMoBadge {
  update(progress: number): void;
  /** The separation currently in view, or null. Used by the debug API. */
  activeWindow(progress: number): string | null;
  dispose(): void;
}

export function createSlowMoBadge(windows: SeparationWindow[]): SlowMoBadge {
  const el = document.createElement('div');
  el.id = 'slowmo-badge';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.textContent = 'SLOW-MO';
  el.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    z-index: 5; pointer-events: none;
    padding: 5px 12px; border-radius: 3px;
    border: 1px solid ${ui.accent};
    background: rgba(255, 106, 31, 0.12);
    color: ${ui.accent};
    font-family: ${ui.mono}; font-size: 11px; letter-spacing: 0.18em;
    opacity: 0; transition: opacity 160ms ease;
  `;
  document.body.appendChild(el);

  const activeWindow = (progress: number): string | null => {
    for (const w of windows) {
      if (progress >= w.from && progress <= w.to) return w.id;
    }
    return null;
  };

  let shown = false;

  return {
    update(progress: number): void {
      const active = activeWindow(progress) !== null;
      if (active === shown) return;
      shown = active;
      el.style.opacity = active ? '1' : '0';
    },
    activeWindow,
    dispose(): void {
      el.remove();
    },
  };
}

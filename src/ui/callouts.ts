import type { Callout } from '../data/callouts';
import { ui } from '../style/tokens';

/**
 * The callout card: program alarms, fuel calls and the lines people remember.
 *
 * Built the same way as the SLOW-MO badge (ui/slowmo.ts): which callout is up
 * is *derived* from the current mission time every frame, never toggled by an
 * animation callback, so it clears on reverse (TC-P3-03) and cannot be left on
 * screen by a flick-scroll past its window.
 *
 * It is real HTML in a polite live region, so a screen reader announces each
 * beat as it arrives (Phase 6, TC-P6-16), and the DSKY styling is CSS rather
 * than a texture so it stays crisp and selectable. Phase 5's caption cards
 * (FR-6) are expected to absorb this rather than sit beside it.
 */

export interface CalloutCard {
  update(met: number): void;
  /** Id of the callout on screen, or null. Used by the debug API. */
  active(met: number): string | null;
  dispose(): void;
}

const DSKY_AMBER = '#FFB547';
const DSKY_GREEN = '#7CFF9A';

export function createCalloutCard(callouts: readonly Callout[]): CalloutCard {
  const el = document.createElement('section');
  el.id = 'callout';
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.style.cssText = `
    position: fixed; left: 24px; bottom: 24px; z-index: 5;
    max-width: min(440px, calc(100vw - 48px));
    padding: 14px 16px; border-radius: 4px;
    background: ${ui.panelBg}; border: 1px solid ${ui.panelBorder};
    color: ${ui.text}; font-family: ${ui.font};
    opacity: 0; transition: opacity 180ms ease;
    pointer-events: none;
  `;

  const heading = document.createElement('p');
  heading.className = 'callout-text';
  heading.style.cssText = 'margin: 0; font-size: 18px; line-height: 1.3;';

  const detail = document.createElement('p');
  detail.className = 'callout-detail';
  detail.style.cssText = `margin: 6px 0 0; font-size: 13px; line-height: 1.45; color: ${ui.textDim};`;

  el.append(heading, detail);
  document.body.appendChild(el);

  const find = (met: number): Callout | null => {
    for (const c of callouts) {
      if (met >= c.metStart && met <= c.metEnd) return c;
    }
    return null;
  };

  const style = (c: Callout): void => {
    if (c.kind === 'dsky') {
      // The DSKY's PROG display: segmented green digits under an amber
      // PROG light. Monospaced and letter-spaced, since that is what the crew
      // actually saw.
      heading.style.fontFamily = ui.mono;
      heading.style.letterSpacing = '0.14em';
      heading.style.color = DSKY_GREEN;
      el.style.borderColor = DSKY_AMBER;
    } else if (c.kind === 'fuel') {
      heading.style.fontFamily = ui.mono;
      heading.style.letterSpacing = '0.06em';
      heading.style.color = ui.accent;
      el.style.borderColor = ui.accent;
    } else {
      heading.style.fontFamily = ui.font;
      heading.style.letterSpacing = 'normal';
      heading.style.color = ui.text;
      el.style.borderColor = ui.panelBorder;
    }
  };

  let shownId: string | null = null;

  return {
    update(met: number): void {
      const c = find(met);
      const id = c?.id ?? null;
      if (id === shownId) return;
      shownId = id;
      if (!c) {
        el.style.opacity = '0';
        el.dataset.calloutId = '';
        return;
      }
      heading.textContent = c.text;
      detail.textContent = c.detail ?? '';
      detail.hidden = !c.detail;
      el.dataset.calloutId = c.id;
      el.dataset.kind = c.kind;
      style(c);
      el.style.opacity = '1';
    },
    active: (met: number) => find(met)?.id ?? null,
    dispose(): void {
      el.remove();
    },
  };
}

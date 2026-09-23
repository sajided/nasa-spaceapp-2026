import { formatMet } from '../core/met';
import { ui } from '../style/tokens';
import { getDirection, getProgress, getScrollProgress } from '../core/progress';
import type { LoopBundle } from '../core/loop';
import type { TimelineBundle } from '../core/timeline';
import { isDebugEnabled } from './api';

/**
 * The debug panel: timeline progress slider plus live readouts.
 *
 * The slider does not write timeline time — it sets scroll position and lets
 * the value flow back through the same path scroll uses. That is why dragging
 * the slider and scrolling the page cannot disagree (TC-P0-05): there is only
 * one path, not two that have to be kept in step.
 */

export interface DebugPanel {
  update: () => void;
  dispose: () => void;
}

export function createDebugPanel(timeline: TimelineBundle, loop: LoopBundle): DebugPanel | null {
  if (!isDebugEnabled()) return null;

  const root = document.createElement('div');
  root.id = 'debug-panel';
  root.style.cssText = `
    position: fixed; left: 12px; bottom: 12px; z-index: 10;
    display: flex; flex-direction: column; gap: 8px;
    padding: 12px 14px; border-radius: 10px;
    background: ${ui.panelBg}; border: 1px solid ${ui.panelBorder};
    backdrop-filter: blur(8px);
    font-family: ${ui.mono}; font-size: 11px; line-height: 1.5; color: ${ui.text};
    width: min(300px, calc(100vw - 24px));
    user-select: none;
  `;

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '1';
  slider.step = '0.0001';
  slider.value = '0';
  slider.id = 'debug-progress';
  slider.setAttribute('aria-label', 'Timeline progress');
  slider.style.cssText = `width: 100%; accent-color: ${ui.accent}; cursor: pointer;`;

  const readout = document.createElement('div');
  readout.id = 'debug-readout';
  readout.style.cssText = `display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; color: ${ui.textDim};`;

  const rows: Record<string, HTMLSpanElement> = {};
  for (const label of ['progress', 'scroll', 'met', 'chapter', 'direction', 'fps', 'draws']) {
    const key = document.createElement('span');
    key.textContent = label;
    const value = document.createElement('span');
    value.style.color = ui.text;
    value.dataset.debug = label;
    readout.append(key, value);
    rows[label] = value;
  }

  root.append(slider, readout);
  document.body.appendChild(root);

  let dragging = false;
  const onInput = (): void => {
    dragging = true;
    timeline.seek(Number(slider.value));
  };
  const onRelease = (): void => {
    dragging = false;
  };
  slider.addEventListener('input', onInput);
  slider.addEventListener('change', onRelease);
  slider.addEventListener('pointerup', onRelease);

  const update = (): void => {
    const progress = getProgress();
    // Don't fight the user's thumb while they are dragging it.
    if (!dragging) slider.value = String(progress);

    const chapter = timeline.chapterAt(progress);
    const stats = loop.stats();
    const direction = getDirection();

    setText(rows.progress, progress.toFixed(4));
    setText(rows.scroll, getScrollProgress().toFixed(4));
    setText(rows.met, formatMet(timeline.met.metAt(progress)));
    setText(rows.chapter, `${chapter.id} ${(chapter.localProgress * 100).toFixed(0)}%`);
    setText(rows.direction, direction === 0 ? 'idle' : direction > 0 ? 'forward' : 'reverse');
    setText(rows.fps, String(stats.fps));
    setText(rows.draws, String(stats.drawCalls));
  };

  const dispose = (): void => {
    slider.removeEventListener('input', onInput);
    slider.removeEventListener('change', onRelease);
    slider.removeEventListener('pointerup', onRelease);
    root.remove();
  };

  return { update, dispose };
}

function setText(el: HTMLSpanElement | undefined, text: string): void {
  if (el && el.textContent !== text) el.textContent = text;
}

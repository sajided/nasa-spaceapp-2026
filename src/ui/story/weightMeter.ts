import { reducedMotion } from '../../core/motion';
import { ELEPHANT_TONNES, massAt } from '../../data/mass';
import { story } from '../../style/tokens';

/**
 * The weight meter: how heavy the ship is, and how much lighter it gets every
 * time it lets go of something.
 *
 * Log scale, because the ship ends some six hundred times lighter than it
 * starts; on a linear bar everything after the first stage would be a sliver.
 * Read as tonnes and as elephants — the unit a six-year-old can picture.
 */
export interface WeightMeter {
  update(met: number): void;
  reading(): { tonnes: number; visible: boolean };
  dispose(): void;
}

const MAX_T = 3000;
const MIN_T = 4;

const fraction = (t: number): number =>
  Math.min(1, Math.max(0, Math.log(t / MIN_T) / Math.log(MAX_T / MIN_T)));

function formatTonnes(t: number): string {
  if (t >= 100) return `${Math.round(t).toLocaleString('en-US')} t`;
  return `${t.toFixed(1)} t`;
}

function formatElephants(t: number): string {
  const n = t / ELEPHANT_TONNES;
  if (n >= 10) return `≈ ${Math.round(n).toLocaleString('en-US')} 🐘`;
  if (n >= 1.5) return `≈ ${Math.round(n)} 🐘`;
  return '≈ 1 🐘';
}

export function createWeightMeter(): WeightMeter {
  const root = document.createElement('div');
  root.id = 'weight-meter';
  root.setAttribute('role', 'meter');
  root.setAttribute('aria-label', 'How heavy the ship is');
  root.setAttribute('aria-valuemin', String(MIN_T));
  root.setAttribute('aria-valuemax', String(MAX_T));
  root.style.cssText = `
    position: fixed; left: 16px; top: 88px; z-index: 9;
    width: 104px; padding: 10px 10px 12px; border-radius: 18px;
    background: ${story.glass}; border: 2px solid ${story.glassBorder};
    color: #fff; font-family: ${story.font}; text-align: center;
    opacity: 0; transition: opacity 260ms ease; pointer-events: none;
  `;
  const label = document.createElement('p');
  label.style.cssText = 'margin:0 0 6px;font-size:14px;font-weight:800;letter-spacing:0.04em;';
  label.textContent = 'WEIGHT';
  const track = document.createElement('div');
  track.style.cssText = `
    position: relative; width: 30px; height: 150px; margin: 0 auto;
    border-radius: 15px; background: rgba(255,255,255,0.14); overflow: hidden;
  `;
  const fill = document.createElement('div');
  fill.style.cssText = `
    position: absolute; left: 0; right: 0; bottom: 0; height: 100%;
    background: linear-gradient(0deg, ${story.warmDeep}, ${story.warm});
    border-radius: 15px; transition: height 120ms linear;
  `;
  track.append(fill);
  const tonnes = document.createElement('p');
  tonnes.className = 'weight-tonnes';
  tonnes.style.cssText = 'margin:8px 0 0;font-size:18px;font-weight:900;white-space:nowrap;';
  const elephants = document.createElement('p');
  elephants.className = 'weight-elephants';
  elephants.style.cssText = 'margin:2px 0 0;font-size:16px;font-weight:700;white-space:nowrap;';
  root.append(label, track, tonnes, elephants);
  document.body.appendChild(root);

  let last = { tonnes: 0, visible: false };
  let shownText = '';

  return {
    update(met: number): void {
      const r = massAt(met);
      // A drop of more than 2% in one frame is a separation: clunk.
      if (r.visible && last.visible && r.tonnes < last.tonnes * 0.98 && !reducedMotion()) {
        track.animate?.(
          [
            { transform: 'translateY(0)' },
            { transform: 'translateY(6px)' },
            { transform: 'translateY(-3px)' },
            { transform: 'translateY(0)' },
          ],
          { duration: 360, easing: 'ease-out' },
        );
      }
      last = r;
      root.style.opacity = r.visible ? '1' : '0';
      fill.style.height = `${(fraction(r.tonnes) * 100).toFixed(2)}%`;
      const text = formatTonnes(r.tonnes);
      if (text !== shownText) {
        shownText = text;
        tonnes.textContent = text;
        elephants.textContent = formatElephants(r.tonnes);
        root.setAttribute('aria-valuenow', String(Math.round(r.tonnes)));
        root.setAttribute('aria-valuetext', `${text}, about ${Math.max(1, Math.round(r.tonnes / ELEPHANT_TONNES))} elephants`);
      }
    },
    reading: () => ({ ...last }),
    dispose(): void {
      root.remove();
    },
  };
}

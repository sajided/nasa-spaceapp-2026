import { STORY_MET } from '../../data/mission';
import { story } from '../../style/tokens';
import type { ScreenAnchor } from './bubbles';
import { createRestingMap } from './restingMap';

/**
 * The epilogue's HTML beats, each shown over a span of story MET so they come
 * and go with the scroll like everything else:
 *
 * - the real photograph of Tranquility Base from lunar orbit;
 * - the Resting Places map, every pin lit;
 * - "What would you leave?" — the child's gift, which then sits at the
 *   landing site for the rest of the page (and on the next visit);
 * - the end card: read again, or about and sources.
 */

export interface EpilogueFrame {
  met: number;
  collected: readonly string[];
  /** Where the landing site is on screen, or null when not in view. */
  site: ScreenAnchor | null;
}

export interface StoryEpilogue {
  update(frame: EpilogueFrame): void;
  /** True while the picker is up and nothing has been chosen: auto-play waits. */
  waiting(): boolean;
  gift(): string | null;
  /** Which beat is showing, for the specs. */
  beat(): 'photo' | 'map' | 'leave' | 'end' | null;
  dispose(): void;
}

const GIFT_KEY = 'apollo11.gift.v1';
const GIFTS: [string, string][] = [
  ['🖍️', 'a drawing'],
  ['🧸', 'a toy'],
  ['✉️', 'a letter'],
  ['🌻', 'a flower'],
  ['📷', 'a photo'],
  ['⭐', 'a star'],
];

/**
 * Real LRO photograph of the Apollo 11 site: "High Noon at Tranquility Base",
 * LROC Narrow Angle Camera, 2009 (NASA/GSFC/Arizona State University, public
 * domain, via Wikimedia Commons). See docs/asset-budget.md.
 */
const LRO_SRC = 'images/lro-apollo11.webp';

function readGift(): string | null {
  try {
    return window.localStorage.getItem(GIFT_KEY);
  } catch {
    return null;
  }
}

function panel(id: string): HTMLDivElement {
  const el = document.createElement('div');
  el.id = id;
  el.hidden = true;
  el.style.cssText = `
    position: fixed; left: 50%; top: 50%; z-index: 10;
    transform: translate(-50%, -58%);
    width: min(680px, calc(100vw - 32px));
    padding: 16px; border-radius: 24px;
    background: ${story.paper}; border: 4px solid ${story.paperEdge}; box-shadow: ${story.shadow};
    font-family: ${story.font}; color: ${story.ink}; text-align: center;
  `;
  document.body.appendChild(el);
  return el;
}

export function createStoryEpilogue(onRestart: () => void, onAbout: () => void): StoryEpilogue {
  const S = STORY_MET;

  // ── The photograph ──────────────────────────────────────────────────────
  const photo = panel('story-lro');
  const img = document.createElement('img');
  img.alt = 'Photograph from NASA’s Lunar Reconnaissance Orbiter of the Apollo 11 landing site, taken in 2009. The bright spot in the middle is the Descent Stage; the dark lines are the astronauts’ footpaths, and the small bright dots below it are the experiments they left.';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.style.cssText = 'display:block;width:100%;max-height:52vh;object-fit:contain;border-radius:14px;background:#111;';
  const missing = document.createElement('p');
  missing.hidden = true;
  missing.style.cssText = `margin:0;padding:40px 12px;border-radius:14px;background:#111;color:#ddd;font-size:18px;`;
  missing.textContent = '📷 The real photo of Tranquility Base goes here.';
  img.addEventListener('error', () => {
    img.hidden = true;
    missing.hidden = false;
  });
  const caption = document.createElement('p');
  caption.style.cssText = 'margin:12px 0 2px;font-size:22px;font-weight:800;';
  caption.textContent = 'A real photo, taken from space. It’s still there!';
  const credit = document.createElement('p');
  credit.style.cssText = `margin:0;font-size:14px;color:${story.inkDim};`;
  credit.textContent = 'NASA/GSFC/Arizona State University — Lunar Reconnaissance Orbiter Camera, 2009';
  photo.append(img, missing, caption, credit);

  // ── The map ─────────────────────────────────────────────────────────────
  const mapPanel = panel('story-map');
  const mapTitle = document.createElement('h2');
  mapTitle.style.cssText = 'margin:2px 0 10px;font-size:26px;';
  mapTitle.textContent = 'Not forgotten: where every piece rests';
  const map = createRestingMap();
  mapPanel.append(mapTitle, map.element);

  // ── What would you leave? ───────────────────────────────────────────────
  const leave = panel('story-leave');
  const leaveTitle = document.createElement('h2');
  leaveTitle.style.cssText = 'margin:2px 0 12px;font-size:26px;';
  leaveTitle.textContent = 'What would you leave on the Moon?';
  const choices = document.createElement('div');
  choices.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:12px;';
  const buttons: HTMLButtonElement[] = [];
  for (const [icon, label] of GIFTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.gift = icon;
    b.setAttribute('aria-label', `Leave ${label}`);
    b.innerHTML = `<span style="font-size:44px;display:block" aria-hidden="true">${icon}</span><span style="font-size:18px;font-weight:800">${label}</span>`;
    b.style.cssText = `
      min-height: 104px; border-radius: 20px; border: 3px solid ${story.paperEdge};
      background: #fff; color: ${story.ink}; font-family: ${story.font}; cursor: pointer;
    `;
    choices.append(b);
    buttons.push(b);
  }
  leave.append(leaveTitle, choices);

  // ── The child's gift, at the landing site ───────────────────────────────
  const giftMarker = document.createElement('div');
  giftMarker.id = 'story-gift';
  giftMarker.setAttribute('aria-hidden', 'true');
  giftMarker.hidden = true;
  giftMarker.style.cssText = `
    position: fixed; left: 0; top: 0; z-index: 7; font-size: 34px; pointer-events: none;
    filter: drop-shadow(0 0 10px rgba(255,210,140,0.9));
  `;
  document.body.appendChild(giftMarker);

  let gift = readGift();
  const choose = (icon: string): void => {
    gift = icon;
    try {
      window.localStorage.setItem(GIFT_KEY, icon);
    } catch {
      // Storage blocked: the gift still shows for this visit.
    }
    for (const b of buttons) {
      const on = b.dataset.gift === icon;
      b.style.borderColor = on ? story.warmDeep : story.paperEdge;
      b.style.background = on ? '#FFE9C2' : '#fff';
      b.setAttribute('aria-pressed', String(on));
    }
  };
  for (const b of buttons) b.addEventListener('click', () => choose(b.dataset.gift!));
  if (gift) choose(gift);

  // ── The end ─────────────────────────────────────────────────────────────
  const end = document.createElement('div');
  end.id = 'story-end';
  end.hidden = true;
  end.style.cssText = `
    position: fixed; left: 50%; top: 18%; z-index: 10; transform: translateX(-50%);
    font-family: ${story.font}; color: #fff; text-align: center; width: min(560px, calc(100vw - 32px));
  `;
  end.innerHTML = `
    <p style="margin:0;font-size:clamp(34px,7vw,52px);font-weight:900;text-shadow:0 4px 18px rgba(0,0,0,0.6)">The End</p>
    <p style="margin:6px 0 16px;font-size:20px;font-weight:700;text-shadow:0 2px 10px rgba(0,0,0,0.7)">Abandoned… but never forgotten.</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <button type="button" data-end="again" style="min-height:${story.touch}px;padding:0 22px;border-radius:30px;border:3px solid #fff;background:${story.warm};color:${story.ink};font-family:${story.font};font-size:20px;font-weight:900;cursor:pointer;">↺ Read it again</button>
      <button type="button" data-end="about" style="min-height:${story.touch}px;padding:0 22px;border-radius:30px;border:3px solid rgba(255,255,255,0.7);background:rgba(0,0,0,0.35);color:#fff;font-family:${story.font};font-size:20px;font-weight:800;cursor:pointer;">ⓘ About &amp; sources</button>
    </div>
  `;
  document.body.appendChild(end);
  end.querySelector('[data-end="again"]')!.addEventListener('click', onRestart);
  end.querySelector('[data-end="about"]')!.addEventListener('click', onAbout);

  let beat: 'photo' | 'map' | 'leave' | 'end' | null = null;
  let photoRequested = false;

  const show = (el: HTMLElement, on: boolean): void => {
    if (el.hidden === !on) return;
    el.hidden = !on;
  };

  return {
    update({ met, collected, site }: EpilogueFrame): void {
      // Fetch the photograph shortly before it is needed, never at boot.
      if (!photoRequested && met >= S.epilogueStart) {
        photoRequested = true;
        img.src = LRO_SRC;
      }
      const inPhoto = met >= S.lroIn && met < S.lroOut;
      const inMap = met >= S.mapIn && met < S.mapOut;
      const inLeave = met >= S.leaveIn && met < S.leaveOut;
      const inEnd = met >= S.finale + 60;
      show(photo, inPhoto);
      show(mapPanel, inMap);
      show(leave, inLeave);
      show(end, inEnd);
      if (inMap) map.update(collected);
      beat = inPhoto ? 'photo' : inMap ? 'map' : inLeave ? 'leave' : inEnd ? 'end' : null;

      const showGift = Boolean(gift) && met >= S.leaveIn && site !== null && !inPhoto && !inMap;
      giftMarker.hidden = !showGift;
      if (showGift && site) {
        giftMarker.textContent = gift!;
        giftMarker.style.transform = `translate(${Math.round(site.x - 17)}px, ${Math.round(site.y - 52)}px)`;
      }
    },
    waiting: () => beat === 'leave' && !gift,
    gift: () => gift,
    beat: () => beat,
    dispose(): void {
      photo.remove();
      mapPanel.remove();
      leave.remove();
      giftMarker.remove();
      end.remove();
    },
  };
}

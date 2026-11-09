import { reducedMotion } from '../../core/motion';
import { MONUMENTS, RESTING_PLACES, collectedBy, type Monument } from '../../data/monuments';
import { story } from '../../style/tokens';
import { createRestingMap } from './restingMap';

/**
 * The Monument Album: a card for every piece the mission let go of.
 *
 * The one deliberate exception to "everything is a function of scroll". The
 * scene un-separates when you scroll back — it has to — but a child's
 * collection must not un-collect. So the album keeps a high-water mark: the
 * furthest mission time ever reached, persisted in localStorage. It is UI
 * memory, never read by the scene, so the scene's determinism is untouched.
 */

export interface Album {
  update(met: number): void;
  collected(): string[];
  maxMet(): number;
  isOpen(): boolean;
  open(): void;
  close(): void;
  dispose(): void;
}

const STORAGE_KEY = 'apollo11.album.v1';

function readStored(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return -Infinity;
    const value = Number(JSON.parse(raw).maxMet);
    return Number.isFinite(value) ? value : -Infinity;
  } catch {
    return -Infinity;
  }
}

function writeStored(maxMet: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ maxMet }));
  } catch {
    // Private mode or storage blocked: the album still works for this visit.
  }
}

function cardHtml(m: Monument, have: boolean): string {
  const place = RESTING_PLACES[m.restingPlace];
  if (!have) {
    return `<div class="album-icon" aria-hidden="true" style="filter: grayscale(1) brightness(0.4)">${m.icon}</div>
      <p class="album-name" style="margin:6px 0 0;font-weight:800;color:${story.inkDim}">???</p>
      <p style="margin:4px 0 0;font-size:15px;color:${story.inkDim}">Keep going to find it!</p>`;
  }
  return `<div class="album-icon" aria-hidden="true">${m.icon}</div>
    <p class="album-name" style="margin:6px 0 0;font-weight:800">${m.name}</p>
    <p style="margin:4px 0 0;font-size:15px;color:${story.inkDim}">Rests: ${place.icon} ${place.label}</p>
    <p style="margin:8px 0 0;font-size:16px;line-height:1.35">${m.fact}</p>
    ${m.notForgotten ? `<p class="album-ribbon" style="margin:10px 0 0;padding:6px 10px;border-radius:10px;background:${story.warm};font-size:15px;font-weight:800">⭐ Not forgotten! ${m.notForgotten}</p>` : ''}`;
}

export function createAlbum(): Album {
  let maxMet = readStored();
  let collected = collectedBy(maxMet);

  // ── The button ──────────────────────────────────────────────────────────
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'album-button';
  button.style.cssText = `
    position: fixed; top: 16px; left: 16px; z-index: 9;
    min-width: ${story.touch}px; height: ${story.touch}px; padding: 0 16px;
    display: flex; align-items: center; gap: 8px;
    border-radius: 18px; border: 3px solid ${story.paperEdge};
    background: ${story.paper}; color: ${story.ink};
    font-family: ${story.font}; font-size: 20px; font-weight: 800;
    box-shadow: ${story.shadow}; cursor: pointer;
    transition: transform 200ms ease;
  `;
  const count = document.createElement('span');
  button.append('📒', count);
  document.body.appendChild(button);

  // ── The panel ───────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'album-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Monument Album');
  panel.hidden = true;
  panel.style.cssText = `
    position: fixed; inset: 0; z-index: 30; overflow-y: auto;
    background: rgba(5, 7, 12, 0.78); padding: 24px 16px 40px;
    font-family: ${story.font}; color: ${story.ink};
  `;
  const sheet = document.createElement('div');
  sheet.style.cssText = `
    max-width: 960px; margin: 0 auto; padding: 20px; border-radius: 26px;
    background: ${story.paper}; border: 4px solid ${story.paperEdge}; box-shadow: ${story.shadow};
  `;
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;';
  const title = document.createElement('h2');
  title.style.cssText = 'margin:0;font-size:28px;';
  title.textContent = '📒 My Monument Album';
  const close = document.createElement('button');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close album');
  close.textContent = '✕';
  close.style.cssText = `
    width:${story.touch}px;height:${story.touch}px;border-radius:50%;border:3px solid ${story.paperEdge};
    background:#fff;font-size:24px;cursor:pointer;flex:0 0 auto;
  `;
  header.append(title, close);

  const intro = document.createElement('p');
  intro.style.cssText = `margin:8px 0 14px;font-size:18px;color:${story.inkDim};`;
  intro.textContent = 'Every piece the astronauts let go of is still out there. Find them all!';

  const map = createRestingMap();
  const mapWrap = document.createElement('div');
  mapWrap.style.cssText = 'margin: 0 0 16px;';
  mapWrap.append(map.element);

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;';
  const cards = new Map<string, HTMLElement>();
  for (const m of MONUMENTS) {
    const card = document.createElement('article');
    card.className = 'album-card';
    card.dataset.monument = m.id;
    card.style.cssText = `
      padding: 14px; border-radius: 18px; background: #fff; border: 3px solid ${story.paperEdge};
      font-size: 18px;
    `;
    grid.append(card);
    cards.set(m.id, card);
  }

  sheet.append(header, intro, mapWrap, grid);
  panel.append(sheet);
  document.body.appendChild(panel);

  const render = (): void => {
    count.textContent = `${collected.length}/${MONUMENTS.length}`;
    button.setAttribute('aria-label', `Monument Album: ${collected.length} of ${MONUMENTS.length} found`);
    for (const m of MONUMENTS) {
      const card = cards.get(m.id)!;
      const have = collected.includes(m.id);
      card.dataset.collected = String(have);
      card.innerHTML = cardHtml(m, have);
      const icon = card.querySelector<HTMLElement>('.album-icon');
      if (icon) icon.style.fontSize = '44px';
    }
    map.update(collected);
  };
  render();

  let lastFocus: HTMLElement | null = null;
  const open = (): void => {
    lastFocus = document.activeElement as HTMLElement | null;
    panel.hidden = false;
    close.focus();
  };
  const closePanel = (): void => {
    panel.hidden = true;
    lastFocus?.focus?.();
  };
  button.addEventListener('click', open);
  close.addEventListener('click', closePanel);
  panel.addEventListener('click', (e) => {
    if (e.target === panel) closePanel();
  });
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && !panel.hidden) closePanel();
  };
  window.addEventListener('keydown', onKey);

  // ── A card flies into the album ─────────────────────────────────────────
  const fly = (m: Monument): void => {
    button.animate?.(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }],
      { duration: reducedMotion() ? 0 : 420 },
    );
    if (reducedMotion()) return;
    const chip = document.createElement('div');
    chip.className = 'album-fly';
    chip.setAttribute('aria-hidden', 'true');
    chip.textContent = `${m.icon} ${m.name}`;
    chip.style.cssText = `
      position: fixed; z-index: 25; left: 50%; top: 40%;
      transform: translate(-50%, -50%) scale(1); opacity: 1;
      padding: 12px 18px; border-radius: 18px; background: ${story.paper};
      border: 3px solid ${story.warm}; box-shadow: ${story.shadow};
      font-family: ${story.font}; font-size: 22px; font-weight: 800; color: ${story.ink};
      pointer-events: none;
      transition: left 900ms cubic-bezier(.5,0,.3,1) 500ms, top 900ms cubic-bezier(.5,0,.3,1) 500ms,
                  transform 900ms ease 500ms, opacity 400ms ease 1200ms;
    `;
    document.body.appendChild(chip);
    requestAnimationFrame(() => {
      const r = button.getBoundingClientRect();
      chip.style.left = `${r.left + r.width / 2}px`;
      chip.style.top = `${r.top + r.height / 2}px`;
      chip.style.transform = 'translate(-50%, -50%) scale(0.2)';
      chip.style.opacity = '0';
    });
    window.setTimeout(() => chip.remove(), 1800);
  };

  // Live region announcing new finds, for screen readers.
  const announcer = document.createElement('p');
  announcer.className = 'visually-hidden';
  announcer.setAttribute('aria-live', 'polite');
  document.body.appendChild(announcer);

  return {
    update(met: number): void {
      if (met <= maxMet) return;
      maxMet = met;
      const now = collectedBy(maxMet);
      if (now.length === collected.length) return;
      const fresh = MONUMENTS.filter((m) => now.includes(m.id) && !collected.includes(m.id));
      collected = now;
      writeStored(maxMet);
      render();
      // A flick-scroll can pass several at once; one flight is plenty.
      const newest = fresh[fresh.length - 1];
      if (newest) {
        fly(newest);
        announcer.textContent = `Found for your album: ${fresh.map((m) => m.name).join(', ')}`;
      }
    },
    collected: () => [...collected],
    maxMet: () => maxMet,
    isOpen: () => !panel.hidden,
    open,
    close: closePanel,
    dispose(): void {
      window.removeEventListener('keydown', onKey);
      button.remove();
      panel.remove();
      announcer.remove();
    },
  };
}

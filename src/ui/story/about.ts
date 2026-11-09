import { story } from '../../style/tokens';

/**
 * About and sources: who made this, where every fact comes from, and what is
 * stylised. The PRD asks that facts be checked against NASA sources and that
 * stylisation be labelled (TC-P6-23); this is where a teacher or a judge
 * finds both.
 */
export interface AboutPanel {
  open(): void;
  close(): void;
  isOpen(): boolean;
  dispose(): void;
}

const SOURCES: [string, string][] = [
  ['Apollo 11 Flight Journal — NASA History', 'https://www.nasa.gov/history/afj/ap11fj/'],
  ['Apollo 11 Lunar Surface Journal — NASA History', 'https://www.nasa.gov/history/alsj/a11/a11.html'],
  ['Lunar Reconnaissance Orbiter Camera (NASA/GSFC/Arizona State University)', 'https://www.lroc.asu.edu/'],
  ['NASA 3D Resources (Earth and Moon imagery, F-1 engine model)', 'https://github.com/nasa/NASA-3D-Resources'],
];

export function createAbout(): AboutPanel {
  const root = document.createElement('div');
  root.id = 'story-about-panel';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'story-about-title');
  root.hidden = true;
  root.style.cssText = `
    position: fixed; inset: 0; z-index: 35; overflow-y: auto; padding: 24px 16px;
    background: rgba(5,7,12,0.8); font-family: ${story.font}; color: ${story.ink};
  `;
  root.innerHTML = `
    <div style="max-width:680px;margin:0 auto;padding:22px;border-radius:24px;background:${story.paper};border:4px solid ${story.paperEdge};font-size:18px;line-height:1.45;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <h2 id="story-about-title" style="margin:0;font-size:26px;">About this story</h2>
        <button type="button" data-close aria-label="Close" style="width:${story.touch}px;height:${story.touch}px;border-radius:50%;border:3px solid ${story.paperEdge};background:#fff;font-size:24px;cursor:pointer;">✕</button>
      </div>
      <p><strong>The Monuments We Left Behind</strong> was made for the NASA Space Apps Challenge, “Abandoned but not forgotten”. It follows the real Apollo 11 mission of July 1969, told by the Earth and the Moon.</p>
      <p><strong>What is real:</strong> the order and timing of every event, what each piece of the ship was, and where it rests today. The photograph of the landing site is a real image taken from lunar orbit.</p>
      <p><strong>What is made up:</strong> the Earth and the Moon talking, and their feelings! The 3D scenes are stylised, distances and sizes between scenes are not to scale, and the glow on the Moon marks the landing site rather than its exact spot. Weights are rounded.</p>
      <h3 style="margin:16px 0 6px;font-size:20px;">Sources</h3>
      <ul style="margin:0;padding-left:22px;">
        ${SOURCES.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener" style="color:${story.earthDeep}">${t}</a></li>`).join('')}
      </ul>
      <p style="margin-top:14px;font-size:16px;color:${story.inkDim}">NASA imagery is in the public domain. NASA does not endorse this project.</p>
    </div>
  `;
  document.body.appendChild(root);

  let lastFocus: HTMLElement | null = null;
  const close = (): void => {
    root.hidden = true;
    lastFocus?.focus?.();
  };
  root.querySelector('[data-close]')!.addEventListener('click', close);
  root.addEventListener('click', (e) => {
    if (e.target === root) close();
  });
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && !root.hidden) close();
  };
  window.addEventListener('keydown', onKey);

  return {
    open(): void {
      lastFocus = document.activeElement as HTMLElement | null;
      root.hidden = false;
      root.querySelector<HTMLButtonElement>('[data-close]')!.focus();
    },
    close,
    isOpen: () => !root.hidden,
    dispose(): void {
      window.removeEventListener('keydown', onKey);
      root.remove();
    },
  };
}

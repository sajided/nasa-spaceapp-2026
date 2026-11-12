import { story } from '../../style/tokens';

/**
 * The title screen: "The Moon Project".
 *
 * Two choices, both big: start with the voices on, or read quietly. The first
 * tap is also what browsers require before any sound may play, so turning the
 * narration on happens inside this click.
 */
export interface StartScreen {
  dispose(): void;
}

export function createStartScreen(onStart: (sound: boolean) => void): StartScreen {
  const root = document.createElement('div');
  root.id = 'story-start';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'story-start-title');
  root.style.cssText = `
    position: fixed; inset: 0; z-index: 40; overflow-y: auto;
    display: flex; align-items: center; justify-content: center; padding: 24px 16px;
    background: radial-gradient(ellipse at 70% 60%, rgba(40,46,90,0.55), rgba(5,7,12,0.92) 70%);
    font-family: ${story.font}; color: #fff; text-align: center;
  `;
  root.innerHTML = `
    <div style="max-width: 640px;">
      <p style="margin:0;font-size:18px;font-weight:800;letter-spacing:0.12em;color:${story.warm}">APOLLO 11 · A STORY FROM THE EARTH AND THE MOON</p>
      <h1 id="story-start-title" style="margin:12px 0 10px;font-size:clamp(34px,7vw,58px);line-height:1.05;">The Moon<br/>Project</h1>
      <p style="margin:0 auto 28px;max-width:500px;font-size:21px;line-height:1.4;color:#E8E4F5">
        The Moon is lonely. Then, one day, humans come to visit — and they leave something behind.
      </p>
      <div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;">
        <button type="button" data-start="sound" style="min-height:72px;padding:0 30px;border-radius:40px;border:4px solid #fff;background:${story.warm};color:${story.ink};font-family:${story.font};font-size:24px;font-weight:900;cursor:pointer;">▶ Start the story</button>
        <button type="button" data-start="quiet" style="min-height:72px;padding:0 26px;border-radius:40px;border:3px solid rgba(255,255,255,0.6);background:transparent;color:#fff;font-family:${story.font};font-size:22px;font-weight:800;cursor:pointer;">📖 Read quietly</button>
      </div>
      <p style="margin:26px 0 0;font-size:17px;color:#BDB8D4">Scroll, swipe or press ▶ to move through the story. Tap 📒 to see what you have found.</p>
    </div>
  `;
  document.body.appendChild(root);

  const go = (sound: boolean): void => {
    root.remove();
    onStart(sound);
  };
  root.querySelector<HTMLButtonElement>('[data-start="sound"]')!.addEventListener('click', () => go(true));
  root.querySelector<HTMLButtonElement>('[data-start="quiet"]')!.addEventListener('click', () => go(false));
  root.querySelector<HTMLButtonElement>('[data-start="sound"]')!.focus();

  return {
    dispose(): void {
      root.remove();
    },
  };
}

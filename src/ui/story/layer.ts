import { Vector3, type PerspectiveCamera } from 'three';
import { EARTH_MOON_DISTANCE, EARTH_RADIUS, MOON_RADIUS } from '../../core/frames';
import { createNarration, type NarrationState } from '../../core/narration';
import { getDirection } from '../../core/progress';
import type { SeparationWindow } from '../../core/separation';
import type { TimelineBundle } from '../../core/timeline';
import { STORY_LINES, STORY_SCENES, storyLineAt, storySceneAt } from '../../data/story';
import { SITE_DIRECTION } from '../../scene/system';
import type { CalloutCard } from '../callouts';
import { createAbout } from './about';
import { createAlbum } from './album';
import { createStoryBubbles, type ScreenAnchor } from './bubbles';
import { createStoryControls } from './controls';
import { createStoryEpilogue } from './epilogue';
import { createGlide } from './glide';
import { createLetGo, type LetGoState } from './letGo';
import { createStartScreen } from './start';
import { createVoiceLock } from './voiceLock';
import { createWeightMeter } from './weightMeter';

/**
 * Story mode's HTML layer, composed: bubbles, narration, album, "Let go!",
 * weight meter, controls, epilogue beats, start screen and about panel.
 *
 * main.ts calls `update` once per frame after the scene has been written, so
 * every overlay reads the same progress and mission time the render does.
 */

export interface StoryReport {
  lineId: string | null;
  scene: number;
  placement: 'anchored' | 'docked' | 'hidden';
  narration: NarrationState;
  album: { collected: string[]; maxMet: number; open: boolean };
  mass: { tonnes: number; visible: boolean };
  letGo: LetGoState;
  playing: boolean;
  facts: boolean;
  epilogue: 'photo' | 'map' | 'leave' | 'end' | null;
  gift: string | null;
}

export interface StoryLayer {
  update(progress: number, met: number, systemVisible: boolean): void;
  report(): StoryReport;
  /** Whether the grown-up callout card is switched on. */
  factsOn(): boolean;
  dispose(): void;
}

export interface StoryLayerDeps {
  timeline: TimelineBundle;
  camera: PerspectiveCamera;
  windows: readonly SeparationWindow[];
  sitePosition: Vector3;
  callouts: CalloutCard;
  trackVh: number;
  showStart: boolean;
}

const EARTH_POS = new Vector3(0, 0, 0);
const MOON_POS = new Vector3(EARTH_MOON_DISTANCE, 0, 0);

export function createStoryLayer(deps: StoryLayerDeps): StoryLayer {
  const { timeline, camera } = deps;
  const linesById = new Map(STORY_LINES.map((l) => [l.id, l]));
  const narration = createNarration((id) => linesById.get(id));
  const glide = createGlide();
  const album = createAlbum();
  const about = createAbout();
  const meter = createWeightMeter();
  const letGo = createLetGo(deps.windows, glide);
  const bubbles = createStoryBubbles(() => narration.replay());
  const voiceLock = createVoiceLock(() => bubbles.nudge());
  const epilogue = createStoryEpilogue(
    () => glide.to(0, 0),
    () => about.open(),
  );

  let facts = false;
  const calloutEl = document.getElementById('callout');
  if (calloutEl) {
    // Out of the way of the docked speech bubble: under the corner buttons.
    Object.assign(calloutEl.style, { left: 'auto', bottom: 'auto', right: '16px', top: '88px' });
  }

  const controls = createStoryControls({
    scenes: STORY_SCENES,
    progressAtMet: (met) => timeline.met.progressAtMet(met),
    sceneAt: (p) => storySceneAt(timeline.met.metAt(p)),
    trackVh: deps.trackVh,
    onGlide: (p, ms) => glide.to(p, ms),
    onToggleSound: () => {
      narration.setEnabled(!narration.enabled());
      return narration.enabled();
    },
    soundOn: () => narration.enabled(),
    onToggleFacts: () => {
      facts = !facts;
      if (!facts) deps.callouts.update(-1e9);
      return facts;
    },
    onAbout: () => about.open(),
  });

  const start = deps.showStart
    ? createStartScreen((sound) => {
        narration.setEnabled(sound);
        controls.play();
      })
    : null;

  // ── Screen anchors for the bodies and the landing site ──────────────────
  const v = new Vector3();
  const toCam = new Vector3();
  const anchorFor = (world: Vector3, radius: number): ScreenAnchor | null => {
    v.copy(world).project(camera);
    if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) return null;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dist = camera.position.distanceTo(world);
    const r = (radius / (dist * Math.tan((camera.fov * Math.PI) / 360))) * (h / 2);
    return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, r };
  };

  let lastLineId: string | null = null;
  let lastScene = 1;
  let lastProgress = 0;

  return {
    update(progress: number, met: number, systemVisible: boolean): void {
      const line = storyLineAt(met);
      const scene = storySceneAt(met);
      lastLineId = line?.id ?? null;
      lastScene = scene.id;

      // This frame's own movement: the shared direction is last frame's, which
      // reads as "still" when a wheel jump follows a quiet frame.
      const delta = progress - lastProgress;
      lastProgress = progress;
      const direction = Math.abs(delta) > 1e-6 ? (delta > 0 ? 1 : -1) : getDirection();
      narration.update(lastLineId, direction);
      voiceLock.update(narration.state().playing);
      album.update(met);
      meter.update(met);
      letGo.update(progress);

      let anchor: ScreenAnchor | null = null;
      if (line && systemVisible) {
        anchor = line.speaker === 'earth' ? anchorFor(EARTH_POS, EARTH_RADIUS) : anchorFor(MOON_POS, MOON_RADIUS);
      }
      let lineFraction = 0;
      if (line) {
        const a = timeline.met.progressAtMet(line.metStart);
        const b = timeline.met.progressAtMet(line.metEnd);
        lineFraction = b > a ? (progress - a) / (b - a) : 1;
      }
      bubbles.update({
        line,
        lineFraction,
        anchor,
        audioProgress: narration.progress(),
        wordTimes: narration.wordTimes(),
        audioTime: narration.currentTime(),
        canReplay: Boolean(line && narration.enabled() && narration.has(line.id)),
      });

      let site: ScreenAnchor | null = null;
      if (systemVisible) {
        toCam.copy(camera.position).sub(MOON_POS).normalize();
        if (toCam.dot(SITE_DIRECTION) > 0.15) site = anchorFor(deps.sitePosition, 0);
      }
      epilogue.update({ met, collected: album.collected(), site });

      controls.update(progress, {
        speaking: narration.isPlaying(),
        lineId: lastLineId,
        lineWords: line ? line.text.split(/\s+/).length : 0,
        waiting: letGo.state().waiting || album.isOpen() || about.isOpen() || epilogue.waiting(),
        gliding: glide.active(),
      });
    },

    report(): StoryReport {
      return {
        lineId: lastLineId,
        scene: lastScene,
        placement: bubbles.placement(),
        narration: narration.state(),
        album: { collected: album.collected(), maxMet: album.maxMet(), open: album.isOpen() },
        mass: meter.reading(),
        letGo: letGo.state(),
        playing: controls.playing(),
        facts,
        epilogue: epilogue.beat(),
        gift: epilogue.gift(),
      };
    },

    factsOn: () => facts,

    dispose(): void {
      start?.dispose();
      controls.dispose();
      epilogue.dispose();
      bubbles.dispose();
      letGo.dispose();
      meter.dispose();
      about.dispose();
      album.dispose();
      glide.dispose();
      voiceLock.dispose();
      narration.dispose();
    },
  };
}

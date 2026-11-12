import { Scene, type DirectionalLight } from 'three';
import { chaptersFor } from './chapters/registry';
import { createCameraRig } from './core/camera';
import { applyClipPlanes } from './core/clip';
import { clearEffectsState, createEffectsState } from './core/effects';
import { createFrames } from './core/frames';
import { startLoop } from './core/loop';
import { commitFrame, preserveProgressAcrossResize, setProgress } from './core/progress';
import { clearBindings, getBinding, reconcile } from './core/reconcile';
import { createRenderer } from './core/renderer';
import { separationWindows } from './core/separation';
import { createStage } from './core/stage';
import { createMasterTimeline } from './core/timeline';
import { detectQualityTier } from './core/quality';
import { CALLOUTS } from './data/callouts';
import { MET_ANCHORS, scrollTrackVh } from './data/mission';
import { SEPARATIONS } from './data/separations';
import { installDebugAPI } from './debug/api';
import { createDebugPanel, type DebugPanel } from './debug/panel';
import { createEffects } from './scene/effects';
import { loadF1Engines } from './scene/engines';
import { createPad } from './scene/pad';
import { createSaturnV } from './scene/saturnV';
import { createLunarSurface } from './scene/lunarSurface';
import { createReentry } from './scene/reentry';
import { createSurfaceCast } from './scene/surfaceCast';
import { createSystem } from './scene/system';
import { createCalloutCard } from './ui/callouts';
import { createSlowMoBadge } from './ui/slowmo';
import { readStoryConfig } from './core/storyMode';
import { useStoryFraming } from './data/cameras';
import type { StoryLayer } from './ui/story/layer';
import type { PartState } from './types';

/**
 * Composition root.
 *
 * The per-frame order is deliberate and worth keeping: read the timeline, write
 * the scene graph, place the camera, apply the effects, then commit derived
 * values. Reading progress in the loop rather than from an anime callback means
 * one code path produces every frame, whatever drove the scroll.
 */
async function boot(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene');
  const track = document.querySelector<HTMLElement>('#scroll-track');
  if (!canvas || !track) throw new Error('Missing #scene canvas or #scroll-track element');

  // Story mode (the default) brackets the mission with the prologue and
  // epilogue and adds the children's layer; `?story=0` is the classic replay.
  const storyConfig = readStoryConfig();
  const chapters = chaptersFor(storyConfig.enabled);
  useStoryFraming(storyConfig.enabled);
  const chapterIds = new Set(chapters.map((c) => c.id));
  const trackVh = scrollTrackVh(chapters);
  track.style.height = `${trackVh}vh`;
  document.body.dataset.mode = storyConfig.enabled ? 'story' : 'classic';

  const { renderer, camera, dispose: disposeRenderer } = createRenderer(canvas);
  const scene = new Scene();
  const frames = createFrames(scene);
  createStage(renderer, frames.vehicleFrame, scene);
  const vehicle = createSaturnV(frames.vehicleFrame);
  const pad = createPad(frames.vehicleFrame, { story: storyConfig.enabled });
  const system = createSystem(frames.systemFrame, { storyMoon: storyConfig.enabled });

  // NASA's F-1, instanced five times in place of the procedural bells. Awaited
  // before the page reports ready so tests and screenshots never race a
  // half-dressed rocket; it resolves false rather than throwing if the asset is
  // missing, leaving the procedural bells in place.
  const engines = loadF1Engines(vehicle.f1Bells);
  const effectsScene = createEffects(scene, frames.vehicleFrame, pad.pad);

  // Chapters 7–8. The stage's lights are looked up by name rather than threaded
  // through createStage, because only the lunar surface needs to steer them.
  const light = <T,>(name: string): T => {
    const found = frames.vehicleFrame.getObjectByName(name);
    if (!found) throw new Error(`Stage light '${name}' not found`);
    return found as unknown as T;
  };
  const surface = createLunarSurface({
    vehicleFrame: frames.vehicleFrame,
    renderer,
    lmFlight: vehicle.parts['LM-flight']!,
    tier: detectQualityTier(),
    environment: scene.environment,
    lights: {
      sun: light<DirectionalLight>('sun'),
      fill: light<DirectionalLight>('earthshine'),
      rim: light<DirectionalLight>('rim'),
    },
  });
  const cast = createSurfaceCast(surface.site);

  // Chapter 9 leaves the descent stage on the Moon: its fifth home is the
  // landing site, which only exists once the surface does. Index 4, after the
  // stack, open space, the CSM and Eagle's flight frame.
  const lmBinding = getBinding('LM');
  if (!lmBinding || lmBinding.attachments.length !== 4) {
    throw new Error('LM attachments out of order: the landing site must be index 4');
  }
  lmBinding.attachments.push({ parent: surface.site, rest: { pos: [0, 0, 0], rot: [0, 0, 0] } });

  // Chapter 10: the Earth coming up, the plasma, the Pacific.
  const reentry = createReentry({
    vehicleFrame: frames.vehicleFrame,
    cmFlight: { group: vehicle.groups['CM-flight']!, state: vehicle.parts['CM-flight']! },
    renderer,
    tier: detectQualityTier(),
  });

  const parts: Record<string, PartState> = {
    ...vehicle.parts,
    pad: pad.state,
    spacecraft: system.marker,
    'lunar-surface': surface.state,
    ocean: reentry.state,
  };
  const rig = createCameraRig(camera);
  const effectsState = createEffectsState();
  if (storyConfig.enabled) {
    // Story mode opens in the Earth–Moon system (chapters/ch0-prologue.ts).
    // Set here as well as tweened, because at a cold load to the very top
    // nothing has rendered yet to put it there.
    effectsState.vehicleLod = 1;
    effectsState.stars = 1;
    effectsState.atmosphere = 0;
  }

  const timeline = createMasterTimeline(
    chapters,
    {
      parts,
      camera: rig.state,
      effects: effectsState,
      metAnchors: MET_ANCHORS.filter((a) => chapterIds.has(a.chapter)),
      initialViewpoint: storyConfig.enabled ? 'storyOpen' : 'pad',
    },
    '#scroll-track',
  );

  const windows = separationWindows(SEPARATIONS, timeline.met);
  const badge = createSlowMoBadge(windows);
  const callouts = createCalloutCard(CALLOUTS);
  // Story mode's layer is its own chunk: classic mode never downloads it, and
  // it keeps the main bundle under the per-asset ceiling.
  const storyLayer: StoryLayer | null = storyConfig.enabled
    ? (await import('./ui/story/layer')).createStoryLayer({
        timeline,
        camera,
        windows,
        sitePosition: system.sitePosition,
        callouts,
        trackVh,
        showStart: storyConfig.showStart,
      })
    : null;
  const releaseResize = preserveProgressAcrossResize();

  // Declared before the loop so the first animation frame can never observe it
  // in the temporal dead zone; the panel needs the loop to read stats from.
  let panel: DebugPanel | null = null;

  const loop = startLoop({
    renderer,
    scene,
    camera,
    update: () => {
      const progress = timeline.progress();
      const met = timeline.met.metAt(progress);
      setProgress(progress);
      // Derived part state — Eagle's height and attitude, the moonwalk — is
      // written before the reconciler reads it, exactly like a tween would be.
      surface.update(met);
      cast.update(met);
      reentry.update(met);
      reconcile();
      rig.apply(progress);
      frames.apply(effectsState.vehicleLod);
      effectsScene.apply(effectsState);
      system.apply(effectsState, rig.position, met);
      surface.apply(effectsState);
      reentry.apply(effectsState);
      applyClipPlanes(camera, surface.clipPlanes(camera) ?? reentry.clipPlanes(camera));
      vehicle.lunarModule.apply(effectsState, surface.flight.altitude);
      cast.apply(met);
      badge.update(progress);
      // In story mode the grown-up callouts sit behind the 🔭 toggle.
      if (!storyLayer || storyLayer.factsOn()) callouts.update(met);
      storyLayer?.update(progress, met, frames.isSystem(effectsState.vehicleLod));
      panel?.update();
    },
    afterRender: commitFrame,
  });

  panel = createDebugPanel(timeline, loop);
  const releaseDebugKeys = installDebugAPI({
    timeline,
    loop,
    scene,
    camera,
    rig,
    badge,
    callouts,
    story: storyLayer,
    surface,
    cast,
    reentry,
  });

  await Promise.all([engines.ready, system.ready]);

  // Warm every shader program now rather than on first sight. The terrain,
  // ocean, Earth-from-orbit, plasma and splash programs are heavy, and each
  // used to compile the first time its chapter came into view — a hitch in
  // the middle of a scroll. `compile` visits every material, visible or not,
  // under the vehicle frame's lighting, which is the lighting all of them are
  // drawn with. The loop is already rendering, so first paint does not wait.
  await renderer.compileAsync(scene, camera);
  document.body.dataset.ready = 'true';

  if (import.meta.hot) {
    // The scroll observer registers listeners, a ResizeObserver and several
    // internal timers. Without this they accumulate on every hot reload.
    import.meta.hot.dispose(() => {
      loop.stop();
      panel?.dispose();
      releaseResize();
      badge.dispose();
      callouts.dispose();
      storyLayer?.dispose();
      releaseDebugKeys?.();
      timeline.dispose();
      cast.dispose();
      reentry.dispose();
      surface.dispose();
      effectsScene.dispose();
      system.dispose();
      frames.dispose();
      pad.dispose();
      engines.dispose();
      vehicle.dispose();
      clearBindings();
      clearEffectsState();
      disposeRenderer();
      delete window.__apollo;
    });
  }
}

void boot();

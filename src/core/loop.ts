import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import type { FrameStats } from '../types';

/**
 * The render loop.
 *
 * Rendering runs on its own rAF loop rather than off an anime.js callback.
 * anime's `onRender` only fires when at least one child actually rendered a
 * value that frame, so hanging the renderer off it silently skips frames — and
 * it makes "is the loop alive?" (TC-P0-02) and "nothing moves while idle"
 * (TC-P1-16) much harder to reason about. One loop, always running, reading
 * whatever the timeline currently says.
 */

/** A frame longer than this is a dropped frame at 30 fps. */
const LONG_FRAME_MS = 33;
/** Rolling window for the fps median. */
const SAMPLE_SIZE = 120;

export interface LoopBundle {
  stats(): FrameStats;
  resetStats(): void;
  stop(): void;
}

export interface LoopOptions {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  /** Runs before each render: read the timeline, reconcile the scene. */
  update: () => void;
  /** Runs after each render: commit frame-over-frame derived values. */
  afterRender?: () => void;
}

export function startLoop({
  renderer,
  scene,
  camera,
  update,
  afterRender,
}: LoopOptions): LoopBundle {
  let frames = 0;
  let longFrames = 0;
  let last = performance.now();
  let running = true;
  let rafId = 0;
  let deltas: number[] = [];

  const tick = (now: number): void => {
    if (!running) return;
    rafId = requestAnimationFrame(tick);

    const delta = now - last;
    last = now;

    // Skip the first frame and any frame after a tab has been backgrounded —
    // a 4-second delta would poison the median.
    if (frames > 0 && delta < 1000) {
      deltas.push(delta);
      if (deltas.length > SAMPLE_SIZE) deltas.shift();
      if (delta > LONG_FRAME_MS) longFrames += 1;
    }

    update();
    renderer.render(scene, camera);
    afterRender?.();

    frames += 1;
  };

  rafId = requestAnimationFrame(tick);

  return {
    stats(): FrameStats {
      const info = renderer.info;
      return {
        fps: medianFps(deltas),
        frames,
        longFrames,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        jsHeapMB: readHeapMB(),
      };
    },
    resetStats(): void {
      deltas = [];
      frames = 0;
      longFrames = 0;
      last = performance.now();
    },
    stop(): void {
      running = false;
      cancelAnimationFrame(rafId);
    },
  };
}

function medianFps(deltas: number[]): number {
  if (deltas.length === 0) return 0;
  const sorted = [...deltas].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? 0);
  return median > 0 ? Math.round(1000 / median) : 0;
}

interface PerformanceWithMemory extends Performance {
  memory?: { usedJSHeapSize: number };
}

/** Chrome-only; reported as 0 elsewhere rather than failing. */
function readHeapMB(): number {
  const mem = (performance as PerformanceWithMemory).memory;
  if (!mem) return 0;
  return Math.round((mem.usedJSHeapSize / 1024 / 1024) * 10) / 10;
}

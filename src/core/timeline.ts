import { createTimeline, onScroll } from 'animejs';
import { viewpoint } from '../data/cameras';
import type {
  CameraState,
  ChapterDef,
  ChapterPosition,
  EffectsState,
  MetMapper,
  PartState,
} from '../types';
import { createCameraTrack } from './camera';
import { createMetMap, resolveAnchors, type ChapterAnchor } from './met';
import { clamp01, scrollToProgress } from './progress';
import { createPartsAccessor } from './reconcile';

/**
 * The master timeline and its scroll binding.
 *
 * Timing model: the master runs for a fixed synthetic duration, partitioned
 * between chapters by weight. Nothing outside this module needs to know about
 * timeline-ms — everything else speaks in progress 0..1 or in mission time.
 */
export const MASTER_DURATION_MS = 100_000;

/**
 * Shared tween defaults for the master timeline and every chapter.
 *
 * `composition: 'none'` is load-bearing, not a micro-optimisation. anime's
 * default composition mode is 'replace': creating a second animation on the
 * same property of the same target cancels the first. Because chapters are
 * built as separate nested timelines that all animate the same shared state
 * objects, the default silently cancels an earlier chapter's tween as soon as a
 * later chapter touches the same property — the part then freezes at a stale
 * value while everything else keeps moving, and which value you get depends on
 * the route taken through the timeline.
 *
 * With composition off, each chapter's tween simply writes when it renders, and
 * the master timeline's ordering decides who wins where the ranges meet. That is
 * what lets chapters be developed in isolation (PRD line 163) while still
 * animating the same stack.
 */
export const TWEEN_DEFAULTS = { ease: 'linear', composition: 'none' } as const;

interface ChapterRuntime {
  id: string;
  index: number;
  /** Local progress 0..1 within the chapter; animated by its own sub-timeline. */
  local: { p: number };
  bounds: [number, number];
}

export interface TimelineDeps {
  parts: Record<string, PartState>;
  camera: CameraState;
  effects: EffectsState;
  /** Anchors placed per chapter; resolved against this registry's weights. */
  metAnchors: readonly ChapterAnchor[];
  /** Viewpoint the camera starts from, before any chapter moves it. */
  initialViewpoint: string;
}

export interface TimelineBundle {
  progress(): number;
  /** True while the timeline is being scrubbed backward. */
  backwards(): boolean;
  chapterBounds(): Record<string, [number, number]>;
  chapterAt(progress: number): ChapterPosition;
  met: MetMapper;
  seek(progress: number): void;
  dispose(): void;
}

export function createMasterTimeline(
  chapters: ChapterDef[],
  deps: TimelineDeps,
  scrollTarget: string,
): TimelineBundle {
  const totalWeight = chapters.reduce((sum, c) => sum + c.weight, 0);
  const met = createMetMap(resolveAnchors(chapters, deps.metAnchors));
  const parts = createPartsAccessor(deps.parts);
  const cameraTrack = createCameraTrack(deps.camera, viewpoint(deps.initialViewpoint));

  // The observer is created separately from the timeline so it can be reverted
  // on hot reload. Skipping that leaks scroll listeners, a ResizeObserver and
  // several internal timers per container.
  const observer = onScroll({
    target: scrollTarget,
    axis: 'y',
    // Threshold order is '<container> <target>'. The track spans the whole
    // document, so progress 0 is "viewport top meets track top" (scrollY 0) and
    // progress 1 is "viewport bottom meets track bottom" (scrollY max).
    enter: 'top top',
    leave: 'bottom bottom',
    // `true` is the exact 1:1 scrub with no smoothing. Note that `0` would NOT
    // mean "no smoothing" — it is falsy and disables synchronisation entirely,
    // leaving the timeline unlinked. Smoothing is a Phase 5 pacing decision;
    // TC-P0-03 asserts progress tracks scroll within 1%, so it stays off here.
    sync: true,
  });

  const master = createTimeline({
    autoplay: observer,
    defaults: TWEEN_DEFAULTS,
  });

  const runtimes: ChapterRuntime[] = [];
  let cursorMs = 0;

  chapters.forEach((chapter, index) => {
    // The last chapter takes whatever is left, so the page ends at exactly
    // progress 1 however the weights divide — with eight chapters the sum of
    // the shares otherwise lands at 1.0000000000000002.
    const duration =
      index === chapters.length - 1
        ? MASTER_DURATION_MS - cursorMs
        : (MASTER_DURATION_MS * chapter.weight) / totalWeight;
    const offset = cursorMs;

    const local = { p: 0 };
    const child = createTimeline({ autoplay: false, defaults: TWEEN_DEFAULTS });

    // Pins the child's exact duration (sync() reads child.duration) and gives
    // the chapter a local 0..1 progress value for free.
    child.add(local, { p: 1, duration, ease: 'linear' }, 0);

    /**
     * Chapter-local position, in ms, of a mission time.
     *
     * Guarded, because the failure it prevents is genuinely nasty. A chapter
     * that places a tween outside its own slot gets a negative or overlong
     * position; anime accepts it, and the tween then renders *partially
     * advanced* whenever the chapter is rendered at its own time zero. The
     * visible symptom is a value that is right on first arrival and subtly
     * wrong on every revisit — which reads like a determinism bug in the
     * reconciler rather than a chapter that reached past its boundary.
     */
    const msAt = (metSeconds: number): number => {
      const ms = met.progressAtMet(metSeconds) * MASTER_DURATION_MS - offset;
      const slack = 1e-6;
      if (ms < -slack || ms > duration + slack) {
        throw new Error(
          `Chapter '${chapter.id}' placed an event at MET ${metSeconds}, which is ` +
            `${ms.toFixed(1)}ms into a chapter that spans 0..${duration.toFixed(1)}ms. ` +
            `Move the event, or move the chapter boundary in data/mission.ts.`,
        );
      }
      return Math.min(Math.max(ms, 0), duration);
    };

    chapter.build({
      duration,
      offset,
      parts,
      camera: deps.camera,
      cameraTo: (key, positionMs, durationMs, ease) =>
        cameraTrack.easeTo(child, viewpoint(key), positionMs, durationMs, ease),
      effects: deps.effects,
      met,
      msAt,
      tl: child,
    });

    // A tween reaching past the chapter's slot would silently extend the
    // child's duration and shift every chapter after it.
    if (Math.abs(child.duration - duration) > 1) {
      throw new Error(
        `Chapter '${chapter.id}' built ${child.duration.toFixed(1)}ms of animation ` +
          `for a ${duration.toFixed(1)}ms slot. A tween is reaching past its chapter.`,
      );
    }

    master.label(chapter.id).sync(child);

    runtimes.push({
      id: chapter.id,
      index,
      local,
      bounds: [offset / MASTER_DURATION_MS, (offset + duration) / MASTER_DURATION_MS],
    });

    cursorMs += duration;
  });

  const bounds: Record<string, [number, number]> = {};
  for (const r of runtimes) bounds[r.id] = r.bounds;

  return {
    progress: () => clamp01(master.progress),
    backwards: () => Boolean(master.backwards),
    chapterBounds: () => structuredClone(bounds),
    met,

    chapterAt(progress: number): ChapterPosition {
      const p = clamp01(progress);
      // Last chapter wins at exactly 1 so progress 1 never falls through.
      const found =
        runtimes.find((r) => p >= r.bounds[0] && p < r.bounds[1]) ?? runtimes[runtimes.length - 1];
      if (!found) return { id: 'none', index: -1, localProgress: 0 };
      return { id: found.id, index: found.index, localProgress: clamp01(found.local.p) };
    },

    /**
     * Sets SCROLL position, not timeline time.
     *
     * Seeking the timeline directly does not survive: while the target is in
     * view the observer unconditionally re-seeks the linked timeline on the next
     * scroll frame, so a direct seek would be silently clobbered. Driving scroll
     * instead keeps one source of truth, and makes TC-P0-05 — slider and scroll
     * produce identical state — true by construction rather than by coincidence.
     */
    seek(progress: number): void {
      scrollToProgress(progress);
    },

    dispose(): void {
      observer.revert();
      master.revert();
    },
  };
}

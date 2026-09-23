import type { MetMapper } from '../types';
import { clamp01 } from './progress';

/**
 * Mission Elapsed Time ↔ scroll progress.
 *
 * Separations are "played in slow motion" (PRD line 90), so scroll distance
 * cannot be proportional to mission time: the six seconds around S-IC
 * separation deserve more of the page than the six minutes of S-II burn that
 * follow. The mapping is therefore piecewise linear between declared anchors,
 * stretching around events and compressing across the quiet stretches.
 *
 * Two things fall out of having a real time model rather than hand-tuned
 * fractions. TC-P1-07 — "the interstage fires about 30 s after S-IC
 * separation" — becomes an arithmetic assertion instead of a judgement call.
 * And Phase 5's mission clock (FR-3) is already built.
 */

export interface MetAnchor {
  /** Global timeline progress, 0..1. */
  progress: number;
  /** Mission elapsed time in seconds. Negative before liftoff. */
  met: number;
}

/**
 * An anchor placed within one chapter rather than on the whole page.
 *
 * Global progress used to be written by hand, which meant adding a chapter
 * rescaled every anchor after it — and chapter boundaries had to be spelled as
 * exact fractions like `10/30`, because a decimal approximation landed a hair on
 * the wrong side and the `msAt` guard rejected it. Placing anchors by chapter
 * and resolving them from the same weights the timeline uses removes both
 * problems: `at: 1` is the chapter's end by construction.
 */
export interface ChapterAnchor {
  /** Chapter id, as in chapters/registry.ts. */
  chapter: string;
  /** Position within that chapter, 0..1. */
  at: number;
  /** Mission elapsed time in seconds. */
  met: number;
}

/**
 * Turns chapter-local anchors into global ones.
 *
 * The arithmetic mirrors core/timeline.ts exactly — cumulative weight over total
 * weight — so an anchor at a chapter's `at: 1` resolves to the same progress
 * value the timeline uses for that chapter's end.
 */
export function resolveAnchors(
  chapters: readonly { id: string; weight: number }[],
  anchors: readonly ChapterAnchor[],
): MetAnchor[] {
  const total = chapters.reduce((sum, c) => sum + c.weight, 0);
  const bounds = new Map<string, [number, number]>();
  let cursor = 0;
  for (const c of chapters) {
    const span = c.weight / total;
    bounds.set(c.id, [cursor, cursor + span]);
    cursor += span;
  }

  return anchors.map((anchor) => {
    const b = bounds.get(anchor.chapter);
    if (!b) {
      throw new Error(
        `MET anchor names chapter '${anchor.chapter}', which is not in the registry. ` +
          `Known: ${[...bounds.keys()].join(', ')}`,
      );
    }
    if (anchor.at < 0 || anchor.at > 1) {
      throw new Error(`MET anchor in '${anchor.chapter}' has at=${anchor.at}; it must be 0..1.`);
    }
    // Endpoints are taken verbatim rather than interpolated, so a boundary
    // anchor lands on exactly the value the timeline computes for it.
    const progress = anchor.at === 0 ? b[0] : anchor.at === 1 ? b[1] : b[0] + anchor.at * (b[1] - b[0]);
    return { progress: Math.min(progress, 1), met: anchor.met };
  });
}

export function createMetMap(anchors: MetAnchor[]): MetMapper {
  if (anchors.length < 2) {
    throw new Error('MET map needs at least two anchors.');
  }
  for (let i = 1; i < anchors.length; i += 1) {
    const prev = anchors[i - 1]!;
    const next = anchors[i]!;
    if (next.progress <= prev.progress) {
      throw new Error(
        `MET anchors must increase in progress: ${prev.progress} then ${next.progress}`,
      );
    }
    if (next.met <= prev.met) {
      throw new Error(`MET anchors must increase in met: ${prev.met} then ${next.met}`);
    }
  }

  const first = anchors[0]!;
  const last = anchors[anchors.length - 1]!;

  return {
    metAt(progress: number): number {
      const p = clamp01(progress);
      if (p <= first.progress) return first.met;
      if (p >= last.progress) return last.met;
      for (let i = 1; i < anchors.length; i += 1) {
        const a = anchors[i - 1]!;
        const b = anchors[i]!;
        if (p <= b.progress) {
          const t = (p - a.progress) / (b.progress - a.progress);
          return a.met + t * (b.met - a.met);
        }
      }
      return last.met;
    },

    progressAtMet(met: number): number {
      if (met <= first.met) return first.progress;
      if (met >= last.met) return last.progress;
      for (let i = 1; i < anchors.length; i += 1) {
        const a = anchors[i - 1]!;
        const b = anchors[i]!;
        if (met <= b.met) {
          const t = (met - a.met) / (b.met - a.met);
          return a.progress + t * (b.progress - a.progress);
        }
      }
      return last.progress;
    },
  };
}

/** Formats MET as T+HHH:MM:SS (or T-MM:SS before liftoff). Used from Phase 5. */
export function formatMet(seconds: number): string {
  const sign = seconds < 0 ? '-' : '+';
  const s = Math.floor(Math.abs(seconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `T${sign}${hh}:${pad(mm)}:${pad(ss)}`;
}

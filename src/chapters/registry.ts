import type { ChapterDef } from '../types';
import { prologue } from './ch0-prologue';
import { epilogue } from './ch11-epilogue';
import { launch } from './ch1-launch';
import { staging } from './ch2-staging';
import { earthOrbit } from './ch3-earth-orbit';
import { docking } from './ch4-docking';
import { coast } from './ch5-coast';
import { lunarOrbit } from './ch6-lunar-orbit';
import { descent } from './ch7-descent';
import { moonwalk } from './ch8-moonwalk';
import { ascent } from './ch9-ascent';
import { returnHome } from './ch10-return';

/**
 * The ordered chapter list.
 *
 * The master timeline is assembled from this array alone: durations come from
 * the weights, and bounds are derived by accumulation. Adding, removing or
 * reordering a chapter is an edit to this list and nothing else.
 *
 * Weights total 64: the mission's 54, plus the story-mode prologue (4) and
 * epilogue (6), which bracket it. MET anchors in data/mission.ts are placed per chapter and
 * resolved against these same weights, so a weight can change without touching
 * any other chapter's anchors. Chapter boundaries must still fall between
 * separation windows — one inside a window puts that event's tweens at a
 * negative position in the later chapter, which the `msAt` guard in
 * core/timeline.ts rejects outright.
 *
 * The coast is deliberately the shortest chapter despite covering seventy-one
 * of the mission's first eighty hours (TC-P2-09); the descent, twelve minutes
 * of powered flight, is the joint longest with staging.
 */
export const chapters: ChapterDef[] = [
  prologue,
  launch,
  staging,
  earthOrbit,
  docking,
  coast,
  lunarOrbit,
  descent,
  moonwalk,
  ascent,
  returnHome,
  epilogue,
];

/** Chapters that exist only in story mode (core/storyMode.ts). */
export const STORY_ONLY_CHAPTERS: ReadonlySet<string> = new Set([prologue.id, epilogue.id]);

/** The mission alone, as Phases 0–4 built it: classic mode, `?story=0`. */
export const missionChapters: ChapterDef[] = chapters.filter((c) => !STORY_ONLY_CHAPTERS.has(c.id));

export function chaptersFor(story: boolean): ChapterDef[] {
  return story ? chapters : missionChapters;
}

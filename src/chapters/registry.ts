import type { ChapterDef } from '../types';
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
 * Weights total 54. MET anchors in data/mission.ts are placed per chapter and
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
];

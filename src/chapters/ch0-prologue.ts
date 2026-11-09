import { CHAPTER_BOUNDARIES, STORY_MET } from '../data/mission';
import type { ChapterDef } from '../types';

/**
 * Prologue — The Lonely Moon (story Scene 1, and the opening of Scene 2).
 *
 * Story mode only: nothing here is flight data. The page opens in the
 * Earth–Moon system, where the Earth and a grey, lonely Moon talk; then it cuts
 * down to the Saturn V on the pad for Earth's "my humans built a giant rocket",
 * and hands chapter 1 exactly the frame it has always started from — the pad
 * viewpoint, metre scale, no stars — at ignition.
 *
 * The opening state (system frame, stars on, no sky) is also set as the effects'
 * initial value in main.ts, because at a cold load to the very top nothing has
 * rendered yet. The tweens here are what restore it on a scroll back.
 */
export const prologue: ChapterDef = {
  id: 'prologue',
  weight: 4,
  build(ctx) {
    const { tl, effects, msAt } = ctx;
    const between = (a: number, b: number): number => msAt(b) - msAt(a);
    const start = STORY_MET.prologueStart;
    const cut = STORY_MET.prologueCut;

    // A slow push in on the Moon while the two of them talk, so the frame is
    // alive under the dialogue without pulling focus from it.
    ctx.cameraTo('storyOpenClose', msAt(start + 60), between(start + 60, cut - 40));

    // ── The cut down to the pad ───────────────────────────────────────────
    // Paired with the camera, as every scale switch is (see core/frames.ts).
    tl.add(effects, { vehicleLod: [1, 0], duration: 1, ease: 'linear' }, msAt(cut));
    tl.add(effects, { stars: [1, 0], duration: 1, ease: 'linear' }, msAt(cut));
    // Out of the vacuum and under a sky again, as chapter 1 expects.
    tl.add(effects, { atmosphere: [0, 1], duration: 1, ease: 'linear' }, msAt(cut));
    ctx.cameraTo('full', msAt(cut), 1);

    // On the pad: the whole stack, then settling on chapter 1's opening frame
    // before the engines light.
    ctx.cameraTo('pad', msAt(cut + 30), between(cut + 30, CHAPTER_BOUNDARIES.prologueToLaunch - 20));
  },
};

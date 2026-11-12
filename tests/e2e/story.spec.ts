import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { MONUMENTS } from '../../src/data/monuments';
import { MET, STORY_MET } from '../../src/data/mission';
import { massAt } from '../../src/data/mass';
import { STORY_LINES } from '../../src/data/story';
import { STORY_URL, bootPage, collectConsoleProblems, settle } from './helpers';

/**
 * Story mode — "The Moon Project" (TC-PS-xx in testcase.md).
 *
 * Each test seeks once from a fresh load. Under SwiftShader the lunar surface
 * renders at about one frame a second, and anime's scroll sync does not keep
 * up with a second seek after it — so specs that need the surface or later
 * start from a fresh page rather than scrolling through.
 */

async function seekMet(page: Page, met: number): Promise<void> {
  await page.evaluate(async (m) => {
    const a = window.__apollo!;
    await a.seek(a.progressAtMet(m));
  }, met);
  await settle(page);
}

const story = (page: Page) => page.evaluate(() => window.__apollo!.getStory()!);
const mid = (id: string): number => {
  const line = STORY_LINES.find((l) => l.id === id)!;
  return (line.metStart + line.metEnd) / 2;
};

test.beforeEach(async ({ page }) => {
  // Every test starts with an empty album and no gift.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('apollo11.keep')) localStorage.clear();
  });
});

test('TC-PS-01 story mode opens on the Earth and the lonely Moon', async ({ page }) => {
  await bootPage(page, STORY_URL);
  expect(await page.evaluate(() => document.body.dataset.mode)).toBe('story');
  expect((await page.evaluate(() => window.__apollo!.getChapter())).id).toBe('prologue');
  const fx = await page.evaluate(() => window.__apollo!.getEffects());
  expect(fx.vehicleLod).toBeGreaterThanOrEqual(0.5);
  expect(fx.atmosphere).toBe(0);
  expect(fx.moonWarmth).toBe(0);
  const sizes = await page.evaluate(() => window.__apollo!.getBodySizes());
  expect(sizes.earth).toBeGreaterThan(0);
  expect(sizes.moon).toBeGreaterThan(sizes.earth);
});

test('TC-PS-02 chapter 1 still starts on the pad at ignition', async ({ page }) => {
  await bootPage(page, STORY_URL);
  await seekMet(page, MET.ignition + 0.5);
  expect((await page.evaluate(() => window.__apollo!.getChapter())).id).toBe('launch');
  const fx = await page.evaluate(() => window.__apollo!.getEffects());
  expect(fx.vehicleLod).toBe(0);
  expect(fx.atmosphere).toBe(1);
  expect(fx.stars).toBe(0);
});

for (const id of ['s1-02', 's2-04', 's3-05', 's4-03', 's6-06', 's7-07']) {
  test(`TC-PS-03 line ${id} shows with the right speaker and text`, async ({ page }) => {
    await bootPage(page, STORY_URL);
    await seekMet(page, mid(id));
    const line = STORY_LINES.find((l) => l.id === id)!;
    expect((await story(page)).lineId).toBe(id);
    const bubble = page.locator('#story-bubble');
    await expect(bubble).toHaveAttribute('data-line-id', id);
    await expect(bubble).toHaveAttribute('data-speaker', line.speaker);
    await expect(bubble.locator('.story-line')).toHaveText(line.text);
  });
}

test('TC-PS-04 scrolling back swaps the line, and gaps clear it', async ({ page }) => {
  await bootPage(page, STORY_URL);
  await seekMet(page, mid('s2-02'));
  expect((await story(page)).lineId).toBe('s2-02');
  await seekMet(page, mid('s1-03'));
  expect((await story(page)).lineId).toBe('s1-03');
  // Between "What did they leave behind?" and the first staging line.
  await seekMet(page, 60);
  expect((await story(page)).lineId).toBeNull();
  await expect(page.locator('#story-bubble')).toHaveCSS('opacity', '0');
});

test('TC-PS-05 the album collects, keeps cards on scroll-back, and persists', async ({ page }) => {
  await bootPage(page, STORY_URL);
  expect((await story(page)).album.collected).toEqual([]);

  await seekMet(page, MET.sepLES + 20);
  expect((await story(page)).album.collected).toEqual(['s-ic', 'interstage', 'les']);
  await expect(page.locator('#album-button')).toContainText('3/14');

  await seekMet(page, STORY_MET.prologueStart + 10);
  expect((await story(page)).album.collected).toEqual(['s-ic', 'interstage', 'les']);

  await page.evaluate(() => sessionStorage.setItem('apollo11.keep', '1'));
  await bootPage(page, STORY_URL);
  expect((await story(page)).album.collected).toEqual(['s-ic', 'interstage', 'les']);

  await page.evaluate(() => {
    sessionStorage.removeItem('apollo11.keep');
    localStorage.clear();
  });
  await bootPage(page, STORY_URL);
  expect((await story(page)).album.collected).toEqual([]);
});

test('TC-PS-06 "Let go!" appears before a separation and drops the piece', async ({ page }) => {
  await bootPage(page, STORY_URL);
  await seekMet(page, MET.sepSIC - 3.5);
  const s = await story(page);
  expect(s.letGo.monumentId).toBe('s-ic');
  const button = page.locator('#let-go');
  await expect(button).toBeVisible();
  await expect(button).toContainText('Let go of the First Stage');

  await button.click();
  await page.waitForFunction(() => window.__apollo!.getStory()!.album.collected.includes('s-ic'), null, {
    timeout: 20_000,
  });
  await page.waitForFunction(() => window.__apollo!.getSeparationWindow() === null, null, { timeout: 20_000 });
  expect(await page.evaluate(() => window.__apollo!.getMet())).toBeGreaterThan(MET.sepSIC);
  await expect(button).toBeHidden();
});

test('TC-PS-07 the ship gets lighter, with a step at every separation', () => {
  const samples = [MET.liftoff, MET.sepSIC + 5, MET.sepSII + 5, MET.tliCutoff, MET.sepLMExtraction + 5, MET.loiCutoff, MET.sepSM + 5, MET.splashdown];
  const tonnes = samples.map((m) => massAt(m).tonnes);
  for (let i = 1; i < tonnes.length; i += 1) expect(tonnes[i]!).toBeLessThan(tonnes[i - 1]!);
  for (const met of [MET.sepSIC, MET.sepInterstage, MET.sepLES, MET.sepSII, MET.sepLMExtraction, MET.sepSM]) {
    expect(massAt(met - 1.5).tonnes - massAt(met + 1.5).tonnes, `step at ${met}`).toBeGreaterThan(1);
  }
  expect(massAt(STORY_MET.prologueStart).visible).toBe(false);
  expect(massAt(MET.sepUndock + 600).visible).toBe(false);
  expect(massAt(MET.liftoff).visible).toBe(true);
});

test('TC-PS-07 the weight meter shows on the pad and reads in elephants', async ({ page }) => {
  await bootPage(page, STORY_URL);
  await seekMet(page, -200);
  const meter = page.locator('#weight-meter');
  await expect(meter).toHaveCSS('opacity', '1');
  await expect(meter.locator('.weight-tonnes')).toHaveText('2,938 t');
  await expect(meter.locator('.weight-elephants')).toContainText('490');
});

test('TC-PS-08 the epilogue shows the real photo, then the full map', async ({ browser }) => {
  // Two fresh loads straight to the epilogue; generous under SwiftShader.
  test.setTimeout(150_000);
  const photo = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await bootPage(photo, STORY_URL);
  await seekMet(photo, STORY_MET.lroIn + 60);
  expect((await story(photo)).epilogue).toBe('photo');
  await expect(photo.locator('#story-lro img')).toBeVisible();
  await photo.waitForFunction(() => (document.querySelector('#story-lro img') as HTMLImageElement).naturalWidth > 0);
  expect(await photo.evaluate(() => window.__apollo!.hasNaN())).toBe(false);
  await photo.close();

  const map = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await bootPage(map, STORY_URL);
  await seekMet(map, STORY_MET.mapIn + 60);
  expect((await story(map)).epilogue).toBe('map');
  expect((await story(map)).album.collected).toHaveLength(MONUMENTS.length);
  const pins = map.locator('#story-map .rm-pin');
  const lit = map.locator('#story-map .rm-pin[data-lit="true"]');
  expect(await lit.count()).toBe(await pins.count());
  await map.close();
});

test('TC-PS-08 a gift chosen in the epilogue is kept', async ({ page }) => {
  await bootPage(page, STORY_URL);
  await seekMet(page, STORY_MET.leaveIn + 40);
  expect((await story(page)).epilogue).toBe('leave');
  await page.locator('#story-leave [data-gift="🌻"]').click();
  expect((await story(page)).gift).toBe('🌻');
});

test('TC-PS-09 reduced motion: cards do not fly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await bootPage(page, STORY_URL);
  await seekMet(page, MET.sepSIC + 10);
  expect((await story(page)).album.collected).toContain('s-ic');
  expect(await page.locator('.album-fly').count()).toBe(0);
});

test('TC-PS-10 on a phone the bubble docks and nothing scrolls sideways', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await bootPage(page, STORY_URL);
  await seekMet(page, mid('s1-02'));
  expect((await story(page)).placement).toBe('docked');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const box = await page.locator('#story-bubble').boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.close();
});

test('TC-PS-10 on a laptop the bubble sits beside the speaking body', async ({ page }) => {
  await bootPage(page, STORY_URL);
  await seekMet(page, mid('s1-02'));
  expect((await story(page)).placement).toBe('anchored');
});

test('TC-PS-11 sound on: the line plays its recording, clean console', async ({ page }) => {
  const problems = collectConsoleProblems(page);
  await bootPage(page, STORY_URL);
  await page.locator('#story-sound').click();
  await seekMet(page, mid('s1-03'));
  const s = await story(page);
  expect(s.narration.enabled).toBe(true);
  expect(s.narration.available).toBe(true);
  expect(s.narration.voice).toBe('recording');
  expect(s.lineId).toBe('s1-03');
  // WebGL driver chatter from SwiftShader is not ours.
  expect(problems.filter((p) => !p.includes('GL Driver') && !p.includes('KHR_parallel'))).toEqual([]);
});

test('TC-PS-12 the start screen starts the story', async ({ page }) => {
  await bootPage(page, `${STORY_URL}&start=1`);
  const start = page.locator('#story-start');
  await expect(start).toBeVisible();
  await page.locator('[data-start="quiet"]').click();
  await expect(start).toHaveCount(0);
  const s = await story(page);
  expect(s.playing).toBe(true);
  expect(s.narration.enabled).toBe(false);
});

test('TC-PS-13 classic mode has no story layer and no story chapters', async ({ page }) => {
  await bootPage(page, '/?debug=1&story=0');
  expect(await page.evaluate(() => window.__apollo!.getStory())).toBeNull();
  expect(await page.locator('#story-bubble').count()).toBe(0);
  const bounds = await page.evaluate(() => window.__apollo!.chapterBounds());
  expect(bounds.prologue).toBeUndefined();
  expect(bounds.epilogue).toBeUndefined();
  expect((await page.evaluate(() => window.__apollo!.getChapter())).id).toBe('launch');
});

test('TC-PS-14 the prologue round-trips exactly', async ({ page }) => {
  await bootPage(page, STORY_URL);
  await seekMet(page, -1000);
  const before = await page.evaluate(() => window.__apollo!.dumpState().nodes);
  const fxBefore = await page.evaluate(() => window.__apollo!.getEffects());
  await seekMet(page, MET.sepSIC + 20);
  await seekMet(page, -1000);
  expect(await page.evaluate(() => window.__apollo!.dumpState().nodes)).toEqual(before);
  const fxAfter = await page.evaluate(() => window.__apollo!.getEffects());
  expect(fxAfter.vehicleLod).toBe(fxBefore.vehicleLod);
  expect(fxAfter.stars).toBe(fxBefore.stars);
  expect(fxAfter.atmosphere).toBe(fxBefore.atmosphere);
});

test('TC-PS-15 the script and the story data use the same line ids', () => {
  const script = readFileSync(resolve(process.cwd(), 'docs/story.md'), 'utf8');
  const scriptIds = [...script.matchAll(/^\| (s\d-\d\d[a-z]?) \|/gm)].map((m) => m[1]);
  expect(scriptIds).toEqual(STORY_LINES.map((l) => l.id));
  // The script uses straight quotes, the page typographic ones.
  const plain = (t: string): string => t.replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
  const normalisedScript = plain(script);
  for (const line of STORY_LINES) {
    expect(normalisedScript, line.id).toContain(plain(line.text));
  }
});

test('TC-PS-19 the real mission audio sits at its real moments, recorded and captioned', async ({ page }) => {
  const mission = STORY_LINES.filter((l) => l.speaker === 'mission');
  expect(mission.map((l) => l.id)).toEqual(['s2-03b', 's2-03c', 's4-04b', 's5-00']);
  expect(STORY_LINES.find((l) => l.id === 's2-03c')!.metStart).toBe(MET.liftoff);
  const landed = STORY_LINES.find((l) => l.id === 's4-04b')!;
  expect(MET.eagleLanded).toBeGreaterThanOrEqual(landed.metStart);
  expect(MET.eagleLanded).toBeLessThan(landed.metEnd);
  const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'public/audio/manifest.json'), 'utf8'));
  for (const l of mission) {
    expect(manifest.lines, l.id).toContain(l.id);
    expect(manifest.timings, l.id).toContain(l.id);
  }

  await bootPage(page, STORY_URL);
  await seekMet(page, mid('s4-04b'));
  const s = await story(page);
  expect(s.lineId).toBe('s4-04b');
  expect(s.placement).toBe('docked');
  await expect(page.locator('.story-name')).toContainText('real NASA audio');
});

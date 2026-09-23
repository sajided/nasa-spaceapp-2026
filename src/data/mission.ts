import type { ChapterAnchor } from '../core/met';

/**
 * Mission timing for all ten chapters.
 *
 * Working values from the Apollo 11 flight record; the authoritative check is
 * TC-P5-17 against the NASA Apollo 11 Flight Journal. They match the PRD's
 * chapter table: staging T+2:42 to T+9:10, TLI at T+2:44, docking T+3:15 to
 * T+4:17, lunar orbit insertion at T+75:50.
 */

/**
 * Mission times at which one chapter hands over to the next.
 *
 * These sit BETWEEN separation windows, never inside one, and that is
 * load-bearing: a separation whose window straddles a boundary has its tweens
 * placed at a negative position inside the later chapter, where they render
 * partially advanced whenever that chapter is touched. The symptom is a value
 * that is correct on first arrival and subtly wrong on every revisit. The
 * `msAt()` guard in core/timeline.ts turns that into a build-time error.
 */
export const CHAPTER_BOUNDARIES = {
  launchToStaging: 155,
  stagingToOrbit: 680,
  orbitToDocking: 10_800,
  dockingToCoast: 15_600,
  coastToLunarOrbit: 271_500,
  /**
   * Chapter 6 ends where it always has, on the second lunar orbit insertion
   * burn; chapter 7 picks up from there and compresses the twenty hours of
   * checkout before undocking.
   */
  lunarOrbitToDescent: 80 * 3600 + 11 * 60 + 36,
  /**
   * Between the landing and the hatch opening: six and a half hours on the
   * surface that the page gives only a sliver.
   */
  descentToMoonwalk: 109 * 3600,
  /** Chapter 8 ends as the hatch closes; chapter 9 picks up from there. */
  moonwalkToAscent: 111 * 3600 + 39 * 60 + 13,
  /** Between the ascent stage jettison and the scale switch for the way home. */
  ascentToReturn: 131 * 3600,
} as const;

/** Kept for the Phase 1 name; chapter 1 still hands over here. */
export const CHAPTER_BOUNDARY_MET = CHAPTER_BOUNDARIES.launchToStaging;

const H = 3600;

export const MET = {
  ignition: -8,
  liftoff: 0,
  /** S-IC centre engine cuts early to hold acceleration under 4 g. */
  centreEngineCutoff: 135,
  sepSIC: 162,
  s2Ignition: 163,
  sepInterstage: 192,
  sepLES: 198,
  s2Cutoff: 548,
  sepSII: 549,
  s4bIgnition: 552,
  orbitInsertion: 699,

  // ── Chapter 3: Earth orbit and trans-lunar injection ──────────────────
  /** One and a half revolutions of the parking orbit before the burn. */
  tliIgnition: 2 * H + 44 * 60 + 16,
  tliCutoff: 2 * H + 50 * 60 + 3,

  // ── Chapter 4: transposition, docking and extraction ──────────────────
  sepSLA: 3 * H + 16 * 60 + 56,
  sepCSM: 3 * H + 17 * 60 + 4,
  docking: 3 * H + 24 * 60 + 3,
  sepLMExtraction: 4 * H + 17 * 60 + 3,

  // ── Chapter 5: the coast ──────────────────────────────────────────────
  /** The "barbecue roll" that kept the sun from cooking one side. */
  thermalRoll: 5 * H,
  /** The only midcourse correction Apollo 11 needed. */
  midcourseCorrection: 26 * H + 44 * 60 + 58,
  /** Far enough out that Earth is a thumbnail. */
  earthThumbnail: 50 * H,

  // ── Chapter 6: lunar orbit insertion ──────────────────────────────────
  loiIgnition: 75 * H + 49 * 60 + 50,
  loiCutoff: 75 * H + 55 * 60 + 44,
  loi2: 80 * H + 11 * 60 + 36,

  // ── Chapter 7: undocking, powered descent and landing ─────────────────
  /** Landing gear deployed during LM activation, before undocking. */
  lmLegsDeployed: 98 * H,
  /** SEP-8. Eagle and Columbia part company. */
  sepUndock: 100 * H + 12 * 60,
  /** Columbia's burn to open the distance to a safe separation. */
  csmSepBurn: 100 * H + 39 * 60 + 53,
  /** Descent orbit insertion: lowers the low point of Eagle's orbit to 15 km. */
  doi: 101 * H + 36 * 60 + 14,
  /** Powered descent initiation. The descent engine lights and stays lit. */
  pdi: 102 * H + 33 * 60 + 5,
  /** The first program alarm, then a second. */
  alarm1202a: 102 * H + 38 * 60 + 26,
  alarm1202b: 102 * H + 39 * 60 + 2,
  /** High gate: the pitch-over that shows the crew the landing site. */
  highGate: 102 * H + 41 * 60 + 32,
  alarm1201: 102 * H + 42 * 60 + 18,
  /** Armstrong switches to P66 and flies the last stretch by hand. */
  p66: 102 * H + 43 * 60 + 20,
  fuel60: 102 * H + 44 * 60 + 31,
  /** Aldrin: "picking up some dust." */
  dustStart: 102 * H + 44 * 60 + 35,
  fuel30: 102 * H + 45 * 60 + 2,
  /** "Contact light." */
  touchdown: 102 * H + 45 * 60 + 40,
  engineStop: 102 * H + 45 * 60 + 43,
  /** "Houston, Tranquility Base here. The Eagle has landed." */
  eagleLanded: 102 * H + 45 * 60 + 58,

  // ── Chapter 8: the moonwalk ────────────────────────────────────────────
  hatchOpen: 109 * H + 7 * 60 + 33,
  /** "That's one small step…" — 02:56:15 UTC on July 21. */
  firstStep: 109 * H + 24 * 60 + 15,
  aldrinOut: 109 * H + 43 * 60 + 16,
  flag: 110 * H + 9 * 60 + 43,
  /** Passive seismometer, then the laser ranging retro-reflector. */
  psep: 110 * H + 55 * 60,
  lrrr: 111 * H + 3 * 60,
  aldrinIn: 111 * H + 29 * 60 + 39,
  armstrongIn: 111 * H + 37 * 60 + 32,
  /** The hatch closes behind Armstrong. */
  hatchClose: 111 * H + 39 * 60 + 13,

  // ── Chapter 9: ascent, rendezvous and docking ──────────────────────────
  /** SEP-9. The ascent engine fires; the descent stage is the launch pad. */
  ascentLiftoff: 124 * H + 22 * 60 + 1,
  /** Ascent engine cutoff: Eagle in a 17 × 83 km orbit. */
  ascentInsertion: 124 * H + 29 * 60 + 15,
  /** Concentric sequence initiation, then terminal phase initiation. */
  csi: 125 * H + 19 * 60 + 35,
  tpi: 126 * H + 57 * 60,
  /** Columbia and Eagle dock again. */
  redock: 128 * H + 3 * 60,
  /** Armstrong and Aldrin back in Columbia with the samples; hatches closed. */
  crewTransferEnd: 129 * H + 50 * 60,
  /** SEP-10. The ascent stage is cast off to stay in lunar orbit. */
  sepAscentJettison: 130 * H + 9 * 60 + 31,

  // ── Chapter 10: the way home ───────────────────────────────────────────
  /** Trans-Earth injection, behind the Moon, two and a half minutes of SPS. */
  teiIgnition: 135 * H + 23 * 60 + 42,
  teiCutoff: 135 * H + 26 * 60 + 12,
  /** The only midcourse correction on the way home. */
  mcc5: 150 * H + 29 * 60 + 57,
  /** SEP-11. The Service Module is cast off; the CM turns heat shield first. */
  sepSM: 194 * H + 49 * 60 + 12,
  /** 400,000 ft: the top of the atmosphere, by definition. */
  entryInterface: 195 * H + 3 * 60 + 5,
  peakHeating: 195 * H + 5 * 60 + 30,
  /** Radio contact returns as the plasma thins. */
  blackoutEnd: 195 * H + 6 * 60 + 45,
  /** SEP-12: apex cover, drogues, then the three mains. */
  drogues: 195 * H + 12 * 60 + 6,
  mains: 195 * H + 13 * 60,
  /** July 24, 1969, 16:50:35 UTC. */
  splashdown: 195 * H + 18 * 60 + 35,
  /** The page ends here, with the capsule floating. */
  missionEnd: 195 * H + 21 * 60 + 5,
} as const;

/**
 * Progress ↔ MET anchors, placed per chapter.
 *
 * Read each row as "this far through this chapter, this much mission time has
 * passed". `at` is 0..1 within the named chapter; core/met.ts#resolveAnchors
 * turns it into page progress using the same weights as the timeline, so adding
 * a chapter never means rewriting the anchors of the others.
 *
 * Separations get wide, shallow bands — a lot of scroll for a few seconds — and
 * the long quiet stretches are compressed hard. The extremes are worth seeing
 * side by side: six seconds of S-IC separation take a sixth of the staging
 * chapter, while the seventy-one hours of trans-lunar coast take one short
 * chapter. That ratio is what the SLOW-MO badge is announcing.
 *
 * Chapter boundaries appear as `at: 1` of the chapter that ends there. A
 * boundary must fall between separation windows, never inside one — see
 * CHAPTER_BOUNDARIES.
 */
export const MET_ANCHORS: ChapterAnchor[] = [
  // ── Chapter 1 ──────────────────────────────────────────────────────────
  { chapter: 'launch', at: 0, met: MET.ignition },
  { chapter: 'launch', at: 0.1, met: MET.liftoff },
  { chapter: 'launch', at: 1, met: CHAPTER_BOUNDARIES.launchToStaging },

  // ── Chapter 2 ──────────────────────────────────────────────────────────
  // SEP-1, S-IC separation at 162.
  { chapter: 'staging', at: 0.042857, met: 159 },
  { chapter: 'staging', at: 0.214286, met: 165 },

  // SEP-2, interstage jettison at 192.
  { chapter: 'staging', at: 0.321429, met: 189 },
  { chapter: 'staging', at: 0.45, met: 194 },

  // SEP-3, escape tower at 198.
  { chapter: 'staging', at: 0.48, met: 196 },
  { chapter: 'staging', at: 0.621429, met: 200 },

  // The long S-II burn, heavily compressed.
  { chapter: 'staging', at: 0.771429, met: 546 },

  // SEP-4, S-IVB separation at 549.
  { chapter: 'staging', at: 0.942857, met: 552 },
  { chapter: 'staging', at: 1, met: CHAPTER_BOUNDARIES.stagingToOrbit },

  // ── Chapter 3 ──────────────────────────────────────────────────────────
  // Orbital insertion, then an hour and a half of parking orbit compressed
  // into a tenth of the chapter before the burn for the Moon.
  { chapter: 'earth-orbit', at: 0.07, met: MET.orbitInsertion },
  { chapter: 'earth-orbit', at: 0.64, met: MET.tliIgnition - 40 },
  { chapter: 'earth-orbit', at: 0.88, met: MET.tliCutoff },
  { chapter: 'earth-orbit', at: 1, met: CHAPTER_BOUNDARIES.orbitToDocking },

  // ── Chapter 4 ──────────────────────────────────────────────────────────
  // SEP-5 and SEP-6 are eight seconds apart in the real flight — the panels go
  // and the CSM pulls out almost together — so their windows are narrow and
  // butt up against each other with a second to spare.
  { chapter: 'docking', at: 0.15, met: MET.sepSLA - 3 },
  { chapter: 'docking', at: 0.375, met: MET.sepSLA + 3 },

  { chapter: 'docking', at: 0.425, met: MET.sepCSM - 4 },
  { chapter: 'docking', at: 0.65, met: MET.sepCSM + 4 },

  // Station-keeping and the approach to docking.
  { chapter: 'docking', at: 0.8, met: MET.docking },

  // SEP-7, extraction. The S-IVB is left behind.
  { chapter: 'docking', at: 0.825, met: MET.sepLMExtraction - 6 },
  { chapter: 'docking', at: 0.95, met: MET.sepLMExtraction + 6 },
  { chapter: 'docking', at: 1, met: CHAPTER_BOUNDARIES.dockingToCoast },

  // ── Chapter 5 ──────────────────────────────────────────────────────────
  // Seventy-one hours in one short chapter.
  { chapter: 'coast', at: 0.3, met: MET.thermalRoll },
  { chapter: 'coast', at: 0.675, met: MET.midcourseCorrection },
  { chapter: 'coast', at: 0.825, met: MET.earthThumbnail },
  { chapter: 'coast', at: 1, met: CHAPTER_BOUNDARIES.coastToLunarOrbit },

  // ── Chapter 6 ──────────────────────────────────────────────────────────
  { chapter: 'lunar-orbit', at: 0.28, met: MET.loiIgnition - 20 },
  { chapter: 'lunar-orbit', at: 0.7, met: MET.loiCutoff },
  { chapter: 'lunar-orbit', at: 1, met: CHAPTER_BOUNDARIES.lunarOrbitToDescent },

  // ── Chapter 7 ──────────────────────────────────────────────────────────
  // Twenty hours of checkout compressed to the first few percent; then the
  // undocking gets a wide slow-motion band, and powered descent — twelve
  // minutes — takes half the chapter. That is where the tension is.
  { chapter: 'descent', at: 0.04, met: MET.lmLegsDeployed - 1800 },
  { chapter: 'descent', at: 0.09, met: MET.lmLegsDeployed + 600 },
  { chapter: 'descent', at: 0.12, met: MET.sepUndock - 60 },
  // SEP-8, undocking at 100:12:00.
  { chapter: 'descent', at: 0.14, met: MET.sepUndock - 12 },
  { chapter: 'descent', at: 0.22, met: MET.sepUndock + 12 },
  { chapter: 'descent', at: 0.27, met: MET.csmSepBurn - 60 },
  { chapter: 'descent', at: 0.3, met: MET.csmSepBurn + 900 },
  { chapter: 'descent', at: 0.34, met: MET.doi - 300 },
  { chapter: 'descent', at: 0.37, met: MET.doi + 60 },
  { chapter: 'descent', at: 0.41, met: MET.pdi - 60 },
  { chapter: 'descent', at: 0.45, met: MET.pdi + 60 },
  { chapter: 'descent', at: 0.52, met: MET.alarm1202a - 20 },
  { chapter: 'descent', at: 0.58, met: MET.alarm1202b + 50 },
  { chapter: 'descent', at: 0.63, met: MET.highGate - 20 },
  { chapter: 'descent', at: 0.67, met: MET.highGate + 30 },
  { chapter: 'descent', at: 0.7, met: MET.alarm1201 + 30 },
  { chapter: 'descent', at: 0.73, met: MET.p66 },
  { chapter: 'descent', at: 0.78, met: MET.fuel60 },
  { chapter: 'descent', at: 0.8, met: MET.dustStart },
  { chapter: 'descent', at: 0.84, met: MET.fuel30 },
  { chapter: 'descent', at: 0.89, met: MET.touchdown },
  { chapter: 'descent', at: 0.905, met: MET.engineStop + 8 },
  // "The Eagle has landed" gets a hold of its own.
  { chapter: 'descent', at: 0.915, met: MET.eagleLanded },
  { chapter: 'descent', at: 0.965, met: MET.eagleLanded + 60 },
  { chapter: 'descent', at: 1, met: CHAPTER_BOUNDARIES.descentToMoonwalk },

  // ── Chapter 8 ──────────────────────────────────────────────────────────
  { chapter: 'moonwalk', at: 0.04, met: MET.hatchOpen },
  { chapter: 'moonwalk', at: 0.14, met: MET.firstStep - 165 },
  // The first step gets the widest band in the chapter.
  { chapter: 'moonwalk', at: 0.2, met: MET.firstStep - 30 },
  { chapter: 'moonwalk', at: 0.3, met: MET.firstStep + 60 },
  { chapter: 'moonwalk', at: 0.38, met: MET.aldrinOut - 256 },
  { chapter: 'moonwalk', at: 0.46, met: MET.aldrinOut + 60 },
  { chapter: 'moonwalk', at: 0.52, met: MET.flag - 343 },
  // ...and so does the flag.
  { chapter: 'moonwalk', at: 0.62, met: MET.flag + 300 },
  { chapter: 'moonwalk', at: 0.72, met: MET.lrrr - 1080 },
  { chapter: 'moonwalk', at: 0.8, met: MET.lrrr + 300 },
  { chapter: 'moonwalk', at: 0.9, met: MET.aldrinIn },
  { chapter: 'moonwalk', at: 1, met: CHAPTER_BOUNDARIES.moonwalkToAscent },

  // ── Chapter 9 ──────────────────────────────────────────────────────────
  // Twelve hours of rest and preparation compressed to a sliver, then liftoff
  // gets a slow-motion band of its own; the rendezvous is long in the flight
  // and brisk on the page; the crew transfer gets room before the jettison.
  { chapter: 'ascent', at: 0.08, met: MET.ascentLiftoff - 120 },
  // SEP-9, liftoff from the Moon.
  { chapter: 'ascent', at: 0.1, met: MET.ascentLiftoff - 8 },
  { chapter: 'ascent', at: 0.22, met: MET.ascentLiftoff + 8 },
  { chapter: 'ascent', at: 0.3, met: MET.ascentLiftoff + 120 },
  { chapter: 'ascent', at: 0.36, met: MET.ascentInsertion },
  { chapter: 'ascent', at: 0.42, met: MET.tpi - 600 },
  { chapter: 'ascent', at: 0.52, met: MET.tpi + 1800 },
  { chapter: 'ascent', at: 0.6, met: MET.redock },
  { chapter: 'ascent', at: 0.66, met: MET.redock + 900 },
  { chapter: 'ascent', at: 0.72, met: MET.crewTransferEnd },
  // SEP-10, the ascent stage cast off.
  { chapter: 'ascent', at: 0.76, met: MET.sepAscentJettison - 8 },
  { chapter: 'ascent', at: 0.88, met: MET.sepAscentJettison + 8 },
  { chapter: 'ascent', at: 0.93, met: MET.sepAscentJettison + 600 },
  { chapter: 'ascent', at: 1, met: CHAPTER_BOUNDARIES.ascentToReturn },

  // ── Chapter 10 ─────────────────────────────────────────────────────────
  // Sixty hours of coast in a quarter of the chapter; the last fifteen
  // minutes — SM jettison, entry, the parachutes, the splash — in the rest.
  { chapter: 'return', at: 0.03, met: MET.teiIgnition - 1800 },
  { chapter: 'return', at: 0.08, met: MET.teiIgnition },
  { chapter: 'return', at: 0.16, met: MET.teiCutoff },
  { chapter: 'return', at: 0.22, met: MET.teiCutoff + 3600 },
  { chapter: 'return', at: 0.3, met: MET.mcc5 },
  { chapter: 'return', at: 0.38, met: 180 * H },
  { chapter: 'return', at: 0.42, met: MET.sepSM - 900 },
  { chapter: 'return', at: 0.45, met: MET.sepSM - 130 },
  // SEP-11, the Service Module.
  { chapter: 'return', at: 0.47, met: MET.sepSM - 6 },
  { chapter: 'return', at: 0.55, met: MET.sepSM + 6 },
  { chapter: 'return', at: 0.59, met: MET.sepSM + 70 },
  { chapter: 'return', at: 0.62, met: MET.entryInterface },
  { chapter: 'return', at: 0.7, met: MET.peakHeating },
  { chapter: 'return', at: 0.75, met: MET.blackoutEnd },
  { chapter: 'return', at: 0.79, met: MET.drogues - 70 },
  // SEP-12, apex cover and drogues.
  { chapter: 'return', at: 0.81, met: MET.drogues - 12 },
  { chapter: 'return', at: 0.88, met: MET.drogues + 8 },
  { chapter: 'return', at: 0.92, met: MET.mains + 30 },
  { chapter: 'return', at: 0.97, met: MET.splashdown },
  { chapter: 'return', at: 1, met: MET.missionEnd },
];

/**
 * Scroll length of the page in viewport heights. Tuned for pacing in Phase 5.
 *
 * Scaled with the total chapter weight — 3600 for the 30 units of chapters
 * 1–6, so 6480 for all 54 — which keeps every earlier chapter's scroll
 * distance exactly what it was when Phase 2 was signed off.
 */
export const SCROLL_TRACK_VH = 6480;

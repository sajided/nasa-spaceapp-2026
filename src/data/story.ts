import { MET, STORY_MET } from './mission';

/**
 * Story mode: "The Moon Project".
 *
 * The Earth and the Moon talk the reader through the mission. Every line is
 * placed by mission time, exactly like data/callouts.ts, so which line is on
 * screen is a pure function of scroll position: it clears and swaps correctly
 * however the reader scrolls.
 *
 * Line ids are shared with docs/story.md (the script the voices are recorded
 * from) and with the audio files, `public/audio/<id>.m4a`. Never renumber them.
 */

/** 'mission' lines are the real 1969 radio and commentary, played from NASA's recordings. */
export type Speaker = 'earth' | 'moon' | 'mission';
export type Mood = 'sad' | 'happy' | 'shocked' | 'annoyed' | 'smiling' | 'curious' | 'proud';

export interface StoryLine {
  id: string;
  scene: number;
  speaker: Speaker;
  mood: Mood;
  text: string;
  metStart: number;
  metEnd: number;
  /** Mission lines: who is speaking on the real recording. */
  who?: string;
  /**
   * The scene keeps moving while this line plays (auto-play and scrolling
   * are not held for it) — for the liftoff call, heard as the rocket rises.
   */
  flow?: boolean;
  /** Air-to-ground radio: opens with the "Quindar" beep the real link used. */
  radio?: boolean;
}

export interface StoryScene {
  id: number;
  title: string;
  /** Where the scene starts — where "next scene" jumps to. */
  metStart: number;
}

const H = 3600;
const E = STORY_MET.epilogueStart;

export const STORY_SCENES: StoryScene[] = [
  { id: 1, title: 'The Lonely Moon', metStart: STORY_MET.prologueStart },
  { id: 2, title: 'Leaving Earth', metStart: STORY_MET.prologueCut },
  { id: 3, title: 'The Dance in Deep Space', metStart: MET.tliIgnition - 60 },
  { id: 4, title: 'Arrival', metStart: 262_000 },
  { id: 5, title: 'The Greatest Monument', metStart: MET.firstStep - 60 },
  { id: 6, title: 'The Final Goodbyes', metStart: MET.redock },
  { id: 7, title: 'A Museum of Courage', metStart: E },
];

type Row = [
  id: string,
  speaker: Speaker,
  mood: Mood,
  metStart: number,
  metEnd: number,
  text: string,
  extra?: { who: string; flow?: boolean; radio?: boolean },
];

/** Real mission audio (NASA, public domain); the mood is unused for these. */
const PAO = { who: 'Jack King, NASA Launch Control' };

/** Compact rows; the scene number comes from the id. */
const ROWS: Row[] = [
  // ── Scene 1: The Lonely Moon (prologue, Earth–Moon system) ──────────────
  ['s1-01', 'earth', 'curious', -1170, -1060, 'Why are you sad, Moon?'],
  ['s1-02', 'moon', 'sad', -1060, -930, 'You have so many people, animals and plants, Earth. I have nobody. I’m just rocks and dust.'],
  ['s1-03', 'earth', 'smiling', -930, -820, 'Oh Moon, you won’t be lonely for long.'],
  ['s1-04', 'moon', 'annoyed', -820, -710, 'Don’t tease me. I really am lonely.'],
  ['s1-05', 'earth', 'happy', -710, -590, 'I’m not teasing! My humans are coming to visit you.'],
  ['s1-06', 'moon', 'shocked', -590, -440, 'Coming… to me? How?'],

  // ── Scene 2: Leaving Earth (the pad, then staging) ──────────────────────
  ['s2-01', 'earth', 'proud', -400, -280, 'My humans built a giant rocket called the Saturn V. It’s as tall as a 36-storey building!'],
  ['s2-02', 'earth', 'smiling', -280, -150, 'But it’s very heavy. To reach you, they had to let go of pieces along the way.'],
  ['s2-03', 'moon', 'curious', -150, -12, 'Let go? What did they leave behind?'],
  ['s2-03b', 'mission', 'proud', MET.ignition, MET.liftoff, 'Ignition sequence start. Six, five, four, three, two, one, zero. All engines running.', PAO],
  ['s2-03c', 'mission', 'proud', MET.liftoff, 30, 'Liftoff! We have a liftoff, thirty-two minutes past the hour. Liftoff on Apollo 11. Tower cleared. We got a roll program.', { ...PAO, flow: true }],
  ['s2-04', 'earth', 'happy', 140, 166, 'After less than three minutes, the huge First Stage was out of fuel. Let it go!'],
  ['s2-05', 'earth', 'smiling', 166, 189, 'It fell into my Atlantic Ocean, deep, deep down.'],
  ['s2-06', 'earth', 'happy', 189, 195.5, 'Then a big metal ring dropped off, like taking off a belt.'],
  ['s2-07', 'earth', 'proud', 195.5, 199, 'Next, the tower on top flew away. It was a safety rocket, about as heavy as three cars.'],
  ['s2-08', 'earth', 'happy', 199, 400, 'Its cover came off too, so the astronauts could finally look out of their windows!'],
  ['s2-09', 'earth', 'smiling', 520, 553, 'At nine minutes, flying faster than 20,000 km an hour, the Second Stage let go too.'],
  ['s2-10', 'earth', 'smiling', 553, 680, 'It fell back into my Atlantic Ocean, far from the first one.'],
  ['s2-11', 'moon', 'sad', 700, 3000, 'So all those pieces are lost forever at the bottom of the sea?'],
  ['s2-12', 'earth', 'proud', 3000, 6500, 'Not forgotten! In 2013, explorers found the First Stage’s engines four kilometres down… and brought them up.'],
  ['s2-13', 'earth', 'happy', 6500, MET.tliIgnition - 60, 'You can visit them in a museum today!'],

  // ── Scene 3: The Dance in Deep Space ────────────────────────────────────
  ['s3-01', 'moon', 'curious', MET.tliIgnition - 60, MET.tliCutoff, 'So they threw almost everything away just to get away from you?'],
  ['s3-02', 'earth', 'smiling', MET.tliCutoff, 10_800, 'Yes! Then they fired their engine and zoomed toward you.'],
  ['s3-03', 'earth', 'happy', 10_800, MET.sepSLA - 3, 'Next came a careful dance. The main ship turned around…'],
  ['s3-04', 'earth', 'happy', MET.sepSLA - 3, MET.sepCSM + 4, '…and pulled the little Lunar Module, called Eagle, out of its garage.'],
  ['s3-05', 'moon', 'curious', MET.sepCSM + 4, MET.sepLMExtraction - 8, 'What happened to the empty garage?'],
  ['s3-06', 'earth', 'proud', MET.sepLMExtraction - 8, MET.sepLMExtraction + 30, 'That was the Third Stage. It didn’t hit me, and it didn’t hit you.'],
  ['s3-07', 'earth', 'happy', MET.sepLMExtraction + 30, 60_000, 'It flew past you and went around the Sun. It’s still circling the Sun today!'],

  // ── Scene 4: Arrival and Separation ─────────────────────────────────────
  ['s4-01', 'earth', 'smiling', 262_000, MET.loiIgnition, 'After three days, about 76 hours, they arrived and started circling you.'],
  ['s4-02', 'moon', 'shocked', MET.loiIgnition, MET.loi2, 'They’re here! They’re really going around me!'],
  ['s4-03', 'earth', 'happy', MET.sepUndock - 60, MET.sepUndock + 12, 'A day later, Eagle let go of the main ship, Columbia.'],
  ['s4-04', 'earth', 'proud', MET.sepUndock + 12, MET.csmSepBurn + 900, 'Michael stayed in Columbia. Neil and Buzz flew Eagle down to meet you.'],
  ['s4-04b', 'mission', 'proud', MET.eagleLanded - 1, MET.eagleLanded + 600, 'Houston, uh, Tranquility Base here. The Eagle has landed. Roger, Twan… Tranquility. We copy you on the ground. You got a bunch of guys about to turn blue. We’re breathing again. Thanks a lot.', { who: 'Neil Armstrong and Mission Control', radio: true }],

  // ── Scene 5: The Greatest Monument ──────────────────────────────────────
  ['s5-00', 'mission', 'proud', MET.firstStep - 60, MET.firstStep + 40, 'I’m going to step off the LM now. That’s one small step for man, one giant leap for mankind.', { who: 'Neil Armstrong', radio: true }],
  ['s5-01', 'moon', 'happy', MET.firstStep + 40, MET.aldrinOut + 60, 'They landed! They’re walking on me! That tickles!'],
  ['s5-02', 'earth', 'smiling', MET.aldrinOut + 60, MET.flag - 120, 'Look, they’re leaving gifts for you.'],
  ['s5-03', 'earth', 'proud', MET.flag - 120, MET.lrrr + 300, 'A flag, a special mirror, a quake detector… and their footprints.'],
  ['s5-04', 'earth', 'happy', MET.lrrr + 300, MET.hatchClose, 'And a tiny disk with good wishes from people all over my world.'],
  ['s5-05', 'moon', 'sad', MET.hatchClose + 3600, MET.ascentLiftoff - 4, 'Wait… they’re leaving. Now I’m empty again.'],
  ['s5-06', 'earth', 'smiling', MET.ascentLiftoff - 4, MET.ascentLiftoff + 8, 'You’re not empty. Look at what they left behind.'],
  ['s5-07', 'moon', 'shocked', MET.ascentLiftoff + 8, MET.ascentLiftoff + 120, 'The bottom half of their ship! It’s still here!'],
  ['s5-08', 'earth', 'proud', MET.ascentLiftoff + 120, MET.ascentInsertion + 600, 'That’s the Descent Stage. They used it as a launch pad to fly home.'],
  ['s5-09', 'earth', 'smiling', MET.ascentInsertion + 600, MET.tpi + 600, 'It has a sign that says, ‘We came in peace for all mankind.’'],
  ['s5-10', 'earth', 'happy', MET.tpi + 600, MET.redock, 'You have no wind or rain, so it can stay there for millions of years.'],

  // ── Scene 6: The Final Goodbyes ─────────────────────────────────────────
  ['s6-01', 'earth', 'smiling', MET.redock, MET.redock + 900, 'Back in orbit, they carried your moon rocks into Columbia.'],
  ['s6-02', 'earth', 'curious', MET.redock + 900, MET.sepAscentJettison - 8, 'Then they let the top half of Eagle go.'],
  ['s6-03', 'moon', 'curious', MET.sepAscentJettison - 8, MET.sepAscentJettison + 600, 'Where did it go?'],
  ['s6-04', 'earth', 'smiling', MET.sepAscentJettison + 600, MET.teiIgnition, 'Nobody knows for sure! Scientists think it might still be circling you, keeping you company.'],
  ['s6-05', 'moon', 'curious', MET.mcc5, 180 * H, 'And how did they get home safely?'],
  ['s6-06', 'earth', 'proud', MET.sepSM - 130, MET.sepSM + 70, 'Just before reaching me, they let go of the Service Module. It burned up in my sky like a shooting star.'],
  ['s6-07', 'earth', 'happy', MET.drogues - 70, MET.mains + 30, 'Only the tiny Command Module came home, with a heat shield, and splashed into my Pacific Ocean.'],
  ['s6-08', 'earth', 'proud', MET.mains + 30, E, 'It’s in a museum now, so everyone can see it.'],

  // ── Scene 7: A Museum of Courage (epilogue) ─────────────────────────────
  ['s7-01', 'moon', 'curious', E + 20, E + 120, 'So the oceans, the Sun, and me… we’re all keeping pieces of this journey?'],
  ['s7-02', 'earth', 'smiling', E + 120, E + 220, 'Exactly. My oceans hold the rocket stages. The Sun holds the Third Stage.'],
  ['s7-03', 'earth', 'proud', E + 220, STORY_MET.lroIn, 'And you hold the most special gifts of all.'],
  ['s7-04', 'earth', 'happy', STORY_MET.lroIn, STORY_MET.lroOut, 'Look, this is a real photo, taken from space. It’s still there!'],
  ['s7-05', 'earth', 'smiling', STORY_MET.laserIn, E + 610, 'And every day, my scientists bounce light off the mirror they left you.'],
  ['s7-06', 'earth', 'happy', E + 610, STORY_MET.laserOut, 'It’s my way of saying hello.'],
  ['s7-07', 'moon', 'smiling', STORY_MET.mapIn, STORY_MET.mapOut, 'I’m not just rocks and dust anymore. I’m a museum of human courage!'],
  ['s7-08', 'moon', 'smiling', STORY_MET.leaveIn, E + 1000, 'If you came to visit me, what would you leave behind?'],
  ['s7-09', 'moon', 'happy', E + 1000, STORY_MET.leaveOut, 'Thank you! I’ll keep it safe forever.'],
  ['s7-10', 'earth', 'proud', STORY_MET.finale, E + 1120, 'And Moon… my humans are coming back.'],
  ['s7-11', 'moon', 'happy', E + 1120, STORY_MET.epilogueEnd, 'I’ll be waiting!'],
];

export const STORY_LINES: StoryLine[] = ROWS.map(([id, speaker, mood, metStart, metEnd, text, extra]) => ({
  id,
  scene: Number(id.slice(1, id.indexOf('-'))),
  speaker,
  mood,
  text,
  metStart,
  metEnd,
  ...extra,
}));

/**
 * The line on screen at a mission time, or null between lines.
 *
 * Lines are sorted and never overlap (checked below), so a binary search
 * would do; at sixty-odd lines a linear scan is cheaper than the branch.
 * The end is exclusive, so at a shared boundary the later line wins.
 */
export function storyLineAt(met: number): StoryLine | null {
  for (const line of STORY_LINES) {
    if (met >= line.metStart && met < line.metEnd) return line;
  }
  // The very last line holds at the very end of the page.
  const last = STORY_LINES[STORY_LINES.length - 1]!;
  return met >= last.metEnd && met <= last.metEnd + 1e-6 ? last : null;
}

export function storySceneAt(met: number): StoryScene {
  let current = STORY_SCENES[0]!;
  for (const scene of STORY_SCENES) if (met >= scene.metStart) current = scene;
  return current;
}

// Fails at import — so at boot and in every spec — rather than as a bubble
// that silently never shows.
for (let i = 0; i < STORY_LINES.length; i += 1) {
  const line = STORY_LINES[i]!;
  if (!(line.metEnd > line.metStart)) throw new Error(`Story line ${line.id} ends before it starts`);
  const prev = STORY_LINES[i - 1];
  if (prev && line.metStart < prev.metEnd) {
    throw new Error(`Story line ${line.id} starts before ${prev.id} ends`);
  }
}

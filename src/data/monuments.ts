import { MET } from './mission';

/**
 * The Monument Album: everything the mission let go of, and where it rests.
 *
 * "Abandoned but not forgotten" is the brief, and this is its spine. A card is
 * collected the first time the reader passes its mission time, and stays
 * collected — see ui/story/album.ts for why that one piece of state is a
 * high-water mark rather than a pure function of scroll.
 *
 * Facts are kept to a sentence or two for six-to-nine-year-olds. Every one is
 * marked against the sources in docs/story.md; † there means "verify before
 * shipping".
 */

export type RestingPlace =
  | 'atlantic'
  | 'earth-sky'
  | 'sun-orbit'
  | 'moon-surface'
  | 'moon-orbit'
  | 'pacific'
  | 'museum';

export interface Monument {
  id: string;
  name: string;
  /** What the "Let go!" button calls it. */
  kidName: string;
  /** Separation that drops it, for the "Let go!" moment. */
  separationId?: string;
  /** Mission time at which it is collected. */
  met: number;
  restingPlace: RestingPlace;
  fact: string;
  notForgotten?: string;
  icon: string;
}

export const RESTING_PLACES: Record<RestingPlace, { label: string; icon: string }> = {
  atlantic: { label: 'Atlantic Ocean', icon: '🌊' },
  'earth-sky': { label: 'Earth’s sky', icon: '☄️' },
  'sun-orbit': { label: 'Going around the Sun', icon: '☀️' },
  'moon-surface': { label: 'On the Moon', icon: '🌕' },
  'moon-orbit': { label: 'Around the Moon?', icon: '🌀' },
  pacific: { label: 'Pacific Ocean', icon: '🌊' },
  museum: { label: 'In a museum', icon: '🏛️' },
};

export const MONUMENTS: Monument[] = [
  {
    id: 's-ic',
    name: 'First Stage (S-IC)',
    kidName: 'the First Stage',
    separationId: 'sep-1',
    met: MET.sepSIC,
    restingPlace: 'atlantic',
    fact: 'The biggest part of the rocket. Its five engines burned for less than three minutes.',
    notForgotten: 'Its engines were found deep in the sea and brought up in 2013.',
    icon: '🚀',
  },
  {
    id: 'interstage',
    name: 'Interstage ring',
    kidName: 'the ring',
    separationId: 'sep-2',
    met: MET.sepInterstage,
    restingPlace: 'atlantic',
    fact: 'A big metal ring that joined the first and second stages.',
    icon: '⭕',
  },
  {
    id: 'les',
    name: 'Launch Escape System',
    kidName: 'the escape tower',
    separationId: 'sep-3',
    met: MET.sepLES,
    restingPlace: 'atlantic',
    fact: 'A safety rocket that could pull the astronauts away if something went wrong.',
    notForgotten: 'It was never needed!',
    icon: '🗼',
  },
  {
    id: 's-ii',
    name: 'Second Stage (S-II)',
    kidName: 'the Second Stage',
    separationId: 'sep-4',
    met: MET.sepSII,
    restingPlace: 'atlantic',
    fact: 'It pushed the astronauts all the way up to space.',
    icon: '🛢️',
  },
  {
    id: 's-ivb',
    name: 'Third Stage (S-IVB)',
    kidName: 'the Third Stage',
    separationId: 'sep-7',
    met: MET.sepLMExtraction,
    restingPlace: 'sun-orbit',
    fact: 'It sent the astronauts toward the Moon, then flew away.',
    notForgotten: 'It is still going around the Sun today.',
    icon: '🛰️',
  },
  {
    id: 'flag',
    name: 'Flag',
    kidName: 'the flag',
    met: MET.flag,
    restingPlace: 'moon-surface',
    fact: 'Planted by Neil and Buzz.',
    notForgotten: 'The engine blast knocked it over when they left.',
    icon: '🚩',
  },
  {
    id: 'psep',
    name: 'Seismometer',
    kidName: 'the quake detector',
    met: MET.psep,
    restingPlace: 'moon-surface',
    fact: 'It listened for moonquakes.',
    notForgotten: 'It sent the first moonquake reports to Earth.',
    icon: '📡',
  },
  {
    id: 'lrrr',
    name: 'Retroreflector (mirror)',
    kidName: 'the mirror',
    met: MET.lrrr,
    restingPlace: 'moon-surface',
    fact: 'A special mirror that bounces light straight back to where it came from.',
    notForgotten: 'Scientists still use it today!',
    icon: '🪞',
  },
  {
    id: 'plaque',
    name: 'Plaque & goodwill disk',
    kidName: 'the plaque',
    met: MET.lrrr + 600,
    restingPlace: 'moon-surface',
    fact: '“We came in peace for all mankind.” The disk holds messages from leaders of 73 countries.',
    icon: '🕊️',
  },
  {
    id: 'footprints',
    name: 'Footprints',
    kidName: 'the footprints',
    met: MET.aldrinIn,
    restingPlace: 'moon-surface',
    fact: 'The first human footprints on another world.',
    notForgotten: 'With no wind, they can last a very long time.',
    icon: '👣',
  },
  {
    id: 'descent-stage',
    name: 'Descent Stage',
    kidName: 'the bottom half of Eagle',
    separationId: 'sep-9',
    met: MET.ascentLiftoff,
    restingPlace: 'moon-surface',
    fact: 'Eagle’s golden bottom half, used as a launch pad to fly home.',
    notForgotten: 'It is still standing at Tranquility Base.',
    icon: '🌟',
  },
  {
    id: 'ascent-stage',
    name: 'Ascent Stage',
    kidName: 'the top half of Eagle',
    separationId: 'sep-10',
    met: MET.sepAscentJettison,
    restingPlace: 'moon-orbit',
    fact: 'Eagle’s top half, which carried Neil and Buzz back up.',
    notForgotten: 'A mystery: it may still be circling the Moon!',
    icon: '❓',
  },
  {
    id: 'sm',
    name: 'Service Module',
    kidName: 'the Service Module',
    separationId: 'sep-11',
    met: MET.sepSM,
    restingPlace: 'earth-sky',
    fact: 'It held the engine and supplies for the trip.',
    notForgotten: 'It burned up like a shooting star.',
    icon: '☄️',
  },
  {
    id: 'cm',
    name: 'Command Module Columbia',
    kidName: 'Columbia',
    met: MET.splashdown,
    restingPlace: 'museum',
    fact: 'The only part that came home, splashing into the Pacific Ocean.',
    notForgotten: 'You can see it at the Smithsonian in Washington, D.C.',
    icon: '🏛️',
  },
];

/** Ids of the monuments collected by a given high-water mission time. */
export function collectedBy(maxMet: number): string[] {
  return MONUMENTS.filter((m) => maxMet >= m.met).map((m) => m.id);
}

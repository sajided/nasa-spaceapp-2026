import { MET } from './mission';

/**
 * On-screen callouts: the moments from chapter 7 on that are words rather than
 * motion.
 *
 * The descent is tense because of what was *said* — the program alarms, the
 * fuel calls, the silence before "Contact light". A first-time viewer
 * (TC-P3-11) cannot read any of that off a 3D model, so each gets a readable
 * beat, timed by mission time like everything else and derived from progress
 * like the SLOW-MO badge, so it is correct in both scroll directions and cannot
 * stick on after a flick-scroll.
 *
 * Quotes follow the Apollo 11 air-to-ground transcript; times are the working
 * values in data/mission.ts, checked in TC-P5-17.
 */

export type CalloutKind = 'dsky' | 'fuel' | 'caption';

export interface Callout {
  id: string;
  kind: CalloutKind;
  /** Window, in mission elapsed time. Shown while metStart <= met <= metEnd. */
  metStart: number;
  metEnd: number;
  /** The headline — what was on the display, or what was said. */
  text: string;
  /** Plain-language line underneath, for readers who were not there. */
  detail?: string;
}

export const CALLOUTS: readonly Callout[] = [
  {
    id: 'undock',
    kind: 'caption',
    metStart: MET.sepUndock + 40,
    metEnd: MET.csmSepBurn - 200,
    text: '“The Eagle has wings.”',
    detail: 'Eagle undocks from Columbia. Collins stays in orbit; Armstrong and Aldrin head down.',
  },
  {
    id: 'pdi',
    kind: 'caption',
    metStart: MET.pdi - 30,
    metEnd: MET.alarm1202a - 30,
    text: 'Powered descent',
    detail: 'The descent engine fires to brake Eagle out of orbit, 15 km above the surface.',
  },
  {
    id: 'alarm-1202',
    kind: 'dsky',
    metStart: MET.alarm1202a,
    metEnd: MET.alarm1202b + 50,
    text: 'PROG 1202',
    detail:
      'Program alarm: the guidance computer is overloaded and shedding low-priority work. Mission Control: “We’re GO on that alarm.”',
  },
  {
    id: 'alarm-1201',
    kind: 'dsky',
    metStart: MET.alarm1201,
    metEnd: MET.alarm1201 + 45,
    text: 'PROG 1201',
    detail: 'Another overload alarm, at under 1,000 m. Still GO — the computer is doing the essential work.',
  },
  {
    id: 'p66',
    kind: 'caption',
    metStart: MET.p66,
    metEnd: MET.fuel60 - 2,
    text: 'Manual control',
    detail: 'The computer is steering into a boulder field. Armstrong takes over and flies long, looking for a clear spot.',
  },
  {
    id: 'fuel-60',
    kind: 'fuel',
    metStart: MET.fuel60,
    metEnd: MET.fuel30 - 2,
    text: '“60 seconds”',
    detail: 'Sixty seconds of descent fuel left before they must land or abort.',
  },
  {
    id: 'fuel-30',
    kind: 'fuel',
    metStart: MET.fuel30,
    metEnd: MET.touchdown - 2,
    text: '“30 seconds”',
    detail: 'Thirty seconds of fuel left.',
  },
  {
    id: 'contact',
    kind: 'caption',
    metStart: MET.touchdown,
    metEnd: MET.eagleLanded - 1,
    text: '“Contact light.”',
    detail: 'A probe under the footpads touches the surface. The engine is shut down.',
  },
  {
    id: 'landed',
    kind: 'caption',
    metStart: MET.eagleLanded,
    metEnd: MET.eagleLanded + 3600,
    text: '“Houston, Tranquility Base here. The Eagle has landed.”',
    detail: 'July 20, 1969. Sea of Tranquility, the Moon.',
  },
  {
    id: 'first-step',
    kind: 'caption',
    metStart: MET.firstStep,
    metEnd: MET.aldrinOut - 120,
    text: '“That’s one small step for man, one giant leap for mankind.”',
    detail: 'Neil Armstrong steps onto the Moon. July 21, 1969, 02:56 UTC.',
  },
  {
    id: 'aldrin',
    kind: 'caption',
    metStart: MET.aldrinOut,
    metEnd: MET.flag - 240,
    text: '“Magnificent desolation.”',
    detail: 'Buzz Aldrin follows, nineteen minutes later.',
  },
  {
    id: 'flag',
    kind: 'caption',
    metStart: MET.flag,
    metEnd: MET.psep - 180,
    text: 'The flag',
    detail: 'A horizontal rod holds it out — there is no air on the Moon to make it fly.',
  },
  {
    id: 'experiments',
    kind: 'caption',
    metStart: MET.psep,
    metEnd: MET.aldrinIn - 120,
    text: 'Experiments',
    detail:
      'A seismometer to listen for moonquakes, and a laser reflector that observatories on Earth still use to measure the distance to the Moon.',
  },

  // ── Chapter 9 ──────────────────────────────────────────────────────────
  {
    id: 'moon-liftoff',
    kind: 'caption',
    metStart: MET.ascentLiftoff,
    metEnd: MET.ascentLiftoff + 90,
    text: 'Liftoff from the Moon',
    detail:
      'The ascent stage fires off the descent stage, which stays behind as its launch pad — it is still at Tranquility Base.',
  },
  {
    id: 'rendezvous',
    kind: 'caption',
    metStart: MET.tpi,
    metEnd: MET.redock - 120,
    text: 'Rendezvous',
    detail: 'Eagle catches up with Columbia, 110 km above the Moon, where Collins has been orbiting alone.',
  },
  {
    id: 'redock',
    kind: 'caption',
    metStart: MET.redock,
    metEnd: MET.redock + 900,
    text: 'Docked',
    detail: 'Columbia and Eagle are joined again, nose to tunnel, exactly as on the way out.',
  },
  {
    id: 'crew-transfer',
    kind: 'caption',
    metStart: MET.redock + 1200,
    metEnd: MET.crewTransferEnd,
    text: 'Crew transfer',
    detail: 'Armstrong and Aldrin move back into Columbia with the rock samples, and the hatches are closed.',
  },

  // ── Chapter 10 ─────────────────────────────────────────────────────────
  {
    id: 'tei',
    kind: 'caption',
    metStart: MET.teiIgnition,
    metEnd: MET.teiCutoff + 900,
    text: 'Trans-Earth injection',
    detail:
      'Behind the Moon, the Service Module engine fires for two and a half minutes. If it had failed, there was no other way home.',
  },
  {
    id: 'sm-jettison',
    kind: 'caption',
    metStart: MET.sepSM,
    metEnd: MET.sepSM + 300,
    text: 'Service Module jettison',
    detail: 'Only the Command Module has a heat shield. It turns to put that shield first.',
  },
  {
    id: 'blackout',
    kind: 'caption',
    metStart: MET.entryInterface + 20,
    metEnd: MET.blackoutEnd,
    text: 'Radio blackout',
    detail:
      'The air ahead of the heat shield is squeezed into glowing plasma at thousands of degrees, and radio cannot get through it.',
  },
  {
    id: 'drogues',
    kind: 'caption',
    metStart: MET.drogues - 8,
    metEnd: MET.mains - 2,
    text: 'Drogue parachutes',
    detail: 'The apex cover is blown off, and two small drogues steady and slow the capsule.',
  },
  {
    id: 'mains',
    kind: 'caption',
    metStart: MET.mains,
    metEnd: MET.splashdown - 20,
    text: 'Main parachutes',
    detail: 'Three orange-and-white canopies, 25 m across, bring it down at about 30 km/h.',
  },
  {
    id: 'splashdown',
    kind: 'caption',
    metStart: MET.splashdown,
    metEnd: MET.missionEnd,
    text: 'Splashdown',
    detail:
      'July 24, 1969, in the Pacific, near the recovery ship USS Hornet. Of the 110-metre Saturn V, only this capsule came home.',
  },
];

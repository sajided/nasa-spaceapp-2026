import type { SeparationSpec } from '../types';
import { MET } from './mission';
import {
  APEX_COVER_BASE,
  CM_FLIGHT_Y,
  CM_PIVOT_Y,
  CSM_COAST_Y,
  LM_ASCENT_BASE,
  LM_DOCK_HEIGHT,
  LUNAR_GROUND_Y,
  jointY,
  stage,
} from './vehicle';

/**
 * All twelve separations, as data.
 *
 * TC-P1-05 requires that all four run through one shared function and that
 * adding a fifth needs only a configuration entry. Everything that differs
 * between events lives here; `core/separation.ts` turns a row into the
 * four-beat sequence.
 *
 * Drift is expressed in the vehicle's own frame. Because the vehicle holds the
 * origin and the world moves past it, a spent stage falling away reads as
 * negative Y — the relative motion the onboard cameras actually recorded.
 */
export const SEPARATIONS: readonly SeparationSpec[] = [
  {
    id: 'sep-1',
    part: 'S-IC',
    met: MET.sepSIC,
    dwellSeconds: 6,
    cutoff: 'exhaustF1',
    ignites: 'exhaustJ2',
    jointY: jointY('interstage'),
    // Retro-rockets shove it back hard; it is the biggest, heaviest piece.
    drift: [1.5, -58, 0.5],
    tumble: [0.55, 0.12, 0.28],
    camera: 'sepSIC',
    // Cannot reach back past the chapter boundary at MET 155.
    cameraLead: 4,
  },
  {
    id: 'sep-2',
    part: 'interstage',
    met: MET.sepInterstage,
    dwellSeconds: 4,
    jointY: jointY('S-II'),
    // Slides straight down past the J-2 bells — a tight clearance, little tumble.
    drift: [0.3, -38, 0.2],
    tumble: [0.18, 0.06, 0.09],
    camera: 'sepInterstage',
    cameraLead: 5,
  },
  {
    id: 'sep-3',
    part: 'LES',
    carries: ['boost-cover'],
    met: MET.sepLES,
    dwellSeconds: 4,
    jointY: jointY('LES'),
    // Its own motor pulls it up and aside, not backwards.
    drift: [14, 34, 3],
    tumble: [0.34, 0.22, 0.5],
    camera: 'sepLES',
    // Only six seconds after the interstage, so the move has to be brisk.
    cameraLead: 2,
  },
  {
    id: 'sep-4',
    part: 'S-II',
    met: MET.sepSII,
    dwellSeconds: 6,
    cutoff: 'exhaustJ2',
    ignites: 'exhaustJ2Single',
    jointY: jointY('S-IVB'),
    drift: [1.1, -52, 0.7],
    tumble: [0.42, 0.1, 0.24],
    camera: 'sepSII',
    cameraLead: 10,
  },
  {
    id: 'sep-5',
    part: 'SLA-panel-1',
    siblings: ['SLA-panel-2', 'SLA-panel-3', 'SLA-panel-4'],
    met: MET.sepSLA,
    dwellSeconds: 6,
    jointY: jointY('SLA'),
    // Outward and slightly back, like petals opening. The siblings are rotated
    // about the stack axis by the builder, so one drift vector describes all
    // four. Kept short enough that the panels stay in shot through beat 4
    // (TC-P1-14), which at this camera distance means about twenty metres.
    drift: [21, -7, 0],
    // Almost entirely about the panel's own tangential axis: this is a hinge
    // opening, not debris tumbling.
    tumble: [0, 0, 1.15],
    camera: 'sepSLA',
    cameraLead: 12,
  },
  {
    id: 'sep-6',
    part: 'CSM',
    carries: ['SM', 'CM'],
    // Index 2 is the CSM Group. Unlike the boost cover, the modules are not
    // children of the thing carrying them — they have to be moved into it.
    carriesTo: 2,
    met: MET.sepCSM,
    dwellSeconds: 8,
    jointY: jointY('SM'),
    // Pulls straight out along the stack axis — about twenty metres, which is
    // both close to the real transposition and near enough that the modules
    // stay in shot through beat 4 (TC-P1-14). The 180° turnaround is authored
    // in the chapter, because it happens after the event window closes.
    drift: [0, 20, 0],
    tumble: [0, 0, 0],
    camera: 'sepCSM',
    // Only a second of lead: the panels have barely finished going.
    cameraLead: 1,
  },
  {
    id: 'sep-7',
    part: 'LM',
    met: MET.sepLMExtraction,
    dwellSeconds: 12,
    jointY: jointY('LM'),
    // The LM does not drift anywhere: it is pulled into the CSM and stays
    // there. Index 2 is the CSM — index 1 would be open space.
    attachTo: 2,
    drift: [0, 0, 0],
    tumble: [0, 0, 0],
    camera: 'sepExtraction',
    cameraLead: 10,
  },
  {
    id: 'sep-8',
    part: 'LM',
    // Eagle leaves the CSM (index 2) for its own flight frame (index 3). It is
    // the first event whose part does not start at home.
    attachFrom: 2,
    attachTo: 3,
    met: MET.sepUndock,
    dwellSeconds: 24,
    // The docking interface: the LM tunnel under the CM apex.
    jointY: LUNAR_GROUND_Y + LM_DOCK_HEIGHT,
    // Capture latches, not pyrotechnics — a glint at the tunnel.
    flashPeak: 0.18,
    // Eagle stays where it is; chapter 7 backs Columbia away from it, which is
    // how the undocking was flown and keeps Eagle on its attitude pivot.
    drift: [0, 0, 0],
    // "The Eagle has wings": Armstrong turned Eagle through a full circle so
    // Collins could look it over. One exact turn, not a tumble.
    tumble: [0, Math.PI * 2, 0],
    tumbleExact: true,
    ignites: 'rcsLM',
    camera: 'sepUndock',
    cameraLead: 40,
  },
  {
    id: 'sep-9',
    part: 'LM-ascent-stage',
    // Off the descent stage (index 0) into Eagle's flight frame (index 1). The
    // descent stage itself moves to the landing site at the same moment — a
    // chapter 9 tween, because it is a second part changing parent.
    attachFrom: 0,
    attachTo: 1,
    met: MET.ascentLiftoff,
    dwellSeconds: 10,
    jointY: LUNAR_GROUND_Y + LM_ASCENT_BASE,
    // Explosive bolts and a guillotine through the umbilicals: a real flash,
    // but held below full strength — at 1 the flash sphere is thirteen metres
    // across and swallows both stages and the ground around them.
    flashPeak: 0.35,
    // The ascent stage holds the origin, and the descent stage "drifting
    // back" is the Moon falling away beneath it.
    drift: [0, 0, 0],
    tumble: [0, 0, 0],
    ignites: 'exhaustAPS',
    camera: 'sepAscent',
    cameraLead: 60,
  },
  {
    id: 'sep-10',
    part: 'LM-ascent-stage',
    // Out of the CSM (index 2), left in lunar orbit (index 3).
    attachFrom: 2,
    attachTo: 3,
    met: MET.sepAscentJettison,
    dwellSeconds: 10,
    jointY: LUNAR_GROUND_Y + LM_DOCK_HEIGHT,
    // The docking latches again — a glint, as at SEP-8.
    flashPeak: 0.2,
    drift: [-6, -28, 5],
    tumble: [0.3, 0.5, 0.25],
    camera: 'sepAscentJettison',
    cameraLead: 120,
  },
  {
    id: 'sep-11',
    part: 'SM',
    // Out of the CSM (index 2) to its own jettison pose (index 3). The CM
    // moves into its flight frame at the same moment, in chapter 10.
    attachFrom: 2,
    attachTo: 3,
    met: MET.sepSM,
    dwellSeconds: 8,
    // The SM/CM joint, with the CSM turned apex-down.
    jointY: stage('SM').base + CSM_COAST_Y - (stage('CM').base - stage('SM').base),
    flashPeak: 0.6,
    drift: [5, 20, -4],
    tumble: [0.4, 0.3, 0.6],
    camera: 'smJettison',
    cameraLead: 120,
  },
  {
    id: 'sep-12',
    part: 'apex-cover',
    // The parachute sequence. The apex cover is what separates; its thrusters
    // push it clear, and the drogues come out behind it as beat 4. The mains
    // follow in chapter 10 once the drogues have steadied the capsule.
    attachFrom: 0,
    attachTo: 1,
    met: MET.drogues - 2,
    dwellSeconds: 16,
    jointY: CM_FLIGHT_Y - CM_PIVOT_Y + APEX_COVER_BASE,
    // Small thrusters on the cover, not staging: a flash the size of the cover.
    flashPeak: 0.3,
    drift: [3, 26, -2],
    tumble: [0.5, 0.2, 0.7],
    camera: 'drogueView',
    cameraLead: 60,
  },
] as const;

export function separation(id: string): SeparationSpec {
  const found = SEPARATIONS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown separation '${id}'`);
  return found;
}

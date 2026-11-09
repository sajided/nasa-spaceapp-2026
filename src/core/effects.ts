import type { EffectsState } from '../types';

/**
 * Effect channels — exhaust, smoke, separation flashes, atmosphere.
 *
 * These are animated like parts but kept deliberately out of `dumpState()`.
 * Five specs compare dumps by exact deep equality, and putting a plume in there
 * would make every one of them hostage to particle detail. They are still
 * covered by `hasNaN()` through this module, so they do not escape checking
 * altogether.
 *
 * Everything here is driven by scroll progress, never by elapsed time. The cost
 * is that a plume parked at a fixed scroll position is static rather than
 * flickering; the benefit is that the same progress always renders the same
 * frame, which is what makes screenshot baselines viable at all. If the
 * stillness reads as dead, a time-based flicker can be layered on in Phase 5
 * and excluded from baseline shots.
 */

let current: EffectsState | null = null;

export function createEffectsState(): EffectsState {
  const state: EffectsState = {
    exhaustF1: 0,
    exhaustJ2: 0,
    exhaustJ2Single: 0,
    smoke: 0,
    flash: 0,
    flashY: 0,
    atmosphere: 1,
    vehicleLod: 0,
    trajectory: 0,
    stars: 0,
    lmLegs: 0,
    exhaustDPS: 0,
    rcsLM: 0,
    lunarSun: 0,
    dust: 0,
    dustFlow: 0,
    footprints: 0,
    walkCDR: 0,
    walkLMP: 0,
    exhaustAPS: 0,
    spsBurn: 0,
    plasma: 0,
    splash: 0,
    splashFlow: 0,
    moonWarmth: 0,
    siteGlow: 0,
    laser: 0,
  };
  current = state;
  return state;
}

export function getEffectsState(): EffectsState | null {
  return current;
}

export function clearEffectsState(): void {
  current = null;
}

export function effectsHaveNaN(): boolean {
  if (!current) return false;
  for (const value of Object.values(current)) {
    if (typeof value === 'number' && !Number.isFinite(value)) return true;
  }
  return false;
}

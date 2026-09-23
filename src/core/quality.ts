/**
 * Quality tiers — the hook, not the detection.
 *
 * The PRD's performance section scales particle counts with a tier detected at
 * startup, and Phase 6 owns the detection (TC-P6-07). Phase 3 needs the hook
 * now: the touchdown dust is the first effect whose cost is worth scaling, and
 * TC-P3-13 asks that its particle count already follow the tier "even if the
 * tiers are only stubbed at this phase".
 *
 * So the tier is read from `?quality=low|medium|high` and defaults to high.
 * Every effect that scales asks `particleBudget()` rather than hard-coding a
 * count, which means Phase 6 replaces one function and nothing else.
 */

export type QualityTier = 'high' | 'medium' | 'low';

export interface ParticleBudget {
  /** Touchdown dust sheet. */
  dust: number;
  /** Splashdown spray. */
  splash: number;
}

const BUDGETS: Record<QualityTier, ParticleBudget> = {
  high: { dust: 4000, splash: 1600 },
  medium: { dust: 2000, splash: 800 },
  low: { dust: 800, splash: 300 },
};

export function detectQualityTier(search: string = window.location.search): QualityTier {
  const requested = new URLSearchParams(search).get('quality');
  return requested === 'low' || requested === 'medium' || requested === 'high' ? requested : 'high';
}

export function particleBudget(tier: QualityTier): ParticleBudget {
  return BUDGETS[tier];
}

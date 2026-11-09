/**
 * `prefers-reduced-motion`, which the PRD requires (no shake, no flashes,
 * cross-fades instead of motion) and which story mode honours for everything
 * it adds: flying album cards, the weight meter's wobble, pulsing buttons.
 *
 * Read live rather than once, so turning the OS setting on mid-session takes
 * effect without a reload.
 */
const query = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : null;

export function reducedMotion(): boolean {
  return query?.matches ?? false;
}

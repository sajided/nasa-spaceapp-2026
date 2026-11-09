import { MONUMENTS, RESTING_PLACES, type RestingPlace } from '../../data/monuments';
import { story } from '../../style/tokens';

/**
 * The Resting Places map: where every piece the mission let go of is today.
 *
 * A diagram, not a chart of real positions — the Sun, the Earth with its
 * ocean and its sky, a museum, the Moon with its surface and an orbit ring.
 * (No Pacific pin: Columbia splashed down there but was recovered, and is in
 * the museum.)
 * Each place lights up, with a count, once something resting there has been
 * collected. It appears small inside the album and fills the screen in the
 * epilogue, where every pin is lit.
 */

export interface RestingMap {
  element: SVGSVGElement;
  /** Lights the pins for these collected monument ids. */
  update(collected: readonly string[]): void;
}

interface Pin {
  place: RestingPlace;
  x: number;
  y: number;
}

const PINS: Pin[] = [
  { place: 'sun-orbit', x: 62, y: 70 },
  { place: 'atlantic', x: 196, y: 162 },
  { place: 'earth-sky', x: 238, y: 98 },
  { place: 'museum', x: 150, y: 212 },
  { place: 'moon-surface', x: 386, y: 132 },
  { place: 'moon-orbit', x: 430, y: 72 },
];

const NS = 'http://www.w3.org/2000/svg';

/** Gradient ids must be unique per document, and the album and epilogue each have a map. */
let instances = 0;

export function createRestingMap(title = 'Where the pieces rest today'): RestingMap {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 480 250');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', title);
  svg.classList.add('resting-map');
  svg.style.cssText = 'width: 100%; height: auto; display: block;';

  const uid = `rm${(instances += 1)}`;
  svg.innerHTML = `
    <defs>
      <radialGradient id="${uid}-sun" cx="50%" cy="50%" r="50%">
        <stop offset="0" stop-color="#FFF3C4"/><stop offset="0.6" stop-color="#FFC24A"/><stop offset="1" stop-color="#FF9A1F"/>
      </radialGradient>
      <radialGradient id="${uid}-earth" cx="40%" cy="35%" r="70%">
        <stop offset="0" stop-color="#6FB6F2"/><stop offset="1" stop-color="#1E5FA8"/>
      </radialGradient>
      <radialGradient id="${uid}-moon" cx="40%" cy="35%" r="70%">
        <stop offset="0" stop-color="#F1ECDD"/><stop offset="1" stop-color="#A9A3BA"/>
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="480" height="250" rx="18" fill="#141830"/>
    <g fill="#fff" opacity="0.6">
      <circle cx="120" cy="30" r="1.2"/><circle cx="300" cy="24" r="1"/><circle cx="350" cy="210" r="1.3"/>
      <circle cx="40" cy="200" r="1"/><circle cx="460" cy="180" r="1.1"/><circle cx="270" cy="230" r="0.9"/>
    </g>
    <!-- The Sun, and the S-IVB's orbit round it -->
    <circle cx="40" cy="44" r="26" fill="url(#${uid}-sun)"/>
    <path d="M10 112 Q 70 40 130 22" stroke="#FFC24A" stroke-width="2" stroke-dasharray="5 6" fill="none" opacity="0.8"/>
    <!-- Earth, its sky, its oceans -->
    <circle cx="196" cy="140" r="62" fill="none" stroke="#7fc4ff" stroke-width="10" opacity="0.18"/>
    <circle cx="196" cy="140" r="52" fill="url(#${uid}-earth)"/>
    <path d="M160 120 q14 -16 30 -8 q6 10 -5 18 q-10 4 -10 16 q-9 3 -15 -6 z" fill="#58B368"/>
    <path d="M214 104 q14 2 22 16 q-5 8 -15 5 q-9 -6 -7 -21 z" fill="#58B368"/>
    <!-- Museum -->
    <g transform="translate(132 196)">
      <rect x="0" y="12" width="36" height="20" fill="#E9DFC9"/>
      <path d="M-4 12 L18 0 L40 12 Z" fill="#F4ECD9"/>
      <rect x="5" y="15" width="4" height="14" fill="#BFB29A"/><rect x="16" y="15" width="4" height="14" fill="#BFB29A"/><rect x="27" y="15" width="4" height="14" fill="#BFB29A"/>
    </g>
    <!-- The way out and back -->
    <path d="M250 128 C 300 70, 330 80, 362 116" stroke="#7fc4ff" stroke-width="2" fill="none" opacity="0.55"/>
    <path d="M362 150 C 330 190, 290 196, 250 160" stroke="#ffc07a" stroke-width="2" fill="none" opacity="0.55"/>
    <!-- Moon and its orbit ring -->
    <ellipse cx="400" cy="132" rx="52" ry="20" fill="none" stroke="#C9C4D6" stroke-width="1.5" stroke-dasharray="4 5" opacity="0.7"/>
    <circle cx="400" cy="132" r="30" fill="url(#${uid}-moon)"/>
    <circle cx="390" cy="124" r="4" fill="#B8B1C7"/><circle cx="412" cy="142" r="5" fill="#B8B1C7"/>
  `;

  const pins = new Map<RestingPlace, { dot: SVGCircleElement; badge: SVGTextElement; label: SVGTextElement }>();
  for (const pin of PINS) {
    const g = document.createElementNS(NS, 'g');
    g.dataset.place = pin.place;
    g.classList.add('rm-pin');
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', String(pin.x));
    dot.setAttribute('cy', String(pin.y));
    dot.setAttribute('r', '11');
    dot.setAttribute('stroke', '#fff');
    dot.setAttribute('stroke-width', '2.5');
    const badge = document.createElementNS(NS, 'text');
    badge.setAttribute('x', String(pin.x));
    badge.setAttribute('y', String(pin.y + 5));
    badge.setAttribute('text-anchor', 'middle');
    badge.setAttribute('font-size', '13');
    badge.setAttribute('font-weight', '800');
    badge.setAttribute('font-family', story.font);
    const label = document.createElementNS(NS, 'text');
    label.setAttribute('x', String(pin.x));
    label.setAttribute('y', String(pin.y - 16));
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-size', '12');
    label.setAttribute('font-weight', '700');
    label.setAttribute('font-family', story.font);
    label.setAttribute('fill', '#fff');
    label.textContent = RESTING_PLACES[pin.place].label;
    g.append(dot, badge, label);
    svg.append(g);
    pins.set(pin.place, { dot, badge, label });
  }

  const update = (collected: readonly string[]): void => {
    const counts = new Map<RestingPlace, number>();
    for (const m of MONUMENTS) {
      if (collected.includes(m.id)) counts.set(m.restingPlace, (counts.get(m.restingPlace) ?? 0) + 1);
    }
    for (const [place, el] of pins) {
      const n = counts.get(place) ?? 0;
      el.dot.setAttribute('fill', n > 0 ? story.warm : '#3A3F5C');
      el.dot.setAttribute('opacity', n > 0 ? '1' : '0.7');
      el.badge.textContent = n > 0 ? String(n) : '?';
      el.badge.setAttribute('fill', n > 0 ? story.ink : '#9AA0BF');
      el.label.setAttribute('opacity', n > 0 ? '1' : '0.45');
      (el.dot.parentNode as SVGGElement).dataset.lit = n > 0 ? 'true' : 'false';
    }
  };
  update([]);

  return { element: svg, update };
}

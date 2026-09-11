// The base you rebuild. Supplies are the only currency and this is the only
// place they are ever spent.

import { heroSvg } from './hero.js';

// Each structure draws from a baseline at local y = 0, growing upward.
// Stage 0 is rubble, stage 1 is a frame, stage 2 is finished and coloured.
const ART = {
  waterTower: (s) => s === 0
    ? `<path d="M-16 0 L-8 -11 L2 -5 L12 -13 L18 0Z" fill="#5a6780"/>`
    : `<path d="M-12 0 L-6 -30 M12 0 L6 -30" stroke="${s === 1 ? '#64748b' : '#94a3b8'}" stroke-width="3"/>
       <rect x="-15" y="-50" width="30" height="21" rx="5"
             fill="${s === 1 ? 'none' : '#38bdf8'}" stroke="${s === 1 ? '#64748b' : '#0ea5e9'}" stroke-width="3"/>
       ${s === 2 ? `<path d="M-17 -50 L0 -60 L17 -50Z" fill="#0ea5e9"/>` : ''}`,

  garden: (s) => s === 0
    ? `<path d="M-16 0 Q-10 -6 -4 0 Q2 -7 8 0 Q13 -5 17 0Z" fill="#5a6780"/>`
    : `<rect x="-17" y="-9" width="34" height="9" rx="3" fill="#78350f"/>
       ${s >= 1 ? `<path d="M-10 -9 L-10 -20 M0 -9 L0 -22 M10 -9 L10 -19"
                          stroke="#22c55e" stroke-width="3" stroke-linecap="round"/>` : ''}
       ${s === 2 ? `<circle cx="-10" cy="-23" r="4" fill="#ef4444"/>
                    <circle cx="0" cy="-25" r="4" fill="#f97316"/>
                    <circle cx="10" cy="-22" r="4" fill="#ef4444"/>` : ''}`,

  watchtower: (s) => s === 0
    ? `<path d="M-14 0 L-4 -9 L6 -3 L16 0Z" fill="#5a6780"/>`
    : `<path d="M-11 0 L-5 -34 L5 -34 L11 0Z"
             fill="${s === 1 ? 'none' : '#a16207'}" stroke="${s === 1 ? '#64748b' : '#854d0e'}" stroke-width="3"/>
       ${s === 2 ? `<rect x="-13" y="-46" width="26" height="13" rx="3" fill="#ca8a04"/>
                    <path d="M-15 -46 L0 -55 L15 -46Z" fill="#854d0e"/>` : ''}`,

  radioMast: (s) => s === 0
    ? `<path d="M-16 0 L18 -4 L16 0Z" fill="#5a6780"/>
       <path d="M-14 -2 L12 -8" stroke="#5a6780" stroke-width="4"/>`
    : `<path d="M0 0 L0 -52" stroke="${s === 1 ? '#64748b' : '#cbd5e1'}" stroke-width="4"/>
       <path d="M-10 0 L0 -30 L10 0" fill="none" stroke="${s === 1 ? '#64748b' : '#94a3b8'}" stroke-width="2.5"/>
       ${s === 2 ? `<circle cx="0" cy="-56" r="4" fill="#ef4444"/>
                    <path d="M-9 -49 Q0 -58 9 -49" fill="none" stroke="#38bdf8" stroke-width="2.5"/>` : ''}`,

  gate: (s) => s === 0
    ? `<path d="M-17 0 L-12 -8 L-6 -2 Z M4 0 L10 -9 L16 0Z" fill="#5a6780"/>`
    : `<rect x="-18" y="-26" width="36" height="26" rx="3"
             fill="${s === 1 ? 'none' : '#b45309'}" stroke="${s === 1 ? '#64748b' : '#78350f'}" stroke-width="3"/>
       ${s === 2 ? `<path d="M-18 -13 L18 -13 M0 -26 L0 0" stroke="#78350f" stroke-width="3"/>` : ''}`,

  playground: (s) => s === 0
    ? `<path d="M-15 0 L-6 -5 L4 -2 L15 0Z" fill="#5a6780"/>`
    : `<path d="M-14 0 L-8 -28 L8 -28 L14 0" fill="none"
             stroke="${s === 1 ? '#64748b' : '#f43f5e'}" stroke-width="3.5"/>
       <path d="M-8 -28 L8 -28" stroke="${s === 1 ? '#64748b' : '#f43f5e'}" stroke-width="3.5"/>
       ${s === 2 ? `<path d="M-4 -28 L-4 -14 M4 -28 L4 -14" stroke="#fbbf24" stroke-width="2.5"/>
                    <rect x="-7" y="-15" width="14" height="3.5" rx="1.5" fill="#fbbf24"/>` : ''}`,

  // ── Sunnyside: plant beds ──
  // Stage 0 is bare soil, 1 is a sprout, 2 is the grown plant. Every bed shares
  // the sprout so "something is happening here" reads the same across the lawn.
  sunbud: (s) => s === 0
    ? soil()
    : s === 1
      ? sprout()
      : `${stem(-26)}
         <circle cx="0" cy="-30" r="9" fill="#facc15"/>
         ${petals('#fbbf24', -30, 9)}
         <circle cx="0" cy="-30" r="4.5" fill="#78350f"/>`,

  podPopper: (s) => s === 0
    ? soil()
    : s === 1
      ? sprout()
      : `${stem(-22)}
         <path d="M-12 -26 Q0 -37 12 -26 Q0 -17 -12 -26Z" fill="#16a34a"/>
         <circle cx="-5.5" cy="-26" r="3.4" fill="#4ade80"/>
         <circle cx="0.5" cy="-27" r="3.4" fill="#4ade80"/>
         <circle cx="6.5" cy="-26" r="3.4" fill="#4ade80"/>`,

  oldAcorn: (s) => s === 0
    ? soil()
    : s === 1
      ? sprout()
      : `<path d="M-11 0 Q-13 -18 0 -20 Q13 -18 11 0Z" fill="#b45309"/>
         <path d="M-12 -17 Q0 -25 12 -17 Q0 -21 -12 -17Z" fill="#78350f"/>
         <circle cx="-4" cy="-9" r="1.7" fill="#451a03"/>
         <circle cx="4" cy="-9" r="1.7" fill="#451a03"/>`,

  frostberry: (s) => s === 0
    ? soil()
    : s === 1
      ? sprout()
      : `${stem(-20)}
         <circle cx="-5" cy="-24" r="6" fill="#60a5fa"/>
         <circle cx="5" cy="-22" r="6" fill="#3b82f6"/>
         <circle cx="0" cy="-31" r="6" fill="#93c5fd"/>
         <path d="M0 -38 L0 -34 M-3 -36 L3 -34 M3 -36 L-3 -34"
               stroke="#e0f2fe" stroke-width="1.6" stroke-linecap="round"/>`,

  thumper: (s) => s === 0
    ? soil()
    : s === 1
      ? sprout()
      : `<ellipse cx="0" cy="-11" rx="15" ry="11" fill="#65a30d"/>
         <path d="M-11 -15 Q0 -19 11 -15 M-12 -9 Q0 -5 12 -9"
               stroke="#3f6212" stroke-width="1.8" fill="none"/>
         <circle cx="-5" cy="-13" r="1.8" fill="#1a2e05"/>
         <circle cx="5" cy="-13" r="1.8" fill="#1a2e05"/>`,

  bigRosie: (s) => s === 0
    ? soil()
    : s === 1
      ? sprout()
      : `${stem(-28)}
         ${petals('#f43f5e', -33, 11)}
         <circle cx="0" cy="-33" r="8" fill="#fb7185"/>
         <circle cx="0" cy="-33" r="3.5" fill="#9f1239"/>
         <path d="M-3 -16 Q-10 -20 -12 -13" fill="none" stroke="#16a34a" stroke-width="3"
               stroke-linecap="round"/>`
};

// Shared plant parts, so the six beds look like one set rather than six drawings.
const soil = () => `<ellipse cx="0" cy="-2" rx="15" ry="5" fill="#4a3728"/>
                    <circle cx="-6" cy="-3" r="1.4" fill="#3a2a1e"/>
                    <circle cx="5" cy="-4" r="1.2" fill="#3a2a1e"/>`;

const sprout = () => `${soil()}
                      <path d="M0 -3 L0 -13" stroke="#22c55e" stroke-width="2.6"
                            stroke-linecap="round"/>
                      <path d="M0 -11 Q-7 -14 -8 -8" fill="#22c55e"/>
                      <path d="M0 -13 Q7 -17 8 -11" fill="#4ade80"/>`;

const stem = (top) => `${soil()}
                       <path d="M0 -2 L0 ${top}" stroke="#16a34a" stroke-width="3.4"
                             stroke-linecap="round"/>
                       <path d="M0 ${top + 12} Q9 ${top + 8} 10 ${top + 15}" fill="#16a34a"/>`;

/** Eight petals around a centre — used by both flowering plants. */
const petals = (fill, cy, r) =>
  Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    return `<ellipse cx="${(Math.cos(angle) * r).toFixed(1)}"
                     cy="${(cy + Math.sin(angle) * r).toFixed(1)}"
                     rx="5.5" ry="3.6" fill="${fill}"
                     transform="rotate(${((angle * 180) / Math.PI).toFixed(0)}
                                ${(Math.cos(angle) * r).toFixed(1)}
                                ${(cy + Math.sin(angle) * r).toFixed(1)})"/>`;
  }).join('');

/** Draws the town, with the runner standing in it wearing whatever gear he's earned. */
export function sceneSvg(structures, stages, gear) {
  const slots = structures
    .map((structure, i) => {
      const x = 34 + i * 58;
      const stage = stages[structure.id] ?? 0;
      const art = ART[structure.id]?.(stage) ?? '';
      // An untouched plot gets a dashed outline, so "there is something to build
      // here" is obvious without reading the list below.
      const placeholder = stage === 0
        ? `<rect x="-20" y="-28" width="40" height="28" rx="4" fill="none"
                 stroke="#d9f0dd" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.7"/>`
        : '';
      return `<g transform="translate(${x} 112)">
                <ellipse cx="0" cy="2" rx="20" ry="4" fill="#2f5d3a"/>
                ${placeholder}${art}
              </g>`;
    })
    .join('');

  return `
<svg viewBox="0 0 360 212" role="img" aria-label="The lawn">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3b6ea5"/>
      <stop offset="100%" stop-color="#87b8dd"/>
    </linearGradient>
  </defs>
  <rect width="360" height="212" fill="url(#sky)"/>
  <circle cx="318" cy="28" r="24" fill="#fde047" opacity="0.3"/>
  <circle cx="318" cy="28" r="16" fill="#fde047"/>
  <!-- Hedge line well above the grass so the plants read as standing on the lawn
       rather than as bumps on the horizon. -->
  <path d="M0 82 Q70 60 140 80 Q220 100 300 74 L360 86 L360 212 L0 212Z" fill="#2f5d3a"/>
  <rect y="108" width="360" height="104" fill="#3f7a43"/>
  <path d="M0 108 h360" stroke="#4d9150" stroke-width="3"/>
  ${slots}
  <!-- The runner stands in the lawn he grew, in a foreground strip below the beds
       so he never overlaps a plant's head. -->
  <g transform="translate(180 122) scale(0.55)">${heroStage(gear)}</g>
</svg>`;
}

// The hero SVG has its own viewBox, so it gets embedded as inner shapes instead.
function heroStage(gear) {
  return heroSvg(gear).replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

export function renderBuildList(pack, state, currencyIcon = '📦') {
  return pack.base.structures
    .map((structure) => {
      const stage = state.structures[structure.id] ?? 0;
      const isDone = stage >= structure.stages.length - 1;
      const cost = isDone ? null : structure.costs[stage + 1];
      const affordable = !isDone && state.supplies >= cost;

      return `
<li class="build-row ${isDone ? 'is-done' : ''}">
  <span class="build-icon">${structure.icon}</span>
  <span class="build-text">
    <span class="build-name">${structure.name}</span>
    <span class="build-stage">${structure.stages[stage]}</span>
  </span>
  ${isDone
    ? ''
    : `<button class="build-btn" data-build="${structure.id}" ${affordable ? '' : 'disabled'}>
         ${cost} ${currencyIcon}
       </button>`}
</li>`;
    })
    .join('');
}

export function totalStages(pack) {
  return pack.base.structures.reduce((sum, s) => sum + s.stages.length - 1, 0);
}

export function builtStages(pack, state) {
  return pack.base.structures.reduce((sum, s) => sum + (state.structures[s.id] ?? 0), 0);
}

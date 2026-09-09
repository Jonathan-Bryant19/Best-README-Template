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
                    <rect x="-7" y="-15" width="14" height="3.5" rx="1.5" fill="#fbbf24"/>` : ''}`
};

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
                 stroke="#8496b3" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.75"/>`
        : '';
      return `<g transform="translate(${x} 126)">
                <ellipse cx="0" cy="2" rx="20" ry="4" fill="#26331f"/>
                ${placeholder}${art}
              </g>`;
    })
    .join('');

  return `
<svg viewBox="0 0 360 190" role="img" aria-label="Riverbend">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e3a5f"/>
      <stop offset="100%" stop-color="#3b4d6b"/>
    </linearGradient>
  </defs>
  <rect width="360" height="190" fill="url(#sky)"/>
  <circle cx="316" cy="30" r="15" fill="#fde68a" opacity="0.85"/>
  <!-- Hills sit well above the grass line so the structures read as buildings on
       the ground rather than bumps on the horizon. -->
  <path d="M0 96 Q70 74 140 94 Q220 114 300 88 L360 100 L360 190 L0 190Z" fill="#243244"/>
  <rect y="126" width="360" height="64" fill="#2f4032"/>
  ${slots}
  <!-- the runner stands in the town he's rebuilding, in front of the structures -->
  <g transform="translate(180 100) scale(0.52)">${heroStage(gear)}</g>
</svg>`;
}

// The hero SVG has its own viewBox, so it gets embedded as inner shapes instead.
function heroStage(gear) {
  return heroSvg(gear).replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

export function renderBuildList(pack, state) {
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
         ${cost} 📦
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

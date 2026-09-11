// The runner. A flat SVG built in layers so story-granted gear can simply be
// switched on — no art pipeline, no sprite sheets.

const GEAR_LAYERS = {
  backpack: `
    <g data-gear="backpack">
      <rect x="24" y="58" width="12" height="30" rx="5" fill="#b45309"/>
      <rect x="26" y="66" width="8" height="4" rx="2" fill="#78350f"/>
    </g>`,
  boots: `
    <g data-gear="boots">
      <rect x="34" y="130" width="18" height="13" rx="5" fill="#7c3f1d"/>
      <rect x="50" y="130" width="18" height="13" rx="5" fill="#7c3f1d"/>
    </g>`,
  jacket: `
    <g data-gear="jacket">
      <rect x="34" y="54" width="34" height="48" rx="11" fill="#ef4444"/>
      <rect x="48" y="54" width="6" height="48" fill="#b91c1c"/>
    </g>`,
  radio: `
    <g data-gear="radio">
      <rect x="64" y="88" width="10" height="14" rx="3" fill="#334155"/>
      <rect x="68" y="80" width="2" height="9" fill="#94a3b8"/>
    </g>`,
  whistle: `
    <g data-gear="whistle">
      <path d="M42 56 Q51 70 60 56" fill="none" stroke="#eab308" stroke-width="2.5"/>
      <circle cx="51" cy="69" r="4.5" fill="#eab308"/>
    </g>`,
  headlamp: `
    <g data-gear="headlamp">
      <rect x="32" y="24" width="38" height="7" rx="3.5" fill="#1f2937"/>
      <circle cx="51" cy="27.5" r="6" fill="#fde047"/>
      <path d="M51 27 L73 19 L73 36 Z" fill="#fde047" opacity="0.2"/>
    </g>`,

  // ── Sunnyside: the garden kit ──
  // Tools are spread deliberately — trowel in the left hand, can on the right hip,
  // barrow parked low and right — so a runner wearing all six still reads clearly.
  wateringCan: `
    <g data-gear="wateringCan">
      <rect x="74" y="100" width="16" height="15" rx="3" fill="#94a3b8"/>
      <path d="M90 103 L98 98 L98 103 L90 108Z" fill="#94a3b8"/>
      <path d="M74 103 Q68 107 74 112" fill="none" stroke="#64748b" stroke-width="2.5"/>
      <rect x="78" y="97" width="8" height="3" rx="1.5" fill="#64748b"/>
    </g>`,
  gloves: `
    <g data-gear="gloves">
      <circle cx="28.5" cy="94" r="7" fill="#84cc16"/>
      <circle cx="73.5" cy="94" r="7" fill="#84cc16"/>
    </g>`,
  sunHat: `
    <g data-gear="sunHat">
      <ellipse cx="51" cy="26" rx="30" ry="7" fill="#eab308"/>
      <path d="M36 25 Q51 6 66 25Z" fill="#facc15"/>
      <rect x="36" y="22" width="30" height="4" rx="2" fill="#ca8a04"/>
    </g>`,
  trowel: `
    <g data-gear="trowel">
      <rect x="26" y="96" width="4.5" height="13" rx="2.2" fill="#78350f"/>
      <path d="M24 109 Q28.5 120 33 109Z" fill="#cbd5e1"/>
    </g>`,
  barrow: `
    <g data-gear="barrow">
      <path d="M70 120 L98 120 L93 132 L76 132Z" fill="#f97316"/>
      <path d="M70 120 L64 113" stroke="#78350f" stroke-width="3" stroke-linecap="round"/>
      <circle cx="94" cy="138" r="5.5" fill="#1f2937"/>
    </g>`
};

/**
 * @param {string[]} owned  gear ids the player has collected
 * @returns {string} SVG markup
 */
export function heroSvg(owned = []) {
  const has = (id) => owned.includes(id);
  const layer = (id) => (has(id) ? GEAR_LAYERS[id] : '');

  return `
<svg viewBox="0 0 102 152" role="img" aria-label="Your runner">
  ${layer('barrow')}
  ${layer('backpack')}

  <!-- legs -->
  <rect x="37" y="98" width="12" height="36" rx="6" fill="#1e293b"/>
  <rect x="53" y="98" width="12" height="36" rx="6" fill="#1e293b"/>

  ${has('boots')
    ? GEAR_LAYERS.boots
    : `<rect x="35" y="130" width="16" height="11" rx="4" fill="#e2e8f0"/>
       <rect x="51" y="130" width="16" height="11" rx="4" fill="#e2e8f0"/>`}

  <!-- torso: the jacket replaces the shirt when owned -->
  ${has('jacket')
    ? GEAR_LAYERS.jacket
    : `<rect x="34" y="54" width="34" height="48" rx="11" fill="#38bdf8"/>`}

  <!-- arms, a shade darker than the torso so they don't merge into it -->
  <rect x="23" y="58" width="11" height="34" rx="5.5" fill="${has('jacket') ? '#dc2626' : '#0ea5e9'}"/>
  <rect x="68" y="58" width="11" height="34" rx="5.5" fill="${has('jacket') ? '#dc2626' : '#0ea5e9'}"/>
  <!-- gloves cover the bare hands when owned -->
  ${has('gloves')
    ? GEAR_LAYERS.gloves
    : `<circle cx="28.5" cy="94" r="6" fill="#f5c9a4"/>
       <circle cx="73.5" cy="94" r="6" fill="#f5c9a4"/>`}

  ${layer('radio')}
  ${layer('whistle')}
  ${layer('trowel')}
  ${layer('wateringCan')}

  <!-- head -->
  <circle cx="51" cy="34" r="18" fill="#f5c9a4"/>
  <path d="M33 30 Q51 8 69 30 Q60 22 51 24 Q42 22 33 30Z" fill="#5b3a21"/>
  <circle cx="44" cy="35" r="2.4" fill="#1f2937"/>
  <circle cx="58" cy="35" r="2.4" fill="#1f2937"/>
  <path d="M45 42 Q51 47 57 42" fill="none" stroke="#1f2937" stroke-width="2.2" stroke-linecap="round"/>

  ${layer('headlamp')}
  ${layer('sunHat')}
</svg>`;
}

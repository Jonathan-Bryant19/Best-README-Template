// Player save state. One localStorage object, no server, nothing leaves the phone.

// Do not rename this. It carries the old theme's name because it is the key a
// real save already lives under on a real phone — renaming it silently wipes
// that progress. The field names below are the same deal: they're deliberately
// theme-neutral internals, and what a pack *calls* them comes from its
// `vocabulary` block instead.
const KEY = 'riverbend.save.v1';

function defaults() {
  return {
    version: 1,
    // Supplies are the only currency, and they are only ever spent on the base.
    supplies: 0,
    // structures: { waterTower: 2 }  -> stage index reached
    structures: {},
    // gear is story-granted, never bought: ['headlamp', 'backpack']
    gear: [],
    // progress: { sunnyside: { completed: ['ch01'] } }
    progress: {},
    // one entry per finished run, newest last
    history: [],
    settings: { dev: false, speed: 1 }
  };
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    // Shallow-merge onto defaults so a save written by an older build still boots.
    return { ...defaults(), ...parsed, settings: { ...defaults().settings, ...(parsed.settings || {}) } };
  } catch (err) {
    console.warn('Save file unreadable, starting fresh.', err);
    return defaults();
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    // Private browsing, full storage, etc. The run itself still works.
    console.warn('Could not write save file.', err);
  }
  return state;
}

export function update(fn) {
  const state = load();
  fn(state);
  return save(state);
}

export function reset() {
  try {
    localStorage.removeItem(KEY);
  } catch (err) {
    console.warn('Could not clear save file.', err);
  }
  return defaults();
}

export function completedChapters(state, packId) {
  return state.progress?.[packId]?.completed ?? [];
}

/** First chapter in the pack that hasn't been finished yet, or the last one if all are done. */
export function nextChapter(state, pack) {
  const done = completedChapters(state, pack.id);
  return pack.chapters.find((ch) => !done.includes(ch.id)) ?? pack.chapters[pack.chapters.length - 1];
}

/**
 * Credits whatever was collected. A run ended early still keeps its supplies —
 * a six-year-old who needs to stop shouldn't lose the things he found — but the
 * chapter only counts as finished when `complete` is true.
 */
export function recordRun(packId, chapterId, { supplies, gear, seconds, complete }) {
  return update((state) => {
    const progress = (state.progress[packId] ??= { completed: [] });
    if (complete && !progress.completed.includes(chapterId)) progress.completed.push(chapterId);

    state.supplies += supplies;
    for (const item of gear) if (!state.gear.includes(item)) state.gear.push(item);
    state.history.push({ packId, chapterId, supplies, gear, seconds, complete, at: Date.now() });
  });
}

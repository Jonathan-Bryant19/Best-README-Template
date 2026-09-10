// Screen routing and wiring. Everything interesting lives in engine.js,
// audio.js and base.js — this file just connects them to the DOM.

import * as store from './storage.js';
import * as packs from './packs.js';
import { RunSession, INTERVAL_LABELS } from './engine.js';
import { TrackPlayback, ClipPlayback, setupMediaSession } from './audio.js';
import { heroSvg } from './hero.js';
import { sceneSvg, renderBuildList, totalStages, builtStages } from './base.js';

const PACK_ID = 'riverbend';

// Must match the CACHE name in sw.js.
const AUDIO_CACHE = 'riverbend-v1';

const $ = (id) => document.getElementById(id);

const app = {
  pack: null,
  chapter: null,
  timeline: null,
  session: null,
  wakeLock: null,
  lastCollected: null
};

// ───────────────────────── helpers ─────────────────────────

function showScreen(name) {
  for (const section of document.querySelectorAll('.screen')) {
    section.classList.toggle('is-active', section.id === `screen-${name}`);
  }
  window.scrollTo(0, 0);
}

function formatTime(seconds) {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function iconFor(item) {
  if (item.kind === 'gear') {
    return app.pack.gear.find((g) => g.id === item.id)?.icon ?? '⭐';
  }
  return { pipe: '🔧', bolts: '🔩', wrench: '🔧', plank: '🪵' }[item.id] ?? '📦';
}

// ───────────────────────── home ─────────────────────────

function renderHome() {
  const state = store.load();
  const chapter = store.nextChapter(state, app.pack);
  const done = store.completedChapters(state, app.pack.id);

  $('supply-count').textContent = state.supplies;
  $('home-hero').innerHTML = heroSvg(state.gear);

  const index = app.pack.chapters.findIndex((c) => c.id === chapter.id);
  $('chapter-eyebrow').textContent = `Chapter ${index + 1}`;
  $('chapter-title').textContent = chapter.title;
  $('chapter-blurb').textContent = chapter.blurb ?? '';
  $('chapter-length').textContent = `${chapter.minutes ?? '?'} min`;
  $('progress-summary').textContent = `${done.length}/${app.pack.chapters.length} chapters`;

  $('btn-dev').textContent = state.settings.dev ? 'dev tools: on' : 'dev tools';
}

// ───────────────────────── run ─────────────────────────

async function startRun() {
  const state = store.load();
  const usingTrack = Boolean(app.timeline);

  const playback = usingTrack
    ? new TrackPlayback(packs.trackUrl(PACK_ID, app.chapter.id))
    : new ClipPlayback();

  app.session = new RunSession(app.chapter, {
    playback,
    timeline: app.timeline,
    onEvent: handleRunEvent
  });

  $('run-total').textContent = formatTime(app.session.duration);
  $('subtitle').textContent = '';
  $('toast').classList.remove('is-visible');
  $('interval-label').textContent = 'GET READY';
  $('interval-countdown').textContent = '--';
  $('screen-run').dataset.interval = 'warmup';
  $('btn-pause').textContent = 'Pause';
  $('dev-panel').hidden = !state.settings.dev;
  setSpeed(1);

  showScreen('run');

  if (usingTrack) {
    setupMediaSession({
      title: app.chapter.title,
      album: app.pack.title,
      onPlay: () => app.session.resume(),
      onPause: () => app.session.pause()
    });
  }

  try {
    await app.session.start();
  } catch (err) {
    console.error('Playback would not start.', err);
    $('subtitle').textContent = 'Audio could not start — tap Pause then Resume to try again.';
  }

  requestWakeLock();
}

function handleRunEvent(event) {
  switch (event.type) {
    case 'tick': {
      $('run-elapsed').textContent = formatTime(event.t);
      $('run-progress-fill').style.width = `${Math.min(100, (event.t / event.duration) * 100)}%`;
      if (event.interval) $('interval-countdown').textContent = Math.ceil(event.remaining);
      break;
    }

    case 'interval': {
      const { interval } = event;
      $('screen-run').dataset.interval = interval.type;
      $('interval-label').textContent = interval.label;

      const next = app.session.intervals[app.session.intervals.indexOf(interval) + 1];
      $('interval-next').textContent = next ? `next: ${INTERVAL_LABELS[next.type] ?? next.type}` : 'last one!';
      break;
    }

    case 'beat': {
      $('subtitle').textContent = event.beat.text;
      if (event.beat.type === 'supply' || event.beat.type === 'gear') {
        if (!event.silent) showPickup(event.beat);
      }
      break;
    }

    case 'finish':
      finishRun(event, true);
      break;
  }
}

let toastTimer = null;
function flashToast(icon, text, ms = 3200) {
  $('toast-icon').textContent = icon;
  $('toast-text').textContent = text;
  $('toast').classList.add('is-visible');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('is-visible'), ms);
}

function showPickup(beat) {
  const item = { kind: beat.type === 'gear' ? 'gear' : 'supply', id: beat.item };
  flashToast(
    iconFor(item),
    beat.type === 'gear' ? `${beat.name} unlocked!` : `+${beat.count ?? 1} ${beat.name ?? beat.item}`
  );
}

function finishRun(event, complete) {
  releaseWakeLock();
  app.session?.stop();

  const collected = event.collected ?? app.session.collected;
  const seconds = event.seconds ?? app.session.playback.time();
  app.lastCollected = collected;

  store.recordRun(PACK_ID, app.chapter.id, {
    supplies: collected.supplies,
    gear: collected.gear,
    seconds,
    complete
  });

  $('post-title').textContent = complete ? 'You made it back!' : 'Run stopped';
  $('post-stats').textContent = `${formatTime(seconds)} · ${app.chapter.title}`;
  $('post-loot').innerHTML = collected.items.length
    ? collected.items
        .map(
          (item) => `
<li class="${item.kind === 'gear' ? 'is-gear' : ''}">
  <span class="loot-icon">${iconFor(item)}</span>
  <span>
    ${item.name}${item.count > 1 ? ` ×${item.count}` : ''}
    <span class="loot-sub">${item.kind === 'gear' ? 'new gear — yours for good' : 'supplies for the base'}</span>
  </span>
</li>`
        )
        .join('')
    : '<li><span class="loot-icon">🤷</span><span>Nothing found this time</span></li>';

  showScreen('post');
  renderHome();
}

function endRunEarly() {
  if (!app.session) return;
  finishRun({ collected: app.session.collected, seconds: app.session.playback.time() }, false);
}

// ───────────────────────── base ─────────────────────────

function renderBase() {
  const state = store.load();
  const { structures } = app.pack.base;

  $('base-title').textContent = app.pack.base.name;
  $('base-supply-count').textContent = state.supplies;
  $('base-scene').innerHTML = sceneSvg(structures, state.structures, state.gear);
  $('build-list').innerHTML = renderBuildList(app.pack, state);
  $('base-progress').textContent = `${builtStages(app.pack, state)} of ${totalStages(app.pack)} things fixed`;
}

function build(structureId) {
  const structure = app.pack.base.structures.find((s) => s.id === structureId);
  if (!structure) return;

  const state = store.load();
  const stage = state.structures[structureId] ?? 0;
  if (stage >= structure.stages.length - 1) return;

  const cost = structure.costs[stage + 1];
  if (state.supplies < cost) return;

  store.update((s) => {
    s.supplies -= cost;
    s.structures[structureId] = stage + 1;
  });

  renderBase();
  renderHome();
}

// ───────────────────────── screen wake lock ─────────────────────────

async function requestWakeLock() {
  try {
    app.wakeLock = await navigator.wakeLock?.request('screen');
  } catch (err) {
    // Unsupported or refused — the run still works, the screen just may sleep.
    console.info('Screen wake lock unavailable.', err);
  }
}

function releaseWakeLock() {
  app.wakeLock?.release?.().catch(() => {});
  app.wakeLock = null;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && app.session?.running) requestWakeLock();
});

// ───────────────────────── dev tools ─────────────────────────

function setSpeed(speed) {
  app.session?.playback.setRate(speed);
  for (const btn of document.querySelectorAll('[data-speed]')) {
    btn.setAttribute('aria-pressed', String(Number(btn.dataset.speed) === speed));
  }
}

// ───────────────────────── offline audio ─────────────────────────

/**
 * Pulls the whole chapter track into the cache with an ordinary request.
 * Audio elements fetch by range and a partial response can't be stored, so
 * without this the track would never end up cached — and a jog out of signal
 * would be a silent one.
 */
async function prefetchTrack(chapterId) {
  if (!app.timeline || !('caches' in window)) return;
  try {
    const url = packs.trackUrl(PACK_ID, chapterId);
    const cache = await caches.open(AUDIO_CACHE);
    if (!(await cache.match(url))) await cache.add(url);
  } catch (err) {
    console.info('Could not pre-cache the chapter audio.', err);
  }
}

// ───────────────────────── boot ─────────────────────────

function wireEvents() {
  $('btn-start').addEventListener('click', startRun);

  $('btn-pause').addEventListener('click', () => {
    if (!app.session) return;
    if (app.session.running) {
      app.session.pause();
      $('btn-pause').textContent = 'Resume';
      releaseWakeLock();
    } else {
      app.session.resume();
      $('btn-pause').textContent = 'Pause';
      requestWakeLock();
    }
  });

  $('btn-skip-interval').addEventListener('click', () => {
    if (!app.session || app.session.finished) return;
    const next = app.session.skipInterval();
    // The label changes on its own a moment later; this confirms the tap landed,
    // which matters when you're moving and not looking closely.
    flashToast('⏭', next ? `Skipped to ${next.label.replace('!', '')}` : 'Finishing up', 1800);
  });

  $('btn-end').addEventListener('click', endRunEarly);
  $('btn-to-base').addEventListener('click', () => { renderBase(); showScreen('base'); });
  $('btn-post-home').addEventListener('click', () => { renderHome(); showScreen('home'); });
  $('btn-base').addEventListener('click', () => { renderBase(); showScreen('base'); });
  $('btn-base-back').addEventListener('click', () => { renderHome(); showScreen('home'); });

  $('build-list').addEventListener('click', (event) => {
    const id = event.target.closest('[data-build]')?.dataset.build;
    if (id) build(id);
  });

  $('btn-dev').addEventListener('click', () => {
    const state = store.update((s) => { s.settings.dev = !s.settings.dev; });
    $('btn-dev').textContent = state.settings.dev ? 'dev tools: on' : 'dev tools';
    $('dev-panel').hidden = !state.settings.dev;
  });

  $('dev-panel').addEventListener('click', (event) => {
    const speed = event.target.dataset.speed;
    if (speed) setSpeed(Number(speed));
  });

  $('btn-skip').addEventListener('click', () => app.session?.skip(60));
}

async function boot() {
  wireEvents();

  try {
    app.pack = await packs.loadPack(PACK_ID);
  } catch (err) {
    $('chapter-title').textContent = 'Could not load the story';
    $('chapter-blurb').textContent = 'Make sure the app is being served over http, not opened as a file.';
    console.error(err);
    return;
  }

  const state = store.load();
  const chapterMeta = store.nextChapter(state, app.pack);
  app.chapter = await packs.loadChapter(PACK_ID, chapterMeta.id);
  app.timeline = await packs.loadTimeline(PACK_ID, chapterMeta.id);

  $('audio-mode-label').textContent = app.timeline
    ? '🔊 story audio'
    : '🤖 robot voice (audio not built yet)';

  prefetchTrack(chapterMeta.id); // deliberately not awaited

  renderHome();
  $('btn-start').disabled = false;

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch((err) => console.info('No offline caching.', err));
  }
}

// Debug handle: lets you drive a run from the console (riverbend.session.skip(60))
// and is what the smoke test hooks into.
window.riverbend = app;

boot();

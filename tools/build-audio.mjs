#!/usr/bin/env node
//
// Turns a chapter's JSON script into one continuous mp3 plus a timeline file.
//
//   node tools/build-audio.mjs --chapter ch01
//   node tools/build-audio.mjs --all
//   node tools/build-audio.mjs --all --dry-run      # costs nothing, just reports
//   node tools/build-audio.mjs --chapter ch01 --fake-voice   # free pacing check
//
// Why one stitched track instead of playing clips off a timer: a single playing
// audio element keeps going when the phone locks and goes in a pocket, which is
// where this app actually lives. It also means beat timing is baked in and can't
// drift. The track is padded to exactly the length of the workout, so the app can
// treat audio currentTime as the clock.
//
// Assembly is done in plain Node (see wav.mjs); ffmpeg is used for one thing only,
// encoding the finished track to mp3.

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

// Cue wording is shared with the running app so the two can't drift apart.
import { expandIntervals, INTERVAL_CUES } from '../docs/js/engine.js';
import { concatWavs, matchesFormat, parseWav, silenceWav, wavDuration } from './wav.mjs';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const CACHE = join(HERE, '.cache');

// Override if ffmpeg isn't on your PATH: FFMPEG=/path/to/ffmpeg node tools/build-audio.mjs
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

// Mono, low bitrate, on purpose: it's speech, and these files get committed.
const FORMAT = { sampleRate: 24000, channels: 1, bitsPerSample: 16 };
const BITRATE = '48k';
const MODEL = 'gpt-4o-mini-tts';
const MIN_GAP = 0.35;      // breathing room between two spoken lines
const SHIFT_WARN = 1.5;    // complain if a line slides this far from its mark

// ───────────────────────── args & env ─────────────────────────

function parseArgs(argv) {
  const args = {
    pack: 'riverbend', chapter: null,
    all: false, dryRun: false, fakeVoice: false, force: false, help: false
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--all') args.all = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--fake-voice') args.fakeVoice = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--pack') args.pack = argv[++i];
    else if (arg === '--chapter') args.chapter = argv[++i];
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

async function loadEnv() {
  const envPath = join(HERE, '.env');
  if (!existsSync(envPath)) return;
  for (const line of (await readFile(envPath, 'utf8')).split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    if (!process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

async function requireFfmpeg() {
  try {
    await run(FFMPEG, ['-version']);
  } catch {
    throw new Error(
      `Could not run "${FFMPEG}". Install ffmpeg (macOS: brew install ffmpeg), ` +
      `or point at one with FFMPEG=/path/to/ffmpeg.`
    );
  }
}

// ───────────────────────── the audio event list ─────────────────────────

/**
 * Everything that has to be spoken, in the order it's heard. Interval cues come
 * from the workout schedule, story beats from the script.
 */
function collectEvents(chapter) {
  const intervals = expandIntervals(chapter.intervals);
  const duration = intervals[intervals.length - 1].end;
  const events = [];

  for (const interval of intervals) {
    const text = INTERVAL_CUES[interval.type];
    if (!text) continue;
    events.push({
      kind: 'cue',
      id: `cue-${interval.type}-${interval.start}`,
      at: interval.start,
      text,
      voice: 'cue'
    });
  }

  for (const beat of chapter.beats ?? []) {
    events.push({ kind: 'beat', id: beat.id, at: beat.at, text: beat.text, voice: beat.voice ?? 'ruby' });
  }

  // When a cue and a beat share a second, the cue goes first — it's the one the
  // runner has to act on.
  events.sort((a, b) => a.at - b.at || (a.kind === 'cue' ? -1 : 1));
  return { events, intervals, duration };
}

// ───────────────────────── text to speech ─────────────────────────

function cacheKey({ text, voice, instructions }) {
  return createHash('sha256')
    .update(JSON.stringify({ MODEL, text, voice, instructions, rate: FORMAT.sampleRate }))
    .digest('hex')
    .slice(0, 16);
}

/** Roughly 14 characters a second, a comfortable read-aloud pace. */
function estimateSpokenSeconds(text) {
  return Math.max(1.2, text.length / 14);
}

async function synthesize(event, voiceConfig, args) {
  // Silence standing in for narration, sized to how long the line takes to read.
  // Lets you check a chapter's pacing — and that the script fits at all — before
  // spending anything on real audio.
  if (args.fakeVoice) return silenceWav(estimateSpokenSeconds(event.text), FORMAT);

  const openaiVoice = voiceConfig?.openaiVoice ?? 'shimmer';
  const instructions = voiceConfig?.instructions ?? '';
  const cached = join(CACHE, `${cacheKey({ text: event.text, voice: openaiVoice, instructions })}.wav`);

  if (existsSync(cached) && !args.force) return readFile(cached);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set. Put it in tools/.env (see tools/.env.example).');

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      voice: openaiVoice,
      input: event.text,
      instructions,
      response_format: 'wav'
    })
  });

  if (!res.ok) throw new Error(`TTS failed for ${event.id}: ${res.status} ${await res.text()}`);

  let buffer = Buffer.from(await res.arrayBuffer());

  // Byte-level assembly needs one shared format. Normally the response already
  // matches; convert only when it doesn't.
  if (!matchesFormat(buffer, FORMAT)) {
    const info = parseWav(buffer);
    console.log(`\n  (converting ${event.id}: ${info.sampleRate}Hz ${info.channels}ch ${info.bitsPerSample}-bit)`);
    const tmpIn = join(CACHE, 'convert-in.wav');
    const tmpOut = join(CACHE, 'convert-out.wav');
    await writeFile(tmpIn, buffer);
    await run(FFMPEG, [
      '-y', '-i', tmpIn,
      '-ar', String(FORMAT.sampleRate), '-ac', String(FORMAT.channels), '-c:a', 'pcm_s16le',
      tmpOut
    ]);
    buffer = await readFile(tmpOut);
    await rm(tmpIn, { force: true });
    await rm(tmpOut, { force: true });
  }

  await writeFile(cached, buffer);
  return buffer;
}

// ───────────────────────── building one chapter ─────────────────────────

/**
 * Decides where each line actually starts. A line that would talk over the one
 * before it gets pushed later; the workout schedule itself never moves.
 * Mutates `event.start` and returns how far the script runs, plus any complaints.
 */
function placeEvents(events, duration, chapterId) {
  const warnings = [];
  let cursor = 0;

  for (const event of events) {
    event.start = Math.max(event.at, cursor);
    if (event.start - event.at > SHIFT_WARN) {
      warnings.push(
        `${event.id} starts ${(event.start - event.at).toFixed(1)}s late (authored at ${event.at}s) — ` +
        `shorten the line before it, or move it earlier`
      );
    }
    cursor = event.start + event.duration + MIN_GAP;
  }

  if (cursor > duration) {
    throw new Error(
      `${chapterId}: the script needs ${cursor.toFixed(0)}s but the workout is only ${duration}s. ` +
      `Trim some lines or lengthen the intervals.`
    );
  }

  return { warnings, cursor };
}

async function buildChapter(pack, chapterId, args) {
  const chapterPath = join(ROOT, 'docs/content/packs', pack.id, 'chapters', `${chapterId}.json`);
  const chapter = JSON.parse(await readFile(chapterPath, 'utf8'));
  const { events, duration } = collectEvents(chapter);
  const chars = events.reduce((sum, e) => sum + e.text.length, 0);

  console.log(`\n${chapterId} — ${chapter.title}`);
  console.log(`  ${events.length} spoken lines, ${chars} characters, ${duration}s of workout`);

  if (args.dryRun) {
    // Same placement maths as a real build, on estimated read times — enough to
    // catch lines that collide or a script that doesn't fit, for free.
    for (const event of events) event.duration = estimateSpokenSeconds(event.text);
    const { warnings, cursor } = placeEvents(events, duration, chapterId);

    console.log(`  script runs to about ${cursor.toFixed(0)}s, leaving ${(duration - cursor).toFixed(0)}s of slack`);
    for (const warning of warnings) console.warn(`  ! ${warning}`);
    console.log('  (dry run — nothing generated, nothing billed)');
    return;
  }

  // 1. Generate every line and measure it exactly.
  for (const event of events) {
    event.audio = await synthesize(event, pack.voices?.[event.voice], args);
    event.duration = wavDuration(event.audio);
    process.stdout.write('.');
  }
  process.stdout.write('\n');

  // 2. Work out where each line lands.
  const { warnings, cursor } = placeEvents(events, duration, chapterId);

  // 3. Lay the lines out on a silent bed and pad the end, so the track is exactly
  //    as long as the workout. That equality is what lets the app use audio
  //    currentTime as the run clock.
  const pieces = [];
  let at = 0;
  for (const event of events) {
    if (event.start > at) pieces.push(silenceWav(event.start - at, FORMAT));
    pieces.push(event.audio);
    at = event.start + event.duration;
  }
  if (duration > at) pieces.push(silenceWav(duration - at, FORMAT));

  const combined = concatWavs(pieces, FORMAT);
  const trackSeconds = wavDuration(combined);

  const outDir = join(ROOT, 'docs/content/packs', pack.id, 'audio');
  await mkdir(outDir, { recursive: true });
  await mkdir(CACHE, { recursive: true });

  const wavPath = join(CACHE, `${pack.id}-${chapterId}.wav`);
  const mp3Path = join(outDir, `${chapterId}.mp3`);
  await writeFile(wavPath, combined);
  await run(FFMPEG, [
    '-y', '-i', wavPath,
    '-c:a', 'libmp3lame', '-b:a', BITRATE, '-ac', String(FORMAT.channels),
    mp3Path
  ]);
  await rm(wavPath, { force: true });

  await writeFile(
    join(outDir, `${chapterId}.timeline.json`),
    JSON.stringify(
      {
        chapterId,
        duration,
        trackDuration: Number(trackSeconds.toFixed(2)),
        fakeVoice: args.fakeVoice || undefined,
        generatedAt: new Date().toISOString(),
        beats: Object.fromEntries(
          events.filter((e) => e.kind === 'beat').map((e) => [e.id, Number(e.start.toFixed(2))])
        ),
        cues: events
          .filter((e) => e.kind === 'cue')
          .map((e) => ({ at: Number(e.start.toFixed(2)), text: e.text })),
        warnings
      },
      null,
      2
    ) + '\n'
  );

  const slack = duration - cursor;
  console.log(`  wrote ${relative(ROOT, mp3Path)} — ${trackSeconds.toFixed(1)}s track, ${slack.toFixed(0)}s of slack`);
  for (const warning of warnings) console.warn(`  ! ${warning}`);
}

// ───────────────────────── entry point ─────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(`Usage: node tools/build-audio.mjs [options]

  --chapter <id>   build one chapter (e.g. ch01)
  --all            build every chapter listed in the pack
  --pack <id>      which story pack (default: riverbend)
  --dry-run        report line and character counts, call nothing, bill nothing
  --fake-voice     build a real track with silence in place of narration, to
                   check a chapter's pacing and that the script fits — free
  --force          re-generate lines even if they're already cached

With no --chapter or --all, builds any chapter that has a script but no audio yet.

Environment: OPENAI_API_KEY (see tools/.env.example), and optionally
FFMPEG=/path/to/ffmpeg if ffmpeg isn't on your PATH.
`);
    return;
  }

  await loadEnv();
  const pack = JSON.parse(await readFile(join(ROOT, 'docs/content/packs', args.pack, 'pack.json'), 'utf8'));

  let chapterIds;
  if (args.chapter) {
    chapterIds = [args.chapter];
  } else if (args.all) {
    chapterIds = pack.chapters.map((c) => c.id);
  } else {
    const dir = join(ROOT, 'docs/content/packs', args.pack, 'chapters');
    const scripts = (await readdir(dir)).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
    chapterIds = scripts.filter(
      (id) => !existsSync(join(ROOT, 'docs/content/packs', args.pack, 'audio', `${id}.timeline.json`))
    );
    if (!chapterIds.length) {
      console.log('Every chapter already has audio. Use --chapter <id> or --force to rebuild.');
      return;
    }
  }

  if (!args.dryRun) {
    await requireFfmpeg();
    await mkdir(CACHE, { recursive: true });
  }

  for (const id of chapterIds) await buildChapter(pack, id, args);
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});

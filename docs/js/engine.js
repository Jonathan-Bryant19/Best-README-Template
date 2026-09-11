// The run session: turns a chapter's interval schedule into a live workout and
// fires story beats at the right moment.
//
// The engine never keeps its own clock. It asks the playback layer what time it
// is, which is what lets the same code drive both playback modes.

export const INTERVAL_LABELS = {
  warmup: 'WARM UP',
  jog: 'JOG',
  walk: 'WALK',
  chase: 'SPRINT!',
  cooldown: 'COOL DOWN'
};

// Spoken at the start of each interval. In built audio these are baked into the
// track; in fallback mode they go through device text-to-speech.
export const INTERVAL_CUES = {
  warmup: "Let's warm up. Nice and easy.",
  jog: 'Start jogging!',
  walk: 'Walk now. Catch your breath.',
  chase: 'Zombies! Sprint! Go, go, go!',
  cooldown: 'Great running. Slow it down.'
};

/**
 * Expands the authored interval list into absolute-time segments.
 * Supports { repeat: 3, block: [...] } so a chapter doesn't spell out every rep.
 */
export function expandIntervals(intervals) {
  const out = [];
  let t = 0;

  const push = (iv) => {
    out.push({
      type: iv.type,
      label: iv.label ?? INTERVAL_LABELS[iv.type] ?? iv.type.toUpperCase(),
      start: t,
      end: t + iv.seconds,
      seconds: iv.seconds
    });
    t += iv.seconds;
  };

  for (const entry of intervals) {
    if (entry.repeat) {
      for (let i = 0; i < entry.repeat; i++) entry.block.forEach(push);
    } else {
      push(entry);
    }
  }
  return out;
}

export class RunSession {
  /**
   * @param chapter  parsed chapter JSON
   * @param opts.playback  object with time(), say(), start(), pause(), resume(), stop(), seek()
   * @param opts.timeline  built timeline file, or null for fallback mode
   * @param opts.onEvent   receives {type:'tick'|'interval'|'beat'|'finish', ...}
   */
  constructor(chapter, { playback, timeline = null, onEvent = () => {} }) {
    this.chapter = chapter;
    this.playback = playback;
    this.timeline = timeline;
    this.onEvent = onEvent;

    this.intervals = expandIntervals(chapter.intervals);
    this.duration = this.intervals.length ? this.intervals[this.intervals.length - 1].end : 0;
    this.beats = [...(chapter.beats ?? [])].sort((a, b) => a.at - b.at);

    this.firedBeats = new Set();
    this.currentInterval = null;
    this.running = false;
    this.finished = false;

    // Tallied during the run, handed to the post-run screen.
    this.collected = { supplies: 0, gear: [], items: [] };

    this._loop = this._loop.bind(this);
  }

  /**
   * Where a beat actually lands. Authored `at` is the intent; a built track may
   * have nudged it later to avoid two lines talking over each other, in which
   * case the timeline file holds the resolved offset.
   */
  beatTime(beat) {
    const resolved = this.timeline?.beats?.[beat.id];
    return typeof resolved === 'number' ? resolved : beat.at;
  }

  intervalAt(t) {
    return this.intervals.find((iv) => t >= iv.start && t < iv.end) ?? null;
  }

  async start() {
    this.running = true;

    // The clock starts before playback does, deliberately. Awaiting play() first
    // would leave the whole run screen frozen if the audio stalls or the promise
    // never settles — and the session should be driven by whatever the playback
    // layer reports the time to be, even if that's still zero.
    this._raf = requestAnimationFrame(this._loop);
    // requestAnimationFrame stops firing when the tab is hidden, which is exactly
    // when a phone is pocketed. A slower interval keeps the session honest there.
    this._timer = setInterval(() => this._tick(), 500);

    await this.playback.start();
  }

  pause() {
    if (!this.running) return;
    this.running = false;
    this.playback.pause();
    this.onEvent({ type: 'paused' });
  }

  resume() {
    if (this.running || this.finished) return;
    this.running = true;
    this.playback.resume();
    this.onEvent({ type: 'resumed' });
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
    clearInterval(this._timer);
    this.playback.stop();
  }

  /**
   * Moves the run to a given point without narrating everything jumped over.
   * Anything collected on the way is still credited — you did the running, and
   * losing supplies to a skip would be a confusing punishment mid-jog.
   */
  seekTo(seconds) {
    const target = Math.min(Math.max(0, seconds), this.duration);
    this.playback.seek(target);

    for (const beat of this.beats) {
      if (this.beatTime(beat) <= target && !this.firedBeats.has(beat.id)) {
        this.firedBeats.add(beat.id);
        this._grant(beat);
        this.onEvent({ type: 'beat', beat, silent: true });
      }
    }

    this._tick();
    return target;
  }

  /** Dev affordance: jump forward a fixed amount. */
  skip(seconds) {
    return this.seekTo(this.playback.time() + seconds);
  }

  /**
   * Jump to the next interval — for when you've been walking for a minute before
   * remembering to press start, or the warm-up has outlived its usefulness.
   */
  skipInterval() {
    const current = this.intervalAt(this.playback.time());
    if (!current) return this.seekTo(this.duration);

    // Land a beat short of the boundary and let playback roll across it, so the
    // next interval's spoken cue is heard from its first word instead of being
    // clipped. Nothing rolls while paused, so then cross the line outright.
    const target = this.running ? current.end - 0.2 : current.end + 0.05;
    this.seekTo(target);
    return this.intervals[this.intervals.indexOf(current) + 1] ?? null;
  }

  _loop() {
    if (this.finished) return;
    this._tick();
    this._raf = requestAnimationFrame(this._loop);
  }

  _tick() {
    if (this.finished) return;
    const t = this.playback.time();

    const interval = this.intervalAt(t);
    if (interval !== this.currentInterval) {
      this.currentInterval = interval;
      if (interval) {
        this.onEvent({ type: 'interval', interval });
        if (this.running) this.playback.say(INTERVAL_CUES[interval.type] ?? '', 'cue');
      }
    }

    for (const beat of this.beats) {
      if (this.firedBeats.has(beat.id)) continue;
      if (this.beatTime(beat) > t) break; // sorted, so nothing later can be due
      this.firedBeats.add(beat.id);
      this._grant(beat);
      this.onEvent({ type: 'beat', beat });
      if (this.running) this.playback.say(beat.text, beat.voice ?? 'ruby');
    }

    this.onEvent({
      type: 'tick',
      t,
      duration: this.duration,
      interval,
      remaining: interval ? Math.max(0, interval.end - t) : 0
    });

    if (t >= this.duration) this._finish();
  }

  _grant(beat) {
    // `icon` rides along so the post-run screen doesn't need a lookup table of
    // every item a pack might invent.
    if (beat.type === 'supply') {
      const count = beat.count ?? 1;
      this.collected.supplies += count;
      this.collected.items.push({
        kind: 'supply', id: beat.item, name: beat.name ?? beat.item, count, icon: beat.icon
      });
    } else if (beat.type === 'gear') {
      this.collected.gear.push(beat.item);
      this.collected.items.push({
        kind: 'gear', id: beat.item, name: beat.name ?? beat.item, count: 1, icon: beat.icon
      });
    }
  }

  _finish() {
    if (this.finished) return;
    this.finished = true;
    this.running = false;
    cancelAnimationFrame(this._raf);
    clearInterval(this._timer);
    this.playback.stop();
    this.onEvent({ type: 'finish', collected: this.collected, seconds: this.duration });
  }
}

// Two playback modes behind one interface, so the engine doesn't care which is running.
//
// TrackPlayback  - the real thing. One pre-stitched mp3 per chapter; the workout
//                  clock IS the audio clock, so the story keeps playing with the
//                  screen off and the phone in a pocket.
// ClipPlayback   - the fallback for before any audio has been generated. Device
//                  text-to-speech on a wall clock. Works, sounds like a robot,
//                  and stops when the phone locks. Good enough to test on a jog.

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export class TrackPlayback {
  constructor(url) {
    this.el = new Audio(url);
    this.el.preload = 'auto';
    this.rate = 1;
  }

  async start() {
    // Must be called from a user gesture or mobile browsers refuse to play.
    await this.el.play();
  }

  pause() {
    this.el.pause();
  }

  resume() {
    this.el.play().catch((err) => console.warn('Could not resume track.', err));
  }

  stop() {
    this.el.pause();
  }

  time() {
    return this.el.currentTime;
  }

  seek(seconds) {
    this.el.currentTime = seconds;
  }

  setRate(rate) {
    // Browsers get unhappy well before 10x, and pitch-shifted narration is
    // unusable anyway. Dev speed leans on skip() instead.
    this.rate = clamp(rate, 0.5, 4);
    this.el.playbackRate = this.rate;
  }

  // Narration is already inside the track.
  say() {}
}

// Rough voice characters for the fallback. The real personality comes from the
// generated audio; this just keeps Ruby and a zombie distinguishable.
const SPEECH_PROFILES = {
  ruby: { rate: 1.0, pitch: 1.15 },
  gus: { rate: 0.7, pitch: 0.4 },
  narrator: { rate: 0.95, pitch: 1.0 },
  cue: { rate: 1.1, pitch: 1.2 }
};

export class ClipPlayback {
  static instances = new Set();

  constructor() {
    this.virtual = 0;
    this.mark = performance.now();
    this.rate = 1;
    this.paused = true;
    this.voice = null;
    ClipPlayback.instances.add(this);
  }

  async start() {
    // Speaking once inside the start gesture is what unlocks speech on iOS.
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      this.voice = pickVoice();
    }
    this.virtual = 0;
    this.mark = performance.now();
    this.paused = false;
  }

  time() {
    if (this.paused) return this.virtual;
    return this.virtual + ((performance.now() - this.mark) / 1000) * this.rate;
  }

  pause() {
    this.virtual = this.time();
    this.paused = true;
    if ('speechSynthesis' in window) speechSynthesis.pause();
  }

  resume() {
    this.mark = performance.now();
    this.paused = false;
    if ('speechSynthesis' in window) speechSynthesis.resume();
  }

  stop() {
    this.pause();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }

  seek(seconds) {
    this.virtual = seconds;
    this.mark = performance.now();
  }

  setRate(rate) {
    // Bank the elapsed time at the old rate before switching.
    this.virtual = this.time();
    this.mark = performance.now();
    this.rate = rate;
  }

  say(text, voiceKey = 'ruby') {
    if (!text || !('speechSynthesis' in window)) return;
    const profile = SPEECH_PROFILES[voiceKey] ?? SPEECH_PROFILES.narrator;

    // Interval cues are the actionable ones — they interrupt narration rather
    // than queueing behind it, so "start jogging" never arrives late.
    if (voiceKey === 'cue') speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = profile.rate;
    utterance.pitch = profile.pitch;
    if (this.voice) utterance.voice = this.voice;
    speechSynthesis.speak(utterance);
  }
}

function pickVoice() {
  const voices = speechSynthesis.getVoices?.() ?? [];
  if (!voices.length) return null;
  const english = voices.filter((v) => v.lang?.startsWith('en'));
  return english.find((v) => v.localService) ?? english[0] ?? voices[0];
}

// getVoices() is commonly empty on first call — the list arrives asynchronously.
if ('speechSynthesis' in window) {
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    for (const playback of ClipPlayback.instances) playback.voice = pickVoice();
  });
}

/** Lock-screen controls and now-playing info, track mode only. */
export function setupMediaSession({ title, album, onPlay, onPause }) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title,
    artist: 'Riverbend Radio',
    album
  });
  try {
    navigator.mediaSession.setActionHandler('play', onPlay);
    navigator.mediaSession.setActionHandler('pause', onPause);
  } catch {
    // Some browsers reject unsupported actions; not worth failing the run over.
  }
}

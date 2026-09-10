# Follow-ups

Everything that needs a human. Two kinds of thing live here: **work only you can do**
(anything needing a key, a card, a phone, or a decision) and **things I claimed work
but could not actually prove** from a Linux container with no phone and no audio
output.

If a change lands and it needs something from you, it gets an entry here. Nothing
should be waiting for you in a commit message or buried in a chat scrollback.

> **If you're Claude working in this repo:** add an entry to *Needs you* or *Verify on
> a real run* whenever a change depends on a human action or on something you could
> not verify. Move finished items to *Done* with the date. Don't delete them — the
> record of what was checked, and when, is the point.

---

## Needs you

### 1. Generate the story audio ⭐ biggest one
Until this is done the app uses the phone's robot voice, and **the story stops if the
screen locks** — so the phone has to stay awake and out of your pocket.

- **Why me:** it needs your OpenAI API key. I have no keys and can't buy one.
- **Do:**
  ```bash
  cp tools/.env.example tools/.env     # paste your key in
  brew install ffmpeg                  # used once, for the mp3 encode
  node tools/build-audio.mjs --chapter ch01
  ```
  Run `--dry-run` first if you want to see the size of it without being billed;
  a chapter is a couple of thousand characters, so expect pennies.
- **Verify:** the home screen should read **🔊 story audio** instead of
  *🤖 robot voice*. Then listen to the whole chapter once at home before jogging with
  it — see item 1 under *Verify on a real run*.
- **Commit the result.** `docs/content/packs/riverbend/audio/ch01.mp3` and
  `ch01.timeline.json` are meant to be checked in. `tools/.env` is gitignored and must
  never be.

### 2. Decide where this repo lives
Currently a branch on a fork of Best-README-Template, which is where the session
happened to start, not a considered choice.

- **State:** `master` is untouched and still the pristine template. Moving costs one
  push and changes only the Pages URL.
- **You said:** later. Left open deliberately.

### 3. Pages is serving from `/ (root)`, not `/docs`
Cosmetic only — a redirect at the repo root handles it and the app works.

- **Do (optional):** Settings → Pages → folder → `/docs`. Cleaner URLs, slightly
  faster builds, and the root redirect becomes dead weight you could delete.

---

## Verify on a real run

I can drive the app in a headless browser on Linux. I cannot hold a phone, hear
anything, or reach `github.io` from here. These are the gaps.

### 1. Chapter 1 audio, start to finish — *after item 1 above*
Listen to the whole thing at a desk before taking it out.

- Does Ruby sound right — warm, not clipped, not manic?
- Is Gus funny rather than frightening? He's the one beat with any menace in it.
- Does the sprint countdown ("five, four, three…") land *with* the sprint, not after it?
- Any line stepping on the next? The build script warns about this, but its warning
  threshold is a guess until a human has heard one.

### 2. Screen wake lock actually holds
The app requests it, and the request succeeds in a desktop browser. Whether an iPhone
honours it for a 16-minute run, on battery, is untested.

- **Check:** start a run, put the phone down, don't touch it. Does the screen stay lit
  through a full interval?
- **If it doesn't:** the robot-voice mode will go silent when the screen sleeps. Real
  audio survives it; this is another reason item 1 matters.

### 3. Screen-off playback — *after item 1 above*
The whole stitched-track design exists for this.

- **Check:** start a chapter, lock the phone, put it in a pocket, walk for two minutes.
  The story should keep going, and the lock screen should show pause/play controls.

### 4. Airplane-mode run
Verified in headless Chromium, never on iOS Safari, whose service-worker behaviour
differs.

- **Check:** load the app once with signal, then turn on airplane mode and start a run.
  It should boot and play from cache.

### 5. The Skip button at speed *(added 2026-09-10)*
84×56px, sitting left of Pause, tested with a mouse in a simulated viewport.

- **Check:** can you hit it one-handed, jogging, without looking? Does it ever get hit
  by accident when you meant Pause?
- **Note:** anything you skip past is still credited — skip over the water pipes and
  you still get them. Deliberate: losing supplies to a skip mid-jog would be a
  confusing punishment for a six-year-old.

### 6. Add to Home Screen
- **Check:** does it open full-screen with no Safari chrome, and does the icon look
  right on the home screen?

---

## Standing constraints

Things I can't do from this container, so they'll always land here rather than getting
quietly skipped:

- **No API keys or payment.** Anything billed is yours.
- **No phone, no speakers.** I can assert that audio *files* are correct — length,
  offsets, format — never that they sound good.
- **`github.io` is blocked** by the egress proxy, so I can't load the deployed site. I
  verify by serving the repo locally the same way Pages does, and by reading the Pages
  build status through the GitHub API.
- **Real text-to-speech voices are untested.** The pipeline was proven end to end using
  silence sized to each line's read time (`--fake-voice`), which validates timing and
  stitching but tells you nothing about performance.

---

## Done

- **2026-09-09** — GitHub Pages enabled, building from
  `claude/story-running-app-kids-hr4wgs`.
- **2026-09-09** — First jog completed in robot-voice mode. Verdict: feel and script
  land; the pickle-jar zombie got a laugh out of both of you.

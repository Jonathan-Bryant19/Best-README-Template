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

## Getting the code on your machine

**This project is built in an ephemeral cloud container.** Nothing there persists, and
nothing is ever written to your computer. The durable copy is GitHub. If you go looking
for it in your development directory, it will not be there.

```bash
git clone https://github.com/Jonathan-Bryant19/adventure-run.git
cd adventure-run
```

Anything below that needs your key, your card, your phone or your ears runs from that
clone — and anything you do there only reaches a future session once you `git push`.

---

## Needs you

### 1. Generate the story audio ⭐ biggest one
Until this is done the app uses the phone's robot voice, and **the story stops if the
screen locks** — so the phone has to stay awake and out of your pocket.

> **Now unblocked (2026-09-11).** This was deliberately held back while the Plants
> theme landed, because the reskin rewrote every line of chapter 1 and any audio
> generated before it would have been money thrown away. The script is settled now.

- **Why me:** it needs your OpenAI API key. I have no keys and can't buy one.
- **First:** you need a local clone — see *Getting the code on your machine* above.
- **Do:**
  ```bash
  cp tools/.env.example tools/.env     # paste your key in
  brew install ffmpeg                  # used once, for the mp3 encode
  node tools/build-audio.mjs --pack sunnyside --chapter ch01
  ```
  Run `--dry-run` first if you want to see the size of it without being billed;
  a chapter is a couple of thousand characters, so expect pennies.
- **Verify:** the home screen should read **🔊 story audio** instead of
  *🤖 robot voice*. Then listen to the whole chapter once at home before jogging with
  it — see item 1 under *Verify on a real run*.
- **Commit the result.** `docs/content/packs/sunnyside/audio/ch01.mp3` and
  `ch01.timeline.json` are meant to be checked in. `tools/.env` is gitignored and must
  never be.

### 2. Finish the move to `adventure-run`
The repo exists but the last steps need you — see *Done* for what changed and why.

- **Enable Pages:** Settings → Pages → Deploy from a branch → `main`, folder `/docs`.
  New URL: `https://jonathan-bryant19.github.io/adventure-run/`
- **Repoint Logan's phone.** His home-screen tile points at the old URL and will not
  follow. Delete the old tile, open the new URL, Add to Home Screen again. Do this
  *before* turning the old site off, so there's never a moment with neither working.
  - His save survives untouched: `localStorage` is scoped to the origin
    (`jonathan-bryant19.github.io`), not the path, so his sun, kit and progress carry
    over to the new URL with nothing to migrate.
  - Deleting the old tile also matters because its service worker can keep serving a
    cached copy offline forever — a stale app is more confusing than a dead link.
- **Then retire the old one:** delete the `claude/story-running-app-kids-hr4wgs` branch
  in `Best-README-Template` and turn its Pages off. `master` there is untouched, so
  that restores it to being exactly a README template.

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
- **Note:** anything you skip past is still credited — skip over the jars of sun and
  you still get them. Deliberate: losing sun to a skip mid-jog would be a
  confusing punishment for a six-year-old.

### 6. Add to Home Screen
- **Check:** does it open full-screen with no Safari chrome, and does the icon look
  right on the home screen?

### 7. The new palette in daylight *(added 2026-09-11)*
The shell went from navy to dark green and the accent from orange to yellow. Every
judgement about it so far was made on a desktop monitor indoors.

- **Check:** on a bright day, is the home screen still readable? The run screen's
  interval colours were deliberately *not* re-themed — they're tuned for legibility
  at arm's length while moving — so if anything is hard to read it'll be the home
  and lawn screens, not the run.

### 8. Does Logan like the plants? *(added 2026-09-11)*
Six original plants — Sunbud, Pod Popper, Old Acorn, Frostberry, Thumper, Big Rosie —
drawn as flat SVG. They are deliberately **not** the plants from the game he knows,
and cannot be.

- **Check:** show him the lawn screen before the next jog rather than during it. If
  the gap between what he imagined and what he sees is going to be a problem, better
  to find out at the kitchen table.
- His answer also decides how much to invest in the battle layer.

---

## Standing constraints

Things I can't do from this container, so they'll always land here rather than getting
quietly skipped:

- **This container is not your computer.** Work reaches you only by being pushed to
  GitHub. Nothing I do here appears in your development directory on its own.
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

- **2026-09-18** — Moved the app out of the `Best-README-Template` fork into its own
  repo, `adventure-run`, carrying the four app commits and dropping the template's
  history. It had been living in that fork for no reason other than that a
  phone-started session opened there; it was never a decision. Added a `CLAUDE.md`
  recording where the code lives, so a future session says so up front instead of
  letting it be discovered days later.
- **2026-09-11** — Retheme phase 1 shipped: Sunnyside pack, the lawn, the garden kit,
  and the app renamed to "Runner Two". **His home-screen label will change** — the
  icon image changes too, but the tile stays where it is. His existing sun and
  progress carry over; this was tested against a save in the old shape.
- **2026-09-10** — Interval skipping added.
- **2026-09-09** — GitHub Pages enabled, building from
  `claude/story-running-app-kids-hr4wgs`.
- **2026-09-09** — First jog completed in robot-voice mode. Verdict: feel and script
  land; the pickle-jar zombie got a laugh out of both of you.

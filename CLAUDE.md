# Adventure Run

A story-driven interval running game, built for a father and his six-year-old to jog
with. The app is in `docs/` (plain HTML/JS, no build step) and deploys to GitHub Pages.
Read `README.md` for how it works and `FOLLOW-UPS.md` for anything waiting on a human.

## Where the code lives

Sessions on this project are often started from a phone, which means they run in an
ephemeral cloud container. Nothing there persists, and nothing is ever written to the
user's own computer — work exists only once it is committed and pushed.

- **Say where the code lives, early and plainly**, whenever that might not be obvious.
  Don't let someone find out days later that it was never on their machine.
- **Don't assume the repo a session opened in is the intended home.** This project spent
  its first four commits inside a fork of a README template purely because that is where
  a phone-started session happened to open. If the fit looks wrong, say so *before*
  building, not after.
- **When they'll need to run something themselves** — anything needing an API key, a
  card, a phone, or ears — say how to get a local clone, and record the task in
  `FOLLOW-UPS.md` rather than leaving it in a commit message or chat scrollback.

## Things that will look like mistakes and aren't

- **`docs/js/storage.js` uses the key `riverbend.save.v1`**, named after a theme that no
  longer exists. It is deliberate: a real save lives under that key on a real phone, and
  renaming it would wipe a six-year-old's progress. The internal field names
  (`supplies`, `gear`, `structures`) are theme-neutral on purpose; what a pack *calls*
  them comes from its `vocabulary` block in `pack.json`.
- **A chapter is one pre-stitched mp3**, not clips fired off a timer. That is what keeps
  the story playing when the phone locks and goes in a pocket. Anything that would make
  narration react to live state forfeits it — don't, without saying so out loud.
- **Interval colours in `docs/css/styles.css` are not themed.** They're tuned for
  legibility at arm's length while moving, and that job doesn't change when the story
  does.

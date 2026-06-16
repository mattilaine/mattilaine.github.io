# Coffee Sound Effects + Mute Toggle — Design

**Date:** 2026-06-16
**Status:** Approved

## Goal

Add sound effects for the core barista actions — grinding, tamping, brewing,
filling milk into the pitcher, steaming milk, drawing hot water, pouring milk,
and serving the drink — plus a mute button in the HUD whose state persists
across reloads.

## Constraints

- Pure HTML/CSS/vanilla JS, no build step, no dependencies, must run from
  `file://`. → Sounds are **synthesized with the Web Audio API**, not loaded
  from audio files.
- Stations/tools must stay decoupled from audio: they already `emit('sfx', …)`
  on the shared event bus; audio listens, it is not called directly.

## Current state (already in place)

`src/state.js` provides a tiny event bus (`on`/`emit`). Stations already emit:

| Action | Event today | Sound defined today |
|---|---|---|
| Grinding (complete) | `sfx:dose` | yes (one blip) |
| Tamping | `sfx:tamp` | yes |
| Lock portafilter | `sfx:lock` | yes |
| Pull shot (end) | `sfx:shot` | yes |
| Milk → jug | `sfx:fill` | yes |
| Steaming | `sfx:steam` | **missing (silent)** |
| Hot water | `sfx:water` | **missing (silent)** |
| Pour milk → cup | `sfx:pour` | **missing (silent)** |
| Latte art | `sfx:art` | yes |
| Serve | `serve` event | none |

The sound code currently lives inline in `src/main.js` and only does short
one-shot blips — wrong for the continuous actions (grind/steam/water run 1–3 s).

## Design

### 1. New module: `src/audio.js`

A self-contained unit owning all sound. Public surface: `App.setupAudio()`.
Loaded as a classic script before `main.js`. It self-wires to the event bus
(`on('sfx', …)`, `on('serve', …)`), so stations stay decoupled.

Internals:

- Lazily creates one `AudioContext` and a master `GainNode`. The context is
  created/resumed on the first user gesture (browser autoplay policy); the mute
  click or first drag satisfies this.
- A single reused noise `AudioBuffer` (white noise) feeds the sustained voices.
- A `muted` flag gates all playback (master gain → 0 when muted).

Two voice types:

- **One-shots** — a short oscillator/noise burst through a per-call `GainNode`
  with an exponential decay envelope. Used for `tamp`, `lock`, `fill`, `pour`,
  `art`, `serve`, and the `dose` completion "ding".
- **Sustained voices** — a looping noise source through a filter + gain, keyed
  by name. Two control modes:
  - *Keep-alive* (default): each `emit('sfx', name)` (re)starts a ~150 ms
    auto-stop timer; when triggers stop arriving the voice ramps down and stops.
    Used by `grind`, `steam`, `water` (all emitted per hold-frame).
  - *Explicit*: started and stopped by name. Used by `brew`, which has a clean
    lever-down / lever-up boundary rather than per-frame ticks.

### 2. Sound character (synthesized)

| Name | Voice | Texture |
|---|---|---|
| grind | sustained | low-pass noise rumble + faint low buzz |
| tamp | one-shot | low square "thunk" |
| lock | one-shot | short square click |
| brew | sustained | mid band-pass noise (pump/pour) |
| fill | one-shot | soft sine glug |
| steam | sustained | high-pass noise hiss |
| water | sustained | band-pass noise stream |
| pour | one-shot | soft descending sine |
| art | one-shot | bright sine |
| dose | one-shot | small completion ding |
| serve | one-shot | pleasant two-note chime |

Exact frequencies/filter values are an implementation detail; tune by ear.

### 3. Trigger wiring (small edits)

- `src/stations/grinder.js` — emit `sfx:grind` on each `onHold` frame while
  grinding (keep the existing `sfx:dose` ding at completion).
- `src/stations/espressoMachine.js` — start the `brew` sustained voice in
  `startShot`, stop it in `stopShot` (keep `sfx:shot`/drop as a subtle end tick).
- **serve** — audio listens to the existing `serve` event; no `counter.js` edit.
- `steam`, `water`, `fill`, `pour`, `tamp`, `lock`, `art` — already emitted;
  only need their definitions in `audio.js`.

### 4. Mute button

- A 🔊 / 🔇 toggle button added to the top HUD (`index.html`).
- Click flips the `muted` flag (gates master gain) and swaps the icon.
- State persisted to `localStorage` wrapped in `try/catch`; if storage is
  unavailable it degrades to in-memory for the session. On load, the saved
  state is read and applied to both the flag and the icon.

### 5. `main.js` / `index.html` / CSS

- `main.js` — remove the inline sfx block; call `App.setupAudio()`.
- `index.html` — add `<script src="src/audio.js">` before `main.js`; add the
  mute button markup in the HUD.
- `styles/main.css` — small styling for the mute button to fit the HUD.

## Testing

No automated tests — browser Web Audio with no existing test harness.
Manual verification:

1. Each action produces its sound (grind, tamp, brew, fill, steam, water, pour,
   art, serve); continuous actions sustain while held and stop on release.
2. Mute button toggles all sound on/off and swaps its icon.
3. Reload preserves the mute state (where `localStorage` is available).
4. Game still runs from `file://` with no console errors.

## Out of scope

- Background music / ambience.
- Volume slider (mute is binary).
- Audio asset files of any kind.

# Coffee Sound Effects + Mute Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add synthesized sound effects for every barista action (grind, tamp, brew, fill, steam, water, pour, serve) plus a persistent mute toggle in the HUD.

**Architecture:** A new self-contained `src/audio.js` module owns all sound, synthesized with the Web Audio API (no files, runs from `file://`). It listens to the existing `sfx`/`serve` event bus, so stations stay decoupled. One-shot voices handle discrete actions; filtered-noise sustained voices handle continuous ones (grind/steam/water/brew). The inline sound code currently in `main.js` is removed.

**Tech Stack:** Vanilla JS (ES5-style classic scripts on `window.App`), Web Audio API, `localStorage`. No build step, no test harness.

> **Note on testing:** This project has no automated test harness and the feature is browser-audio behavior, so per the design spec each task is verified **manually** in the browser (open `index.html`) rather than with automated tests. Verification steps below are explicit and required.

---

### Task 1: Create the audio module

**Files:**
- Create: `src/audio.js`
- Modify: `index.html` (add script tag)

- [ ] **Step 1: Create `src/audio.js` with the full sound engine**

```js
(function(){
var App=(window.App=window.App||{});
var {on} = App;
// All game sound, synthesized with the Web Audio API (no audio files; runs from
// file://). Stations stay decoupled: they emit('sfx', name) / emit('serve') on
// the shared bus and we listen here. Public surface: App.setupAudio().

function setupAudio() {
  let ac = null, master = null, noiseBuffer = null;
  let muted = loadMuted();

  // --- context lifecycle (created/resumed on first user gesture) ---
  function ensureContext() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain();
        master.gain.value = muted ? 0 : 1;
        master.connect(ac.destination);
        noiseBuffer = makeNoiseBuffer(ac);
      } catch (e) { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }

  function makeNoiseBuffer(ctx) {
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // --- one-shot voices: [freq, dur, wave, gain, slideTo?] ---
  const ONESHOT = {
    tamp: { freq: 80,  dur: 0.10, wave: 'square',   gain: 0.10 },
    lock: { freq: 320, dur: 0.05, wave: 'square',   gain: 0.06 },
    fill: { freq: 240, dur: 0.12, wave: 'sine',     gain: 0.05, slideTo: 300 },
    pour: { freq: 300, dur: 0.20, wave: 'sine',     gain: 0.05, slideTo: 170 },
    art:  { freq: 680, dur: 0.12, wave: 'sine',     gain: 0.05 },
    dose: { freq: 520, dur: 0.08, wave: 'triangle', gain: 0.05 },
    shot: { freq: 150, dur: 0.16, wave: 'sawtooth', gain: 0.04 },
  };

  function oneShot(name) {
    const ctx = ensureContext();
    if (!ctx) return;
    const s = ONESHOT[name];
    if (!s) return;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = s.wave;
    osc.frequency.setValueAtTime(s.freq, ctx.currentTime);
    if (s.slideTo) osc.frequency.exponentialRampToValueAtTime(s.slideTo, ctx.currentTime + s.dur);
    g.gain.setValueAtTime(s.gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + s.dur);
    osc.connect(g); g.connect(master);
    osc.start(); osc.stop(ctx.currentTime + s.dur);
  }

  // serve = pleasant two-note chime
  function serveChime() {
    const ctx = ensureContext();
    if (!ctx) return;
    [[523, 0], [784, 0.11]].forEach(([f, t]) => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = f;
      const start = ctx.currentTime + t;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.07, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      osc.connect(g); g.connect(master);
      osc.start(start); osc.stop(start + 0.26);
    });
  }

  // --- sustained voices: filtered noise loop ---
  const SUSTAINED = {
    grind: { filter: 'lowpass',  freq: 700,  q: 1.0, gain: 0.10 },
    steam: { filter: 'highpass', freq: 3500, q: 0.7, gain: 0.06 },
    water: { filter: 'bandpass', freq: 1400, q: 1.0, gain: 0.07 },
    brew:  { filter: 'bandpass', freq: 900,  q: 1.2, gain: 0.06 },
  };
  const voices = {}; // name -> { src, gain, timer }

  function startVoice(name) {
    const ctx = ensureContext();
    if (!ctx) return null;
    if (voices[name]) return voices[name];
    const cfg = SUSTAINED[name];
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer; src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = cfg.filter; filter.frequency.value = cfg.freq; filter.Q.value = cfg.q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(cfg.gain, ctx.currentTime + 0.08);
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start();
    voices[name] = { src, gain: g, timer: null };
    return voices[name];
  }

  function stopVoice(name) {
    const v = voices[name];
    if (!v) return;
    if (v.timer) { clearTimeout(v.timer); v.timer = null; }
    try {
      v.gain.gain.cancelScheduledValues(ac.currentTime);
      v.gain.gain.setValueAtTime(v.gain.gain.value, ac.currentTime);
      v.gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.12);
      v.src.stop(ac.currentTime + 0.13);
    } catch (e) {}
    delete voices[name];
  }

  // keep-alive: (re)trigger a sustained voice; auto-stops 150ms after last call
  function keepAlive(name) {
    const v = startVoice(name);
    if (!v) return;
    if (v.timer) clearTimeout(v.timer);
    v.timer = setTimeout(() => stopVoice(name), 150);
  }

  // --- mute persistence ---
  function loadMuted() {
    try { return localStorage.getItem('barista.muted') === '1'; } catch (e) { return false; }
  }
  function saveMuted(m) {
    try { localStorage.setItem('barista.muted', m ? '1' : '0'); } catch (e) {}
  }
  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 1;
    saveMuted(m);
  }

  // --- event wiring ---
  on('sfx', (type) => {
    if (type === 'grind' || type === 'steam' || type === 'water') return keepAlive(type);
    if (type === 'brew') return startVoice('brew');      // explicit start
    if (type === 'brew:stop') return stopVoice('brew');  // explicit stop
    oneShot(type);
  });
  on('serve', serveChime);

  // create/resume context on the very first user gesture (autoplay policy)
  const initOnce = () => { ensureContext(); window.removeEventListener('pointerdown', initOnce); };
  window.addEventListener('pointerdown', initOnce);

  return { setMuted, isMuted: () => muted };
}

Object.assign(App, {setupAudio});
})();
```

- [ ] **Step 2: Add the script tag to `index.html`**

In `index.html`, the scripts are loaded in dependency order. Add `audio.js` right after `effects.js` (line 165) and before `recipes.js`:

```html
  <script src="src/effects.js"></script>
  <script src="src/audio.js"></script>
  <script src="src/recipes.js"></script>
```

- [ ] **Step 3: Verify it loads with no errors**

Open `index.html` in a browser, open the DevTools console.
Expected: no errors; `window.App.setupAudio` is a function (type `App.setupAudio` in the console → `ƒ setupAudio()`). No sound yet (not wired into `main.js`).

- [ ] **Step 4: Commit**

```bash
git add src/audio.js index.html
git commit -m "Add Web Audio sound engine module"
```

---

### Task 2: Wire the audio module into main.js

**Files:**
- Modify: `src/main.js` (remove inline sfx block at lines 162–182; add `setupAudio()` call)

- [ ] **Step 1: Add `setupAudio` to the destructured App imports**

In `src/main.js:3`, add `setupAudio` to the destructuring list (append before the closing `}`):

```js
var {game, on, emit, startShift, resetBuild, nextStepHint, buildQueue, scoreDrink, initDrag, createPortafilter, createPitcher, createCup, setupTamper, setupGrinder, setupEspressoMachine, setupSteamWand, setupWaterTap, setupCounter, createLatteArt, setupHud, setupOrderTicket, setupFeedback, setupAudio} = App;
```

- [ ] **Step 2: Remove the inline sound block and call `setupAudio()`**

In `src/main.js`, delete the entire inline sound section (currently lines 162–182):

```js
// ---- tiny sound effects ----
let ac = null;
const lastPlay = {};
const SFX = {
  dose: [160, 0.06, 'sawtooth'], tamp: [80, 0.08, 'square'], lock: [320, 0.05, 'square'],
  shot: [140, 0.18, 'sawtooth'], fill: [240, 0.05, 'sine'], art: [680, 0.12, 'sine'],
};
function initAudio() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; } }
on('sfx', (type) => {
  if (!ac || !SFX[type]) return;
  const now = performance.now();
  if (lastPlay[type] && now - lastPlay[type] < 70) return;
  lastPlay[type] = now;
  const [freq, dur, wave] = SFX[type];
  const osc = ac.createOscillator(), g = ac.createGain();
  osc.type = wave; osc.frequency.value = freq;
  g.gain.setValueAtTime(0.06, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  osc.connect(g); g.connect(ac.destination);
  osc.start(); osc.stop(ac.currentTime + dur);
});
```

Replace it with a single call (place it just above the final `enterPractice();` line):

```js
// ---- sound ----
const audio = setupAudio();
```

Leave `enterPractice();` and the IIFE close `})();` as they are. (`audio` is used in Task 4 for the mute button.)

- [ ] **Step 3: Verify the existing + newly-defined one-shots play**

Open `index.html`. Interact:
- Drag the tamper onto a dosed portafilter → hear the `tamp` thunk.
- Lock the portafilter into the group head → hear the `lock` click.
- Steam milk → hear a **sustained hiss** (this was silent before).
- Use the hot-water tap → hear a **sustained stream** (was silent before).
- Pour steamed milk into the cup → hear the `pour` tone (was silent before).

Expected: all of the above produce sound; no console errors.

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "Wire audio module into bootstrap, remove inline sound code"
```

---

### Task 3: Add grind loop + brew start/stop emits

**Files:**
- Modify: `src/stations/grinder.js` (emit `grind` each hold frame)
- Modify: `src/stations/espressoMachine.js` (start/stop `brew` voice)

- [ ] **Step 1: Emit a sustained grind while dosing**

In `src/stations/grinder.js`, inside the `onHold` callback, add the grind emit right after the `grinding` class is added. The block currently reads:

```js
    onHold: (dt) => {
      const b = game.build;
      if (!b || b.portafilter !== 'empty') return;
      zone.classList.add('grinding');
      progress = Math.min(1, progress + dt / DOSE_TIME);
```

Change it to:

```js
    onHold: (dt) => {
      const b = game.build;
      if (!b || b.portafilter !== 'empty') return;
      zone.classList.add('grinding');
      emit('sfx', 'grind');
      progress = Math.min(1, progress + dt / DOSE_TIME);
```

(`emit` is already destructured at the top of `grinder.js`. The existing `emit('sfx', 'dose')` at completion stays as the finishing ding.)

- [ ] **Step 2: Start the brew voice when the shot starts**

In `src/stations/espressoMachine.js`, in `startShot`, the block currently reads:

```js
    setBuild({ extracting: true, shotTimeSec: 0 });
    lever.classList.add('on');
    ring.show();
```

Change it to:

```js
    setBuild({ extracting: true, shotTimeSec: 0 });
    lever.classList.add('on');
    emit('sfx', 'brew');
    ring.show();
```

- [ ] **Step 3: Stop the brew voice when the shot ends**

In `src/stations/espressoMachine.js`, in `stopShot`, the block currently ends with:

```js
    updateLever();
    emit('sfx', 'shot');
    emit('step:done');
```

Change it to:

```js
    updateLever();
    emit('sfx', 'brew:stop');
    emit('sfx', 'shot');
    emit('step:done');
```

(`emit` is already destructured at the top of `espressoMachine.js`.)

- [ ] **Step 4: Verify the continuous sounds sustain**

Open `index.html`:
- Hold the portafilter under the grinder → hear a **sustained low rumble** for the full dose, ending with the `dose` ding. Moving away stops the rumble.
- Place a cup, lock a tamped portafilter, then hold the extract lever → hear a **sustained brew** noise that **stops the instant you release** the lever, followed by the short `shot` tick.

Expected: both sustain while held and stop cleanly on release; no console errors; no stuck/looping noise after releasing.

- [ ] **Step 5: Commit**

```bash
git add src/stations/grinder.js src/stations/espressoMachine.js
git commit -m "Emit sustained grind and brew sounds during those actions"
```

---

### Task 4: Mute button in the HUD

**Files:**
- Modify: `index.html` (mute button markup)
- Modify: `styles/main.css` (button styling)
- Modify: `src/main.js` (click wiring + initial icon)

- [ ] **Step 1: Add the mute button markup to the HUD**

In `index.html`, inside `<header id="hud">`, add the button as the last child of the header, right before the closing `</header>` (currently around line 27):

```html
        <div class="hud-right">
          <span class="hud-label">Score</span>
          <span id="hud-score">0</span>
        </div>
        <button id="mute-btn" class="mute-btn" type="button" aria-label="Toggle sound">🔊</button>
      </header>
```

- [ ] **Step 2: Style the mute button**

Append to `styles/main.css`:

```css
/* Mute toggle in the HUD */
.mute-btn {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  width: 38px;
  height: 38px;
  border: 2px solid rgba(0, 0, 0, 0.25);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.15s ease, transform 0.1s ease;
}
.mute-btn:hover { background: rgba(255, 255, 255, 0.32); }
.mute-btn:active { transform: translateY(-50%) scale(0.92); }
.mute-btn.muted { opacity: 0.6; }
```

(If `#hud` is not already `position: relative`, the button still anchors to the nearest positioned ancestor; `#stage` is the fixed-size positioned stage, so the button lands at the stage's top-right which is acceptable. If it looks off, add `position: relative;` to the `#hud` rule in `main.css`.)

- [ ] **Step 3: Wire the button in main.js**

In `src/main.js`, just below the `const audio = setupAudio();` line added in Task 2, add:

```js
const muteBtn = document.querySelector('#mute-btn');
function renderMute() {
  muteBtn.textContent = audio.isMuted() ? '🔇' : '🔊';
  muteBtn.classList.toggle('muted', audio.isMuted());
}
muteBtn.addEventListener('click', () => { audio.setMuted(!audio.isMuted()); renderMute(); });
renderMute();
```

- [ ] **Step 4: Verify mute toggle and persistence**

Open `index.html`:
1. The 🔊 button shows in the top-right of the HUD.
2. Trigger any sound (e.g. tamp) → audible. Click the button → icon becomes 🔇 and dims. Trigger sounds → **silent**.
3. Click again → 🔊, sounds audible again.
4. Mute, then **reload the page** → button still shows 🔇 and sounds stay muted (where `localStorage` is available; from `file://` in modern browsers this works — if blocked, it harmlessly resets to unmuted with no error).

Expected: toggling gates all sound; icon reflects state; state survives reload; no console errors.

- [ ] **Step 5: Commit**

```bash
git add index.html styles/main.css src/main.js
git commit -m "Add persistent mute toggle to the HUD"
```

---

## Manual verification checklist (full feature)

After all tasks, open `index.html` and confirm each action has sound:

- [ ] Grinding — sustained rumble + completion ding
- [ ] Tamping — thunk
- [ ] Locking — click
- [ ] Brewing — sustained while lever held, stops on release + end tick
- [ ] Milk into jug (fill) — glug
- [ ] Steaming — sustained hiss
- [ ] Hot water — sustained stream
- [ ] Pouring milk — descending tone
- [ ] Latte art — bright tone
- [ ] Serving — two-note chime
- [ ] Mute button toggles all sound and persists across reload
- [ ] No console errors; game still runs from `file://`

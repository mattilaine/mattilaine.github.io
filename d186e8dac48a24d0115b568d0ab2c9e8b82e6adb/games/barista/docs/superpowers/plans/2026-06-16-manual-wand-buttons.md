# Manual Steam / Hot-Water Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two labeled buttons (one per wand) that run the hot-water tap / steam wand while held — cosmetic when no vessel is present, and filling/steaming a vessel that sits under the wand.

**Architecture:** Each button is wired inside its existing station module (`waterTap.js`, `steamWand.js`), which already owns the stream/puff visuals, the `'sfx'` sound emits, and the `canFill()` / `canSteam()` rules. A button press toggles a `pressing` flag; an `App.on('tick', …)` handler (the drag controller already emits `tick` every frame) runs the flow each frame while pressed. A shared `overlaps(a, b)` helper decides whether the vessel is under the wand.

**Tech Stack:** Vanilla JS (IIFE modules on a global `App` object), Pointer Events, plain CSS. No build step, no test framework — verification is manual in the browser (open `index.html`).

---

## File Structure

- `index.html` — add a `.wand-btn` button inside `#station-water` and `#station-steam`.
- `styles/stations.css` — add `.wand-btn` styling + pressed state.
- `src/effects.js` — add a small `overlaps(a, b)` rect-intersection helper.
- `src/stations/waterTap.js` — wire `#btn-water` (hold-to-flow water).
- `src/stations/steamWand.js` — wire `#btn-steam` (hold-to-flow steam).

There is no automated test harness in this project; each task ends with a concrete manual browser check and a commit.

---

### Task 1: Add the button markup and styling

**Files:**
- Modify: `index.html` (the two `.m-wand` blocks, around lines 84-99)
- Modify: `styles/stations.css` (after the `.wand-label` rule, ~line 293)

- [ ] **Step 1: Add the Hot Water button**

In `index.html`, inside the `#station-water` block, add the button right after the `wand-label` div:

```html
<!-- integrated hot-water wand (left of the group head) -->
<div id="station-water" class="m-wand water-side">
  <div class="wand-arm"></div>
  <div class="water-tap" id="zone-water" data-zone="water"><div class="water-spout"></div></div>
  <div class="wand-label">Hot Water</div>
  <button id="btn-water" class="wand-btn" type="button">Hot Water</button>
</div>
```

- [ ] **Step 2: Add the Steam button**

In `index.html`, inside the `#station-steam` block, add the button right after its `wand-label` div:

```html
<!-- integrated steam wand (right of the group head) -->
<div id="station-steam" class="m-wand steam-side">
  <div class="wand-arm"></div>
  <div class="steam-wand" id="zone-steam" data-zone="steam">
    <div class="steam-pipe"></div>
    <div class="steam-tip"></div>
  </div>
  <div class="wand-label">Steam</div>
  <button id="btn-steam" class="wand-btn" type="button">Steam</button>
</div>
```

- [ ] **Step 3: Style the buttons**

In `styles/stations.css`, add after the `.wand-label { … }` rule (~line 293):

```css
.wand-btn {
  position: absolute; bottom: -34px; left: 50%; transform: translateX(-50%);
  padding: 3px 8px; font-size: 9px; font-weight: bold; text-transform: uppercase;
  letter-spacing: .5px; white-space: nowrap; cursor: pointer;
  color: var(--outline); background: #ffd84d;
  border: 3px solid var(--outline); border-radius: 8px;
  box-shadow: 0 3px 0 var(--outline);
  z-index: 5; touch-action: none; user-select: none;
}
.wand-btn:active, .wand-btn.pressed {
  transform: translateX(-50%) translateY(3px); box-shadow: 0 0 0 var(--outline);
}
```

- [ ] **Step 4: Manual verification**

Open `index.html` in a browser. Expected: a yellow "Hot Water" pill button sits just below the left wand and a "Steam" pill below the right wand, both with bold dark borders. Clicking shows the pressed (sunk) state. If they overlap other machine parts awkwardly, nudge `bottom` in `.wand-btn`.

- [ ] **Step 5: Commit**

```bash
git add index.html styles/stations.css
git commit -m "Add labeled wand buttons markup and styling"
```

---

### Task 2: Add the shared overlap helper

**Files:**
- Modify: `src/effects.js` (add function + export, ~lines 36-48)

- [ ] **Step 1: Add `overlaps(a, b)`**

In `src/effects.js`, add this function before the final `Object.assign(App, …)`:

```js
// True when two elements' on-screen rects intersect. Uses client rects so it is
// agnostic to the stage's scale transform (same basis as the drag hit-testing).
function overlaps(a, b) {
  if (!a || !b) return false;
  const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect();
  return r1.left < r2.right && r1.right > r2.left &&
         r1.top < r2.bottom && r1.bottom > r2.top;
}
```

- [ ] **Step 2: Export it**

Change the export line at the bottom of `src/effects.js` from:

```js
Object.assign(App, {posInCounter, makeStream, puff, scorePop});
```

to:

```js
Object.assign(App, {posInCounter, makeStream, puff, scorePop, overlaps});
```

- [ ] **Step 3: Manual verification**

Reload `index.html`, open the console, and run `App.overlaps`. Expected: it prints the function (not `undefined`).

- [ ] **Step 4: Commit**

```bash
git add src/effects.js
git commit -m "Add overlaps() rect-intersection helper"
```

---

### Task 3: Wire the Hot Water button

**Files:**
- Modify: `src/stations/waterTap.js`

- [ ] **Step 1: Pull in the extra `App` helpers**

In `src/stations/waterTap.js`, change the destructure line (line 3) from:

```js
var {game, setBuild, emit, registerZone, posInCounter, makeStream} = App;
```

to:

```js
var {game, setBuild, emit, on, registerZone, posInCounter, makeStream, overlaps} = App;
```

- [ ] **Step 2: Add the button flow logic**

In `setupWaterTap`, after the existing `function stopStream() { … }` line (line 49) and before `return { reset() … }`, add:

```js
  // --- manual "hold the button to run the tap" path -------------------
  // Always shows a cosmetic stream + sound; if the cup is parked under the
  // spout, it fills exactly like the drag-and-hold path.
  function flowWater(dt) {
    const sp = posInCounter(spout, counter);
    if (!stream) {
      stream = makeStream(counter, 'water-stream', sp.cx - 3, sp.y + sp.h, 90);
    }
    if (canFill() && overlaps(cup.el, zone)) {
      const b = game.build;
      b.waterSec = (b.waterSec || 0) + dt;
      b.cup.water = Math.min(110, b.cup.water + FILL_RATE * dt);
      if (!b.waterAdded) setBuild({ waterAdded: true });
      cup.render();
    }
    emit('sfx', 'water');
  }

  const btn = counter.querySelector('#btn-water');
  let pressing = false;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pressing = true;
    btn.classList.add('pressed');
    try { btn.setPointerCapture(e.pointerId); } catch (_) {}
  });
  function releaseBtn() {
    if (!pressing) return;
    pressing = false;
    btn.classList.remove('pressed');
    stopStream();
  }
  btn.addEventListener('pointerup', releaseBtn);
  btn.addEventListener('pointercancel', releaseBtn);
  on('tick', (dt) => { if (pressing) flowWater(dt); });
```

- [ ] **Step 3: Manual verification — no cup**

Reload `index.html`. Press and hold the **Hot Water** button with no cup under the wand. Expected: a water stream falls from the spout and the water sound plays; releasing stops the stream. The build state is unchanged (nothing fills).

- [ ] **Step 4: Manual verification — with cup**

Drag the cup under the water spout and release it there (it stays docked under the spout). Hold **Hot Water**. Expected: the cup's liquid rises. Build a plain shot first if needed (`canFill()` requires an extracted shot) — without an extracted shot, holding the button only streams cosmetically. This matches the drag path's rule.

- [ ] **Step 5: Commit**

```bash
git add src/stations/waterTap.js
git commit -m "Wire Hot Water button to run the tap on hold"
```

---

### Task 4: Wire the Steam button

**Files:**
- Modify: `src/stations/steamWand.js`

- [ ] **Step 1: Pull in the extra `App` helpers**

In `src/stations/steamWand.js`, change the destructure line (line 3) from:

```js
var {game, setBuild, emit, registerZone, posInCounter, puff} = App;
```

to:

```js
var {game, setBuild, emit, on, registerZone, posInCounter, puff, overlaps} = App;
```

- [ ] **Step 2: Add the button flow logic**

In `setupSteamWand`, after the `registerZone(zone, { … });` call (ends line 51) and before `return { reset() … }`, add:

```js
  // --- manual "hold the button to run the wand" path ------------------
  // Always puffs steam + sound; if a steamable pitcher is under the tip, it
  // builds foam exactly like the drag-and-hold path. Commit on release.
  let btnPuffT = 0;
  function flowSteam(dt) {
    btnPuffT += dt;
    if (btnPuffT > 0.12) {
      btnPuffT = 0;
      const tp = posInCounter(tip, counter);
      puff(counter, tp.cx, tp.y + tp.h);
    }
    if (canSteam() && overlaps(pitcher.el, zone)) {
      const b = game.build;
      b.milkFoam = Math.min(1, b.milkFoam + dt / STEAM_TIME);
      pitcher.render();
    }
    emit('sfx', 'steam');
  }

  const btn = counter.querySelector('#btn-steam');
  let pressing = false;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pressing = true;
    btn.classList.add('pressed');
    try { btn.setPointerCapture(e.pointerId); } catch (_) {}
  });
  function releaseBtn() {
    if (!pressing) return;
    pressing = false;
    btn.classList.remove('pressed');
    commit();
  }
  btn.addEventListener('pointerup', releaseBtn);
  btn.addEventListener('pointercancel', releaseBtn);
  on('tick', (dt) => { if (pressing) flowSteam(dt); });
```

- [ ] **Step 3: Manual verification — no pitcher**

Reload `index.html`. Press and hold the **Steam** button with no pitcher under the wand. Expected: steam puffs rise from the tip and the steam sound plays; releasing stops the puffs. Build state unchanged.

- [ ] **Step 4: Manual verification — with pitcher**

Take an order that needs milk, fill the pitcher from the fridge, drag it under the steam wand zone and release it there, then hold **Steam**. Expected: foam builds (the pitcher milk turns foamy). On release, the steamed step commits (the order ticket marks milk as steamed). Note: the on-enter foam *meter* only appears on the drag path — it is intentionally not shown for the button path; foam is still visible in the pitcher.

- [ ] **Step 5: Commit**

```bash
git add src/stations/steamWand.js
git commit -m "Wire Steam button to run the wand on hold"
```

---

### Task 5: Full integration verification

**Files:** none (verification only)

- [ ] **Step 1: End-to-end check**

Reload `index.html` and confirm, in one session:
1. Both buttons run cosmetically (stream / puffs + sound) with no vessel.
2. Holding **Hot Water** with the cup parked under the spout (after a shot) tops up the cup; serving an americano scores the water correctly.
3. Holding **Steam** with a filled pitcher under the wand builds foam and commits `milkSteamed` on release.
4. The original drag-and-hold behavior for both wands still works unchanged.
5. No console errors.

- [ ] **Step 2: Final commit (if any tuning was needed)**

```bash
git add -A
git commit -m "Tune manual wand buttons after integration check"
```

(Skip if nothing changed.)

# Manual steam / hot-water buttons — design

Date: 2026-06-16

## Problem

The steam wand and hot-water tap can only be activated by dragging a vessel
(pitcher / cup) onto their zones and holding it there. There is no way to run
the machine on its own — e.g. to purge the wand or simply see it work.

## Goal

Add two labeled buttons, one beside each wand, that run the wand directly while
held. Flow happens with or without a vessel present:

- **No vessel:** purely cosmetic — water streams from the spout / steam puffs at
  the tip, with the matching sound. Nothing is filled, nothing is scored.
- **Valid vessel under the wand:** behaves exactly like the existing
  drag-and-hold path — the cup fills with hot water / the pitcher builds foam,
  and the build state advances and scores accordingly.

## Decisions (from brainstorming)

- Behavior: **also works on vessels** (cosmetic when empty; fills/steams a
  vessel that is positioned under the wand).
- Activation: **hold to flow** — flow continues while the button is held and
  stops on release.
- Buttons: **labeled buttons placed inside each wand container**, right next to
  the spout/tip they control (not on the brown control panel).

## Architecture

The wiring lives **inside the two existing station modules**
(`src/stations/waterTap.js`, `src/stations/steamWand.js`). These modules already
own the stream/puff visuals, the sound emits, and the `canFill()` / `canSteam()`
gameplay rules, so reusing them keeps a single source of truth and avoids
duplicating any fill/foam logic.

### Markup (`index.html`)

Add a button under each existing `wand-label`:

- `#station-water` → `<button class="wand-btn" id="btn-water">Hot Water</button>`
- `#station-steam` → `<button class="wand-btn" id="btn-steam">Steam</button>`

### Press state machine (per button)

Driven by the existing event bus and animation loop — no new `requestAnimationFrame`.

- `pointerdown`: mark `active = true`; `setPointerCapture` so the release fires
  reliably even if the pointer drifts off the button.
- While `active`: a `App.on('tick', dt => …)` handler runs the flow each frame.
  (`tick` is already emitted every frame by the drag controller's loop.)
- `pointerup` / `pointercancel`: mark `active = false` and **commit** (the same
  `commit()`/`stopStream()` the drag path already calls).

### Flow logic

**Water button** (`waterTap.js`):
- Always: ensure the water stream exists from the spout downward a fixed length
  and `emit('sfx', 'water')`.
- If `cup.el` overlaps the water zone **and** `canFill()`: run the existing fill
  (`b.waterSec += dt`, `b.cup.water = min(110, …)`, set `waterAdded`,
  `cup.render()`). The cup is filled in place (not repositioned, since it is
  already under the spout).
- On release: `stopStream()`.

**Steam button** (`steamWand.js`):
- Always: emit steam puffs at the tip on the existing cadence and
  `emit('sfx', 'steam')`.
- If `pitcher.el` overlaps the steam zone **and** `canSteam()`: build foam
  exactly like the drag-hold path (`b.milkFoam = min(1, … + dt/STEAM_TIME)`,
  `pitcher.render()`, optional meter update).
- On release: `commit()` (sets `milkSteamed` and emits `step:done` when foam was
  built).

### Overlap test

A small helper intersects the vessel element's `getBoundingClientRect()` with
the wand zone's rect. Client rects are scale-agnostic, matching how the drag
controller's `zoneAt()` already hit-tests against the scaled stage.

### Styling (`styles/stations.css`)

A `.wand-btn` rule matching the retro pop-art look (bold dark border, flat fill,
rounded) with a `:active` / pressed state. No changes to machine layout.

## Out of scope (YAGNI)

- Wiring the decorative `.mb` control-panel buttons.
- Toggle / single-burst activation modes.
- Any new scoring rules — the existing penalties for misused water/steam apply
  unchanged.

## Testing

Manual in-browser verification (DOM/visual game, no automated test harness):

1. Press **Hot Water** with no cup → stream + sound, nothing filled; release →
   stream stops.
2. Press **Steam** with no pitcher → puffs + sound; release → no state change.
3. Park a cup under the water spout, hold **Hot Water** → cup fills; serving an
   americano scores the water correctly.
4. Hold a steamable pitcher under the wand zone, hold **Steam** → foam builds to
   the target; release commits `milkSteamed`.

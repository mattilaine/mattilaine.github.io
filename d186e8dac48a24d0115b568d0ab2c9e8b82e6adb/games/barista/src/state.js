(function(){
var App=(window.App=window.App||{});
// Central game state, per-drink build state machine, and a tiny event bus.

// ---- Event bus ----------------------------------------------------------
const listeners = new Map();
function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event).delete(fn);
}
function emit(event, payload) {
  const set = listeners.get(event);
  if (set) for (const fn of [...set]) fn(payload);
}

// ---- Game state ---------------------------------------------------------
const game = {
  phase: 'start',        // 'start' | 'serving' | 'feedback' | 'shiftEnd'
  shiftLength: 5,        // customers per shift
  customerIndex: 0,      // 0-based index of current customer
  totalScore: 0,
  order: null,           // current order (see orders.js)
  build: null,           // current drink build (see newBuild)
};

// A fresh, empty drink build. `steps` is the state machine; `cup` is what the
// player has actually produced (used for rendering + scoring).
function newBuild() {
  return {
    portafilter: 'empty',   // 'empty' -> 'dosed' -> 'tamped' -> 'locked'
    cupPlaced: false,
    extracting: false,
    extracted: false,
    shotTimeSec: 0,         // how long the shot ran
    waterAdded: false,
    milkInPitcher: false,
    milkSteaming: false,
    milkSteamed: false,
    milkFoam: 0,            // 0..1 foam ratio achieved while steaming
    milkPoured: false,
    artDrawn: false,
    artScore: null,         // 0..100
    // cup contents (ml-ish, for rendering)
    cup: { espresso: 0, water: 0, milk: 0 },
  };
}

function startShift() {
  game.phase = 'serving';
  game.customerIndex = 0;
  game.totalScore = 0;
}

function resetBuild() {
  game.build = newBuild();
  emit('build:changed', game.build);
}

// Advance the build state machine in one place so every mutation emits an event.
function setBuild(patch) {
  Object.assign(game.build, patch);
  emit('build:changed', game.build);
}

Object.assign(App, {on, emit, newBuild, startShift, resetBuild, setBuild, game});
})();

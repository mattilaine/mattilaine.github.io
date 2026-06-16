(function(){
var App=(window.App=window.App||{});
// The four drinks: required steps, scoring targets, and ticket text.

const RECIPES = {
  espresso: {
    id: 'espresso',
    name: 'Espresso',
    emoji: '☕',
    needs: { shot: true, water: false, milk: null, art: null },
    ticket: ['Pull a clean shot', 'Serve in a small cup'],
    shot: { idealMin: 4.5, idealMax: 6.5 },   // seconds of extraction
    weights: { shot: 100 },
  },

  americano: {
    id: 'americano',
    name: 'Americano',
    emoji: '💧',
    needs: { shot: true, water: true, milk: null, art: null },
    ticket: ['Pull a shot', 'Top up with hot water'],
    shot: { idealMin: 4.5, idealMax: 6.5 },
    water: { idealMin: 1.2, idealMax: 2.6 },  // seconds at the tap
    weights: { shot: 60, water: 40 },
  },

  latte: {
    id: 'latte',
    name: 'Latte',
    emoji: '🥛',
    needs: { shot: true, water: false, milk: true, art: 'heart' },
    ticket: ['Pull a shot', 'Steam silky microfoam', 'Pour & trace a heart'],
    shot: { idealMin: 4.5, idealMax: 6.5 },
    milk: { foamMin: 0.10, foamMax: 0.30, label: 'silky microfoam' },
    art: { pattern: 'heart', tolerance: 1.0 },
    weights: { shot: 35, milk: 30, art: 35 },
  },

  cappuccino: {
    id: 'cappuccino',
    name: 'Cappuccino',
    emoji: '🫧',
    needs: { shot: true, water: false, milk: true, art: 'tulip' },
    ticket: ['Pull a shot', 'Steam airy foam', 'Pour & trace a tulip'],
    shot: { idealMin: 4.5, idealMax: 6.5 },
    milk: { foamMin: 0.40, foamMax: 0.62, label: 'airy foam' },
    art: { pattern: 'tulip', tolerance: 1.35 },   // more forgiving
    weights: { shot: 40, milk: 35, art: 25 },
  },
};

const RECIPE_IDS = Object.keys(RECIPES);

// Permissive recipe used in free-practice mode (no active order) so every piece
// of equipment is usable. Nothing is scored against it.
const PRACTICE = {
  id: 'practice', name: 'Practice', emoji: '🎓',
  needs: { shot: true, water: true, milk: true, art: 'heart' },
  ticket: [],
  shot: { idealMin: 4.5, idealMax: 6.5 },
  water: { idealMin: 1.2, idealMax: 2.6 },
  milk: { foamMin: 0.10, foamMax: 0.62, label: 'milk' },
  art: { pattern: 'heart', tolerance: 1.4 },
  weights: {},
};

// The recipe currently in effect — the customer's order, or PRACTICE when idle.
function activeRecipe() {
  const g = App.game;
  return (g && g.order && g.order.recipe) || PRACTICE;
}

// Is the build complete enough to serve this recipe?
function isComplete(build, recipe) {
  const n = recipe.needs;
  if (n.shot && !build.extracted) return false;
  if (n.water && !build.waterAdded) return false;
  if (n.milk && !build.milkPoured) return false;
  if (n.art && !build.artDrawn) return false;
  return true;
}

// Human-readable "what's left to do" for the hint bar.
function nextStepHint(build, recipe) {
  const n = recipe.needs;
  if (n.shot) {
    if (build.portafilter === 'empty') return 'Grab the portafilter and hold it under the grinder to dose grounds.';
    if (build.portafilter === 'dosed') return 'Tamp the grounds: drag the tamper onto the portafilter.';
    if (build.portafilter === 'tamped') return 'Lock the portafilter into the group head.';
    if (!build.cupPlaced) return 'Grab a cup and place it on the drip tray.';
    if (!build.extracted) return 'Pull the shot: hold the lever, release inside the green window.';
  }
  if (n.water && !build.waterAdded) return 'Carry the cup to the hot water tap and hold to top it up.';
  if (n.milk) {
    if (!build.milkInPitcher) return 'Grab the pitcher from the fridge to fill it with milk.';
    if (!build.milkSteamed) return 'Hold the pitcher under the steam wand until the foam hits the target band.';
    if (!build.milkPoured) return 'Pour the milk: drag the pitcher over the cup and hold.';
  }
  if (n.art && !build.artDrawn) return 'Trace the latte-art pattern on the crema with your finger/mouse.';
  return 'Looks good — drag the cup to the serve hatch!';
}

Object.assign(App, {isComplete, nextStepHint, RECIPES, RECIPE_IDS, PRACTICE, activeRecipe});
})();

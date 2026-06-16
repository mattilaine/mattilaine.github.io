(function(){
var App=(window.App=window.App||{});
// Score a finished drink across the dimensions the recipe cares about.

// 1.0 inside [min,max], falling off linearly outside over `falloff` units.
function windowScore(value, min, max, falloff) {
  if (value >= min && value <= max) return 1;
  const d = value < min ? min - value : value - max;
  return Math.max(0, 1 - d / falloff);
}

function scoreDrink(build, recipe) {
  const w = recipe.weights;
  const rows = [];
  let total = 0;

  if (w.shot != null) {
    const s = windowScore(build.shotTimeSec, recipe.shot.idealMin, recipe.shot.idealMax, 2.5);
    rows.push(row('Shot timing', s, w.shot, shotNote(build.shotTimeSec, recipe.shot)));
    total += s * w.shot;
  }
  if (w.water != null) {
    const s = windowScore(build.waterSec || 0, recipe.water.idealMin, recipe.water.idealMax, 2.0);
    rows.push(row('Water level', s, w.water));
    total += s * w.water;
  }
  if (w.milk != null) {
    const s = windowScore(build.milkFoam, recipe.milk.foamMin, recipe.milk.foamMax, 0.28);
    rows.push(row('Milk texture', s, w.milk, milkNote(build.milkFoam, recipe.milk)));
    total += s * w.milk;
  }
  if (w.art != null) {
    const s = (build.artScore ?? 0) / 100;
    rows.push(row('Latte art', s, w.art));
    total += s * w.art;
  }

  // Penalise ingredients that don't belong in this drink (e.g. water or milk
  // added to a plain espresso).
  if (!recipe.needs.water && (build.waterAdded || (build.waterSec || 0) > 0)) {
    rows.push(penalty('Water that doesn’t belong here', -25));
    total -= 25;
  }
  if (!recipe.needs.milk && build.milkPoured) {
    rows.push(penalty('Milk that doesn’t belong here', -35));
    total -= 35;
  }

  total = Math.max(0, Math.round(total));
  return { total, rows, stars: stars(total), quote: quoteFor(total) };
}

function row(label, scoreFrac, weight, note = '') {
  return { label, pts: Math.round(scoreFrac * weight), max: weight, frac: scoreFrac, note };
}

// A negative "mistake" row (max 0 → the UI shows just the point value).
function penalty(label, pts) {
  return { label, pts, max: 0, frac: 0, note: '' };
}

function shotNote(t, { idealMin, idealMax }) {
  if (t < idealMin) return 'a touch sour (under-extracted)';
  if (t > idealMax) return 'a bit bitter (over-extracted)';
  return 'beautifully balanced';
}
function milkNote(foam, { foamMin, foamMax }) {
  if (foam < foamMin) return 'too flat / under-steamed';
  if (foam > foamMax) return 'too foamy / airy';
  return 'silky and just right';
}

function stars(total) {
  if (total >= 90) return 5;
  if (total >= 75) return 4;
  if (total >= 60) return 3;
  if (total >= 40) return 2;
  return 1;
}

function quoteFor(total) {
  if (total >= 90) return 'Best coffee in town — you nailed it!';
  if (total >= 75) return 'Really tasty, thank you!';
  if (total >= 60) return 'Pretty good, hits the spot.';
  if (total >= 40) return 'Hmm, it’s drinkable I guess…';
  return 'This isn’t quite what I ordered.';
}

Object.assign(App, {scoreDrink});
})();

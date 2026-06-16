(function(){
var App=(window.App=window.App||{});
var {RECIPES, RECIPE_IDS} = App;
// Customers and the shift queue of orders.

const NAMES = ['Mia', 'Leo', 'Aino', 'Sam', 'Otto', 'Vera', 'Niko', 'Ella', 'Juno', 'Pim', 'Hugo', 'Saga'];
const FACES = ['🙂', '😀', '😎', '🤓', '😊', '🧑', '👩', '🧔', '👵', '🧑‍🦰', '👨‍🦱', '🙋'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Build a shift of `n` orders. First order is always an espresso (gentle intro),
// then weighted variety with no more than two identical drinks in a row.
function buildQueue(n) {
  const queue = [];
  for (let i = 0; i < n; i++) {
    let recipeId;
    if (i === 0) recipeId = 'espresso';
    else {
      do { recipeId = pick(RECIPE_IDS); }
      while (i >= 2 && queue[i - 1].recipeId === recipeId && queue[i - 2].recipeId === recipeId);
    }
    // Milk drinks get a random latte-art pattern per order for variety; clone
    // the recipe so the shared RECIPES definition isn't mutated.
    let recipe = RECIPES[recipeId];
    if (recipe.needs.art && App.ART_PATTERNS && App.ART_PATTERNS.length) {
      const p = pick(App.ART_PATTERNS);
      recipe = Object.assign({}, recipe, {
        needs: Object.assign({}, recipe.needs, { art: p }),
        art: Object.assign({}, recipe.art, { pattern: p }),
      });
    }
    queue.push({
      recipeId,
      recipe,
      name: pick(NAMES),
      face: pick(FACES),
    });
  }
  return queue;
}

Object.assign(App, {buildQueue});
})();

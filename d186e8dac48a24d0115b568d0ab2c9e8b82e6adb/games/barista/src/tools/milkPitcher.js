(function(){
var App=(window.App=window.App||{});
var {game, registerDraggable} = App;
// Milk pitcher: fill from the fridge → steam to texture → tilt-pour into cup.

const HOME = { left: 1090, top: 250 };

function createPitcher(counter) {
  const el = document.createElement('div');
  el.className = 'tool milk-pitcher';
  el.dataset.tool = 'pitcher';
  el.innerHTML = `
    <div class="pitcher-spout"></div>
    <div class="pitcher-body"><div class="pitcher-milk"></div></div>
    <div class="pitcher-handle"></div>
    <div class="pitcher-tip"></div>`;
  el.style.left = HOME.left + 'px';
  el.style.top = HOME.top + 'px';
  counter.appendChild(el);

  const milk = el.querySelector('.pitcher-milk');

  registerDraggable(el, {
    type: 'pitcher',
    homeLeft: HOME.left,
    homeTop: HOME.top,
  });

  function render() {
    const b = game.build;
    if (!b) return;
    // fill level: full once filled, drains a bit as it's poured
    const level = b.milkInPitcher ? (b.milkPoured ? 0.15 : 0.85) : 0;
    milk.style.height = Math.round(level * 80) + 'px';
    milk.classList.toggle('foamy', b.milkFoam > 0.05 && b.milkInPitcher);
  }

  const api = {
    el,
    render,
    // Fill from the fridge with a visible rising/sloshing animation.
    fill() {
      el.classList.add('filling');
      render();
      setTimeout(() => el.classList.remove('filling'), 800);
    },
    // Glide back to the dock (used after filling on the carton).
    returnHome() {
      el.classList.remove('docked');
      el.style.transition = 'left .22s ease, top .22s ease';
      el.style.left = HOME.left + 'px';
      el.style.top = HOME.top + 'px';
      setTimeout(() => { el.style.transition = 'none'; }, 240);
    },
    reset() {
      el.classList.remove('docked');
      el.style.transition = 'none';
      el.style.left = HOME.left + 'px';
      el.style.top = HOME.top + 'px';
      milk.style.height = '0px';
      milk.classList.remove('foamy');
    },
  };
  return api;
}

Object.assign(App, {createPitcher});
})();

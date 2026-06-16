(function(){
var App=(window.App=window.App||{});
var {game, registerDraggable} = App;
// Cup: grab from the stack, dock under the machine, receive espresso / water /
// milk, host the latte-art canvas, then carry to the serve hatch.

const HOME = { left: 50, top: 446 };
const MAX_ML = 170;

function createCup(counter) {
  const el = document.createElement('div');
  el.className = 'tool cup';
  el.dataset.tool = 'cup';
  el.innerHTML = `
    <div class="cup-vessel">
      <div class="cup-liquid"></div>
      <canvas class="cup-canvas" width="144" height="140"></canvas>
    </div>
    <div class="cup-handle"></div>`;
  el.style.left = HOME.left + 'px';
  el.style.top = HOME.top + 'px';
  counter.appendChild(el);

  const liquid = el.querySelector('.cup-liquid');
  const canvas = el.querySelector('.cup-canvas');

  registerDraggable(el, {
    type: 'cup',
    homeLeft: HOME.left,
    homeTop: HOME.top,
    // The canvas captures pointer events while tracing art; also lock during a shot.
    disabled: () => el.classList.contains('art-active') || (game.build && game.build.extracting),
  });

  function render() {
    const b = game.build;
    if (!b) return;
    const c = b.cup;
    const total = c.espresso + c.water + c.milk;
    const ratio = Math.min(1, total / MAX_ML);
    liquid.style.height = Math.round(ratio * 62) + 'px';

    let color = '#2a160c';                 // espresso
    if (c.milk > 0) {
      color = game.order && game.order.recipeId === 'cappuccino' ? '#d8c2a3' : '#caa97f';
    } else if (c.water > 0) {
      // Water on top of coffee reads as an americano; water with no coffee
      // (and no milk) is just water, so show a clear, watery tint instead.
      color = c.espresso > 0 ? '#6b432a' : '#cfe7f0';
    }
    liquid.style.background = color;
  }

  const api = {
    el, canvas,
    render,
    setArtActive(on) { el.classList.toggle('art-active', on); },
    reset() {
      el.classList.remove('docked', 'art-active');
      el.style.transition = 'none';
      el.style.left = HOME.left + 'px';
      el.style.top = HOME.top + 'px';
      liquid.style.height = '0px';
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
  return api;
}

Object.assign(App, {createCup, MAX_ML});
})();

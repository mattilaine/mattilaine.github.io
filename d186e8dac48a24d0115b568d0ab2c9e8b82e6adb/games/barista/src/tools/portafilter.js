(function(){
var App=(window.App=window.App||{});
var {game, registerDraggable} = App;
// Portafilter: grab → dose at grinder → tamp → lock into group head.

const HOME = { left: 50, top: 250 };

function createPortafilter(counter) {
  const el = document.createElement('div');
  el.className = 'tool portafilter';
  el.dataset.tool = 'portafilter';
  el.innerHTML = `
    <div class="pf-basket"><div class="pf-grounds"></div></div>
    <div class="pf-spout"></div>
    <div class="pf-handle"></div>`;
  el.style.left = HOME.left + 'px';
  el.style.top = HOME.top + 'px';
  counter.appendChild(el);

  const grounds = el.querySelector('.pf-grounds');

  registerDraggable(el, {
    type: 'portafilter',
    homeLeft: HOME.left,
    homeTop: HOME.top,
    // Can't pick it up once it's locked into the machine.
    disabled: () => game.build && game.build.portafilter === 'locked',
  });

  const api = {
    el,
    // loose grounds heap UP into a mound whose peak rises above the rim
    setDose(ratio) { grounds.style.height = Math.round(ratio * 54) + 'px'; },
    markTamped() {
      el.classList.add('tamped');
      // tamping presses the mound straight down to a level, flat puck that
      // settles below the rim (CSS .tamped controls the inset + rounded base)
      grounds.style.height = '24px';
    },
    markLocked() { el.classList.add('docked'); },
    reset() {
      el.classList.remove('tamped', 'docked');
      el.style.transition = 'none';
      el.style.left = HOME.left + 'px';
      el.style.top = HOME.top + 'px';
      grounds.style.height = '0px';
    },
  };
  return api;
}

Object.assign(App, {createPortafilter});
})();

(function(){
var App=(window.App=window.App||{});
var {game, setBuild, emit, registerDraggable, registerZone, posInCounter} = App;
// Tamper: drag it onto a dosed portafilter to tamp the grounds.

const HOME = { left: 210, top: 254 };

function setupTamper({ counter, portafilter }) {
  const el = counter.querySelector('#tool-tamper');
  el.dataset.tool = 'tamper';

  registerDraggable(el, { type: 'tamper', homeLeft: HOME.left, homeTop: HOME.top });

  // Press the tamper down into the basket, then glide it back home.
  function pressTamp() {
    const pf = posInCounter(portafilter.el, counter);
    el.style.transition = 'none';
    el.style.left = (pf.x + 5) + 'px';   // base centered over the basket (cx 28)
    el.style.top = (pf.y - 45) + 'px';   // base resting just above the grounds
    el.classList.add('tamping');
    setTimeout(() => {
      el.classList.remove('tamping');
      el.style.transition = 'left .2s ease, top .2s ease';
      el.style.left = HOME.left + 'px';
      el.style.top = HOME.top + 'px';
      setTimeout(() => { el.style.transition = 'none'; el.classList.remove('docked'); }, 220);
    }, 380);
  }

  // The portafilter element itself is a drop target for the tamper.
  registerZone(portafilter.el, {
    id: 'portafilter-basket',
    accepts: 'tamper',
    onDrop: () => {
      const b = game.build;
      if (b && b.portafilter === 'dosed') {
        pressTamp();
        portafilter.markTamped();
        setBuild({ portafilter: 'tamped' });
        emit('sfx', 'tamp');
        return 'dock'; // pressing on the basket; we return it home ourselves
      }
      return false; // tamper always returns home
    },
  });
}

Object.assign(App, {setupTamper});
})();

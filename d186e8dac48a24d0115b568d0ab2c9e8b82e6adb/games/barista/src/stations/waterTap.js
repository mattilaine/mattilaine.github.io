(function(){
var App=(window.App=window.App||{});
var {game, setBuild, emit, on, registerZone, posInCounter, makeStream, overlaps} = App;
// Hot water tap: carry the cup under it and hold to top up an americano.

const FILL_RATE = 45; // ml per second

function setupWaterTap({ counter, cup }) {
  const zone = counter.querySelector('#zone-water');
  const spout = counter.querySelector('#station-water .water-spout');
  let stream = null;

  function canFill() {
    // Water can be added to any active cup — with or without a pulled shot.
    // If there's no coffee, the cup simply fills with water only. Adding water
    // where it doesn't belong is a mistake the scoring will penalise.
    const b = game.build;
    return b && !b.served;
  }

  registerZone(zone, {
    id: 'water',
    accepts: 'cup',
    onLeave: () => stopStream(),
    onHold: (dt, { pointer }) => {
      if (!canFill()) return;
      const b = game.build;
      b.waterSec = (b.waterSec || 0) + dt;
      b.cup.water = Math.min(110, b.cup.water + FILL_RATE * dt);
      if (!b.waterAdded) setBuild({ waterAdded: true });
      cup.render();
      // Park the cup directly under the spout (just below it) so the water
      // visibly streams into the cup instead of onto the tap.
      const sp = posInCounter(spout, counter);
      const cupTop = sp.y + sp.h + 26;
      const el = cup.el;
      el.style.transition = 'none';
      el.style.left = (sp.cx - 42) + 'px';   // 42 = cup vessel center within the tool
      el.style.top = cupTop + 'px';
      if (!stream) {
        stream = makeStream(counter, 'water-stream', sp.cx - 3, sp.y + sp.h,
          Math.max(20, (cupTop + 26) - (sp.y + sp.h)));
      }
      emit('sfx', 'water');
    },
    // Set the cup down where it was released.
    onDrop: () => { stopStream(); return 'dock'; },
  });

  function stopStream() { if (stream) { stream.remove(); stream = null; } }

  // --- manual "hold the button to run the tap" path -------------------
  // Always shows a cosmetic stream + sound; if the cup is parked under the
  // spout, it fills exactly like the drag-and-hold path.
  function flowWater(dt) {
    if (App.isDragging()) return; // let the drag-and-hold path own it instead
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

  return { reset() { pressing = false; btn.classList.remove('pressed'); stopStream(); } };
}

Object.assign(App, {setupWaterTap});
})();

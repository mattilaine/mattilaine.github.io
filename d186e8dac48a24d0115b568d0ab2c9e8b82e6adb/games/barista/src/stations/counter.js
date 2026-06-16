(function(){
var App=(window.App=window.App||{});
var {game, setBuild, emit, registerZone, isComplete, posInCounter, makeStream} = App;
// Counter odds-and-ends: fill the pitcher at the fridge, pour milk into the cup,
// and serve the finished drink at the hatch.

const POUR_TIME = 1.4;
const MILK_RATE = 95; // ml per second

function setupCounter({ counter, cup, pitcher }) {
  const fridge = counter.querySelector('#station-fridge');
  const serve = counter.querySelector('#station-serve');
  let pourStream = null;

  // Spout-tip position in counter coords — transform-aware (getBoundingClientRect
  // reflects the .pouring tilt), unlike offset-based posInCounter.
  function pitcherTip() {
    const m = pitcher.el.querySelector('.pitcher-tip');
    const mr = m.getBoundingClientRect();
    const cr = counter.getBoundingClientRect();
    const scale = cr.width / counter.offsetWidth;
    return {
      x: (mr.left + mr.width / 2 - cr.left) / scale,
      y: (mr.top + mr.height / 2 - cr.top) / scale,
    };
  }

  // --- Fridge: drop the pitcher to fill it with milk ---
  registerZone(fridge, {
    id: 'fridge',
    accepts: 'pitcher',
    onDrop: () => {
      const b = game.build;
      if (b && !b.milkInPitcher && !b.milkPoured) {
        setBuild({ milkInPitcher: true });
        // Park the jug on the carton so the fill animation plays there, then
        // glide it back to its dock once it's full.
        const f = posInCounter(fridge, counter);
        const el = pitcher.el;
        el.style.transition = 'none';
        el.style.left = (f.cx - el.offsetWidth / 2) + 'px';
        el.style.top = (f.y + 24) + 'px';
        pitcher.fill();
        emit('sfx', 'fill');
        setTimeout(() => pitcher.returnHome(), 850);
        return 'dock'; // held on the can; we send it home ourselves when full
      }
      return false;
    },
  });

  // --- Cup is a drop/hold target for the pitcher (pour milk) ---
  registerZone(cup.el, {
    id: 'cup-pour',
    accepts: 'pitcher',
    onLeave: () => stopPour(),
    onHold: (dt) => {
      const b = game.build;
      // Pour as soon as there's milk in the pitcher — even unsteamed / badly
      // foamed milk, or milk into a drink that shouldn't have it. The texture
      // window and wrong-ingredient penalty handle the consequences.
      if (!b || !b.milkInPitcher || b.milkPoured) return;
      b.pourSec = (b.pourSec || 0) + dt;
      b.cup.milk = Math.min(130, b.cup.milk + MILK_RATE * dt);
      cup.render();
      // Hold the jug above the cup (tilted) so milk pours down into it.
      const cp = posInCounter(cup.el, counter);
      const pel = pitcher.el;
      pel.classList.add('pouring');
      pel.style.transition = 'none';
      pel.style.left = (cp.x + 36) + 'px';   // jug sits above-right; tilted spout pours into the cup
      pel.style.top = (cp.y - 70) + 'px';
      if (!pourStream) {
        // originate the stream at the jug's real (tilted) spout tip
        const tip = pitcherTip();
        pourStream = makeStream(counter, 'milk-stream', tip.x - 3, tip.y,
          Math.max(20, (cp.y + 20) - tip.y));
      }
      if (b.pourSec >= POUR_TIME && !b.milkPoured) {
        setBuild({ milkPoured: true });
        stopPour();
        emit('milk:poured');
        emit('step:done');
      }
    },
    onDrop: () => { stopPour(); return false; },
  });

  function stopPour() {
    if (pourStream) { pourStream.remove(); pourStream = null; }
    pitcher.el.classList.remove('pouring');
  }

  // --- Serve hatch ---
  registerZone(serve, {
    id: 'serve',
    accepts: 'cup',
    onDrop: () => {
      const b = game.build;
      if (game.order) {
        // Scored order: only accept a complete drink.
        if (isComplete(b, game.order.recipe)) {
          setBuild({ served: true });
          emit('serve');
          return 'dock';
        }
        emit('serve:incomplete');
        return false;
      }
      // Free practice: serve anything you've made to clear the cup and start over.
      const made = b.cup.espresso + b.cup.water + b.cup.milk;
      if (made > 0) { emit('serve'); return 'dock'; }
      emit('serve:incomplete');
      return false;
    },
  });

  return { reset() { stopPour(); } };
}

Object.assign(App, {setupCounter});
})();

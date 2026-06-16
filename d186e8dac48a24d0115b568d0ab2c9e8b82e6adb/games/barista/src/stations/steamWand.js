(function(){
var App=(window.App=window.App||{});
var {game, setBuild, emit, on, registerZone, posInCounter, puff, overlaps} = App;
// Steam wand: hold the filled pitcher under it to build foam to the target band.

const STEAM_TIME = 3.0; // seconds of holding to go from 0 -> full foam

function setupSteamWand({ counter, pitcher }) {
  const zone = counter.querySelector('#zone-steam');
  const tip = counter.querySelector('#station-steam .steam-tip');
  const meter = createMeter(counter);
  let puffT = 0;

  function canSteam() {
    const b = game.build, r = App.activeRecipe();
    return b && r && r.needs.milk && b.milkInPitcher && !b.milkPoured;
  }

  // Commit the steamed texture when the player stops steaming (whether they move
  // the pitcher away or simply release it over the wand).
  function commit() {
    meter.hide();
    const b = game.build;
    if (b && b.milkInPitcher && b.milkFoam > 0.02 && !b.milkSteamed) {
      setBuild({ milkSteamed: true });
      emit('step:done');
    }
  }

  registerZone(zone, {
    id: 'steam',
    accepts: 'pitcher',
    onEnter: () => { if (canSteam()) meter.show(App.activeRecipe().milk); },
    onLeave: commit,
    onHold: (dt) => {
      if (!canSteam()) return;
      const b = game.build;
      b.milkFoam = Math.min(1, b.milkFoam + dt / STEAM_TIME);
      meter.set(b.milkFoam);
      pitcher.render();
      // steam puffs around the tip
      puffT += dt;
      if (puffT > 0.12) {
        puffT = 0;
        const tp = posInCounter(tip, counter);
        puff(counter, tp.cx, tp.y + tp.h);
      }
      emit('sfx', 'steam');
    },
    onDrop: () => { commit(); return false; }, // pitcher returns to its dock after steaming
  });

  // --- manual "hold the button to run the wand" path ------------------
  // Always puffs steam + sound; if a steamable pitcher is under the tip, it
  // builds foam exactly like the drag-and-hold path. Commit on release.
  let btnPuffT = 0;
  function flowSteam(dt) {
    if (App.isDragging()) return; // let the drag-and-hold path own it instead
    btnPuffT += dt;
    if (btnPuffT > 0.12) {
      btnPuffT = 0;
      const tp = posInCounter(tip, counter);
      puff(counter, tp.cx, tp.y + tp.h);
    }
    if (canSteam() && overlaps(pitcher.el, zone)) {
      const b = game.build;
      b.milkFoam = Math.min(1, b.milkFoam + dt / STEAM_TIME);
      pitcher.render();
    }
    emit('sfx', 'steam');
  }

  const btn = counter.querySelector('#btn-steam');
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
    commit();
  }
  btn.addEventListener('pointerup', releaseBtn);
  btn.addEventListener('pointercancel', releaseBtn);
  on('tick', (dt) => { if (pressing) flowSteam(dt); });

  return { reset() { pressing = false; btn.classList.remove('pressed'); meter.hide(); } };
}

function createMeter(counter) {
  const m = document.createElement('div');
  m.id = 'texture-meter';
  m.innerHTML = `<div class="meter-target"></div><div class="meter-fill"></div>`;
  m.style.left = '792px';
  m.style.top = '150px';
  counter.appendChild(m);
  const fill = m.querySelector('.meter-fill');
  const target = m.querySelector('.meter-target');
  const H = 110;
  return {
    show(band) {
      m.classList.add('show');
      target.style.top = ((1 - band.foamMax) * H) + 'px';
      target.style.height = ((band.foamMax - band.foamMin) * H) + 'px';
    },
    hide() { m.classList.remove('show'); },
    set(foam) { fill.style.height = (foam * H) + 'px'; },
  };
}

Object.assign(App, {setupSteamWand});
})();

(function(){
var App=(window.App=window.App||{});
var {game, setBuild, on, emit, registerZone, snapToZone, posInCounter, makeStream} = App;
// Espresso machine: lock the portafilter, place the cup, pull the shot.

const MAX_T = 10;          // seconds before the shot auto-stops (badly over-extracted)
const ESPRESSO_ML = 30;
const RING_R = 24;
const RING_C = 2 * Math.PI * RING_R;

function setupEspressoMachine({ counter, portafilter, cup }) {
  const grouphead = counter.querySelector('#zone-grouphead');
  const tray = counter.querySelector('#zone-machine-spot');
  const spouts = counter.querySelector('#spouts');
  const lever = counter.querySelector('#extract-lever');
  const needle = counter.querySelector('.m-gauge .gauge-needle');

  // Pressure gauge: needle sweeps from idle (low, left) to peak (~9 bar, right)
  // as the pump builds pressure during a shot.
  const NEEDLE_IDLE = -58, NEEDLE_PEAK = 58;
  function setNeedle(frac) {
    const f = Math.max(0, Math.min(1, frac));
    const a = NEEDLE_IDLE + (NEEDLE_PEAK - NEEDLE_IDLE) * f;
    needle.style.transform = `translate(-50%, -100%) rotate(${a}deg)`;
  }

  // shot-timer ring
  const ring = makeRing();
  counter.querySelector('#station-machine').appendChild(ring.svg);

  let stream = null;

  // --- Group head: accepts a tamped portafilter ---
  registerZone(grouphead, {
    id: 'grouphead',
    accepts: 'portafilter',
    onDrop: () => {
      const b = game.build;
      if (b && b.portafilter === 'tamped') {
        setBuild({ portafilter: 'locked' });
        portafilter.markLocked();
        grouphead.classList.add('locked');
        // Center the basket (not the whole tool) under the group head: the
        // basket sits at the tool's left (cx 28) while the handle juts right, so
        // explicit offsets place it dead-center instead of off to the side.
        snapToZone(portafilter.el, grouphead, { offsetX: 31, offsetY: 5, center: false });
        updateLever();
        emit('sfx', 'lock');
        return 'dock';
      }
      return false; // not tamped yet → bounce back
    },
  });

  // --- Drip tray: accepts a cup ---
  registerZone(tray, {
    id: 'machine-spot',
    accepts: 'cup',
    onDrop: ({ tool }) => {
      setBuild({ cupPlaced: true });
      tray.classList.add('has-cup');
      // sit the cup high in the tray so its rim is right under the spout
      snapToZone(tool, tray, { offsetY: -18, center: true });
      updateLever();
      emit('sfx', 'cup');
      return 'dock';
    },
  });

  // --- Extract lever ---
  function updateLever() {
    const b = game.build;
    const ready = b && b.portafilter === 'locked' && b.cupPlaced && !b.extracted;
    lever.disabled = !ready;
  }

  function startShot(e) {
    const b = game.build;
    if (lever.disabled || !b || b.extracted || b.extracting) return;
    e.preventDefault();
    setBuild({ extracting: true, shotTimeSec: 0 });
    lever.classList.add('on');
    emit('sfx', 'brew');
    ring.show();
    ring.setWindow(App.activeRecipe().shot);
    startStream();
    window.addEventListener('pointerup', stopShot, { once: true });
  }

  function stopShot() {
    const b = game.build;
    if (!b || !b.extracting) return;
    lever.classList.remove('on');
    setNeedle(0);                          // pressure released → needle falls back
    setBuild({ extracting: false, extracted: true });
    // espresso has been filling gradually during the pour; keep what landed.
    cup.render();
    stopStream();
    setTimeout(() => ring.hide(), 600);
    updateLever();
    emit('sfx', 'brew:stop');
    emit('sfx', 'shot');
    emit('step:done');
  }

  function startStream() {
    const sp = posInCounter(spouts, counter);
    const cp = posInCounter(cup.el, counter);
    const top = sp.y + sp.h;
    const height = Math.max(20, (cp.y + 26) - top);
    stream = makeStream(counter, 'espresso-stream pouring', sp.cx - 2, top, height);
  }
  function stopStream() { if (stream) { stream.remove(); stream = null; } }

  lever.addEventListener('pointerdown', startShot);

  // drive the shot clock
  on('tick', (dt) => {
    const b = game.build;
    if (!b || !b.extracting) return;
    let t = Math.min(MAX_T, b.shotTimeSec + dt);
    b.shotTimeSec = t;
    ring.setProgress(t / MAX_T, t);
    // pressure ramps up fast (pre-infusion → ~9 bar) and holds for the pour
    setNeedle(Math.min(1, t / 0.9));
    // coffee streams into the cup — fill its level gradually (full shot by ~6s)
    b.cup.espresso = Math.min(ESPRESSO_ML, (t / 6) * ESPRESSO_ML);
    cup.render();
    if (t >= MAX_T) stopShot();
  });

  on('build:changed', updateLever);

  return {
    reset() {
      grouphead.classList.remove('locked');
      tray.classList.remove('has-cup');
      lever.classList.remove('on');
      lever.disabled = true;
      ring.hide();
      setNeedle(0);
      stopStream();
    },
  };
}

// ---- shot-timer ring (SVG) ----
function makeRing() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'shot-timer');
  svg.setAttribute('viewBox', '0 0 60 60');
  svg.innerHTML = `
    <circle class="ring-bg" cx="30" cy="30" r="${RING_R}" transform="rotate(-90 30 30)"/>
    <circle class="ring-window" cx="30" cy="30" r="${RING_R}" transform="rotate(-90 30 30)"/>
    <circle class="ring-progress" cx="30" cy="30" r="${RING_R}" transform="rotate(-90 30 30)"
            stroke-dasharray="0 ${RING_C}"/>
    <text x="30" y="31">0.0</text>`;
  const win = svg.querySelector('.ring-window');
  const prog = svg.querySelector('.ring-progress');
  const label = svg.querySelector('text');
  return {
    svg,
    show() { svg.classList.add('show'); },
    hide() { svg.classList.remove('show'); prog.setAttribute('stroke-dasharray', `0 ${RING_C}`); label.textContent = '0.0'; },
    setWindow({ idealMin, idealMax }) {
      const start = idealMin / MAX_T, end = idealMax / MAX_T;
      const dash = (end - start) * RING_C;
      win.setAttribute('stroke-dasharray', `${dash} ${RING_C - dash}`);
      win.setAttribute('stroke-dashoffset', `${-start * RING_C}`);
    },
    setProgress(frac, seconds) {
      const dash = Math.min(1, frac) * RING_C;
      prog.setAttribute('stroke-dasharray', `${dash} ${RING_C - dash}`);
      label.textContent = seconds.toFixed(1);
    },
  };
}

Object.assign(App, {setupEspressoMachine});
})();

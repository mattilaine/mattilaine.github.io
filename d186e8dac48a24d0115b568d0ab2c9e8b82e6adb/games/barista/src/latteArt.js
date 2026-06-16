(function(){
var App=(window.App=window.App||{});
var {game, setBuild, emit} = App;
// Latte art: draw a crema surface + faint target guide on the cup canvas, let
// the player trace a pour path, then score how closely it matches the target.

// ---- Target patterns as normalized point paths (0..1, y down) ----
function heartPts() {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const t = Math.PI - (i / 40) * 2 * Math.PI; // start/end at bottom tip
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push({ x, y: -y });
  }
  return normalize(pts);
}

function tulipPts() {
  // central stem with three stacked "leaf" bumps
  const raw = [
    { x: 0, y: 1 }, { x: 0, y: .72 },
    { x: -.5, y: .66 }, { x: 0, y: .58 }, { x: .5, y: .66 }, { x: 0, y: .58 },
    { x: 0, y: .44 },
    { x: -.42, y: .4 }, { x: 0, y: .32 }, { x: .42, y: .4 }, { x: 0, y: .32 },
    { x: 0, y: .2 },
    { x: -.3, y: .16 }, { x: 0, y: .06 }, { x: .3, y: .16 }, { x: 0, y: .06 },
    { x: 0, y: 0 },
  ];
  return normalize(raw);
}

function rosettaPts() {
  // a fishbone zig-zag down the middle
  const pts = [];
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const y = i / n;
    const amp = 0.5 * (1 - y * 0.7);
    pts.push({ x: (i % 2 ? amp : -amp), y });
  }
  return normalize(pts);
}

function spiralPts() {
  // an Archimedean spiral wound from the centre outward (single sweep)
  const pts = [];
  const turns = 2.7, n = 90;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const ang = t * turns * 2 * Math.PI;
    const rad = 0.06 + t * 0.94;
    pts.push({ x: Math.cos(ang) * rad, y: Math.sin(ang) * rad });
  }
  return normalize(pts);
}

function wavePts() {
  // a serpentine column of S-waves drawn top to bottom
  const pts = [];
  const n = 64, waves = 3;
  for (let i = 0; i <= n; i++) {
    const y = i / n;
    pts.push({ x: Math.sin(y * waves * 2 * Math.PI) * 0.5, y });
  }
  return normalize(pts);
}

function leafPts() {
  // a pointed leaf outline: down one curved flank and back up the other
  const pts = [];
  const n = 26;
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push({ x:  Math.sin(Math.PI * t) * 0.5, y: t }); }
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push({ x: -Math.sin(Math.PI * t) * 0.5, y: 1 - t }); }
  return normalize(pts);
}

function swanPts() {
  // a swan: sweeping S-neck rising into a small head loop
  const pts = [];
  const n = 70;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // body/neck: an S curve climbing from bottom-left to top-right
    const x = -0.5 + t * 0.9 + 0.28 * Math.sin(t * Math.PI * 1.6);
    const y = 1 - t;
    pts.push({ x, y });
  }
  // little head loop at the end
  const last = pts[pts.length - 1];
  for (let i = 1; i <= 18; i++) {
    const a = (i / 18) * 2 * Math.PI;
    pts.push({ x: last.x + 0.12 * Math.cos(a) - 0.12, y: last.y + 0.12 * Math.sin(a) });
  }
  return normalize(pts);
}

const PATTERNS = {
  heart: heartPts(), tulip: tulipPts(), rosetta: rosettaPts(),
  spiral: spiralPts(), wave: wavePts(), leaf: leafPts(), swan: swanPts(),
};
const PATTERN_LABEL = {
  heart:   { title: 'Pour your heart 🤍', name: 'Heart' },
  tulip:   { title: 'Layer a tulip 🌷',   name: 'Tulip' },
  rosetta: { title: 'Draw a rosetta 🌿',  name: 'Rosetta' },
  spiral:  { title: 'Wind a spiral 🌀',   name: 'Spiral' },
  wave:    { title: 'Ripple some waves 〰️', name: 'Wave' },
  leaf:    { title: 'Trace a leaf 🍃',    name: 'Leaf' },
  swan:    { title: 'Sculpt a swan 🦢',   name: 'Swan' },
};
const PATTERN_KEYS = Object.keys(PATTERNS);

function normalize(pts) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  const sx = maxX - minX || 1, sy = maxY - minY || 1;
  return pts.map(p => ({ x: (p.x - minX) / sx, y: (p.y - minY) / sy }));
}

function createLatteArt({ cup }) {
  // ---- the dedicated full-screen art scene (built once, lazily) ----
  const SIZE = 460;            // big square tracing canvas
  const PAD = SIZE * 0.16;     // keeps the pattern inside the crema disc
  const scene = buildScene();
  const canvas = scene.canvas;
  const ctx = canvas.getContext('2d');

  let target = null;       // target points in big-canvas coords
  let trace = [];          // user points in big-canvas coords
  let drawing = false;
  let traced = false;      // has the player completed a stroke this round
  let pulseRAF = 0;
  let pulseT = 0;

  function toCanvasPt(p) {
    return { x: PAD + p.x * (SIZE - 2 * PAD), y: PAD + p.y * (SIZE - 2 * PAD) };
  }

  // A realistic top-down espresso surface: dark crema ring with a soft milky
  // pool poured into the centre (where the art floats).
  function drawSurface() {
    ctx.clearRect(0, 0, SIZE, SIZE);
    const cx = SIZE / 2, cy = SIZE / 2, R = SIZE * 0.46;

    // crema disc
    const crema = ctx.createRadialGradient(cx, cy - R * 0.18, R * 0.1, cx, cy, R);
    crema.addColorStop(0, '#cf9f6f');
    crema.addColorStop(0.7, '#b07f50');
    crema.addColorStop(1, '#7c5531');
    ctx.fillStyle = crema;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();

    // mottled crema speckle for texture
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    ctx.globalAlpha = 0.10;
    for (let i = 0; i < 90; i++) {
      const a = (i * 2.39996), rr = R * Math.sqrt((i % 30) / 30);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      ctx.fillStyle = i % 2 ? '#5e3c22' : '#e9c79d';
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // milky pour pool in the centre, with a soft feathered edge
    const pool = ctx.createRadialGradient(cx, cy, R * 0.05, cx, cy, R * 0.74);
    pool.addColorStop(0, '#fbf4e6');
    pool.addColorStop(0.6, '#f3e7d2');
    pool.addColorStop(0.85, 'rgba(225,196,156,0.55)');
    pool.addColorStop(1, 'rgba(176,127,80,0)');
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.74, 0, Math.PI * 2);
    ctx.fill();

    // glossy rim highlight on the cup edge
    ctx.save();
    ctx.lineWidth = 6;
    const sheen = ctx.createLinearGradient(0, cy - R, 0, cy + R);
    sheen.addColorStop(0, 'rgba(255,255,255,.5)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.strokeStyle = sheen;
    ctx.beginPath(); ctx.arc(cx, cy, R - 1, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function drawGuide() {
    if (!target) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(120,84,52,.5)';
    ctx.setLineDash([8, 7]);
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    strokePath(target);
    ctx.restore();
  }

  // Pulsing "start here" dot + a little arrow toward the second point so the
  // player knows where to begin and which way to trace.
  function drawStartCue(pulse) {
    if (!target || target.length < 2 || traced) return;
    const a = target[0], b = target[1];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    ctx.save();
    // pulsing ring
    const r = 9 + pulse * 7;
    ctx.strokeStyle = `rgba(76,175,80,${0.5 - pulse * 0.45})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, Math.PI * 2); ctx.stroke();
    // solid dot
    ctx.fillStyle = '#4caf50';
    ctx.beginPath(); ctx.arc(a.x, a.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(a.x, a.y, 8, 0, Math.PI * 2); ctx.stroke();
    // direction arrow, offset along the path
    const ax = a.x + Math.cos(ang) * 26, ay = a.y + Math.sin(ang) * 26;
    ctx.translate(ax, ay); ctx.rotate(ang);
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-11, -7); ctx.lineTo(-11, 7);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function strokePath(pts) {
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
  }

  function drawTrace() {
    if (trace.length < 2) return;
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // soft crema shadow skirt so the thick foam reads as raised microfoam
    ctx.strokeStyle = 'rgba(120,84,52,.4)';
    ctx.lineWidth = 46;
    ctx.shadowColor = 'rgba(0,0,0,.22)';
    ctx.shadowBlur = 12;
    strokePath(trace);
    // thick creamy foam body
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fbf3e6';
    ctx.lineWidth = 38;
    strokePath(trace);
    // inner cream tone for a little depth
    ctx.strokeStyle = '#fff8ec';
    ctx.lineWidth = 26;
    strokePath(trace);
    // glossy highlight ridge riding on top of the foam
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 11;
    strokePath(trace);
    ctx.restore();
  }

  function eventPt(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width * SIZE,
      y: (e.clientY - r.top) / r.height * SIZE,
    };
  }

  function onDown(e) {
    e.stopPropagation();
    e.preventDefault();
    stopPulse();
    drawing = true;
    trace = [eventPt(e)];
  }
  function onMove(e) {
    if (!drawing) return;
    e.stopPropagation();
    trace.push(eventPt(e));
    redraw();
  }
  function onUp(e) {
    if (!drawing) return;
    e.stopPropagation();
    drawing = false;
    traced = true;
    finalize();
  }

  function redraw(pulse) {
    drawSurface();
    drawGuide();
    drawStartCue(pulse || 0);
    drawTrace();
  }

  // Gentle pulse loop on the start cue until the player begins tracing.
  function startPulse() {
    const step = () => {
      pulseT = (pulseT + 0.03) % 1;
      redraw(0.5 - 0.5 * Math.cos(pulseT * Math.PI * 2));
      pulseRAF = requestAnimationFrame(step);
    };
    pulseRAF = requestAnimationFrame(step);
  }
  function stopPulse() {
    if (pulseRAF) cancelAnimationFrame(pulseRAF);
    pulseRAF = 0;
  }

  function finalize() {
    const recipe = App.activeRecipe();
    const score = trace.length < 4 ? 0 : scoreMatch(trace, target, recipe.art.tolerance, SIZE, SIZE);
    redraw();                 // final frame: surface + finished foam, no cues
    stampCup();               // mirror the art onto the real cup so the served drink shows it
    cup.setArtActive(false);
    detach();
    setBuild({ artDrawn: true, artScore: score });
    emit('sfx', 'art');
    emit('step:done');
    // let the player admire the result, then drift back to the counter
    scene.root.classList.add('done');
    setTimeout(() => { scene.hide(); }, 900);
  }

  // Scale the big scene canvas down onto the small cup canvas.
  function stampCup() {
    const cc = cup.canvas, cctx = cc.getContext('2d');
    cctx.clearRect(0, 0, cc.width, cc.height);
    cctx.drawImage(canvas, 0, 0, SIZE, SIZE, 0, 0, cc.width, cc.height);
  }

  function attach() {
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
  }
  function detach() {
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
  }

  return {
    activate() {
      const recipe = App.activeRecipe();
      if (!recipe.needs.art) return;
      // scored orders carry a fixed pattern; in free practice, surprise the
      // player with a random one each pour so all patterns get a workout
      let key = recipe.needs.art;
      if (!App.game.order) key = PATTERN_KEYS[Math.floor(Math.random() * PATTERN_KEYS.length)];
      if (!PATTERNS[key]) key = 'heart';
      target = PATTERNS[key].map(toCanvasPt);
      trace = [];
      traced = false;
      const label = PATTERN_LABEL[key] || { title: 'Trace the pattern', name: key };
      scene.title.textContent = label.title;
      scene.sub.textContent = `Trace the ${label.name.toLowerCase()} — start at the green dot.`;
      redraw();
      cup.setArtActive(true);
      scene.show();
      attach();
      startPulse();
    },
    reset() {
      drawing = false;
      traced = false;
      trace = [];
      target = null;
      stopPulse();
      detach();
      scene.hide();
      ctx.clearRect(0, 0, SIZE, SIZE);
    },
  };

  // ---- scene DOM (full-screen overlay inside the stage) ----
  function buildScene() {
    const root = document.createElement('div');
    root.id = 'art-scene';
    root.className = 'art-scene hidden';
    root.innerHTML = `
      <div class="art-stage">
        <div class="art-title"></div>
        <div class="art-sub"></div>
        <div class="art-saucer">
          <canvas class="art-canvas" width="${SIZE}" height="${SIZE}"></canvas>
        </div>
        <div class="art-foot">Drag across the crema in one smooth motion</div>
      </div>`;
    (document.querySelector('#stage') || document.body).appendChild(root);
    let hideTimer = 0;
    return {
      root,
      canvas: root.querySelector('.art-canvas'),
      title: root.querySelector('.art-title'),
      sub: root.querySelector('.art-sub'),
      foot: root.querySelector('.art-foot'),
      show() {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = 0; }
        root.classList.remove('hidden', 'done');
        requestAnimationFrame(() => root.classList.add('show'));
      },
      hide() {
        root.classList.remove('show', 'done');   // fade opacity to 0
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => { root.classList.add('hidden'); hideTimer = 0; }, 360);
      },
    };
  }
}

// Symmetric average nearest-neighbour distance between two paths, normalized
// against the canvas dimensions so scoring is resolution-independent.
function scoreMatch(userPx, targetPx, tolerance = 1, W = 144, H = 140) {
  const u = userPx.map(p => ({ x: p.x / W, y: p.y / H }));
  const t = targetPx.map(p => ({ x: p.x / W, y: p.y / H }));
  const dT = avgNearest(t, u);
  const dU = avgNearest(u, t);
  const d = (dT + dU) / 2;
  const score = 100 * (1 - d / (0.17 * tolerance));
  return Math.max(0, Math.min(100, Math.round(score)));
}

function avgNearest(a, b) {
  let sum = 0;
  for (const p of a) {
    let best = Infinity;
    for (const q of b) {
      const dx = p.x - q.x, dy = p.y - q.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < best) best = d2;
    }
    sum += Math.sqrt(best);
  }
  return sum / a.length;
}

// PATTERN_KEYS is exposed as ART_PATTERNS so orders can pick a pattern per drink.
Object.assign(App, {createLatteArt, ART_PATTERNS: PATTERN_KEYS});
})();

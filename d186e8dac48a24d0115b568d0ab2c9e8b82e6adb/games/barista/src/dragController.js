(function(){
var App=(window.App=window.App||{});
var {emit} = App;
// Pointer-Events drag controller: grab → move → hold-over-zone → drop.
// Everything draggable lives inside #counter, so positions are computed in
// "counter CSS coordinates" (accounting for the stage's scale transform).
// Hit-testing uses raw client rects, which is scale-agnostic.


const draggables = new Map(); // el -> config
const zones = [];             // { el, cfg }

let counterEl = null;
let counterRect = null;       // refreshed at drag start
let active = null;            // current drag { el, cfg, grab:{x,y} }
let currentZone = null;       // zone the pointer is currently over (accepting)
let lastT = 0;

function initDrag(counter) {
  counterEl = counter;
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  requestAnimationFrame(loop);
}

function registerDraggable(el, cfg) {
  draggables.set(el, cfg);
  el.addEventListener('pointerdown', (e) => onDown(e, el, cfg));
  return el;
}

function registerZone(el, cfg) {
  zones.push({ el, cfg });
  return el;
}

// Convert a client point into counter CSS coordinates.
function toCounter(clientX, clientY) {
  const scale = counterRect.width / counterEl.offsetWidth;
  return {
    x: (clientX - counterRect.left) / scale,
    y: (clientY - counterRect.top) / scale,
    scale,
  };
}

function onDown(e, el, cfg) {
  if (active) return;
  if (cfg.disabled && cfg.disabled()) return;
  e.preventDefault();
  counterRect = counterEl.getBoundingClientRect();
  const p = toCounter(e.clientX, e.clientY);
  active = {
    el, cfg,
    grab: { x: p.x - el.offsetLeft, y: p.y - el.offsetTop },
  };
  el.classList.add('grabbing');
  el.classList.remove('docked');
  el.style.transition = 'none';
  cfg.onPick && cfg.onPick();
}

function onMove(e) {
  if (!active) return;
  e.preventDefault();
  const p = toCounter(e.clientX, e.clientY);
  active.el.style.left = (p.x - active.grab.x) + 'px';
  active.el.style.top = (p.y - active.grab.y) + 'px';
  active.pointer = { x: p.x, y: p.y };

  // Which accepting zone is under the pointer?
  const hit = zoneAt(e.clientX, e.clientY);
  if (hit !== currentZone) {
    if (currentZone) {
      currentZone.el.classList.remove('zone-active', 'zone-ok');
      currentZone.cfg.onLeave && currentZone.cfg.onLeave(ctx());
    }
    currentZone = hit;
    if (currentZone) {
      if (currentZone.cfg.highlight !== false) currentZone.el.classList.add('zone-active', 'zone-ok');
      currentZone.cfg.onEnter && currentZone.cfg.onEnter(ctx());
    }
  }
}

function onUp() {
  if (!active) return;
  const drag = active;
  const zone = currentZone;
  active = null;

  drag.el.classList.remove('grabbing');
  if (zone) {
    zone.el.classList.remove('zone-active', 'zone-ok');
    const docked = zone.cfg.onDrop && zone.cfg.onDrop(ctx(drag, zone));
    currentZone = null;
    if (docked === 'dock' || docked === true) {
      drag.el.classList.add('docked');
      drag.cfg.onReturn && drag.cfg.onReturn(false);
      return;
    }
  }
  currentZone = null;
  returnHome(drag);
}

function returnHome(drag) {
  const { el, cfg } = drag;
  el.style.transition = 'left .18s ease, top .18s ease';
  el.style.left = cfg.homeLeft + 'px';
  el.style.top = cfg.homeTop + 'px';
  setTimeout(() => { el.style.transition = 'none'; }, 200);
  cfg.onReturn && cfg.onReturn(true);
}

function zoneAt(clientX, clientY) {
  const type = active.cfg.type;
  // topmost matching zone wins (iterate in reverse registration order)
  for (let i = zones.length - 1; i >= 0; i--) {
    const z = zones[i];
    const acc = z.cfg.accepts;
    const ok = acc === '*' || (Array.isArray(acc) ? acc.includes(type) : acc === type);
    if (!ok) continue;
    const r = z.el.getBoundingClientRect();
    if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
      return z;
    }
  }
  return null;
}

function ctx(drag = active, zone = currentZone) {
  return {
    tool: drag ? drag.el : null,
    toolType: drag ? drag.cfg.type : null,
    pointer: drag ? drag.pointer : null,
    zone: zone ? zone.el : null,
  };
}

function loop(t) {
  const dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 0;
  lastT = t;
  emit('tick', dt);
  // Continuous "hold" action while the pointer rests over an accepting zone.
  if (active && currentZone && currentZone.cfg.onHold) {
    currentZone.cfg.onHold(dt, ctx());
  }
  requestAnimationFrame(loop);
}

// Absolute offset of a node within #counter (walks the offsetParent chain),
// since a zone may be nested inside a station while tools sit directly on the
// counter.
function offsetInCounter(node) {
  let x = 0, y = 0, n = node;
  while (n && n !== counterEl) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  return { x, y };
}

// --- helpers used by stations to snap a tool into a zone ---------------
function snapToZone(el, zoneEl, { offsetX = 0, offsetY = 0, center = true } = {}) {
  const z = offsetInCounter(zoneEl);
  let left = z.x + offsetX, top = z.y + offsetY;
  if (center) {
    // center the tool within the zone, then apply offset
    left = z.x + (zoneEl.offsetWidth - el.offsetWidth) / 2 + offsetX;
    top = z.y + (zoneEl.offsetHeight - el.offsetHeight) / 2 + offsetY;
  }
  el.style.transition = 'left .15s ease, top .15s ease';
  el.style.left = left + 'px';
  el.style.top = top + 'px';
  setTimeout(() => { el.style.transition = 'none'; }, 160);
}

function isDragging() { return !!active; }

Object.assign(App, {initDrag, registerDraggable, registerZone, snapToZone, isDragging});
})();

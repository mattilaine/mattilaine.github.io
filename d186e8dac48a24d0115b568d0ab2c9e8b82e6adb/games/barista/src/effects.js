(function(){
var App=(window.App=window.App||{});
// Small visual-effect helpers (streams, steam puffs, score popups) plus a
// geometry helper for positioning things in #counter coordinates.

// Absolute position of `el` within `counter`, walking the offsetParent chain.
function posInCounter(el, counter) {
  let x = 0, y = 0, node = el;
  while (node && node !== counter) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight, cx: x + el.offsetWidth / 2, cy: y + el.offsetHeight / 2 };
}

// A vertical liquid stream between top `y` and the cup surface.
function makeStream(counter, className, x, top, height) {
  const s = document.createElement('div');
  s.className = className;
  s.style.left = x + 'px';
  s.style.top = top + 'px';
  s.style.height = height + 'px';
  counter.appendChild(s);
  return s;
}

function puff(counter, x, y) {
  const p = document.createElement('div');
  p.className = 'steam-puff';
  p.style.left = (x - 8 + (Math.sin(x + y) * 6)) + 'px';
  p.style.top = y + 'px';
  counter.appendChild(p);
  setTimeout(() => p.remove(), 1100);
}

function scorePop(counter, x, y, text, color = '#fff') {
  const el = document.createElement('div');
  el.className = 'score-pop';
  el.textContent = text;
  el.style.color = color;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  counter.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

// True when two elements' on-screen rects intersect. Uses client rects so it is
// agnostic to the stage's scale transform (same basis as the drag hit-testing).
function overlaps(a, b) {
  if (!a || !b) return false;
  const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect();
  return r1.left < r2.right && r1.right > r2.left &&
         r1.top < r2.bottom && r1.bottom > r2.top;
}

Object.assign(App, {posInCounter, makeStream, puff, scorePop, overlaps});
})();

(function(){
var App = (window.App = window.App || {});
var { emit } = App;

// Day / night mood toggle. Mirrors the mute button: a single persisted preference
// that flips a class on <html>; all the actual lighting lives in CSS.

const KEY = 'barista.theme';

function loadTheme() {
  try { return localStorage.getItem(KEY) === 'day' ? 'day' : 'night'; } catch (e) { return 'night'; }
}
function saveTheme(t) {
  try { localStorage.setItem(KEY, t); } catch (e) {}
}

let theme = loadTheme();

function applyTheme(t) {
  const root = document.documentElement;
  root.classList.toggle('theme-day', t === 'day');
  root.classList.toggle('theme-night', t === 'night');
  if (emit) emit('theme:changed', t);
}

function renderButton(btn) {
  if (!btn) return;
  const isDay = theme === 'day';
  btn.textContent = isDay ? '☀️' : '🌙';
  btn.setAttribute('aria-label', isDay ? 'Switch to night mode' : 'Switch to day mode');
}

function getTheme() { return theme; }
function setTheme(t) {
  theme = (t === 'day') ? 'day' : 'night';
  applyTheme(theme);
  saveTheme(theme);
}

function setupTheme() {
  const btn = document.querySelector('#theme-btn');
  applyTheme(theme);
  renderButton(btn);
  if (btn) btn.addEventListener('click', () => {
    setTheme(theme === 'day' ? 'night' : 'day');
    renderButton(btn);
  });
  return { getTheme, setTheme };
}

Object.assign(App, { setupTheme });
})();

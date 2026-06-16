(function(){
var App=(window.App=window.App||{});
var {game, on, emit, startShift, resetBuild, nextStepHint, buildQueue, scoreDrink, initDrag, createPortafilter, createPitcher, createCup, setupTamper, setupGrinder, setupEspressoMachine, setupSteamWand, setupWaterTap, setupCounter, createLatteArt, setupHud, setupOrderTicket, setupFeedback, setupAudio, setupTheme} = App;
// Bootstrap: wire tools, stations, UI and run the shift loop.




const stage = document.querySelector('#stage');
const counter = document.querySelector('#counter');
const hintBar = document.querySelector('#hint-bar');
const avatar = document.querySelector('#customer-avatar');
const screen = document.querySelector('#screen-overlay');

// ---- responsive scaling of the fixed-size stage ----
function scaleStage() {
  const s = Math.min(window.innerWidth / 1280, window.innerHeight / 800);
  stage.style.transform = `scale(${s})`;
}
window.addEventListener('resize', scaleStage);
scaleStage();

// ---- build the scene ----
initDrag(counter);

const portafilter = createPortafilter(counter);
const pitcher = createPitcher(counter);
const cup = createCup(counter);
const latteArt = createLatteArt({ cup });

setupTamper({ counter, portafilter });
const resettables = [
  setupGrinder({ counter, portafilter }),
  setupEspressoMachine({ counter, portafilter, cup }),
  setupSteamWand({ counter, pitcher }),
  setupWaterTap({ counter, cup }),
  setupCounter({ counter, cup, pitcher }),
];

const hud = setupHud();
const ticket = setupOrderTicket();
const feedback = setupFeedback();

const orderTicketEl = document.querySelector('#order-ticket');
const cwPanel = document.querySelector('#cw-panel');
let queue = [];

function resetAll() {
  resetBuild();
  portafilter.reset();
  pitcher.reset();
  cup.reset();
  latteArt.reset();
  resettables.forEach(r => r && r.reset && r.reset());
}

function styleAvatar() {
  avatar.style.fontSize = '52px';
  avatar.style.display = 'flex';
  avatar.style.alignItems = 'center';
  avatar.style.justifyContent = 'center';
}

// Show a panel (practice / shift summary) in the customer window; hide the ticket.
function showPanel(html) {
  orderTicketEl.classList.add('hidden');
  cwPanel.classList.remove('hidden');
  cwPanel.innerHTML = html;
  const btn = cwPanel.querySelector('#start-btn');
  if (btn) btn.addEventListener('click', beginShift, { once: true });
}
function showTicket() {
  cwPanel.classList.add('hidden');
  orderTicketEl.classList.remove('hidden');
}

// ---- free practice: equipment always usable, nothing blocks the counter ----
function enterPractice(html) {
  game.phase = 'practice';
  game.order = null;
  resetAll();
  avatar.textContent = '🎓';
  styleAvatar();
  hud.update();
  showPanel(html || `
    <div class="cw-title">🎓 Practice mode</div>
    <div class="cw-sub">Warm up — use any equipment freely. Serve at the hatch to reset the cup.</div>
    <button class="btn cw-btn" id="start-btn">Start shift</button>`);
  refreshHint();
}

// ---- scored shift / customer loop ----
function loadCustomer(i) {
  game.order = queue[i];
  resetAll();
  avatar.textContent = game.order.face;
  styleAvatar();
  hud.update();
  showTicket();
  ticket.update(game.order, game.build);
  refreshHint();
}

function serveDrink() {
  if (!game.order) {
    // practice: clear the cup and keep going (no scoring, no blocking)
    hintBar.textContent = 'Nice cup! ☕  Cup cleared — practise another.';
    resetAll();
    refreshHint();
    return;
  }
  const result = scoreDrink(game.build, game.order.recipe);
  game.totalScore += result.total;
  hud.update();
  feedback.show(game.order, result, () => {
    if (game.customerIndex + 1 >= game.shiftLength) endShift();
    else { game.customerIndex++; loadCustomer(game.customerIndex); }
  });
}

function refreshHint() {
  hintBar.style.opacity = '1';
  if (game.phase === 'practice') {
    hintBar.textContent = 'Practise freely: grind → tamp → lock → pull a shot, steam & pour milk, trace art — then serve.';
    return;
  }
  if (game.phase !== 'serving' || !game.order) return;
  hintBar.textContent = nextStepHint(game.build, App.activeRecipe());
}

function beginShift() {
  showTicket();
  queue = buildQueue(game.shiftLength);
  startShift();
  loadCustomer(0);
}

// Non-blocking end: drop back into free practice with a summary in the panel.
function endShift() {
  const max = game.shiftLength * 100;
  const pct = Math.round((game.totalScore / max) * 100);
  const grade = pct >= 90 ? 'Master Barista' : pct >= 75 ? 'Senior Barista'
    : pct >= 55 ? 'Barista' : pct >= 35 ? 'Trainee' : 'Keep practising!';
  enterPractice(`
    <div class="cw-title">Shift complete — ${game.totalScore} / ${max}</div>
    <div class="cw-sub">Rank: <strong>${grade}</strong>. Practise freely, or start another shift.</div>
    <button class="btn cw-btn" id="start-btn">Work another shift</button>`);
}

// ---- event wiring ----
on('serve', serveDrink);
on('serve:incomplete', () => {
  hintBar.textContent = game.order
    ? "That's not ready yet — check the order ticket."
    : 'Make something first, then serve to reset the cup.';
});
on('milk:poured', () => { if (game.build && game.build.milkSteamed) latteArt.activate(); });
on('build:changed', () => { if (game.order) ticket.update(game.order, game.build); refreshHint(); });
on('step:done', () => { if (game.order) ticket.update(game.order, game.build); refreshHint(); });

// ---- sound ----
const audio = setupAudio();
const muteBtn = document.querySelector('#mute-btn');
function renderMute() {
  if (!muteBtn) return;
  muteBtn.textContent = audio.isMuted() ? '🔇' : '🔊';
  muteBtn.classList.toggle('muted', audio.isMuted());
  muteBtn.setAttribute('aria-label', audio.isMuted() ? 'Unmute sound' : 'Mute sound');
}
if (muteBtn) muteBtn.addEventListener('click', () => { audio.setMuted(!audio.isMuted()); renderMute(); });
renderMute();

// ---- day / night mood ----
setupTheme();

enterPractice();

})();

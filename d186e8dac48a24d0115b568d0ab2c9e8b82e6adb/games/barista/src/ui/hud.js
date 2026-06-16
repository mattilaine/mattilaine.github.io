(function(){
var App=(window.App=window.App||{});
var {game} = App;
// Top HUD: shift progress + running score.

function setupHud() {
  const custEl = document.querySelector('#hud-customer');
  const scoreEl = document.querySelector('#hud-score');
  return {
    update() {
      if (game.phase === 'practice') {
        custEl.textContent = 'Practice';
      } else {
        const n = Math.min(game.customerIndex + 1, game.shiftLength);
        custEl.textContent = `${n} / ${game.shiftLength}`;
      }
      scoreEl.textContent = game.totalScore;
    },
  };
}

Object.assign(App, {setupHud});
})();

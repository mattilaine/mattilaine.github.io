(function(){
var App=(window.App=window.App||{});
var {game} = App;
// Per-drink feedback card with score breakdown and the customer's reaction.

function setupFeedback() {
  const overlay = document.querySelector('#feedback-overlay');
  const avatar = document.querySelector('#customer-avatar');

  return {
    show(order, result, onContinue) {
      const last = game.customerIndex + 1 >= game.shiftLength;
      avatar.classList.toggle('happy', result.stars >= 4);
      avatar.classList.toggle('sad', result.stars <= 2);

      const starStr = '★'.repeat(result.stars) + '☆'.repeat(5 - result.stars);
      const rowsHtml = result.rows.map(r => `
        <div class="score-row">
          <span>${r.label}${r.note ? ` <em style="opacity:.6">— ${r.note}</em>` : ''}</span>
          <span class="score-bar-track"><span class="score-bar-fill" data-w="${Math.round(r.frac * 100)}"></span></span>
          <span class="pts">${r.max ? `${r.pts}/${r.max}` : r.pts}</span>
        </div>`).join('');

      overlay.innerHTML = `
        <div class="feedback-card fade-in">
          <div class="ticket-name">${order.face} ${order.name}'s ${order.recipe.name}</div>
          <div class="feedback-stars" style="color:${starColor(result.stars)}">${starStr}</div>
          ${rowsHtml}
          <div class="score-row" style="font-size:18px;font-weight:bold">
            <span>Drink score</span><span></span><span class="pts">${result.total}</span>
          </div>
          <p class="customer-quote">“${result.quote}”</p>
          <button class="btn" id="fb-continue">${last ? 'Finish shift' : 'Next customer'}</button>
        </div>`;

      overlay.classList.remove('hidden');
      requestAnimationFrame(() => {
        overlay.querySelectorAll('.score-bar-fill').forEach(el => {
          el.style.width = el.dataset.w + '%';
          if (+el.dataset.w < 45) el.style.background = 'var(--bad)';
          else if (+el.dataset.w < 75) el.style.background = 'var(--mid)';
        });
      });
      overlay.querySelector('#fb-continue').addEventListener('click', () => {
        overlay.classList.add('hidden');
        avatar.classList.remove('happy', 'sad');
        onContinue();
      }, { once: true });
    },
  };
}

function starColor(stars) {
  if (stars >= 4) return '#f6b73c';
  if (stars === 3) return '#e0a93c';
  return '#c98b3c';
}

Object.assign(App, {setupFeedback});
})();

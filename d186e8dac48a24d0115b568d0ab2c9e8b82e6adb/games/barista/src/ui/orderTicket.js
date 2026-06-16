(function(){
var App=(window.App=window.App||{});
// Renders the current order ticket and ticks off steps as they're completed.

function checklist(order, build) {
  const r = order.recipe, n = r.needs, items = [];
  if (n.shot) items.push({ text: 'Pull espresso shot', done: build.extracted });
  if (n.water) items.push({ text: 'Top up with hot water', done: build.waterAdded });
  if (n.milk) {
    items.push({ text: `Steam ${r.milk.label}`, done: build.milkSteamed });
    items.push({ text: 'Pour milk into cup', done: build.milkPoured });
  }
  if (n.art) items.push({ text: `Trace a ${n.art}`, done: build.artDrawn });
  return items;
}

function setupOrderTicket() {
  const nameEl = document.querySelector('.ticket-name');
  const drinkEl = document.querySelector('.ticket-drink');
  const listEl = document.querySelector('.ticket-recipe');

  return {
    update(order, build) {
      if (!order) return;
      nameEl.textContent = `${order.face}  ${order.name} ordered:`;
      drinkEl.textContent = `${order.recipe.emoji} ${order.recipe.name}`;
      listEl.innerHTML = checklist(order, build)
        .map(it => `<li class="${it.done ? 'done' : ''}">${it.text}</li>`)
        .join('');
    },
  };
}

Object.assign(App, {setupOrderTicket});
})();

# ☕ Barista Simulator

A first-person, browser-based barista game. You stand behind the counter, take
each customer's order, and craft the drink by **dragging** equipment with your
mouse — grind & tamp, pull the shot inside the timing window, steam silky milk,
and trace latte art. Every drink is scored; serve a full shift and earn a rank.

Pure HTML / CSS / vanilla JS (ES modules) — **no build step, no dependencies.**

## Run it

Just **double-click `index.html`** — it runs straight from `file://`, no server
needed (scripts are plain classic scripts loaded in order). A static server also
works if you prefer:

```bash
cd barista
python3 -m http.server 8000   # then open http://localhost:8000
```

Mouse is the primary input (touch also works).

## Practice & shifts

The game opens in **free-practice mode**: all equipment is usable right away with
no order and nothing blocking the counter — warm up as long as you like, and drag
a cup to the serve hatch to clear it. Press **Start shift** (in the order panel) to
serve 6 scored customers; when the shift ends you drop back into practice.

## Drinks

| Drink | Steps |
|-------|-------|
| ☕ Espresso | grind → tamp → lock → place cup → pull shot |
| 💧 Americano | espresso shot → top up at the hot-water tap |
| 🥛 Latte | shot → steam silky microfoam → pour → trace a **heart** |
| 🫧 Cappuccino | shot → steam airy foam → pour → trace a **tulip** |

## How to play

1. **Grind** — grab the portafilter, hold it under the grinder to dose grounds.
2. **Tamp** — drag the tamper onto the dosed portafilter.
3. **Lock** — drop the portafilter into the group head.
4. **Cup** — drag a cup onto the drip tray.
5. **Pull** — hold the lever and release inside the green window on the shot clock.
6. **Milk** (latte/cappuccino) — grab the pitcher at the fridge to fill it, hold it
   under the steam wand until the foam meter reaches the target band, then drag it
   over the cup and hold to pour.
7. **Art** — trace the dashed pattern on the crema.
8. **Serve** — carry the cup to the serve hatch.

## Project layout

```
index.html              styles/ (main, stations, animations)
src/
  main.js               bootstrap + shift loop
  state.js  recipes.js  orders.js  scoring.js  dragController.js  latteArt.js  effects.js
  tools/    portafilter, milkPitcher, cup, tamper
  stations/ grinder, espressoMachine, steamWand, waterTap, counter
  ui/       hud, orderTicket, feedback
```

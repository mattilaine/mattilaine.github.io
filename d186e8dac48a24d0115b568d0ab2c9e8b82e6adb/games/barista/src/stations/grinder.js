(function(){
var App=(window.App=window.App||{});
var {game, setBuild, emit, registerZone} = App;
// Grinder: hold the (empty) portafilter under it to dose grounds.

const DOSE_TIME = 1.3; // seconds of holding to fill

function setupGrinder({ counter, portafilter }) {
  const zone = counter.querySelector('#station-grinder');
  let progress = 0;

  registerZone(zone, {
    id: 'grinder',
    accepts: 'portafilter',
    onEnter: () => {},
    onLeave: () => { zone.classList.remove('grinding'); },
    onHold: (dt) => {
      const b = game.build;
      if (!b || b.portafilter !== 'empty') return;
      zone.classList.add('grinding');
      emit('sfx', 'grind');
      progress = Math.min(1, progress + dt / DOSE_TIME);
      portafilter.setDose(progress);
      if (progress >= 1) {
        zone.classList.remove('grinding');
        progress = 0;
        setBuild({ portafilter: 'dosed' });
        emit('sfx', 'dose');
      }
    },
    onDrop: () => false, // portafilter returns to its dock after dosing
  });

  // reset local progress whenever a new drink starts
  return { reset() { progress = 0; } };
}

Object.assign(App, {setupGrinder});
})();

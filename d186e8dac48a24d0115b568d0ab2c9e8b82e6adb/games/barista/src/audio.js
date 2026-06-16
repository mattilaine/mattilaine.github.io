(function(){
var App=(window.App=window.App||{});
var {on} = App;
// All game sound, synthesized with the Web Audio API (no audio files; runs from
// file://). Stations stay decoupled: they emit('sfx', name) / emit('serve') on
// the shared bus and we listen here. Public surface: App.setupAudio().

function setupAudio() {
  let ac = null, master = null, noiseBuffer = null;
  let muted = loadMuted();

  // --- context lifecycle (created/resumed on first user gesture) ---
  function ensureContext() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain();
        master.gain.value = muted ? 0 : 1;
        master.connect(ac.destination);
        noiseBuffer = makeNoiseBuffer(ac);
      } catch (e) { ac = null; }
    }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }

  function makeNoiseBuffer(ctx) {
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // --- one-shot voices: [freq, dur, wave, gain, slideTo?] ---
  const ONESHOT = {
    tamp: { freq: 80,  dur: 0.10, wave: 'square',   gain: 0.10 },
    lock: { freq: 320, dur: 0.05, wave: 'square',   gain: 0.06 },
    cup:  { freq: 680, dur: 0.07, wave: 'triangle', gain: 0.05, slideTo: 540 },
    fill: { freq: 240, dur: 0.12, wave: 'sine',     gain: 0.05, slideTo: 300 },
    art:  { freq: 680, dur: 0.12, wave: 'sine',     gain: 0.05 },
    dose: { freq: 520, dur: 0.08, wave: 'triangle', gain: 0.05 },
    shot: { freq: 150, dur: 0.16, wave: 'sawtooth', gain: 0.04 },
  };

  function oneShot(name) {
    const ctx = ensureContext();
    if (!ctx) return;
    const s = ONESHOT[name];
    if (!s) return;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = s.wave;
    osc.frequency.setValueAtTime(s.freq, ctx.currentTime);
    if (s.slideTo) osc.frequency.exponentialRampToValueAtTime(s.slideTo, ctx.currentTime + s.dur);
    g.gain.setValueAtTime(s.gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + s.dur);
    osc.connect(g); g.connect(master);
    osc.start(); osc.stop(ctx.currentTime + s.dur);
  }

  // serve = pleasant two-note chime
  function serveChime() {
    const ctx = ensureContext();
    if (!ctx) return;
    [[523, 0], [784, 0.11]].forEach(([f, t]) => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = f;
      const start = ctx.currentTime + t;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.07, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
      osc.connect(g); g.connect(master);
      osc.start(start); osc.stop(start + 0.26);
    });
  }

  // --- sustained voices: filtered noise loop ---
  const SUSTAINED = {
    grind: { filter: 'lowpass',  freq: 700,  q: 1.0, gain: 0.10 },
    steam: { filter: 'highpass', freq: 3500, q: 0.7, gain: 0.06 },
    water: { filter: 'bandpass', freq: 1400, q: 1.0, gain: 0.07 },
    brew:  { filter: 'bandpass', freq: 900,  q: 1.2, gain: 0.06 },
  };
  const voices = {}; // name -> { src, gain, timer }

  function startVoice(name) {
    const ctx = ensureContext();
    if (!ctx) return null;
    if (voices[name]) return voices[name];
    const cfg = SUSTAINED[name];
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer; src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = cfg.filter; filter.frequency.value = cfg.freq; filter.Q.value = cfg.q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(cfg.gain, ctx.currentTime + 0.08);
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start();
    voices[name] = { src, gain: g, timer: null };
    return voices[name];
  }

  function stopVoice(name) {
    const v = voices[name];
    if (!v) return;
    if (v.timer) { clearTimeout(v.timer); v.timer = null; }
    try {
      v.gain.gain.cancelScheduledValues(ac.currentTime);
      v.gain.gain.setValueAtTime(v.gain.gain.value, ac.currentTime);
      v.gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.12);
      v.src.stop(ac.currentTime + 0.13);
    } catch (e) {}
    delete voices[name];
  }

  // keep-alive: (re)trigger a sustained voice; auto-stops 150ms after last call
  function keepAlive(name) {
    const v = startVoice(name);
    if (!v) return;
    if (v.timer) clearTimeout(v.timer);
    v.timer = setTimeout(() => stopVoice(name), 150);
  }

  // --- mute persistence ---
  function loadMuted() {
    try { return localStorage.getItem('barista.muted') === '1'; } catch (e) { return false; }
  }
  function saveMuted(m) {
    try { localStorage.setItem('barista.muted', m ? '1' : '0'); } catch (e) {}
  }
  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 1;
    saveMuted(m);
  }

  // --- event wiring ---
  on('sfx', (type) => {
    if (type === 'grind' || type === 'steam' || type === 'water') return keepAlive(type);
    if (type === 'brew') return startVoice('brew');      // explicit start
    if (type === 'brew:stop') return stopVoice('brew');  // explicit stop
    oneShot(type);
  });
  on('serve', serveChime);

  // create/resume context on the very first user gesture (autoplay policy)
  const initOnce = () => { ensureContext(); window.removeEventListener('pointerdown', initOnce); };
  window.addEventListener('pointerdown', initOnce);

  return { setMuted, isMuted: () => muted };
}

Object.assign(App, {setupAudio});
})();

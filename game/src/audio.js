// The Midnight Vault — all sound is synthesized with WebAudio.
// No audio files ship with the game, so nothing is fetched at runtime.
let ctx = null;
let master = null;
let muted = false;

export function setMuted(m) {
  muted = !!m;
  if (master) master.gain.value = muted ? 0 : 0.5;
}

export function ensureAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (!ctx || !master || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol, pan, lowpass = 1200) {
  if (!ctx || !master || muted) return;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const g = ctx.createGain();
  g.gain.value = vol;
  const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (panner) {
    panner.pan.value = pan;
    src.connect(filter);
    filter.connect(g);
    g.connect(panner);
    panner.connect(master);
  } else {
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
  }
  src.start();
}

export const sfx = {
  // Soft shoe tap; volume follows how close the nearest guard is.
  step(sneaking, guardDist) {
    const closeness = Math.max(0, 1 - guardDist / 420);
    const vol = sneaking ? 0.03 + closeness * 0.05 : 0.06 + closeness * 0.12;
    noiseBurst(0.06, vol, 0, sneaking ? 500 : 900);
  },
  guardStep(pan, dist) {
    const vol = Math.max(0, 0.16 * (1 - dist / 520));
    if (vol <= 0.01) return;
    noiseBurst(0.08, vol, pan, 700);
  },
  pickup() {
    tone(880, 0.12, 'sine', 0.22);
    tone(1318, 0.2, 'sine', 0.2, 0.07);
  },
  unlock() {
    tone(523, 0.1, 'triangle', 0.2);
    tone(784, 0.16, 'triangle', 0.2, 0.08);
  },
  spotted() {
    tone(220, 0.16, 'square', 0.12, 0, 440);
  },
  cameraBeep() {
    tone(1567, 0.07, 'sine', 0.1);
  },
  laserZap() {
    tone(1800, 0.1, 'sawtooth', 0.1, 0, 300);
  },
  caught() {
    tone(196, 0.5, 'sawtooth', 0.22, 0, 98);
    tone(147, 0.6, 'sawtooth', 0.18, 0.1, 73);
  },
  levelClear() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.2, i * 0.09));
  },
  win() {
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.3, 'triangle', 0.2, i * 0.11));
  },
  click() {
    tone(660, 0.06, 'sine', 0.14);
  },
};

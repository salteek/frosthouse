// Every sound in Frosthouse is synthesised with Web Audio: granite rumble, the clack of a hit,
// brooms on pebble, the crowd and the end horn. No sample files.

let ctx = null;
let master = null;
let muted = false;
let rumble = null;
let brush = null;
let noise = null;

function noiseBuffer(seconds) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function loopNoise(type, freq, q) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = 0;
  src.connect(f).connect(g).connect(master);
  src.start();
  return { f, g };
}

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.6;
  master.connect(ctx.destination);
  noise = noiseBuffer(2);
  rumble = loopNoise('lowpass', 140, 0.7);
  brush = loopNoise('bandpass', 2600, 0.9);
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.setTargetAtTime(muted ? 0 : 0.6, ctx.currentTime, 0.05);
  return muted;
}

export const isMuted = () => muted;

// Continuous sounds follow the fastest stone and whether anyone is sweeping.
export function setIceSounds(speed, sweeping) {
  if (!ctx) return;
  const t = ctx.currentTime;
  rumble.g.gain.setTargetAtTime(Math.min(0.5, speed * 0.16), t, 0.06);
  rumble.f.frequency.setTargetAtTime(90 + speed * 40, t, 0.1);
  brush.g.gain.setTargetAtTime(sweeping ? 0.07 + 0.04 * Math.abs(Math.sin(t * 22)) : 0, t, 0.03);
}

function tone({ freq, to = freq, type = 'sine', dur = 0.2, vol = 0.2, delay = 0 }) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function hiss({ dur = 0.3, vol = 0.2, freq = 1200, q = 0.7, delay = 0, attack = 0.01 }) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

export const sfx = {
  clack: (impulse) => {
    const v = Math.min(0.5, 0.08 + impulse * 0.12);
    tone({ freq: 1900, to: 700, type: 'triangle', dur: 0.09, vol: v });
    tone({ freq: 240, to: 120, type: 'sine', dur: 0.18, vol: v * 0.8 });
    hiss({ dur: 0.08, vol: v * 0.6, freq: 3500 });
  },
  release: () => hiss({ dur: 0.5, vol: 0.12, freq: 500, attack: 0.15 }),
  perfect: () => {
    tone({ freq: 880, type: 'sine', dur: 0.15, vol: 0.12 });
    tone({ freq: 1320, type: 'sine', dur: 0.25, vol: 0.12, delay: 0.08 });
  },
  tick: () => tone({ freq: 1400, type: 'square', dur: 0.03, vol: 0.03 }),
  toggle: () => tone({ freq: 620, to: 820, type: 'triangle', dur: 0.08, vol: 0.08 }),
  click: () => tone({ freq: 700, to: 1000, type: 'triangle', dur: 0.07, vol: 0.1 }),
  hover: () => tone({ freq: 900, type: 'sine', dur: 0.03, vol: 0.03 }),
  cheer: (size = 1) => {
    hiss({ dur: 1.4 + size * 0.6, vol: 0.12 + size * 0.08, freq: 1500, q: 0.3, attack: 0.25 });
    hiss({ dur: 1.0 + size * 0.5, vol: 0.06 + size * 0.05, freq: 3200, q: 0.5, attack: 0.2, delay: 0.1 });
  },
  groan: () => {
    hiss({ dur: 0.9, vol: 0.1, freq: 400, q: 0.6, attack: 0.15 });
    tone({ freq: 300, to: 180, type: 'sawtooth', dur: 0.6, vol: 0.04 });
  },
  buzzer: () => tone({ freq: 150, to: 140, type: 'square', dur: 0.4, vol: 0.08 }),
  horn: () => {
    tone({ freq: 220, to: 218, type: 'sawtooth', dur: 0.9, vol: 0.08 });
    tone({ freq: 330, to: 327, type: 'sawtooth', dur: 0.9, vol: 0.06 });
  },
  fanfare: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.5, vol: 0.12, delay: i * 0.13 }));
  },
  // Skills and elemental combos.
  bolt: () => {
    tone({ freq: 2400, to: 500, type: 'sawtooth', dur: 0.35, vol: 0.06 });
    hiss({ dur: 0.4, vol: 0.14, freq: 4200, q: 1.2, attack: 0.02 });
  },
  thunder: () => {
    hiss({ dur: 0.12, vol: 0.3, freq: 5000, q: 0.4 });
    hiss({ dur: 1.2, vol: 0.22, freq: 180, q: 0.5, attack: 0.04, delay: 0.05 });
    tone({ freq: 90, to: 40, type: 'sawtooth', dur: 0.8, vol: 0.1, delay: 0.04 });
  },
  gale: () => {
    hiss({ dur: 1.1, vol: 0.2, freq: 700, q: 0.8, attack: 0.3 });
    tone({ freq: 260, to: 300, type: 'sawtooth', dur: 0.7, vol: 0.05 });
  },
  lock: () => {
    [1568, 2093, 2637].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.35, vol: 0.07, delay: i * 0.06 }));
    hiss({ dur: 0.3, vol: 0.1, freq: 6000, q: 1 });
  },
  fire: () => {
    hiss({ dur: 0.8, vol: 0.2, freq: 300, q: 0.3, attack: 0.02 });
    tone({ freq: 120, to: 60, type: 'sawtooth', dur: 0.5, vol: 0.08 });
  },
  hail: () => {
    for (let i = 0; i < 8; i++) tone({ freq: 2200 + i * 130, to: 900, type: 'triangle', dur: 0.06, vol: 0.05, delay: i * 0.05 });
  },
  sad: () => {
    [392, 330, 262].forEach((f, i) => tone({ freq: f, to: f * 0.97, type: 'triangle', dur: 0.6, vol: 0.1, delay: i * 0.22 }));
  },
};

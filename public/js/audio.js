const STORAGE_KEY = 'xiaoxiaole-muted';

let ctx = null;
let muted = localStorage.getItem(STORAGE_KEY) === '1';

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = Boolean(value);
  localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
}

export function toggleMuted() {
  setMuted(!muted);
  ensure();
  return muted;
}

export function ensure() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type, gain, delay = 0, slide = 0) {
  if (muted) return;
  const audio = ensure();
  if (!audio) return;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  const start = audio.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), start + dur);
  amp.gain.setValueAtTime(Math.max(0.0001, gain), start);
  amp.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(amp);
  amp.connect(audio.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

export function playSelect() {
  tone(720, 0.05, 'sine', 0.045);
}

export function playSwap() {
  tone(420, 0.07, 'triangle', 0.04, 0, 560);
}

export function playFail() {
  tone(180, 0.12, 'triangle', 0.05, 0, 90);
}

export function playMatch(combo = 1) {
  const n = Math.min(6, Math.max(1, combo));
  const a = 480 + n * 70;
  const b = 720 + n * 90;
  tone(a, 0.09, 'sine', 0.07, 0, b);
  tone(b, 0.11, 'triangle', 0.045, 0.05);
}

export function playSpecial() {
  tone(659, 0.08, 'sine', 0.06);
  tone(880, 0.1, 'sine', 0.05, 0.07);
  tone(1174, 0.14, 'triangle', 0.05, 0.14);
}

export function playIce() {
  tone(980, 0.07, 'sine', 0.04);
  tone(1480, 0.08, 'triangle', 0.03, 0.04);
}

export function playHint() {
  tone(880, 0.1, 'sine', 0.045);
  tone(1174, 0.12, 'sine', 0.04, 0.08);
}

export function playShuffle() {
  tone(392, 0.1, 'triangle', 0.045, 0, 640);
}

export function playWin() {
  [523, 659, 784, 1046].forEach((freq, index) => tone(freq, 0.16, 'sine', 0.06, index * 0.09));
}

export function playLose() {
  [392, 330, 247].forEach((freq, index) => tone(freq, 0.18, 'sine', 0.05, index * 0.1, freq - 40));
}

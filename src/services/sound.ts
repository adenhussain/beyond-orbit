/**
 * Tiny synthesised sound effects using the Web Audio API.
 * No audio files are needed. Every function is safe to call when sound is
 * disabled or unsupported.
 */

let enabled = true;
let context: AudioContext | null = null;

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

function getContext(): AudioContext | null {
  if (!enabled || typeof window === 'undefined' || !window.AudioContext) return null;
  if (!context) context = new AudioContext();
  if (context.state === 'suspended') void context.resume();
  return context;
}

function tone(frequency: number, duration: number, type: OscillatorType = 'square', volume = 0.05, delay = 0): void {
  const ctx = getContext();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);
}

export const sound = {
  click: () => tone(880, 0.05, 'square', 0.03),
  select: () => { tone(660, 0.06); tone(990, 0.08, 'square', 0.04, 0.06); },
  remove: () => tone(330, 0.09, 'square', 0.04),
  countdown: () => tone(520, 0.12, 'sine', 0.08),
  ignition: () => tone(1040, 0.5, 'sine', 0.08),
  confirm: () => { tone(523, 0.1, 'sine', 0.06); tone(784, 0.18, 'sine', 0.06, 0.1); },
  alert: () => {
    for (let i = 0; i < 3; i++) tone(i % 2 ? 620 : 820, 0.16, 'sawtooth', 0.045, i * 0.2);
  },
  timeMachine: () => {
    for (let i = 0; i < 8; i++) tone(1200 - i * 110, 0.09, 'triangle', 0.05, i * 0.06);
  },
  success: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'sine', 0.06, i * 0.13)),
  failure: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.04, i * 0.18)),

  /** Low engine rumble made from filtered noise. */
  rumble: (seconds: number) => {
    const ctx = getContext();
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 160;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seconds);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  },
};

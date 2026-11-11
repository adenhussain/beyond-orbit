/**
 * Ambient soundtrack, synthesised live with the Web Audio API (no audio
 * files). Each mood is a slow pad chord with a drifting filter, plus soft
 * random "pings" for the calm moods and a pulsing tone for emergencies.
 * Moods cross-fade over two seconds.
 */

export type Mood = 'none' | 'menu' | 'explore' | 'ship' | 'alert' | 'success' | 'failure';

interface MoodDef {
  chord: number[]; // Hz
  wave: OscillatorType;
  cutoff: number;
  volume: number;
  pings?: number[]; // notes for sparse random pings
  pulse?: number; // Hz of amplitude pulsing (alerts)
}

const MOODS: Record<Exclude<Mood, 'none'>, MoodDef> = {
  menu: { chord: [110, 164.8, 261.6, 329.6], wave: 'triangle', cutoff: 900, volume: 0.05, pings: [659.3, 784, 880, 987.8, 1174.7] },
  explore: { chord: [73.4, 110, 146.8, 220], wave: 'sawtooth', cutoff: 520, volume: 0.035, pings: [587.3, 659.3, 880, 987.8] },
  ship: { chord: [55, 82.4, 130.8, 196], wave: 'sawtooth', cutoff: 420, volume: 0.04, pings: [523.3, 659.3, 784] },
  alert: { chord: [98, 138.6, 196], wave: 'sawtooth', cutoff: 700, volume: 0.04, pulse: 2.2 },
  success: { chord: [130.8, 164.8, 196, 261.6, 329.6], wave: 'triangle', cutoff: 1400, volume: 0.05, pings: [784, 1046.5, 1318.5] },
  failure: { chord: [73.4, 87.3, 110, 146.8], wave: 'sawtooth', cutoff: 380, volume: 0.04 },
};

interface Voice {
  gain: GainNode;
  stop: () => void;
}

let context: AudioContext | null = null;
let enabled = true;
let current: Mood = 'none';
let voice: Voice | null = null;
let unlockInstalled = false;

function ctx(): AudioContext | null {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  if (!context) context = new AudioContext();
  if (!unlockInstalled) {
    // Browsers only allow audio after the first click or key press.
    unlockInstalled = true;
    const unlock = () => void context?.resume();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }
  return context;
}

function startVoice(def: MoodDef, ac: AudioContext): Voice {
  const out = ac.createGain();
  out.gain.value = 0.0001;
  out.connect(ac.destination);

  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = def.cutoff;
  filter.Q.value = 2;
  filter.connect(out);

  // Slow drift on the filter makes the pad breathe.
  const lfo = ac.createOscillator();
  const lfoDepth = ac.createGain();
  lfo.frequency.value = 0.07;
  lfoDepth.gain.value = def.cutoff * 0.45;
  lfo.connect(lfoDepth).connect(filter.frequency);
  lfo.start();

  const sources: (OscillatorNode | AudioBufferSourceNode)[] = [lfo];
  const padGain = ac.createGain();
  padGain.gain.value = 1;
  padGain.connect(filter);
  for (const [i, freq] of def.chord.entries()) {
    for (const detune of [-6, 6]) {
      const osc = ac.createOscillator();
      osc.type = def.wave;
      osc.frequency.value = freq;
      osc.detune.value = detune + i;
      const g = ac.createGain();
      g.gain.value = 1 / (def.chord.length * 2);
      osc.connect(g).connect(padGain);
      osc.start();
      sources.push(osc);
    }
  }

  if (def.pulse) {
    const pulse = ac.createOscillator();
    const depth = ac.createGain();
    pulse.frequency.value = def.pulse;
    depth.gain.value = 0.5;
    padGain.gain.value = 0.5;
    pulse.connect(depth).connect(padGain.gain);
    pulse.start();
    sources.push(pulse);
  }

  // Sparse pings: a soft bell-like note every few seconds.
  let pingTimer: ReturnType<typeof setTimeout> | null = null;
  if (def.pings) {
    const notes = def.pings;
    const ping = () => {
      const t = ac.currentTime;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = notes[Math.floor(Math.random() * notes.length)];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 3.6);
      pingTimer = setTimeout(ping, 2200 + Math.random() * 3500);
    };
    pingTimer = setTimeout(ping, 1500);
  }

  out.gain.exponentialRampToValueAtTime(def.volume, ac.currentTime + 2);
  return {
    gain: out,
    stop: () => {
      if (pingTimer) clearTimeout(pingTimer);
      const t = ac.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), t);
      out.gain.exponentialRampToValueAtTime(0.0001, t + 2);
      setTimeout(() => {
        for (const s of sources) s.stop();
        out.disconnect();
      }, 2200);
    },
  };
}

function apply(mood: Mood): void {
  const target = enabled ? mood : 'none';
  if (target === current) return;
  current = target;
  voice?.stop();
  voice = null;
  if (target === 'none') return;
  const ac = ctx();
  if (!ac) return;
  voice = startVoice(MOODS[target], ac);
}

let requested: Mood = 'none';

export const music = {
  setMood(mood: Mood): void {
    requested = mood;
    apply(mood);
  },
  setEnabled(value: boolean): void {
    enabled = value;
    apply(requested);
  },
};

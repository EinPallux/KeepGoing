/**
 * Procedural casino sound, synthesized live with the Web Audio API - no asset
 * files, works offline, tiny. Everything is a short oscillator/noise burst
 * shaped by a gain envelope. A global mute is persisted to localStorage and
 * the AudioContext is created lazily + resumed on the first user gesture
 * (browsers block audio until then).
 */

type WinTier = 'small' | 'big' | 'jackpot';

const STORAGE_KEY = 'keepgoing-muted';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readMuted();
const listeners = new Set<(m: boolean) => void>();

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.9;
      master.connect(ctx.destination);
    } catch {
      ctx = null;
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Attach once so the very first click/tap unlocks audio. */
export function initAudioUnlock(): void {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    ensureContext();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  } catch {
    /* ignore */
  }
  if (master && ctx) {
    master.gain.setTargetAtTime(next ? 0 : 0.9, ctx.currentTime, 0.02);
  }
  listeners.forEach((l) => l(next));
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}

export function subscribeMuted(fn: (m: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ----------------------------------------------------------------------------
// Low-level synth helpers
// ----------------------------------------------------------------------------

interface ToneOpts {
  freq: number;
  type?: OscillatorType;
  dur?: number;
  gain?: number;
  attack?: number;
  /** Sweep the frequency to this value over the note's duration. */
  glideTo?: number;
  when?: number;
  pan?: number;
}

function tone(opts: ToneOpts): void {
  const c = ensureContext();
  if (!c || !master || muted) return;
  const { freq, type = 'sine', dur = 0.15, gain = 0.2, attack = 0.005, glideTo, when = 0, pan = 0 } = opts;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  let tail: AudioNode = g;
  if (pan !== 0 && c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p);
    tail = p;
  }
  osc.connect(g);
  tail.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBurst(dur: number, gain: number, filterFreq: number, when = 0, filterType: BiquadFilterType = 'lowpass'): void {
  const c = ensureContext();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + when;
  const frames = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// ----------------------------------------------------------------------------
// Named cues
// ----------------------------------------------------------------------------

export function playClick(): void {
  tone({ freq: 340, type: 'triangle', dur: 0.05, gain: 0.12 });
}

export function playSelect(): void {
  tone({ freq: 520, type: 'triangle', dur: 0.06, gain: 0.14 });
  tone({ freq: 780, type: 'triangle', dur: 0.07, gain: 0.1, when: 0.03 });
}

export function playBet(): void {
  // chip clink
  tone({ freq: 900, type: 'square', dur: 0.04, gain: 0.08 });
  noiseBurst(0.05, 0.12, 5200, 0, 'bandpass');
  tone({ freq: 1300, type: 'triangle', dur: 0.05, gain: 0.06, when: 0.02 });
}

export function playTick(strength = 1): void {
  tone({ freq: 1200, type: 'square', dur: 0.025, gain: 0.05 * strength });
}

/** A single peg/ball ping; pitch rises with depth for plinko. */
export function playPing(pitch = 1): void {
  tone({ freq: 500 + pitch * 260, type: 'sine', dur: 0.08, gain: 0.09, glideTo: 400 + pitch * 200 });
}

export function playCardFlip(): void {
  noiseBurst(0.09, 0.16, 3200, 0, 'highpass');
  tone({ freq: 260, type: 'triangle', dur: 0.06, gain: 0.05 });
}

export function playWhoosh(): void {
  noiseBurst(0.35, 0.14, 900, 0, 'bandpass');
}

/** A reel snapping to a stop. */
export function playReelStop(): void {
  tone({ freq: 180, type: 'square', dur: 0.07, gain: 0.14 });
  noiseBurst(0.05, 0.1, 2600, 0, 'lowpass');
}

/** Rising suspense tone for a climbing multiplier; call repeatedly with level 0..1. */
export function playClimb(level: number): void {
  tone({ freq: 300 + level * 900, type: 'sawtooth', dur: 0.06, gain: 0.05 });
}

export function playCoin(when = 0): void {
  tone({ freq: 1180, type: 'triangle', dur: 0.09, gain: 0.12, when });
  tone({ freq: 1760, type: 'triangle', dur: 0.11, gain: 0.09, when: when + 0.03 });
}

/** A cascade of coins for a cashout. */
export function playCashout(): void {
  for (let i = 0; i < 6; i++) playCoin(i * 0.06 + Math.random() * 0.02);
}

export function playExplosion(): void {
  noiseBurst(0.5, 0.35, 700, 0, 'lowpass');
  tone({ freq: 90, type: 'sawtooth', dur: 0.45, gain: 0.28, glideTo: 40 });
}

export function playLose(): void {
  tone({ freq: 300, type: 'sawtooth', dur: 0.35, gain: 0.16, glideTo: 120 });
  tone({ freq: 220, type: 'sine', dur: 0.4, gain: 0.1, glideTo: 90, when: 0.05 });
}

function fanfare(notes: number[], step: number, gain: number): void {
  notes.forEach((f, i) => {
    tone({ freq: f, type: 'triangle', dur: 0.28, gain, when: i * step });
    tone({ freq: f * 2, type: 'sine', dur: 0.22, gain: gain * 0.5, when: i * step });
  });
}

export function playWin(tier: WinTier): void {
  if (tier === 'small') {
    fanfare([523.25, 659.25, 783.99], 0.08, 0.14);
    playCoin(0.16);
  } else if (tier === 'big') {
    fanfare([523.25, 659.25, 783.99, 1046.5], 0.09, 0.16);
    playCashout();
  } else {
    fanfare([523.25, 659.25, 783.99, 1046.5, 1318.5], 0.1, 0.18);
    for (let i = 0; i < 12; i++) playCoin(0.2 + i * 0.05 + Math.random() * 0.02);
    noiseBurst(0.6, 0.12, 8000, 0.1, 'highpass');
  }
}

export function playFloorClear(): void {
  fanfare([392, 523.25, 659.25, 783.99, 1046.5], 0.11, 0.16);
  playCashout();
}

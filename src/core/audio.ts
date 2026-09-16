/** Tiny Web Audio synth. Everything is generated — no audio files. */
class Audio {
  private ctx: AudioContext | null = null;

  /** Call from a user gesture so the browser lets us play. */
  unlock() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** A jolly three-syllable "ho ho ho". */
  laugh() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.02;
    for (let i = 0; i < 3; i++) this.ho(ctx, t0 + i * 0.3, 1 - i * 0.08);
  }

  private ho(ctx: AudioContext, t: number, pitch: number) {
    const dur = 0.22;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.28, t + 0.02);
    out.gain.exponentialRampToValueAtTime(0.001, t + dur);
    out.connect(ctx.destination);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(700, t);
    lp.frequency.exponentialRampToValueAtTime(350, t + dur);
    lp.connect(out);

    // voice: sawtooth gliding down, plus an octave-below square for chest
    const voice = ctx.createOscillator();
    voice.type = 'sawtooth';
    voice.frequency.setValueAtTime(150 * pitch, t);
    voice.frequency.exponentialRampToValueAtTime(105 * pitch, t + dur);
    voice.connect(lp);

    const chest = ctx.createOscillator();
    chest.type = 'square';
    chest.frequency.setValueAtTime(75 * pitch, t);
    chest.frequency.exponentialRampToValueAtTime(52 * pitch, t + dur);
    const chestGain = ctx.createGain();
    chestGain.gain.value = 0.35;
    chest.connect(chestGain).connect(lp);

    // vibrato
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 7;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 6;
    lfo.connect(lfoGain).connect(voice.frequency);

    for (const o of [voice, chest, lfo]) { o.start(t); o.stop(t + dur + 0.05); }
  }
}

export const audio = new Audio();

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

  /** A long drawn-out whinny. */
  neigh() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    const dur = 1.4;

    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.22, t + 0.08);
    out.gain.setValueAtTime(0.22, t + dur * 0.55);
    out.gain.exponentialRampToValueAtTime(0.001, t + dur);
    out.connect(ctx.destination);

    // nasal formant
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1500, t);
    bp.frequency.exponentialRampToValueAtTime(900, t + dur);
    bp.Q.value = 2.5;
    bp.connect(out);

    // pitch: quick rise, long fall
    const voice = ctx.createOscillator();
    voice.type = 'sawtooth';
    voice.frequency.setValueAtTime(620, t);
    voice.frequency.exponentialRampToValueAtTime(980, t + 0.18);
    voice.frequency.exponentialRampToValueAtTime(420, t + dur);
    voice.connect(bp);

    // fast wobble that slows as the neigh trails off
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(14, t);
    lfo.frequency.linearRampToValueAtTime(7, t + dur);
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 55;
    lfo.connect(lfoGain).connect(voice.frequency);

    // breathy layer
    const trem = ctx.createOscillator();
    trem.frequency.value = 22;
    const tremGain = ctx.createGain();
    tremGain.gain.value = 0.08;
    trem.connect(tremGain).connect(out.gain);

    for (const o of [voice, lfo, trem]) { o.start(t); o.stop(t + dur + 0.05); }
  }

  /** A happy little "arf-arf". `pitch` ~0.85–1.2 gives each puppy its own voice. */
  yip(pitch = 1) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.02;
    for (const [dt, p] of [[0, 1], [0.14, 1.08]] as const) this.arf(ctx, t0 + dt, pitch * p);
  }

  private arf(ctx: AudioContext, t: number, pitch: number) {
    const dur = 0.09;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.16, t + 0.012);
    out.gain.exponentialRampToValueAtTime(0.001, t + dur);
    out.connect(ctx.destination);

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400 * pitch;
    bp.Q.value = 1.2;
    bp.connect(out);

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(950 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(560 * pitch, t + dur);
    osc.connect(bp);
    osc.start(t);
    osc.stop(t + dur + 0.02);
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

/**
 * Fully synthesized ambience (no audio files): filtered-noise wind, a low drone,
 * and short UI blips. Browsers only allow audio after a user gesture, so
 * `enable()` must be called from a click handler.
 */
class AmbientAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private wind: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;
  enabled = false;

  private init() {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < length; i++) {
      brown = (brown + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = brown * 3.5;
    }
    this.noise = buffer;

    const windSrc = ctx.createBufferSource();
    windSrc.buffer = buffer;
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 420;
    windFilter.Q.value = 0.8;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(windFilter.frequency);
    const wind = ctx.createGain();
    wind.gain.value = 0.35;
    windSrc.connect(windFilter).connect(wind).connect(master);
    windSrc.start();
    lfo.start();
    this.wind = wind;
    this.windFilter = windFilter;

    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 380;
    const drone = ctx.createGain();
    drone.gain.value = 0.05;
    droneFilter.connect(drone).connect(master);
    for (const [freq, detune] of [
      [55, -6],
      [82.4, 4],
      [110, 9],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(droneFilter);
      osc.start();
    }

    return ctx;
  }

  async enable() {
    const ctx = this.init();
    if (ctx.state === "suspended") await ctx.resume();
    this.enabled = true;
    this.master?.gain.setTargetAtTime(0.55, ctx.currentTime, 0.8);
  }

  disable() {
    this.enabled = false;
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
    }
  }

  /** Scroll speed pushes the wind louder and brighter. */
  setIntensity(velocity: number) {
    if (!this.enabled || !this.ctx || !this.wind || !this.windFilter) return;
    const v = Math.min(1, Math.abs(velocity) / 40);
    const now = this.ctx.currentTime;
    this.wind.gain.setTargetAtTime(0.35 + v * 0.6, now, 0.3);
    this.windFilter.Q.setTargetAtTime(0.8 + v * 1.5, now, 0.3);
  }

  blip(freq = 880) {
    if (!this.enabled || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.08);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    osc.connect(gain).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /** Rising sweep plus a noise swell for diving into a realm; `reverse` falls instead. */
  warp(reverse = false) {
    if (!this.enabled || !this.ctx || !this.master || !this.noise) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const [lo, hi] = reverse ? [900, 90] : [90, 1100];

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(lo, now);
    osc.frequency.exponentialRampToValueAtTime(hi, now + 1.3);
    const oscFilter = ctx.createBiquadFilter();
    oscFilter.type = "lowpass";
    oscFilter.frequency.setValueAtTime(400, now);
    oscFilter.frequency.exponentialRampToValueAtTime(2400, now + 1.3);
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.05, now + 0.9);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    osc.connect(oscFilter).connect(oscGain).connect(this.master);
    osc.start(now);
    osc.stop(now + 1.7);

    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(reverse ? 3000 : 200, now);
    filter.frequency.exponentialRampToValueAtTime(reverse ? 200 : 3000, now + 1.3);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.7, now + 1.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(now, Math.random() * 2);
    src.stop(now + 2);
  }

  /** Ice cracking open: a sharp snap followed by a few glassy chimes. */
  shatter() {
    if (!this.enabled || !this.ctx || !this.master || !this.noise) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 1800;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.9, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(now, Math.random() * 2);
    src.stop(now + 0.45);

    for (let i = 0; i < 5; i++) {
      const at = now + 0.04 + i * 0.07 + Math.random() * 0.05;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 1800 + Math.random() * 2600;
      const chime = ctx.createGain();
      chime.gain.setValueAtTime(0, at);
      chime.gain.linearRampToValueAtTime(0.025, at + 0.005);
      chime.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
      osc.connect(chime).connect(this.master);
      osc.start(at);
      osc.stop(at + 0.55);
    }
  }

  whoosh() {
    if (!this.enabled || !this.ctx || !this.master || !this.noise) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(1800, now + 0.6);
    filter.frequency.exponentialRampToValueAtTime(300, now + 1.4);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(now, Math.random() * 2);
    src.stop(now + 1.6);
  }
}

export const ambient = new AmbientAudio();

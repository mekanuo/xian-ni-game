/** Original pentatonic chamber score and procedural Foley. No sampled recordings. */
export class Soundscape {
  private context: AudioContext | null = null;
  private musicInput: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private effectGain: GainNode | null = null;
  private musicMeter: AnalyserNode | null = null;
  private effectMeter: AnalyserNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private voices = new Set<AudioScheduledSourceNode>();
  private noiseBuffer: AudioBuffer | null = null;
  private requested = false;
  private disposed = false;
  private nextNote = 0;
  private step = 0;
  private musicLevel = .25;
  private muted = false;
  private scene = 'home';
  private waterFlow = 0;
  private scheduled = 0;
  private effectCounts: Record<string, number> = {};
  private lastEffect = '';
  private error = '';
  volume = .45;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('pointerdown', this.gesture, true);
      document.addEventListener('touchend', this.gesture, true);
      document.addEventListener('keydown', this.gesture, true);
      document.addEventListener('visibilitychange', this.visibility);
    }
  }
  get music() { return this.musicLevel; }
  set music(value: number) {
    this.musicLevel = this.clamp(value);
    this.level(this.musicGain, this.muted ? 0 : this.musicLevel);
  }
  private clamp(value: number) { return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0; }
  private level(node: GainNode | null, value: number) {
    if (!node || !this.context) return;
    node.gain.cancelScheduledValues(this.context.currentTime);
    node.gain.setTargetAtTime(value, this.context.currentTime, .035);
  }
  private gesture = () => {
    if (this.requested && this.context?.state !== 'running') void this.start();
  };
  private visibility = () => {
    if (!this.context || !this.requested) return;
    if (document.hidden) {
      this.clearTimer();
      void this.context.suspend().catch(() => {});
    } else void this.start();
  };

  async start() {
    if (this.disposed) return;
    this.requested = true;
    try {
      if (!this.context) this.createGraph();
      const context = this.context!;
      // Resume is invoked directly within the user gesture, including Safari's interrupted state.
      if (context.state !== 'running') await context.resume();
      if (!this.requested || this.disposed || context.state !== 'running' || (typeof document !== 'undefined' && document.hidden)) return;
      this.error = '';
      if (!this.timer) {
        this.nextNote = Math.max(context.currentTime + .035, this.nextNote);
        this.schedule();
        this.timer = setInterval(() => this.schedule(), 80);
      }
    } catch (error) { this.error = error instanceof Error ? error.message : 'Audio unavailable'; }
  }
  private createGraph() {
    const Constructor = globalThis.AudioContext || (globalThis as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) throw new Error('Web Audio unavailable');
    const context = this.context = new Constructor();
    this.musicInput = context.createGain();
    this.musicGain = context.createGain(); this.musicGain.gain.value = this.muted ? 0 : this.musicLevel;
    this.effectGain = context.createGain(); this.effectGain.gain.value = this.muted ? 0 : this.volume;
    this.musicMeter = context.createAnalyser(); this.musicMeter.fftSize = 1024;
    this.effectMeter = context.createAnalyser(); this.effectMeter.fftSize = 1024;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -9; limiter.knee.value = 12; limiter.ratio.value = 6;
    limiter.attack.value = .003; limiter.release.value = .18;
    this.musicInput.connect(this.musicGain); this.musicGain.connect(this.musicMeter); this.musicMeter.connect(limiter);
    this.effectGain.connect(this.effectMeter); this.effectMeter.connect(limiter); limiter.connect(context.destination);
    // A restrained echo adds room around the plucked score. The music fader also mutes its tail.
    const delay = context.createDelay(1); delay.delayTime.value = .31;
    const feedback = context.createGain(); feedback.gain.value = .2;
    const wet = context.createGain(); wet.gain.value = .2;
    this.musicInput.connect(delay); delay.connect(feedback); feedback.connect(delay);
    delay.connect(wet); wet.connect(this.musicGain);
    this.noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const samples = this.noiseBuffer.getChannelData(0);
    let seed = 7341;
    for (let i = 0; i < samples.length; i++) { seed = (seed * 16807) % 2147483647; samples[i] = (seed / 2147483647) * 2 - 1; }
    context.onstatechange = () => {
      if (context.state !== 'running') this.clearTimer();
      else if (this.requested && !this.timer && !(typeof document !== 'undefined' && document.hidden)) {
        this.nextNote = context.currentTime + .035;
        this.schedule(); this.timer = setInterval(() => this.schedule(), 80);
      }
    };
  }
  setScene(scene: string) { this.scene = scene; }
  setWaterFlow(amount:number) { this.waterFlow=Math.max(0,Math.min(1,amount)); }
  /** Effects fader; music is deliberately independent. */
  setVolume(value: number) { this.volume = this.clamp(value); this.level(this.effectGain, this.muted ? 0 : this.volume); }
  setMuted(muted: boolean) {
    this.muted = muted;
    this.level(this.musicGain, muted ? 0 : this.musicLevel);
    this.level(this.effectGain, muted ? 0 : this.volume);
  }
  private track(source: AudioScheduledSourceNode, nodes: AudioNode[], at: number, duration: number) {
    this.voices.add(source);
    source.onended = () => { source.disconnect(); nodes.forEach(node => node.disconnect()); this.voices.delete(source); };
    source.start(at); source.stop(at + duration + .04);
  }
  private tone(frequency: number, duration: number, strength: number, bus: 'music' | 'effect', at: number, type: OscillatorType = 'sine', endFrequency?: number, attack = .008) {
    const context = this.context;
    const output = bus === 'music' ? this.musicInput : this.effectGain;
    if (!context || !output || context.state !== 'running') return;
    const oscillator = context.createOscillator(); const envelope = context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, at);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + duration);
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(Math.max(.0002, strength), at + attack);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(envelope); envelope.connect(output);
    this.track(oscillator, [envelope], at, duration);
  }
  private noise(duration: number, strength: number, frequency: number, at: number, filterType: BiquadFilterType = 'lowpass') {
    if (!this.context || !this.noiseBuffer || !this.effectGain || this.context.state !== 'running') return;
    const source = this.context.createBufferSource(); source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter(); filter.type = filterType; filter.frequency.value = frequency; filter.Q.value = .7;
    const envelope = this.context.createGain();
    envelope.gain.setValueAtTime(.0001, at); envelope.gain.exponentialRampToValueAtTime(strength, at + .006);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(filter); filter.connect(envelope); envelope.connect(this.effectGain);
    this.track(source, [filter, envelope], at, duration);
  }
  private schedule() {
    if (!this.context || this.context.state !== 'running' || !this.requested) return;
    const now = this.context.currentTime;
    if (this.nextNote < now) this.nextNote = now + .025; // Never burst missed notes after backgrounding.
    const beat = 60 / (this.scene === 'crossing' ? 80 : this.scene === 'workshop' ? 76 : this.scene === 'canal' ? 68 : 70);
    // Eight original bars: call, answer, ascending journey, quiet return. -1 is a deliberate breath.
    const melody = [0, 2, 4, -1, 2, 1, 0, -1, 1, 2, 4, 5, 4, 2, 1, -1,
      2, 4, 5, -1, 7, 5, 4, 2, 1, 2, 0, -1, 1, 0, -1, -1,
      4, 5, 7, -1, 5, 4, 2, -1, 2, 4, 5, 4, 2, 1, 0, -1,
      1, 2, 4, 2, 1, 0, 1, -1, 2, 1, 0, -1, 0, -1, -1, -1];
    const scale = [0, 2, 4, 7, 9];
    const pitch = (degree: number) => (this.scene==='canal'?261.6256:293.6648) * 2 ** ((scale[degree % 5] + 12 * Math.floor(degree / 5)) / 12);
    while (this.nextNote < now + .22) {
      const at = this.nextNote; const index = this.step % melody.length;
      const note = melody[index]; const bar = Math.floor(index / 8);
      if (note >= 0) {
        const frequency = pitch(note);
        this.tone(frequency, beat * 1.65, .29, 'music', at, 'triangle');
        this.tone(frequency * 2, beat * .7, .047, 'music', at, 'sine');
        if (bar % 2 === 1 && index % 2 === 0) this.tone(frequency, beat * 2.2, .115, 'music', at + .025, 'sine', undefined, .1);
      }
      if (index % 8 === 0) {
        if(this.scene==='canal'&&this.waterFlow>0)this.noise(beat*3.8,.035*this.waterFlow,850,at,'bandpass');
        const root = pitch([0, 2, 4, 0, 2, 4, 1, 0][bar]) / 4;
        this.tone(root, beat * 3.9, .27, 'music', at, 'sine', undefined, .04);
        this.tone(root * 2, beat * 4.2, .1, 'music', at, 'sine', undefined, .24);
        this.tone(root * 3, beat * 4.2, .055, 'music', at, 'sine', undefined, .3);
      }
      if (index % 4 === 2) this.tone(pitch((bar + 2) % 5) / 2, beat * 1.5, .17, 'music', at, 'triangle');
      this.scheduled++; this.step++; this.nextNote += beat / 2;
    }
  }
  play(kind: string) {
    if (!['hit', 'impact', 'cast', 'flame', 'fire', 'block', 'ward', 'hurt', 'damage', 'defeat', 'pull', 'hold', 'drop', 'release', 'steam', 'growth', 'item', 'ending', 'gate', 'success', 'route', 'return', 'alert', 'warning', 'step', 'change', 'rest'].includes(kind)) return;
    if (!this.context || this.context.state !== 'running' || !this.requested) return;
    const at = this.context.currentTime + .004;
    this.lastEffect = kind; this.effectCounts[kind] = (this.effectCounts[kind] || 0) + 1;
    const tone = (frequency: number, duration: number, strength: number, end?: number, delay = 0, type: OscillatorType = 'sine') => this.tone(frequency, duration, strength, 'effect', at + delay, type, end);
    if (kind === 'hit' || kind === 'impact') {
      tone(kind === 'hit' ? 175 : 250, .18, .65, 48, 0, 'triangle');
      this.noise(.16, .65, 2200, at); this.noise(.045, .45, 6000, at, 'highpass');
      tone(780, .095, .16, 180, .012);
    } else if (kind === 'cast' || kind === 'flame') {
      this.noise(.3, .19, 1900, at, 'bandpass'); tone(180, .4, .26, 760); tone(360, .32, .08, 1100, .07);
    } else if (kind === 'fire') {
      this.noise(.42, .47, 3400, at); tone(140, .24, .4, 52, 0, 'triangle');
    } else if (kind === 'block') {
      tone(720, .65, .35); tone(1080, .48, .2, undefined, .008); tone(1740, .27, .1);
      this.noise(.055, .38, 4200, at, 'highpass'); tone(125, .14, .33, 70);
    } else if (kind === 'ward') {
      tone(390, .55, .23, 780); tone(1174, .7, .15, undefined, .09); tone(1568, .45, .055, undefined, .12);
    } else if (kind === 'hurt' || kind === 'damage' || kind === 'defeat') {
      tone(130, .3, .5, 42, 0, 'triangle'); this.noise(.2, .4, 1000, at);
      if (kind === 'defeat') { tone(196, .85, .25, 98, .12); tone(147, 1.1, .16, 73.5, .18); }
    } else if (kind === 'pull' || kind === 'hold') {
      tone(220, .6, .23, 440); tone(587, .7, .11, undefined, .09); tone(880, .45, .055, undefined, .18);
    } else if (kind === 'drop' || kind === 'release') {
      tone(160, .13, .2, 75, 0, 'triangle'); this.noise(.09, .2, 1400, at);
    } else if (kind === 'steam') {
      this.noise(.6, .34, 4000, at, 'highpass');
    } else if (['growth', 'item', 'ending', 'gate', 'success', 'route', 'return'].includes(kind)) {
      [294, 392, 440, 587].forEach((frequency, index) => tone(frequency, .9, .19, undefined, index * .13, 'triangle'));
    } else if (kind === 'alert' || kind === 'warning') {
      tone(330, .19, .19, undefined, 0, 'triangle'); tone(440, .23, .17, undefined, .18, 'triangle');
    } else if (kind === 'step') {
      this.noise(.055, .13, 900, at); tone(95, .075, .065, 60);
    } else if (kind === 'change' || kind === 'rest') {
      tone(392, .5, .14); tone(587, .6, .085, undefined, .1);
    }
    // Narrative text and hints stay silent: they must not compete with the score or impact cues.
  }
  private clearTimer() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  stop() {
    this.requested = false; this.clearTimer(); this.nextNote = 0;
    for (const voice of this.voices) { try { voice.stop(); } catch { /* Already ended. */ } }
    this.voices.clear();
    if (this.context && this.context.state !== 'closed') void this.context.suspend().catch(() => {});
  }
  dispose() {
    this.stop(); this.disposed = true;
    if (typeof document !== 'undefined') {
      document.removeEventListener('pointerdown', this.gesture, true);
      document.removeEventListener('touchend', this.gesture, true);
      document.removeEventListener('keydown', this.gesture, true);
      document.removeEventListener('visibilitychange', this.visibility);
    }
    if (this.context) { this.context.onstatechange = null; void this.context.close().catch(() => {}); }
  }
  /** Read-only evidence of actual post-fader samples, not a claimed audibility verdict. */
  inspect() {
    const rms = (meter: AnalyserNode | null) => {
      if (!meter || this.context?.state !== 'running') return 0;
      const samples = new Float32Array(meter.fftSize); meter.getFloatTimeDomainData(samples);
      return Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
    };
    return { state: this.context?.state || 'locked', requested: this.requested, scene: this.scene,
      muted: this.muted, musicVolume: this.musicLevel, effectsVolume: this.volume, musicScheduled: this.scheduled,
      musicRms: rms(this.musicMeter), effectsRms: rms(this.effectMeter), activeVoices: this.voices.size,
      lastEffect: this.lastEffect, effectCounts: { ...this.effectCounts }, error: this.error, disposed: this.disposed };
  }
}

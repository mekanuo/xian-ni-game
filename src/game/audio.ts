export class Soundscape {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private phrase = 0;
  volume = 0.45;
  music = 0.25;
  private scene = 'home';
  async start() {
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.gain = this.context.createGain();
        this.gain.connect(this.context.destination);
        this.gain.gain.value = this.volume;
      }
      if (this.context.state === 'suspended') await this.context.resume();
      if (!this.timer) this.timer = setInterval(() => this.ambient(), 2200);
    } catch { /* Audio is optional. The game remains fully operable. */ }
  }
  setScene(scene: string) { this.scene = scene; }
  setVolume(v: number) { this.volume = v; if (this.gain) this.gain.gain.value = v; }
  private note(freq: number, length: number, strength: number, type: OscillatorType = 'sine', delay = 0) {
    if (!this.context || !this.gain || this.context.state !== 'running') return;
    const now = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    const env = this.context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, now);
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(strength, now + 0.018);
    env.gain.exponentialRampToValueAtTime(0.0001, now + length);
    osc.connect(env); env.connect(this.gain);
    osc.start(now); osc.stop(now + length + 0.04);
    osc.onended = () => { osc.disconnect(); env.disconnect(); };
  }
  private ambient() {
    if (!this.music) return;
    const notes = this.scene === 'crossing' ? [146.83, 196, 220, 164.81] : [196, 246.94, 293.66, 329.63, 293.66, 246.94];
    this.note(notes[this.phrase++ % notes.length], 2.8, 0.055 * this.music, 'triangle');
    if (this.phrase % 3 === 0) this.note(392, 2, 0.025 * this.music, 'sine', 0.3);
  }
  play(kind: string) {
    if (/flame|fire|cast/.test(kind)) { this.note(160, 0.15, 0.12, 'triangle'); this.note(520, 0.2, 0.06, 'sine', .05); }
    else if (/ward|block/.test(kind)) { this.note(760, 0.5, .1); this.note(1140, .25, .04, 'sine', .05); }
    else if (/hurt|damage|defeat/.test(kind)) this.note(90, .35, .18, 'triangle');
    else if (/pull|hold/.test(kind)) { this.note(294, .6, .08); this.note(440, .4, .04, 'sine', .08); }
    else if (/ring|ending|gate|success/.test(kind)) [294, 392, 440, 587].forEach((n, i) => this.note(n, .9, .07, 'triangle', i * .14));
    else if (/scene|step/.test(kind)) this.note(100, .08, .025, 'triangle');
    else this.note(490, .12, .025);
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
}

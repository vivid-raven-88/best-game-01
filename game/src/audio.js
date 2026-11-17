// Procedural sound. One job: every beep, boom and bar of music, made in code.
const PENTA = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
const BASS = [110, 98, 130.81, 146.83];

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicStep = 0;
    this.nextNote = 0;
    this.musicTimer = null;
  }

  ensure() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.nextNote = this.ctx.currentTime + 0.1;
        this.musicTimer = window.setInterval(() => this._musicTick(), 180);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch (_) {
      this.ctx = null;
    }
  }

  get ok() {
    return !!this.ctx && !this.muted && this.ctx.state === 'running';
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  _tone(freq, dur, type, vol, slideTo) {
    if (!this.ok) return;
    try {
      const t0 = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (_) {}
  }

  _noise(dur, vol, filterFreq, type) {
    if (!this.ok) return;
    try {
      const t0 = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = type || 'lowpass';
      filter.frequency.value = filterFreq;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filter).connect(gain).connect(this.ctx.destination);
      src.start(t0);
    } catch (_) {}
  }

  _musicTick() {
    if (!this.ok) return;
    try {
      const ahead = 0.25;
      while (this.nextNote < this.ctx.currentTime + ahead) {
        const step = this.musicStep;
        const t0 = Math.max(this.nextNote, this.ctx.currentTime);
        const note = PENTA[step % PENTA.length];
        const bass = BASS[Math.floor(step / 4) % BASS.length];
        this._noteAt(note, t0, 0.22, 'triangle', 0.035);
        if (step % 4 === 0) this._noteAt(bass, t0, 0.5, 'sine', 0.05);
        this.nextNote += 0.24;
        this.musicStep++;
      }
    } catch (_) {}
  }

  _noteAt(freq, t0, dur, type, vol) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (_) {}
  }

  blip() {
    this._tone(880, 0.09, 'sine', 0.12, 1320);
  }

  chime() {
    this._tone(660, 0.14, 'sine', 0.14);
    window.setTimeout(() => this._tone(990, 0.2, 'sine', 0.14), 90);
  }

  thud() {
    this._noise(0.18, 0.25, 500);
    this._tone(90, 0.2, 'sine', 0.2, 45);
  }

  boom() {
    this._noise(0.5, 0.35, 300);
    this._tone(70, 0.45, 'sine', 0.25, 32);
  }

  whoosh() {
    this._noise(0.3, 0.12, 2400, 'bandpass');
  }

  click() {
    this._tone(1200, 0.05, 'square', 0.07);
  }

  levelUp() {
    [523.25, 659.25, 783.99].forEach((f, i) => {
      window.setTimeout(() => this._tone(f, 0.18, 'triangle', 0.14), i * 110);
    });
  }
}

/** A sound object that does nothing: used for frozen screenshot scenes. */
export const SILENT = {
  ensure() {},
  toggleMute() { return false; },
  blip() {},
  chime() {},
  thud() {},
  boom() {},
  whoosh() {},
  click() {},
  levelUp() {},
};

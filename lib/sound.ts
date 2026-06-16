// Synthesised HUD sound effects via the Web Audio API — no audio files.
// A single lazily-created AudioContext drives every UI blip / whoosh / confirm.
// Browsers block audio until a user gesture, so we init + resume on first input.

export type SfxName =
  | "hover"
  | "click"
  | "open"
  | "close"
  | "confirm"
  | "error"
  | "lock"
  | "tick"
  | "boot"
  | "toggle";

class SoundFX {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;
  private reduced = false;
  private wired = false;

  /** read the persisted preference (call once on the client) */
  loadPref() {
    try {
      this.muted = localStorage.getItem("sfx-muted") === "1";
    } catch {
      /* ignore */
    }
    try {
      this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      /* ignore */
    }
  }

  /** create the context (safe to call repeatedly); resume if suspended */
  init() {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.45;
        this.master.connect(this.ctx.destination);
      } catch {
        this.ctx = null;
      }
    }
    this.resume();
    // browsers suspend the context on tab blur / idle — keep resuming it so a
    // later interaction isn't silent. Registered once.
    if (!this.wired && typeof window !== "undefined") {
      this.wired = true;
      const wake = () => this.resume();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") wake();
      });
      window.addEventListener("pointerdown", wake, true);
      window.addEventListener("keydown", wake, true);
    }
  }

  private resume() {
    if (this.ctx && this.ctx.state !== "running") this.ctx.resume().catch(() => {});
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      localStorage.setItem("sfx-muted", m ? "1" : "0");
    } catch {
      /* ignore */
    }
    // fade the ambient bed with the mute toggle
    if (this.ambient && this.ctx) {
      this.ambient.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.15);
    }
  }

  // --- low-level synth helpers -------------------------------------------
  private tone(
    freq: number,
    dur: number,
    type: OscillatorType = "sine",
    peak = 0.25,
    freqEnd?: number,
    delay = 0,
    lowpass?: number,
  ) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    // small lookahead so a sound scheduled right after a resume() (which is
    // async) is never placed in the past and silently dropped
    const now = ctx.currentTime + 0.02 + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + dur);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    let out: AudioNode = osc;
    if (lowpass) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = lowpass;
      osc.connect(f);
      out = f;
    }
    out.connect(g);
    g.connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }

  private noise(dur: number, fStart: number, fEnd: number, peak = 0.18, delay = 0) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime + 0.02 + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 1.1;
    f.frequency.setValueAtTime(fStart, now);
    f.frequency.exponentialRampToValueAtTime(Math.max(1, fEnd), now + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(now);
    src.stop(now + dur + 0.03);
  }

  // --- public: play a named effect ---------------------------------------
  play(name: SfxName) {
    if (this.muted || this.reduced) return;
    this.init();
    if (!this.ctx || !this.master) return;
    switch (name) {
      case "hover":
        this.tone(1480, 0.045, "sine", 0.05);
        break;
      case "click":
        this.tone(720, 0.05, "square", 0.09, 940, 0, 2600);
        this.tone(1180, 0.04, "square", 0.04, undefined, 0.02, 3000);
        break;
      case "open":
        this.noise(0.34, 280, 2600, 0.1);
        this.tone(420, 0.3, "sine", 0.06, 920);
        break;
      case "close":
        this.noise(0.26, 2400, 320, 0.08);
        this.tone(820, 0.22, "sine", 0.05, 360);
        break;
      case "confirm":
        this.tone(660, 0.1, "sine", 0.12, undefined, 0);
        this.tone(880, 0.1, "sine", 0.12, undefined, 0.08);
        this.tone(1320, 0.18, "sine", 0.12, undefined, 0.16);
        break;
      case "error":
        this.tone(180, 0.22, "sawtooth", 0.14, 120, 0, 900);
        this.tone(120, 0.24, "sawtooth", 0.1, 90, 0.04, 700);
        break;
      case "lock":
        this.tone(1300, 0.03, "square", 0.08);
        this.tone(1750, 0.05, "square", 0.08, undefined, 0.06);
        this.noise(0.12, 1800, 600, 0.06, 0.02);
        break;
      case "tick":
        this.tone(2100, 0.014, "square", 0.025);
        break;
      case "toggle":
        this.tone(900, 0.06, "triangle", 0.1, 1300);
        break;
      case "boot":
        this.tone(180, 0.5, "sine", 0.1, 1200);
        this.tone(1320, 0.12, "sine", 0.1, undefined, 0.5);
        this.noise(0.5, 200, 3000, 0.05);
        break;
    }
  }

  // --- ambient pads: three evolving voices that crossfade with scroll -------
  // void (cold/low) → memory room (warm cyan) → finale (resolved chord)
  private ambient: { master: GainNode; voices: GainNode[] } | null = null;

  private buildVoice(freqs: number[], lowpass: number): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.value = 0;
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = lowpass;
    filt.Q.value = 0.6;
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = (i % 2 === 0 ? 1 : -1) * (4 + i * 2); // gentle chorus
      o.connect(filt);
      o.start();
    });
    filt.connect(g);
    return g;
  }

  /** start the looping ambient bed (idempotent; needs a running context) */
  ensureAmbient() {
    if (this.ambient || this.reduced) return;
    this.init();
    if (!this.ctx || !this.master || this.ctx.state !== "running") return;
    const ambMaster = this.ctx.createGain();
    ambMaster.gain.value = this.muted ? 0 : 1;
    ambMaster.connect(this.master);
    const voidV = this.buildVoice([55, 82.5, 110], 360); // A1 · E2 · A2 — cold drone
    const roomV = this.buildVoice([110, 164.81, 220, 277.18], 880); // A2 · E3 · A3 · C#4 — cyan pad
    const finV = this.buildVoice([130.81, 196, 261.63, 329.63], 1150); // C3 · G3 · C4 · E4 — resolved
    voidV.connect(ambMaster);
    roomV.connect(ambMaster);
    finV.connect(ambMaster);
    this.ambient = { master: ambMaster, voices: [voidV, roomV, finV] };
  }

  /** crossfade the three pads to scroll progress p (0..1) */
  setAmbientProgress(p: number) {
    if (!this.ambient || !this.ctx) return;
    const ss = (a: number, b: number) => {
      const t = Math.max(0, Math.min(1, (p - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    const w0 = 1 - ss(0.42, 0.6); // void
    const w1 = ss(0.46, 0.62) * (1 - ss(0.86, 0.96)); // room
    const w2 = ss(0.86, 0.96); // finale
    const lvl = 0.05; // quiet — sits well under the SFX
    const t = this.ctx.currentTime;
    this.ambient.voices[0].gain.setTargetAtTime(w0 * lvl, t, 0.5);
    this.ambient.voices[1].gain.setTargetAtTime(w1 * lvl, t, 0.5);
    this.ambient.voices[2].gain.setTargetAtTime(w2 * lvl * 1.2, t, 0.5);
  }
}

export const sfx = new SoundFX();

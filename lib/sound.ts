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
  | "toggle"
  | "step";

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
        this.master.gain.value = 0.55; // brings up the interaction/motion sounds
        // gentle lowpass on the bus rounds off harsh highs for a softer character
        const softLp = this.ctx.createBiquadFilter();
        softLp.type = "lowpass";
        softLp.frequency.value = 4200;
        softLp.Q.value = 0.4;
        this.master.connect(softLp);
        softLp.connect(this.ctx.destination);
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
    // fade the ambient bed + spatial cubes with the mute toggle
    if (this.ctx) {
      const t = this.ctx.currentTime;
      this.ambient?.master.gain.setTargetAtTime(m ? 0 : 1, t, 0.15);
      this.spatial?.master.gain.setTargetAtTime(m ? 0 : 1, t, 0.15);
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

  // FM bell — a sine carrier modulated by a sine at `ratio`, with the modulation
  // index decaying so it opens bright then mellows. Glassy/metallic but soft:
  // the sci-fi "interface" timbre. `glideTo` optionally pitches the carrier.
  private fm(
    carrier: number,
    ratio: number,
    index: number,
    dur: number,
    peak = 0.05,
    delay = 0,
    glideTo?: number,
  ) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const now = ctx.currentTime + 0.02 + delay;
    const car = ctx.createOscillator();
    car.type = "sine";
    car.frequency.setValueAtTime(carrier, now);
    if (glideTo != null) car.frequency.exponentialRampToValueAtTime(Math.max(1, glideTo), now + dur);
    const mod = ctx.createOscillator();
    mod.type = "sine";
    mod.frequency.value = carrier * ratio;
    const modGain = ctx.createGain();
    const depth = carrier * ratio * index;
    modGain.gain.setValueAtTime(depth, now);
    modGain.gain.exponentialRampToValueAtTime(Math.max(1, depth * 0.08), now + dur); // index decay
    mod.connect(modGain);
    modGain.connect(car.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    car.connect(g);
    g.connect(master);
    mod.start(now);
    car.start(now);
    mod.stop(now + dur + 0.05);
    car.stop(now + dur + 0.05);
  }

  // --- public: play a named effect ---------------------------------------
  play(name: SfxName) {
    if (this.muted || this.reduced) return;
    this.init();
    if (!this.ctx || !this.master) return;
    switch (name) {
      case "hover":
        // a tiny glassy FM blip with a soft upward micro-glide
        this.fm(1280, 2.0, 0.5, 0.06, 0.025, 0, 1500);
        break;
      case "click":
        // soft descending "select" — a glassy bell over a gentle glide
        this.fm(900, 1.5, 0.8, 0.08, 0.04, 0, 560);
        this.tone(1300, 0.05, "sine", 0.018, undefined, 0.02);
        break;
      case "open":
        // a rising portal sweep + airy noise
        this.noise(0.36, 240, 1600, 0.04);
        this.tone(360, 0.34, "sine", 0.04, 900);
        this.fm(520, 2.0, 0.6, 0.3, 0.02, 0.04, 1040);
        break;
      case "close":
        this.noise(0.3, 1500, 280, 0.035);
        this.tone(760, 0.26, "sine", 0.035, 320);
        break;
      case "confirm":
        // a soft glassy bell arpeggio, ascending then settling
        this.fm(523.25, 2.0, 1.0, 0.22, 0.05, 0); // C5
        this.fm(659.25, 2.0, 1.0, 0.22, 0.05, 0.09); // E5
        this.fm(783.99, 3.0, 0.8, 0.3, 0.05, 0.18); // G5
        break;
      case "error":
        // gentle low de-tune, not harsh
        this.fm(220, 1.4, 1.2, 0.26, 0.06, 0, 150);
        this.tone(140, 0.26, "sine", 0.05, 105, 0.04);
        break;
      case "lock":
        // sci-fi "target lock": quick rising glide + a glassy ping
        this.tone(640, 0.07, "sine", 0.03, 1400);
        this.fm(1560, 3.0, 0.7, 0.1, 0.035, 0.05);
        break;
      case "tick":
        this.fm(1600, 2.0, 0.4, 0.02, 0.014);
        break;
      case "toggle":
        this.fm(760, 1.5, 0.8, 0.09, 0.05, 0, 1140);
        break;
      case "boot":
        // a slow rising sweep resolving into a soft bell
        this.tone(150, 0.6, "sine", 0.05, 900);
        this.fm(880, 2.0, 1.0, 0.5, 0.045, 0.45);
        this.noise(0.5, 180, 1600, 0.025);
        break;
      case "step":
        // a soft low footfall + a faint scuff, synced to the scrubbed walk
        this.tone(70, 0.13, "sine", 0.07, 46);
        this.noise(0.05, 200, 80, 0.022);
        break;
    }
  }

  // --- ambient: a warm, futuristic-calm bed — a deep sub, a softly detuned
  // triangle drone breathing through a gentle (low-Q) filter, and a faint,
  // sparse crystalline shimmer. Evolves with scroll, kept very quiet. Tuned to
  // stay soft and non-fatiguing (no resonant "wah"). --------------------------
  private ambient:
    | { master: GainNode; sub: GainNode; drone: GainNode; shim: GainNode; lp: BiquadFilterNode }
    | null = null;

  /** start the looping ambient bed (idempotent; needs a running context) */
  ensureAmbient() {
    if (this.ambient || this.reduced) return;
    this.init();
    if (!this.ctx || !this.master || this.ctx.state !== "running") return;
    const ctx = this.ctx;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 1;
    master.connect(this.master);

    // deep sub — quiet body
    const sub = ctx.createGain();
    sub.gain.value = 0;
    const subOsc = ctx.createOscillator();
    subOsc.type = "sine";
    subOsc.frequency.value = 49;
    subOsc.connect(sub);
    sub.connect(master);
    subOsc.start();

    // warm drone: a root + octave + fifth on soft triangles, slightly detuned so
    // they beat slowly. A GENTLE (low-Q) lowpass breathes via a very slow, shallow
    // LFO — evolving and spacey, but never a piercing resonant sweep.
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 1.2;
    lp.frequency.value = 360;
    [55, 55.15, 82.4, 110].forEach((f) => {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = f;
      o.connect(lp);
      o.start();
    });
    const drone = ctx.createGain();
    drone.gain.value = 0;
    lp.connect(drone);
    drone.connect(master);
    const sweep = ctx.createOscillator();
    sweep.type = "sine";
    sweep.frequency.value = 0.035; // very slow breath
    const sweepAmt = ctx.createGain();
    sweepAmt.gain.value = 160; // shallow — a gentle drift, not a wah
    sweep.connect(sweepAmt);
    sweepAmt.connect(lp.frequency);
    sweep.start();

    // crystalline shimmer: a couple of soft high sines, slowly tremolo'd + kept
    // low so it sparkles rather than hisses
    const shim = ctx.createGain();
    shim.gain.value = 0;
    const shimLp = ctx.createBiquadFilter();
    shimLp.type = "lowpass";
    shimLp.frequency.value = 3200;
    [1318.5, 1979].forEach((f) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(shimLp);
      o.start();
    });
    shimLp.connect(shim);
    shim.connect(master);
    const trem = ctx.createOscillator();
    trem.type = "sine";
    trem.frequency.value = 0.09;
    const tremAmt = ctx.createGain();
    tremAmt.gain.value = 0.003; // small — sums onto the shimmer base set per section
    trem.connect(tremAmt);
    tremAmt.connect(shim.gain);
    trem.start();

    this.ambient = { master, sub, drone, shim, lp };
  }

  /** shift the bed's level + colour with scroll progress p (0..1) */
  setAmbientProgress(p: number) {
    if (!this.ambient || !this.ctx) return;
    const ss = (a: number, b: number) => {
      const t = Math.max(0, Math.min(1, (p - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    const w0 = 1 - ss(0.42, 0.6); // void — dark, sparse
    const w1 = ss(0.46, 0.62) * (1 - ss(0.86, 0.96)); // room — open, warm
    const w2 = ss(0.86, 0.96); // finale — settled
    const norm = w0 + w1 + w2 || 1;
    // motion sounds raised again via the master; pull the bed down further so the
    // ambient is even quieter than before
    const lvl = 0.009;
    const t = this.ctx.currentTime;
    this.ambient.sub.gain.setTargetAtTime(lvl * 0.5, t, 1.0);
    this.ambient.drone.gain.setTargetAtTime((lvl * (w0 * 0.7 + w1 * 1.0 + w2 * 0.85)) / norm, t, 0.9);
    this.ambient.shim.gain.setTargetAtTime((lvl * 0.25 * (w1 * 1.0 + w2 * 0.75)) / norm, t, 0.9);
    // gentle cutoff drift per section (the slow LFO breathes around this)
    const cutoff = (w0 * 320 + w1 * 560 + w2 * 440) / norm;
    this.ambient.lp.frequency.setTargetAtTime(cutoff, t, 0.9);
  }

  // --- spatial memory cubes: a small pool of HRTF-panned voices that attach to
  // the nearest occupied cubes, so flying through the lattice pans the glowing
  // nodes around the listener (camera) in 3D ----------------------------------
  private spatial: { master: GainNode; voices: { panner: PannerNode; gain: GainNode; osc: OscillatorNode; id: string | null }[] } | null = null;

  ensureSpatial() {
    if (this.spatial || this.reduced) return;
    this.init();
    if (!this.ctx || !this.master || this.ctx.state !== "running") return;
    const ctx = this.ctx;
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : 1;
    master.connect(this.master);
    const voices = [];
    for (let i = 0; i < 5; i++) {
      const panner = ctx.createPanner();
      panner.panningModel = "HRTF";
      panner.distanceModel = "inverse";
      panner.refDistance = 10;
      panner.maxDistance = 90;
      panner.rolloffFactor = 1.4;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 220;
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(master);
      osc.start();
      voices.push({ panner, gain, osc, id: null as string | null });
    }
    this.spatial = { master, voices };
  }

  /** point the audio listener at the camera (modern AudioParam or legacy API) */
  setListener(px: number, py: number, pz: number, fx: number, fy: number, fz: number, ux: number, uy: number, uz: number) {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(px, t, 0.02);
      l.positionY.setTargetAtTime(py, t, 0.02);
      l.positionZ.setTargetAtTime(pz, t, 0.02);
      l.forwardX.setTargetAtTime(fx, t, 0.02);
      l.forwardY.setTargetAtTime(fy, t, 0.02);
      l.forwardZ.setTargetAtTime(fz, t, 0.02);
      l.upX.setTargetAtTime(ux, t, 0.02);
      l.upY.setTargetAtTime(uy, t, 0.02);
      l.upZ.setTargetAtTime(uz, t, 0.02);
    } else {
      l.setPosition(px, py, pz);
      l.setOrientation(fx, fy, fz, ux, uy, uz);
    }
  }

  /** assign the pool to the nearest occupied cubes and pan them in 3D */
  updateSpatial(cam: { x: number; y: number; z: number }, cubes: { id: string; x: number; y: number; z: number }[]) {
    if (!this.spatial || !this.ctx) return;
    const t = this.ctx.currentTime;
    const voices = this.spatial.voices;
    if (this.muted || !cubes.length) {
      for (const v of voices) v.gain.gain.setTargetAtTime(0, t, 0.25);
      return;
    }
    const near = cubes
      .map((c) => ({ ...c, d: Math.hypot(c.x - cam.x, c.y - cam.y, c.z - cam.z) }))
      .sort((a, b) => a.d - b.d);
    const scale = [0, 3, 5, 7, 10, 12, 15]; // minor-pentatonic-ish intervals
    for (let i = 0; i < voices.length; i++) {
      const v = voices[i];
      const c = near[i];
      if (c && c.d < 85) {
        if (v.id !== c.id) {
          v.id = c.id;
          let h = 0;
          for (let k = 0; k < c.id.length; k++) h = (h * 31 + c.id.charCodeAt(k)) >>> 0;
          const note = scale[h % scale.length] + (h % 2) * 12; // spread across an octave
          v.osc.frequency.setTargetAtTime(196 * Math.pow(2, note / 12), t, 0.06);
        }
        if (v.panner.positionX) {
          v.panner.positionX.setTargetAtTime(c.x, t, 0.05);
          v.panner.positionY.setTargetAtTime(c.y, t, 0.05);
          v.panner.positionZ.setTargetAtTime(c.z, t, 0.05);
        } else {
          v.panner.setPosition(c.x, c.y, c.z);
        }
        const prox = Math.max(0, 1 - c.d / 85);
        v.gain.gain.setTargetAtTime(0.045 * prox * prox, t, 0.2);
      } else {
        v.id = null;
        v.gain.gain.setTargetAtTime(0, t, 0.3);
      }
    }
  }
}

export const sfx = new SoundFX();

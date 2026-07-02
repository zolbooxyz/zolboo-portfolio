"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type Lenis from "lenis";

// Loading veil. A wireframe cube assembles and spins; on lock-in it writes the
// wordmark and rings a shockwave, then rushes the camera and fades once the
// scene is ready.
const CUBE = 128; // px edge
const HALF = CUBE / 2; // translateZ per face
const ASSEMBLE_DUR = 0.72; // s until lock-in
const MIN_DISPLAY = 1750; // min ms on screen so the intro always plays

// 6 cube faces pushed out to their planes; the borders form the wireframe
const FACES = [
  `translateZ(${HALF}px)`,
  `rotateY(180deg) translateZ(${HALF}px)`,
  `rotateY(90deg) translateZ(${HALF}px)`,
  `rotateY(-90deg) translateZ(${HALF}px)`,
  `rotateX(90deg) translateZ(${HALF}px)`,
  `rotateX(-90deg) translateZ(${HALF}px)`,
];

export default function Loader() {
  const [done, setDone] = useState(false);
  const [assembled, setAssembled] = useState(false); // true once the cube has locked in
  const [pct, setPct] = useState(0); // figure download progress (0..100)

  // stream the 3D figure's download progress into the readout
  useEffect(() => {
    const on = () => {
      const p = (window as unknown as { __sceneProgress?: number }).__sceneProgress ?? 0;
      setPct(Math.round(p * 100));
    };
    window.addEventListener("scene-progress", on);
    window.addEventListener("scene-ready", () => setPct(100), { once: true });
    return () => window.removeEventListener("scene-progress", on);
  }, []);

  // the cube finishes drawing a beat after mount → fire the lock-in reveal
  // (shockwave + write)
  useEffect(() => {
    const id = window.setTimeout(() => setAssembled(true), ASSEMBLE_DUR * 1000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const lenis = (window as unknown as { lenis?: Lenis }).lenis;
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    document.body.style.cursor = "wait";

    // debug: visit /?loader to hold the veil open so it can be inspected
    if (new URLSearchParams(window.location.search).has("loader")) return;

    const start = Date.now();
    let fallback = 0;
    let pending = 0;
    // dismiss once the scene is ready — but never before the assemble + reveal has
    // had its moment on screen
    const reveal = () => {
      window.clearTimeout(fallback);
      const wait = Math.max(0, MIN_DISPLAY - (Date.now() - start));
      pending = window.setTimeout(() => setDone(true), wait);
    };

    window.addEventListener("scene-ready", reveal, { once: true });
    const win = window as unknown as { __sceneReady?: boolean; __webglActive?: boolean };

    // when the heavy 3D scene is in play, hold the veil until the figure has
    // actually loaded (scene-ready) — only fall back after a long safety cap so
    // a slow model download never reveals an empty stage. With no WebGL the
    // event never fires, so dismiss quickly.
    const armFallback = () => {
      window.clearTimeout(fallback);
      fallback = window.setTimeout(reveal, win.__webglActive ? 25000 : 2400);
    };

    if (win.__sceneReady) reveal();
    else {
      armFallback();
      window.addEventListener("scene-loading", armFallback, { once: true });
    }

    return () => {
      window.removeEventListener("scene-ready", reveal);
      window.removeEventListener("scene-loading", armFallback);
      window.clearTimeout(fallback);
      window.clearTimeout(pending);
    };
  }, []);

  useEffect(() => {
    if (!done) return;
    const lenis = (window as unknown as { lenis?: Lenis }).lenis;
    document.documentElement.style.overflow = "";
    lenis?.start();
    document.body.style.cursor = "";
  }, [done]);

  // faint twinkling starfield. built after mount (client-only) so the random
  // positions don't differ between SSR and client -> no hydration mismatch.
  const [stars, setStars] = useState<
    { id: number; x: number; y: number; s: number; peak: number; tw: number; delay: number; cyan: boolean }[]
  >([]);
  useEffect(() => {
    setStars(
      Array.from({ length: 48 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        s: Math.random() * 1.5 + 0.5,
        peak: Math.random() * 0.5 + 0.35,
        tw: Math.random() * 3 + 2.4,
        delay: -Math.random() * 6,
        cyan: Math.random() < 0.22,
      }))
    );
  }, []);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(18px) brightness(1.7)" }}
          transition={{ duration: 0.8, ease: [0.7, 0, 0.3, 1] }}
        >
          {/* premium black field: pure black lifted by a faint centre + film grain */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 47%, #0c0c0f 0%, #050506 45%, #000000 100%)",
            }}
          />
          <div className="grain absolute inset-0 opacity-50" />

          {/* atmosphere — a slow-twinkling starfield with a collective drift */}
          <div className="loader-drift pointer-events-none absolute inset-0">
            {stars.map((st) => (
              <span
                key={st.id}
                className="loader-star absolute rounded-full"
                style={
                  {
                    left: `${st.x}%`,
                    top: `${st.y}%`,
                    width: st.s,
                    height: st.s,
                    background: st.cyan ? "rgba(120,240,255,0.9)" : "rgba(255,255,255,0.9)",
                    boxShadow: st.cyan ? "0 0 5px rgba(45,230,230,0.7)" : "0 0 4px rgba(255,255,255,0.45)",
                    "--peak": st.peak,
                    "--tw": `${st.tw}s`,
                    animationDelay: `${st.delay}s`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          {/* a soft cyan aura pooled behind the stage for depth */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px]"
            style={{ background: "radial-gradient(circle, rgba(45,230,230,0.10), transparent 68%)" }}
          />

          {/* power-on flash — one white-cyan pop the instant the cube locks in */}
          <motion.div
            className="pointer-events-none absolute inset-0 bg-white"
            initial={{ opacity: 0 }}
            animate={assembled ? { opacity: [0, 0.4, 0] } : { opacity: 0 }}
            transition={{ duration: 0.55, times: [0, 0.08, 1], ease: "easeOut" }}
          />

          {/* centre stage: the wireframe cube assembles + tumbles above the
              wordmark, which the lock-in writes out of nothing */}
          <div className="relative flex flex-col items-center">
            {/* CUBE */}
            <div className="relative mb-12" style={{ width: CUBE, height: CUBE }}>
              {/* shockwave ring radiating from the lock-in */}
              <motion.span
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/50"
                initial={{ width: CUBE, height: CUBE, opacity: 0 }}
                animate={assembled ? { width: CUBE * 8, height: CUBE * 8, opacity: [0.7, 0] } : {}}
                transition={{ duration: 0.85, ease: "easeOut" }}
              />
              {/* glow pool under the cube */}
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
                style={{
                  width: CUBE * 2.2,
                  height: CUBE * 2.2,
                  background: "radial-gradient(circle, rgba(45,230,230,0.20), transparent 65%)",
                }}
              />
              {/* the cube — scales in on mount, rushes the camera on exit */}
              <motion.div
                className="absolute inset-0"
                style={{ perspective: 620 }}
                initial={{ scale: 0.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  scale: { duration: 0.72, ease: [0.34, 1.56, 0.64, 1] },
                  opacity: { duration: 0.4 },
                }}
                exit={{ scale: 9, opacity: 0, transition: { duration: 0.7, ease: [0.7, 0, 0.3, 1] } }}
              >
                <div className="loader-cube-spin absolute inset-0">
                  {FACES.map((tf, i) => (
                    <span
                      key={i}
                      className="loader-cube-face absolute inset-0 rounded-[2px] border border-accent/70"
                      style={{
                        transform: tf,
                        background:
                          "radial-gradient(circle at 50% 50%, rgba(45,230,230,0.10), rgba(45,230,230,0.02) 70%, transparent)",
                        boxShadow:
                          "0 0 12px rgba(45,230,230,0.25), inset 0 0 18px rgba(45,230,230,0.12)",
                        animationDelay: `${i * 0.09}s`,
                      }}
                    />
                  ))}
                  {/* a bright core node pulsing at the cube's centre */}
                  <span
                    className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
                    style={{ boxShadow: "0 0 12px 3px rgba(45,230,230,0.8)" }}
                  />
                </div>
              </motion.div>
            </div>

            {/* WORDMARK — written out of nothing by the lock-in (centre-out reveal) */}
            <div className="relative w-fit">
              <motion.span
                className="relative block select-none font-logo text-4xl font-extrabold italic lowercase tracking-tight text-ink [text-shadow:0_0_44px_rgba(255,255,255,0.14)] sm:text-7xl"
                initial={{ clipPath: "inset(0 50% 0 50%)", opacity: 0 }}
                animate={assembled ? { clipPath: "inset(0 0% 0 0%)", opacity: 1 } : {}}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                zolboo
                <span className="text-accent [text-shadow:0_0_28px_rgba(45,230,230,0.5)]">.xyz</span>
              </motion.span>
              {/* baseline the cube locked onto — draws out from the centre on lock-in */}
              <motion.div
                className="absolute -bottom-3 left-0 h-px w-full"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.16) 22%, rgba(255,255,255,0.16) 78%, transparent)",
                }}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={assembled ? { scaleX: 1, opacity: 1 } : {}}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* loading status, centred under the stage — a live boot feed ABOVE a
              real progress bar + %, so the visitor always sees something is
              happening and never mistakes the load for a frozen/finished page */}
          <div className="absolute bottom-12 left-1/2 flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-4 px-6">
            {/* sci-fi init feed — reveals one line at a time */}
            <BootLog />
            {/* figure download progress — a slim cyan bar + readout */}
            <div className="flex w-full flex-col items-center gap-2">
              <div className="h-px w-44 overflow-hidden bg-white/[0.08]">
                <motion.div
                  className="h-full bg-accent"
                  style={{ boxShadow: "0 0 10px rgba(45,230,230,0.7)" }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.4em] text-accent/55">
                {pct >= 100 ? "Ready" : pct > 0 ? `Loading figure · ${pct}%` : "Initializing"}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// boot readout — reveals one line at a time, ending on "SYSTEM ONLINE"
const BOOT_LINES = [
  "> INITIALIZING RENDER PIPELINE",
  "> COMPILING SHADERS · OK",
  "> LOADING WIREFRAME LATTICE · OK",
  "> MOUNTING MEMORY ROOM · OK",
  "> SYSTEM ONLINE",
];

function BootLog() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setN((v) => (v < BOOT_LINES.length ? v + 1 : v)), 360);
    return () => window.clearInterval(id);
  }, []);
  return (
    // fixed height reserves room for all five lines so the bar below never jumps
    // as they reveal; centred + visible on every screen
    <div className="flex h-[82px] flex-col items-center justify-start gap-0.5 whitespace-nowrap text-center font-mono text-[8px] uppercase leading-relaxed tracking-[0.18em] text-accent/40 sm:text-[9px]">
      {BOOT_LINES.slice(0, n).map((line, i) => (
        <div key={line} className={i === BOOT_LINES.length - 1 ? "text-accent/80" : ""}>
          {line}
          {i === n - 1 && <span className="caret ml-1 text-accent">▋</span>}
        </div>
      ))}
    </div>
  );
}

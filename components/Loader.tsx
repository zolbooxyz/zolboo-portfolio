"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type Lenis from "lenis";

/**
 * Entry veil: a little ball rolls along a baseline and "writes" the wordmark
 * zolboo.xyz — the text is revealed exactly under the ball as it passes, then
 * un-written as it rolls back. One seamless, stutter-free loop (eased ends, no
 * resets) until the scene signals ready, then the veil scales up and dissolves.
 */
const BALL = 44; // px diameter
const R = BALL / 2;
const DUR = 3.4; // one there-and-back write cycle, seconds
const WRITTEN_MS = (DUR * 1000) / 2; // wordmark is fully written at each cycle midpoint

export default function Loader() {
  const [done, setDone] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const [w, setW] = useState(0); // measured wordmark width → ball travel + spin

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
    // always let the wordmark finish writing: dismiss at the next cycle midpoint
    // (when "zolboo.xyz" is fully drawn), even if the scene was ready instantly
    const reveal = () => {
      window.clearTimeout(fallback);
      const elapsed = Date.now() - start;
      let t = WRITTEN_MS;
      while (t < elapsed) t += DUR * 1000;
      pending = window.setTimeout(() => setDone(true), t - elapsed);
    };

    window.addEventListener("scene-ready", reveal, { once: true });
    const win = window as unknown as { __sceneReady?: boolean };
    if (win.__sceneReady) reveal();
    // fallback in case WebGL is unavailable / the event never fires
    else fallback = window.setTimeout(reveal, 2400);

    return () => {
      window.removeEventListener("scene-ready", reveal);
      window.clearTimeout(fallback);
      window.clearTimeout(pending);
    };
  }, []);

  // measure the wordmark (re-measure once the web font is ready)
  useEffect(() => {
    const measure = () => {
      if (textRef.current) setW(textRef.current.offsetWidth);
    };
    measure();
    (document as Document & { fonts?: FontFaceSet }).fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!done) return;
    const lenis = (window as unknown as { lenis?: Lenis }).lenis;
    document.documentElement.style.overflow = "";
    lenis?.start();
    document.body.style.cursor = "";
  }, [done]);

  const roll = w > 0 ? (w / (Math.PI * BALL)) * 360 : 0; // deg to look like rolling

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.12, filter: "blur(14px)" }}
          transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
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

          {/* boot log — a sci-fi init readout in the corner */}
          <BootLog />

          {/* the wordmark + the ball that writes it */}
          <div className="relative">
            {/* baseline the ball rolls along — a feathered hairline */}
            <div
              className="absolute -bottom-3 left-0 h-px w-full"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.16) 22%, rgba(255,255,255,0.16) 78%, transparent)",
              }}
            />

            {/* soft light that travels with the ball */}
            {w > 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center">
                <motion.div
                  className="h-28 w-28 rounded-full blur-2xl"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(45,230,230,0.16), transparent 70%)",
                  }}
                  animate={{ x: [-34, w - 34, -34] }}
                  transition={{
                    duration: DUR,
                    repeat: Infinity,
                    ease: "easeInOut",
                    times: [0, 0.5, 1],
                  }}
                />
              </div>
            )}

            {/* wordmark — revealed under the ball via an animated clip */}
            <motion.span
              ref={textRef}
              className="relative block select-none font-logo text-5xl font-extrabold italic lowercase tracking-tight text-ink [text-shadow:0_0_44px_rgba(255,255,255,0.14)]"
              initial={{ clipPath: "inset(0 100% 0 0)" }}
              animate={{
                clipPath: [
                  "inset(0 100% 0 0)",
                  "inset(0 0% 0 0)",
                  "inset(0 100% 0 0)",
                ],
              }}
              transition={{
                duration: DUR,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.5, 1],
              }}
            >
              zolboo
              <span className="text-accent [text-shadow:0_0_28px_rgba(45,230,230,0.5)]">
                .xyz
              </span>
            </motion.span>

            {/* the rolling metal-glass orb — a rotating core (face suspended in a
                metallic base) under a fixed glass shell (curvature, caustic,
                specular, rim). Both layers share the ball's travel. */}
            {w > 0 && (
              <>
                {/* rotating core */}
                <div className="pointer-events-none absolute inset-0 flex items-center">
                  <motion.div
                    className="overflow-hidden rounded-full"
                    style={{
                      width: BALL,
                      height: BALL,
                      background:
                        "radial-gradient(circle at 38% 32%, #3a4654 0%, #16202a 60%, #070b10 100%)",
                    }}
                    animate={{ x: [0, w, 0], rotate: [0, roll, 0] }}
                    transition={{
                      duration: DUR,
                      repeat: Infinity,
                      ease: "easeInOut",
                      times: [0, 0.5, 1],
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/loader.png"
                      alt=""
                      className="absolute inset-0 h-full w-full scale-[0.92] object-contain opacity-90"
                      style={{ filter: "contrast(1.05) saturate(0.9)" }}
                      draggable={false}
                    />
                    {/* iridescent metal wash */}
                    <div
                      className="absolute inset-0 rounded-full mix-blend-screen"
                      style={{
                        background:
                          "conic-gradient(from 210deg, rgba(45,230,230,0.30), rgba(130,90,255,0.20), rgba(45,230,230,0) 55%, rgba(255,110,200,0.18), rgba(45,230,230,0.30))",
                      }}
                    />
                  </motion.div>
                </div>

                {/* fixed glass shell on top */}
                <div className="pointer-events-none absolute inset-0 flex items-center">
                  <motion.div
                    className="rounded-full"
                    style={{
                      width: BALL,
                      height: BALL,
                      background:
                        "radial-gradient(circle at 50% 42%, transparent 46%, rgba(5,8,12,0.55) 100%), radial-gradient(circle at 64% 82%, rgba(120,240,255,0.45), transparent 34%), radial-gradient(circle at 30% 22%, rgba(255,255,255,0.95), transparent 22%), radial-gradient(circle at 41% 33%, rgba(255,255,255,0.30), transparent 46%)",
                      boxShadow:
                        "0 8px 30px rgba(0,0,0,0.6), 0 0 26px rgba(45,230,230,0.28), inset 0 0 0 1px rgba(255,255,255,0.14), inset 0 2px 3px rgba(255,255,255,0.5), inset 0 -8px 12px rgba(0,0,0,0.5)",
                    }}
                    animate={{ x: [0, w, 0] }}
                    transition={{
                      duration: DUR,
                      repeat: Infinity,
                      ease: "easeInOut",
                      times: [0, 0.5, 1],
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Sci-fi initialisation readout in the loader corner — reveals one line at a
// time, ending on "SYSTEM ONLINE".
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
    <div className="absolute bottom-7 left-7 hidden font-mono text-[9px] uppercase leading-relaxed tracking-[0.18em] text-accent/40 sm:block">
      {BOOT_LINES.slice(0, n).map((line, i) => (
        <div key={line} className={i === BOOT_LINES.length - 1 ? "text-accent/80" : ""}>
          {line}
          {i === n - 1 && <span className="caret ml-1 text-accent">▋</span>}
        </div>
      ))}
    </div>
  );
}

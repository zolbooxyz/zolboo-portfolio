"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type Lenis from "lenis";

/**
 * Minimal entry veil: a black screen with a gently breathing wordmark that fades
 * away the moment the 3D scene signals it's ready (or a short fallback), revealing
 * the hero greeting on the void. No counter — the hero itself is the opening.
 */
export default function Loader() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const lenis = (window as unknown as { lenis?: Lenis }).lenis;
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    document.body.style.cursor = "wait";

    let fallback = 0;
    const reveal = () => {
      window.clearTimeout(fallback);
      setDone(true);
    };

    const w = window as unknown as { __sceneReady?: boolean };
    if (w.__sceneReady) {
      // scene already up (e.g. fast refresh) — hold a beat so it isn't a flash
      fallback = window.setTimeout(reveal, 500);
    } else {
      window.addEventListener("scene-ready", reveal, { once: true });
      // fallback in case WebGL is unavailable / the event never fires
      fallback = window.setTimeout(reveal, 2400);
    }

    return () => {
      window.removeEventListener("scene-ready", reveal);
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!done) return;
    const lenis = (window as unknown as { lenis?: Lenis }).lenis;
    document.documentElement.style.overflow = "";
    lenis?.start();
    document.body.style.cursor = "";
  }, [done]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-bg"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.span
            className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl"
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            Zolboo<span className="text-accent">.</span>
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

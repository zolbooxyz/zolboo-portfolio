"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type Lenis from "lenis";

const DURATION = 1700; // ms to count 0 -> 100

export default function Loader() {
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const lenis = (window as unknown as { lenis?: Lenis }).lenis;
    lenis?.stop();
    // Lenis may not exist yet (child effects run before the provider's), so
    // lock the document directly as well.
    document.documentElement.style.overflow = "hidden";
    document.body.style.cursor = "wait";

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION);
      // easeOutExpo for a satisfying deceleration
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setCount(Math.round(eased * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setDone(true), 380);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
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
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg"
          exit={{ y: "-100%" }}
          transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
        >
          {/* name */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <span className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Zolboo<span className="text-accent">.</span>
            </span>
          </motion.div>

          {/* counter */}
          <div className="absolute bottom-8 right-6 sm:bottom-12 sm:right-12">
            <span className="font-mono text-[clamp(3rem,14vw,8rem)] font-bold leading-none text-ink/90 tabular-nums">
              {String(count).padStart(3, "0")}
            </span>
          </div>

          {/* progress line */}
          <motion.div
            className="absolute bottom-0 left-0 h-px bg-accent shadow-glow-sm"
            initial={{ width: "0%" }}
            animate={{ width: `${count}%` }}
            transition={{ ease: "linear", duration: 0.05 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

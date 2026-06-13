"use client";

import { ReactNode, useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Wraps the app in a Lenis smooth-scroll instance and keeps GSAP ScrollTrigger
 * in sync with it. Disabled entirely when the user prefers reduced motion.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    // lerp mode (not duration/easing): the scroll continuously chases the
    // target every frame, so a fast flick keeps gliding with natural inertia
    // instead of completing its fixed-duration ease and snapping to a stop.
    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      anchors: true,
    });

    // Drive Lenis from GSAP's ticker so scroll + animations share one clock.
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // always open at the top (blank-void greeting), never a restored position
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    lenis.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);

    // Expose for anchor links / loader hand-off.
    (window as unknown as { lenis?: Lenis }).lenis = lenis;

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      delete (window as unknown as { lenis?: Lenis }).lenis;
    };
  }, []);

  return <>{children}</>;
}

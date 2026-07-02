"use client";

import { useEffect, useRef, useState } from "react";

// custom cursor (fine-pointer only). the dot tracks the pointer 1:1; the ring
// trails behind on a lerp (liquid feel), expands over interactive elements and
// compresses on press.
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    setEnabled(true);
    document.documentElement.classList.add("custom-cursor");

    const target = { x: -100, y: -100 };
    const eased = { x: -100, y: -100 };
    let hovering = false;
    let pressed = false;
    let raf = 0;

    const isInteractive = (el: Element | null) =>
      !!el?.closest("a, button, [data-cursor], input, textarea");

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      // dot snaps to the pointer — zero perceived latency
      if (dot.current) {
        dot.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      }
      hovering = isInteractive(e.target as Element);
    };
    // content moves under a stationary pointer on this scroll-driven site, so
    // re-probe what's beneath the cursor whenever the page scrolls
    const onScroll = () => {
      if (target.x >= 0) hovering = isInteractive(document.elementFromPoint(target.x, target.y));
    };
    const onDown = () => { pressed = true; };
    const onUp = () => { pressed = false; };

    let lastMs = performance.now();
    const tick = (nowMs: number) => {
      // ring lerps behind the dot — the trailing physics that makes it liquid.
      // the 0.18 factor is tuned for 60Hz; rescale by the real frame time so
      // the trail feels the same on 120Hz displays
      const dtn = Math.min((nowMs - lastMs) / 1000, 0.05) * 60;
      lastMs = nowMs;
      const k = 1 - Math.pow(1 - 0.18, dtn);
      eased.x += (target.x - eased.x) * k;
      eased.y += (target.y - eased.y) * k;
      if (ring.current) {
        const scale = (hovering ? 2.4 : 1) * (pressed ? 0.72 : 1);
        ring.current.style.transform = `translate3d(${eased.x}px, ${eased.y}px, 0) translate(-50%, -50%) scale(${scale})`;
        ring.current.style.opacity = hovering ? "0.6" : "1";
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.classList.remove("custom-cursor");
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[90] mix-blend-difference">
      <div
        ref={ring}
        className="absolute left-0 top-0 h-9 w-9 rounded-full border border-white/80 transition-[opacity] duration-200 will-change-transform"
      />
      <div
        ref={dot}
        className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-white will-change-transform"
      />
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Blended custom cursor (desktop / fine-pointer only). Both the dot and the
 * ring track the pointer 1:1 (no trailing/inertia); the ring just expands over
 * interactive elements (links, buttons, or anything marked [data-cursor]).
 */
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

    const onMove = (e: PointerEvent) => {
      // both elements snap to the pointer the same frame — no lerp, no float
      if (dot.current) {
        dot.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      }
      const interactive = (e.target as HTMLElement)?.closest(
        "a, button, [data-cursor], input, textarea"
      );
      const hovering = !!interactive;
      if (ring.current) {
        ring.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%) scale(${hovering ? 2.4 : 1})`;
        ring.current.style.opacity = hovering ? "0.6" : "1";
      }
    };

    window.addEventListener("pointermove", onMove);

    return () => {
      window.removeEventListener("pointermove", onMove);
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

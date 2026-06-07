"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Blended custom cursor (desktop / fine-pointer only). A small dot tracks the
 * pointer 1:1, a larger ring trails with lerp and expands over interactive
 * elements (links, buttons, or anything marked [data-cursor]).
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

    const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
    const pos = { x: mouse.x, y: mouse.y };
    let hovering = false;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (dot.current) {
        dot.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      }
      const interactive = (e.target as HTMLElement)?.closest(
        "a, button, [data-cursor], input, textarea"
      );
      hovering = !!interactive;
    };

    const render = () => {
      pos.x += (mouse.x - pos.x) * 0.18;
      pos.y += (mouse.y - pos.y) * 0.18;
      if (ring.current) {
        const s = hovering ? 2.4 : 1;
        ring.current.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%) scale(${s})`;
        ring.current.style.opacity = hovering ? "0.6" : "1";
      }
      raf = requestAnimationFrame(render);
    };

    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
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

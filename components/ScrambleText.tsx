"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*<>/\\[]{}=+";

// Decodes its text left-to-right: unresolved characters flicker through random
// glyphs, then lock into the final letter — a classic HUD "decrypt" reveal.
// Writes straight to the DOM node (no per-frame React state) so dozens can run
// at once without flooding React with re-renders.
export default function ScrambleText({
  text,
  className = "",
  active = true,
  speed = 26,
  whenVisible = false,
  onReveal,
}: {
  text: string;
  className?: string;
  active?: boolean;
  /** ms per character */
  speed?: number;
  /** wait until scrolled into view before decoding (one-shot) */
  whenVisible?: boolean;
  /** fired as each new character locks in (for a tick sound) */
  onReveal?: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useRef(false);
  const [seen, setSeen] = useState(!whenVisible);

  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // visibility gate — decode the first time this scrolls into view
  useEffect(() => {
    if (!whenVisible || seen) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [whenVisible, seen]);

  const go = active && seen;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!go || reduced.current) {
      el.textContent = text;
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    let last = -1;
    const tick = (now: number) => {
      const revealed = Math.floor((now - t0) / speed);
      if (revealed !== last) {
        last = revealed;
        if (revealed <= text.length && text[revealed - 1] && text[revealed - 1] !== " ") onReveal?.();
      }
      let s = "";
      for (let i = 0; i < text.length; i++) {
        if (i < revealed) s += text[i];
        else if (text[i] === " ") s += " ";
        else s += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = s;
      if (revealed < text.length) raf = requestAnimationFrame(tick);
      else el.textContent = text;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [go, text, speed, onReveal]);

  // render the final text on mount (SSR-friendly); the effect takes over client-side
  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}

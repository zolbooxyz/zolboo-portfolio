"use client";

import { useEffect, useRef, useState } from "react";

// Persistent FUI chrome over the whole stage: scanlines, a thin targeting frame
// with corner brackets, and live telemetry readouts (scroll %, chapter, FPS,
// clock). Purely decorative + non-interactive so it never blocks the scene.
const CHAPTERS: [number, string][] = [
  [0.0, "INTRO"],
  [0.18, "TRANSIT"],
  [0.6, "MEMORY//ROOM"],
  [0.9, "SIGN-OFF"],
];

export default function HudOverlay() {
  const [pct, setPct] = useState(0);
  const [fps, setFps] = useState(60);
  const [clock, setClock] = useState("--:--:--");
  const frames = useRef(0);
  const last = useRef(performance.now());

  useEffect(() => {
    let raf = 0;
    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setPct(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
      });
    };
    const loop = () => {
      frames.current++;
      const now = performance.now();
      if (now - last.current >= 500) {
        setFps(Math.round((frames.current * 1000) / (now - last.current)));
        frames.current = 0;
        last.current = now;
        const d = new Date();
        setClock(d.toTimeString().slice(0, 8));
      }
      raf = requestAnimationFrame(loop);
    };
    onScroll();
    loop();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  let chapter = CHAPTERS[0][1];
  for (const [p, label] of CHAPTERS) if (pct >= p) chapter = label;

  return (
    <div className="pointer-events-none absolute inset-0 z-[14]">
      {/* scanlines */}
      <div className="hud-scanlines absolute inset-0 opacity-60" />

      {/* thin targeting frame + corner brackets */}
      <div className="absolute inset-3 border border-accent/[0.06]" />
      <Bracket className="left-3 top-3 border-l border-t" />
      <Bracket className="right-3 top-3 border-r border-t" />
      <Bracket className="bottom-3 left-3 border-b border-l" />
      <Bracket className="bottom-3 right-3 border-b border-r" />

      {/* bottom-left telemetry */}
      <div className="absolute bottom-7 left-7 font-mono text-[9px] uppercase leading-relaxed tracking-[0.22em] text-accent/45">
        <div className="flex items-center gap-1.5 text-accent/70">
          <span className="h-1 w-1 animate-pulseGlow rounded-full bg-accent" />
          SYS://ZOLBOO.XYZ
        </div>
        <div>SCROLL {(pct * 100).toFixed(1).padStart(5, "0")}%</div>
        <div>SECTOR · {chapter}</div>
      </div>

      {/* bottom-right telemetry */}
      <div className="absolute bottom-7 right-7 text-right font-mono text-[9px] uppercase leading-relaxed tracking-[0.22em] text-accent/45">
        <div>{clock}</div>
        <div>RENDER {fps.toString().padStart(2, "0")} FPS</div>
        <div className="text-accent/70">● ONLINE</div>
      </div>
    </div>
  );
}

function Bracket({ className }: { className: string }) {
  return <span className={`absolute h-5 w-5 border-accent/30 ${className}`} />;
}

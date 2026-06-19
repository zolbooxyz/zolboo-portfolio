"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { content } from "@/lib/content";
import { useLang } from "@/lib/LanguageContext";

const items = content.projects.items;
const N = items.length;
const STEP = 360 / N; // degrees between adjacent cards on the ring

/**
 * Holo carousel — the project cards orbit a central spindle in CSS 3D space.
 * Scroll (via `progressRef`, 0→1) spins the ring so each project sweeps to the
 * front in turn; the front card is lit + enlarged while the rest recede.
 *
 * Rotation + per-card focus run on the component's own rAF (only while active),
 * reading the shared progress ref — so World's render loop never triggers a
 * React re-render for this.
 */
export default function ProjectsCarousel({
  active,
  progressRef,
}: {
  active: boolean;
  progressRef: MutableRefObject<number>;
}) {
  const { t } = useLang();
  const ringRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const counterRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const ring = ringRef.current;
    if (!ring) return;

    const tick = () => {
      const p = Math.min(1, Math.max(0, progressRef.current));
      // sweep through all N cards: card 0 at front when p=0, card N-1 at p=1
      const ringAngle = -p * (N - 1) * STEP;
      ring.style.transform = `rotateY(${ringAngle}deg)`;

      let frontIdx = 0;
      let frontMax = -2;
      for (let i = 0; i < N; i++) {
        const el = cardsRef.current[i];
        if (!el) continue;
        // this card's angle relative to the camera (front = 0°)
        const a = ((i * STEP + ringAngle) % 360 + 540) % 360 - 180; // → [-180,180]
        const rad = (a * Math.PI) / 180;
        const front = Math.cos(rad); // 1 = facing us, -1 = behind
        const f = Math.max(0, front);
        el.style.opacity = String(0.12 + 0.88 * f * f);
        el.style.filter = `brightness(${0.55 + 0.45 * f})`;
        const isFront = Math.abs(a) < STEP / 2;
        el.dataset.front = isFront ? "1" : "0";
        if (front > frontMax) {
          frontMax = front;
          frontIdx = i;
        }
      }
      if (counterRef.current) {
        counterRef.current.textContent = String(frontIdx + 1).padStart(2, "0");
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, progressRef]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[8] flex flex-col items-center justify-center transition-opacity duration-700"
      style={{ opacity: active ? 1 : 0 }}
      aria-hidden={!active}
    >
      {/* section heading */}
      <div className="absolute left-1/2 top-[12%] -translate-x-1/2 text-center">
        <div className="flex items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-[0.45em] text-accent/70 sm:text-[10px]">
          <span className="h-1 w-1 animate-pulseGlow rounded-full bg-accent" />
          {t(content.projects.label)}
        </div>
        <h2 className="mt-2 font-display text-2xl font-extrabold uppercase tracking-tight text-ink sm:text-4xl">
          {t(content.projects.heading)}
        </h2>
      </div>

      {/* 3D ring */}
      <div
        className="relative h-[300px] w-[320px] sm:h-[340px] sm:w-[380px]"
        style={{ perspective: "1200px" }}
      >
        <div
          ref={ringRef}
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d", willChange: "transform" }}
        >
          {items.map((proj, i) => (
            <div
              key={proj.id}
              ref={(el) => {
                cardsRef.current[i] = el;
              }}
              data-front="0"
              className="group absolute inset-0 flex items-center justify-center will-change-[opacity,transform] [backface-visibility:hidden]"
              style={{
                transform: `rotateY(${i * STEP}deg) translateZ(var(--carousel-r, 380px))`,
              }}
            >
              <div className="flex w-full flex-col rounded-xl border border-line bg-surface/70 p-5 backdrop-blur-sm transition-shadow group-data-[front=1]:border-accent/50 group-data-[front=1]:shadow-glow sm:p-6">
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-accent/90">
                  <span>{t(proj.category)}</span>
                  <span className="text-muted/70">{proj.year}</span>
                </div>
                <div className="mt-3 font-display text-xl font-bold leading-tight text-ink sm:text-2xl">
                  {t(proj.title)}
                </div>
                <div className="mt-1 h-px w-10 bg-gradient-to-r from-accent to-transparent" />
                <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted sm:text-xs">
                  {t(proj.desc)}
                </p>
                {"clients" in proj && proj.clients ? (
                  <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.15em] text-accent/60">
                    {proj.clients}
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {proj.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-muted/80"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="pointer-events-none absolute right-4 top-4 font-mono text-[10px] tabular-nums text-ink/15">
                  {String(i + 1).padStart(2, "0")}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* progress counter */}
      <div className="absolute bottom-[14%] left-1/2 -translate-x-1/2 font-mono text-[11px] tracking-[0.3em] text-muted">
        <span ref={counterRef} className="text-accent">01</span>
        <span className="text-muted/40"> / {String(N).padStart(2, "0")}</span>
      </div>
    </div>
  );
}

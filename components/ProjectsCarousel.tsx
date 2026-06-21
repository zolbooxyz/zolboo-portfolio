"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { content } from "@/lib/content";
import { useLang } from "@/lib/LanguageContext";
import ProjectShot from "@/components/ProjectShot";
import ProjectDetail, { type Project } from "@/components/ProjectDetail";

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
  handRef,
}: {
  active: boolean;
  progressRef: MutableRefObject<number>;
  handRef: MutableRefObject<{ x: number; y: number }>;
}) {
  const { t } = useLang();
  const [openProject, setOpenProject] = useState<Project | null>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const counterRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null); // entrance wrapper — blooms out of the hand
  const headRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const ring = ringRef.current;
    if (!ring) return;

    const tick = () => {
      const p = Math.min(1, Math.max(0, progressRef.current));
      // first ~24% of the window = ENTRANCE: the ring blooms out of the figure's
      // hand; the remaining 76% sweeps through the cards.
      const e = Math.min(1, p / 0.24);
      const ee = e * e * (3 - 2 * e); // ease-in-out
      const rot = Math.max(0, (p - 0.24) / 0.76);
      const ringAngle = -rot * (N - 1) * STEP;
      ring.style.transform = `rotateY(${ringAngle}deg)`;

      // bloom the whole ring from the hand's screen point into centre
      const wrap = wrapRef.current;
      if (wrap) {
        const inv = 1 - ee;
        const dx = (handRef.current.x - 0.5) * window.innerWidth * inv;
        const dy = (handRef.current.y - 0.5) * window.innerHeight * inv;
        wrap.style.transform = `translate(${dx}px, ${dy}px) scale(${0.1 + 0.9 * ee})`;
        wrap.style.opacity = String(Math.min(1, e * 1.5));
      }
      if (headRef.current) headRef.current.style.opacity = String(Math.max(0, (e - 0.4) / 0.6));

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
  }, [active, progressRef, handRef]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[8] flex flex-col items-center justify-center transition-opacity duration-700"
      style={{ opacity: active ? 1 : 0 }}
      aria-hidden={!active}
    >
      {/* section heading */}
      <div ref={headRef} className="absolute left-1/2 top-[6%] -translate-x-1/2 text-center sm:top-[12%]">
        <div className="flex items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-[0.45em] text-accent/70 sm:text-[10px]">
          <span className="h-1 w-1 animate-pulseGlow rounded-full bg-accent" />
          {t(content.projects.label)}
        </div>
        <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {t(content.projects.heading)}
        </h2>
      </div>

      {/* 3D ring — wrapped so it can bloom out of the figure's hand on entrance */}
      <div ref={wrapRef} className="will-change-[transform,opacity]">
      {/* radius (--carousel-r) + perspective are tuned per-breakpoint so the
          perspective-magnified FRONT card never overflows a phone screen:
          mobile keeps a shallow ring + far perspective (≈1.25× blow-up on a
          260px card → ~325px, fits 390px) while desktop stays roomy. */}
      <div
        className="relative h-[360px] w-[240px] [--carousel-r:260px] [perspective:1400px] sm:h-[430px] sm:w-[380px] sm:[--carousel-r:380px] sm:[perspective:1200px]"
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
              <button
                type="button"
                onClick={() => setOpenProject(proj)}
                className="pointer-events-none flex w-full cursor-default flex-col overflow-hidden rounded-xl border border-line bg-surface/90 text-left backdrop-blur-md transition-shadow group-data-[front=1]:pointer-events-auto group-data-[front=1]:cursor-pointer group-data-[front=1]:border-accent/50 group-data-[front=1]:shadow-glow"
              >
                {/* screenshot (or branded placeholder) */}
                <ProjectShot
                  id={proj.id}
                  title={proj.title}
                  category={proj.category}
                  className="aspect-[16/9] w-full"
                />
                <div className="flex flex-col p-4 sm:p-5">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-accent/90">
                    <span>{t(proj.category)}</span>
                    <span className="text-muted/70">{proj.year}</span>
                  </div>
                  <div className="mt-2 font-display text-lg font-bold leading-tight text-ink sm:text-xl">
                    {t(proj.title)}
                  </div>
                  <p className="mt-2 line-clamp-2 font-mono text-[11px] leading-relaxed text-muted">
                    {t(proj.desc)}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {proj.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded border border-line px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-muted/80"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="flex items-center gap-1 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-accent/0 transition-colors group-data-[front=1]:text-accent/80">
                      {t({ mn: "Үзэх", en: "View" })} →
                    </span>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* progress counter + tap hint */}
      <div className="absolute bottom-[11%] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5">
        <div className="font-mono text-[11px] tracking-[0.3em] text-muted">
          <span ref={counterRef} className="text-accent">01</span>
          <span className="text-muted/40"> / {String(N).padStart(2, "0")}</span>
        </div>
        <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted/50">
          {t({ mn: "Дэлгэрэнгүй харах бол карт дээр дарна уу", en: "Tap a card for details" })}
        </div>
      </div>

      {openProject && <ProjectDetail project={openProject} onClose={() => setOpenProject(null)} />}
    </div>
  );
}

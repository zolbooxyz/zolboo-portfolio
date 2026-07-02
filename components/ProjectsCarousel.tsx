"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { content } from "@/lib/content";
import { useLang } from "@/lib/LanguageContext";
import ProjectShot from "@/components/ProjectShot";
import ProjectDetail, { type Project } from "@/components/ProjectDetail";

const items = content.projects.items;
const N = items.length;
const STEP = 360 / N; // degrees between adjacent cards on the ring

// Project cards on a CSS-3D ring. progressRef (0..1) spins it so each card comes
// to the front in turn. Runs on its own rAF while active, reading the shared ref,
// so World's render loop never re-renders this.
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
  const footRef = useRef<HTMLDivElement>(null); // counter + tap hint — fades with the heading
  const rafRef = useRef<number>(0);
  // pointer parallax — target (raw) and current (eased) tilt in normalized -1..1
  const ptrTarget = useRef({ x: 0, y: 0 });
  const ptrNow = useRef({ x: 0, y: 0 });

  // track the cursor so the whole ring tilts a touch toward it (desktop depth cue)
  useEffect(() => {
    if (!active) return;
    const onMove = (e: PointerEvent) => {
      ptrTarget.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      ptrTarget.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const ring = ringRef.current;
    if (!ring) return;

    const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
    const tick = () => {
      const p = clamp01(progressRef.current);
      const now = performance.now() / 1000;
      // Three beats woven into the journey:
      //  ENTRANCE (0→0.20)  — the ring blooms out of the figure's pointing hand
      //  SWEEP    (0.20→0.76) — each project rotates to the front and DWELLS there
      //  EXIT     (0.82→1.0) — the whole gallery launches into the depth ahead,
      //                         handing off into the memory-room dive that follows
      const e = Math.min(1, p / 0.20);
      const ee = e * e * (3 - 2 * e); // ease-in-out
      // STEPPED sweep: instead of gliding past all the cards at one constant speed
      // (a fast scroll blows through them in an instant), each card rotates to the
      // front then HOLDS for a beat before the next — the ring "clicks" project to
      // project so every one gets a readable moment.
      const sweep = clamp01((p - 0.20) / 0.56);
      const u = sweep * (N - 1);                  // 0..N-1 — which card is at front
      const i = Math.min(N - 2, Math.floor(u));
      const f = u - i;                            // 0..1 progress within this card's slice
      const hold = 0.58;                          // most of each slice holds the card still
      const tt = f <= hold ? 0 : (f - hold) / (1 - hold);
      const te = tt * tt * (3 - 2 * tt);          // then ease the rotation to the next
      const ringAngle = -(i + te) * STEP;
      // EXIT factor: the cards accelerate away (ease-in) so they appear pulled
      // into the room we are about to dive through, dissolving as they recede.
      const x = clamp01((p - 0.82) / 0.18);
      const xe = x * x;

      // ease the pointer tilt toward the cursor; flatten it out on entrance/exit
      ptrNow.current.x += (ptrTarget.current.x - ptrNow.current.x) * 0.06;
      ptrNow.current.y += (ptrTarget.current.y - ptrNow.current.y) * 0.06;
      const settle = ee * (1 - xe);               // only tilt once the ring has bloomed
      const tiltY = ptrNow.current.x * 6 * settle;
      const tiltX = -ptrNow.current.y * 4 * settle;
      ring.style.transform = `rotateX(${tiltX}deg) rotateY(${ringAngle + tiltY}deg)`;

      // bloom the whole ring out of the hand (entrance), then recede it into the
      // depth + drift toward the vanishing point (exit) — one continuous gesture
      const wrap = wrapRef.current;
      if (wrap) {
        const inv = 1 - ee;
        const dx = (handRef.current.x - 0.5) * window.innerWidth * inv;
        const dy = (handRef.current.y - 0.5) * window.innerHeight * inv;
        const lift = -xe * window.innerHeight * 0.12; // drift up into the distance
        const bob = Math.sin(now * 0.9) * 5 * settle; // gentle idle float when settled
        const scale = (0.1 + 0.9 * ee) * (1 - 0.5 * xe); // bloom up, then shrink away
        wrap.style.transform = `translate(${dx}px, ${dy + lift + bob}px) scale(${scale})`;
        wrap.style.opacity = String(Math.min(1, e * 1.5) * (1 - xe));
      }
      const headO = Math.max(0, (e - 0.4) / 0.6) * (1 - x);
      if (headRef.current) headRef.current.style.opacity = String(headO);
      if (footRef.current) footRef.current.style.opacity = String(headO);

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
        // side cards recede hard — dim, desaturate and blur them so the front card
        // owns the frame instead of fighting its neighbours
        el.style.opacity = String(0.04 + 0.96 * f * f * f);
        el.style.filter = `brightness(${0.4 + 0.6 * f}) saturate(${0.5 + 0.5 * f}) blur(${(1 - f) * 2.5}px)`;
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
      {/* section heading — kept in a reserved top band, clear of the ring */}
      <div ref={headRef} className="absolute left-1/2 top-[9%] -translate-x-1/2 text-center sm:top-[8%]">
        <div className="flex items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-[0.4em] text-accent/70 sm:text-[10px]">
          <span className="h-1 w-1 animate-pulseGlow rounded-full bg-accent" />
          {t(content.projects.label)}
        </div>
        <h2 className="mt-2 font-display text-xl font-extrabold tracking-tight text-ink sm:text-[1.75rem]">
          {t(content.projects.heading)}
        </h2>
      </div>

      {/* 3D ring — wrapped so it can bloom out of the figure's hand on entrance */}
      <div ref={wrapRef} className="will-change-[transform,opacity]">
      {/* radius (--carousel-r) + perspective are tuned per-breakpoint so the
          perspective-magnified FRONT card stays inside the central band (clear of
          the heading and footer) on every screen: shallower magnification keeps
          the front card readable without overflowing into the labels. */}
      <div
        className="relative h-[330px] w-[228px] [--carousel-r:236px] [perspective:1500px] sm:h-[380px] sm:w-[360px] sm:[--carousel-r:360px] sm:[perspective:1900px]"
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
              className="group absolute inset-0 flex items-center justify-center will-change-[opacity,transform,filter] [backface-visibility:hidden]"
              style={{
                transform: `rotateY(${i * STEP}deg) translateZ(var(--carousel-r, 360px))`,
              }}
            >
              <button
                type="button"
                onClick={() => active && setOpenProject(proj)}
                className={`pointer-events-none relative flex w-full cursor-default flex-col overflow-hidden rounded-2xl border border-line bg-surface/85 text-left backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-300 ease-out group-data-[front=1]:scale-[1.04] group-data-[front=1]:border-accent/50 group-data-[front=1]:shadow-glow ${
                  active ? "group-data-[front=1]:pointer-events-auto group-data-[front=1]:cursor-pointer" : ""
                }`}
              >
                {/* top accent hairline — lights up on the front card */}
                <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-accent/0 to-transparent transition-opacity duration-300 group-data-[front=1]:via-accent/70" />

                {/* screenshot (or branded placeholder) */}
                <ProjectShot
                  id={proj.id}
                  title={proj.title}
                  className="aspect-[16/9] w-full"
                />
                <div className="flex flex-col p-4 sm:p-5">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-accent/90">
                    <span>{t(proj.category)}</span>
                    <span className="text-muted/70">{proj.year}</span>
                  </div>
                  <div className="mt-2 font-display text-base font-bold leading-snug text-ink sm:text-lg">
                    {t(proj.title)}
                  </div>
                  <p className="mt-2 line-clamp-2 font-body text-[13px] leading-relaxed text-muted">
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

                {/* corner HUD ticks — frame the active card */}
                <span className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-accent/0 transition-colors duration-300 group-data-[front=1]:border-accent/50" />
                <span className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-accent/0 transition-colors duration-300 group-data-[front=1]:border-accent/50" />
                <span className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-accent/0 transition-colors duration-300 group-data-[front=1]:border-accent/50" />
                <span className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-accent/0 transition-colors duration-300 group-data-[front=1]:border-accent/50" />
              </button>
            </div>
          ))}
        </div>
      </div>
      </div>

      {/* progress counter + tap hint — reserved bottom band */}
      <div ref={footRef} className="absolute bottom-[7%] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5">
        <div className="font-mono text-[11px] tracking-[0.3em] text-muted">
          <span ref={counterRef} className="text-accent">01</span>
          <span className="text-muted/40"> / {String(N).padStart(2, "0")}</span>
        </div>
        <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted/50">
          {t({ mn: "Дэлгэрэнгүй харах бол карт дээр дарна уу", en: "Tap a card for details" })}
        </div>
        <div className="hidden font-mono text-[9px] uppercase tracking-[0.25em] text-muted/40 sm:block">
          {t({ mn: "← → товчоор төслүүдийг сэлгэнэ", en: "Use ← → to browse projects" })}
        </div>
      </div>

      {openProject && <ProjectDetail project={openProject} onClose={() => setOpenProject(null)} />}
    </div>
  );
}

"use client";

import { ReactNode, useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { content } from "@/lib/content";
import { useLang } from "@/lib/LanguageContext";

function Word({
  children,
  range,
  progress,
}: {
  children: ReactNode;
  range: [number, number];
  progress: MotionValue<number>;
}) {
  const opacity = useTransform(progress, range, [0.12, 1]);
  return (
    <motion.span style={{ opacity }} className="mr-[0.25em] inline-block">
      {children}
    </motion.span>
  );
}

export default function Statement() {
  const { lang, t } = useLang();
  const s = content.statement;
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.55"],
  });

  const words = s.words[lang];
  const lead = t(s.lead);
  const all = [lead, ...words];

  return (
    <section ref={ref} className="relative overflow-hidden border-y border-line bg-bg-2/60 px-6 py-40 sm:px-10 sm:py-52 lg:px-16">
      {/* full-bleed scene glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 60% at 30% 50%, rgba(45,230,230,0.08), transparent 70%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-[1500px]">
        <div className="mb-8 flex items-center gap-4">
          <span className="h-px w-8 bg-accent/60" />
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            {t(s.label)}
          </span>
        </div>

        <p className="flex flex-wrap font-display text-3xl font-bold leading-[1.2] tracking-tight sm:text-5xl md:text-6xl">
          {all.map((w, i) => {
            const startPct = i / all.length;
            const endPct = (i + 1.5) / all.length;
            const highlight = w.includes("адал") || w.includes("adventure");
            return (
              <Word
                key={i}
                range={[startPct, Math.min(1, endPct)]}
                progress={scrollYProgress}
              >
                <span className={highlight ? "text-accent text-glow" : "text-ink"}>{w}</span>
              </Word>
            );
          })}
        </p>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import { content } from "@/lib/content";
import { useLang } from "@/lib/LanguageContext";
import Reveal from "./ui/Reveal";

export default function Timeline() {
  const { t } = useLang();
  const j = content.journey;

  return (
    <section id="journey" className="relative px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            {t(j.label)}
          </span>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {t(j.heading)}
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-4 max-w-xl text-muted">{t(j.sub)}</p>
        </Reveal>

        <div className="relative mt-16 pl-8 sm:pl-10">
          {/* vertical line */}
          <div className="absolute bottom-2 left-[7px] top-2 w-px bg-gradient-to-b from-accent/60 via-line to-transparent sm:left-[9px]" />

          <div className="space-y-10">
            {j.items.map((it, i) => (
              <Reveal key={it.year + i} delay={0.04 * i} y={18}>
                <div className="relative">
                  {/* node */}
                  <motion.span
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.04 * i + 0.1, type: "spring", stiffness: 300, damping: 18 }}
                    className={`absolute -left-8 top-1.5 h-3.5 w-3.5 rounded-full sm:-left-10 ${
                      "highlight" in it && it.highlight
                        ? "bg-accent shadow-glow-sm"
                        : "border border-accent/40 bg-bg"
                    }`}
                  />
                  <div className="font-mono text-xs tracking-wider text-accent">{it.year}</div>
                  <h3 className="mt-1 font-display text-lg font-bold tracking-tight text-ink">
                    {t(it.title)}
                  </h3>
                  <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted">
                    {t(it.desc)}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

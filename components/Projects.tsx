"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { content } from "@/lib/content";
import { useLang } from "@/lib/LanguageContext";
import Reveal from "./ui/Reveal";
import SectionHeading from "./ui/SectionHeading";

export default function Projects() {
  const { t } = useLang();
  const p = content.projects;

  return (
    <section id="work" className="relative px-6 py-28 sm:px-10 sm:py-36 lg:px-16">
      <div className="mx-auto w-full max-w-[1600px]">
        <SectionHeading index="01" label={t(p.label)} title={t(p.heading)} sub={t(p.sub)} />

        {/* immersive full-width rows */}
        <div className="mt-10 border-t border-line">
          {p.items.map((proj, i) => (
            <Reveal key={proj.id} delay={0.04 * i}>
              <motion.article className="group relative overflow-hidden border-b border-line">
                {/* accent wash sweeps in on hover */}
                <span className="pointer-events-none absolute inset-0 origin-left scale-x-0 bg-accent/[0.04] transition-transform duration-500 ease-out group-hover:scale-x-100" />

                {/* ghost index */}
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 select-none font-display text-[6rem] font-extrabold leading-none text-ink/[0.03] transition-colors duration-500 group-hover:text-accent/[0.07] sm:text-[9rem] lg:text-[12rem]">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="relative grid grid-cols-1 gap-5 py-10 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-10 lg:py-14">
                  <div>
                    <div className="mb-4 flex items-center gap-3">
                      <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                        {t(proj.category)}
                      </span>
                      <span className="font-mono text-xs text-muted">{proj.year}</span>
                    </div>

                    <h3 className="flex items-start gap-3 font-display text-4xl font-bold leading-[0.95] tracking-tight text-ink transition-transform duration-500 group-hover:translate-x-2 sm:text-6xl lg:text-7xl">
                      <span>{t(proj.title)}</span>
                      <ArrowUpRight className="mt-2 h-7 w-7 shrink-0 text-muted transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-accent lg:h-9 lg:w-9" />
                    </h3>

                    <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                      {t(proj.desc)}
                    </p>

                    {"clients" in proj && proj.clients ? (
                      <p className="mt-3 font-mono text-xs text-ink/60">{proj.clients}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 sm:max-w-[14rem] sm:justify-end">
                    {proj.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-line bg-bg/40 px-2.5 py-1 font-mono text-[11px] text-ink/70 transition-colors group-hover:border-accent/30"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

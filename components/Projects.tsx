"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { content } from "@/lib/content";
import { useLang } from "@/lib/LanguageContext";
import Reveal from "./ui/Reveal";

export default function Projects() {
  const { t } = useLang();
  const p = content.projects;

  return (
    <section id="work" className="relative px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            {t(p.label)}
          </span>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {t(p.heading)}
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-4 max-w-xl text-muted">{t(p.sub)}</p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {p.items.map((proj, i) => (
            <Reveal key={proj.id} delay={0.06 * i}>
              <motion.article
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="group relative h-full overflow-hidden rounded-3xl border border-line bg-surface/50 p-7 transition-colors hover:border-accent/40"
              >
                {/* glow on hover */}
                <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-accent/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />

                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-3">
                      <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                        {t(proj.category)}
                      </span>
                      <span className="font-mono text-xs text-muted">{proj.year}</span>
                    </div>
                    <h3 className="font-display text-2xl font-bold tracking-tight text-ink">
                      {t(proj.title)}
                    </h3>
                  </div>
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                </div>

                <p className="relative mt-4 text-sm leading-relaxed text-muted">
                  {t(proj.desc)}
                </p>

                {"clients" in proj && proj.clients ? (
                  <p className="relative mt-3 font-mono text-xs text-ink/60">
                    {proj.clients}
                  </p>
                ) : null}

                <div className="relative mt-6 flex flex-wrap gap-2">
                  {proj.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-line bg-bg/40 px-2.5 py-1 font-mono text-[11px] text-ink/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

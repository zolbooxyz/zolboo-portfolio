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
    <section id="work" className="relative px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading index="01" label={t(p.label)} title={t(p.heading)} sub={t(p.sub)} />

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {p.items.map((proj, i) => {
            const featured = i === 0;
            return (
              <Reveal
                key={proj.id}
                delay={0.05 * i}
                className={featured ? "sm:col-span-2" : undefined}
              >
                <motion.article
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  className={`group relative h-full overflow-hidden rounded-3xl border border-line bg-surface/50 transition-colors hover:border-accent/40 ${
                    featured
                      ? "p-8 sm:flex sm:items-end sm:justify-between sm:gap-10 sm:p-10"
                      : "p-7"
                  }`}
                >
                  {/* ghost index number */}
                  <span className="pointer-events-none absolute right-5 top-3 select-none font-display text-6xl font-extrabold leading-none text-ink/[0.04] transition-colors duration-500 group-hover:text-accent/10 sm:text-7xl">
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  {/* diagonal sheen sweep on hover */}
                  <span className="pointer-events-none absolute -inset-x-1 -top-1/2 h-[200%] -translate-x-full -rotate-12 bg-gradient-to-r from-transparent via-accent/10 to-transparent opacity-0 transition-all duration-700 ease-out group-hover:translate-x-full group-hover:opacity-100" />

                  {/* corner glow */}
                  <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-accent/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" />

                  <div className="relative">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                        {t(proj.category)}
                      </span>
                      <span className="font-mono text-xs text-muted">{proj.year}</span>
                    </div>

                    <h3
                      className={`flex items-start gap-2 font-display font-bold tracking-tight text-ink ${
                        featured ? "text-3xl sm:text-4xl" : "text-2xl"
                      }`}
                    >
                      <span className="bg-gradient-to-r from-accent to-accent bg-[length:0%_2px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-500 ease-out group-hover:bg-[length:100%_2px]">
                        {t(proj.title)}
                      </span>
                      <ArrowUpRight className="mt-1 h-5 w-5 shrink-0 text-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                    </h3>

                    <p
                      className={`mt-3 text-sm leading-relaxed text-muted ${
                        featured ? "max-w-md" : ""
                      }`}
                    >
                      {t(proj.desc)}
                    </p>

                    {"clients" in proj && proj.clients ? (
                      <p className="mt-3 font-mono text-xs text-ink/60">{proj.clients}</p>
                    ) : null}
                  </div>

                  <div
                    className={`relative flex flex-wrap gap-2 ${
                      featured ? "mt-6 sm:mt-0 sm:shrink-0 sm:flex-col sm:items-end" : "mt-6"
                    }`}
                  >
                    {proj.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-line bg-bg/40 px-2.5 py-1 font-mono text-[11px] text-ink/70 transition-colors group-hover:border-accent/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

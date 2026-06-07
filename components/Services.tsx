"use client";

import { motion } from "framer-motion";
import { Code2, Workflow, Database, Sparkles } from "lucide-react";
import { content } from "@/lib/content";
import { useLang } from "@/lib/LanguageContext";
import SectionHeading from "./ui/SectionHeading";
import Reveal from "./ui/Reveal";

const icons = {
  web: Code2,
  automation: Workflow,
  saas: Database,
  design: Sparkles,
} as const;

export default function Services() {
  const { t } = useLang();
  const s = content.services;

  return (
    <section id="services" className="relative px-6 py-28 sm:px-10 sm:py-36 lg:px-16">
      <div className="mx-auto w-full max-w-[1600px]">
        <SectionHeading index="02" label={t(s.label)} title={t(s.heading)} />

        {/* editorial list — each capability is a full-width row that lights up */}
        <div className="mt-6">
          {s.items.map((svc, i) => {
            const Icon = icons[svc.id as keyof typeof icons];
            return (
              <Reveal key={svc.id} delay={0.04 * i}>
                <motion.div
                  className="group grid grid-cols-[auto_1fr] items-center gap-5 border-b border-line py-7 transition-colors sm:grid-cols-[3rem_1fr_auto] sm:gap-8"
                >
                  {/* index + icon */}
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-muted/60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="hidden h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-all duration-300 group-hover:bg-accent group-hover:text-bg group-hover:shadow-glow-sm sm:flex">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>

                  {/* title + desc */}
                  <div>
                    <h3 className="font-display text-2xl font-bold tracking-tight text-ink transition-transform duration-300 group-hover:translate-x-1 sm:text-3xl">
                      {t(svc.title)}
                    </h3>
                    <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">
                      {t(svc.desc)}
                    </p>
                  </div>

                  {/* tools */}
                  <p className="col-span-2 font-mono text-[11px] leading-relaxed text-accent/70 sm:col-span-1 sm:max-w-[12rem] sm:text-right">
                    {svc.tools}
                  </p>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

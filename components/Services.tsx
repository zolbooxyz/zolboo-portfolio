"use client";

import { motion } from "framer-motion";
import { Code2, Workflow, Database, Sparkles } from "lucide-react";
import { content } from "@/lib/content";
import { useLang } from "@/lib/LanguageContext";
import Reveal from "./ui/Reveal";
import SectionHeading from "./ui/SectionHeading";

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
    <section id="services" className="relative px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeading index="02" label={t(s.label)} title={t(s.heading)} />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {s.items.map((svc, i) => {
            const Icon = icons[svc.id as keyof typeof icons];
            return (
              <Reveal key={svc.id} delay={0.06 * i}>
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  className="group h-full rounded-3xl border border-line bg-surface/50 p-6 transition-colors hover:border-accent/40"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-all duration-300 group-hover:bg-accent group-hover:text-bg group-hover:shadow-glow-sm">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-bold tracking-tight text-ink">
                    {t(svc.title)}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted">{t(svc.desc)}</p>
                  <p className="mt-5 font-mono text-[11px] leading-relaxed text-accent/80">
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

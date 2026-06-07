"use client";

import { GraduationCap, Rocket } from "lucide-react";
import { content } from "@/lib/content";
import { useLang } from "@/lib/LanguageContext";
import Reveal from "./ui/Reveal";

export default function About() {
  const { t } = useLang();
  const a = content.about;

  return (
    <section className="relative px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 md:grid-cols-[1fr_1.4fr] md:gap-16">
          <Reveal>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
              {t(a.label)}
            </span>
          </Reveal>

          <div className="space-y-10">
            <Reveal delay={0.05}>
              <p className="text-xl leading-relaxed text-ink/90 sm:text-2xl">
                {t(a.body)}
              </p>
            </Reveal>

            <div className="grid gap-5 sm:grid-cols-2">
              <Reveal delay={0.1}>
                <div className="rounded-2xl border border-line bg-surface/50 p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="font-mono text-xs uppercase tracking-wider text-muted">
                    {t(a.eduLabel)}
                  </div>
                  <div className="mt-1.5 text-sm leading-relaxed text-ink/90">{t(a.edu)}</div>
                </div>
              </Reveal>

              <Reveal delay={0.16}>
                <div className="rounded-2xl border border-line bg-surface/50 p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Rocket className="h-5 w-5" />
                  </div>
                  <div className="font-mono text-xs uppercase tracking-wider text-muted">
                    {t(a.nowLabel)}
                  </div>
                  <div className="mt-1.5 text-sm leading-relaxed text-ink/90">{t(a.now)}</div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

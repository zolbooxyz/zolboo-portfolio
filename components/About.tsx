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
            <div className="md:sticky md:top-28">
              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-muted/70">00</span>
                <span className="h-px w-8 bg-accent/60" />
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                  {t(a.label)}
                </span>
              </div>

              {/* monogram */}
              <div className="mt-6 flex h-28 w-28 items-center justify-center rounded-3xl border border-line bg-surface/50">
                <span className="font-display text-6xl font-extrabold leading-none text-grad">
                  Z
                </span>
              </div>

              {/* availability */}
              <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/60 px-4 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                </span>
                <span className="font-mono text-[11px] tracking-wide text-muted">
                  {t(content.hero.status)}
                </span>
              </div>
            </div>
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

"use client";

import { ReactNode } from "react";
import Reveal from "./Reveal";

/**
 * Editorial section header: a monospace index (e.g. "01"), an accent-bar
 * kicker label, the display title, and an animated divider rule.
 */
export default function SectionHeading({
  index,
  label,
  title,
  sub,
}: {
  index: string;
  label: string;
  title: string;
  sub?: ReactNode;
}) {
  return (
    <div>
      <Reveal>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-muted/70">{index}</span>
          <span className="h-px w-8 bg-accent/60" />
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            {label}
          </span>
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <h2 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          {title}
        </h2>
      </Reveal>

      {sub ? (
        <Reveal delay={0.12}>
          <p className="mt-4 max-w-xl text-muted">{sub}</p>
        </Reveal>
      ) : null}

      <Reveal delay={0.16}>
        <div className="mt-8 h-px w-full origin-left bg-gradient-to-r from-line via-line to-transparent" />
      </Reveal>
    </div>
  );
}

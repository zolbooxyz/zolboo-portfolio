"use client";

import { motion } from "framer-motion";
import { ArrowDown, MapPin } from "lucide-react";
import { content } from "@/lib/content";
import { useLang } from "@/lib/LanguageContext";
import dynamic from "next/dynamic";
import Magnetic from "@/components/ui/Magnetic";

// R3F touches React internals that don't exist during SSR — load client-only.
const HeroCanvas = dynamic(() => import("@/components/HeroCanvas"), { ssr: false });

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

export default function Hero() {
  const { t } = useLang();
  const h = content.hero;

  return (
    <section id="top" className="relative flex min-h-[100svh] items-center px-6 pt-24 sm:px-10 lg:px-16">
      {/* WebGL form, offset to the right so it sits behind/beside the copy */}
      <div className="absolute inset-y-0 right-0 w-full md:w-[60%]">
        <HeroCanvas />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="pointer-events-none relative z-10 mx-auto w-full max-w-[1600px]"
      >
        {/* status */}
        <motion.div variants={item} className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/60 px-4 py-1.5 backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <span className="font-mono text-xs tracking-wide text-muted">{t(h.status)}</span>
        </motion.div>

        {/* greeting */}
        <motion.p
          variants={item}
          className="mb-3 font-display text-xl font-medium text-muted sm:text-2xl"
        >
          {t(h.greeting)}
        </motion.p>

        {/* name */}
        <motion.h1
          variants={item}
          className="font-display text-[clamp(3.5rem,12vw,9rem)] font-extrabold leading-[0.92] tracking-tight"
        >
          <span className="text-grad">{h.name}</span>
          <span className="text-accent text-glow">.</span>
        </motion.h1>

        {/* role */}
        <motion.p
          variants={item}
          className="mt-4 font-mono text-base tracking-tight text-accent sm:text-xl"
        >
          {t(h.role)}
        </motion.p>

        {/* tagline */}
        <motion.p
          variants={item}
          className="mt-6 max-w-xl text-lg leading-relaxed text-muted sm:text-xl"
        >
          {t(h.tagline)}
        </motion.p>

        {/* CTAs */}
        <motion.div variants={item} className="pointer-events-auto mt-10 flex flex-wrap items-center gap-4">
          <Magnetic>
            <a
              href="#work"
              className="group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-medium text-bg transition-transform hover:-translate-y-0.5 hover:shadow-glow"
            >
              {t(h.ctaWork)}
              <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
            </a>
          </Magnetic>
          <Magnetic strength={0.3}>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 font-medium text-ink transition-colors hover:border-accent/50 hover:text-accent"
            >
              {t(h.ctaContact)}
            </a>
          </Magnetic>
        </motion.div>

        {/* location */}
        <motion.div variants={item} className="mt-12 flex items-center gap-2 font-mono text-xs text-muted">
          <MapPin className="h-3.5 w-3.5 text-accent" />
          {t(h.location)}
        </motion.div>

        {/* interactive hint */}
        <motion.div
          variants={item}
          className="mt-4 font-mono text-[11px] tracking-wide text-accent/70 md:hidden lg:block"
        >
          <span className="animate-pulseGlow">{t(h.hint)}</span>
        </motion.div>
      </motion.div>
    </section>
  );
}

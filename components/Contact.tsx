"use client";

import { motion } from "framer-motion";
import { Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import { content } from "@/lib/content";
import { useLang } from "@/lib/LanguageContext";
import Reveal from "./ui/Reveal";

export default function Contact() {
  const { t } = useLang();
  const c = content.contact;

  const cards = [
    {
      icon: Mail,
      label: t(c.emailLabel),
      value: c.email,
      href: `mailto:${c.email}`,
    },
    {
      icon: Phone,
      label: t(c.phoneLabel),
      value: c.phone,
      href: `tel:${c.phoneRaw}`,
    },
    {
      icon: MapPin,
      label: t(c.locationLabel),
      value: t(c.location),
      href: null,
    },
  ];

  return (
    <section id="contact" className="relative px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-[2rem] border border-line bg-surface/40 p-8 sm:p-14">
          {/* glow */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

          <Reveal>
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
              {t(c.label)}
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-4 max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              <span className="text-grad">{t(c.heading)}</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-md text-muted">{t(c.sub)}</p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {cards.map((card, i) => {
              const Icon = card.icon;
              const inner = (
                <motion.div
                  whileHover={card.href ? { y: -4 } : undefined}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  className={`group flex h-full items-start justify-between gap-3 rounded-2xl border border-line bg-bg/40 p-5 ${
                    card.href ? "transition-colors hover:border-accent/40" : ""
                  }`}
                >
                  <div>
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="font-mono text-[11px] uppercase tracking-wider text-muted">
                      {card.label}
                    </div>
                    <div className="mt-1 break-all text-sm text-ink">{card.value}</div>
                  </div>
                  {card.href ? (
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
                  ) : null}
                </motion.div>
              );
              return (
                <Reveal key={card.label} delay={0.06 * i}>
                  {card.href ? (
                    <a href={card.href} className="block h-full">
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

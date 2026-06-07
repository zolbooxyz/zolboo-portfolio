"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { content } from "@/lib/content";
import { useLang } from "@/lib/LanguageContext";

const links = [
  { id: "work", href: "#work" },
  { id: "journey", href: "#journey" },
  { id: "contact", href: "#contact" },
] as const;

export default function Nav() {
  const { lang, toggle, t } = useLang();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-line bg-bg/80 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <a href="#top" className="group flex items-center gap-2">
          <span className="font-display text-lg font-extrabold tracking-tight text-ink">
            Zolboo
          </span>
          <span className="h-2 w-2 animate-pulseGlow rounded-full bg-accent shadow-glow-sm" />
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <a
              key={l.id}
              href={l.href}
              className="link-underline text-sm lowercase text-muted transition-colors hover:text-ink"
            >
              {t(content.nav[l.id])}
            </a>
          ))}
        </div>

        <button
          onClick={toggle}
          aria-label="Toggle language"
          className="group relative flex items-center gap-1 rounded-full border border-line bg-surface px-1 py-1 font-mono text-xs"
        >
          <span
            className={`rounded-full px-2.5 py-1 transition-colors ${
              lang === "mn" ? "bg-accent text-bg" : "text-muted"
            }`}
          >
            MN
          </span>
          <span
            className={`rounded-full px-2.5 py-1 transition-colors ${
              lang === "en" ? "bg-accent text-bg" : "text-muted"
            }`}
          >
            EN
          </span>
        </button>
      </nav>
    </motion.header>
  );
}

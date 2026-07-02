"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useLang } from "@/lib/LanguageContext";
import { content } from "@/lib/content";
import ProjectShot from "@/components/ProjectShot";

export type Project = (typeof content.projects.items)[number];

const item = {
  hidden: { opacity: 0, y: 12, filter: "blur(5px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

/** Full-screen detail for a single project — opens when its carousel card is tapped. */
export default function ProjectDetail({ project, onClose }: { project: Project; onClose: () => void }) {
  const { t } = useLang();
  const clients = "clients" in project ? project.clients : undefined;
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  // portal to <body> so the modal sits above the whole stage (nav, HUD, etc.)
  // instead of being trapped inside the carousel's z-8 stacking context
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(project.title)}
      className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center px-6"
    >
      <motion.button
        aria-label="Close"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-h-[86vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-surface/80 shadow-[0_20px_60px_-22px_rgba(0,0,0,0.7),0_0_50px_-18px_rgba(45,230,230,0.3)] backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-bg/40 font-mono text-xs text-muted backdrop-blur transition-colors hover:border-accent/40 hover:text-accent"
        >
          ✕
        </button>

        {/* hero screenshot */}
        <ProjectShot id={project.id} title={project.title} className="aspect-[16/9] w-full" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } } }}
          className="p-7 sm:p-8"
        >
          <motion.div variants={item} className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-accent/90">
            <span>{t(project.category)}</span>
            <span className="text-muted/70">{project.year}</span>
          </motion.div>
          <motion.h2 variants={item} className="mt-2 font-display text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-3xl">
            {t(project.title)}
          </motion.h2>
          <motion.div variants={item} className="mt-3 h-px w-12 bg-gradient-to-r from-accent to-transparent" />
          <motion.p variants={item} className="mt-4 text-[15px] leading-relaxed text-muted">
            {t(project.desc)}
          </motion.p>

          {clients ? (
            <motion.div variants={item} className="mt-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted/60">Clients</div>
              <div className="mt-1 font-mono text-[12px] text-accent/80">{clients}</div>
            </motion.div>
          ) : null}

          <motion.div variants={item} className="mt-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted/60">Stack</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {project.tags.map((tag) => (
                <span key={tag} className="rounded border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted/80">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>,
    document.body
  );
}

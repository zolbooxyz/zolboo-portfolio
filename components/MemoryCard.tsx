"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useLang } from "@/lib/LanguageContext";
import { content } from "@/lib/content";
import ScrambleText from "@/components/ScrambleText";
import type { Memory } from "@/lib/memories";

const cardItem = {
  hidden: { opacity: 0, y: 12, filter: "blur(5px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function MemoryCard({ memory, onClose }: { memory: Memory; onClose: () => void }) {
  const { t } = useLang();
  const m = content.memories;
  const date = new Date(memory.createdAt).toLocaleDateString();

  // close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={memory.nickname}
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center px-6"
    >
      <motion.button
        aria-label={t(m.close)}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-black/10"
      />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-white/[0.015] p-8 shadow-[0_20px_60px_-22px_rgba(0,0,0,0.6),0_0_50px_-18px_rgba(45,230,230,0.3),inset_0_1px_0_0_rgba(255,255,255,0.12)] backdrop-blur-md backdrop-saturate-150"
      >
        {/* frosted-glass sheen + accent top edge */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ background: "radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.10), transparent 55%)" }}
        />
        <button
          onClick={onClose}
          aria-label={t(m.close)}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 font-mono text-xs text-muted transition-colors hover:border-accent/40 hover:text-accent"
        >
          ✕
        </button>
        {/* nickname + message, staggered in */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.09, delayChildren: 0.2 } } }}
        >
          <motion.div variants={cardItem} className="font-mono text-[10px] tracking-[0.5em] text-accent/40">] [ &nbsp; ] [</motion.div>
          <motion.h2 variants={cardItem} className="mt-2 font-mono text-2xl font-medium tracking-[0.15em] text-accent text-glow">
            <ScrambleText text={memory.nickname} speed={40} />
          </motion.h2>
          <motion.p variants={cardItem} className="mt-6 whitespace-pre-wrap font-mono text-sm leading-relaxed text-ink/85">
            <ScrambleText text={memory.comment} speed={9} />
          </motion.p>
          <motion.div variants={cardItem} className="mt-7 font-mono text-[10px] uppercase tracking-wider text-muted/60"><ScrambleText text={date} speed={20} /></motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

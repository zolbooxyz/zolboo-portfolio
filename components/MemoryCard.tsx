"use client";

import { useLang } from "@/lib/LanguageContext";
import { content } from "@/lib/content";
import type { Memory } from "@/lib/memories";

export default function MemoryCard({ memory, onClose }: { memory: Memory; onClose: () => void }) {
  const { t } = useLang();
  const m = content.memories;
  const date = new Date(memory.createdAt).toLocaleDateString();

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center px-6">
      <button aria-label={t(m.close)} onClick={onClose} className="absolute inset-0 bg-black/30" />
      <div className="relative w-full max-w-md rounded-2xl border border-accent/25 bg-surface/55 p-8 shadow-[0_0_70px_-14px_rgba(45,230,230,0.4)] backdrop-blur-xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 font-mono text-xs text-muted transition-colors hover:text-accent"
        >
          ✕
        </button>
        {/* wireframe-matching bracket chrome + nickname */}
        <div className="font-mono text-[10px] tracking-[0.5em] text-accent/40">] [ &nbsp; ] [</div>
        <h2 className="mt-2 font-mono text-2xl font-medium tracking-[0.15em] text-accent text-glow">
          {memory.nickname}
        </h2>
        <p className="mt-6 whitespace-pre-wrap font-mono text-sm leading-relaxed text-ink/85">
          {memory.comment}
        </p>
        <div className="mt-7 font-mono text-[10px] uppercase tracking-wider text-muted/60">{date}</div>
      </div>
    </div>
  );
}

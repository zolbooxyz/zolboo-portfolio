"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLang } from "@/lib/LanguageContext";
import { content } from "@/lib/content";
import { sfx } from "@/lib/sound";
import ScrambleText from "@/components/ScrambleText";

type Props = {
  open: boolean;
  onClose: () => void;
  /** returns true on success */
  onSubmit: (fields: { nickname: string; phone: string; comment: string }) => Promise<boolean>;
};

export default function MemoryForm({ open, onClose, onSubmit }: Props) {
  const { t } = useLang();
  const m = content.memories;
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // close on Escape; focus the first field when the form opens
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const id = window.setTimeout(() => firstFieldRef.current?.focus(), 350);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
    };
  }, [open, onClose]);

  if (!open) return null;

  const valid = nickname.trim().length > 0 && comment.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || status === "sending") return;
    setStatus("sending");
    const ok = await onSubmit({ nickname: nickname.trim(), phone: phone.trim(), comment: comment.trim() });
    if (ok) {
      setStatus("ok");
      sfx.play("confirm");
      setTimeout(() => {
        setNickname("");
        setPhone("");
        setComment("");
        setStatus("idle");
        onClose();
      }, 1500);
    } else {
      setStatus("error");
      sfx.play("error");
    }
  };

  const close = () => {
    sfx.play("close");
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(m.formTitle)}
      className="pointer-events-auto absolute inset-0 z-[60] flex items-end justify-center px-0 pb-0 sm:px-5 sm:pb-10"
    >
      {/* dim, blurred backdrop */}
      <motion.button
        aria-label={t(m.close)}
        onClick={close}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0 bg-bg/40"
      />

      {/* glass card — a bottom sheet that slides up */}
      <motion.form
        onSubmit={submit}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/15 bg-white/[0.02] p-8 shadow-[0_-20px_80px_-20px_rgba(0,0,0,0.8),0_0_60px_-18px_rgba(45,230,230,0.35),inset_0_1px_0_0_rgba(255,255,255,0.12)] backdrop-blur-md backdrop-saturate-150 sm:rounded-3xl sm:p-10"
      >
        {/* grab handle — signals the slide-up sheet */}
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
        {/* glass sheen + accent top edge */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
        <div
          className="pointer-events-none absolute inset-0 rounded-t-3xl sm:rounded-3xl"
          style={{ background: "radial-gradient(120% 80% at 50% -10%, rgba(45,230,230,0.10), transparent 60%)" }}
        />

        <button
          type="button"
          onClick={close}
          onPointerEnter={() => sfx.play("hover")}
          className="absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 font-mono text-xs text-muted transition-colors hover:border-accent/40 hover:text-accent"
        >
          ✕
        </button>

        <div className={`relative ${status === "error" ? "animate-shake" : ""}`}>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-accent/80">
            <span className="h-1.5 w-1.5 animate-pulseGlow rounded-full bg-accent" />
            <ScrambleText text={t(m.formEyebrow)} speed={26} />
          </div>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            <ScrambleText text={t(m.formTitle)} speed={40} />
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{t(m.formIntro)}</p>

          <div className="mt-7 space-y-4">
            <Field label={t(m.nickname)}>
              <input
                ref={firstFieldRef}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={40}
                placeholder={t(m.nicknamePh)}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-muted/50 focus:border-accent/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-accent/25 focus:shadow-[0_0_24px_-8px_rgba(45,230,230,0.6)]"
              />
            </Field>

            <Field label={t(m.phone)} note={t(m.phoneNote)}>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                maxLength={30}
                placeholder={t(m.phonePh)}
                className="w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-muted/50 focus:border-accent/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-accent/25 focus:shadow-[0_0_24px_-8px_rgba(45,230,230,0.6)]"
              />
            </Field>

            <Field label={t(m.comment)}>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder={t(m.commentPh)}
                className="w-full resize-none rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm leading-relaxed text-ink outline-none transition-all placeholder:text-muted/50 focus:border-accent/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-accent/25 focus:shadow-[0_0_24px_-8px_rgba(45,230,230,0.6)]"
              />
            </Field>
          </div>

          {status === "error" && <p className="mt-3 text-xs text-red-400">{t(m.error)}</p>}
          {status === "ok" && (
            <p className="mt-3 flex items-center gap-2 text-xs text-accent">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path className="draw-check" d="M4 12.5l5 5L20 6.5" />
              </svg>
              {t(m.success)}
            </p>
          )}

          <button
            type="submit"
            disabled={!valid || status === "sending"}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-bg transition-all hover:shadow-[0_0_30px_-6px_rgba(45,230,230,0.7)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          >
            {status === "sending" && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-[1.5px] border-bg/30 border-t-bg" />
            )}
            {status === "sending" ? t(m.submitting) : t(m.submit)}
          </button>
        </div>
      </motion.form>
    </div>
  );
}

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">{label}</span>
        {note && <span className="font-mono text-[10px] text-muted/50">{note}</span>}
      </span>
      {children}
    </label>
  );
}

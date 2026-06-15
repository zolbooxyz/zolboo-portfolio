"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useLang } from "@/lib/LanguageContext";
import { content } from "@/lib/content";

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

  if (!open) return null;

  const valid = nickname.trim().length > 0 && comment.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || status === "sending") return;
    setStatus("sending");
    const ok = await onSubmit({ nickname: nickname.trim(), phone: phone.trim(), comment: comment.trim() });
    if (ok) {
      setStatus("ok");
      setTimeout(() => {
        setNickname("");
        setPhone("");
        setComment("");
        setStatus("idle");
        onClose();
      }, 1500);
    } else {
      setStatus("error");
    }
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center px-5">
      {/* dim, blurred backdrop */}
      <motion.button
        aria-label={t(m.close)}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0 bg-bg/70 backdrop-blur-md"
      />

      {/* premium glass card */}
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 22, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8),0_0_60px_-18px_rgba(45,230,230,0.4)] backdrop-blur-2xl sm:p-10"
      >
        {/* glass sheen + accent top edge */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent" />
        <div
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{ background: "radial-gradient(120% 80% at 50% -10%, rgba(45,230,230,0.10), transparent 60%)" }}
        />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 font-mono text-xs text-muted transition-colors hover:border-accent/40 hover:text-accent"
        >
          ✕
        </button>

        <div className="relative">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.4em] text-accent/80">
            <span className="h-1.5 w-1.5 animate-pulseGlow rounded-full bg-accent" />
            {t(m.formEyebrow)}
          </div>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {t(m.formTitle)}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{t(m.formIntro)}</p>

          <div className="mt-7 space-y-4">
            <Field label={t(m.nickname)}>
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={40}
                placeholder={t(m.nicknamePh)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/50 focus:border-accent/60 focus:bg-white/[0.05]"
              />
            </Field>

            <Field label={t(m.phone)} note={t(m.phoneNote)}>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                maxLength={30}
                placeholder={t(m.phonePh)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/50 focus:border-accent/60 focus:bg-white/[0.05]"
              />
            </Field>

            <Field label={t(m.comment)}>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder={t(m.commentPh)}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-muted/50 focus:border-accent/60 focus:bg-white/[0.05]"
              />
            </Field>
          </div>

          {status === "error" && <p className="mt-3 text-xs text-red-400">{t(m.error)}</p>}
          {status === "ok" && <p className="mt-3 text-xs text-accent">{t(m.success)}</p>}

          <button
            type="submit"
            disabled={!valid || status === "sending"}
            className="mt-7 w-full rounded-xl bg-accent py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-bg transition-all hover:shadow-[0_0_30px_-6px_rgba(45,230,230,0.7)] disabled:cursor-not-allowed disabled:opacity-40"
          >
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

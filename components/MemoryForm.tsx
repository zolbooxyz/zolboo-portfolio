"use client";

import { useState } from "react";
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
      }, 1400);
    } else {
      setStatus("error");
    }
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center px-6">
      {/* dim backdrop */}
      <button
        aria-label={t(m.close)}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      {/* glass card */}
      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-2xl border border-accent/25 bg-surface/60 p-7 shadow-[0_0_60px_-12px_rgba(45,230,230,0.35)] backdrop-blur-xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 font-mono text-xs text-muted transition-colors hover:text-accent"
        >
          ✕
        </button>

        <h2 className="font-mono text-lg font-medium uppercase tracking-[0.2em] text-accent text-glow">
          {t(m.formTitle)}
        </h2>
        <p className="mt-2 max-w-xs font-mono text-xs leading-relaxed text-muted">{t(m.formSub)}</p>

        <div className="mt-6 space-y-4">
          <Field label={t(m.nickname)}>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={40}
              placeholder={t(m.nicknamePh)}
              className="w-full rounded-lg border border-line bg-bg/50 px-3 py-2.5 font-mono text-sm text-ink outline-none transition-colors placeholder:text-muted/50 focus:border-accent/60"
            />
          </Field>

          <Field label={t(m.phone)} note={t(m.phoneNote)}>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              maxLength={30}
              placeholder={t(m.phonePh)}
              className="w-full rounded-lg border border-line bg-bg/50 px-3 py-2.5 font-mono text-sm text-ink outline-none transition-colors placeholder:text-muted/50 focus:border-accent/60"
            />
          </Field>

          <Field label={t(m.comment)}>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder={t(m.commentPh)}
              className="w-full resize-none rounded-lg border border-line bg-bg/50 px-3 py-2.5 font-mono text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-muted/50 focus:border-accent/60"
            />
          </Field>
        </div>

        {status === "error" && (
          <p className="mt-3 font-mono text-xs text-red-400">{t(m.error)}</p>
        )}
        {status === "ok" && (
          <p className="mt-3 font-mono text-xs text-accent">{t(m.success)}</p>
        )}

        <button
          type="submit"
          disabled={!valid || status === "sending"}
          className="mt-6 w-full rounded-lg bg-accent py-3 font-mono text-sm font-medium uppercase tracking-[0.18em] text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "sending" ? t(m.submitting) : t(m.submit)}
        </button>
      </form>
    </div>
  );
}

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent/70">{label}</span>
        {note && <span className="font-mono text-[10px] text-muted/60">{note}</span>}
      </span>
      {children}
    </label>
  );
}

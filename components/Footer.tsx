"use client";

import { content } from "@/lib/content";
import { useLang } from "@/lib/LanguageContext";

export default function Footer() {
  const { t } = useLang();
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-line px-5 py-10 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="font-display text-base font-extrabold tracking-tight text-ink">
            Zolboo
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        </div>
        <div className="font-mono text-xs text-muted">
          © {year} Zolboo. {t(content.footer.rights)}
        </div>
        <div className="font-mono text-xs text-muted">{t(content.footer.built)}</div>
      </div>
    </footer>
  );
}

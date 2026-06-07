"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Lang } from "./content";

type LangCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  /** pick the right string from a {mn,en} object, or pass a plain string through */
  t: (value: { mn: string; en: string } | string) => string;
};

const Ctx = createContext<LangCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("mn");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem("lang") as Lang | null) : null;
    if (saved === "mn" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const toggle = () => setLang(lang === "mn" ? "en" : "mn");

  const t = (value: { mn: string; en: string } | string) =>
    typeof value === "string" ? value : value[lang];

  return <Ctx.Provider value={{ lang, setLang, toggle, t }}>{children}</Ctx.Provider>;
}

export function useLang() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}

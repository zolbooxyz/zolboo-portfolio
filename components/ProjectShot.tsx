"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/LanguageContext";

type LangText = { mn: string; en: string } | string;

// Project screenshot with a fallback. Drop public/projects/<id>.jpg and it shows
// up; otherwise a placeholder (gradient + grid + initial) renders instead.
export default function ProjectShot({
  id,
  title,
  category,
  className = "",
}: {
  id: string;
  title: LangText;
  category: LangText;
  className?: string;
}) {
  const { t } = useLang();
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const src = `/projects/${id}.jpg`;

  // a 404 often fires its error event before React attaches onError (the image
  // resolves during the first paint), so re-check on mount: complete + zero
  // natural size means it failed and we should fall back to the placeholder.
  useEffect(() => {
    const im = imgRef.current;
    if (im && im.complete && im.naturalWidth === 0) setFailed(true);
  }, []);
  const titleStr = t(title);
  const initial = titleStr.trim().charAt(0).toUpperCase();

  return (
    <div className={`relative overflow-hidden bg-bg-2 ${className}`}>
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={src}
          alt={titleStr}
          onError={() => setFailed(true)}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth === 0) setFailed(true);
          }}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-2 via-bg-2 to-bg">
          {/* faint cyber grid */}
          <div
            className="absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(45,230,230,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(45,230,230,0.10) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          {/* big watermark initial */}
          <span className="font-display text-7xl font-extrabold text-accent/15">{initial}</span>
          {/* category tag, bottom-left */}
          <span className="absolute bottom-2 left-3 font-mono text-[9px] uppercase tracking-[0.2em] text-accent/60">
            {t(category)}
          </span>
        </div>
      )}
      {/* subtle top sheen so text above reads on any screenshot */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/30 via-transparent to-transparent" />
    </div>
  );
}

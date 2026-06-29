"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/LanguageContext";

type LangText = { mn: string; en: string } | string;

// Project screenshot with a fallback. Drop public/projects/<id>.jpg and it shows
// up; otherwise an intentional BRANDED cover renders instead — a monogram tile on
// a cyber grid, designed to read as cover art rather than a "missing image".
export default function ProjectShot({
  id,
  title,
  className = "",
}: {
  id: string;
  title: LangText;
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
        // branded cover — monogram tile floating on a cyan lattice
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(120%_120%_at_50%_0%,#16202c_0%,#0b1018_55%,#070b11_100%)]">
          {/* cyber grid, fading toward the bottom so it never fights the card text */}
          <div
            className="absolute inset-0 opacity-60 [mask-image:radial-gradient(120%_100%_at_50%_30%,#000_30%,transparent_85%)]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(45,230,230,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(45,230,230,0.10) 1px, transparent 1px)",
              backgroundSize: "26px 26px",
            }}
          />
          {/* soft accent bloom behind the tile */}
          <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl" />

          {/* monogram tile — looks like a product app-icon */}
          <div className="relative grid h-[34%] aspect-square place-items-center rounded-[22%] border border-accent/30 bg-gradient-to-br from-surface-2/90 to-bg/80 shadow-[0_0_40px_-8px_rgba(45,230,230,0.5)] backdrop-blur-sm">
            <span className="font-display text-[clamp(1.6rem,6vw,2.6rem)] font-extrabold leading-none text-accent">
              {initial}
            </span>
            {/* inner highlight ring */}
            <div className="pointer-events-none absolute inset-0 rounded-[22%] ring-1 ring-inset ring-white/10" />
          </div>

          {/* corner HUD ticks */}
          <span className="absolute left-3 top-3 h-3 w-3 border-l border-t border-accent/40" />
          <span className="absolute right-3 top-3 h-3 w-3 border-r border-t border-accent/40" />
          <span className="absolute bottom-3 left-3 h-3 w-3 border-b border-l border-accent/40" />
          <span className="absolute bottom-3 right-3 h-3 w-3 border-b border-r border-accent/40" />
        </div>
      )}
      {/* subtle top sheen so text above reads on any screenshot */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/30 via-transparent to-transparent" />
    </div>
  );
}

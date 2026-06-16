"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { sfx } from "@/lib/sound";

export default function SoundToggle({ className = "" }: { className?: string }) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    sfx.loadPref();
    setMuted(sfx.muted);
    // unlock the audio context on the first user gesture anywhere
    const unlock = () => sfx.init();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const toggle = () => {
    const next = !muted;
    sfx.setMuted(next);
    setMuted(next);
    if (!next) {
      sfx.init();
      sfx.play("toggle");
    }
  };

  return (
    <button
      onClick={toggle}
      onPointerEnter={() => sfx.play("hover")}
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      aria-pressed={!muted}
      className={`pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface/70 text-muted backdrop-blur transition-colors hover:border-accent/40 hover:text-accent ${
        !muted ? "text-accent" : ""
      } ${className}`}
    >
      {muted ? <VolumeX size={14} strokeWidth={2} /> : <Volume2 size={14} strokeWidth={2} />}
    </button>
  );
}

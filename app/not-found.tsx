import Link from "next/link";
import Logo from "@/components/Logo";

// in-world 404 — the "sector not found" screen, styled like the HUD/boot log
// so a dead link never drops the visitor out of the experience.
export default function NotFound() {
  return (
    <div className="grid-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg px-6 text-center">
      {/* corner brackets — same framing language as the stage */}
      <span className="pointer-events-none absolute left-5 top-5 h-7 w-7 border-l border-t border-accent/40" />
      <span className="pointer-events-none absolute right-5 top-5 h-7 w-7 border-r border-t border-accent/40" />
      <span className="pointer-events-none absolute bottom-5 left-5 h-7 w-7 border-b border-l border-accent/40" />
      <span className="pointer-events-none absolute bottom-5 right-5 h-7 w-7 border-b border-r border-accent/40" />

      {/* soft accent pool behind the readout */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(45,230,230,0.08), rgba(180,74,255,0.04) 55%, transparent 70%)" }}
      />

      <div className="relative">
        <div className="font-mono text-[10px] uppercase tracking-[0.45em] text-accent/70">
          ✦ SECTOR NOT FOUND
        </div>
        <div className="mt-4 font-display text-[clamp(4rem,16vw,9rem)] font-extrabold leading-none tracking-tight text-ink">
          4<span className="text-accent text-glow">0</span>4
        </div>
        <p className="mx-auto mt-5 max-w-sm text-[15px] leading-relaxed text-muted">
          Энэ хуудас олдсонгүй — таны хайсан сектор энэ ертөнцөд байхгүй байна.
          <br />
          <span className="text-muted/70">This page doesn&apos;t exist in this world.</span>
        </p>
        <div className="mt-8 flex items-center justify-center">
          <Link
            href="/"
            className="rounded-full border border-accent/60 bg-accent/10 px-7 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.24em] text-accent shadow-glow-sm transition-all duration-300 ease-reveal hover:border-accent hover:bg-accent/20 hover:text-ink"
          >
            ← Return to base
          </Link>
        </div>
        <div className="mt-12">
          <Logo className="text-lg opacity-70" />
        </div>
      </div>
    </div>
  );
}

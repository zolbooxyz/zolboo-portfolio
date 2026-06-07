"use client";

const items = [
  "Next.js",
  "React",
  "TypeScript",
  "Tailwind CSS",
  "Framer Motion",
  "GSAP",
  "Three.js",
  "Supabase",
  "PostgreSQL",
  "n8n",
  "Make.com",
  "ManyChat",
  "Claude API",
  "Figma",
];

export default function Marquee() {
  // Two identical halves animate left by 50% for a seamless loop.
  const row = [...items, ...items];

  return (
    <section
      aria-hidden
      className="relative overflow-hidden border-y border-line py-5"
    >
      {/* edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-bg to-transparent" />

      <div className="flex w-max animate-marquee items-center gap-10">
        {row.map((item, i) => (
          <div key={i} className="flex items-center gap-10">
            <span className="font-display text-lg font-semibold tracking-tight text-ink/70 sm:text-xl">
              {item}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-accent/50" />
          </div>
        ))}
      </div>
    </section>
  );
}

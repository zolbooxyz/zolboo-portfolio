/**
 * The unified brand mark — the "zolboo.xyz" signature wordmark used everywhere
 * (nav, loader, finale). Italic display type with the cyan ".xyz" accent.
 * Size is set by the caller via `className` (e.g. "text-xl", "text-7xl").
 */
export default function Logo({
  className = "",
  glow = false,
}: {
  className?: string;
  glow?: boolean;
}) {
  return (
    <span
      className={`font-logo font-extrabold italic tracking-tight text-ink ${className}`}
      style={glow ? { textShadow: "0 0 40px rgba(45,230,230,0.42)" } : undefined}
    >
      zolboo<span className="text-accent">.xyz</span>
    </span>
  );
}

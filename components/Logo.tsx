// brand wordmark used across the site (nav, loader, finale). size comes from the
// caller's className.
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

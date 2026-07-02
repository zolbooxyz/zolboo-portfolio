import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // IRIDESCENT OBSIDIAN palette — cyan is the SIGNAL colour (interactive /
      // live), iris is the MATERIAL colour (gradients, glows — never solid),
      // accent-deep carries any large cyan surface so big areas never clip.
      colors: {
        void: "#050608",
        bg: "#0A0E14",
        "bg-2": "#0D131C",
        surface: "#111722",
        "surface-2": "#16202C",
        line: "rgba(232,238,245,0.08)",
        ink: "#EDF2F7",
        muted: "#8A95A5",
        accent: "#2DE6E6",
        "accent-2": "#15B8C9",
        "accent-deep": "#0E6F80",
        iris: "#B44AFF",
        halation: "#9BFBF3",
      },
      fontFamily: {
        display: ["var(--font-unbounded)", "sans-serif"], // Unbounded — hero, chapter heads, project titles
        body: ["var(--font-sans)", "sans-serif"], // Onest — everything a human reads
        logo: ["var(--font-logo)", "sans-serif"], // Syne — brand logo only
        mono: ["var(--font-mono)", "monospace"], // JetBrains Mono — telemetry only
      },
      // motion vocabulary — use these three everywhere instead of one-offs
      transitionTimingFunction: {
        reveal: "cubic-bezier(0.16, 1, 0.3, 1)", // entrances, staggered UI (0.7s)
        cinema: "cubic-bezier(0.7, 0, 0.3, 1)", // veils, chapter transitions (1.2s)
        snap: "cubic-bezier(0.34, 1.56, 0.64, 1)", // micro-interactions (0.45s)
      },
      boxShadow: {
        // tiered glow: hot halation core → accent falloff (never one flat cyan)
        glow: "0 0 0 1px rgba(45,230,230,0.22), 0 0 16px -4px rgba(155,251,243,0.45), 0 0 42px -10px rgba(45,230,230,0.5)",
        "glow-sm": "0 0 10px -3px rgba(155,251,243,0.4), 0 0 22px -6px rgba(45,230,230,0.45)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.9" },
        },
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        pulseGlow: "pulseGlow 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;

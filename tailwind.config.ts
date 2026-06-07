import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#07090D",
        "bg-2": "#0B0F15",
        surface: "#0F141B",
        "surface-2": "#141C26",
        line: "rgba(255,255,255,0.08)",
        ink: "#E8EEF5",
        muted: "#8A95A5",
        accent: "#2DE6E6",
        "accent-2": "#15B8C9",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(45,230,230,0.25), 0 0 30px -8px rgba(45,230,230,0.45)",
        "glow-sm": "0 0 18px -6px rgba(45,230,230,0.5)",
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

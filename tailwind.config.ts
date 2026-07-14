import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark-first palette. Night-binge friendly.
        bg: {
          DEFAULT: "#0a0a0f",
          soft: "#12121a",
          card: "#181822",
          elevated: "#20202e",
        },
        line: "#2a2a3a",
        ink: {
          DEFAULT: "#f4f4f8",
          soft: "#b8b8c8",
          faint: "#7a7a90",
        },
        coin: {
          DEFAULT: "#ffcc4d",
          deep: "#f5a623",
          shadow: "#8a5a00",
        },
        brand: {
          DEFAULT: "#ff4d7d",
          soft: "#ff7aa0",
          deep: "#c9134a",
        },
        good: "#3ddc84",
        warn: "#ffb020",
        bad: "#ff5c5c",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        coin: "0 4px 0 0 #8a5a00, 0 8px 24px -6px rgba(245,166,35,0.5)",
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.8)",
      },
      keyframes: {
        "coin-in": {
          "0%": { transform: "scale(0.6) rotate(-12deg)", opacity: "0" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "coin-in": "coin-in 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

/**
 * DesignDesk "Editorial Modern" brand — mirrors app/frontend/tailwind.config.js.
 * Core tokens (charcoal / off-white / terracotta) are the source of truth;
 * the dark-experience supporting tones are warm derivatives, never cold greys.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand core (identical to the product app)
        charcoal: "#1a1a1a",
        "off-white": "#fdfcf8",
        terracotta: "#b85c38",

        // Dark-experience derivatives
        ink: "#161310", // warm near-black canvas / page base
        "ink-700": "#1f1a15",
        "ink-600": "#2a231d",
        stone: "#a89a8c", // warm muted secondary text
        "stone-dim": "#7d7166",
        "terracotta-soft": "#d98b6a",
        "terracotta-deep": "#8f4327",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-montserrat)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

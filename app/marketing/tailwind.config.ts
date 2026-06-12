import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0f",
        "text-primary": "#f8f8ff",
        "text-secondary": "#94a3b8",
        "accent-teal": "#2dd4bf",
        "accent-purple": "#a855f7",
      },
    },
  },
  plugins: [],
};

export default config;

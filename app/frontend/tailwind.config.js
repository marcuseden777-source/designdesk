/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#1A1A2E",      // Deep navy — primary background
          mid: "#16213E",       // Mid navy — card backgrounds
          accent: "#C9A96E",    // Warm gold — primary CTA & highlights
          "accent-light": "#E8C99A", // Light gold — text on dark
          surface: "#0F3460",   // Deep blue — secondary surface
          muted: "#8892A4",     // Muted grey-blue — secondary text
        },
      },
      fontFamily: {
        sans: ["Inter-Regular"],
        medium: ["Inter-Medium"],
        semibold: ["Inter-SemiBold"],
        bold: ["Inter-Bold"],
      },
    },
  },
  plugins: [],
};

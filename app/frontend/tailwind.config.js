/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        charcoal: "#1a1a1a",
        "off-white": "#fdfcf8",
        terracotta: "#b85c38",
        "terracotta-soft": "#d98b6a",
        "terracotta-deep": "#9a4a2c",
        // Dark scroll-landing palette
        ink: "#161310",
        "ink-700": "#221a13",
        stone: "#b8a99c",
        "stone-dim": "#8a7d72",
      },
      width: {
        "two-column": "47%",
      },
      height: {
        "card-image": "16rem",
      },
      fontFamily: {
        serif: ["PlayfairDisplay_400Regular"],
        "serif-bold": ["PlayfairDisplay_700Bold"],
        sans: ["Montserrat_400Regular"],
        "sans-medium": ["Montserrat_500Medium"],
        "sans-semibold": ["Montserrat_600SemiBold"],
        "sans-bold": ["Montserrat_700Bold"],
      },
    },
  },
  plugins: [],
};

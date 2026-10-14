/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#05080F", 900: "#0A1020", 800: "#0F182C", 700: "#17223C", 600: "#22304F" },
        lime: { 300: "#D4FF5A", 400: "#C6FF2E", 500: "#B4F000", 600: "#8FC400" },
      },
      fontFamily: {
        display: ["'Barlow Condensed'", "Impact", "sans-serif"],
        sans: ["Barlow", "system-ui", "sans-serif"],
      },
      boxShadow: { glow: "0 0 0 1px rgba(198,255,46,.25), 0 8px 30px -8px rgba(198,255,46,.25)" },
    },
  },
  plugins: [],
};

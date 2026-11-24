/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#173a6b",
          900: "#0f2a4a",
          950: "#081a30",
        },
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 42, 74, 0.06), 0 8px 24px -12px rgba(15, 42, 74, 0.18)",
      },
    },
  },
  plugins: [],
};

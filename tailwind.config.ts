import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core design tokens
        bg: "var(--bg)",
        ink: "var(--ink)",
        "surface-dark": "var(--surface-dark)",

        // Brand colors (Editorial Red default)
        brand: {
          DEFAULT: "var(--brand)",
          dark: "var(--brand-dark)",
        },

        // Accent
        accent: {
          DEFAULT: "var(--accent)",
          dark: "var(--accent-dark)",
        },

        // Market indicators
        up: "var(--up)",
        down: "var(--down)",
        neutral: "var(--neutral)",

        // Red shades
        red: {
          DEFAULT: "var(--red)",
          dark: "var(--red-dark)",
        },
      },
    },
  },
  plugins: [],
};
export default config;

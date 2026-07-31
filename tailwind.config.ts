import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "sans-serif"],
        display: ["var(--font-archivo-black)", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Core design tokens
        bg: "var(--bg)",
        ink: "var(--ink)",
        "surface-dark": "var(--surface-dark)",

        // Accent / CTA (aliased to --red per docs/DESIGN_SYSTEM.md §5)
        brand: {
          DEFAULT: "var(--red)",
          dark: "var(--red-dark)",
        },
        red: {
          DEFAULT: "var(--red)",
          dark: "var(--red-dark)",
        },

        // Secondary grays
        "gray-bg": "var(--gray-bg)",
        "gray-line": "var(--gray-line)",
        "gray-mid": "var(--gray-mid)",

        // Market indicators
        up: "var(--up)",
        down: "var(--down)",
      },
    },
  },
  plugins: [],
};
export default config;

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
      fontSize: {
        // Named scale derived from sizes already in use (see docs/DESIGN_SYSTEM.md) —
        // replaces scattered arbitrary text-[Npx] values, no new sizes invented.
        badge: "10.5px", // small uppercase badges (broker regulation tags)
        label: "11px", // uppercase mono eyebrow labels
        meta: "12.5px", // secondary/meta text (dates, stats, footer links)
        nav: "13px", // nav links, CTA buttons
        "body-lg": "17px", // lead paragraph (Hero subtitle)
        "card-title": "19px", // card heading (BrokerCard name)
        wordmark: "22px", // wordmark (Header/Footer) — named to avoid clashing with the `brand` color token
        h2: "26px", // section heading, mobile
        "h2-lg": "30px", // section heading, md+
        h1: "28px", // page title, mobile
        "h1-lg": "36px", // page title, md+
        display: "38px", // hero headline, mobile
        "display-lg": "58px", // hero headline, md+
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

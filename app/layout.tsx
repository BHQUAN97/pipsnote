import type { Metadata } from "next";
import "./globals.css";
import { getSiteSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "PIPSNOTE - Forex & Crypto Trading Insights",
  description: "Your trusted source for Forex and Crypto market analysis, broker reviews, and trading strategies",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Runtime CSS variables từ site_settings */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --bg: ${settings.bg};
                --ink: ${settings.ink};
                --surface-dark: ${settings.surfaceDark};
                --brand: ${settings.brand};
                --brand-dark: ${settings.brandDark};
                --accent: ${settings.accent};
                --accent-dark: ${settings.accentDark};
                --up: ${settings.up};
                --down: ${settings.down};
                --neutral: ${settings.neutral};
                --red: ${settings.red};
                --red-dark: ${settings.redDark};
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const stored = localStorage.getItem('theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const theme = stored || (prefersDark ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme', theme);
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { Archivo_Black, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { getSiteSettings } from "@/lib/settings";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});
const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-archivo-black",
  display: "swap",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PIPSNOTE - Forex & Crypto Trading Insights",
  description: "Your trusted source for Forex and Crypto market analysis, broker reviews, and trading strategies",
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const themeVars = Object.entries(settings)
    .filter(([k]) => k.startsWith('theme.') && k !== 'theme.dark_default')
    .map(([k, v]) => `--${k.replace('theme.', '').replace(/_/g, '-')}: ${v};`)
    .join(' ');
  const darkDefault = settings['theme.dark_default'] === 'true';

  return (
    <html
      lang="vi"
      data-theme={darkDefault ? 'dark' : undefined}
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${archivoBlack.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        {/* Runtime CSS variables từ site_settings — ghi đè :root, [data-theme="dark"] vẫn tĩnh trong globals.css */}
        <style id="theme-vars" dangerouslySetInnerHTML={{ __html: `:root{${themeVars}}` }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const stored = localStorage.getItem('theme');
                if (stored) document.documentElement.setAttribute('data-theme', stored);
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

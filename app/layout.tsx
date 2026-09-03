import type { Metadata } from "next";
import { Archivo_Black, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { getSiteSettings } from "@/lib/settings";
import { getSiteUrl } from "@/lib/siteUrl";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "vietnamese"],
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
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = (await getSiteUrl());
  return {
    metadataBase: new URL(baseUrl),
    title: "PIPSNOTE - Forex & Crypto Trading Insights",
    description: "Your trusted source for Forex and Crypto market analysis, broker reviews, and trading strategies",
    alternates: {
      canonical: "/",
      languages: { en: "/", vi: "/vi" },
    },
  };
}

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, locale] = await Promise.all([getSiteSettings(), getLocale()]);
  const themeVars = Object.entries(settings)
    .filter(([k]) => k.startsWith('theme.') && k !== 'theme.dark_default')
    .map(([k, v]) => `--${k.replace('theme.', '').replace(/_/g, '-')}: ${v};`)
    .join(' ');
  const darkDefault = settings['theme.dark_default'] === 'true';
  const globalBg = settings['bg.global'] || undefined;

  return (
    <html
      lang={locale}
      data-theme={darkDefault ? 'dark' : undefined}
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${archivoBlack.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        {/* Runtime CSS variables từ site_settings — ghi đè :root/[data-theme="dark"].
            :not([data-theme="light"]) bắt buộc phải có: :root và [data-theme="light"] có cùng
            specificity (0,1,0), nên nếu không loại trừ, rule này (đứng sau globals.css trong
            <head>) sẽ luôn thắng theo source-order và đè luôn cả light theme. */}
        <style id="theme-vars" dangerouslySetInnerHTML={{ __html: `:root:not([data-theme="light"]){${themeVars}}` }} />
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
      <body
        className={globalBg ? 'bg-image' : undefined}
        style={
          globalBg
            ? ({ '--global-bg-image': `url(${globalBg})` } as React.CSSProperties)
            : undefined
        }
      >
        {children}
      </body>
    </html>
  );
}

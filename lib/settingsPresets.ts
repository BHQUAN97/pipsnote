import { SiteSettings } from './settings';

export const PRESETS: Record<string, Partial<SiteSettings>> = {
  red: {
    // Editorial Red (default)
    bg: '#ffffff',
    ink: '#1a1a1a',
    surfaceDark: '#1a1a1a',
    brand: '#dc2626',
    brandDark: '#991b1b',
    accent: '#3b82f6',
    accentDark: '#1e40af',
    up: '#10b981',
    down: '#dc2626',
    neutral: '#6b7280',
    red: '#dc2626',
    redDark: '#991b1b',
  },
  blue: {
    // Fintech Trust Blue
    bg: '#ffffff',
    ink: '#0a0e17',
    surfaceDark: '#0a0e17',
    brand: '#1657ff',
    brandDark: '#0d3fc7',
    accent: '#1657ff',
    accentDark: '#0d3fc7',
    up: '#1a9e46',
    down: '#d93025',
    neutral: '#616b7a',
    red: '#1657ff',
    redDark: '#0d3fc7',
  },
  neon: {
    // Crypto Neon Dark-first
    bg: '#0d0f14',
    ink: '#edeff3',
    surfaceDark: '#000000',
    brand: '#00e5a0',
    brandDark: '#00b37f',
    accent: '#00e5a0',
    accentDark: '#00b37f',
    up: '#00e5a0',
    down: '#ff3b5c',
    neutral: '#8a90a3',
    red: '#00e5a0',
    redDark: '#00b37f',
  },
};

import { getRedis } from './redis';

const CACHE_KEY = 'site_settings';
const CACHE_TTL = 300; // 5 phút

export interface SiteSettings {
  // Theme colors (CSS variables)
  bg: string;
  ink: string;
  surfaceDark: string;
  brand: string;
  brandDark: string;
  accent: string;
  accentDark: string;
  up: string;
  down: string;
  neutral: string;
  red: string;
  redDark: string;

  // Layout
  headerSticky: boolean;
  showDarkModeToggle: boolean;
  footerText?: string;
}

const DEFAULT_SETTINGS: SiteSettings = {
  // Editorial Red preset (default)
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

  headerSticky: true,
  showDarkModeToggle: true,
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const redis = getRedis();
  if (!redis) {
    return DEFAULT_SETTINGS;
  }

  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }

    // TODO: Query từ DB site_settings table
    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;

  } catch (err) {
    console.error('getSiteSettings failed:', err);
    return DEFAULT_SETTINGS;
  }
}

export async function invalidateSiteSettingsCache(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(CACHE_KEY);
  } catch (err) {
    console.error('invalidateSiteSettingsCache failed:', err);
  }
}

import type { SiteSettings } from './settings';

// 3 preset mau — gia tri hex khop chinh xac docs/DESIGN_SYSTEM.md §4.
// Chi chua theme.* (khong dung layout.*) — preset chi doi "vibe" mau, khong doi bo cuc.
export const PRESETS: Record<string, Partial<SiteSettings>> = {
  red: {
    // Editorial Red (mac dinh) — DESIGN_SYSTEM.md §2
    'theme.bg': '#FFFFFF',
    'theme.ink': '#0A0A0A',
    'theme.surface_dark': '#0A0A0A',
    'theme.red': '#E10600',
    'theme.red_dark': '#B00500',
    'theme.gray_bg': '#F5F4F1',
    'theme.gray_line': '#E4E2DC',
    'theme.gray_mid': '#6E6C66',
    'theme.up': '#1a9e46',
    'theme.down': '#E10600',
    'theme.dark_default': 'false',
  },
  blue: {
    // Fintech Trust Blue — DESIGN_SYSTEM.md §4 Preset A
    'theme.bg': '#FFFFFF',
    'theme.ink': '#0A0E17',
    'theme.surface_dark': '#0A0E17',
    'theme.red': '#1657FF',
    'theme.red_dark': '#0D3FC7',
    'theme.gray_bg': '#F3F5F9',
    'theme.gray_line': '#E1E5EC',
    'theme.gray_mid': '#616B7A',
    'theme.up': '#1a9e46',
    'theme.down': '#D93025',
    'theme.dark_default': 'false',
  },
  neon: {
    // Crypto Neon Dark-first — DESIGN_SYSTEM.md §4 Preset B
    'theme.bg': '#0D0F14',
    'theme.ink': '#EDEFF3',
    'theme.surface_dark': '#000000',
    'theme.red': '#00E5A0',
    'theme.red_dark': '#00B37F',
    'theme.gray_bg': '#161922',
    'theme.gray_line': '#262B38',
    'theme.gray_mid': '#8A90A3',
    'theme.up': '#00E5A0',
    'theme.down': '#FF3B5C',
    'theme.dark_default': 'true',
  },
};

export type PresetName = keyof typeof PRESETS;

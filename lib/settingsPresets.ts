import type { SiteSettings } from './settings';

// 3 preset mau — gia tri hex khop chinh xac docs/DESIGN_SYSTEM.md.
// Chi chua theme.* (khong dung layout.*) — preset chi doi "vibe" mau, khong doi bo cuc.
// Keys (red/blue/neon) giu nguyen de tuong thich nguoc voi site_settings da luu trong DB;
// gia tri va ten mood duoc thiet ke lai theo huong "financial dashboard" dark-first.
export const PRESETS: Record<string, Partial<SiteSettings>> = {
  red: {
    // Signal (mac dinh) — dark terminal, amber accent — DESIGN_SYSTEM.md §2
    'theme.bg': '#0B0E14',
    'theme.ink': '#E8EBF2',
    'theme.surface_dark': '#05070A',
    'theme.red': '#FFB020',
    'theme.red_dark': '#D68F0C',
    'theme.gray_bg': '#131721',
    'theme.gray_line': '#232A38',
    'theme.gray_mid': '#8891A6',
    'theme.up': '#17C879',
    'theme.down': '#F0455C',
    'theme.dark_default': 'true',
  },
  blue: {
    // Ledger — dark terminal, electric-blue accent — DESIGN_SYSTEM.md §4 Preset A
    'theme.bg': '#0A0F1A',
    'theme.ink': '#E6EEF7',
    'theme.surface_dark': '#05080F',
    'theme.red': '#2E8BFF',
    'theme.red_dark': '#1D63C9',
    'theme.gray_bg': '#111826',
    'theme.gray_line': '#22304A',
    'theme.gray_mid': '#7C8BA8',
    'theme.up': '#22C55E',
    'theme.down': '#EF4444',
    'theme.dark_default': 'true',
  },
  neon: {
    // Pulse — dark terminal, violet-neon accent — DESIGN_SYSTEM.md §4 Preset B
    'theme.bg': '#0C0A14',
    'theme.ink': '#F1EEFB',
    'theme.surface_dark': '#050307',
    'theme.red': '#B14EFF',
    'theme.red_dark': '#8F2FE0',
    'theme.gray_bg': '#171325',
    'theme.gray_line': '#2C2440',
    'theme.gray_mid': '#9089AC',
    'theme.up': '#14E8A0',
    'theme.down': '#FF3D6E',
    'theme.dark_default': 'true',
  },
};

export type PresetName = keyof typeof PRESETS;

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { getSiteSettings, invalidateSiteSettingsCache } from '@/lib/settings';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';

const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);
const BoolStringSchema = z.enum(['true', 'false']);
const HeroVariantSchema = z.enum(['editorial', 'ticker-hero', 'grid']);
const ImageUrlSchema = z.union([
  z.literal(''),
  z
    .string()
    .refine(
      (v) => /^https?:\/\//.test(v) || v.startsWith('/images/backgrounds/'),
      'Invalid image URL'
    ),
]);

// Whitelist key -> Zod schema cho tung setting (khop docs/ADMIN_SETTINGS.md §3)
const KEY_SCHEMAS: Record<string, z.ZodTypeAny> = {
  'theme.bg': HexColorSchema,
  'theme.ink': HexColorSchema,
  'theme.surface_dark': HexColorSchema,
  'theme.red': HexColorSchema,
  'theme.red_dark': HexColorSchema,
  'theme.gray_bg': HexColorSchema,
  'theme.gray_line': HexColorSchema,
  'theme.gray_mid': HexColorSchema,
  'theme.up': HexColorSchema,
  'theme.down': HexColorSchema,
  'theme.dark_default': BoolStringSchema,
  'layout.show_ticker': BoolStringSchema,
  'layout.hero_variant': HeroVariantSchema,
  'layout.site_name': z.string().min(1).max(100),
  'footer.contact_email': z.string().email().max(200),
  'seo.og_image': z.string().max(500),
  'seo.logo_image': z.string().max(500),
  'seo.favicon': z.string().max(500),
  'market.refresh_interval_minutes': z.string().regex(/^\d+$/).refine((v) => {
    const n = parseInt(v, 10);
    return n >= 1 && n <= 1440;
  }, { message: 'Phải là số phút từ 1 đến 1440' }),
  'market.history_retention_days': z.string().regex(/^\d+$/).refine((v) => {
    const n = parseInt(v, 10);
    return n >= 1 && n <= 365;
  }, { message: 'Phải là số ngày từ 1 đến 365' }),
  'site_url': z
    .string()
    .max(200)
    .refine((v) => /^https?:\/\/.+/i.test(v), {
      message: 'Site URL phải bắt đầu bằng http:// hoặc https://',
    }),
  'bg.global': ImageUrlSchema,
  'bg.hero': ImageUrlSchema,
  'bg.ticker': ImageUrlSchema,
  'bg.newsletter': ImageUrlSchema,
};

const SettingsUpdateSchema = z
  .record(z.string(), z.string())
  .refine((obj) => Object.keys(obj).every((k) => k in KEY_SCHEMAS), {
    message: 'Unknown setting key',
  });

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

async function getHandler() {
  await requireAdmin(['superadmin']);
  const settings = await getSiteSettings();
  return NextResponse.json(settings);
}

async function patchHandler(req: NextRequest) {
  const user = await requireAdmin(['superadmin']);
  const body = await req.json();
  const parsed = SettingsUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid settings', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const updates = Object.entries(parsed.data);
  for (const [key, value] of updates) {
    const schema = KEY_SCHEMAS[key];
    const valueResult = schema.safeParse(value);
    if (!valueResult.success) {
      return NextResponse.json(
        { error: `Invalid value for ${key}`, details: valueResult.error.issues },
        { status: 400 }
      );
    }
  }

  const before = await getSiteSettings();

  for (const [key, value] of updates) {
    await query(
      'INSERT INTO site_settings (setting_key, setting_value, category, updated_by) VALUES (?, ?, ?, ?) ' +
        'ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)',
      [key, value, key.split('.')[0], String(user.id)]
    );
  }

  await invalidateSiteSettingsCache();

  const diff = Object.fromEntries(
    updates.map(([key, value]) => [key, { before: before[key], after: value }])
  );

  await query(
    'INSERT INTO admin_audit_log (user_id, action, resource_type, changes, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
    [
      user.id,
      'update_settings',
      'site_settings',
      JSON.stringify(diff),
      getClientIp(req),
      req.headers.get('user-agent') ?? null,
    ]
  );

  return NextResponse.json({ success: true, settings: await getSiteSettings() });
}

export const GET = withApiHandler('admin-settings-get', getHandler);
export const PATCH = withApiHandler('admin-settings-patch', patchHandler);

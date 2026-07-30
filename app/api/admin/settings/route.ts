import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { getSiteSettings, invalidateSiteSettingsCache, SiteSettings } from '@/lib/settings';
import { requireAdmin } from '@/lib/getAdminUser';

const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

const SettingsUpdateSchema = z.object({
  bg: HexColorSchema.optional(),
  ink: HexColorSchema.optional(),
  surfaceDark: HexColorSchema.optional(),
  brand: HexColorSchema.optional(),
  brandDark: HexColorSchema.optional(),
  accent: HexColorSchema.optional(),
  accentDark: HexColorSchema.optional(),
  up: HexColorSchema.optional(),
  down: HexColorSchema.optional(),
  neutral: HexColorSchema.optional(),
  red: HexColorSchema.optional(),
  redDark: HexColorSchema.optional(),
  headerSticky: z.boolean().optional(),
  showDarkModeToggle: z.boolean().optional(),
  footerText: z.string().max(500).optional(),
});

async function getHandler(req: NextRequest) {
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

  // TODO: Update DB site_settings table
  // const updates = Object.entries(parsed.data);
  // for (const [key, value] of updates) {
  //   await pool.query(
  //     'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
  //     [key, value, value]
  //   );
  // }

  // TODO: Log to admin_audit_log
  // await pool.query(
  //   'INSERT INTO admin_audit_log (user_id, action, resource_type, changes) VALUES (?, ?, ?, ?)',
  //   [user.id, 'update_settings', 'site_settings', JSON.stringify(parsed.data)]
  // );

  await invalidateSiteSettingsCache();

  return NextResponse.json({
    success: true,
    message: 'Settings updated (DB update pending - using defaults for now)',
  });
}

export const GET = withApiHandler('admin-settings-get', getHandler);
export const PATCH = withApiHandler('admin-settings-patch', patchHandler);

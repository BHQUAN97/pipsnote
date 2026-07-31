import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { getSiteSettings, invalidateSiteSettingsCache } from '@/lib/settings';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import { PRESETS } from '@/lib/settingsPresets';

const PresetSchema = z.object({
  preset: z.enum(['red', 'blue', 'neon']),
});

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

async function presetHandler(req: NextRequest) {
  const user = await requireAdmin(['superadmin']);
  const body = await req.json();
  const parsed = PresetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid preset' },
      { status: 400 }
    );
  }

  const { preset } = parsed.data;
  const presetValues = PRESETS[preset];
  const before = await getSiteSettings();

  const updates = Object.entries(presetValues);
  for (const [key, value] of updates) {
    await query(
      'INSERT INTO site_settings (setting_key, setting_value, category, updated_by) VALUES (?, ?, ?, ?) ' +
        'ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)',
      [key, value, 'theme', String(user.id)]
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
      'apply_preset',
      'site_settings',
      JSON.stringify({ preset, diff }),
      getClientIp(req),
      req.headers.get('user-agent') ?? null,
    ]
  );

  return NextResponse.json({
    success: true,
    preset,
    settings: await getSiteSettings(),
  });
}

export const POST = withApiHandler('admin-settings-preset', presetHandler);

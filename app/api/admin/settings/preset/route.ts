import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/withApiHandler';
import { invalidateSiteSettingsCache } from '@/lib/settings';
import { requireAdmin } from '@/lib/getAdminUser';
import { PRESETS } from '@/lib/settingsPresets';

const PresetSchema = z.object({
  preset: z.enum(['red', 'blue', 'neon']),
});

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

  // TODO: Batch update DB site_settings
  // const updates = Object.entries(presetValues);
  // for (const [key, value] of updates) {
  //   await pool.query(
  //     'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
  //     [key, value, value]
  //   );
  // }

  // TODO: Log to admin_audit_log
  // await pool.query(...);

  await invalidateSiteSettingsCache();

  return NextResponse.json({
    success: true,
    preset,
    message: `Applied ${preset} preset (DB update pending)`,
  });
}

export const POST = withApiHandler('admin-settings-preset', presetHandler);

// Static page — no maintenance-mode toggle wired yet (out of scope, see NEXT-PLAN.md).
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { getSiteSettings } from '@/lib/settings';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('maintenance');
  const siteName = (await getSiteSettings())['layout.site_name'] || 'TopTrendMarkets';
  return { title: `${t('title')} | ${siteName}` };
}

export const dynamic = 'force-dynamic';

export default async function MaintenancePage() {
  const t = await getTranslations('maintenance');
  const settings = await getSiteSettings();
  const siteName = settings['layout.site_name'] || 'TopTrendMarkets';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-7 text-center">
      <h1 className="text-h1 leading-tight md:text-h1-lg">{t('title')}</h1>
      <p className="max-w-[480px] text-sm leading-relaxed text-gray-mid">{t('body', { siteName })}</p>
    </div>
  );
}

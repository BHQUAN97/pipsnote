import { useTranslations } from 'next-intl';

export default function RiskDisclaimer({ siteName = 'TopTrendMarkets' }: { siteName?: string }) {
  const t = useTranslations('riskDisclaimer');

  return (
    <p className="text-xs leading-relaxed text-gray-mid">
      <strong>{t('label')}</strong> {t('body', { siteName })}
    </p>
  );
}

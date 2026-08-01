'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const nextLocale = locale === 'en' ? 'vi' : 'en';

  function toggle() {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch language to ${nextLocale === 'en' ? 'English' : 'Tiếng Việt'}`}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-gray-line text-xs font-semibold uppercase"
    >
      {nextLocale}
    </button>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';

const LOCALES: Array<{ code: string; label: string; flag: string }> = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  function switchTo(code: string) {
    if (code !== locale) {
      router.replace(pathname, { locale: code });
    }
    setOpen(false);
  }

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-11 items-center gap-1.5 rounded-sm border border-gray-line px-3 text-sm font-semibold uppercase transition-colors hover:bg-gray-bg"
      >
        <span aria-hidden>{current.flag}</span>
        <span>{current.code}</span>
        <span aria-hidden className="text-xs opacity-60">▾</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-12 z-30 w-44 overflow-hidden rounded-md border border-gray-line bg-bg py-1 shadow-elevated-static"
        >
          {LOCALES.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === locale}>
              <button
                type="button"
                onClick={() => switchTo(l.code)}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-bg ${
                  l.code === locale ? 'font-semibold text-brand' : 'text-ink'
                }`}
              >
                <span aria-hidden>{l.flag}</span>
                <span className="flex-1">{l.label}</span>
                {l.code === locale && <span aria-hidden>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
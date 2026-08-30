import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: [
    'en',
    'vi',
    'de',
    'fr',
    'es',
    'it',
    'pt',
    'ru',
    'pl',
    'ja',
  ],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});
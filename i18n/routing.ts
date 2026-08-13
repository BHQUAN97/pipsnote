import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'vi', 'de', 'fr'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
});

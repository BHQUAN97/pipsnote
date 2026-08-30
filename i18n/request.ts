import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

const LOCALIZED = new Set(['en', 'vi', 'de', 'fr']);

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  // Locale chưa có messages_file riêng → fallback về en (giao diện) để không crash.
  // Nội dung bài viết vẫn có thể dịch riêng qua AI sau.
  const resolved = LOCALIZED.has(locale) ? locale : 'en';

  return {
    locale,
    messages: (await import(`../messages/${resolved}.json`)).default,
  };
});
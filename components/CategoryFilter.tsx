'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { routes } from '@/lib/routes';
import type { Category } from '@/lib/types';

export default function CategoryFilter({ categories }: { categories: Category[] }) {
  const t = useTranslations('categoryFilter');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = pathname.startsWith('/blog/category/') ? pathname.split('/')[3] : '';

  function select(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    const qs = params.toString();
    const base = slug ? routes.blogCategory(slug) : routes.blog;
    router.push(`${base}${qs ? `?${qs}` : ''}`);
  }

  return (
    <div className="mb-11 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => select('')}
        className={`rounded-full border px-4.5 py-2.5 text-sm font-medium transition-all duration-200 ${
          active === ''
            ? 'glow-brand border-surface-dark bg-surface-dark text-white'
            : 'border-gray-line text-gray-mid hover:-translate-y-0.5 hover:border-ink hover:text-ink'
        }`}
      >
        {t('all')}
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => select(cat.slug)}
          className={`rounded-full border px-4.5 py-2.5 text-sm font-medium transition-all duration-200 ${
            active === cat.slug
              ? 'glow-brand border-surface-dark bg-surface-dark text-white'
              : 'border-gray-line text-gray-mid hover:-translate-y-0.5 hover:border-ink hover:text-ink'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useState } from 'react';
import { routes } from '@/lib/routes';
import Input from '@/components/ui/Input';

export default function SearchBox() {
  const t = useTranslations('search');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    if (value.trim()) {
      params.set('q', value.trim());
    } else {
      params.delete('q');
    }
    const categorySlug = pathname.startsWith('/blog/category/') ? pathname.split('/')[3] : '';
    const base = categorySlug ? routes.blogCategory(categorySlug) : routes.blog;
    router.push(`${base}${params.toString() ? `?${params.toString()}` : ''}`);
  }

  return (
    <form onSubmit={submit} className="mb-9 flex gap-3">
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t('placeholder')}
        className="flex-1"
      />
      <button
        type="submit"
        className="glow-brand h-11 min-w-11 rounded-lg border border-surface-dark bg-surface-dark px-4.5 text-sm font-medium text-white transition-colors duration-200 hover:border-brand hover:bg-brand"
      >
        {t('button')}
      </button>
    </form>
  );
}

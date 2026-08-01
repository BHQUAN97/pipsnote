'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { routes } from '@/lib/routes';
import type { Category } from '@/lib/types';

export default function CategoryFilter({ categories }: { categories: Category[] }) {
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
        className={`rounded-sm border px-4.5 py-2.5 text-sm font-medium transition-colors ${
          active === ''
            ? 'border-surface-dark bg-surface-dark text-white'
            : 'border-gray-line hover:border-ink'
        }`}
      >
        All
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => select(cat.slug)}
          className={`rounded-sm border px-4.5 py-2.5 text-sm font-medium transition-colors ${
            active === cat.slug
              ? 'border-surface-dark bg-surface-dark text-white'
              : 'border-gray-line hover:border-ink'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

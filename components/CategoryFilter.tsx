'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { Category } from '@/lib/types';

export default function CategoryFilter({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get('cat') ?? '';

  function select(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set('cat', slug);
    } else {
      params.delete('cat');
    }
    router.push(`/blog${params.toString() ? `?${params.toString()}` : ''}`);
  }

  return (
    <div className="mb-11 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => select('')}
        className={`border px-4.5 py-2.5 text-sm font-medium ${
          active === ''
            ? 'border-surface-dark bg-surface-dark text-white'
            : 'border-gray-line'
        }`}
      >
        Tất cả
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => select(cat.slug)}
          className={`border px-4.5 py-2.5 text-sm font-medium ${
            active === cat.slug
              ? 'border-surface-dark bg-surface-dark text-white'
              : 'border-gray-line'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

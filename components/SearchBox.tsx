'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import { routes } from '@/lib/routes';

export default function SearchBox() {
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
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search posts..."
        className="h-11 flex-1 rounded-sm border border-gray-line px-4 text-sm outline-none transition-colors focus:border-brand"
      />
      <button
        type="submit"
        className="h-11 min-w-11 rounded-sm border border-surface-dark bg-surface-dark px-4.5 text-sm font-medium text-white transition-colors hover:bg-brand hover:border-brand"
      >
        Search
      </button>
    </form>
  );
}

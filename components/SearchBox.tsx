'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function SearchBox() {
  const router = useRouter();
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
    router.push(`/blog${params.toString() ? `?${params.toString()}` : ''}`);
  }

  return (
    <form onSubmit={submit} className="mb-9 flex gap-3">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tìm kiếm bài viết..."
        className="h-11 flex-1 border border-gray-line px-4 text-sm outline-none focus:border-surface-dark"
      />
      <button
        type="submit"
        className="h-11 min-w-11 border border-surface-dark bg-surface-dark px-4.5 text-sm font-medium text-white"
      >
        Tìm
      </button>
    </form>
  );
}

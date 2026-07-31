'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface PostRow {
  id: number;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  is_featured: number;
  view_count: number;
  category_name: string | null;
  published_at: string | null;
  updated_at: string;
}

const STATUS_OPTIONS = ['', 'draft', 'published', 'archived'];

export default function AdminPostsPage() {
  const [items, setItems] = useState<PostRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const pageSize = 20;

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status) params.set('status', status);

    fetch(`/api/admin/posts?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: number, title: string) {
    if (!window.confirm(`Xoá bài viết "${title}"?`)) return;
    const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Posts</h1>
        <Link
          href="/admin/posts/new"
          className="min-h-[44px] rounded bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark flex items-center"
        >
          + Bài viết mới
        </Link>
      </div>

      <div className="mb-4 flex gap-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`min-h-[44px] rounded border px-4 py-2 text-sm ${
              status === s ? 'bg-surface-dark text-white' : 'hover:bg-gray-bg'
            }`}
          >
            {s || 'Tất cả'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-mid">Đang tải...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-mid">Chưa có bài viết nào.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-line">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-gray-line bg-gray-bg text-left">
                <th className="p-3">Tiêu đề</th>
                <th className="p-3">Danh mục</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Views</th>
                <th className="p-3">Cập nhật</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((post) => (
                <tr key={post.id} className="border-b border-gray-line last:border-0">
                  <td className="p-3 font-medium">{post.title}</td>
                  <td className="p-3 text-gray-mid">{post.category_name ?? '—'}</td>
                  <td className="p-3">
                    <span className="rounded bg-gray-bg px-2 py-1 font-mono text-xs">
                      {post.status}
                    </span>
                  </td>
                  <td className="p-3 text-gray-mid">{post.view_count}</td>
                  <td className="p-3 text-gray-mid">
                    {new Date(post.updated_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-3">
                      <Link href={`/admin/posts/${post.id}/edit`} className="text-brand hover:underline">
                        Sửa
                      </Link>
                      <button
                        onClick={() => handleDelete(post.id, post.title)}
                        className="text-down hover:underline"
                      >
                        Xoá
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`flex h-11 min-w-11 items-center justify-center border px-3 text-sm ${
                p === page ? 'border-surface-dark bg-surface-dark text-white' : 'border-gray-line'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DetailDrawer, { type DetailField } from '@/components/admin/DetailDrawer';

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

interface PostDetail extends PostRow {
  excerpt: string | null;
  content: string;
  seo_title: string | null;
  seo_desc: string | null;
  read_time: number | null;
}

const STATUS_OPTIONS = ['', 'draft', 'published', 'archived'];

export default function AdminPostsPage() {
  const router = useRouter();
  const [items, setItems] = useState<PostRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<PostDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    if (!window.confirm(`Delete post "${title}"?`)) return;
    const res = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  }

  async function handleReorder(id: number, direction: 'up' | 'down') {
    const res = await fetch(`/api/admin/posts/${id}/reorder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direction }),
    });
    if (res.ok) load();
  }

  function openDetail(id: number) {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    fetch(`/api/admin/posts/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: PostDetail) => setDetail(data))
      .finally(() => setDetailLoading(false));
  }

  function handleRowClick(id: number) {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      openDetail(id);
      clickTimer.current = null;
    }, 220);
  }

  function handleRowDoubleClick(id: number) {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    router.push(`/admin/posts/${id}/edit`);
  }

  const detailFields: DetailField[] = detail
    ? [
        { label: 'Title', value: detail.title },
        { label: 'Slug', value: detail.slug },
        { label: 'Category', value: detail.category_name ?? '—' },
        { label: 'Status', value: detail.status },
        { label: 'Views', value: detail.view_count },
        { label: 'Read time', value: detail.read_time ? `${detail.read_time} min` : '—' },
        { label: 'Excerpt', value: detail.excerpt ?? '—' },
        { label: 'SEO title', value: detail.seo_title ?? '—' },
        { label: 'SEO description', value: detail.seo_desc ?? '—' },
        { label: 'Published at', value: detail.published_at ? new Date(detail.published_at).toLocaleDateString('vi-VN') : '—' },
      ]
    : [];

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Posts</h1>
        <Link
          href="/admin/posts/new"
          className="min-h-[44px] rounded-sm bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark flex items-center"
        >
          + New post
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
            className={`min-h-[44px] rounded-sm border px-4 py-2 text-sm ${
              status === s ? 'bg-surface-dark text-white' : 'hover:bg-gray-bg'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-mid">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-mid">No posts yet.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto border border-gray-line sm:block">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-line bg-gray-bg text-left">
                  <th className="p-3">Title</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Views</th>
                  <th className="p-3">Updated</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((post) => (
                  <tr
                    key={post.id}
                    onClick={() => handleRowClick(post.id)}
                    onDoubleClick={() => handleRowDoubleClick(post.id)}
                    className="cursor-pointer border-b border-gray-line last:border-0 hover:bg-gray-bg"
                  >
                    <td className="p-3 font-medium">{post.title}</td>
                    <td className="p-3 text-gray-mid">{post.category_name ?? '—'}</td>
                    <td className="p-3">
                      <span className="rounded-sm bg-gray-bg px-2 py-1 font-mono text-xs">
                        {post.status}
                      </span>
                    </td>
                    <td className="p-3 text-gray-mid">{post.view_count}</td>
                    <td className="p-3 text-gray-mid">
                      {new Date(post.updated_at).toLocaleDateString('en-US')}
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3">
                        {!status && (
                          <div className="flex flex-col">
                            <button
                              aria-label="Move up"
                              onClick={() => handleReorder(post.id, 'up')}
                              className="flex h-5 w-6 items-center justify-center leading-none hover:text-brand"
                            >
                              ▲
                            </button>
                            <button
                              aria-label="Move down"
                              onClick={() => handleReorder(post.id, 'down')}
                              className="flex h-5 w-6 items-center justify-center leading-none hover:text-brand"
                            >
                              ▼
                            </button>
                          </div>
                        )}
                        <Link href={`/admin/posts/${post.id}/edit`} className="text-brand hover:underline">
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(post.id, post.title)}
                          className="text-down hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:hidden">
            {items.map((post) => (
              <div
                key={post.id}
                onClick={() => openDetail(post.id)}
                className="cursor-pointer border border-gray-line p-4 hover:bg-gray-bg"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium leading-snug">{post.title}</span>
                  <span className="shrink-0 rounded-sm bg-gray-bg px-2 py-1 font-mono text-xs">
                    {post.status}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-mid">
                  {post.category_name ?? '—'} · {post.view_count} views ·{' '}
                  {new Date(post.updated_at).toLocaleDateString('en-US')}
                </div>
                <div
                  className="mt-3 flex items-center gap-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!status && (
                    <div className="flex items-center gap-1">
                      <button
                        aria-label="Move up"
                        onClick={() => handleReorder(post.id, 'up')}
                        className="flex h-11 w-11 items-center justify-center hover:text-brand"
                      >
                        ▲
                      </button>
                      <button
                        aria-label="Move down"
                        onClick={() => handleReorder(post.id, 'down')}
                        className="flex h-11 w-11 items-center justify-center hover:text-brand"
                      >
                        ▼
                      </button>
                    </div>
                  )}
                  <Link
                    href={`/admin/posts/${post.id}/edit`}
                    className="flex min-h-[44px] items-center text-brand hover:underline"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(post.id, post.title)}
                    className="flex min-h-[44px] items-center text-down hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
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

      <DetailDrawer
        open={detailId !== null}
        title="Post detail"
        loading={detailLoading}
        fields={detailFields}
        editHref={detailId ? `/admin/posts/${detailId}/edit` : undefined}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}

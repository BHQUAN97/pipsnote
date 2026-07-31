'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, Post } from '@/lib/types';

interface PostFormValues {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image: string;
  category_id: string;
  status: 'draft' | 'published' | 'archived';
  is_featured: boolean;
  read_time: string;
  seo_title: string;
  seo_desc: string;
}

function toFormValues(post?: Post | null): PostFormValues {
  return {
    title: post?.title ?? '',
    slug: post?.slug ?? '',
    excerpt: post?.excerpt ?? '',
    content: post?.content ?? '',
    featured_image: post?.featured_image ?? '',
    category_id: post?.category_id != null ? String(post.category_id) : '',
    status: post?.status ?? 'draft',
    is_featured: Boolean(post?.is_featured),
    read_time: post?.read_time != null ? String(post.read_time) : '',
    seo_title: post?.seo_title ?? '',
    seo_desc: post?.seo_desc ?? '',
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .split('')
    .filter((ch) => {
      const code = ch.codePointAt(0) ?? 0;
      return code < 0x0300 || code > 0x036f;
    })
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function PostForm({ postId, initialPost }: { postId?: number; initialPost?: Post }) {
  const router = useRouter();
  const [values, setValues] = useState<PostFormValues>(() => toFormValues(initialPost));
  const [categories, setCategories] = useState<Category[]>([]);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialPost));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setCategories(data.items))
      .catch(() => setCategories([]));
  }, []);

  function update<K extends keyof PostFormValues>(key: K, value: PostFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      title: values.title,
      slug: values.slug,
      excerpt: values.excerpt || null,
      content: values.content,
      featured_image: values.featured_image || null,
      category_id: values.category_id ? Number(values.category_id) : null,
      status: values.status,
      is_featured: values.is_featured,
      read_time: values.read_time ? Number(values.read_time) : null,
      seo_title: values.seo_title || null,
      seo_desc: values.seo_desc || null,
    };

    try {
      const res = await fetch(postId ? `/api/admin/posts/${postId}` : '/api/admin/posts', {
        method: postId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Lưu bài viết thất bại');
        return;
      }

      router.push('/admin/posts');
    } catch {
      setError('Lỗi kết nối mạng');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
      {error && <div className="p-3 bg-red text-white rounded text-sm">{error}</div>}

      <div>
        <label className="block text-sm mb-2 font-medium">Tiêu đề</label>
        <input
          type="text"
          value={values.title}
          onChange={(e) => {
            update('title', e.target.value);
            if (!slugTouched) update('slug', slugify(e.target.value));
          }}
          className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded"
          disabled={saving}
          required
        />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">Slug</label>
        <input
          type="text"
          value={values.slug}
          onChange={(e) => {
            setSlugTouched(true);
            update('slug', e.target.value);
          }}
          pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
          className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded font-mono text-sm"
          disabled={saving}
          required
        />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">Tóm tắt</label>
        <textarea
          value={values.excerpt}
          onChange={(e) => update('excerpt', e.target.value)}
          rows={3}
          className="w-full px-4 py-2 border border-gray-line rounded"
          disabled={saving}
        />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">Nội dung</label>
        <textarea
          value={values.content}
          onChange={(e) => update('content', e.target.value)}
          rows={12}
          className="w-full px-4 py-2 border border-gray-line rounded font-mono text-sm"
          disabled={saving}
          required
        />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">Ảnh đại diện (URL)</label>
        <input
          type="text"
          value={values.featured_image}
          onChange={(e) => update('featured_image', e.target.value)}
          className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded"
          disabled={saving}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-2 font-medium">Danh mục</label>
          <select
            value={values.category_id}
            onChange={(e) => update('category_id', e.target.value)}
            className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded"
            disabled={saving}
          >
            <option value="">— Không có —</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-2 font-medium">Trạng thái</label>
          <select
            value={values.status}
            onChange={(e) => update('status', e.target.value as PostFormValues['status'])}
            className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded"
            disabled={saving}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-2 font-medium">Thời gian đọc (phút)</label>
          <input
            type="number"
            min={0}
            value={values.read_time}
            onChange={(e) => update('read_time', e.target.value)}
            className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded"
            disabled={saving}
          />
        </div>

        <div className="flex items-center gap-2 mt-7">
          <input
            id="is_featured"
            type="checkbox"
            checked={values.is_featured}
            onChange={(e) => update('is_featured', e.target.checked)}
            className="h-5 w-5"
            disabled={saving}
          />
          <label htmlFor="is_featured" className="text-sm font-medium">
            Bài nổi bật
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">SEO Title</label>
        <input
          type="text"
          value={values.seo_title}
          onChange={(e) => update('seo_title', e.target.value)}
          className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded"
          disabled={saving}
        />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">SEO Description</label>
        <textarea
          value={values.seo_desc}
          onChange={(e) => update('seo_desc', e.target.value)}
          rows={2}
          className="w-full px-4 py-2 border border-gray-line rounded"
          disabled={saving}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="min-h-[44px] px-6 py-2 bg-brand text-white rounded hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? 'Đang lưu...' : 'Lưu bài viết'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/posts')}
          disabled={saving}
          className="min-h-[44px] px-6 py-2 border border-gray-line rounded hover:bg-gray-bg disabled:opacity-50"
        >
          Hủy
        </button>
      </div>
    </form>
  );
}

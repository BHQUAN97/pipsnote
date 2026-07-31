import Link from 'next/link';
import type { Post } from '@/lib/types';

function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export default function PostCard({ post }: { post: Post }) {
  return (
    <Link href={`/blog/${post.slug}`} className="block">
      <div className="mb-4 flex aspect-[4/3] items-center justify-center border border-gray-line bg-gray-bg font-mono text-xs text-gray-mid">
        IMG
      </div>
      {post.category_name && (
        <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.06em] text-brand">
          {post.category_name}
        </span>
      )}
      <h3 className="mb-2 text-lg font-semibold leading-snug">{post.title}</h3>
      <span className="text-[12.5px] text-gray-mid">
        {post.read_time ? `${post.read_time} phút đọc · ` : ''}
        {formatDate(post.published_at)}
      </span>
    </Link>
  );
}

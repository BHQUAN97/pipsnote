import Image from 'next/image';
import { Link } from '@/i18n/navigation';
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
    <Link
      href={`/blog/${post.slug}`}
      className="card-elevated group block border border-gray-line bg-bg p-4 hover:border-ink"
    >
      {post.featured_image ? (
        <div className="relative mb-4 aspect-[4/3] overflow-hidden border border-gray-line bg-gray-bg">
          <Image
            src={post.featured_image}
            alt={post.title}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover transition-transform group-hover:scale-[1.03]"
          />
        </div>
      ) : (
        <div className="mb-4 flex aspect-[4/3] items-center justify-center border border-gray-line bg-gray-bg font-mono text-xs text-gray-mid">
          IMG
        </div>
      )}
      {post.category_name && (
        <span className="mb-2 block font-mono text-label uppercase tracking-[0.06em] text-brand">
          {post.category_name}
        </span>
      )}
      <h3 className="mb-2 text-lg font-semibold leading-snug transition-colors group-hover:text-brand">
        {post.title}
      </h3>
      <span className="text-meta text-gray-mid">
        {post.read_time ? `${post.read_time} min read · ` : ''}
        {formatDate(post.published_at)}
      </span>
    </Link>
  );
}

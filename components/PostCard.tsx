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
      className="card-elevated group block overflow-hidden border border-gray-line bg-bg hover:-translate-y-1.5 hover:border-ink/60 hover:shadow-soft"
    >
      {post.featured_image ? (
        <div className="relative aspect-[4/3] overflow-hidden bg-gray-bg">
          <Image
            src={post.featured_image}
            alt={post.title}
            fill
            sizes="(min-width: 768px) 33vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.05]"
          />
        </div>
      ) : (
        <div
          className="relative flex aspect-[4/3] items-end overflow-hidden p-4"
          style={{
            background:
              'linear-gradient(140deg, #1a2b52 0%, #0f1a33 55%, #0a0f1a 100%)',
          }}
        >
          <svg className="absolute -right-6 -top-6 h-32 w-32 opacity-40 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 20h20M5 20V8l5 4 4-6 5 8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {/* glow dot accent */}
          <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full" style={{ background: 'var(--red)', boxShadow: '0 0 12px var(--red)' }} />
          <span className="relative font-mono text-[11px] uppercase tracking-[0.12em] text-white/60">
            {post.category_name ?? 'TopTrendMarkets · Markets'}
          </span>
        </div>
      )}
      <div className="p-4">
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
      </div>
    </Link>
  );
}

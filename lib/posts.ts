import { query } from '@/lib/db';
import type { Post } from '@/lib/types';

export async function getPublishedPosts({
  categorySlug,
  limit,
  offset = 0,
}: {
  categorySlug?: string | null;
  limit: number;
  offset?: number;
}): Promise<{ items: Post[]; total: number }> {
  const where = categorySlug
    ? 'WHERE p.status = "published" AND c.slug = ?'
    : 'WHERE p.status = "published"';
  const countParams = categorySlug ? [categorySlug] : [];
  const listParams = categorySlug ? [categorySlug, limit, offset] : [limit, offset];

  const [countRows, listRows] = await Promise.all([
    query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM posts p LEFT JOIN categories c ON c.id = p.category_id ${where}`,
      countParams
    ),
    query<Post[]>(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM posts p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.is_featured DESC, p.published_at DESC
       LIMIT ? OFFSET ?`,
      listParams
    ),
  ]);

  return { items: listRows, total: countRows[0]?.total ?? 0 };
}

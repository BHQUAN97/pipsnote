import { MeiliSearch } from 'meilisearch';
import { query } from './db';
import { logger } from './logger';
import type { Post } from './types';

export const POSTS_INDEX_UID = 'posts';

let clientInstance: MeiliSearch | null = null;
let indexReady = false;

export function getMeiliClient(): MeiliSearch | null {
  if (!process.env.MEILI_HOST) {
    return null;
  }

  if (!clientInstance) {
    clientInstance = new MeiliSearch({
      host: process.env.MEILI_HOST,
      apiKey: process.env.MEILI_MASTER_KEY,
    });
  }

  return clientInstance;
}

async function ensurePostsIndex(): Promise<MeiliSearch | null> {
  const client = getMeiliClient();
  if (!client || indexReady) {
    return client;
  }

  await client.createIndex(POSTS_INDEX_UID, { primaryKey: 'id' });
  const index = client.index(POSTS_INDEX_UID);
  await index.updateSettings({
    searchableAttributes: ['title', 'excerpt'],
    filterableAttributes: ['category_slug'],
    sortableAttributes: ['published_at'],
  });
  indexReady = true;

  return client;
}

interface PostSearchDoc {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  category_name: string | null;
  category_slug: string | null;
  read_time: number | null;
  published_at: string | null;
}

export async function syncPostSearchIndex(id: number): Promise<void> {
  try {
    const client = await ensurePostsIndex();
    if (!client) return;

    const rows = await query<
      Array<{
        id: number;
        title: string;
        slug: string;
        excerpt: string | null;
        status: string;
        read_time: number | null;
        published_at: string | null;
        category_name: string | null;
        category_slug: string | null;
      }>
    >(
      `SELECT p.id, p.title, p.slug, p.excerpt, p.status, p.read_time, p.published_at,
              c.name AS category_name, c.slug AS category_slug
       FROM posts p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?
       LIMIT 1`,
      [id]
    );

    const post = rows[0];
    const index = client.index(POSTS_INDEX_UID);

    if (!post || post.status !== 'published') {
      await index.deleteDocument(id);
      return;
    }

    const doc: PostSearchDoc = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      category_name: post.category_name,
      category_slug: post.category_slug,
      read_time: post.read_time,
      published_at: post.published_at,
    };

    await index.addDocuments([doc]);
  } catch (err) {
    logger.warn({ err, postId: id }, 'Failed to sync post into Meilisearch index');
  }
}

export async function reindexAllPosts(): Promise<number> {
  const client = await ensurePostsIndex();
  if (!client) return 0;

  const rows = await query<
    Array<{
      id: number;
      title: string;
      slug: string;
      excerpt: string | null;
      read_time: number | null;
      published_at: string | null;
      category_name: string | null;
      category_slug: string | null;
    }>
  >(
    `SELECT p.id, p.title, p.slug, p.excerpt, p.read_time, p.published_at,
            c.name AS category_name, c.slug AS category_slug
     FROM posts p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.status = 'published'`
  );

  const docs: PostSearchDoc[] = rows.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    category_name: post.category_name,
    category_slug: post.category_slug,
    read_time: post.read_time,
    published_at: post.published_at,
  }));

  await client.index(POSTS_INDEX_UID).addDocuments(docs);

  return docs.length;
}

export async function removePostFromIndex(id: number): Promise<void> {
  try {
    const client = await ensurePostsIndex();
    if (!client) return;

    await client.index(POSTS_INDEX_UID).deleteDocument(id);
  } catch (err) {
    logger.warn({ err, postId: id }, 'Failed to remove post from Meilisearch index');
  }
}

interface SearchPostsOptions {
  categorySlug?: string | null;
  limit: number;
  offset: number;
}

interface SearchPostsResult {
  items: Post[];
  total: number;
  source: 'meili' | 'mysql';
}

function docToPost(doc: PostSearchDoc): Post {
  return {
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    content: '',
    featured_image: null,
    author_id: 0,
    category_id: null,
    category_name: doc.category_name,
    category_slug: doc.category_slug,
    status: 'published',
    is_featured: 0,
    view_count: 0,
    read_time: doc.read_time,
    seo_title: null,
    seo_desc: null,
    published_at: doc.published_at,
  };
}

async function searchPostsMysql(
  q: string,
  { categorySlug, limit, offset }: SearchPostsOptions
): Promise<SearchPostsResult> {
  const where = categorySlug
    ? `WHERE p.status = 'published' AND MATCH(p.title, p.excerpt, p.content) AGAINST (? IN NATURAL LANGUAGE MODE) AND c.slug = ?`
    : `WHERE p.status = 'published' AND MATCH(p.title, p.excerpt, p.content) AGAINST (? IN NATURAL LANGUAGE MODE)`;
  const whereParams = categorySlug ? [q, categorySlug] : [q];

  const [countRows, items] = await Promise.all([
    query<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM posts p LEFT JOIN categories c ON c.id = p.category_id ${where}`,
      whereParams
    ),
    query<Post[]>(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM posts p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY p.published_at DESC
       LIMIT ? OFFSET ?`,
      [...whereParams, limit, offset]
    ),
  ]);

  return { items, total: countRows[0]?.total ?? 0, source: 'mysql' };
}

export async function searchPosts(
  q: string,
  options: SearchPostsOptions
): Promise<SearchPostsResult> {
  const { categorySlug, limit, offset } = options;

  try {
    const client = await ensurePostsIndex();
    if (!client) {
      return searchPostsMysql(q, options);
    }

    const index = client.index<PostSearchDoc>(POSTS_INDEX_UID);
    const result = await index.search(q, {
      filter: categorySlug
        ? `category_slug = "${categorySlug.replace(/"/g, '\\"')}"`
        : undefined,
      limit,
      offset,
    });

    return {
      items: result.hits.map(docToPost),
      total: result.estimatedTotalHits ?? result.hits.length,
      source: 'meili',
    };
  } catch (err) {
    logger.warn({ err, q }, 'Meilisearch query failed, falling back to MySQL FULLTEXT');
    return searchPostsMysql(q, options);
  }
}

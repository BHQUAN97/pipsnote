import { query } from '@/lib/db';
import type { PostTranslation } from '@/lib/types';

export async function getPostTranslations(postId: number): Promise<PostTranslation[]> {
  return query<PostTranslation[]>(
    `SELECT * FROM post_translations WHERE post_id = ? ORDER BY locale`,
    [postId]
  );
}

export async function getPostTranslation(
  postId: number,
  locale: string
): Promise<PostTranslation | null> {
  const rows = await query<PostTranslation[]>(
    `SELECT * FROM post_translations WHERE post_id = ? AND locale = ? LIMIT 1`,
    [postId, locale]
  );
  return rows[0] ?? null;
}

export async function getPublishedTranslation(
  postId: number,
  locale: string
): Promise<PostTranslation | null> {
  const rows = await query<PostTranslation[]>(
    `SELECT * FROM post_translations WHERE post_id = ? AND locale = ? AND status = 'published' LIMIT 1`,
    [postId, locale]
  );
  return rows[0] ?? null;
}

export interface UpsertPostTranslationFields {
  title: string;
  excerpt: string | null;
  content: string;
  seo_title: string | null;
  seo_desc: string | null;
  status?: 'draft' | 'published';
}

export async function upsertPostTranslation(
  postId: number,
  locale: string,
  fields: UpsertPostTranslationFields,
  meta: { source: 'ai' | 'human'; translatedBy: number | null }
): Promise<void> {
  await query(
    `INSERT INTO post_translations
       (post_id, locale, title, excerpt, content, seo_title, seo_desc, status, source, translated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       excerpt = VALUES(excerpt),
       content = VALUES(content),
       seo_title = VALUES(seo_title),
       seo_desc = VALUES(seo_desc),
       status = VALUES(status),
       source = VALUES(source),
       translated_by = VALUES(translated_by)`,
    [
      postId,
      locale,
      fields.title,
      fields.excerpt,
      fields.content,
      fields.seo_title,
      fields.seo_desc,
      fields.status ?? 'draft',
      meta.source,
      meta.translatedBy,
    ]
  );
}

export async function publishPostTranslation(postId: number, locale: string): Promise<void> {
  await query(
    `UPDATE post_translations SET status = 'published' WHERE post_id = ? AND locale = ?`,
    [postId, locale]
  );
}

export async function unpublishPostTranslation(postId: number, locale: string): Promise<void> {
  await query(
    `UPDATE post_translations SET status = 'draft' WHERE post_id = ? AND locale = ?`,
    [postId, locale]
  );
}

export async function deletePostTranslation(postId: number, locale: string): Promise<void> {
  await query(`DELETE FROM post_translations WHERE post_id = ? AND locale = ?`, [postId, locale]);
}

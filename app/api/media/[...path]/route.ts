import { NextRequest } from 'next/server';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { resolveMediaPath } from '@/lib/media';

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
};

// Phục vụ ảnh đã upload (stored local) — Next standalone không serve public/uploads.
// Không cần admin auth: ảnh bài viết hiển thị công khai trên trang.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const rel = segments.join('/');
  const abs = resolveMediaPath(rel);
  if (!abs) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const info = await stat(abs);
    if (!info.isFile()) {
      return new Response('Not found', { status: 404 });
    }
  } catch {
    return new Response('Not found', { status: 404 });
  }

  const ext = path.extname(abs).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  const stream = createReadStream(abs);
  return new Response(stream as unknown as BodyInit, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

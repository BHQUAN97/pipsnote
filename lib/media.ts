import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// LƯU MEDIA LOCAL — thay cho R2 (R2 chưa được cấu hình nên upload bị vỡ).
// File được ghi vào <cwd>/public/uploads (mount volume media_data để bền vững),
// Next standalone serve thẳng /uploads/... qua proxy shared-nginx.
// Muốn quay lại R2 chỉ cần set R2_MEDIA_BUCKET + R2_MEDIA_PUBLIC_URL (xem lib/r2.ts).

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const UPLOADS_DIR = process.env.MEDIA_DIR || path.join(PUBLIC_DIR, 'uploads');

export async function saveMediaLocal(
  key: string, // vd: backgrounds/2026-08/xxxx.jpg hoặc posts/...
  body: Buffer,
  _contentType: string
): Promise<string> {
  // Chống path traversal
  const safeKey = key.replace(/\.\./g, '').replace(/^\//, '');
  const abs = path.join(UPLOADS_DIR, safeKey);
  if (!abs.startsWith(UPLOADS_DIR)) {
    throw new Error('Invalid media path');
  }
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body);
  return `/uploads/${safeKey}`;
}

export async function uploadMediaToStorage(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  // Nếu R2 cấu hình đầy đủ thì dùng R2, không thì lưu local.
  if (process.env.R2_MEDIA_BUCKET && process.env.R2_MEDIA_PUBLIC_URL) {
    const { uploadMediaToR2 } = await import('./r2');
    return uploadMediaToR2(key, body, contentType);
  }
  return saveMediaLocal(key, body, contentType);
}

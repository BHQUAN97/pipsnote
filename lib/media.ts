import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// LƯU MEDIA LOCAL — thay cho R2 (R2 chưa được cấu hình nên upload bị vỡ).
// - Ghi vào <cwd>/public/uploads (volume media_data bền vững).
// - File được phục vụ qua API route /api/media/[...path] (Next standalone KHÔNG
//   serve file public/uploads thêm vào lúc runtime → 404, nên phải dùng route).
// Muốn quay lại R2: set đủ R2_MEDIA_BUCKET + R2_MEDIA_PUBLIC_URL (xem lib/r2.ts).

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const UPLOADS_DIR = process.env.MEDIA_DIR || path.join(PUBLIC_DIR, 'uploads');

export const MEDIA_BASE = '/api/media';

function safeKey(key: string): string {
  return key.replace(/\.\./g, '').replace(/^\//, '');
}

export async function saveMediaLocal(
  key: string, // vd: backgrounds/2026-08/xxxx.jpg hoặc posts/...
  body: Buffer,
  _contentType: string
): Promise<string> {
  const safe = safeKey(key);
  const abs = path.join(UPLOADS_DIR, safe);
  if (!abs.startsWith(UPLOADS_DIR)) {
    throw new Error('Invalid media path');
  }
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, body);
  return `${MEDIA_BASE}/${safe}`;
}

export function resolveMediaPath(urlPath: string): string | null {
  // urlPath là phần sau MEDIA_BASE, vd: "posts/2026-08/abc.jpg"
  const safe = safeKey(decodeURIComponent(urlPath));
  const abs = path.join(UPLOADS_DIR, safe);
  if (!abs.startsWith(UPLOADS_DIR)) return null;
  return abs;
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

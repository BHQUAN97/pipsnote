import { getSiteSettings } from "@/lib/settings";

/**
 * Trả về URL gốc của site, ưu tiên:
 *  1. `site_url` trong site_settings (DB — theo chuẩn admin, chỉnh được qua /admin,
 *     không bị deploy.yml ghi đè vì nằm trong DB chứ không phải .env)
 *  2. env NEXT_PUBLIC_SITE_URL
 *  3. fallback https://pipsnote.com
 * Dùng cho robots.ts / sitemap.ts / metadataBase (hreflang, canonical).
 */
export async function getSiteUrl(): Promise<string> {
  try {
    const s = await getSiteSettings();
    const db = s["site_url"];
    if (db && typeof db === "string" && /^https?:\/\//.test(db)) {
      return db.replace(/\/+$/, "");
    }
  } catch {
    // fall-through — settings có thể lỗi tạm thời, không nên làm vỡ SEO
  }
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://pipsnote.com").replace(/\/+$/, "");
}
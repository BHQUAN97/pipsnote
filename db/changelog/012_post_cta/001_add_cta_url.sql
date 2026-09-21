-- Add per-post "Đăng Kí Ngay" (signup) CTA link for broker articles
ALTER TABLE `posts`
  ADD COLUMN `cta_url` VARCHAR(500) NULL AFTER `seo_desc`;
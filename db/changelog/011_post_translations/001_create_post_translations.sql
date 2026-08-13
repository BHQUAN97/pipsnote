-- db/changelog/011_post_translations/001_create_post_translations.sql
-- Ban dich bai viet theo locale (AI hoac human), review truoc khi publish rieng voi posts goc

CREATE TABLE IF NOT EXISTS `post_translations` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `post_id` INT UNSIGNED NOT NULL,
  `locale` VARCHAR(10) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `excerpt` TEXT,
  `content` LONGTEXT NOT NULL,
  `seo_title` VARCHAR(200),
  `seo_desc` VARCHAR(300),
  `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  `source` ENUM('ai', 'human') NOT NULL DEFAULT 'ai',
  `translated_by` INT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_post_locale` (`post_id`, `locale`),
  INDEX `idx_status` (`status`),
  FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`translated_by`) REFERENCES `admin_users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

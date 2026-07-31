-- Extend posts/brokers/affiliate_clicks with fields needed for homepage, listing UI, and SEO

ALTER TABLE `posts`
  ADD COLUMN `is_featured` BOOLEAN NOT NULL DEFAULT FALSE AFTER `status`,
  ADD COLUMN `view_count` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `is_featured`,
  ADD COLUMN `read_time` SMALLINT UNSIGNED NULL AFTER `view_count`,
  ADD COLUMN `seo_title` VARCHAR(200) NULL AFTER `read_time`,
  ADD COLUMN `seo_desc` VARCHAR(300) NULL AFTER `seo_title`,
  ADD INDEX `idx_featured` (`is_featured`);

ALTER TABLE `brokers`
  ADD COLUMN `type` ENUM('forex', 'crypto', 'stock', 'all') NOT NULL DEFAULT 'forex' AFTER `slug`,
  ADD COLUMN `badge` VARCHAR(50) NULL AFTER `description`,
  ADD COLUMN `min_deposit` VARCHAR(50) NULL AFTER `badge`,
  ADD COLUMN `leverage` VARCHAR(50) NULL AFTER `min_deposit`,
  ADD COLUMN `spread_from` VARCHAR(50) NULL AFTER `leverage`,
  ADD COLUMN `is_featured` BOOLEAN NOT NULL DEFAULT FALSE AFTER `is_active`,
  ADD COLUMN `click_count` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `is_featured`;

ALTER TABLE `affiliate_clicks`
  ADD COLUMN `post_id` INT UNSIGNED NULL AFTER `broker_id`,
  ADD COLUMN `ip_hash` VARCHAR(64) NULL AFTER `post_id`,
  ADD INDEX `idx_post` (`post_id`),
  ADD CONSTRAINT `fk_affiliate_clicks_post` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE SET NULL;

-- Add manual sort_order to posts/brokers for admin-driven content ranking (▲▼ reorder UI)

ALTER TABLE `posts`
  ADD COLUMN `sort_order` INT NOT NULL DEFAULT 0 AFTER `is_featured`,
  ADD INDEX `idx_sort_order` (`sort_order`);

ALTER TABLE `brokers`
  ADD COLUMN `sort_order` INT NOT NULL DEFAULT 0 AFTER `is_featured`,
  ADD INDEX `idx_sort_order` (`sort_order`);

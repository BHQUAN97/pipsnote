-- db/changelog/010_background_images/001_add_background_settings.sql
-- Them value_type 'image' + 4 setting key cho tinh nang anh nen (bg.global/hero/ticker/newsletter)

ALTER TABLE site_settings
  MODIFY value_type ENUM('color','boolean','text','number','image') NOT NULL DEFAULT 'text';

INSERT INTO site_settings (setting_key, setting_value, value_type, category) VALUES
  ('bg.global',     '', 'image', 'background'),
  ('bg.hero',       '', 'image', 'background'),
  ('bg.ticker',     '', 'image', 'background'),
  ('bg.newsletter', '', 'image', 'background')
ON DUPLICATE KEY UPDATE setting_key = setting_key; -- idempotent, khong ghi de neu da ton tai

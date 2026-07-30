-- db/changelog/002_settings/001_create_site_settings.sql
-- Bang luu config theme/layout ma admin chinh duoc qua /admin/settings (xem docs/ADMIN_SETTINGS.md)
-- Thiet ke key-value de them setting moi khong can migration them (chi can validate whitelist trong code)

CREATE TABLE IF NOT EXISTS site_settings (
  setting_key   VARCHAR(100) PRIMARY KEY,   -- vd: 'theme.bg', 'theme.red', 'layout.show_ticker'
  setting_value TEXT NOT NULL,               -- gia tri dang string (hex color, 'true'/'false', so...)
  value_type    ENUM('color','boolean','text','number') NOT NULL DEFAULT 'text',
  category      VARCHAR(50) NOT NULL,        -- 'theme' | 'layout' — group hien thi tren UI
  updated_by    VARCHAR(50) NULL,            -- admin user id sua lan cuoi
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed gia tri mac dinh = dung y het token dang co trong index.html (Preset "Editorial Red" — Section 2 DESIGN_SYSTEM.md)
INSERT INTO site_settings (setting_key, setting_value, value_type, category) VALUES
  ('theme.bg',           '#FFFFFF', 'color', 'theme'),
  ('theme.ink',          '#0A0A0A', 'color', 'theme'),
  ('theme.surface_dark', '#0A0A0A', 'color', 'theme'),
  ('theme.red',          '#E10600', 'color', 'theme'),
  ('theme.red_dark',     '#B00500', 'color', 'theme'),
  ('theme.gray_bg',      '#F5F4F1', 'color', 'theme'),
  ('theme.gray_line',    '#E4E2DC', 'color', 'theme'),
  ('theme.gray_mid',     '#6E6C66', 'color', 'theme'),
  ('theme.up',           '#1a9e46', 'color', 'theme'),
  ('theme.down',         '#E10600', 'color', 'theme'),
  ('theme.dark_default', 'false',   'boolean', 'theme'),
  ('layout.show_ticker', 'true',    'boolean', 'layout'),
  ('layout.hero_variant','editorial','text',   'layout'),
  ('layout.site_name',   'PIPSNOTE','text',    'layout')
ON DUPLICATE KEY UPDATE setting_key = setting_key; -- idempotent, khong ghi de neu da ton tai

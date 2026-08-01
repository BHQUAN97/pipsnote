-- db/changelog/007_design_refresh/001_update_theme_signal.sql
-- Chuyen default theme tu "Editorial Red" (flat/light) sang "Signal" (dark-first financial terminal,
-- amber accent) — xem lib/settingsPresets.ts va docs/DESIGN_SYSTEM.md. Chi UPDATE gia tri co san
-- (dong da duoc seed o 002_settings), khong doi setting_key/value_type/category.

UPDATE site_settings SET setting_value = '#0B0E14' WHERE setting_key = 'theme.bg';
UPDATE site_settings SET setting_value = '#E8EBF2' WHERE setting_key = 'theme.ink';
UPDATE site_settings SET setting_value = '#05070A' WHERE setting_key = 'theme.surface_dark';
UPDATE site_settings SET setting_value = '#FFB020' WHERE setting_key = 'theme.red';
UPDATE site_settings SET setting_value = '#D68F0C' WHERE setting_key = 'theme.red_dark';
UPDATE site_settings SET setting_value = '#131721' WHERE setting_key = 'theme.gray_bg';
UPDATE site_settings SET setting_value = '#232A38' WHERE setting_key = 'theme.gray_line';
UPDATE site_settings SET setting_value = '#8891A6' WHERE setting_key = 'theme.gray_mid';
UPDATE site_settings SET setting_value = '#17C879' WHERE setting_key = 'theme.up';
UPDATE site_settings SET setting_value = '#F0455C' WHERE setting_key = 'theme.down';
UPDATE site_settings SET setting_value = 'true'    WHERE setting_key = 'theme.dark_default';
